import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type"
}

const DEFAULT_BASE_URL = "https://api.jurnal.id"
const DEFAULT_PAGE_SIZE = 100

function normalizeBaseUrl(input?: string | null) {
  const base = (input ?? DEFAULT_BASE_URL).toString().trim()
  if (!base) return DEFAULT_BASE_URL
  if (/^https?:\/\//i.test(base)) return base.replace(/\/+$/, "")
  return `https://${base.replace(/\/+$/, "")}`
}

function normalizeString(value: unknown) {
  return (value ?? "").toString().trim()
}

function normalizeSku(value: unknown) {
  return normalizeString(value).replace(/\s+/g, "").toLowerCase()
}

function pickNumber(...candidates: unknown[]) {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue
    const parsed = Number(candidate)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function pickBoolean(...candidates: unknown[]) {
  for (const candidate of candidates) {
    if (typeof candidate === "boolean") return candidate
    if (candidate === 1 || candidate === "1" || candidate === "true") return true
    if (candidate === 0 || candidate === "0" || candidate === "false") return false
  }
  return null
}

function extractPrice(record: Record<string, unknown>) {
  return pickNumber(
    record.price,
    record.sell_price,
    record.sellPrice,
    record.sales_price,
    record.salesPrice,
    record.base_price,
    record.basePrice
  )
}

function extractStock(record: Record<string, unknown>) {
  return pickNumber(
    record.available_stock,
    record.availableStock,
    record.stock,
    record.balance,
    record.qty,
    record.quantity
  )
}

function extractPurchasePrice(record: Record<string, unknown>) {
  return pickNumber(
    record.buy_price_per_unit,
    record.buy_price,
    record.buyPrice,
    record.purchase_price,
    record.purchasePrice,
    record.last_buy_price,
    record.lastBuyPrice
)
}

function parseNumericValue(value: unknown) {
  if (value === null || value === undefined) return null
  if (typeof value === "string" && value.trim() === "") return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseStockOutDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null

    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (slashMatch) {
      const [, dayStr, monthStr, yearStr] = slashMatch
      const day = Number.parseInt(dayStr, 10)
      const month = Number.parseInt(monthStr, 10) - 1
      const year = yearStr.length === 2 ? 2000 + Number.parseInt(yearStr, 10) : Number.parseInt(yearStr, 10)
      const parsed = new Date(year, month, day)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
  }

  const parsed = new Date(value as any)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatStockOutFactor(value: number) {
  const fixed = Number(value.toFixed(2))
  return Number.isFinite(fixed) ? fixed.toString() : ""
}

function calculateStockOutFactor(
  dateValue: unknown,
  period: "A" | "B",
  { referenceDate = new Date() }: { referenceDate?: Date } = {}
) {
  const parsedDate = parseStockOutDate(dateValue)
  if (!parsedDate) return ""

  const stockOutDay = parsedDate.getDate()
  const refDay = referenceDate.getDate()
  const refMonth = referenceDate.getMonth()
  const refYear = referenceDate.getFullYear()
  const daysInMonth = new Date(refYear, refMonth + 1, 0).getDate()
  if (!Number.isFinite(daysInMonth) || stockOutDay <= 0) return ""

  const isPeriodA = (period ?? "A").toString().toUpperCase() === "A"
  const startDay = isPeriodA ? 1 : 16
  const endDay = isPeriodA ? Math.min(15, daysInMonth) : daysInMonth

  if (refDay < startDay || refDay > endDay || stockOutDay < startDay || stockOutDay > endDay) return ""

  // Factor uses the current day number inside the active period against the day stock ran out.
  // Example: updated on the 6th with stock-out recorded on the 5th yields 6 / 5 = 1.2.
  const factor = refDay / stockOutDay
  if (!Number.isFinite(factor) || factor <= 0) return ""

  return formatStockOutFactor(factor)
}

function normalizeStockOutMetadata(variant: Record<string, unknown>) {
  const normalized = normalizeStockOutDates(variant)

  delete (normalized as Record<string, unknown>).stock_out_factor_period_a
  delete (normalized as Record<string, unknown>).stock_out_factor_period_b

  normalized.stockOutFactorPeriodA = calculateStockOutFactor(normalized.stockOutDatePeriodA, "A")
  normalized.stockOutFactorPeriodB = calculateStockOutFactor(normalized.stockOutDatePeriodB, "B")

  return normalized
}

function getStockOutDateField(date: Date) {
  return date.getDate() <= 15 ? "stockOutDatePeriodA" : "stockOutDatePeriodB"
}

function buildStockOutDateUpdates(
  previousStock: number | null,
  currentStock: number | null,
  referenceDate = new Date()
) {
  const updates: Record<string, unknown> = {}

  if (previousStock === null || currentStock === null) return updates

  const wasZero = previousStock === 0
  const isZero = currentStock === 0

  if (!wasZero && isZero) {
    const targetField = getStockOutDateField(referenceDate)
    updates[targetField] = referenceDate.toISOString()
  }

  if (wasZero && currentStock > 0) {
    ;["stockOutDatePeriodA", "stockOutDatePeriodB"].forEach(key => {
      updates[key] = null
    })
  }

  return updates
}

function normalizeStockOutDates(variant: Record<string, unknown>) {
  const periodA = variant.stockOutDatePeriodA ?? variant.stock_out_date_period_a
  const periodB = variant.stockOutDatePeriodB ?? variant.stock_out_date_period_b

  const normalized: Record<string, unknown> = { ...variant }
  delete normalized.stock_out_date_period_a
  delete normalized.stock_out_date_period_b

  if (periodA !== undefined) normalized.stockOutDatePeriodA = periodA
  if (periodB !== undefined) normalized.stockOutDatePeriodB = periodB

  return normalized
}

async function hashToUuid(input: string) {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(input))
  const bytes = new Uint8Array(hash).slice(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function parseMekariProductId(record: Record<string, unknown>) {
  const candidates = [record.id, record.product?.id, record.product_id, record.productId, record.uuid]
  for (const candidate of candidates) {
    const value = normalizeString(candidate)
    if (value) return value
  }
  return null
}

function parseMekariName(record: Record<string, unknown>) {
  const candidates = [
    record.name,
    record.product_name,
    record.productName,
    record.description,
    record.item_name,
    record.itemName
  ]
  for (const candidate of candidates) {
    const value = normalizeString(candidate)
    if (value) return value
  }
  return "Produk Mekari"
}

function parseMekariCategory(record: Record<string, unknown>) {
  const categoriesArray = record.product_categories || record.productCategories
  if (Array.isArray(categoriesArray)) {
    const names = categoriesArray
      .map(item => {
        if (!item || typeof item !== "object") return ""
        return normalizeString((item as Record<string, unknown>).name)
      })
      .filter(Boolean)

    if (names.length) return names.join(" | ")
  }

  const categoryString =
    record.product_categories_string || record.productCategoriesString || record.product_category_string
  const normalizedString = normalizeString(categoryString)
  if (normalizedString) return normalizedString

  const category = record.category || record.category_name || record.categoryName
  if (typeof category === "object" && category !== null) {
    const name = normalizeString((category as Record<string, unknown>).name)
    if (name) return name
  }

  const fallback = normalizeString(category)
  return fallback || "Mekari Jurnal"
}

function parseVariantLabel(record: Record<string, unknown>) {
  const candidates = [record.variant_label, record.variantLabel, record.variant_name, record.variantName]
  for (const candidate of candidates) {
    const value = normalizeString(candidate)
    if (value) return value
  }
  return "Default"
}

function collectPhotoUrls(record: Record<string, unknown>) {
  const urls = new Set<string>()

  const addUrl = (value: unknown) => {
    const normalized = normalizeString(value)
    if (!normalized) return
    const withProtocol = normalized.startsWith("//") ? `https:${normalized}` : normalized
    if (/^https?:\/\//i.test(withProtocol)) {
      urls.add(withProtocol)
    }
  }

  const addFromUnknown = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(addFromUnknown)
      return
    }

    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>
      const nestedKeys = ["url", "image", "photo", "picture", "image_url", "imageUrl", "photo_url", "photoUrl", "picture_url", "pictureUrl"]
      nestedKeys.forEach(key => addFromUnknown(obj[key]))
      return
    }

    addUrl(value)
  }

  const topLevelKeys = [
    "photos",
    "images",
    "pictures",
    "image",
    "photo",
    "picture",
    "image_url",
    "imageUrl",
    "photo_url",
    "photoUrl",
    "picture_url",
    "pictureUrl",
    "thumbnail",
    "thumbnail_url",
    "thumbnailUrl"
  ]

  topLevelKeys.forEach(key => addFromUnknown(record[key]))

  if (record.product && typeof record.product === "object") {
    const productObj = record.product as Record<string, unknown>
    topLevelKeys.forEach(key => addFromUnknown(productObj[key]))
  }

  return Array.from(urls)
}

async function fetchMekariProducts({
  token,
  baseUrl,
  includeArchive
}: {
  token: string
  baseUrl: string
  includeArchive: boolean
}) {
  const collected: Record<string, unknown>[] = []
  const seenKeys = new Set<string>()
  let page = 1
  let perPage = DEFAULT_PAGE_SIZE
  const maxPages = 200

  while (page <= maxPages) {
    const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() })
    if (includeArchive) params.set("include_archive", "true")

    const url = `${baseUrl}/partner/core/api/v1/products?${params.toString()}`
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: token }
    })

    const rawText = await res.text()
    if (!res.ok) {
      throw new Error(`Gagal memuat produk Mekari (status ${res.status}) • ${rawText.slice(0, 500)}`)
    }

    let body: unknown
    try {
      body = rawText ? JSON.parse(rawText) : {}
    } catch (error) {
      throw new Error(`Respons Mekari tidak valid: ${error}`)
    }

    const candidates = [
      (body as Record<string, unknown>)?.products,
      (body as Record<string, unknown>)?.data,
      (body as Record<string, unknown>)?.result,
      (body as Record<string, unknown>)?.data &&
        (body as Record<string, unknown>).data instanceof Array
        ? (body as Record<string, unknown>).data
        : (body as Record<string, Record<string, unknown>>)?.data?.products
    ].filter(Boolean)

    let records: Record<string, unknown>[] = []
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        records = candidate as Record<string, unknown>[]
        break
      }
    }

    records.forEach(record => {
      const mekariId = parseMekariProductId(record)
      const sku = normalizeSku(record.product_code ?? record.productCode ?? record.sku)
      const dedupeKey = mekariId ? `mekari:${mekariId}` : sku ? `sku:${sku}` : null
      if (dedupeKey && seenKeys.has(dedupeKey)) return
      if (dedupeKey) seenKeys.add(dedupeKey)
      collected.push(record)
    })

    const nextPage = (() => {
      const pagination = (body as Record<string, unknown>)?.pagination ?? (body as Record<string, unknown>)?.meta
      const totalPages = pickNumber(
        pagination?.total_pages,
        pagination?.totalPages,
        pagination?.total_page,
        pagination?.totalPage
      )
      const currentPage = pickNumber(pagination?.current_page, pagination?.currentPage, pagination?.page) ?? page
      const hasMoreFlag = pickBoolean(pagination?.has_more, pagination?.hasMore)
      if (totalPages && currentPage >= totalPages) return null
      if (hasMoreFlag === false) return null
      const linkNext = (body as Record<string, any>)?.links?.next ?? pagination?.next_page ?? pagination?.nextPage
      if (linkNext && typeof linkNext === "string") {
        const match = linkNext.match(/[?&]page=(\d+)/i)
        if (match && Number(match[1])) return Number(match[1])
      }
      if (hasMoreFlag) return currentPage + 1
      if (records.length >= perPage) return currentPage + 1
      return null
    })()

    if (!nextPage) break
    page = nextPage
  }

  return collected
}

async function mapToProductPayload(record: Record<string, unknown>, existingProductId?: string) {
  const mekariId = parseMekariProductId(record)
  const skuRaw = normalizeString(record.product_code ?? record.productCode ?? record.sku ?? mekariId ?? "")
  const normalizedSku = normalizeSku(skuRaw) || undefined
  const category = parseMekariCategory(record)
  const name = parseMekariName(record)
  const variantLabel = parseVariantLabel(record)
  const stock = extractStock(record)
  const weight = normalizeString(record.weight ?? record.weight_kg ?? "")
  const mekariStatus = {
    state: "synced",
    lastSyncedAt: new Date().toISOString(),
    message: "Sinkron otomatis Mekari Jurnal"
  }

  const productId =
    existingProductId ?? (await hashToUuid(`mekari:${mekariId ?? normalizedSku ?? name}`))
  const variant = {
    id: await hashToUuid(`mekari:variant:${mekariId ?? normalizedSku ?? name}`),
    variantLabel,
    sellerSku: skuRaw || "",
    mekariProductId: mekariId,
    price: "",
    stock: stock != null ? String(stock) : "",
    purchasePrice: "",
    purchaseCurrency: "",
    exchangeRate: "",
    purchasePriceIdr: "",
    arrivalCost: "",
    shopeePrice: "",
    offlinePrice: "",
    tokopediaPrice: "",
    entraversePrice: "",
    shippingMethod: "",
    weight,
    dailyAverageSales: ""
  }

  const photos = collectPhotoUrls(record)

  return {
    id: productId,
    name,
    category,
    brand: normalizeString(record.brand?.name ?? record.brand_name ?? record.brandName) || null,
    spu: null,
    description: normalizeString(record.description ?? record.note ?? "") || null,
    trade_in: false,
    inventory: null,
    photos,
    variants: [],
    variant_pricing: [variant],
    mekari_status: mekariStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

const MONETARY_FIELDS = [
  "price",
  "base_price",
  "basePrice",
  "purchase_price",
  "purchasePrice",
  "purchaseCurrency",
  "purchase_currency",
  "purchase_price_idr",
  "purchasePriceIdr",
  "buy_price",
  "buyPrice",
  "arrivalCost",
  "offlinePrice",
  "tokopediaPrice",
  "shopeePrice",
  "entraversePrice",
  "shippingMethod",
  "sell_price",
  "sellPrice",
  "sales_price",
  "salesPrice",
  "cost",
  "costPrice",
  "avg_cost",
  "avgCost",
  "currency",
  "currency_code",
  "currencyCode",
  "curr",
  "kurs",
  "rate",
  "exchange_rate",
  "exchangeRate"
]

function keepExistingPrices(
  incoming: Record<string, unknown>,
  existing?: Record<string, unknown> | null
) {
  if (!existing) return incoming

  const preserved = { ...incoming }
  MONETARY_FIELDS.forEach(key => {
    if (existing[key] !== undefined) {
      preserved[key] = existing[key]
    }
  })

  return preserved
}

function parseVariantPricing(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[]

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch (error) {
      console.warn("Gagal mengurai variant_pricing", error)
    }
  }

  return []
}

function findVariantMatch(
  incoming: Record<string, unknown>,
  existingVariants: Record<string, unknown>[]
) {
  const incomingMekariId = normalizeString(incoming.mekariproductid || incoming.mekariProductId)
  const incomingSellerSku = normalizeString(incoming.sellerSku)
  const incomingVariantId = normalizeString(incoming.id)
  const incomingNormalizedSku = normalizeSku(incomingSellerSku)

  return existingVariants.find(existing => {
    const existingMekariId = normalizeString(existing.mekariproductid || existing.mekariProductId)
    const existingSellerSku = normalizeString(existing.sellerSku)
    const existingVariantId = normalizeString(existing.id)
    const existingNormalizedSku = normalizeSku(existingSellerSku)

    if (incomingVariantId && existingVariantId && incomingVariantId === existingVariantId) return true
    if (incomingMekariId && existingMekariId && incomingMekariId === existingMekariId) return true
    if (incomingSellerSku && existingSellerSku && incomingSellerSku === existingSellerSku) return true
    if (incomingNormalizedSku && existingNormalizedSku && incomingNormalizedSku === existingNormalizedSku) return true
    return false
  })
}

async function mergeExistingPricing(
  client: ReturnType<typeof createClient>,
  payload: Awaited<ReturnType<typeof mapToProductPayload>>[]
) {
  const ids = payload.map(item => item.id)
  if (!ids.length) return payload

  const { data: existing, error } = await client
    .from("products")
    .select("id, variant_pricing")
    .in("id", ids)

  if (error) {
    throw new Error(`Gagal membaca produk existing: ${error.message}`)
  }

  const existingMap = new Map<string, { id: string; variant_pricing?: any }>()
  existing?.forEach(item => existingMap.set(item.id, item))

  return payload.map(item => {
    const current = existingMap.get(item.id)
    const existingVariants = parseVariantPricing(current?.variant_pricing)

    const normalizeMekariField = (variant: Record<string, unknown>) => {
      const mekariId = normalizeString(variant.mekariProductId ?? variant.mekariproductid)
      const normalized = {
        ...variant,
        mekariProductId: mekariId || undefined
      }
      delete (normalized as Record<string, unknown>).mekariproductid
      return normalizeStockOutMetadata(normalized)
    }

    if (!existingVariants.length) {
      return {
        ...item,
        variant_pricing: (item.variant_pricing || []).map(variant =>
          normalizeMekariField(variant as Record<string, unknown>)
        )
      }
    }

    const mergedVariants = (item.variant_pricing || []).map(variant => {
      const variantRecord = normalizeMekariField(variant as Record<string, unknown>)
      const match = findVariantMatch(variantRecord, existingVariants)

      if (!match) return variantRecord

      const withPreservedPrices = keepExistingPrices(variantRecord, match)

      const previousStock = parseNumericValue(match.stock)
      const currentStock = parseNumericValue(variantRecord.stock ?? match.stock)
      const stockOutDateUpdates = buildStockOutDateUpdates(previousStock, currentStock)

      const merged = {
        ...match,
        ...withPreservedPrices,
        stock: variantRecord.stock ?? match.stock,
        sellerSku: variantRecord.sellerSku ?? match.sellerSku,
        variantLabel: variantRecord.variantLabel ?? match.variantLabel,
        mekariProductId:
          variantRecord.mekariProductId ?? match.mekariProductId ?? match.mekariproductid,
        weight: variantRecord.weight ?? match.weight,
        ...stockOutDateUpdates
      }

      return normalizeMekariField(merged)
    })

    // Pertahankan varian lain yang tidak ada dalam payload baru
    const unmatched = existingVariants
      .filter(existingVariant => {
        const match = findVariantMatch(existingVariant, mergedVariants as Record<string, unknown>[])
        return !match
      })
      .map(variant => normalizeMekariField(variant as Record<string, unknown>))

    return { ...item, variant_pricing: [...mergedVariants, ...unmatched] }
  })
}

async function findExistingProductsByMekariIds(
  client: ReturnType<typeof createClient>,
  mekariIds: string[]
) {
  const normalizedIds = Array.from(new Set(mekariIds.map(id => normalizeString(id)).filter(Boolean)))
  const result = new Map<string, string>()

  const chunkSize = 10
  for (let i = 0; i < normalizedIds.length; i += chunkSize) {
    const chunk = normalizedIds.slice(i, i + chunkSize)
    const chunkSet = new Set(chunk)
    const filters = chunk
      .map(id => `variant_pricing.cs.[{"mekariProductId":"${id}"}]`)
      .join(",")

    if (!filters) continue

    const { data, error } = await client
      .from("products")
      .select("id, variant_pricing")
      .or(filters)

    if (error) {
      throw new Error(`Gagal memeriksa produk Mekari existing: ${error.message}`)
    }

    data?.forEach(row => {
      const variants = parseVariantPricing(row.variant_pricing)
      variants.forEach(variant => {
        const variantMekariId = normalizeString(variant.mekariProductId ?? variant.mekariproductid)
        if (variantMekariId && chunkSet.has(variantMekariId) && !result.has(variantMekariId)) {
          result.set(variantMekariId, row.id)
        }
      })
    })
  }

  return result
}

async function syncToSupabase(records: Record<string, unknown>[], supabaseUrl: string, supabaseKey: string) {
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  if (!records.length) return []

  const mekariIds = records
    .map(parseMekariProductId)
    .map(id => normalizeString(id))
    .filter(Boolean) as string[]

  const existingByMekariId = await findExistingProductsByMekariIds(client, mekariIds)

  const payload = await Promise.all(
    records.map(record => {
      const mekariId = parseMekariProductId(record)
      const existingId = mekariId ? existingByMekariId.get(mekariId) : undefined
      return mapToProductPayload(record, existingId)
    })
  )
  const uniqueMap = new Map(payload.map(entry => [entry.id, entry]))
  const finalPayload = await mergeExistingPricing(client, Array.from(uniqueMap.values()))

  const { error, data } = await client
    .from("products")
    .upsert(finalPayload, { onConflict: "id" })
    .select("id")

  if (error) {
    throw new Error(`Supabase error: ${error.message}`)
  }

  return data ?? []
}

async function markIntegrationSynced(
  supabaseUrl: string,
  supabaseKey: string,
  integrationName: string,
  syncedAt: string
) {
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const payload = {
    name: integrationName,
    status: "connected",
    last_sync: syncedAt
  }

  const { data: existing, error: fetchError } = await client
    .from("api_integrations")
    .select("id")
    .ilike("name", integrationName)
    .limit(1)
    .maybeSingle()

  if (fetchError && fetchError.code !== "PGRST116") {
    throw new Error(`Gagal membaca status integrasi: ${fetchError.message}`)
  }

  if (existing?.id) {
    const { error: updateError } = await client
      .from("api_integrations")
      .update(payload)
      .eq("id", existing.id)

    if (updateError) {
      throw new Error(`Gagal memperbarui waktu sinkronisasi integrasi: ${updateError.message}`)
    }
    return
  }

  const { error: insertError } = await client.from("api_integrations").insert(payload)

  if (insertError) {
    throw new Error(`Gagal membuat catatan integrasi: ${insertError.message}`)
  }
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders })
  }

  const env = Deno.env.toObject()
  const token = normalizeString(env.JURNAL_API_TOKEN)
  const supabaseUrl = normalizeString(env.SUPABASE_URL)
  const supabaseKey = normalizeString(env.SUPABASE_SERVICE_ROLE_KEY)
  const baseUrl = normalizeBaseUrl(env.JURNAL_API_BASE_URL)
  const includeArchive = normalizeString(env.MEKARI_INCLUDE_ARCHIVE) === "true"
  const integrationName = normalizeString(env.MEKARI_INTEGRATION_NAME) || "Mekari Jurnal"

  if (!token || !supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          "Pastikan JURNAL_API_TOKEN, SUPABASE_URL, dan SUPABASE_SERVICE_ROLE_KEY sudah dikonfigurasi di Supabase dashboard."
      }),
      { status: 500, headers: { "content-type": "application/json", ...corsHeaders } }
    )
  }

  try {
    const records = await fetchMekariProducts({ token, baseUrl, includeArchive })
    const syncedAt = new Date().toISOString()
    const upserted = await syncToSupabase(records, supabaseUrl, supabaseKey)
    await markIntegrationSynced(supabaseUrl, supabaseKey, integrationName, syncedAt).catch(() => {
      // Abaikan error jika tabel api_integrations belum tersedia
    })

    return new Response(
      JSON.stringify({
        ok: true,
        synced: upserted.length,
        message: `Sinkronisasi produk Mekari selesai (${upserted.length} entri).`,
        sourceCount: records.length,
        includeArchive,
        baseUrl,
        integration: integrationName,
        lastSync: syncedAt
      }),
      { headers: { "content-type": "application/json", ...corsHeaders } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error?.message || String(error) }),
      { status: 500, headers: { "content-type": "application/json", ...corsHeaders } }
    )
  }
})
