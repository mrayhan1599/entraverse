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
  stockOutFactorPeriodA?: unknown
  stock_out_factor_period_a?: unknown
  stockOutFactorPeriodB?: unknown
  stock_out_factor_period_b?: unknown
  stockOutDatePeriodA?: unknown
  stock_out_date_period_a?: unknown
  stockOutDatePeriodB?: unknown
  stock_out_date_period_b?: unknown
  finalDailyAveragePerDay?: unknown
  final_daily_average_per_day?: unknown
  leadTime?: unknown
  lead_time?: unknown
  reorderPoint?: unknown
  reorder_point?: unknown
  [key: string]: unknown
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

function pickReorderPointValue(value: unknown) {
  const parsed = parseNumber(value)
  if (parsed === null || parsed < 0) return null

  const rounded = Number(parsed.toFixed(2))
  return Number.isFinite(rounded) ? rounded : null
}

function normalizeInventory(inventory: unknown) {
  if (!inventory || typeof inventory !== "object") return {}
  return { ...(inventory as JsonRecord) }
}

async function fetchLatestAutoRows(client: SupabaseClient) {
  const { periodA, periodB } = getAutoPeriods()
  const signatureMap: Record<string, string> = {
    "period-a": periodA.signature,
    "period-b": periodB.signature
  }
  const periodSignatures = Object.values(signatureMap)
  const { data, error } = await client
    .from("warehouse_movements")
    .select("period_signature, rows, updated_at")
    .eq("source", "auto")
    .in("period_signature", periodSignatures)
    .order("updated_at", { ascending: false })

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST301") {
      return { grouped: {}, periods: { periodA, periodB } }
    }
    throw error
  }

  const grouped: Record<string, { rows: unknown[]; updatedAt: string | null; signature: string }> = {}

  ;(data ?? []).forEach(entry => {
    const signature = (entry as { period_signature?: string })?.period_signature ?? ""
    const periodKey = Object.entries(signatureMap).find(([, value]) => value === signature)?.[0]
    if (!periodKey || grouped[periodKey]) return

    grouped[periodKey] = {
      rows: Array.isArray((entry as { rows?: unknown[] }).rows) ? (entry as { rows?: unknown[] }).rows ?? [] : [],
      updatedAt: (entry as { updated_at?: string | null }).updated_at ?? null,
      signature
    }
  })

  return { grouped, periods: { periodA, periodB } }
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

function toDateOnlyString(date: Date) {
  const iso = date.toISOString()
  return iso.slice(0, 10)
}

function pad2(value: number) {
  return String(Math.max(0, Math.floor(value))).padStart(2, "0")
}

function calculateInclusiveDays(startDate: Date, endDate: Date) {
  const diff = endDate.getTime() - startDate.getTime()
  if (!Number.isFinite(diff) || diff < 0) return 0

  return Math.floor(diff / (24 * 60 * 60 * 1000)) + 1
}

function getDaysInMonth(year: number, monthZeroBased: number) {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate()
}

function calculateElapsedDays(startDate: Date, endDate: Date, referenceDate: Date) {
  const start = startDate.getTime()
  const end = endDate.getTime()
  const reference = referenceDate.getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(reference)) {
    return 0
  }

  const clampedReference = reference < start ? start : reference > end ? end : reference
  return calculateInclusiveDays(startDate, new Date(clampedReference))
}

function getAutoPeriods(referenceDate = new Date()) {
  const { year, month, day } = getWibDateParts(referenceDate)
  const daysInMonth = getDaysInMonth(year, month)
  const periodAEndDay = Math.min(15, daysInMonth)

  const periodAStart = new Date(Date.UTC(year, month, 1))
  const periodAEnd = new Date(Date.UTC(year, month, periodAEndDay))

  const isPeriodAActive = day <= 15
  const previousMonth = month === 0 ? 11 : month - 1
  const previousYear = month === 0 ? year - 1 : year
  const periodBYear = isPeriodAActive ? previousYear : year
  const periodBMonth = isPeriodAActive ? previousMonth : month
  const periodBDays = getDaysInMonth(periodBYear, periodBMonth)
  const periodBStart = new Date(Date.UTC(periodBYear, periodBMonth, 16))
  const periodBEnd = new Date(Date.UTC(periodBYear, periodBMonth, periodBDays))

  const referenceDateOnly = new Date(Date.UTC(year, month, day))
  const periodAElapsedDays = calculateElapsedDays(periodAStart, periodAEnd, referenceDateOnly)
  const periodBElapsedDays = calculateElapsedDays(periodBStart, periodBEnd, referenceDateOnly)

  return {
    periodA: {
      key: "period-a",
      start: toDateOnlyString(periodAStart),
      end: toDateOnlyString(periodAEnd),
      signature: `auto-period-a-${year}-${pad2(month + 1)}`,
      days: calculateInclusiveDays(periodAStart, periodAEnd),
      elapsedDays: periodAElapsedDays
    },
    periodB: {
      key: "period-b",
      start: toDateOnlyString(periodBStart),
      end: toDateOnlyString(periodBEnd),
      signature: `auto-period-b-${periodBYear}-${pad2(periodBMonth + 1)}`,
      days: calculateInclusiveDays(periodBStart, periodBEnd),
      elapsedDays: periodBElapsedDays
    }
  }
}

function parseStockOutDate(value: unknown) {
  if (value instanceof Date) {
    return value
  }

  const raw = (value ?? "").toString().trim()
  if (!raw) return null

  const iso = new Date(raw)
  if (!Number.isNaN(iso.getTime())) {
    return iso
  }

  const parts = raw.split(/[/-]/).filter(Boolean)
  if (parts.length < 3) return null

  const [dayString, monthString, yearString] = parts
  const day = Number.parseInt(dayString, 10)
  const month = Number.parseInt(monthString, 10)
  const year = Number.parseInt(yearString.length === 2 ? `20${yearString}` : yearString, 10)

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null
  }

  const candidate = new Date(Date.UTC(year, Math.max(0, month - 1), day))
  return Number.isNaN(candidate.getTime()) ? null : candidate
}

function calculateStockOutFactor(dateValue: unknown, period: "A" | "B", referenceDate = new Date()) {
  const parsedDate = parseStockOutDate(dateValue)
  if (!parsedDate) return 1

  const referenceParts = getWibDateParts(referenceDate)
  const stockOutParts = getWibDateParts(parsedDate)
  const daysInMonth = getDaysInMonth(referenceParts.year, referenceParts.month)

  if (!daysInMonth) return 1

  const isPeriodA = (period ?? "").toString().toUpperCase() === "A"
  const startDay = isPeriodA ? 1 : 16
  const endDay = isPeriodA ? Math.min(15, daysInMonth) : daysInMonth

  if (
    referenceParts.day < startDay ||
    referenceParts.day > endDay ||
    stockOutParts.day < startDay ||
    stockOutParts.day > endDay
  ) {
    return 1
  }

  const factor = referenceParts.day / stockOutParts.day
  if (!Number.isFinite(factor) || factor <= 0) {
    return 1
  }

  const fixed = Number(factor.toFixed(2))
  return Number.isFinite(fixed) ? fixed : 1
}

function calculateFinalDailyAverage({
  averageA,
  averageB,
  factorA,
  factorB
}: {
  averageA: number | null
  averageB: number | null
  factorA: number | null
  factorB: number | null
}) {
  const hasAverageA = Number.isFinite(averageA)
  const hasAverageB = Number.isFinite(averageB)

  if (!hasAverageA && !hasAverageB) return null

  const safeAverageA = hasAverageA && Number.isFinite(averageA) ? Number(averageA) : 0
  const safeAverageB = hasAverageB && Number.isFinite(averageB) ? Number(averageB) : 0
  const safeFactorA = Number.isFinite(factorA) ? Number(factorA) : 1
  const safeFactorB = Number.isFinite(factorB) ? Number(factorB) : 1

  const computed = (safeAverageA * safeFactorA + safeAverageB * safeFactorB) / 2
  if (!Number.isFinite(computed) || computed < 0) return null

  const rounded = Number(computed.toFixed(2))
  return Number.isFinite(rounded) ? rounded : null
}

function calculateReorderPoint(leadTime: unknown, finalAverage: unknown) {
  const parsedLeadTime = parseNumber(leadTime)
  const parsedFinalAverage = parseNumber(finalAverage)

  if (
    !Number.isFinite(parsedLeadTime) ||
    parsedLeadTime === null ||
    parsedLeadTime < 0 ||
    !Number.isFinite(parsedFinalAverage) ||
    parsedFinalAverage === null ||
    parsedFinalAverage < 0
  ) {
    return null
  }

  const rounded = Number((parsedLeadTime * parsedFinalAverage).toFixed(2))
  return Number.isFinite(rounded) ? rounded : null
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

    const { grouped: autoRows, periods } = await fetchLatestAutoRows(supabase)

    const periodARows = autoRows["period-a"]?.rows ?? []
    const periodBRows = autoRows["period-b"]?.rows ?? []

    const updatedAtCandidates = [autoRows["period-a"]?.updatedAt, autoRows["period-b"]?.updatedAt]
      .filter((value): value is string => typeof value === "string" && !!value)
      .sort()

    const updatedAt = updatedAtCandidates[updatedAtCandidates.length - 1] ?? null

    const periodADivisor = periods.periodA.elapsedDays || periods.periodA.days || 30
    const periodBDivisor = periods.periodB.elapsedDays || periods.periodB.days || 30

    const periodAMap = buildAverageMap(periodARows, periodADivisor)
    const periodBMap = buildAverageMap(periodBRows, periodBDivisor)

    if (!periodAMap.size && !periodBMap.size) {
      return jsonResponse(200, {
        ok: true,
        traceId,
        stage: "compute",
        message: "Tidak ada SKU dengan qty keluar pada snapshot otomatis.",
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
        const normalizedAverageA = pickDailyAverageValue(
          row.dailyAverageSalesPeriodA ?? row.daily_average_sales_period_a
        )
        const normalizedAverageB = pickDailyAverageValue(
          row.dailyAverageSalesPeriodB ?? row.daily_average_sales_period_b
        )
        let targetAverageA = normalizedAverageA
        let targetAverageB = normalizedAverageB
        let nextRow = row
        let rowTouched = false

        if (matchedA) {
          const computedAverageA = Number(matchedA.average.toFixed(2))
          const rawAverageA = row.dailyAverageSalesPeriodA ?? row.daily_average_sales_period_a

          if (normalizedAverageA !== computedAverageA || typeof rawAverageA !== "number") {
            hasChange = true
            rowTouched = true
            inventoryDailyAverageA = inventoryDailyAverageA ?? computedAverageA
            nextRow = { ...nextRow, dailyAverageSalesPeriodA: computedAverageA }
          }

          targetAverageA = computedAverageA
        }

        if (matchedB) {
          const computedAverageB = Number(matchedB.average.toFixed(2))
          const rawAverageB = row.dailyAverageSalesPeriodB ?? row.daily_average_sales_period_b

          if (normalizedAverageB !== computedAverageB || typeof rawAverageB !== "number") {
            hasChange = true
            rowTouched = true
            inventoryDailyAverageB = inventoryDailyAverageB ?? computedAverageB
            nextRow = { ...nextRow, dailyAverageSalesPeriodB: computedAverageB }
          }

          targetAverageB = computedAverageB
        }

        const factorA =
          parseNumber(row.stockOutFactorPeriodA ?? row.stock_out_factor_period_a) ??
          calculateStockOutFactor(row.stockOutDatePeriodA ?? row.stock_out_date_period_a, "A")
        const factorB =
          parseNumber(row.stockOutFactorPeriodB ?? row.stock_out_factor_period_b) ??
          calculateStockOutFactor(row.stockOutDatePeriodB ?? row.stock_out_date_period_b, "B")

        const finalAverage = calculateFinalDailyAverage({
          averageA: targetAverageA,
          averageB: targetAverageB,
          factorA,
          factorB
        })

        const existingFinal = pickDailyAverageValue(
          row.finalDailyAveragePerDay ?? row.final_daily_average_per_day
        )

        if (finalAverage !== null && finalAverage !== existingFinal) {
          hasChange = true
          rowTouched = true
          nextRow = { ...nextRow, finalDailyAveragePerDay: finalAverage }
        }

        const finalAverageForReorder = finalAverage ?? existingFinal
        const leadTime = row.leadTime ?? row.lead_time
        const existingReorderPoint = pickReorderPointValue(
          row.reorderPoint ?? row.reorder_point
        )
        const computedReorderPoint = calculateReorderPoint(
          leadTime,
          finalAverageForReorder
        )

        if (
          computedReorderPoint !== null &&
          computedReorderPoint !== existingReorderPoint
        ) {
          hasChange = true
          rowTouched = true
          nextRow = { ...nextRow, reorderPoint: computedReorderPoint }
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
