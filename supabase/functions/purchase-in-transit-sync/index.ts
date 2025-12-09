import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2"

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type"
}

const DEFAULT_BASE_URL = "https://api.jurnal.id"
const DEFAULT_PATH = "partner/core/api/v1/purchase_orders"
const DEFAULT_PAGE_SIZE = 100
const DEFAULT_STATUS_QUERY_KEY = "transaction_status[name]"
const DEFAULT_STATUS_QUERY_VALUE = "Open"
const DEFAULT_EXTRA_STATUS_KEYS = ["transaction_status", "status"]
const DEFAULT_INTEGRATION_NAME = "Mekari Jurnal"

const IGNORED_STATUSES = new Set(["paid", "cancelled"])

function parseCsv(value?: string | null) {
  return (value ?? "")
    .split(",")
    .map(entry => entry.trim())
    .filter(Boolean)
}

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

function normalizeSku(value: unknown) {
  const raw = (value ?? "").toString().trim()
  if (!raw) return ""
  return raw.replace(/\s+/g, "").toLowerCase()
}

function parseNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const normalized = (value ?? "").toString().replace(/[^0-9,.-]/g, "").replace(/,/g, ".").trim()
  if (!normalized) return fallback
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  const parsed = new Date(value as any)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function normalizeStatus(value: unknown) {
  const raw = (value ?? "").toString().trim().toLowerCase()
  if (!raw) return null
  if (["unpaid", "belum dibayar", "pending", "open"].includes(raw)) return "unpaid"
  if (["paid", "dibayar", "settled"].includes(raw)) return "paid"
  if (["cancelled", "canceled", "void"].includes(raw)) return "cancelled"
  // Skip any unrecognized statuses so we don't flood the table with paid/closed
  // purchase orders that should not contribute to in-transit stock.
  return null
}

function buildInFilter(values: string[]) {
  const sanitized = values.filter(Boolean).map(id => `"${id.replace(/"/g, '""')}"`)
  return `(${sanitized.join(",")})`
}

type PurchaseOrderItem = {
  sku: string
  quantity: number
  unitPrice?: number | null
  description?: string | null
  raw: Record<string, unknown>
}

type PurchaseOrder = {
  externalId: string
  status: string
  vendorName?: string | null
  dueDate?: string | null
  currency?: string | null
  totalAmount?: number | null
  items: PurchaseOrderItem[]
  raw: Record<string, unknown>
}

async function fetchPurchaseOrders({
  baseUrl,
  path,
  accessToken,
  pageSize = DEFAULT_PAGE_SIZE,
  statusQueryKey = DEFAULT_STATUS_QUERY_KEY,
  statusQueryValue = DEFAULT_STATUS_QUERY_VALUE,
  extraStatusKeys = DEFAULT_EXTRA_STATUS_KEYS,
  maxPages = 10
}: {
  baseUrl: string
  path: string
  accessToken: string
  pageSize?: number
  statusQueryKey?: string
  statusQueryValue?: string
  extraStatusKeys?: string[]
  maxPages?: number
}): Promise<PurchaseOrder[]> {
  const results: PurchaseOrder[] = []
  let page = 1

  while (true) {
    const url = new URL(`${baseUrl}/${path}`)
    url.searchParams.set("page", page.toString())
    url.searchParams.set("per_page", pageSize.toString())
    const statusValue = statusQueryValue || DEFAULT_STATUS_QUERY_VALUE
    const statusKeys = [statusQueryKey || DEFAULT_STATUS_QUERY_KEY, ...(extraStatusKeys?.length ? extraStatusKeys : DEFAULT_EXTRA_STATUS_KEYS)]
    statusKeys.forEach(key => {
      if (!key) return
      url.searchParams.set(key, statusValue)
    })
    url.searchParams.set("include", "transaction_lines")

    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json"
      }
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Gagal memuat purchase orders: ${response.status} ${response.statusText} - ${errorBody}`)
    }

    const payload = await response.json()
    const data = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.purchase_orders)
        ? payload.purchase_orders
        : []

    const normalized = data
      .map((entry: Record<string, unknown>) => normalizePurchaseOrder(entry))
      .filter((entry): entry is PurchaseOrder => Boolean(entry))

    results.push(...normalized)

    const total =
      typeof payload?.total === "number"
        ? payload.total
        : typeof payload?.meta?.total === "number"
          ? payload.meta.total
          : null

    if (normalized.length < pageSize || (total && results.length >= total) || page >= maxPages) {
      break
    }

    page += 1
  }

  return results
}

function normalizePurchaseOrder(entry: Record<string, unknown>): PurchaseOrder | null {
  const externalId = (entry?.transaction_no ?? entry?.id ?? entry?.number ?? entry?.code ?? "")
    .toString()
    .trim()
  if (!externalId) return null

  const statusFromField = normalizeStatus(
    entry?.status ?? (entry as any)?.transaction_status?.name ?? (entry as any)?.transaction_status_name
  )

  // Be tolerant to vendors that mark the document as "approved" or "closed" while
  // still having unpaid balance. Fall back to unpaid when the remaining amount
  // is positive, otherwise treat it as paid if fully settled.
  const remainingAmount = parseNumber(
    (entry as any)?.remaining ?? (entry as any)?.balance ?? (entry as any)?.balance_due ?? (entry as any)?.amount_due ?? 0,
    0
  )
  const totalAmount = parseNumber(
    entry?.total ?? entry?.total_amount ?? entry?.totalAmount ?? (entry as any)?.original_amount ?? 0,
    0
  )
  const receivedAmount = parseNumber(
    (entry as any)?.payment_received_amount ?? (entry as any)?.paid_amount ?? (entry as any)?.amount_receive ?? 0,
    0
  )

  const status =
    statusFromField ||
    (remainingAmount > 0 || (totalAmount > 0 && receivedAmount < totalAmount)
      ? "unpaid"
      : totalAmount > 0 && receivedAmount >= totalAmount
        ? "paid"
        : null)

  if (!status) return null
  const vendorName = entry?.supplier_name ?? entry?.vendor_name ?? entry?.supplier
  const rawItems = Array.isArray(entry?.items)
    ? entry.items
    : Array.isArray((entry as any)?.transaction_lines_attributes)
      ? (entry as any).transaction_lines_attributes
      : Array.isArray((entry as any)?.transaction_lines)
        ? (entry as any).transaction_lines
      : []
  const items = (rawItems as Record<string, unknown>[])?.map(item => normalizePurchaseOrderItem(item)).filter(Boolean)

  return {
    externalId,
    status,
    vendorName: vendorName ? vendorName.toString() : null,
    dueDate: parseDate(entry?.due_date ?? entry?.dueDate),
    currency: (entry?.currency ?? "").toString().trim() || null,
    totalAmount: parseNumber(entry?.total ?? entry?.total_amount ?? entry?.totalAmount, 0),
    items,
    raw: entry
  }
}

function normalizePurchaseOrderItem(entry: Record<string, unknown>): PurchaseOrderItem | null {
  const sku = (entry?.sku ?? entry?.product_code ?? entry?.item_code ?? (entry as any)?.product_sku ?? "")
    .toString()
    .trim()
  if (!sku) return null

  return {
    sku,
    quantity: parseNumber(entry?.qty ?? entry?.quantity ?? entry?.qty_ordered, 0),
    unitPrice: parseNumber(entry?.price ?? entry?.unit_price ?? entry?.unitPrice, 0),
    description: (entry?.name ?? entry?.description ?? "").toString() || null,
    raw: entry
  }
}

async function upsertPurchaseOrders(client: SupabaseClient, orders: PurchaseOrder[]) {
  if (!orders.length) return { inserted: 0, cleared: 0 }

  const mappedOrders = orders.map(order => ({
    external_id: order.externalId,
    status: order.status,
    vendor_name: order.vendorName,
    due_date: order.dueDate ? order.dueDate.slice(0, 10) : null,
    currency: order.currency,
    total_amount: order.totalAmount,
    raw_payload: order.raw,
    last_synced_at: new Date().toISOString()
  }))

  const { data: upserted, error: upsertError } = await client
    .from("purchase_orders")
    .upsert(mappedOrders, { onConflict: "external_id" })
    .select("id, external_id, status")

  if (upsertError) {
    throw new Error(`Gagal menyimpan purchase_orders: ${upsertError.message}`)
  }

  const externalToId = new Map<string, string>()
  upserted?.forEach(row => {
    externalToId.set(row.external_id, row.id)
  })

  const itemRecords = orders.flatMap(order => {
    const orderId = externalToId.get(order.externalId)
    if (!orderId) return []
    return order.items.map(item => ({
      purchase_order_id: orderId,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      description: item.description,
      raw_payload: item.raw
    }))
  })

  if (itemRecords.length) {
    const { error: itemError } = await client
      .from("purchase_order_items")
      .upsert(itemRecords, { onConflict: "purchase_order_id,sku" })

    if (itemError) {
      throw new Error(`Gagal menyimpan purchase_order_items: ${itemError.message}`)
    }
  }

  const fetchedExternalIds = orders.map(order => order.externalId)
  let staleIds: string[] = []

  if (fetchedExternalIds.length) {
    const { data: stale, error: staleError } = await client
      .from("purchase_orders")
      .select("id")
      .eq("status", "unpaid")
      .not("external_id", "in", buildInFilter(fetchedExternalIds))

    if (staleError) {
      throw new Error(`Gagal mencari purchase order usang: ${staleError.message}`)
    }

    staleIds = stale?.map(row => row.id) ?? []
  } else {
    const { data: stale, error: staleError } = await client
      .from("purchase_orders")
      .select("id")
      .eq("status", "unpaid")

    if (staleError) {
      throw new Error(`Gagal mencari purchase order usang: ${staleError.message}`)
    }

    staleIds = stale?.map(row => row.id) ?? []
  }

  if (staleIds.length) {
    const { error: clearError } = await client
      .from("purchase_orders")
      .update({ status: "removed", last_synced_at: new Date().toISOString() })
      .in("id", staleIds)

    if (clearError) {
      throw new Error(`Gagal menandai purchase order usang: ${clearError.message}`)
    }
  }

  return { inserted: mappedOrders.length, cleared: staleIds.length }
}

async function refreshInTransitAggregation(client: SupabaseClient) {
  const { data, error } = await client
    .from("purchase_order_items")
    .select("sku, quantity, purchase_orders!inner(status)")
    .eq("purchase_orders.status", "unpaid")

  if (error) {
    throw new Error(`Gagal membaca item pemesanan pembelian: ${error.message}`)
  }

  const totals = new Map<string, number>()
  const normalizedTotals = new Map<string, number>()
  data?.forEach(row => {
    const sku = (row as any).sku as string
    const qty = parseNumber((row as any).quantity, 0)
    if (!sku) return
    totals.set(sku, (totals.get(sku) ?? 0) + qty)

    const normalizedSku = normalizeSku(sku)
    if (!normalizedSku) return
    normalizedTotals.set(normalizedSku, (normalizedTotals.get(normalizedSku) ?? 0) + qty)
  })

  const nowIso = new Date().toISOString()
  const records = Array.from(totals.entries()).map(([sku, total]) => ({
    sku,
    total_quantity: total,
    last_calculated_at: nowIso
  }))

  if (records.length) {
    const { error: upsertError } = await client
      .from("in_transit_stock")
      .upsert(records, { onConflict: "sku" })

    if (upsertError) {
      throw new Error(`Gagal memperbarui agregasi stok dalam perjalanan: ${upsertError.message}`)
    }

    const { error: cleanupError } = await client
      .from("in_transit_stock")
      .delete()
      .not("sku", "in", buildInFilter(Array.from(totals.keys())))

    if (cleanupError) {
      throw new Error(`Gagal membersihkan stok dalam perjalanan usang: ${cleanupError.message}`)
    }
  } else {
    const { error: cleanupError } = await client.from("in_transit_stock").delete().neq("sku", "")
    if (cleanupError) {
      throw new Error(`Gagal membersihkan stok dalam perjalanan: ${cleanupError.message}`)
    }
  }

  return { aggregatedCount: records.length, normalizedTotals }
}

async function updateProductInTransitStock(client: SupabaseClient, normalizedTotals: Map<string, number>) {
  const { data, error } = await client.from("products").select("id, variant_pricing")

  if (error) {
    throw new Error(`Gagal membaca produk untuk stok dalam perjalanan: ${error.message}`)
  }

  let productsUpdated = 0
  let variantsUpdated = 0

  const updates = (data ?? []).reduce<{ id: string; variant_pricing: unknown; updated_at: string }[]>(
    (acc, record) => {
      const pricingRows = Array.isArray((record as any)?.variant_pricing)
        ? ((record as any).variant_pricing as Record<string, unknown>[]).map(row => ({ ...(row ?? {}) }))
        : []

      if (!pricingRows.length || !(record as any)?.id) return acc

      let changed = false
      const updatedPricing = pricingRows.map(row => {
        const normalizedSku = normalizeSku(row.sellerSku ?? row.sku)
        if (!normalizedSku) return row

        const targetQty = normalizedTotals.get(normalizedSku) ?? 0
        const currentValue = row.inTransitStock ?? row.in_transit_stock
        const currentQty = parseNumber(currentValue, 0)

        if (currentQty !== targetQty || (currentValue === undefined && targetQty !== 0)) {
          changed = true
          variantsUpdated += 1
          return { ...row, inTransitStock: targetQty, in_transit_stock: targetQty }
        }

        return row
      })

      if (!changed) return acc

      productsUpdated += 1
      acc.push({
        id: (record as any).id,
        variant_pricing: updatedPricing,
        updated_at: new Date().toISOString()
      })

      return acc
    },
    []
  )

  for (const payload of updates) {
    const { id, ...rest } = payload
    const { error: updateError } = await client.from("products").update(rest).eq("id", id)

    if (updateError) {
      throw new Error(`Gagal memperbarui stok dalam perjalanan produk: ${updateError.message}`)
    }
  }

  return { productsUpdated, variantsUpdated }
}

async function getIntegration(client: SupabaseClient, name = DEFAULT_INTEGRATION_NAME) {
  const { data, error } = await client
    .from("api_integrations")
    .select("name, api_base_url, access_token")
    .ilike("name", name)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal membaca konfigurasi integrasi: ${error.message}`)
  }

  if (!data) return null
  return data
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
    const integration = await getIntegration(client)
    const url = normalizeBaseUrl(integration?.api_base_url)
    const path = normalizePath(DEFAULT_PATH)
    const accessToken = integration?.access_token?.trim()
    const statusQueryKey = Deno.env.get("PURCHASE_ORDER_STATUS_KEY") ?? DEFAULT_STATUS_QUERY_KEY
    const statusQueryValue = Deno.env.get("PURCHASE_ORDER_STATUS_VALUE") ?? DEFAULT_STATUS_QUERY_VALUE
    const extraStatusKeys = parseCsv(Deno.env.get("PURCHASE_ORDER_STATUS_KEYS") ?? "")
    const maxPages = Number.parseInt(Deno.env.get("PURCHASE_ORDER_MAX_PAGES") ?? "10", 10)

    if (!accessToken) {
      return jsonResponse(400, { error: "Access token tidak ditemukan di api_integrations" })
    }

    const orders = await fetchPurchaseOrders({
      baseUrl: url,
      path,
      accessToken,
      statusQueryKey,
      statusQueryValue,
      extraStatusKeys,
      maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : 10
    })
    const unpaidOrders = orders.filter(order => !IGNORED_STATUSES.has(order.status))
    const upsertSummary = await upsertPurchaseOrders(client, unpaidOrders)
    const { aggregatedCount, normalizedTotals } = await refreshInTransitAggregation(client)
    const productUpdateSummary = await updateProductInTransitStock(client, normalizedTotals)

    return jsonResponse(200, {
      success: true,
      fetched: orders.length,
      processedUnpaid: unpaidOrders.length,
      upserted: upsertSummary.inserted,
      cleared: upsertSummary.cleared,
      aggregatedSkus: aggregatedCount,
      productsUpdated: productUpdateSummary.productsUpdated,
      variantsUpdated: productUpdateSummary.variantsUpdated
    })
  } catch (error) {
    console.error("purchase-in-transit-sync failed", error)
    return jsonResponse(500, { error: (error as Error).message })
  }
})
