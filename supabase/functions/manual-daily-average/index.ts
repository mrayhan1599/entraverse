import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2"

type JsonRecord = Record<string, unknown>

type ManualRow = {
  productCode?: string
  product_code?: string
  sku?: string
  qtyOut?: unknown
  qty_out?: unknown
  qty?: unknown
  quantity?: unknown
}

type ProductRecord = {
  id: string
  variant_pricing?: unknown
  inventory?: unknown
}

type VariantPricingRow = {
  sellerSku?: unknown
  sku?: unknown
  dailyAverageSales?: unknown
  daily_average_sales?: unknown
  dailyAverageSalesPeriodA?: unknown
  daily_average_sales_period_a?: unknown
  dailyAverageSalesPeriodB?: unknown
  daily_average_sales_period_b?: unknown
  [key: string]: unknown
}

const MANUAL_PERIOD_SIGNATURES = {
  "period-a": "manual-period-1",
  "period-b": "manual-period-2"
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

function normalizeSku(value: unknown) {
  const raw = (value ?? "").toString().trim()
  if (!raw) return ""
  return raw.replace(/\s+/g, "").toLowerCase()
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

function buildAverageMap(rows: unknown[], windowDays: number) {
  const days = Math.max(1, Number.isFinite(windowDays) ? Number(windowDays) : 30)
  const map = new Map<string, { totalOut: number; average: number }>()

  ;(Array.isArray(rows) ? rows : []).forEach(entry => {
    if (!entry || typeof entry !== "object") return
    const record = entry as ManualRow
    const sku = normalizeSku(record.productCode ?? record.product_code ?? record.sku)
    if (!sku) return

    const qty =
      parseNumber(record.qtyOut) ?? parseNumber(record.qty_out) ?? parseNumber(record.qty) ?? parseNumber(record.quantity)
    if (qty === null) return

    const previous = map.get(sku) ?? { totalOut: 0, average: 0 }
    const totalOut = previous.totalOut + qty
    map.set(sku, { totalOut, average: totalOut / days })
  })

  return map
}

function pickDailyAverageValue(value: unknown) {
  const parsed = parseNumber(value)
  return parsed === null ? null : Number(parsed.toFixed(2))
}

function normalizeInventory(inventory: unknown) {
  if (!inventory || typeof inventory !== "object") return {}
  return { ...(inventory as JsonRecord) }
}

async function fetchLatestManualRows(client: SupabaseClient) {
  const periodSignatures = Object.values(MANUAL_PERIOD_SIGNATURES)
  const { data, error } = await client
    .from("warehouse_movements")
    .select("period_signature, rows, updated_at")
    .eq("source", "manual")
    .in("period_signature", periodSignatures)
    .order("updated_at", { ascending: false })

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST301") {
      return {}
    }
    throw error
  }

  const grouped: Record<string, { rows: unknown[]; updatedAt: string | null; signature: string }> = {}

  ;(data ?? []).forEach(entry => {
    const signature = (entry as { period_signature?: string })?.period_signature ?? ""
    const periodKey = Object.entries(MANUAL_PERIOD_SIGNATURES).find(([, value]) => value === signature)?.[0]
    if (!periodKey || grouped[periodKey]) return

    grouped[periodKey] = {
      rows: Array.isArray((entry as { rows?: unknown[] }).rows) ? (entry as { rows?: unknown[] }).rows ?? [] : [],
      updatedAt: (entry as { updated_at?: string | null }).updated_at ?? null,
      signature
    }
  })

  return grouped
}

function getWibDateParts(dateValue = new Date()) {
  const wibString = new Date(dateValue).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  const wib = new Date(wibString)

  return {
    year: wib.getFullYear(),
    month: wib.getMonth(),
    day: wib.getDate()
  }
}

function getDaysInMonth(year: number, monthZeroBased: number) {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate()
}

function getManualAverageContext(now = new Date()) {
  const { year, month, day } = getWibDateParts(now)
  const isPeriodA = day <= 15

  const previousMonth = month === 0 ? 11 : month - 1
  const previousYear = month === 0 ? year - 1 : year

  const daysInCurrentMonth = getDaysInMonth(year, month)
  const daysInPreviousMonth = getDaysInMonth(previousYear, previousMonth)

  const periodADays = isPeriodA ? day : 15
  const periodBDays = isPeriodA
    ? Math.max(1, daysInPreviousMonth - 15)
    : Math.max(1, Math.min(day, daysInCurrentMonth) - 15)

  return {
    isPeriodA,
    periodADays,
    periodBDays,
    periodAReference: { year, month },
    periodBReference: isPeriodA ? { year: previousYear, month: previousMonth } : { year, month }
  }
}

async function fetchProducts(client: SupabaseClient) {
  const { data, error } = await client
    .from("products")
    .select("id, variant_pricing, inventory")

  if (error) throw error
  return (data ?? []) as ProductRecord[]
}

async function updateProducts(client: SupabaseClient, payload: JsonRecord[]) {
  const items = Array.isArray(payload) ? payload.filter(item => item?.id) : []
  if (!items.length) return

  for (const row of items) {
    const { id, ...rest } = row as { id: string }
    const { error } = await client.from("products").update(rest).eq("id", id)
    if (error) throw error
  }
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const traceId = crypto.randomUUID()

  try {
    const env = Deno.env.toObject()
    const supabaseUrl = (env.SUPABASE_URL ?? "").toString().trim()
    const serviceKey =
      (env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_KEY ?? env.SUPABASE_ANON_KEY ?? "").toString().trim()

    if (!supabaseUrl || !serviceKey) {
      return jsonResponse(500, {
        ok: false,
        traceId,
        stage: "config",
        error: "SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi"
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { "x-entraverse-trace-id": traceId } }
    })

    const context = getManualAverageContext()
    const manualRows = await fetchLatestManualRows(supabase)

    const periodARows = manualRows["period-a"]?.rows ?? []
    const periodBRows = manualRows["period-b"]?.rows ?? []

    const updatedAtCandidates = [manualRows["period-a"]?.updatedAt, manualRows["period-b"]?.updatedAt]
      .filter((value): value is string => typeof value === "string" && !!value)
      .sort()

    const updatedAt = updatedAtCandidates[updatedAtCandidates.length - 1] ?? null

    const periodAMap = buildAverageMap(periodARows, context.periodADays)
    const periodBMap = buildAverageMap(periodBRows, context.periodBDays)

    if (!periodAMap.size && !periodBMap.size) {
      return jsonResponse(200, {
        ok: true,
        traceId,
        stage: "compute",
        message: "Tidak ada SKU dengan qty keluar pada unggahan manual.",
        updatedAt
      })
    }

    const products = await fetchProducts(supabase)
    const updates: JsonRecord[] = []
    let touchedVariants = 0

    products.forEach(record => {
      if (!record?.id) return
      const pricingRows = Array.isArray(record.variant_pricing)
        ? (record.variant_pricing as VariantPricingRow[]).map(row => ({ ...(row ?? {}) }))
        : []

      if (!pricingRows.length) return

      let hasChange = false
      let inventoryDailyAverageA: number | null = null
      let inventoryDailyAverageB: number | null = null

      const updatedPricing = pricingRows.map(row => {
        const sku = normalizeSku(row.sellerSku ?? row.sku)
        if (!sku) return row

        const matchedA = periodAMap.get(sku)
        const matchedB = periodBMap.get(sku)
        let nextRow = row
        let rowTouched = false

        if (matchedA) {
          const normalizedAverageA = pickDailyAverageValue(row.dailyAverageSalesPeriodA ?? row.daily_average_sales_period_a)
          const targetAverageA = Number(matchedA.average.toFixed(2))
          const rawAverageA = row.dailyAverageSalesPeriodA ?? row.daily_average_sales_period_a

          if (normalizedAverageA !== targetAverageA || typeof rawAverageA !== "number") {
            hasChange = true
            rowTouched = true
            inventoryDailyAverageA = inventoryDailyAverageA ?? targetAverageA
            nextRow = { ...nextRow, dailyAverageSalesPeriodA: targetAverageA }
          }
        }

        if (matchedB) {
          const normalizedAverageB = pickDailyAverageValue(row.dailyAverageSalesPeriodB ?? row.daily_average_sales_period_b)
          const targetAverageB = Number(matchedB.average.toFixed(2))
          const rawAverageB = row.dailyAverageSalesPeriodB ?? row.daily_average_sales_period_b

          if (normalizedAverageB !== targetAverageB || typeof rawAverageB !== "number") {
            hasChange = true
            rowTouched = true
            inventoryDailyAverageB = inventoryDailyAverageB ?? targetAverageB
            nextRow = { ...nextRow, dailyAverageSalesPeriodB: targetAverageB }
          }
        }

        if (rowTouched) {
          touchedVariants += 1
        }

        return nextRow
      })

      if (!hasChange) return

      const inventory = normalizeInventory(record.inventory)
      if (inventoryDailyAverageA !== null) {
        const rawDailyAverage = inventory.dailyAverageSalesPeriodA ?? inventory.daily_average_sales_period_a
        const normalized = pickDailyAverageValue(rawDailyAverage)
        if (normalized !== inventoryDailyAverageA || typeof rawDailyAverage !== "number") {
          inventory.dailyAverageSalesPeriodA = inventoryDailyAverageA
        }
      }

      if (inventoryDailyAverageB !== null) {
        const rawDailyAverage = inventory.dailyAverageSalesPeriodB ?? inventory.daily_average_sales_period_b
        const normalized = pickDailyAverageValue(rawDailyAverage)
        if (normalized !== inventoryDailyAverageB || typeof rawDailyAverage !== "number") {
          inventory.dailyAverageSalesPeriodB = inventoryDailyAverageB
        }
      }

      updates.push({
        id: record.id,
        variant_pricing: updatedPricing,
        inventory,
        updated_at: new Date().toISOString()
      })
    })

    if (!updates.length) {
      return jsonResponse(200, {
        ok: true,
        traceId,
        stage: "update",
        message: "Tidak ada produk yang perlu diperbarui.",
        updatedAt
      })
    }

    await updateProducts(supabase, updates)

    return jsonResponse(200, {
      ok: true,
      traceId,
      stage: "complete",
      updatedAt,
      productsUpdated: updates.length,
      variantsUpdated: touchedVariants
    })
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      traceId,
      stage: "exception",
      error: error?.message ?? String(error)
    })
  }
})
