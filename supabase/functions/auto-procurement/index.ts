import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

type CatalogItem = {
  id: string
  product_name: string
  sku: string
  lead_time_days: number
  default_vendor: string | null
  default_quantity: number | null
  unit: string | null
  is_active: boolean
}

type ProcurementNeed = {
  item_name: string
  sku: string
  vendor?: string | null
  quantity?: number | null
  unit?: string | null
  target_date?: string | null
  priority?: string | null
  notes?: string | null
  status?: string | null
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

function getWibDateOnly(reference = new Date()) {
  const wib = new Date(reference).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  const date = new Date(wib)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function subtractDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() - days)
  return new Date(copy.getFullYear(), copy.getMonth(), copy.getDate())
}

function getNextSalesPeriodStart(today: Date) {
  const year = today.getFullYear()
  const month = today.getMonth()
  const day = today.getDate()

  if (day <= 15) {
    return new Date(year, month, 16)
  }

  const nextMonth = month + 1
  return new Date(year, nextMonth, 1)
}

async function fetchCatalog(client: ReturnType<typeof createClient>) {
  const { data, error } = await client
    .from("procurement_catalog")
    .select("id, product_name, sku, lead_time_days, default_vendor, default_quantity, unit, is_active")
    .eq("is_active", true)

  if (error) {
    throw new Error(`Gagal mengambil katalog pengadaan: ${error.message}`)
  }

  return (data ?? []) as CatalogItem[]
}

async function alreadyScheduled(
  client: ReturnType<typeof createClient>,
  sku: string,
  targetDate: string
) {
  const { data, error } = await client
    .from("procurement_needs")
    .select("id")
    .eq("sku", sku)
    .eq("target_date", targetDate)
    .limit(1)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error(`Gagal memeriksa duplikasi pengadaan: ${error.message}`)
  }

  return Boolean(data?.id)
}

async function insertNeed(
  client: ReturnType<typeof createClient>,
  payload: ProcurementNeed
) {
  const { error } = await client.from("procurement_needs").insert(payload)
  if (error) {
    throw new Error(`Gagal menulis kebutuhan pengadaan: ${error.message}`)
  }
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
    const todayWib = getWibDateOnly()
    const nextPeriodStart = getNextSalesPeriodStart(todayWib)
    const procurementDateString = toIsoDate(todayWib)
    const periodStartString = toIsoDate(nextPeriodStart)

    const catalog = await fetchCatalog(client)

    let inserted = 0
    let skipped = 0

    for (const item of catalog) {
      const leadTime = Number(item.lead_time_days)
      if (!Number.isFinite(leadTime) || leadTime < 0) {
        skipped += 1
        continue
      }

      const procurementDate = subtractDays(nextPeriodStart, leadTime)
      if (toIsoDate(procurementDate) !== procurementDateString) {
        skipped += 1
        continue
      }

      const isDuplicate = await alreadyScheduled(client, item.sku, procurementDateString)
      if (isDuplicate) {
        skipped += 1
        continue
      }

      await insertNeed(client, {
        item_name: item.product_name,
        sku: item.sku,
        vendor: item.default_vendor,
        quantity: item.default_quantity ?? 0,
        unit: item.unit ?? "pcs",
        target_date: procurementDateString,
        priority: "tinggi",
        notes: `Dijadwalkan otomatis untuk periode mulai ${periodStartString} (lead time ${leadTime} hari).`,
        status: "direncanakan"
      })

      inserted += 1
    }

    return jsonResponse(200, {
      today: procurementDateString,
      nextPeriodStart: periodStartString,
      productsScanned: catalog.length,
      inserted,
      skipped
    })
  } catch (error) {
    console.error("auto-procurement error", error)
    return jsonResponse(500, { error: (error as Error).message })
  }
})
