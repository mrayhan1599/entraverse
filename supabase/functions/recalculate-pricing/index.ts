import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

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

function sanitizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9,.-]/g, "").replace(/,/g, ".").trim()
    if (!cleaned) return null

    const parsed = Number.parseFloat(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function toPercentDecimal(value: unknown) {
  const numeric = sanitizeNumber(value)
  if (!Number.isFinite(numeric)) return 0
  if (numeric >= 0 && numeric <= 1) return numeric
  return Math.max(0, numeric / 100)
}

type FeeComponent = {
  label: string
  value: number
  valueType: "percent" | "amount"
  min: number | null
  max: number | null
}

type FeeField = {
  components: FeeComponent[]
  summary: number
}

function normalizeFeeComponent(component: any): FeeComponent | null {
  if (!component || typeof component !== "object") return null

  const value = sanitizeNumber(component.value ?? component.rate ?? component.percent)
  if (!Number.isFinite(value) || value <= 0) return null

  const valueType = (component.valueType ?? component.type ?? "percent").toString().toLowerCase()
  const min = sanitizeNumber(component.min)
  const max = sanitizeNumber(component.max)

  return {
    label: (component.label ?? "").toString(),
    value,
    valueType: valueType === "amount" ? "amount" : "percent",
    min: Number.isFinite(min) ? Number(min) : null,
    max: Number.isFinite(max) ? Number(max) : null
  }
}

function normalizeFeeField(value: any): FeeField {
  if (value && typeof value === "object") {
    const components = Array.isArray(value.components)
      ? value.components.map(normalizeFeeComponent).filter((item): item is FeeComponent => Boolean(item))
      : []
    const summary = sanitizeNumber(value.summary ?? value.value ?? value.percent) ?? 0
    return { components, summary }
  }

  return { components: [], summary: sanitizeNumber(value) ?? 0 }
}

function computeFeeTotals(feeField: any, purchasePriceIdr: number) {
  const normalized = normalizeFeeField(feeField)

  let fixedTotal = 0
  let percentTotal = 0

  if (normalized.components.length && Number.isFinite(purchasePriceIdr) && purchasePriceIdr > 0) {
    normalized.components.forEach(component => {
      if (component.valueType === "amount") {
        fixedTotal += component.value
        return
      }

      let effectiveRate = toPercentDecimal(component.value)

      if (component.max) {
        effectiveRate = Math.min(effectiveRate, component.max / purchasePriceIdr)
      }

      if (component.min) {
        effectiveRate = Math.max(effectiveRate, component.min / purchasePriceIdr)
      }

      percentTotal += effectiveRate
    })
  } else {
    percentTotal = toPercentDecimal(normalized.summary)
  }

  return { fixedTotal, percentTotal }
}

function mround(value: number, multiple: number) {
  if (!Number.isFinite(value) || !Number.isFinite(multiple) || multiple <= 0) return null
  return Math.round(value / multiple) * multiple
}

function applyRoundingRules(value: number) {
  if (!Number.isFinite(value) || value <= 0) return null

  let roundedValue = value
  if (value >= 500_000) {
    roundedValue = (mround(value, 50_000) ?? value) - 1_000
  } else if (value >= 250_000) {
    roundedValue = (mround(value, 10_000) ?? value) - 1_000
  } else if (value >= 100_000) {
    roundedValue = (mround(value, 5_000) ?? value) - 1_000
  } else {
    roundedValue = (mround(value, 1_000) ?? value) - 100
  }

  if (!Number.isFinite(roundedValue)) return null
  return Math.max(0, Math.round(roundedValue))
}

const WARRANTY_RATE = 0.03
const WARRANTY_PROFIT_RATE = 1
const WARRANTY_MULTIPLIER = 1 + WARRANTY_RATE * (1 + WARRANTY_PROFIT_RATE)

function calculateSellingPrice(
  purchasePriceIdr: number,
  { margin, feeField }: { margin: number; feeField?: any },
  hasWarranty: boolean
) {
  const { fixedTotal, percentTotal } = computeFeeTotals(feeField, purchasePriceIdr)
  const totalPercent = margin + percentTotal

  if (!Number.isFinite(totalPercent) || totalPercent >= 1) return null

  const base = (purchasePriceIdr + fixedTotal) / (1 - totalPercent)
  if (!Number.isFinite(base) || base <= 0) return null

  const adjusted = hasWarranty ? base * WARRANTY_MULTIPLIER : base
  return applyRoundingRules(adjusted)
}

function normalizePriceNumber(value: unknown) {
  const numeric = sanitizeNumber(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  return Math.round(numeric)
}

function derivePurchasePriceIdr(pricing: Record<string, unknown>) {
  const existing = normalizePriceNumber(
    pricing.purchasePriceIdr ?? pricing.purchase_price_idr ?? pricing.purchasePriceIdr
  )
  if (existing !== null) return existing

  const purchasePrice = normalizePriceNumber(pricing.purchasePrice ?? pricing.purchase_price)
  if (purchasePrice === null) return null

  const currency = (pricing.purchaseCurrency ?? pricing.purchase_currency ?? "").toString().trim()
  const exchangeRate = normalizePriceNumber(pricing.exchangeRate ?? pricing.exchange_rate)

  if (!currency || currency.toUpperCase() === "IDR") {
    return purchasePrice
  }

  if (exchangeRate !== null) {
    return purchasePrice * exchangeRate
  }

  return null
}

function hasWarrantyForPricing(variants: any) {
  if (!Array.isArray(variants)) return false

  return variants.some(variant => {
    const options = Array.isArray(variant?.options) ? variant.options : []
    return options.some(option => {
      const name = (option?.name ?? "").toString().toLowerCase()
      const value = (option?.value ?? "").toString().toLowerCase()
      const combined = `${name} ${value}`.trim()
      return combined.includes("garansi") && combined.includes("1 tahun")
    })
  })
}

function recalculatePricingWithFees(pricingRows: any[], category: any) {
  if (!Array.isArray(pricingRows) || !pricingRows.length || !category) {
    return { updatedPricing: pricingRows || [], changed: false }
  }

  const marginRate = toPercentDecimal(category?.margin?.value ?? 0)
  const categoryFees = category?.fees ?? {}
  let changed = false

  const updatedPricing = pricingRows.map(row => {
    const purchasePriceIdr = derivePurchasePriceIdr(row as Record<string, unknown>)
    if (!Number.isFinite(purchasePriceIdr) || purchasePriceIdr <= 0) {
      return row
    }

    const hasWarranty = hasWarrantyForPricing((row as any)?.variants)

    const offlinePrice = calculateSellingPrice(purchasePriceIdr, { margin: marginRate }, hasWarranty)
    const entraversePrice = calculateSellingPrice(
      purchasePriceIdr,
      { margin: marginRate, feeField: categoryFees.entraverse },
      hasWarranty
    )
    const tokopediaPrice = calculateSellingPrice(
      purchasePriceIdr,
      { margin: marginRate, feeField: categoryFees.marketplace },
      hasWarranty
    )
    const shopeePrice = calculateSellingPrice(
      purchasePriceIdr,
      { margin: marginRate, feeField: categoryFees.shopee },
      hasWarranty
    )

    const applyPriceChange = (currentValue: unknown, nextValue: number | null) => {
      const normalizedCurrent = normalizePriceNumber(currentValue)
      const normalizedNext = normalizePriceNumber(nextValue)
      if (normalizedCurrent !== normalizedNext) {
        changed = true
      }
      return normalizedNext !== null ? normalizedNext.toString() : ""
    }

    const updatedRow: Record<string, unknown> = {
      ...row,
      purchasePriceIdr: purchasePriceIdr.toString()
    }

    updatedRow.offlinePrice = applyPriceChange((row as any)?.offlinePrice, offlinePrice)
    updatedRow.entraversePrice = applyPriceChange((row as any)?.entraversePrice, entraversePrice)
    updatedRow.tokopediaPrice = applyPriceChange((row as any)?.tokopediaPrice, tokopediaPrice)
    updatedRow.shopeePrice = applyPriceChange((row as any)?.shopeePrice, shopeePrice)

    return updatedRow
  })

  return { updatedPricing, changed }
}

async function fetchCategories(client: ReturnType<typeof createClient>, targetNames: string[]) {
  const normalizedTargets = targetNames.map(name => name.toLowerCase())
  const { data, error } = await client.from("categories").select("id, name, fees, margin")

  if (error) throw error

  const map = new Map<string, any>()
  data?.forEach(record => {
    const normalized = (record?.name ?? "").toString().trim().toLowerCase()
    if (normalized && normalizedTargets.includes(normalized)) {
      map.set(normalized, record)
    }
  })

  return map
}

async function fetchProducts(client: ReturnType<typeof createClient>, targetNames: string[]) {
  const { data, error } = await client
    .from("products")
    .select("id, category, variant_pricing")

  if (error) throw error

  return (data ?? []).filter(record => {
    const normalized = (record?.category ?? "").toString().trim().toLowerCase()
    return normalized && targetNames.includes(normalized)
  })
}

async function updateProducts(
  client: ReturnType<typeof createClient>,
  products: { id: string; variant_pricing: any }[]
) {
  for (const product of products) {
    const { error } = await client
      .from("products")
      .update({ variant_pricing: product.variant_pricing, updated_at: new Date().toISOString() })
      .eq("id", product.id)

    if (error) throw error
  }
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("", { headers: corsHeaders })
  }

  if (!req.method || !["POST"].includes(req.method)) {
    return jsonResponse(405, { error: "Method not allowed" })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse(500, { error: "Supabase credentials missing" })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch (_error) {
    return jsonResponse(400, { error: "Invalid JSON payload" })
  }

  const categories = Array.isArray(payload?.categories)
    ? payload.categories.map((item: any) => item?.toString?.().trim()).filter(Boolean)
    : []

  if (!categories.length) {
    return jsonResponse(400, { error: "Field 'categories' is required" })
  }

  const normalizedTargets = categories.map((name: string) => name.toLowerCase())
  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const categoryMap = await fetchCategories(client, normalizedTargets)
    if (!categoryMap.size) {
      return jsonResponse(200, {
        updatedProducts: 0,
        scannedProducts: 0,
        message: "No matching categories found"
      })
    }

    const products = await fetchProducts(client, normalizedTargets)
    let updatedCount = 0
    const updates: { id: string; variant_pricing: any }[] = []

    products.forEach(record => {
      const normalizedCategory = (record?.category ?? "").toString().trim().toLowerCase()
      const category = categoryMap.get(normalizedCategory)
      const pricingRows = Array.isArray(record?.variant_pricing) ? record.variant_pricing : []
      const { updatedPricing, changed } = recalculatePricingWithFees(pricingRows, category)

      if (!changed) return

      updates.push({ id: record.id, variant_pricing: updatedPricing })
      updatedCount += 1
    })

    if (updates.length) {
      await updateProducts(client, updates)
    }

    return jsonResponse(200, {
      updatedProducts: updatedCount,
      scannedProducts: products.length
    })
  } catch (error) {
    console.error("recalculate-pricing error", error)
    return jsonResponse(500, { error: (error as Error).message })
  }
})
