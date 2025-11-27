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

function buildAverageMap(rows: unknown[], windowDays = 30) {
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
  const { data, error } = await client
    .from("warehouse_movements")
    .select("rows, updated_at")
    .eq("source", "manual")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST301") {
      return { rows: [], updatedAt: null as string | null }
    }
    throw error
  }

  return { rows: Array.isArray(data?.rows) ? data.rows : [], updatedAt: data?.updated_at ?? null }
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

    const { rows, updatedAt } = await fetchLatestManualRows(supabase)
    const averageMap = buildAverageMap(rows)

    if (!averageMap.size) {
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
      let inventoryDailyAverage: number | null = null

      const updatedPricing = pricingRows.map(row => {
        const sku = normalizeSku(row.sellerSku ?? row.sku)
        if (!sku) return row

        const matched = averageMap.get(sku)
        if (!matched) return row

        const normalizedAverage = pickDailyAverageValue(row.dailyAverageSales ?? row.daily_average_sales)
        const targetAverage = Number(matched.average.toFixed(2))
        if (normalizedAverage !== targetAverage) {
          hasChange = true
          inventoryDailyAverage = inventoryDailyAverage ?? targetAverage
          touchedVariants += 1
          return { ...row, dailyAverageSales: targetAverage }
        }

        return row
      })

      if (!hasChange) return

      const inventory = normalizeInventory(record.inventory)
      if (inventoryDailyAverage !== null) {
        const normalized = pickDailyAverageValue(inventory.dailyAverageSales ?? inventory.daily_average_sales)
        if (normalized !== inventoryDailyAverage) {
          inventory.dailyAverageSales = inventoryDailyAverage
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
