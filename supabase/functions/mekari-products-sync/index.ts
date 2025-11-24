import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type"
}

const DEFAULT_MEKARI_BASE_URL = "https://api.jurnal.id"
const MEKARI_INTEGRATION_NAME = "Mekari Jurnal"
const MEKARI_PRODUCTS_PATH = "/partner/core/api/v1/products"

interface MekariIntegrationConfig {
  baseUrl: string
  token: string
}

interface MekariProduct {
  product_code?: string
  productCode?: string
  sku?: string
  product_categories?: { name?: string | null }[]
  product_categories_string?: string | null
  description?: string | null
  company_currency?: { code?: string | null } | null
  currency?: string | null
  buy_price_per_unit?: unknown
  last_buy_price?: unknown
  average_price?: unknown
  buyPrice?: unknown
  purchase_price?: unknown
  buy_price_per_unit_currency_format?: unknown
  last_buy_price_currency_format?: unknown
  average_price_currency_format?: unknown
  purchase_price_currency_format?: unknown
  quantity_available?: unknown
  quantityAvailable?: unknown
  quantity?: unknown
  init_quantity?: unknown
  quantity_on_hand?: unknown
  quantityOnHand?: unknown
  current_stock?: unknown
  currentStock?: unknown
  stock_on_hand?: unknown
  stockOnHand?: unknown
  stock?: unknown
  id?: unknown
  product?: { id?: unknown }
  product_id?: unknown
  productId?: unknown
  image?: { url?: string | null; mini_url?: string | null; preview_url?: string | null } | null
  image_url?: string | null
  name?: string | null
  created_at?: string | null
  createdAt?: string | null
  init_date?: string | null
  updated_at?: string | null
  updatedAt?: string | null
}

interface ExistingProductRecord {
  id: string
  name?: string | null
  category?: string | null
  brand?: string | null
  spu?: string | null
  description?: string | null
  variant_pricing?: unknown[] | null
  mekari_status?: unknown
  created_at?: string | null
  updated_at?: string | null
}

interface SupabaseClient {
  url: string
  serviceKey: string
}

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      ...CORS_HEADERS
    }
  })

const normalizeString = (value: unknown) => {
  if (value === null || value === undefined) return ""
  try {
    return value.toString().trim()
  } catch {
    return ""
  }
}

const normalizeSku = (value: unknown) => normalizeString(value).toLowerCase()

const formatAuthToken = (raw: string) => {
  const token = normalizeString(raw)
  if (!token) return ""
  if (/^bearer\s+/i.test(token)) return token
  return `Bearer ${token}`
}

const parseNumericValue = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "bigint") return Number(value)

  const raw = normalizeString(value)
  if (!raw) return null

  const sanitized = raw.replace(/[^0-9,.-]/g, "").replace(/,/g, "")
  if (!sanitized || sanitized === "-" || sanitized === ".-") return null

  const parsed = Number(sanitized)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeMekariProductId = (value: unknown) => normalizeString(value)

const normalizeMekariStatus = (status: Record<string, unknown> | null | undefined) => {
  const result: Record<string, unknown> = {
    state: "pending",
    lastSyncedAt: null,
    message: "",
    error: ""
  }

  if (!status || typeof status !== "object") return result

  const stateCandidate = normalizeString(status.state ?? status.status).toLowerCase()
  if (stateCandidate) result.state = stateCandidate

  const lastSyncedAt = status.lastSyncedAt ?? status.lastSync ?? status.syncedAt ?? null
  if (lastSyncedAt) {
    const parsed = new Date(lastSyncedAt as string)
    if (!Number.isNaN(parsed.getTime())) {
      result.lastSyncedAt = parsed.toISOString()
    }
  }

  const message = normalizeString(status.message ?? status.detail ?? status.note ?? status.description)
  if (message) result.message = message

  const error = normalizeString(status.error ?? status.errorMessage ?? status.reason)
  if (error) {
    result.error = error
    result.state = "error"
  }

  return result
}

const toIsoTimestamp = (value: unknown) => {
  if (!value && value !== 0) return null
  try {
    const date = value instanceof Date ? value : new Date(value as string)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  } catch {
    /* ignore */
  }
  return null
}

const mapMekariProductRecord = (record: MekariProduct) => {
  const rawName = normalizeString(record.name)
  if (!rawName) return null

  const rawSku = normalizeSku(
    record.product_code ?? record.productCode ?? record.sku ?? ""
  )
  if (!rawSku) return null

  const category = (() => {
    if (Array.isArray(record.product_categories)) {
      const match = record.product_categories.find((item) => normalizeString(item?.name))
      if (match?.name) return normalizeString(match.name)
    }

    const categoriesString = normalizeString(record.product_categories_string)
    if (categoriesString) {
      const [first] = categoriesString.split(/[,>/]/)
      if (first && first.trim()) return first.trim()
    }

    return "Lainnya"
  })()

  const description = normalizeString(record.description)

  const currencyCandidate = record.company_currency?.code ?? record.currency ?? ""
  let purchaseCurrency = normalizeString(currencyCandidate).toUpperCase()
  if (!purchaseCurrency) purchaseCurrency = "IDR"

  const priceCandidates = [
    record.buy_price_per_unit,
    record.last_buy_price,
    record.average_price,
    record.buyPrice,
    record.purchase_price,
    record.buy_price_per_unit_currency_format,
    record.last_buy_price_currency_format,
    record.average_price_currency_format,
    record.purchase_price_currency_format
  ]

  let buyPriceNumber: number | null = null
  for (const candidate of priceCandidates) {
    const parsed = parseNumericValue(candidate)
    if (parsed !== null && Number.isFinite(parsed)) {
      buyPriceNumber = parsed
      break
    }
  }

  const purchasePrice = buyPriceNumber !== null ? buyPriceNumber.toString() : ""
  const purchasePriceIdr = purchaseCurrency === "IDR" && buyPriceNumber !== null ? buyPriceNumber.toString() : ""

  const stockCandidates = [
    record.quantity_available,
    record.quantityAvailable,
    record.quantity,
    record.init_quantity,
    record.quantity_on_hand,
    record.quantityOnHand,
    record.current_stock,
    record.currentStock,
    record.stock_on_hand,
    record.stockOnHand,
    record.stock
  ]
  let stockValue: string | null = null
  for (const candidate of stockCandidates) {
    const parsed = parseNumericValue(candidate)
    if (parsed !== null && Number.isFinite(parsed)) {
      stockValue = parsed.toString()
      break
    }
  }

  const mekariProductId = normalizeMekariProductId(
    record.id ?? record.product?.id ?? record.product_id ?? record.productId ?? null
  )

  const imageCandidates = [
    record.image?.url,
    record.image?.mini_url,
    record.image?.preview_url,
    record.image_url
  ].map((candidate) => normalizeString(candidate))
  const photoUrl = imageCandidates.find(Boolean)
  const photos = photoUrl ? [photoUrl] : []

  const createdAtSource = record.created_at ?? record.createdAt ?? record.init_date
  const updatedAtSource = record.updated_at ?? record.updatedAt

  const createdAt = (() => {
    if (createdAtSource) {
      const parsed = new Date(createdAtSource)
      if (!Number.isNaN(parsed.getTime())) return parsed.getTime()
    }
    return Date.now()
  })()

  const updatedAt = (() => {
    if (updatedAtSource) {
      const parsed = new Date(updatedAtSource)
      if (!Number.isNaN(parsed.getTime())) return parsed.getTime()
    }
    return createdAt
  })()

  const variantId = crypto.randomUUID()

  return {
    id: crypto.randomUUID(),
    name: rawName,
    category,
    brand: "",
    description,
    tradeIn: false,
    inventory: null,
    photos,
    variants: [],
    variantPricing: [
      {
        id: variantId,
        purchasePrice,
        purchaseCurrency,
        exchangeRate: "1",
        purchasePriceIdr,
        shippingMethod: "",
        arrivalCost: "",
        offlinePrice: "",
        entraversePrice: "",
        tokopediaPrice: "",
        shopeePrice: "",
        stock: stockValue ?? "",
        dailyAverageSales: "",
        sellerSku: rawSku,
        weight: "",
        mekariProductId: mekariProductId || null
      }
    ],
    stock: stockValue ?? "",
    mekariStatus: normalizeMekariStatus({
      state: "synced",
      lastSyncedAt: Date.now(),
      message: "Diimpor dari Mekari Jurnal"
    }),
    createdAt,
    updatedAt
  }
}

const mapProductToRecord = (product: any) => ({
  id: product.id,
  name: product.name,
  category: product.category,
  brand: product.brand || null,
  spu: product.spu ? normalizeString(product.spu) || null : null,
  description: product.description || null,
  trade_in: Boolean(product.tradeIn),
  inventory: product.inventory ?? null,
  photos: Array.isArray(product.photos) ? product.photos : [],
  variants: Array.isArray(product.variants) ? product.variants : [],
  variant_pricing: Array.isArray(product.variantPricing) ? product.variantPricing : [],
  mekari_status: product.mekariStatus ? normalizeMekariStatus(product.mekariStatus) : null,
  created_at: toIsoTimestamp(product.createdAt) ?? new Date().toISOString(),
  updated_at: toIsoTimestamp(product.updatedAt)
})

const resolveSupabaseConfig = (): SupabaseClient => {
  const url = normalizeString(Deno.env.get("SUPABASE_URL"))
  const serviceKey = normalizeString(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diatur di environment Supabase Functions.")
  }

  return { url, serviceKey }
}

const getSupabaseClient = () => {
  const { url, serviceKey } = resolveSupabaseConfig()
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

const resolveIntegrationConfig = async (client: ReturnType<typeof createClient>): Promise<MekariIntegrationConfig> => {
  const { data, error } = await client
    .from("api_integrations")
    .select("api_base_url, access_token")
    .ilike("name", MEKARI_INTEGRATION_NAME)
    .maybeSingle()

  const envBaseUrl = normalizeString(Deno.env.get("MEKARI_BASE_URL"))
  const envToken = normalizeString(Deno.env.get("MEKARI_ACCESS_TOKEN"))

  if (error) {
    console.warn("Gagal memuat integrasi Mekari dari Supabase:", error.message)
  }

  const baseUrl = normalizeString(data?.api_base_url) || envBaseUrl || DEFAULT_MEKARI_BASE_URL
  const token = formatAuthToken(normalizeString(data?.access_token) || envToken)

  if (!token) {
    throw new Error("Token API Mekari belum tersedia di tabel api_integrations atau MEKARI_ACCESS_TOKEN.")
  }

  return { baseUrl: baseUrl || DEFAULT_MEKARI_BASE_URL, token }
}

const fetchMekariProducts = async ({ baseUrl, token }: MekariIntegrationConfig) => {
  const products: MekariProduct[] = []
  const seenKeys = new Set<string>()
  let page = 1
  const perPage = 100
  const maxPages = 200

  while (page <= maxPages) {
    const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString(), include_archive: "false" })
    const url = `${baseUrl.replace(/\/+$/, "")}${MEKARI_PRODUCTS_PATH}?${params.toString()}`

    const headers = new Headers({ Accept: "application/json" })
    headers.set("Authorization", token)

    const res = await fetch(url, { method: "GET", headers })
    const text = await res.text()

    if (!text) {
      if (!res.ok) throw new Error(`Gagal memuat produk Mekari (status ${res.status}).`)
      break
    }

    let body: any
    try {
      body = JSON.parse(text)
    } catch {
      throw new Error(`Respons Mekari tidak valid (status ${res.status}).`)
    }

    if (!res.ok) {
      const message = body?.error || body?.message || body?.response_message || `status ${res.status}`
      const trace = body?.trace_id || body?.request_id || null
      throw new Error(`${message}${trace ? ` • Trace ${trace}` : ""}`)
    }

    const payloadCandidates = [
      body?.products,
      body?.data?.products,
      body?.data,
      body?.result?.products,
      body?.result
    ]

    let records: MekariProduct[] = []
    for (const candidate of payloadCandidates) {
      if (Array.isArray(candidate) && candidate.length) {
        records = candidate.filter(Boolean)
        break
      }
    }

    if (!records.length) break

    let added = 0
    for (const record of records) {
      const skuKey = normalizeSku(record.product_code ?? record.productCode ?? record.sku ?? "")
      const idCandidate = normalizeString(record.id ?? record.product_id ?? record.productId ?? "")
      const dedupeKey = skuKey ? `sku:${skuKey}` : idCandidate ? `id:${idCandidate}` : null
      if (dedupeKey && seenKeys.has(dedupeKey)) continue
      if (dedupeKey) seenKeys.add(dedupeKey)
      products.push(record)
      added += 1
    }

    const totalPages = typeof body?.total_pages === "number" ? body.total_pages : body?.pagination?.total_pages
    if (totalPages && page >= totalPages) break
    if (added === 0 && (!body?.pagination?.has_more && !body?.pagination?.hasMore)) break

    page += 1
  }

  return products
}

const normalizeExistingProducts = (rows: ExistingProductRecord[]) => {
  const products = Array.isArray(rows) ? rows : []
  const skuMap = new Map<string, ExistingProductRecord>()

  for (const row of products) {
    const variants = Array.isArray(row.variant_pricing) ? row.variant_pricing : []
    for (const variant of variants) {
      const sku = normalizeSku((variant as any)?.sellerSku ?? (variant as any)?.seller_sku ?? (variant as any)?.sku)
      if (sku) {
        skuMap.set(sku, row)
      }
    }
  }

  return { products, skuMap }
}

const mergeVariantPricing = (
  existing: any[] = [],
  incoming: any[] = []
) => {
  const merged = Array.isArray(existing) ? [...existing] : []
  const incomingRow = Array.isArray(incoming) ? incoming[0] : null
  if (!incomingRow) return merged

  const incomingSku = normalizeSku(incomingRow.sellerSku ?? incomingRow.seller_sku ?? incomingRow.sku)
  if (!incomingSku) return merged

  const matchIndex = merged.findIndex((row) => {
    const sku = normalizeSku(row?.sellerSku ?? row?.seller_sku ?? row?.sku)
    return sku === incomingSku
  })

  const mergedRow = {
    ...(matchIndex !== -1 ? merged[matchIndex] : {}),
    ...incomingRow
  }

  mergedRow.sellerSku = incomingSku

  if (matchIndex !== -1) {
    merged[matchIndex] = mergedRow
  } else {
    merged.push(mergedRow)
  }

  return merged
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS })

  const traceId = crypto.randomUUID()
  try {
    const supabase = getSupabaseClient()
    const integration = await resolveIntegrationConfig(supabase)
    const nowIso = new Date().toISOString()

    const { data: existingRows, error: existingError } = await supabase
      .from("products")
      .select("id, name, category, brand, spu, description, variant_pricing, mekari_status, created_at, updated_at")

    if (existingError) {
      throw new Error(`Gagal memuat produk dari Supabase: ${existingError.message}`)
    }

    const { skuMap } = normalizeExistingProducts(existingRows || [])
    const mekariProducts = await fetchMekariProducts(integration)

    const mappedProducts = [] as any[]
    let createdCount = 0
    let updatedCount = 0

    for (const record of mekariProducts) {
      const mapped = mapMekariProductRecord(record)
      if (!mapped) continue

      const match = skuMap.get(normalizeSku(mapped.variantPricing?.[0]?.sellerSku))
      if (match) {
        mapped.id = match.id
        mapped.createdAt = match.created_at ?? match.updated_at ?? mapped.createdAt
        mapped.variantPricing = mergeVariantPricing(match.variant_pricing as any[], mapped.variantPricing)
        mapped.mekariStatus = normalizeMekariStatus({
          ...(match.mekari_status as Record<string, unknown>),
          state: "synced",
          lastSyncedAt: nowIso,
          message: "Sinkronisasi Mekari otomatis"
        })
        updatedCount += 1
      } else {
        createdCount += 1
      }

      mapped.updatedAt = Date.now()
      mappedProducts.push(mapProductToRecord(mapped))
    }

    if (mappedProducts.length === 0) {
      return jsonResponse({ ok: true, traceId, message: "Tidak ada data produk Mekari yang dapat disinkronkan." })
    }

    const { error: upsertError } = await supabase
      .from("products")
      .upsert(mappedProducts, { onConflict: "id" })

    if (upsertError) {
      throw new Error(`Gagal menyimpan produk ke Supabase: ${upsertError.message}`)
    }

    await supabase
      .from("api_integrations")
      .update({ last_sync: nowIso })
      .ilike("name", MEKARI_INTEGRATION_NAME)

    return jsonResponse({
      ok: true,
      traceId,
      syncedAt: nowIso,
      createdCount,
      updatedCount,
      totalImported: mappedProducts.length
    })
  } catch (error) {
    console.error("mekari-products-sync error", error)
    return jsonResponse(
      {
        ok: false,
        traceId,
        error: error?.message || "Gagal menjalankan sinkronisasi Mekari.",
        stack: error?.stack
      },
      500
    )
  }
})
