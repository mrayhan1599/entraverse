import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2"

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

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  const stringified = (value ?? "").toString().replace(/[^0-9,.-]/g, "").replace(/,/g, ".").trim()
  if (!stringified) return null

  const parsed = Number.parseFloat(stringified)
  return Number.isFinite(parsed) ? parsed : null
}

function toDateOnly(value: unknown) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getWibDateOnly(reference = new Date()) {
  const wibString = new Date(reference).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  const wibDate = new Date(wibString)
  return new Date(wibDate.getFullYear(), wibDate.getMonth(), wibDate.getDate())
}

function calculateDaysSince(startDate: Date, endDate: Date) {
  const diff = endDate.getTime() - startDate.getTime()
  if (!Number.isFinite(diff) || diff < 0) return null
  return Math.floor(diff / (24 * 60 * 60 * 1000))
}

function formatResult(value: number) {
  const rounded = Math.round(value * 100) / 100
  return Number.isFinite(rounded) ? rounded : null
}

function shouldUpdate(current: unknown, next: number | null) {
  const parsedCurrent = parseNumber(current)
  if (next === null) return false
  if (parsedCurrent === null) return true
  return Math.abs(parsedCurrent - next) >= 0.01
}

type VariantPricingRow = {
  startDate?: unknown
  start_date?: unknown
  initialStockPrediction?: unknown
  initial_stock_prediction?: unknown
  stock?: unknown
  current_stock?: unknown
  inTransitStock?: unknown
  in_transit_stock?: unknown
  reorderPoint?: unknown
  reorder_point?: unknown
  fifteenDayRequirement?: unknown
  fifteen_day_requirement?: unknown
  nextProcurement?: unknown
  next_procurement?: unknown
  sellerSku?: unknown
  sku?: unknown
}

async function fetchProducts(client: SupabaseClient) {
  const { data, error } = await client.from("products").select("id, variant_pricing")
  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`)
  }
  return data ?? []
}

function computeNextProcurement(row: VariantPricingRow, today: Date) {
  const startDate = toDateOnly(row.startDate ?? row.start_date) ?? today
  const parsedInitialStock = parseNumber(row.initialStockPrediction ?? row.initial_stock_prediction)
  const initialStock = parsedInitialStock !== null && parsedInitialStock >= 0 ? parsedInitialStock : 0

  const daysSinceStart = calculateDaysSince(startDate, today)
  if (daysSinceStart === null) return null
  if (daysSinceStart < 30) {
    return formatResult(initialStock)
  }

  const requirement = parseNumber(row.fifteenDayRequirement ?? row.fifteen_day_requirement)
  const reorderPoint = parseNumber(row.reorderPoint ?? row.reorder_point)
  if (requirement === null || reorderPoint === null) {
    return null
  }

  const stock =
    parseNumber(row.stock ?? row.current_stock) ?? 0
  const inTransit = parseNumber(row.inTransitStock ?? row.in_transit_stock) ?? 0
  const combined = stock + inTransit

  const computed =
    combined <= reorderPoint ? requirement : Math.max(requirement - (combined - reorderPoint), 0)

  return formatResult(computed)
}

async function updateProducts(client: SupabaseClient, products: any[], today: Date) {
  let variantsUpdated = 0
  let productsWritten = 0

  for (const record of products) {
    const rawRows = Array.isArray(record?.variant_pricing)
      ? (record.variant_pricing as Record<string, unknown>[]).map(row => ({ ...(row ?? {}) }))
      : []

    if (!rawRows.length || !record?.id) continue

    let changed = false
    const updatedRows = rawRows.map(row => {
      const computed = computeNextProcurement(row as VariantPricingRow, today)
      if (computed === null) return row

      const shouldWrite = shouldUpdate((row as VariantPricingRow).nextProcurement ?? (row as any)?.next_procurement, computed)
      if (!shouldWrite) return row

      changed = true
      variantsUpdated += 1
      return { ...row, nextProcurement: computed, next_procurement: computed }
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

  return { variantsUpdated, productsWritten }
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
    const products = await fetchProducts(client)
    const { variantsUpdated, productsWritten } = await updateProducts(client, products, today)

    return jsonResponse(200, {
      scannedProducts: products.length,
      variantsUpdated,
      productsWritten
    })
  } catch (error) {
    console.error("next-procurement-calc error", error)
    return jsonResponse(500, { error: (error as Error).message })
  }
})
