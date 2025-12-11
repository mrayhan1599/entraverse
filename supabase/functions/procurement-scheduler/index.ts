import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2"

type VariantPricingRow = {
  leadTime?: unknown
  lead_time?: unknown
  nextProcurement?: unknown
  next_procurement?: unknown
  purchasePriceIdr?: unknown
  purchase_price_idr?: unknown
  purchasePrice?: unknown
  purchase_price?: unknown
  sellerSku?: unknown
  sku?: unknown
  variantLabel?: unknown
  variants?: { value?: unknown }[]
}

type ProductRecord = {
  id?: string
  name?: string
  variant_pricing?: VariantPricingRow[] | null
}

type ProcurementPlan = {
  productId: string
  sku: string
  variantLabel: string
  plannedDate: Date
  periodLabel: string
  periodSignature: string
}

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type"
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS }
  })
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  const normalized = (value ?? "")
    .toString()
    .replace(/[^0-9,.-]/g, "")
    .replace(/,/g, ".")
    .trim()
  if (!normalized) return null

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function toWibDate(reference = new Date()) {
  const wibString = new Date(reference).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  return new Date(wibString)
}

function toDateOnly(dateValue: Date | string | number) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

function subtractDays(date: Date, days: number) {
  const base = new Date(date)
  base.setUTCDate(base.getUTCDate() - days)
  return base
}

type PeriodWindow = {
  key: "period-a" | "period-b"
  start: Date
  end: Date
  signature: string
  label: string
}

const PLANNING_MONTH_HORIZON = 14

function resolveProcurementPeriods(referenceDate = new Date(), monthsAhead = PLANNING_MONTH_HORIZON): PeriodWindow[] {
  const anchor = toWibDate(referenceDate)
  const periods: PeriodWindow[] = []

  for (let offset = 0; offset <= monthsAhead; offset += 1) {
    const current = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + offset, 1))
    const year = current.getUTCFullYear()
    const month = current.getUTCMonth()
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

    const periodAStart = new Date(Date.UTC(year, month, 1))
    const periodAEnd = new Date(Date.UTC(year, month, Math.min(15, daysInMonth)))
    const periodBStart = new Date(Date.UTC(year, month, 16))
    const periodBEnd = new Date(Date.UTC(year, month, daysInMonth))

    const labelA = `${periodAStart.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    })} – ${periodAEnd.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`

    const labelB = `${periodBStart.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    })} – ${periodBEnd.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`

    periods.push({
      key: "period-a",
      start: periodAStart,
      end: periodAEnd,
      signature: `procurement-${year}-${String(month + 1).padStart(2, "0")}-a`,
      label: labelA
    })

    periods.push({
      key: "period-b",
      start: periodBStart,
      end: periodBEnd,
      signature: `procurement-${year}-${String(month + 1).padStart(2, "0")}-b`,
      label: labelB
    })
  }

  return periods.filter(period => period.end >= anchor).sort((a, b) => a.start.getTime() - b.start.getTime())
}

function resolveVariantLabel(variant: VariantPricingRow) {
  if (Array.isArray(variant?.variants) && variant.variants.length) {
    return variant.variants
      .map(entry => (entry?.value ?? "").toString().trim())
      .filter(Boolean)
      .join(" ")
  }

  const label = (variant?.variantLabel ?? "").toString().trim()
  return label || "Tanpa varian"
}

function computeProcurementPlan(
  variant: VariantPricingRow,
  period: PeriodWindow
): { plannedDate: Date; period: PeriodWindow } | null {
  const leadTime = parseNumber(variant.leadTime ?? variant.lead_time) ?? 0
  const plannedDate = subtractDays(period.start, Math.max(0, leadTime))
  const dateOnly = toDateOnly(plannedDate)
  if (!dateOnly) return null

  return { plannedDate: dateOnly, period }
}

function deriveProcurementPlans(products: ProductRecord[], today = new Date()): ProcurementPlan[] {
  const periods = resolveProcurementPeriods(today)
  if (!periods.length) return []

  const plans: ProcurementPlan[] = []
  const todayDateOnly = toDateOnly(today) ?? new Date()

  for (const product of products) {
    const variants = Array.isArray(product?.variant_pricing) ? product.variant_pricing : []
    variants.forEach(variant => {
      const need = parseNumber(variant?.nextProcurement ?? variant?.next_procurement)
      if (!Number.isFinite(need) || (need ?? 0) <= 0 || !product?.id) {
        return
      }

      periods.forEach(period => {
        const plan = computeProcurementPlan(variant, period)
        if (!plan) return

        const sku = (variant?.sellerSku ?? variant?.sku ?? "").toString().trim()
        plans.push({
          productId: product.id!,
          sku,
          variantLabel: resolveVariantLabel(variant),
          plannedDate: plan.plannedDate,
          periodLabel: plan.period.label,
          periodSignature: plan.period.signature
        })
      })
    })
  }

  return plans
    .filter(plan => plan.plannedDate.getTime() >= todayDateOnly.getTime())
    .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime())
}

async function fetchProducts(client: SupabaseClient) {
  const { data, error } = await client.from("products").select("id, name, variant_pricing")
  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`)
  }
  return data ?? []
}

async function persistProcurementMetadata(client: SupabaseClient, products: ProductRecord[], plans: ProcurementPlan[]) {
  const plansByProduct = plans.reduce<Map<string, ProcurementPlan[]>>((acc, plan) => {
    if (!acc.has(plan.productId)) {
      acc.set(plan.productId, [])
    }
    acc.get(plan.productId)!.push(plan)
    return acc
  }, new Map())

  let productsWritten = 0

  for (const product of products) {
    const productPlans = plansByProduct.get(product.id ?? "") ?? []
    if (!productPlans.length || !product?.variant_pricing?.length) continue

    const updatedVariantPricing = product.variant_pricing.map(variant => {
      const match = productPlans.find(plan => plan.sku === (variant?.sellerSku ?? variant?.sku ?? "").toString().trim())
      if (!match) return variant

      return {
        ...variant,
        nextProcurementDate: match.plannedDate.toISOString(),
        nextProcurementPeriod: match.periodLabel,
        nextProcurementSignature: match.periodSignature
      }
    })

    const { error } = await client
      .from("products")
      .update({ variant_pricing: updatedVariantPricing, updated_at: new Date().toISOString() })
      .eq("id", product.id)

    if (error) {
      throw new Error(`Failed to update procurement schedule for product ${product.id}: ${error.message}`)
    }

    productsWritten += 1
  }

  return productsWritten
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("", { headers: CORS_HEADERS })
  }

  if (!req.method || !["GET", "POST"].includes(req.method)) {
    return jsonResponse(405, { error: "Method not allowed" })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse(500, { error: "Supabase credentials missing" })
  }

  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const todayWib = toDateOnly(toWibDate()) ?? new Date()
    const products = await fetchProducts(client)
    const plans = deriveProcurementPlans(products, todayWib)

    let productsWritten = 0
    if (plans.length) {
      productsWritten = await persistProcurementMetadata(client, products, plans)
    }

    const dueToday = plans.filter(plan => plan.plannedDate.getTime() <= todayWib.getTime())

    return jsonResponse(200, {
      scannedProducts: products.length,
      plannedProcurements: plans.length,
      productsWritten,
      dueToday: dueToday.length,
      runAt: todayWib.toISOString(),
      note: "Fungsi ini dijadwalkan via cron Supabase setiap pukul 12:00 WIB (05:00 UTC) untuk mengecek jadwal pengadaan."
    })
  } catch (error) {
    console.error("procurement-scheduler error", error)
    return jsonResponse(500, { error: (error as Error).message })
  }
})
