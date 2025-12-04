import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2"

type JsonRecord = Record<string, unknown>

type IntegrationRecord = {
  name?: string | null
  api_base_url?: string | null
  access_token?: string | null
}

type WarehouseProduct = {
  product_name?: unknown
  product_code?: unknown
  units?: unknown
  opening_balance?: unknown
  qty_in?: unknown
  qty_out?: unknown
  closing_balance?: unknown
}

type WarehouseEntry = {
  warehouse_name?: unknown
  warehouse_name_url?: unknown
  products?: unknown
}

type WarehouseSummary = {
  header?: unknown
  list?: unknown
}

type PeriodWindow = {
  key: "period-a" | "period-b"
  start: Date
  end: Date
  signature: string
}

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type"
}

const DEFAULT_BASE_URL = "https://api.jurnal.id"
const DEFAULT_PATH = "partner/core/api/v1/warehouse_items_stock_movement_summary"
const DEFAULT_INTEGRATION_NAME = "Mekari Jurnal"
const DEFAULT_TARGET_WAREHOUSE = "Display"

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS }
  })
}

function normalizeBaseUrl(value?: string | null) {
  const trimmed = (value ?? DEFAULT_BASE_URL).toString().trim()
  if (!trimmed) return DEFAULT_BASE_URL
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, "")
  return `https://${trimmed.replace(/\/+$/, "")}`
}

function normalizePath(value?: string | null) {
  const trimmed = (value ?? DEFAULT_PATH).toString().trim()
  return trimmed.replace(/^\/+/, "").replace(/\/+$/, "")
}

function pad2(value: number) {
  return value.toString().padStart(2, "0")
}

function formatDateOnly(date?: Date | string | number | null) {
  if (!date) return null
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function toWibDate(dateValue = new Date()) {
  const wibString = new Date(dateValue).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  return new Date(wibString)
}

function getDaysInMonth(year: number, monthZeroBased: number) {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate()
}

function resolvePeriods(referenceDate = new Date()): { periodA: PeriodWindow; periodB: PeriodWindow } {
  const now = toWibDate(referenceDate)
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()

  const daysInCurrentMonth = getDaysInMonth(year, month)

  const periodAStart = new Date(Date.UTC(year, month, 1))
  const periodAEnd = new Date(Date.UTC(year, month, Math.min(15, daysInCurrentMonth)))

  const isPeriodAActive = day <= 15
  const previousMonth = month === 0 ? 11 : month - 1
  const previousYear = month === 0 ? year - 1 : year
  const periodBYear = isPeriodAActive ? previousYear : year
  const periodBMonth = isPeriodAActive ? previousMonth : month
  const periodBStart = new Date(Date.UTC(periodBYear, periodBMonth, 16))
  const periodBEnd = new Date(Date.UTC(periodBYear, periodBMonth, getDaysInMonth(periodBYear, periodBMonth)))

  const periodA: PeriodWindow = {
    key: "period-a",
    start: periodAStart,
    end: periodAEnd,
    signature: `auto-period-a-${year}-${pad2(month + 1)}`
  }

  const periodB: PeriodWindow = {
    key: "period-b",
    start: periodBStart,
    end: periodBEnd,
    signature: `auto-period-b-${periodBYear}-${pad2(periodBMonth + 1)}`
  }

  return { periodA, periodB }
}

function parseNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const normalized = (value ?? "").toString().replace(/[^0-9,.-]/g, "").replace(/,/g, ".").trim()
  if (!normalized) return fallback
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeWarehouseSummary(
  summary: WarehouseSummary,
  { targetWarehouseName = DEFAULT_TARGET_WAREHOUSE }: { targetWarehouseName?: string } = {}
) {
  const payload = summary?.data && typeof summary.data === "object"
    ? (summary.data as WarehouseSummary)
    : summary

  const header = payload?.header && typeof payload.header === "object"
    ? {
        date: (payload.header as JsonRecord).date?.toString() ?? null,
        currency: (payload.header as JsonRecord).currency?.toString() ?? null,
        companyName: (payload.header as JsonRecord).company_name?.toString() ?? null
      }
    : null

  const list = Array.isArray(payload?.list) ? (payload.list as WarehouseEntry[]) : []
  const rows: JsonRecord[] = []
  const target = (targetWarehouseName ?? DEFAULT_TARGET_WAREHOUSE).toString().trim().toLowerCase()
  const trackedWarehouses = new Set<string>()

  list.forEach(entry => {
    if (!entry || typeof entry !== "object") return

    const rawName = (entry.warehouse_name ?? "Gudang Tanpa Nama").toString()
    const warehouseName = rawName.trim()
    if (!warehouseName || warehouseName.toLowerCase() !== target) return

    trackedWarehouses.add(warehouseName)
    const products = Array.isArray(entry.products) ? (entry.products as WarehouseProduct[]) : []
    const warehouseUrl = entry.warehouse_name_url ? entry.warehouse_name_url.toString() : null

    products.forEach(product => {
      if (!product || typeof product !== "object") return

      rows.push({
        warehouseName,
        warehouseUrl,
        productName: (product.product_name ?? product.product_code ?? "Produk tanpa nama").toString(),
        productCode: product.product_code ? product.product_code.toString() : "",
        units: product.units ? product.units.toString() : "-",
        openingBalance: parseNumber(product.opening_balance),
        qtyIn: parseNumber(product.qty_in),
        qtyOut: parseNumber(product.qty_out),
        closingBalance: parseNumber(product.closing_balance)
      })
    })
  })

  const totals = rows.length
    ? rows.reduce(
        (acc, item) => ({
          opening: acc.opening + (Number.isFinite(item.openingBalance) ? Number(item.openingBalance) : 0),
          in: acc.in + (Number.isFinite(item.qtyIn) ? Number(item.qtyIn) : 0),
          out: acc.out + (Number.isFinite(item.qtyOut) ? Number(item.qtyOut) : 0),
          closing: acc.closing + (Number.isFinite(item.closingBalance) ? Number(item.closingBalance) : 0)
        }),
        { opening: 0, in: 0, out: 0, closing: 0 }
      )
    : null

  return { header, rows, totals, warehouses: trackedWarehouses.size }
}

async function resolveIntegration(client: SupabaseClient, env: Record<string, string>) {
  const preferredName = (env.WAREHOUSE_INTEGRATION_NAME ?? DEFAULT_INTEGRATION_NAME).toString().trim()

  try {
    const { data, error } = await client
      .from("api_integrations")
      .select("name, api_base_url, access_token")
      .ilike("name", preferredName)
      .maybeSingle()

    if (error) {
      if (error.code !== "42P01" && error.code !== "PGRST301") {
        console.warn("Gagal memuat konfigurasi integrasi.", error)
      }
    }

    if (data) {
      const record = data as IntegrationRecord
      const baseUrl = normalizeBaseUrl(record.api_base_url)
      const token = (record.access_token ?? env.WAREHOUSE_API_TOKEN ?? "").toString().trim()
      return { baseUrl, token }
    }
  } catch (error) {
    console.warn("Integrasi tidak dapat dibaca dari Supabase.", error)
  }

  return {
    baseUrl: normalizeBaseUrl(env.WAREHOUSE_API_BASE_URL),
    token: (env.WAREHOUSE_API_TOKEN ?? "").toString().trim()
  }
}

async function fetchWarehouseSummary({
  baseUrl,
  path,
  token,
  startDate,
  endDate
}: {
  baseUrl: string
  path: string
  token: string
  startDate: string
  endDate: string
}) {
  const qs = new URLSearchParams()
  if (startDate) qs.set("start_date", startDate)
  if (endDate) qs.set("end_date", endDate)

  const endpoint = `${normalizeBaseUrl(baseUrl)}/${normalizePath(path)}`
  const url = qs.toString() ? `${endpoint}?${qs.toString()}` : endpoint

  const headers = new Headers({ Accept: "application/json" })
  headers.set("Authorization", token)
  headers.set("apikey", token)

  const res = await fetch(url, { method: "GET", headers })
  const raw = await res.text()

  if (!res.ok) {
    throw new Error(`Warehouse API error ${res.status}: ${raw.slice(0, 500)}`)
  }

  try {
    return JSON.parse(raw)
  } catch (error) {
    console.error("Payload warehouse tidak valid.", error)
    throw new Error("Gagal mengurai respons warehouse movement API.")
  }
}

async function upsertWarehouseSnapshot(
  client: SupabaseClient,
  snapshot: {
    signature: string
    start: string
    end: string
    header: unknown
    totals: unknown
    rows: unknown[]
    warehouses: number
  }
) {
  const payload: JsonRecord = {
    source: "auto",
    period_signature: snapshot.signature,
    period_start: snapshot.start,
    period_end: snapshot.end,
    header: snapshot.header ?? null,
    totals: snapshot.totals ?? null,
    rows: Array.isArray(snapshot.rows) ? snapshot.rows : [],
    warehouses: snapshot.warehouses ?? 0,
    last_loaded_at: new Date().toISOString()
  }

  const { error, data } = await client
    .from("warehouse_movements")
    .upsert(payload, { onConflict: "source,period_signature" })
    .select()
    .maybeSingle()

  if (error) throw error

  return data ?? payload
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
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

    const { periodA, periodB } = resolvePeriods()
    const integration = await resolveIntegration(supabase, env)

    if (!integration.token) {
      return jsonResponse(500, {
        ok: false,
        traceId,
        stage: "integration",
        error: "Token API warehouse belum tersedia. Set WAREHOUSE_API_TOKEN atau isi access_token di tabel api_integrations."
      })
    }

    const targetWarehouse = (env.WAREHOUSE_TARGET_WAREHOUSE ?? DEFAULT_TARGET_WAREHOUSE).toString()
    const path = normalizePath(env.WAREHOUSE_API_PATH ?? DEFAULT_PATH)

    const windows = [periodA, periodB]
    const results: JsonRecord[] = []

    for (const window of windows) {
      const start = formatDateOnly(window.start)
      const end = formatDateOnly(window.end)

      if (!start || !end) {
        results.push({
          period: window.key,
          signature: window.signature,
          ok: false,
          error: "Rentang tanggal tidak valid"
        })
        continue
      }

      try {
        const raw = await fetchWarehouseSummary({
          baseUrl: integration.baseUrl,
          path,
          token: integration.token,
          startDate: start,
          endDate: end
        })

        const normalized = normalizeWarehouseSummary(raw, { targetWarehouseName: targetWarehouse })
        const saved = await upsertWarehouseSnapshot(supabase, {
          signature: window.signature,
          start,
          end,
          header: normalized.header,
          totals: normalized.totals,
          rows: normalized.rows,
          warehouses: normalized.warehouses
        })

        results.push({
          period: window.key,
          signature: window.signature,
          start_date: start,
          end_date: end,
          rows: Array.isArray(normalized.rows) ? normalized.rows.length : 0,
          warehouses: normalized.warehouses ?? 0,
          updated_record_id: (saved as { id?: string })?.id ?? null
        })
      } catch (error) {
        console.error(`Gagal memperbarui periode ${window.key}`, error)
        results.push({
          period: window.key,
          signature: window.signature,
          start_date: start,
          end_date: end,
          ok: false,
          error: error?.message ?? "Gagal memproses periode"
        })
      }
    }

    return jsonResponse(200, { ok: true, traceId, results })
  } catch (error) {
    console.error("warehouse-movement-auto gagal", error)
    return jsonResponse(500, {
      ok: false,
      traceId,
      stage: "exception",
      error: error?.message ?? "Terjadi kesalahan tak terduga"
    })
  }
})
