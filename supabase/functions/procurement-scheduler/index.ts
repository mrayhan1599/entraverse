import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2"

type JsonRecord = Record<string, unknown>

type ProductRecord = {
  id: string
  name?: string | null
  purchase_price_idr?: number | null
  purchasePriceIdr?: number | null
  purchase_price?: number | null
  purchasePrice?: number | null
  offlinePriceIdr?: number | null
  offline_price_idr?: number | null
  offlinePrice?: number | null
  offline_price?: number | null
  variant_pricing?: unknown
}

type VariantPricingRow = {
  leadTime?: unknown
  lead_time?: unknown
  nextProcurement?: unknown
  next_procurement?: unknown
  nextProcurementDate?: unknown
  next_procurement_date?: unknown
  nextProcurementPeriod?: unknown
  next_procurement_period?: unknown
  nextProcurementSignature?: unknown
  next_procurement_signature?: unknown
  [key: string]: unknown
}

type ProcurementPeriod = {
  label: string
  signature: string
  startDate: Date
  endDate: Date
}

type ComputedProcurement = {
  date: Date | null
  periodLabel: string | null
  signature: string | null
}

type ProcurementDueRow = {
  product_id: string
  variant_id: string
  sku: string | null
  product_name: string | null
  variant_label: string | null
  next_procurement_date: string
  next_procurement_period: string | null
  next_procurement_signature: string | null
  required_stock: number | null
  unit_price: number | null
  metadata: Record<string, unknown>
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type"
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders }
  })
}

function pad2(value: number) {
  return String(Math.max(0, Math.floor(value))).padStart(2, "0")
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  const stringified = (value ?? "").toString().replace(/[^0-9,.-]/g, "").replace(/,/g, ".").trim()
  if (!stringified) return null

  const parsed = Number.parseFloat(stringified)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return ""
  return value.toString().trim()
}

function resolveVariantId(row: VariantPricingRow) {
  const candidate =
    normalizeText(row.id) ||
    normalizeText((row as { variantId?: unknown }).variantId) ||
    normalizeText((row as { variant_id?: unknown }).variant_id) ||
    normalizeText((row as { sellerSku?: unknown }).sellerSku) ||
    normalizeText((row as { seller_sku?: unknown }).seller_sku) ||
    normalizeText((row as { sku?: unknown }).sku)

  return candidate || "default"
}

function resolveSku(row: VariantPricingRow) {
  const sku =
    normalizeText((row as { sellerSku?: unknown }).sellerSku) ||
    normalizeText((row as { seller_sku?: unknown }).seller_sku) ||
    normalizeText((row as { sku?: unknown }).sku)

  return sku || null
}

function buildVariantLabel(row: VariantPricingRow) {
  const variants = Array.isArray((row as { variants?: unknown }).variants)
    ? ((row as { variants?: unknown }).variants as { name?: unknown; value?: unknown }[])
    : []

  if (!variants.length) return null

  const label = variants
    .map(item => `${normalizeText(item.name) || "Varian"}: ${normalizeText(item.value) || ""}`.trim())
    .filter(text => !!text && text !== "Varian:")
    .join(" / ")

  return label || null
}

function toDateOnly(value: unknown) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const wibString = date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  const wibDate = new Date(wibString)

  return new Date(Date.UTC(wibDate.getFullYear(), wibDate.getMonth(), wibDate.getDate()))
}

function getWibDateOnly(reference = new Date()) {
  return toDateOnly(reference) ?? new Date()
}

function createWibDate(year: number, monthZeroBased: number, day: number) {
  return new Date(Date.UTC(year, monthZeroBased, day))
}

function subtractDays(date: Date, days: number) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() - Math.max(0, Math.floor(days)))
  return new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate()))
}

function daysInMonth(year: number, monthZeroBased: number) {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate()
}

function buildPeriodLabel(startDate: Date, endDate: Date) {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric"
  })

  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`
}

function generatePeriods(reference: Date, monthsAhead = 6) {
  const periods: ProcurementPeriod[] = []
  const startYear = reference.getFullYear()
  const startMonth = reference.getMonth()

  for (let offset = 0; offset <= monthsAhead; offset += 1) {
    const monthIndex = startMonth + offset
    const periodDate = new Date(Date.UTC(startYear, monthIndex, 1))
    const year = periodDate.getUTCFullYear()
    const month = periodDate.getUTCMonth()
    const monthLabel = `${year}-${pad2(month + 1)}`
    const totalDays = daysInMonth(year, month)

    const periodAStart = createWibDate(year, month, 1)
    const periodAEnd = createWibDate(year, month, 15)

    if (periodAStart && periodAEnd) {
      periods.push({
        label: buildPeriodLabel(periodAStart, periodAEnd),
        signature: `procurement-${monthLabel}-a`,
        startDate: periodAStart,
        endDate: periodAEnd
      })
    }

    const periodBStart = createWibDate(year, month, 16)
    const periodBEnd = createWibDate(year, month, totalDays)

    if (periodBStart && periodBEnd) {
      periods.push({
        label: buildPeriodLabel(periodBStart, periodBEnd),
        signature: `procurement-${monthLabel}-b`,
        startDate: periodBStart,
        endDate: periodBEnd
      })
    }
  }

  return periods.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
}

function isSameDate(a: Date | null, b: Date | null) {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function computeNextProcurement(row: VariantPricingRow, periods: ProcurementPeriod[], today: Date): ComputedProcurement {
  const leadTime = parseNumber(row.leadTime ?? row.lead_time)
  const requirement = parseNumber(
    row.nextProcurement ?? (row as { next_Procurement?: unknown }).next_Procurement ?? row.next_procurement
  )

  if (leadTime === null || leadTime < 0 || requirement === null || requirement <= 0) {
    return { date: null, periodLabel: null, signature: null }
  }

  const candidate = periods.find(period => {
    const procurementDate = subtractDays(period.startDate, leadTime)
    return procurementDate.getTime() >= today.getTime()
  })

  if (!candidate) {
    return { date: null, periodLabel: null, signature: null }
  }

  return {
    date: subtractDays(candidate.startDate, leadTime),
    periodLabel: candidate.label,
    signature: candidate.signature
  }
}

async function fetchProducts(client: SupabaseClient) {
  const { data, error } = await client
    .from("products")
    .select(
      "id, name, variant_pricing"
    )
  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`)
  }
  return (data ?? []) as ProductRecord[]
}

function shouldUpdate(current: VariantPricingRow, computed: ComputedProcurement) {
  const currentDate = toDateOnly(current.nextProcurementDate ?? current.next_procurement_date)
  const currentPeriod = (current.nextProcurementPeriod ?? current.next_procurement_period)?.toString() ?? ""
  const currentSignature = (current.nextProcurementSignature ?? current.next_procurement_signature)?.toString() ?? ""

  const nextDate = computed.date ? toDateOnly(computed.date) : null
  const nextPeriod = computed.periodLabel ?? ""
  const nextSignature = computed.signature ?? ""

  return (
    (nextDate === null) !== (currentDate === null) ||
    (nextDate && currentDate ? nextDate.getTime() !== currentDate.getTime() : false) ||
    currentPeriod !== nextPeriod ||
    currentSignature !== nextSignature
  )
}

async function updateProducts(client: SupabaseClient, products: ProductRecord[], periods: ProcurementPeriod[], today: Date) {
  let variantsUpdated = 0
  let productsWritten = 0
  let dueToday = 0
  const dueRows: ProcurementDueRow[] = []

  for (const record of products) {
    const rawRows = Array.isArray(record?.variant_pricing)
      ? (record.variant_pricing as JsonRecord[]).map(row => ({ ...(row ?? {}) }))
      : []

    if (!rawRows.length || !record?.id) continue

    let changed = false
    const updatedRows = rawRows.map(row => {
      const computed = computeNextProcurement(
        row as VariantPricingRow,
        periods,
        today
      )

      const procurementDate = computed.date ? toDateOnly(computed.date) : null
      if (isSameDate(procurementDate, today)) {
        dueToday += 1
        dueRows.push({
          product_id: record.id,
          variant_id: resolveVariantId(row as VariantPricingRow),
          sku: resolveSku(row as VariantPricingRow),
          product_name: record.name ?? null,
          variant_label: buildVariantLabel(row as VariantPricingRow),
          next_procurement_date: procurementDate ? procurementDate.toISOString().slice(0, 10) : today.toISOString().slice(0, 10),
          next_procurement_period: computed.periodLabel,
          next_procurement_signature: computed.signature,
          required_stock: parseNumber(
            row.nextProcurement ?? (row as { next_Procurement?: unknown }).next_Procurement ?? row.next_procurement
          ),
          unit_price: null,
          metadata: row as Record<string, unknown>
        })
      }

      if (!shouldUpdate(row as VariantPricingRow, computed)) {
        return row
      }

      changed = true
      variantsUpdated += 1

      return {
        ...row,
        nextProcurementDate: procurementDate ? procurementDate.toISOString() : null,
        next_procurement_date: procurementDate ? procurementDate.toISOString() : null,
        nextProcurementPeriod: computed.periodLabel,
        next_procurement_period: computed.periodLabel,
        nextProcurementSignature: computed.signature,
        next_procurement_signature: computed.signature
      }
    })

    if (!changed) continue

    productsWritten += 1
    const { error: updateError } = await client
      .from("products")
      .update({
        variant_pricing: updatedRows,
        updated_at: new Date().toISOString()
      })
      .eq("id", record.id)

    if (updateError) {
      throw new Error(`Failed to update product ${record.id}: ${updateError.message}`)
    }
  }

  if (dueRows.length) {
    const { error: upsertError } = await client
      .from("procurement_due")
      .upsert(dueRows, { onConflict: "product_id,variant_id,next_procurement_signature" })

    if (upsertError) {
      throw new Error(`Failed to upsert procurement due entries: ${upsertError.message}`)
    }
  }

  return { variantsUpdated, productsWritten, dueToday }
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("", { headers: corsHeaders })
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
    const today = getWibDateOnly()
    const periods = generatePeriods(today)
    const products = await fetchProducts(client)

    const { variantsUpdated, productsWritten, dueToday } = await updateProducts(client, products, periods, today)

    return jsonResponse(200, {
      scannedProducts: products.length,
      variantsUpdated,
      productsWritten,
      plannedPeriods: periods.length,
      dueToday
    })
  } catch (error) {
    console.error("procurement-scheduler error", error)
    return jsonResponse(500, { error: (error as Error).message })
  }
})
