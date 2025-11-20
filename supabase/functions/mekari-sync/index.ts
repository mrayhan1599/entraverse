// Supabase Edge Function to sync Mekari products without needing the dashboard open.
// Minimal port of frontend sync logic focused on stock + SKU matching.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Helpers copied/adapted from assets/js/app.js
function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const sanitized = trimmed.replace(/\s+/g, '');
  const lastComma = sanitized.lastIndexOf(',');
  const lastDot = sanitized.lastIndexOf('.');
  const hasComma = lastComma !== -1;
  const hasDot = lastDot !== -1;
  let normalized = sanitized;
  if (hasComma && hasDot) {
    if (lastDot > lastComma) {
      normalized = sanitized.replace(/,/g, '');
    } else {
      normalized = sanitized.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (hasComma && !hasDot) {
    const decimalCandidate = sanitized.slice(lastComma + 1);
    if (decimalCandidate.length === 3) {
      normalized = sanitized.replace(/,/g, '');
    } else {
      normalized = sanitized.replace(/,/g, '.');
    }
  }

  if (!normalized || normalized === '-' || normalized === '.-' || normalized === '-.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSku(value: unknown): string {
  if (value === null || value === undefined) return '';
  try {
    return value.toString().trim().toLowerCase();
  } catch (error) {
    console.warn('normalizeSku failed', error);
    return '';
  }
}

function extractMekariStock(record: Record<string, unknown>): string | null {
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
  ];

  for (const candidate of stockCandidates) {
    const parsed = parseNumericValue(candidate);
    if (parsed !== null && Number.isFinite(parsed)) {
      return parsed.toString();
    }
  }

  return null;
}

function toIsoTimestamp(value: number | string | Date | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

interface ProductRecord {
  id: string;
  name: string;
  category: string;
  brand?: string | null;
  spu?: string | null;
  description?: string | null;
  trade_in?: boolean;
  inventory?: Record<string, unknown> | null;
  photos?: unknown[];
  variants?: unknown[];
  variant_pricing?: Record<string, unknown>[];
  mekari_status?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  spu: string;
  description: string | null;
  tradeIn: boolean;
  inventory: Record<string, unknown> | null;
  photos: unknown[];
  variants: unknown[];
  variantPricing: Record<string, unknown>[];
  mekariStatus: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number | null;
}

function mapSupabaseProduct(record: ProductRecord): Product | null {
  if (!record) return null;
  const photos = Array.isArray(record.photos) ? record.photos.filter(Boolean) : [];
  const variants = Array.isArray(record.variants) ? record.variants : [];
  const variantPricing = Array.isArray(record.variant_pricing) ? record.variant_pricing : [];
  const rawSpu = (record as any).spu ?? (record as any).parent_sku ?? (record as any).parentSku ?? '';
  const normalizedSpu =
    typeof rawSpu === 'string'
      ? rawSpu.trim()
      : rawSpu && typeof rawSpu !== 'undefined'
      ? String(rawSpu).trim()
      : '';

  return {
    id: record.id,
    name: record.name ?? '',
    category: record.category ?? '',
    brand: record.brand ?? null,
    spu: normalizedSpu,
    description: record.description ?? null,
    tradeIn: Boolean(record.trade_in),
    inventory: (record as any).inventory ?? null,
    photos,
    variants,
    variantPricing,
    mekariStatus: (record as any).mekari_status ?? null,
    createdAt: record.created_at ? new Date(record.created_at).getTime() : Date.now(),
    updatedAt: record.updated_at ? new Date(record.updated_at).getTime() : null
  };
}

function mapProductToRecord(product: Product): ProductRecord {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand || null,
    spu: product.spu || null,
    description: product.description || null,
    trade_in: Boolean(product.tradeIn),
    inventory: product.inventory ?? null,
    photos: Array.isArray(product.photos) ? product.photos : [],
    variants: Array.isArray(product.variants) ? product.variants : [],
    variant_pricing: Array.isArray(product.variantPricing) ? product.variantPricing : [],
    mekari_status: product.mekariStatus ?? null,
    created_at: toIsoTimestamp(product.createdAt) ?? new Date().toISOString(),
    updated_at: toIsoTimestamp(product.updatedAt) ?? new Date().toISOString()
  };
}

function normalizeSkuFromVariant(row: Record<string, unknown>): string {
  const sellerSku = (row as any).sellerSku ?? (row as any).sku;
  return normalizeSku(sellerSku);
}

function buildSkuIndex(products: Product[]) {
  const map = new Map<string, { product: Product; variantIndex: number }[]>();
  products.forEach(product => {
    const pricing = Array.isArray(product.variantPricing) ? product.variantPricing : [];
    pricing.forEach((row, index) => {
      const sku = normalizeSkuFromVariant(row);
      if (!sku) return;
      const bucket = map.get(sku) ?? [];
      bucket.push({ product, variantIndex: index });
      map.set(sku, bucket);
    });
  });
  return map;
}

async function fetchMekariProducts(baseUrl: string, token: string) {
  const baseParams = new URLSearchParams();
  baseParams.set('include_archive', 'false');

  const requestPage = async (page: number, perPage: number) => {
    const params = new URLSearchParams(baseParams);
    params.set('page', Math.max(1, Math.floor(page)).toString());
    params.set('per_page', Math.max(1, Math.floor(perPage)).toString());
    const url = `${baseUrl}/partner/core/api/v1/products?${params.toString()}`;
    const headers = new Headers({ Accept: 'application/json' });
    headers.set('Authorization', token);
    const response = await fetch(url, { method: 'GET', headers });
    const body = await response.json();
    if (!response.ok) {
      const message =
        (body?.error as string) ||
        (body?.message as string) ||
        (body?.response_message as string) ||
        `status ${response.status}`;
      throw new Error(message);
    }

    const payloadCandidates = [body?.products, body?.data?.products, body?.data, body?.result?.products, body?.result];
    let records: any[] = [];
    for (const candidate of payloadCandidates) {
      if (Array.isArray(candidate) && candidate.length) {
        records = candidate.filter(Boolean);
        break;
      }
    }
    if (!Array.isArray(records)) records = [];

    const pagination = {
      currentPage: Number(body?.current_page ?? body?.page ?? params.get('page')) || page,
      totalPages: Number(body?.total_pages ?? body?.pagination?.total_pages ?? body?.totalPages) || null,
      perPage: Number(body?.per_page ?? body?.pagination?.per_page ?? params.get('per_page')) || perPage,
      hasMore: null as boolean | null,
      nextPage: null as number | null
    };

    if (pagination.totalPages && pagination.currentPage) {
      pagination.hasMore = pagination.currentPage < pagination.totalPages;
    }
    if (body?.links?.next || body?.pagination?.nextPage) {
      const next = Number(body?.links?.next?.page ?? body?.pagination?.nextPage);
      if (Number.isFinite(next)) {
        pagination.nextPage = next;
        pagination.hasMore = pagination.hasMore ?? next > pagination.currentPage;
      }
    }

    return { records, pagination };
  };

  const collected: any[] = [];
  let page = 1;
  let perPage = 100;
  let iterations = 0;
  const maxPages = 200;

  while (iterations < maxPages) {
    const { records, pagination } = await requestPage(page, perPage);
    iterations += 1;
    const pageSize = Number.isFinite(pagination.perPage) && pagination.perPage > 0 ? pagination.perPage : perPage;
    perPage = pageSize || perPage;

    records.forEach(record => {
      const normalizedSku = normalizeSku((record as any).product_code ?? (record as any).productCode ?? (record as any).sku ?? '');
      const idCandidate = (record as any).id ?? (record as any).product?.id ?? (record as any).product_id;
      if (!normalizedSku && !idCandidate) return;
      if (record?.archive || record?.active === false) return;
      collected.push(record);
    });

    const hasMore = pagination.hasMore ?? (pagination.totalPages ? pagination.currentPage < pagination.totalPages : null);
    if (!hasMore) break;
    const nextPage = pagination.nextPage ?? pagination.currentPage + 1;
    if (!Number.isFinite(nextPage) || nextPage <= pagination.currentPage) break;
    page = nextPage;
  }

  return collected;
}

Deno.serve(async req => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const mekariToken = Deno.env.get('MEKARI_TOKEN');
  const mekariBaseUrl = (Deno.env.get('MEKARI_BASE_URL') || 'https://api.jurnal.id').replace(/\/+$/, '');

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase credentials are missing' }), { status: 500 });
  }
  if (!mekariToken) {
    return new Response(JSON.stringify({ error: 'MEKARI_TOKEN is not configured' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('products').select('*');
  if (error) {
    return new Response(JSON.stringify({ error: `Failed to load products: ${error.message}` }), { status: 500 });
  }

  const products = (data ?? []).map(mapSupabaseProduct).filter(Boolean) as Product[];
  const skuIndex = buildSkuIndex(products);

  const mekariRecords = await fetchMekariProducts(mekariBaseUrl, mekariToken);
  const touchedProducts = new Set<string>();

  mekariRecords.forEach(record => {
    const rawSku = (record as any).product_code ?? (record as any).productCode ?? (record as any).sku;
    const normalizedSku = normalizeSku(rawSku);
    if (!normalizedSku) return;
    const stockValue = extractMekariStock(record as Record<string, unknown>);
    if (stockValue === null) return;

    const matches = skuIndex.get(normalizedSku);
    if (!matches || !matches.length) return;

    matches.forEach(({ product, variantIndex }) => {
      const pricing = Array.isArray(product.variantPricing) ? product.variantPricing : [];
      const row = pricing[variantIndex] ?? {};
      if ((row as any).stock === stockValue) return;
      pricing[variantIndex] = { ...row, stock: stockValue };
      product.variantPricing = pricing;
      product.updatedAt = Date.now();
      touchedProducts.add(product.id);
    });
  });

  const updatedRecords: ProductRecord[] = [];
  products.forEach(product => {
    if (!touchedProducts.has(product.id)) return;
    updatedRecords.push(mapProductToRecord(product));
  });

  if (updatedRecords.length) {
    const { error: upsertError } = await supabase
      .from('products')
      .upsert(updatedRecords, { onConflict: 'id' })
      .select();

    if (upsertError) {
      return new Response(JSON.stringify({ error: `Failed to upsert products: ${upsertError.message}` }), {
        status: 500
      });
    }
  }

  return new Response(
    JSON.stringify({
      status: 'ok',
      updatedProducts: updatedRecords.length,
      scannedProducts: products.length,
      mekariProducts: mekariRecords.length
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
