const STORAGE_KEYS = {
  users: 'entraverse_users',
  session: 'entraverse_session',
  products: 'entraverse_products',
  categories: 'entraverse_categories',
  exchangeRates: 'entraverse_exchange_rates',
  shippingVendors: 'entraverse_shipping_vendors',
  integrations: 'entraverse_integrations',
  salesReports: 'entraverse_sales_reports'
};

const GUEST_USER = Object.freeze({
  id: 'guest-user',
  name: 'Tamu Entraverse',
  company: 'Entraverse',
  email: 'guest@entraverse.local'
});

let activeSessionUser = null;

function createUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const byteToHex = [];
  for (let index = 0; index < 256; index += 1) {
    byteToHex[index] = index.toString(16).padStart(2, '0');
  }

  return (
    byteToHex[bytes[0]] +
    byteToHex[bytes[1]] +
    byteToHex[bytes[2]] +
    byteToHex[bytes[3]] + '-' +
    byteToHex[bytes[4]] +
    byteToHex[bytes[5]] + '-' +
    byteToHex[bytes[6]] +
    byteToHex[bytes[7]] + '-' +
    byteToHex[bytes[8]] +
    byteToHex[bytes[9]] + '-' +
    byteToHex[bytes[10]] +
    byteToHex[bytes[11]] +
    byteToHex[bytes[12]] +
    byteToHex[bytes[13]] +
    byteToHex[bytes[14]] +
    byteToHex[bytes[15]]
  );
}

const MEKARI_STATUS_STATES = new Set(['synced', 'syncing', 'pending', 'error', 'missing']);

const DEFAULT_MEKARI_STATUS = Object.freeze({
  state: 'pending',
  lastSyncedAt: null,
  message: '',
  error: ''
});

function normalizeMekariStatus(status) {
  if (!status || typeof status !== 'object') {
    return { ...DEFAULT_MEKARI_STATUS };
  }

  const normalized = { ...DEFAULT_MEKARI_STATUS };

  const stateCandidate = (status.state ?? status.status ?? '').toString().trim().toLowerCase();
  if (MEKARI_STATUS_STATES.has(stateCandidate)) {
    normalized.state = stateCandidate;
  }

  const syncCandidate =
    status.lastSyncedAt ?? status.lastSync ?? status.syncedAt ?? status.updatedAt ?? null;
  if (syncCandidate) {
    let dateValue = null;
    if (syncCandidate instanceof Date) {
      dateValue = syncCandidate;
    } else if (typeof syncCandidate === 'number' && Number.isFinite(syncCandidate)) {
      dateValue = new Date(syncCandidate);
    } else if (typeof syncCandidate === 'string') {
      dateValue = new Date(syncCandidate);
    }
    if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
      normalized.lastSyncedAt = dateValue.toISOString();
    }
  }

  const messageCandidates = [status.message, status.detail, status.note, status.description];
  for (const candidate of messageCandidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        normalized.message = trimmed;
        break;
      }
    } else if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      normalized.message = candidate.toString();
      break;
    }
  }

  const errorCandidates = [status.error, status.errorMessage, status.reason];
  for (const candidate of errorCandidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        normalized.error = trimmed;
        normalized.state = 'error';
        break;
      }
    } else if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      normalized.error = candidate.toString();
      normalized.state = 'error';
      break;
    }
  }

  return normalized;
}

function getMekariStatusLabel(state) {
  switch (state) {
    case 'synced':
      return 'Sinkron';
    case 'missing':
      return 'Tidak Ditemukan';
    case 'syncing':
      return 'Menyinkronkan';
    case 'error':
      return 'Gagal Sinkron';
    case 'pending':
    default:
      return 'Belum Sinkron';
  }
}

function formatDateTimeForDisplay(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function resolveMekariStatusTooltip(status) {
  if (!status || typeof status !== 'object') {
    return '';
  }

  if (status.error) {
    return status.error;
  }

  if (status.message) {
    return status.message;
  }

  if (status.lastSyncedAt) {
    const formatted = formatDateTimeForDisplay(status.lastSyncedAt);
    if (formatted) {
      return `Sinkron terakhir pada ${formatted}.`;
    }
  }

  return '';
}

const DEFAULT_PRODUCTS = [
  {
    id: crypto.randomUUID(),
    name: 'Meta Quest 3S 128 GB Virtual Reality Headset',
    category: 'Virtual Reality',
    brand: 'Meta',
    photos: [
      'https://images.unsplash.com/photo-1580894897617-4812950f48cd?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Headset VR canggih untuk pengalaman imersif dalam dunia virtual.',
    tradeIn: true,
    variants: [
      { name: 'Warna', options: ['Green', 'Clear', 'Dusty Blue'] },
      { name: 'Garansi', options: ['1 Tahun', 'Tanpa Garansi'] },
      { name: 'Kapasitas', options: ['128 GB', '256 GB', '1 TB'] }
    ],
    variantPricing: [
      {
        id: crypto.randomUUID(),
        variants: [
          { name: 'Warna', value: 'Green' },
          { name: 'Garansi', value: '1 Tahun' },
          { name: 'Kapasitas', value: '128 GB' }
        ],
        purchasePrice: '389',
        purchaseCurrency: 'USD',
        exchangeRate: '15500',
        purchasePriceIdr: '6039500',
        offlinePrice: '9555000',
        entraversePrice: '9700000',
        tokopediaPrice: '9750000',
        shopeePrice: '9650000',
        stock: '25',
        dailyAverageSales: '8',
        sellerSku: 'SKU-MQ3S-128-GRN-1TH-128',
        weight: '2000'
      },
      {
        id: crypto.randomUUID(),
        variants: [
          { name: 'Warna', value: 'Dusty Blue' },
          { name: 'Garansi', value: 'Tanpa Garansi' },
          { name: 'Kapasitas', value: '256 GB' }
        ],
        purchasePrice: '429',
        purchaseCurrency: 'USD',
        exchangeRate: '15500',
        purchasePriceIdr: '6650000',
        offlinePrice: '9799000',
        entraversePrice: '9899000',
        tokopediaPrice: '10000000',
        shopeePrice: '9950000',
        stock: '18',
        dailyAverageSales: '6',
        sellerSku: 'SKU-MQ3S-256-DBL-NTG',
        weight: '2050'
      }
    ],
    mekariStatus: normalizeMekariStatus({
      state: 'synced',
      lastSyncedAt: Date.now() - 45 * 60 * 1000,
      message: 'Sinkron stok & harga pada Mekari Jurnal'
    }),
    createdAt: Date.now()
  },
  {
    id: crypto.randomUUID(),
    name: 'Meta Quest 3S 256 GB Virtual Reality Headset',
    category: 'Virtual Reality',
    brand: 'Meta',
    photos: [
      'https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Versi penyimpanan besar untuk koleksi aplikasi VR favorit.',
    tradeIn: false,
    variants: [
      { name: 'Warna', options: ['Graphite', 'Pearl'] },
      { name: 'Garansi', options: ['1 Tahun', '2 Tahun'] },
      { name: 'Kapasitas', options: ['256 GB'] }
    ],
    variantPricing: [
      {
        id: crypto.randomUUID(),
        variants: [
          { name: 'Warna', value: 'Graphite' },
          { name: 'Garansi', value: '1 Tahun' },
          { name: 'Kapasitas', value: '256 GB' }
        ],
        purchasePrice: '459',
        purchaseCurrency: 'USD',
        exchangeRate: '15500',
        purchasePriceIdr: '7114500',
        offlinePrice: '10350000',
        entraversePrice: '10499000',
        tokopediaPrice: '10699000',
        shopeePrice: '10550000',
        stock: '12',
        dailyAverageSales: '5',
        sellerSku: 'SKU-MQ3S-256-GRP-1TH',
        weight: '2100'
      },
      {
        id: crypto.randomUUID(),
        variants: [
          { name: 'Warna', value: 'Pearl' },
          { name: 'Garansi', value: '2 Tahun' },
          { name: 'Kapasitas', value: '256 GB' }
        ],
        purchasePrice: '499',
        purchaseCurrency: 'USD',
        exchangeRate: '15500',
        purchasePriceIdr: '7734500',
        offlinePrice: '10899000',
        entraversePrice: '10999000',
        tokopediaPrice: '11150000',
        shopeePrice: '11050000',
        stock: '9',
        dailyAverageSales: '4',
        sellerSku: 'SKU-MQ3S-256-PRL-2TH',
        weight: '2100'
      }
    ],
    mekariStatus: normalizeMekariStatus({
      state: 'error',
      lastSyncedAt: Date.now() - 3 * 60 * 60 * 1000,
      error: 'SKU tidak ditemukan di Mekari Jurnal. Periksa kembali mapping produk.'
    }),
    createdAt: Date.now()
  }
];

const DEFAULT_CATEGORIES = [
  {
    id: 'cat-virtual-reality',
    name: 'Virtual Reality',
    note: 'Headset, controller, dan aksesoris AR/VR',
    fees: { marketplace: '10.3%', shopee: '8.0%', entraverse: '8.00%' },
    margin: { value: '10.00%', note: '+1.2% vs bulan lalu' }
  },
  {
    id: 'cat-konsol-game',
    name: 'Konsol Game',
    note: 'PlayStation, Xbox, dan Nintendo resmi',
    fees: { marketplace: '10.3%', shopee: '8.0%', entraverse: '8.00%' },
    margin: { value: '9.40%', note: '+0.5% dibanding Q1' }
  },
  {
    id: 'cat-handphone',
    name: 'Handphone',
    note: 'Smartphone flagship & mid-range',
    fees: { marketplace: '9.5%', shopee: '7.5%', entraverse: '7.40%' },
    margin: { value: '8.20%', note: '-0.3% vs bulan lalu' }
  },
  {
    id: 'cat-laptop',
    name: 'Laptop',
    note: 'Laptop consumer dan bisnis',
    fees: { marketplace: '10.0%', shopee: '8.0%', entraverse: '8.25%' },
    margin: { value: '11.40%', note: '+0.8% vs bulan lalu' }
  },
  {
    id: 'cat-tablet',
    name: 'Tablet',
    note: 'Tablet Android & iPad',
    fees: { marketplace: '9.8%', shopee: '7.8%', entraverse: '7.90%' },
    margin: { value: '9.75%', note: '+0.2% vs bulan lalu' }
  },
  {
    id: 'cat-audio',
    name: 'Audio',
    note: 'Headphone, speaker, dan audio pro',
    fees: { marketplace: '8.5%', shopee: '7.0%', entraverse: '7.10%' },
    margin: { value: '12.60%', note: '+1.0% dibanding Q1' }
  },
  {
    id: 'cat-smart-home',
    name: 'Smart Home',
    note: 'Perangkat IoT & otomasi rumah',
    fees: { marketplace: '8.0%', shopee: '6.5%', entraverse: '6.75%' },
    margin: { value: '13.20%', note: '+1.8% vs bulan lalu' }
  },
  {
    id: 'cat-outdoor-outtam',
    name: 'Outdoor - Outtam',
    note: 'Peralatan outdoor & travelling',
    fees: { marketplace: '7.5%', shopee: '6.2%', entraverse: '6.40%' },
    margin: { value: '10.80%', note: '+0.6% dibanding Q1' }
  },
  {
    id: 'cat-aksesoris',
    name: 'Aksesoris',
    note: 'Aksesoris gadget & lifestyle',
    fees: { marketplace: '8.8%', shopee: '6.9%', entraverse: '7.10%' },
    margin: { value: '9.10%', note: '-0.2% vs bulan lalu' }
  }
];

const PRODUCT_PAGINATION_STATE = {
  pageSize: 10,
  currentPage: 1,
  lastFilter: '',
  totalItems: 0,
  totalFiltered: 0,
  totalPages: 1
};

let currentProductPageItems = [];
let productRenderRequestToken = 0;

const PRODUCT_SORT_STATE = {
  field: 'name',
  direction: 'asc'
};

const PRODUCT_NAME_COLLATOR = typeof Intl !== 'undefined' && typeof Intl.Collator === 'function'
  ? new Intl.Collator('id-ID', { sensitivity: 'base', numeric: true })
  : null;

const DEFAULT_EXCHANGE_RATES = [
  {
    id: 'rate-idr',
    currency: 'IDR',
    label: 'Indonesian Rupiah',
    rate: 1
  },
  {
    id: 'rate-usd',
    currency: 'USD',
    label: 'United States Dollar',
    rate: 15500
  },
  {
    id: 'rate-sgd',
    currency: 'SGD',
    label: 'Singapore Dollar',
    rate: 11700
  },
  {
    id: 'rate-eur',
    currency: 'EUR',
    label: 'Euro',
    rate: 16900
  },
  {
    id: 'rate-aud',
    currency: 'AUD',
    label: 'Australian Dollar',
    rate: 10300
  }
];

const DEFAULT_SHIPPING_VENDORS = Object.freeze([]);

const DEFAULT_API_INTEGRATIONS = Object.freeze([
  {
    id: 'integration-mekari-jurnal',
    name: 'Mekari Jurnal',
    logoUrl: 'assets/img/integrations/mekari-jurnal.svg',
    category: 'Keuangan & Akuntansi',
    status: 'connected',
    connectedAccount: 'Finance Ops',
    syncFrequency: 'Setiap 15 menit',
    lastSync: '2024-09-12T09:45:00+07:00',
    capabilities: 'Sinkronisasi penjualan, invoice, dan jurnal ke Mekari Jurnal secara otomatis.',
    apiBaseUrl: 'https://api.jurnal.id',
    authorizationPath: '/oauth/authorize',
    accessToken: 'gkVa5vJxxmzriunIyOHINHEmnZqew3H6'
  },
  {
    id: 'integration-accurate-online',
    name: 'Accurate Online',
    logoUrl: 'assets/img/integrations/accurate-online.svg',
    category: 'Keuangan & Akuntansi',
    status: 'pending',
    connectedAccount: '',
    syncFrequency: 'Setiap 1 jam',
    lastSync: null,
    capabilities: 'Siapkan token API untuk mengirim data stok dan penjualan ke Accurate Online.',
    requiresSetup: true,
    apiBaseUrl: 'https://accurate.id/api',
    authorizationPath: '/oauth/authorize',
    accessToken: ''
  },
  {
    id: 'integration-quickbooks',
    name: 'QuickBooks Online',
    logoUrl: 'assets/img/integrations/quickbooks-online.svg',
    category: 'Finance & Tax',
    status: 'available',
    connectedAccount: '',
    syncFrequency: 'Manual / Sesuai permintaan',
    lastSync: null,
    capabilities: 'Ekspor transaksi impor dan ekspor ke QuickBooks secara instan.',
    apiBaseUrl: 'https://quickbooks.api.intuit.com',
    authorizationPath: '/v3/company/oauth2/authorize',
    accessToken: ''
  },
  {
    id: 'integration-google-data-studio',
    name: 'Looker Studio',
    logoUrl: 'assets/img/integrations/looker-studio.svg',
    category: 'Business Intelligence',
    status: 'connected',
    connectedAccount: 'Management Dashboard',
    syncFrequency: 'Setiap 30 menit',
    lastSync: '2024-09-12T08:15:00+07:00',
    capabilities: 'Streaming performa penjualan ke dashboard BI untuk pemantauan real-time.',
    apiBaseUrl: 'https://lookerstudio.google.com',
    authorizationPath: '/auth/embed',
    accessToken: 'LOOKER-DASH-TKN-1A2B3C'
  }
]);

const DEFAULT_SALES_REPORTS = Object.freeze([
  {
    id: 'sales-2024-09-quest-128',
    productName: 'Meta Quest 3S 128 GB Virtual Reality Headset',
    sku: 'SKU-MQ3S-128-GRN-1TH-128',
    channel: 'Tokopedia',
    period: {
      key: '2024-09',
      label: 'September 2024',
      start: '2024-09-01',
      end: '2024-09-30'
    },
    unitsSold: 245,
    grossSales: 2375000000,
    discounts: 75000000,
    netSales: 2300000000,
    cogs: 1685000000,
    grossProfit: 615000000,
    margin: 0.267,
    syncStatus: 'on-track',
    syncFrequency: 'Setiap 15 menit',
    lastSyncAt: '2024-10-02T10:15:00+07:00',
    integration: 'Mekari Jurnal'
  },
  {
    id: 'sales-2024-09-quest-256',
    productName: 'Meta Quest 3S 256 GB Virtual Reality Headset',
    sku: 'SKU-MQ3S-256-GRP-1TH',
    channel: 'Shopee',
    period: {
      key: '2024-09',
      label: 'September 2024',
      start: '2024-09-01',
      end: '2024-09-30'
    },
    unitsSold: 198,
    grossSales: 2058000000,
    discounts: 62000000,
    netSales: 1996000000,
    cogs: 1489000000,
    grossProfit: 507000000,
    margin: 0.254,
    syncStatus: 'scheduled',
    syncFrequency: 'Setiap 30 menit',
    lastSyncAt: '2024-10-02T10:12:00+07:00',
    integration: 'Mekari Jurnal'
  },
  {
    id: 'sales-2024-08-ps5',
    productName: 'Sony PlayStation 5 Slim 1TB',
    sku: 'SKU-PS5SLIM-1TB',
    channel: 'Entraverse ID',
    period: {
      key: '2024-08',
      label: 'Agustus 2024',
      start: '2024-08-01',
      end: '2024-08-31'
    },
    unitsSold: 172,
    grossSales: 2564000000,
    discounts: 98400000,
    netSales: 2465600000,
    cogs: 1824000000,
    grossProfit: 641600000,
    margin: 0.260,
    syncStatus: 'on-track',
    syncFrequency: 'Setiap 1 jam',
    lastSyncAt: '2024-10-01T18:45:00+07:00',
    integration: 'Mekari Jurnal'
  },
  {
    id: 'sales-2024-q3-airpods',
    productName: 'Apple AirPods Pro (2nd Gen) USB-C',
    sku: 'SKU-AIRPODS-PRO-2-USBC',
    channel: 'Tokopedia',
    period: {
      key: '2024-q3',
      label: 'Triwulan 3 2024',
      start: '2024-07-01',
      end: '2024-09-30'
    },
    unitsSold: 486,
    grossSales: 5218000000,
    discounts: 186200000,
    netSales: 5031800000,
    cogs: 3824000000,
    grossProfit: 1207800000,
    margin: 0.240,
    syncStatus: 'manual',
    syncFrequency: 'Manual - Perlu persetujuan',
    lastSyncAt: '2024-09-30T21:05:00+07:00',
    integration: 'Mekari Jurnal'
  }
]);

const MEKARI_INTEGRATION_NAME = 'Mekari Jurnal';
const MEKARI_DEFAULT_LOGO_URL = 'assets/img/integrations/mekari-jurnal.svg';
let mekariIntegrationCache = null;
let mekariIntegrationFetchPromise = null;
const TARGET_WAREHOUSE_NAME = 'Display';

let warehouseMovementsState = {
  rows: [],
  header: null,
  totals: null,
  warehouses: 0,
  lastSignature: null,
  loading: false,
  error: null,
  currentPage: 1,
  pageSize: 10,
  lastFilteredCount: 0,
  sort: { key: null, direction: 'asc' },
  lastLoadedAt: null
};

const WAREHOUSE_MOVEMENTS_CACHE_KEY = 'entraverse_warehouse_movements_cache';
const WAREHOUSE_MOVEMENTS_CACHE_TTL_MS = 5 * 60 * 1000;
const WAREHOUSE_NUMERIC_SORT_KEYS = new Set(['openingBalance', 'qtyIn', 'qtyOut', 'closingBalance']);
const DAILY_AVERAGE_WINDOW_DAYS = 30;
const DAILY_INVENTORY_SYNC_STORAGE_KEY = 'entraverse_daily_inventory_sync_state';
const DAILY_INVENTORY_SYNC_TRIGGER_MINUTE = 1; // 00:01 WIB
const WIB_TIMEZONE_OFFSET_MINUTES = 7 * 60;
let warehouseAverageCache = null;
let warehouseAveragePromise = null;
let dailyInventorySyncTimer = null;
let dailyInventorySyncScheduled = false;
let dailyInventorySyncPromise = null;

async function synchronizeMekariProducts({ attemptTime = new Date(), reason = 'manual' } = {}) {
  const attempt = attemptTime instanceof Date && !Number.isNaN(attemptTime.getTime()) ? attemptTime : new Date();
  const attemptIso = attempt.toISOString();

  updateDailyInventorySyncState(previous => ({
    ...previous,
    lastAttemptAt: attemptIso,
    lastStatus: 'running',
    lastError: null,
    lastReason: reason
  }));

  if (!isSupabaseConfigured()) {
    const message = 'Supabase belum dikonfigurasi.';
    const state = updateDailyInventorySyncState(previous => ({
      ...previous,
      lastStatus: 'skipped',
      lastError: message,
      lastReason: reason
    }));
    return { success: false, skipped: true, reason: 'supabase-unconfigured', message, state, attempt, attemptIso };
  }

  if (!canManageCatalog()) {
    const message = 'Hak akses katalog tidak tersedia.';
    const state = updateDailyInventorySyncState(previous => ({
      ...previous,
      lastStatus: 'skipped',
      lastError: message,
      lastReason: reason
    }));
    return { success: false, skipped: true, reason: 'unauthorized', message, state, attempt, attemptIso };
  }

  try {
    await ensureSupabase();
  } catch (error) {
    const message = error?.message ? String(error.message) : 'Gagal menginisialisasi Supabase.';
    const state = updateDailyInventorySyncState(previous => ({
      ...previous,
      lastStatus: 'error',
      lastError: message,
      lastReason: reason
    }));
    console.error('Gagal menginisialisasi Supabase sebelum sinkronisasi Mekari.', error);
    return { success: false, skipped: false, reason: 'supabase-init', message, state, error, attempt, attemptIso };
  }

  try {
    await refreshProductsFromSupabase();
  } catch (error) {
    console.warn('Gagal memuat produk terbaru sebelum sinkronisasi Mekari.', error);
  }

  let cachedProducts = getProductsFromCache();
  cachedProducts = Array.isArray(cachedProducts) ? [...cachedProducts] : [];
  const { map: existingSkuMap, set: existingSkus } = collectExistingSkuDetails(cachedProducts);
  const productIndicesWithSku = new Set();
  const productSkuStats = new Map();
  existingSkuMap.forEach(matches => {
    if (!Array.isArray(matches)) {
      return;
    }
    matches.forEach(entry => {
      if (entry && Number.isInteger(entry.productIndex) && entry.productIndex >= 0) {
        productIndicesWithSku.add(entry.productIndex);
        const stats = productSkuStats.get(entry.productIndex) ?? { total: 0, matched: 0 };
        stats.total += 1;
        productSkuStats.set(entry.productIndex, stats);
      }
    });
  });

  let mekariRecords = [];
  let integration = null;
  try {
    const response = await fetchMekariProducts({ includeArchive: false });
    mekariRecords = Array.isArray(response?.products) ? response.products : [];
    integration = response?.integration ?? null;
  } catch (error) {
    const message = error?.message ? String(error.message) : 'Gagal memuat produk dari Mekari Jurnal.';
    const state = updateDailyInventorySyncState(previous => ({
      ...previous,
      lastStatus: 'error',
      lastError: message,
      lastReason: reason
    }));
    console.error('Gagal mengambil data produk Mekari.', error);
    return { success: false, skipped: false, reason: 'mekari-products', message, state, error, attempt, attemptIso };
  }

  let syncedIntegration = integration;

  const updatedProductsMap = new Map();
  const updatedSkuSet = new Set();
  const newProducts = [];
  const matchedVariantKeys = new Set();

  const missingStatusMessage = 'SKU produk tidak ditemukan di Mekari Jurnal.';
  const syncedStatusMessage = 'SKU ditemukan di Mekari Jurnal.';

  const applyProductMekariStatus = (productIndex, statusOverride = {}) => {
    if (!Number.isInteger(productIndex) || productIndex < 0) {
      return;
    }

    const product = cachedProducts[productIndex];
    if (!product || !product.id) {
      return;
    }

    const normalizedStatus = normalizeMekariStatus({
      ...statusOverride,
      lastSyncedAt: statusOverride?.lastSyncedAt ?? attemptIso
    });

    const currentStatus = normalizeMekariStatus(product.mekariStatus);
    const hasMeaningfulChange =
      currentStatus.state !== normalizedStatus.state ||
      currentStatus.lastSyncedAt !== normalizedStatus.lastSyncedAt ||
      currentStatus.message !== normalizedStatus.message ||
      currentStatus.error !== normalizedStatus.error;

    if (!hasMeaningfulChange) {
      return;
    }

    const baseProduct = updatedProductsMap.get(product.id) ?? product;
    const updatedProduct = {
      ...baseProduct,
      mekariStatus: normalizedStatus,
      updatedAt: Date.now()
    };

    cachedProducts[productIndex] = updatedProduct;
    updatedProductsMap.set(updatedProduct.id, updatedProduct);
  };

  if (!Array.isArray(mekariRecords) || mekariRecords.length === 0) {
    productIndicesWithSku.forEach(productIndex => {
      applyProductMekariStatus(productIndex, {
        state: 'missing',
        lastSyncedAt: attemptIso,
        message: missingStatusMessage
      });
    });

    const productsNeedingUpdate = Array.from(updatedProductsMap.values());

    if (productsNeedingUpdate.length) {
      try {
        await bulkUpsertProductsToSupabase(productsNeedingUpdate);
      } catch (error) {
        const message = error?.message ? String(error.message) : 'Gagal memperbarui status SKU di Supabase.';
        const state = updateDailyInventorySyncState(previous => ({
          ...previous,
          lastStatus: 'error',
          lastError: message,
          lastReason: reason
        }));
        console.error('Gagal menyimpan status SKU hilang ke Supabase.', error);
        return { success: false, skipped: false, reason: 'supabase-upsert', message, state, error, attempt, attemptIso };
      }
    }

    if (integration) {
      try {
        syncedIntegration = await markMekariIntegrationSynced(integration, attemptIso);
      } catch (error) {
        console.warn('Gagal memperbarui status sinkronisasi Mekari.', error);
      }
    }

    const state = updateDailyInventorySyncState(previous => ({
      ...previous,
      lastStatus: 'success',
      lastError: null,
      lastSuccessAt: attemptIso
    }));

    return {
      success: true,
      empty: true,
      message: 'Tidak ada produk Mekari yang ditemukan.',
      integration: syncedIntegration,
      state,
      attempt,
      attemptIso,
      updatedSkuCount: 0,
      newProductsCount: 0,
      summaryParts: []
    };
  }

  const updateVariantStock = (productIndex, variantIndex, nextStock) => {
    if (!Number.isInteger(productIndex) || productIndex < 0) {
      return false;
    }
    const product = cachedProducts?.[productIndex];
    if (!product) {
      return false;
    }
    const pricingRows = Array.isArray(product.variantPricing) ? [...product.variantPricing] : [];
    const currentRow = pricingRows?.[variantIndex];
    if (!currentRow) {
      return false;
    }

    const nextStockValue = nextStock === null || nextStock === undefined ? '' : nextStock.toString().trim();
    const currentStockRaw = currentRow.stock === null || currentRow.stock === undefined ? '' : currentRow.stock.toString().trim();
    if (currentStockRaw === nextStockValue) {
      return false;
    }

    const updatedVariant = { ...currentRow, stock: nextStockValue };
    pricingRows[variantIndex] = updatedVariant;
    const updatedProduct = { ...product, variantPricing: pricingRows, updatedAt: Date.now() };
    const aggregatedStock = calculateProductTotalStock(updatedProduct);
    if (aggregatedStock !== null) {
      updatedProduct.stock = aggregatedStock;
    } else {
      delete updatedProduct.stock;
    }
    cachedProducts[productIndex] = updatedProduct;
    updatedProductsMap.set(updatedProduct.id, updatedProduct);
    return true;
  };

  mekariRecords.forEach(record => {
    if (!record) {
      return;
    }

    if (record.archive || record.active === false) {
      return;
    }

    const normalizedSku = normalizeSku(record.product_code ?? record.productCode ?? record.sku);
    if (!normalizedSku) {
      return;
    }

    const stockValue = extractMekariStock(record);
    const existingMatches = existingSkuMap.get(normalizedSku);
    if (existingMatches && existingMatches.length) {
      existingMatches.forEach(({ productIndex, variantIndex }) => {
        if (Number.isInteger(productIndex) && Number.isInteger(variantIndex)) {
          const key = `${productIndex}:${variantIndex}`;
          if (!matchedVariantKeys.has(key)) {
            matchedVariantKeys.add(key);
            const stats = productSkuStats.get(productIndex);
            if (stats) {
              stats.matched += 1;
              productSkuStats.set(productIndex, stats);
            }
          }
        }
      });

      if (stockValue !== null) {
        let skuChanged = false;
        existingMatches.forEach(({ productIndex, variantIndex }) => {
          if (!Number.isInteger(variantIndex)) {
            return;
          }
          const changed = updateVariantStock(productIndex, variantIndex, stockValue);
          if (changed) {
            skuChanged = true;
          }
        });
        if (skuChanged) {
          updatedSkuSet.add(normalizedSku);
        }
      }
      existingSkus.add(normalizedSku);
      return;
    }

    if (existingSkus.has(normalizedSku)) {
      return;
    }

    const mapped = mapMekariProductRecord(record);
    if (!mapped) {
      return;
    }

    const aggregatedStock = calculateProductTotalStock(mapped);
    if (aggregatedStock !== null) {
      mapped.stock = aggregatedStock;
    }
    existingSkus.add(normalizedSku);
    newProducts.push(mapped);
  });

  let missingProductsCount = 0;

  productIndicesWithSku.forEach(productIndex => {
    const stats = productSkuStats.get(productIndex);
    const hasMissingSku = !stats || stats.matched < stats.total;

    if (!hasMissingSku) {
      applyProductMekariStatus(productIndex, {
        state: 'synced',
        lastSyncedAt: attemptIso,
        message: syncedStatusMessage
      });
    } else {
      missingProductsCount += 1;
      applyProductMekariStatus(productIndex, {
        state: 'missing',
        lastSyncedAt: attemptIso,
        message: missingStatusMessage
      });
    }
  });

  const updatedProducts = Array.from(updatedProductsMap.values());

  const productsToPersist = [...updatedProducts, ...newProducts];
  if (productsToPersist.length) {
    try {
      await bulkUpsertProductsToSupabase(productsToPersist);
    } catch (error) {
      const message = error?.message ? String(error.message) : 'Gagal memperbarui produk di Supabase.';
      const state = updateDailyInventorySyncState(previous => ({
        ...previous,
        lastStatus: 'error',
        lastError: message,
        lastReason: reason
      }));
      console.error('Gagal menyimpan pembaruan stok Mekari ke Supabase.', error);
      return { success: false, skipped: false, reason: 'supabase-upsert', message, state, error, attempt, attemptIso };
    }
  }

  try {
    await refreshProductsFromSupabase();
  } catch (refreshError) {
    console.warn('Gagal memperbarui daftar produk setelah sinkronisasi Mekari.', refreshError);
    const currentProducts = getProductsFromCache();
    const baseProducts = Array.isArray(currentProducts) ? currentProducts : [];
    const mergedMap = new Map(baseProducts.map(product => [product.id, product]));
    updatedProducts.forEach(product => {
      if (product?.id) {
        mergedMap.set(product.id, product);
      }
    });
    newProducts.forEach(product => {
      if (product?.id) {
        mergedMap.set(product.id, product);
      }
    });
    setProductCache(Array.from(mergedMap.values()));
  }

  renderProducts(getCurrentProductFilterValue());

  if (integration) {
    try {
      syncedIntegration = await markMekariIntegrationSynced(integration, attemptIso);
    } catch (error) {
      console.warn('Gagal memperbarui status sinkronisasi Mekari.', error);
    }
  }

  const summaryParts = [];
  if (updatedSkuSet.size) {
    summaryParts.push(`Stok ${updatedSkuSet.size} SKU diperbarui.`);
  }
  if (newProducts.length) {
    summaryParts.push(`${newProducts.length} produk baru ditambahkan.`);
  }
  if (missingProductsCount > 0) {
    summaryParts.push(`${missingProductsCount} produk belum terdaftar di Mekari Jurnal.`);
  }
  if (!summaryParts.length) {
    summaryParts.push('Stok produk Mekari Jurnal sudah sesuai.');
  }

  const state = updateDailyInventorySyncState(previous => ({
    ...previous,
    lastStatus: 'success',
    lastError: null,
    lastSuccessAt: attemptIso
  }));

  return {
    success: true,
    summaryParts,
    integration: syncedIntegration,
    state,
    attempt,
    attemptIso,
    updatedSkuCount: updatedSkuSet.size,
    newProductsCount: newProducts.length
  };
}

function formatDailyAverageSalesValue(value) {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  if (value === 0) {
    return '0';
  }

  const rounded = Math.round(value * 100) / 100;
  const formatted = rounded.toFixed(2).replace(/\.0+$/, '').replace(/\.([0-9])0$/, '.$1');
  return formatted;
}

function buildWarehouseAverageMap(rows, days = DAILY_AVERAGE_WINDOW_DAYS) {
  const map = new Map();
  const windowDays = Math.max(1, Number.parseInt(days, 10) || DAILY_AVERAGE_WINDOW_DAYS);

  (Array.isArray(rows) ? rows : [])
    .filter(Boolean)
    .forEach(entry => {
      const sku = normalizeSku(entry?.productCode ?? entry?.product_code ?? entry?.sku);
      if (!sku) {
        return;
      }

      const qtyOut = Number(entry?.qtyOut ?? entry?.qty_out ?? entry?.qty);
      if (!Number.isFinite(qtyOut)) {
        return;
      }

      const previous = map.get(sku) || { totalOut: 0, average: 0 };
      const totalOut = previous.totalOut + qtyOut;
      map.set(sku, {
        totalOut,
        average: totalOut / windowDays
      });
    });

  return map;
}

function getWarehouseAverageSelection() {
  const range = getProfitLossDateRange({ periodKey: 'all' });
  return {
    key: 'custom',
    start: range.startDate ?? null,
    end: range.endDate ?? null
  };
}

async function ensureWarehouseAverageData({ force = false } = {}) {
  const selection = getWarehouseAverageSelection();
  const signature = getPeriodSelectionSignature(selection);

  if (!force && warehouseAverageCache && warehouseAverageCache.signature === signature) {
    return warehouseAverageCache;
  }

  if (!force && warehouseAveragePromise) {
    try {
      const cached = await warehouseAveragePromise;
      if (cached && cached.signature === signature) {
        return cached;
      }
    } catch (error) {
      console.warn('Gagal memuat cache rata-rata penjualan gudang.', error);
    }
  }

  warehouseAveragePromise = (async () => {
    let rows = [];

    if (
      warehouseMovementsState.lastSignature === signature &&
      Array.isArray(warehouseMovementsState.rows) &&
      warehouseMovementsState.rows.length
    ) {
      rows = warehouseMovementsState.rows;
    } else {
      const cachedSnapshot = getCachedWarehouseMovements(signature);
      if (cachedSnapshot && Array.isArray(cachedSnapshot.rows) && cachedSnapshot.rows.length) {
        rows = cachedSnapshot.rows;
      } else {
        try {
          const result = await syncWarehouseMovements({ selection, force: false, showToastOnError: false });
          if (result?.success && Array.isArray(result.data?.rows)) {
            rows = result.data.rows;
          }
        } catch (error) {
          console.warn('Gagal menyinkronkan pergerakan barang Mekari untuk estimasi stok.', error);
        }

        if (!rows.length && cachedSnapshot && Array.isArray(cachedSnapshot.rows)) {
          rows = cachedSnapshot.rows;
        }
      }
    }

    const map = buildWarehouseAverageMap(rows, DAILY_AVERAGE_WINDOW_DAYS);
    warehouseAverageCache = { signature, map, selection };
    return warehouseAverageCache;
  })();

  try {
    const resolved = await warehouseAveragePromise;
    return resolved;
  } finally {
    warehouseAveragePromise = null;
  }
}

function readDailyInventorySyncState() {
  try {
    const raw = localStorage.getItem(DAILY_INVENTORY_SYNC_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('Gagal membaca status sinkronisasi harian.', error);
    return {};
  }
}

function writeDailyInventorySyncState(state) {
  try {
    localStorage.setItem(DAILY_INVENTORY_SYNC_STORAGE_KEY, JSON.stringify(state ?? {}));
  } catch (error) {
    console.warn('Gagal menyimpan status sinkronisasi harian.', error);
  }
}

function updateDailyInventorySyncState(updater) {
  const previous = readDailyInventorySyncState();
  const next = typeof updater === 'function' ? updater(previous) : { ...previous, ...updater };
  writeDailyInventorySyncState(next);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      const event = new CustomEvent('entraverse:daily-sync-state', {
        detail: { state: next, previous }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.warn('Gagal mengirim event status sinkronisasi harian.', error);
    }
  }
  return next;
}

function getCurrentProductFilterValue() {
  const input = document.getElementById('search-input');
  return (input?.value ?? '').toString();
}

function collectExistingSkuDetails(products) {
  const map = new Map();
  const set = new Set();

  if (!Array.isArray(products)) {
    return { map, set };
  }

  products.forEach((product, productIndex) => {
    if (!product) return;
    const pricingRows = Array.isArray(product.variantPricing) ? product.variantPricing : [];
    pricingRows.forEach((row, variantIndex) => {
      if (!row) return;
      const normalized = normalizeSku(row.sellerSku ?? row.sku);
      if (!normalized) return;
      set.add(normalized);
      const existing = map.get(normalized);
      if (existing) {
        existing.push({ productIndex, variantIndex });
      } else {
        map.set(normalized, [{ productIndex, variantIndex }]);
      }
    });
  });

  return { map, set };
}

function getDailyInventorySyncThreshold(now = new Date()) {
  const minutesPerDay = 24 * 60;
  const millisPerMinute = 60 * 1000;
  const nowMinutes = Math.floor(now.getTime() / millisPerMinute);
  const wibMinutes = nowMinutes + WIB_TIMEZONE_OFFSET_MINUTES;
  const dayIndex = Math.floor(wibMinutes / minutesPerDay);
  const targetWibMinutes = dayIndex * minutesPerDay + DAILY_INVENTORY_SYNC_TRIGGER_MINUTE;
  const targetUtcMinutes = targetWibMinutes - WIB_TIMEZONE_OFFSET_MINUTES;
  return new Date(targetUtcMinutes * millisPerMinute);
}

function hasDailyInventorySyncSuccessForToday(now = new Date()) {
  const state = readDailyInventorySyncState();
  const { lastSuccessAt } = state;
  if (!lastSuccessAt) {
    return false;
  }

  const lastSuccess = new Date(lastSuccessAt);
  if (Number.isNaN(lastSuccess.getTime())) {
    return false;
  }

  const threshold = getDailyInventorySyncThreshold(now);
  return lastSuccess.getTime() >= threshold.getTime();
}

function getNextDailyInventorySyncTime(now = new Date()) {
  const minutesPerDay = 24 * 60;
  const millisPerMinute = 60 * 1000;
  const nowMinutes = Math.floor(now.getTime() / millisPerMinute);
  const wibMinutes = nowMinutes + WIB_TIMEZONE_OFFSET_MINUTES;
  const dayIndex = Math.floor(wibMinutes / minutesPerDay);
  let targetWibMinutes = dayIndex * minutesPerDay + DAILY_INVENTORY_SYNC_TRIGGER_MINUTE;

  if (wibMinutes >= targetWibMinutes) {
    targetWibMinutes += minutesPerDay;
  }

  const targetUtcMinutes = targetWibMinutes - WIB_TIMEZONE_OFFSET_MINUTES;
  return new Date(targetUtcMinutes * millisPerMinute);
}

async function runDailyInventorySync({ reason = 'scheduled', now = new Date() } = {}) {
  if (dailyInventorySyncPromise) {
    return dailyInventorySyncPromise;
  }

  dailyInventorySyncPromise = (async () => {
    const attemptTime = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
    return synchronizeMekariProducts({ attemptTime, reason });
  })();

  try {
    return await dailyInventorySyncPromise;
  } finally {
    dailyInventorySyncPromise = null;
  }
}

function scheduleDailyInventorySync() {
  if (dailyInventorySyncScheduled) {
    return;
  }

  if (!isSupabaseConfigured() || !canManageCatalog()) {
    return;
  }

  dailyInventorySyncScheduled = true;

  const scheduleNext = delayMs => {
    const safeDelay = Math.max(0, Number.isFinite(delayMs) ? delayMs : 0);
    if (dailyInventorySyncTimer) {
      clearTimeout(dailyInventorySyncTimer);
    }

    dailyInventorySyncTimer = setTimeout(() => {
      runDailyInventorySync({ reason: 'scheduled' })
        .catch(error => {
          console.error('Gagal menjalankan sinkronisasi harian terjadwal.', error);
          return { success: false, error };
        })
        .then(result => {
          const nextTarget = getNextDailyInventorySyncTime(new Date());
          let nextDelay = nextTarget.getTime() - Date.now();
          if (!result?.success) {
            nextDelay = Math.min(nextDelay, 60 * 60 * 1000);
          }
          scheduleNext(nextDelay);
        });
    }, safeDelay);
  };

  const now = new Date();
  if (!hasDailyInventorySyncSuccessForToday(now)) {
    runDailyInventorySync({ reason: 'initial', now })
      .catch(error => {
        console.error('Gagal menjalankan sinkronisasi harian awal.', error);
        return { success: false, error };
      })
      .then(result => {
        const nextTarget = getNextDailyInventorySyncTime(new Date());
        let delay = nextTarget.getTime() - Date.now();
        if (!result?.success) {
          delay = Math.min(delay, 60 * 60 * 1000);
        }
        scheduleNext(delay);
      });
  } else {
    const nextTarget = getNextDailyInventorySyncTime(now);
    const delay = Math.max(0, nextTarget.getTime() - now.getTime());
    scheduleNext(delay);
  }
}

const SALES_REPORT_SYNC_STATUS = new Set(['on-track', 'manual', 'scheduled']);

const REPORT_PERIOD_PRESETS = Object.freeze([
  {
    key: 'all',
    label: 'Semua periode',
    getRange: () => ({ start: null, end: null })
  },
  {
    key: 'today',
    label: 'Hari ini',
    getRange: referenceDate => {
      const date = referenceDate ? new Date(referenceDate) : new Date();
      if (Number.isNaN(date.getTime())) {
        return { start: null, end: null };
      }
      return {
        start: toDateOnlyString(date),
        end: toDateOnlyString(date)
      };
    }
  },
  {
    key: 'yesterday',
    label: 'Kemarin',
    getRange: referenceDate => {
      const date = referenceDate ? new Date(referenceDate) : new Date();
      if (Number.isNaN(date.getTime())) {
        return { start: null, end: null };
      }
      date.setDate(date.getDate() - 1);
      return {
        start: toDateOnlyString(date),
        end: toDateOnlyString(date)
      };
    }
  },
  {
    key: 'last-7-days',
    label: '7 hari terakhir',
    getRange: referenceDate => {
      const end = referenceDate ? new Date(referenceDate) : new Date();
      if (Number.isNaN(end.getTime())) {
        return { start: null, end: null };
      }
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return {
        start: toDateOnlyString(start),
        end: toDateOnlyString(end)
      };
    }
  },
  {
    key: 'last-30-days',
    label: '30 hari terakhir',
    getRange: referenceDate => {
      const end = referenceDate ? new Date(referenceDate) : new Date();
      if (Number.isNaN(end.getTime())) {
        return { start: null, end: null };
      }
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      return {
        start: toDateOnlyString(start),
        end: toDateOnlyString(end)
      };
    }
  },
  {
    key: 'this-month',
    label: 'Bulan ini',
    getRange: referenceDate => {
      const base = referenceDate ? new Date(referenceDate) : new Date();
      if (Number.isNaN(base.getTime())) {
        return { start: null, end: null };
      }
      const start = new Date(base.getFullYear(), base.getMonth(), 1);
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      return {
        start: toDateOnlyString(start),
        end: toDateOnlyString(end)
      };
    }
  },
  {
    key: 'last-month',
    label: 'Bulan lalu',
    getRange: referenceDate => {
      const base = referenceDate ? new Date(referenceDate) : new Date();
      if (Number.isNaN(base.getTime())) {
        return { start: null, end: null };
      }
      const start = new Date(base.getFullYear(), base.getMonth() - 1, 1);
      const end = new Date(base.getFullYear(), base.getMonth(), 0);
      return {
        start: toDateOnlyString(start),
        end: toDateOnlyString(end)
      };
    }
  }
]);

const LOCAL_STORAGE_KEYS = Object.freeze({
  shippingVendorsSnapshot: 'entraverse_shipping_vendors_snapshot',
  shippingVendorsLocal: 'entraverse_shipping_vendors_local'
});

function sanitizeShippingVendor(vendor, { localOnly = false } = {}) {
  const normalized = normalizeShippingVendor(vendor);
  if (!normalized) {
    return null;
  }

  const sanitized = { ...normalized };
  sanitized.id = sanitized.id || createUuid();
  sanitized.name = sanitized.name ?? '';
  sanitized.services = sanitized.services ?? '';
  sanitized.coverage = sanitized.coverage ?? '';
  sanitized.pic = sanitized.pic ?? '';
  sanitized.email = sanitized.email ?? '';
  sanitized.phone = sanitized.phone ?? '';
  sanitized.detailUrl = sanitized.detailUrl ?? '';
  sanitized.airRate = parseNumericValue(sanitized.airRate);
  sanitized.seaRate = parseNumericValue(sanitized.seaRate);
  sanitized.note = sanitized.note ?? '';

  const now = Date.now();
  sanitized.createdAt = typeof sanitized.createdAt === 'number' ? sanitized.createdAt : now;
  sanitized.updatedAt = typeof sanitized.updatedAt === 'number' ? sanitized.updatedAt : sanitized.createdAt;
  sanitized.localOnly = localOnly || Boolean(normalized.localOnly);

  return sanitized;
}

function mergeShippingVendorCollections(base = [], additions = []) {
  const map = new Map();

  const append = list => {
    list.forEach(item => {
      const sanitized = sanitizeShippingVendor(item, { localOnly: Boolean(item?.localOnly) });
      if (!sanitized) {
        return;
      }
      map.set(sanitized.id, sanitized);
    });
  };

  append(Array.isArray(base) ? base : []);
  append(Array.isArray(additions) ? additions : []);

  return Array.from(map.values());
}

function loadShippingVendorSnapshot() {
  if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
    return [];
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.shippingVendorsSnapshot);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(item => sanitizeShippingVendor(item, { localOnly: false }))
      .filter(Boolean);
  } catch (error) {
    console.error('Gagal memuat snapshot vendor pengiriman.', error);
    return [];
  }
}

function saveShippingVendorSnapshot(vendors) {
  if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') {
    return;
  }

  try {
    const sanitized = Array.isArray(vendors)
      ? vendors.map(vendor => sanitizeShippingVendor(vendor, { localOnly: false })).filter(Boolean)
      : [];

    if (!sanitized.length) {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.shippingVendorsSnapshot);
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEYS.shippingVendorsSnapshot, JSON.stringify(sanitized));
    }
  } catch (error) {
    console.error('Gagal menyimpan snapshot vendor pengiriman.', error);
  }
}

function loadLocalShippingVendors() {
  if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
    return [];
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.shippingVendorsLocal);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(item => sanitizeShippingVendor(item, { localOnly: true }))
      .filter(Boolean);
  } catch (error) {
    console.error('Gagal memuat vendor pengiriman lokal.', error);
    return [];
  }
}

function saveLocalShippingVendors(vendors) {
  if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') {
    return;
  }

  try {
    const sanitized = Array.isArray(vendors)
      ? vendors
          .map(vendor => sanitizeShippingVendor({ ...vendor, localOnly: true }, { localOnly: true }))
          .filter(Boolean)
      : [];

    if (!sanitized.length) {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.shippingVendorsLocal);
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEYS.shippingVendorsLocal, JSON.stringify(sanitized));
    }
  } catch (error) {
    console.error('Gagal menyimpan vendor pengiriman lokal.', error);
  }
}

const SUPABASE_TABLES = Object.freeze({
  users: 'users',
  products: 'products',
  categories: 'categories',
  exchangeRates: 'exchange_rates',
  shippingVendors: 'shipping_vendors',
  integrations: 'api_integrations'
});

const SUPABASE_STORAGE_BUCKETS = Object.freeze({
  integrationLogos: 'integration-logos'
});

const SUPABASE_UNSUPPORTED_COLUMNS = new Map();

function normalizeSupabaseIdentifier(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getUnsupportedSupabaseColumns(table) {
  const tableKey = normalizeSupabaseIdentifier(table);
  if (!tableKey) {
    return new Set();
  }

  if (!SUPABASE_UNSUPPORTED_COLUMNS.has(tableKey)) {
    SUPABASE_UNSUPPORTED_COLUMNS.set(tableKey, new Set());
  }

  return SUPABASE_UNSUPPORTED_COLUMNS.get(tableKey);
}

function sanitizeSupabaseRecord(table, record) {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const unsupported = getUnsupportedSupabaseColumns(table);
  if (!unsupported.size) {
    return { ...record };
  }

  const sanitized = {};
  Object.entries(record).forEach(([key, value]) => {
    if (!unsupported.has(normalizeSupabaseIdentifier(key))) {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

function sanitizeSupabasePayload(table, payload) {
  if (Array.isArray(payload)) {
    return payload.map(item => sanitizeSupabaseRecord(table, item));
  }

  if (payload && typeof payload === 'object') {
    return sanitizeSupabaseRecord(table, payload);
  }

  return payload;
}

function registerUnsupportedSupabaseColumn(table, column) {
  const tableKey = normalizeSupabaseIdentifier(table);
  const columnKey = normalizeSupabaseIdentifier(column);
  if (!tableKey || !columnKey) {
    return false;
  }

  const unsupported = getUnsupportedSupabaseColumns(tableKey);
  if (unsupported.has(columnKey)) {
    return false;
  }

  unsupported.add(columnKey);
  console.warn(
    `Kolom Supabase "${column}" tidak ditemukan pada tabel "${table}". Nilai kolom tersebut akan diabaikan saat sinkronisasi.`
  );
  return true;
}

function extractMissingSupabaseColumn(error) {
  if (!error) {
    return null;
  }

  const candidates = [error.message, error.details, error.hint];
  const regex = /column\s+"?([a-zA-Z0-9_]+)"?\s+of\s+relation\s+"?([a-zA-Z0-9_]+)"?\s+does\s+not\s+exist/i;

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue;
    }

    const match = candidate.match(regex);
    if (match) {
      return { column: match[1], table: match[2] };
    }
  }

  if (error.code === '42703') {
    const fallback = candidates.find(candidate => typeof candidate === 'string' && candidate.includes('column'));
    if (fallback) {
      const columnMatch = fallback.match(/"([a-zA-Z0-9_]+)"/);
      if (columnMatch) {
        return { column: columnMatch[1], table: error.table ?? '' };
      }
    }
  }

  return null;
}

async function executeSupabaseMutation({ client, table, method, payload, options = {}, transform }) {
  if (!client) {
    throw new Error('Supabase client tidak tersedia.');
  }

  const tableKey = table;
  if (!tableKey || typeof tableKey !== 'string') {
    throw new Error('Nama tabel Supabase tidak valid.');
  }

  const normalizedTable = normalizeSupabaseIdentifier(tableKey);
  if (typeof client.from(tableKey)?.[method] !== 'function') {
    throw new Error(`Metode Supabase ${method} tidak didukung untuk tabel ${tableKey}.`);
  }

  let attemptPayload = sanitizeSupabasePayload(tableKey, payload);

  while (true) {
    let builder = client.from(tableKey)[method](attemptPayload, options);
    if (typeof transform === 'function') {
      builder = transform(builder);
    }

    const { data, error } = await builder;
    if (!error) {
      return { data };
    }

    const missing = extractMissingSupabaseColumn(error);
    if (missing) {
      const missingTable = normalizeSupabaseIdentifier(missing.table);
      if (!missingTable || missingTable === normalizedTable) {
        const registered = registerUnsupportedSupabaseColumn(tableKey, missing.column);
        if (registered) {
          attemptPayload = sanitizeSupabasePayload(tableKey, attemptPayload);
          continue;
        }
      }
    }

    throw error;
  }
}

let supabaseClient = null;
let supabaseInitializationPromise = null;
let supabaseInitializationError = null;

const REMOTE_CACHE_STORAGE_PREFIX = 'entraverse:remote-cache:';
const REMOTE_CACHE_STORAGE_VERSION = 1;
const PERSISTED_REMOTE_CACHE_KEYS = new Set([
  STORAGE_KEYS.products,
  STORAGE_KEYS.categories,
  STORAGE_KEYS.exchangeRates,
  STORAGE_KEYS.shippingVendors,
  STORAGE_KEYS.integrations
]);

function isTableMissingError(error) {
  if (!error) {
    return false;
  }

  const code = error.code || error?.cause?.code;
  if (code === '42P01' || code === 'PGRST301') {
    return true;
  }

  const details = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!details) {
    return false;
  }

  return (
    details.includes('does not exist') ||
    details.includes('not exist') ||
    details.includes('not found') ||
    details.includes('missing')
  );
}

function isPermissionDeniedError(error) {
  if (!error) {
    return false;
  }

  const code = error.code || error?.cause?.code;
  if (code === '42501' || code === 'PGRST302' || code === 'PGRST403') {
    return true;
  }

  const details = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!details) {
    return false;
  }

  return (
    details.includes('permission denied') ||
    details.includes('row-level security') ||
    details.includes('not authorised') ||
    details.includes('not authorized') ||
    details.includes('access denied')
  );
}

const remoteCache = {
  [STORAGE_KEYS.users]: [],
  [STORAGE_KEYS.products]: [],
  [STORAGE_KEYS.categories]: [],
  [STORAGE_KEYS.exchangeRates]: [],
  [STORAGE_KEYS.shippingVendors]: [],
  [STORAGE_KEYS.integrations]: []
};

const SUPABASE_SEED_STATE_STORAGE_KEY = 'entraverse_supabase_seed_state';
const SUPABASE_SEED_STATE_TTL = 5 * 60 * 1000;

let seedingPromise = null;

function readSupabaseSeedState() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SUPABASE_SEED_STATE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const timestamp = Number(parsed?.timestamp);
    if (!Number.isFinite(timestamp)) {
      return null;
    }

    return {
      timestamp,
      success: Boolean(parsed?.success)
    };
  } catch (error) {
    console.warn('Gagal membaca status seeding Supabase dari localStorage.', error);
    return null;
  }
}

function writeSupabaseSeedState(state) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const payload = {
      timestamp: Number.isFinite(state?.timestamp) ? state.timestamp : Date.now(),
      success: Boolean(state?.success)
    };
    window.localStorage.setItem(SUPABASE_SEED_STATE_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Gagal menyimpan status seeding Supabase ke localStorage.', error);
  }
}

function clearSupabaseSeedState() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(SUPABASE_SEED_STATE_STORAGE_KEY);
  } catch (error) {
    console.warn('Gagal menghapus status seeding Supabase dari localStorage.', error);
  }
}

function isSupabaseSeedFresh() {
  const state = readSupabaseSeedState();
  if (!state || !state.success) {
    return false;
  }

  return Date.now() - state.timestamp < SUPABASE_SEED_STATE_TTL;
}

function getRemoteCacheStorageKey(key) {
  return `${REMOTE_CACHE_STORAGE_PREFIX}${key}`;
}

function readRemoteCacheFromStorage(key) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const storageKey = getRemoteCacheStorageKey(key);
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const data = Array.isArray(parsed?.data)
      ? parsed.data
      : Array.isArray(parsed)
        ? parsed
        : [];

    if (!Array.isArray(data) || !data.length) {
      return [];
    }

    return data.map(item => clone(item));
  } catch (error) {
    console.warn('Gagal membaca cache tersinkronisasi dari localStorage.', error);
    return null;
  }
}

function persistRemoteCache(key, value) {
  if (!PERSISTED_REMOTE_CACHE_KEYS.has(key)) {
    return;
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const payload = {
      version: REMOTE_CACHE_STORAGE_VERSION,
      updatedAt: Date.now(),
      data: Array.isArray(value) ? value.map(item => clone(item)) : []
    };
    window.localStorage.setItem(getRemoteCacheStorageKey(key), JSON.stringify(payload));
  } catch (error) {
    console.warn('Gagal menyimpan cache tersinkronisasi ke localStorage.', error);
  }
}

function loadPersistedRemoteCache() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  PERSISTED_REMOTE_CACHE_KEYS.forEach(key => {
    const stored = readRemoteCacheFromStorage(key);
    if (!stored) {
      return;
    }

    switch (key) {
      case STORAGE_KEYS.categories:
        setCategoryCache(stored);
        break;
      case STORAGE_KEYS.products:
        setProductCache(stored);
        break;
      case STORAGE_KEYS.exchangeRates:
        setExchangeRateCache(stored);
        break;
      case STORAGE_KEYS.shippingVendors:
        setShippingVendorCache(stored);
        break;
      case STORAGE_KEYS.integrations:
        setIntegrationCache(stored);
        break;
      default:
        setRemoteCache(key, Array.isArray(stored) ? stored : []);
        break;
    }
  });
}

function getSupabaseConfig() {
  const config = window.entraverseConfig?.supabase ?? {};
  const url = typeof config.url === 'string' ? config.url.trim() : '';
  const anonKey = typeof config.anonKey === 'string' ? config.anonKey.trim() : '';

  if (!url || !anonKey || url.includes('your-project.supabase.co') || anonKey === 'public-anon-key') {
    return null;
  }

  return { url, anonKey };
}

function getSupabaseInitializationError() {
  return supabaseInitializationError;
}

function isSupabaseConfigured() {
  return Boolean(getSupabaseConfig());
}

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Library Supabase belum dimuat.');
  }

  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Konfigurasi Supabase belum diatur.');
  }

  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  return supabaseClient;
}

async function ensureSupabase() {
  if (supabaseInitializationPromise) {
    return supabaseInitializationPromise;
  }

  supabaseInitializationPromise = (async () => {
    try {
      return getSupabaseClient();
    } catch (error) {
      supabaseInitializationError = error;
      throw error;
    }
  })();

  return supabaseInitializationPromise;
}

function getSupabaseStoragePublicBaseUrl() {
  const config = getSupabaseConfig();
  if (!config?.url) {
    return '';
  }

  return `${config.url.replace(/\/+$/, '')}/storage/v1/object/public`;
}

function buildSupabasePublicUrl(bucket, path) {
  if (!bucket || !path) {
    return '';
  }

  const baseUrl = getSupabaseStoragePublicBaseUrl();
  if (!baseUrl) {
    return '';
  }

  const sanitizedPath = path.toString().replace(/^\/+/, '').replace(/\\+/g, '/');
  return `${baseUrl}/${bucket}/${sanitizedPath}`;
}

async function uploadIntegrationLogoFile(file, { existingPath } = {}) {
  if (!file) {
    throw new Error('File logo tidak ditemukan.');
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  await ensureSupabase();
  const client = getSupabaseClient();
  const bucket = SUPABASE_STORAGE_BUCKETS.integrationLogos;
  const storage = client.storage.from(bucket);

  const originalName = file.name ? file.name.toString() : '';
  const extensionMatch = originalName.match(/\.([a-z0-9]+)$/i);
  const extension = extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : '';
  const fileName = `${createUuid()}-${Date.now()}${extension}`;
  const path = `integrations/${fileName}`;

  const { data, error } = await storage.upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'application/octet-stream'
  });

  if (error) {
    throw error;
  }

  if (existingPath && existingPath !== data.path) {
    await storage.remove([existingPath]).catch(() => {});
  }

  const publicUrl = buildSupabasePublicUrl(bucket, data.path);
  return { path: data.path, publicUrl };
}

async function removeIntegrationLogoFromStorage(path) {
  if (!path || !isSupabaseConfigured()) {
    return;
  }

  await ensureSupabase();
  const client = getSupabaseClient();
  const bucket = SUPABASE_STORAGE_BUCKETS.integrationLogos;
  await client.storage.from(bucket).remove([path]).catch(error => {
    console.error('Gagal menghapus logo integrasi dari Supabase Storage.', error);
  });
}

function toIsoTimestamp(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function setRemoteCache(key, value) {
  if (!Object.prototype.hasOwnProperty.call(remoteCache, key)) {
    return;
  }

  let normalized = [];
  if (Array.isArray(value)) {
    normalized = value.map(item => clone(item));
  }

  remoteCache[key] = normalized;
  persistRemoteCache(key, normalized);
}

function getRemoteCache(key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(remoteCache, key)) {
    return clone(fallback);
  }
  const cached = remoteCache[key];

  if (PERSISTED_REMOTE_CACHE_KEYS.has(key) && (!Array.isArray(cached) || !cached.length)) {
    const stored = readRemoteCacheFromStorage(key);
    if (Array.isArray(stored)) {
      const normalized = stored.map(item => clone(item));
      remoteCache[key] = normalized;
      return clone(normalized);
    }
  }

  return clone(cached);
}

function mapSupabaseCategory(record) {
  if (!record) {
    return null;
  }

  const fees = typeof record.fees === 'object' && record.fees ? record.fees : {};
  const margin = typeof record.margin === 'object' && record.margin ? record.margin : {};
  const marginNote =
    margin.note ?? margin.margin_note ?? (typeof record.margin_note === 'string' ? record.margin_note : '');

  return {
    id: record.id,
    name: record.name ?? '',
    note: record.note ?? '',
    fees: {
      marketplace: fees.marketplace ?? '',
      shopee: fees.shopee ?? '',
      entraverse: fees.entraverse ?? ''
    },
    margin: {
      value: margin.value ?? '',
      note: marginNote ?? ''
    },
    createdAt: record.created_at ? new Date(record.created_at).getTime() : Date.now(),
    updatedAt: record.updated_at ? new Date(record.updated_at).getTime() : null
  };
}

function mapCategoryToRecord(category) {
  const fees = category.fees ?? {};
  const margin = category.margin ?? {};

  return {
    id: category.id,
    name: category.name,
    note: category.note || null,
    fees: {
      marketplace: fees.marketplace ?? '',
      shopee: fees.shopee ?? '',
      entraverse: fees.entraverse ?? ''
    },
    margin: {
      value: margin.value ?? '',
      note: margin.note ?? ''
    },
    created_at: toIsoTimestamp(category.createdAt) ?? new Date().toISOString(),
    updated_at: toIsoTimestamp(category.updatedAt)
  };
}

function mapSupabaseExchangeRate(record) {
  if (!record) {
    return null;
  }

  const rawCurrency =
    record.currency ?? record.currency_code ?? record.code ?? record.kurs ?? '';
  const currency = rawCurrency.toString().trim().toUpperCase();
  if (!currency) {
    return null;
  }

  const rateValue = parseNumericValue(
    record.rate ?? record.to_idr ?? record.value ?? record.exchange_rate ?? record.mid_rate
  );

  if (!Number.isFinite(rateValue) || rateValue <= 0) {
    return null;
  }

  const rawLabel = record.label ?? record.name ?? record.description ?? '';
  const label = rawLabel ? rawLabel.toString().trim() : currency;

  return {
    id: record.id ?? null,
    currency,
    label: label || currency,
    rate: Number(rateValue)
  };
}

function normalizeExchangeRates(rates) {
  if (!Array.isArray(rates)) {
    return [];
  }

  return rates
    .map(entry => {
      if (!entry) return null;
      const currency = (entry.currency ?? '').toString().trim().toUpperCase();
      if (!currency) return null;
      const rateValue = parseNumericValue(entry.rate);
      if (!Number.isFinite(rateValue) || rateValue <= 0) return null;
      const label = (entry.label ?? '').toString().trim() || currency;
      return {
        id: entry.id ?? null,
        currency,
        label,
        rate: Number(rateValue)
      };
    })
    .filter(Boolean);
}

function setExchangeRateCache(rates) {
  const normalized = normalizeExchangeRates(rates);
  if (!normalized.length) {
    setRemoteCache(STORAGE_KEYS.exchangeRates, []);
  } else {
    setRemoteCache(STORAGE_KEYS.exchangeRates, normalized);
  }

  document.dispatchEvent(
    new CustomEvent('exchangeRates:changed', {
      detail: { exchangeRates: getExchangeRates() }
    })
  );
}

function getExchangeRatesFromCache() {
  return getRemoteCache(STORAGE_KEYS.exchangeRates, []);
}

function getExchangeRates() {
  const cached = getExchangeRatesFromCache();
  if (Array.isArray(cached) && cached.length) {
    return cached;
  }
  return normalizeExchangeRates(DEFAULT_EXCHANGE_RATES);
}

function findExchangeRateByCurrency(currency) {
  if (!currency) {
    return null;
  }

  const normalized = currency.toString().trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  return getExchangeRates().find(rate => rate.currency === normalized) ?? null;
}

async function refreshExchangeRatesFromSupabase() {
  const config = getSupabaseConfig();
  if (!config) {
    const fallback = normalizeExchangeRates(DEFAULT_EXCHANGE_RATES);
    setExchangeRateCache(fallback);
    return fallback;
  }

  await ensureSupabase();
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from(SUPABASE_TABLES.exchangeRates)
      .select('*')
      .order('currency', { ascending: true });

    if (error) {
      throw error;
    }

    const mapped = normalizeExchangeRates((data ?? []).map(mapSupabaseExchangeRate));

    if (!mapped.length) {
      const fallback = normalizeExchangeRates(DEFAULT_EXCHANGE_RATES);
      setExchangeRateCache(fallback);
      return fallback;
    }

    setExchangeRateCache(mapped);
    return mapped;
  } catch (error) {
    if (error?.code === '42P01') {
      console.warn('Tabel exchange_rates belum tersedia di Supabase.', error);
    } else {
      console.error('Gagal memuat data kurs dari Supabase.', error);
    }
    const fallback = normalizeExchangeRates(DEFAULT_EXCHANGE_RATES);
    setExchangeRateCache(fallback);
    return fallback;
  }
}

function setCategoryCache(categories) {
  setRemoteCache(STORAGE_KEYS.categories, Array.isArray(categories) ? categories : []);
  document.dispatchEvent(new CustomEvent('categories:changed', {
    detail: { categories: getCategories() }
  }));
}

function getCategoriesFromCache() {
  return getRemoteCache(STORAGE_KEYS.categories, []);
}

async function refreshCategoriesFromSupabase() {
  await ensureSupabase();
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(SUPABASE_TABLES.categories)
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const categories = (data ?? []).map(mapSupabaseCategory).filter(Boolean);
  setCategoryCache(categories);
  return categories;
}

async function deleteCategoryFromSupabase(id) {
  await ensureSupabase();
  const client = getSupabaseClient();
  const { error } = await client
    .from(SUPABASE_TABLES.categories)
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

async function upsertCategoryToSupabase(category) {
  await ensureSupabase();
  const client = getSupabaseClient();
  const payload = mapCategoryToRecord(category);
  if (!payload.id) {
    payload.id = crypto.randomUUID();
  }
  if (!payload.updated_at) {
    payload.updated_at = new Date().toISOString();
  }

  await executeSupabaseMutation({
    client,
    table: SUPABASE_TABLES.categories,
    method: 'upsert',
    payload,
    options: { onConflict: 'id' },
    transform: builder => builder.select()
  });
}

function mapSupabaseProduct(record) {
  if (!record) {
    return null;
  }

  const photos = Array.isArray(record.photos) ? record.photos.filter(Boolean) : [];
  const variants = Array.isArray(record.variants) ? record.variants : [];
  const variantPricing = Array.isArray(record.variant_pricing) ? record.variant_pricing : [];

  return {
    id: record.id,
    name: record.name ?? '',
    category: record.category ?? '',
    brand: record.brand ?? '',
    description: record.description ?? '',
    tradeIn: Boolean(record.trade_in),
    inventory: record.inventory ?? null,
    photos,
    variants,
    variantPricing,
    mekariStatus: normalizeMekariStatus(
      typeof record.mekari_status === 'string'
        ? (() => {
            try {
              return JSON.parse(record.mekari_status);
            } catch (error) {
              return null;
            }
          })()
        : record.mekari_status ?? record.mekariStatus ?? null
    ),
    createdAt: record.created_at ? new Date(record.created_at).getTime() : Date.now(),
    updatedAt: record.updated_at ? new Date(record.updated_at).getTime() : null
  };
}

function mapProductToRecord(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand || null,
    description: product.description || null,
    trade_in: Boolean(product.tradeIn),
    inventory: product.inventory ?? null,
    photos: Array.isArray(product.photos) ? product.photos : [],
    variants: Array.isArray(product.variants) ? product.variants : [],
    variant_pricing: Array.isArray(product.variantPricing) ? product.variantPricing : [],
    mekari_status: product.mekariStatus ? normalizeMekariStatus(product.mekariStatus) : null,
    created_at: toIsoTimestamp(product.createdAt) ?? new Date().toISOString(),
    updated_at: toIsoTimestamp(product.updatedAt)
  };
}

function setProductCache(products) {
  setRemoteCache(STORAGE_KEYS.products, Array.isArray(products) ? products : []);
}

function getProductsFromCache() {
  return getRemoteCache(STORAGE_KEYS.products, []);
}

function mergeProductsIntoCache(products) {
  const items = Array.isArray(products) ? products.filter(Boolean) : [];
  if (!items.length) {
    return;
  }

  const existing = Array.isArray(getProductsFromCache()) ? getProductsFromCache() : [];
  const mergedMap = new Map(existing.map(product => [product?.id, product]).filter(([id]) => Boolean(id)));

  items.forEach(product => {
    if (product && product.id) {
      mergedMap.set(product.id, product);
    }
  });

  setProductCache(Array.from(mergedMap.values()));
}

async function refreshProductsFromSupabase() {
  await ensureSupabase();
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(SUPABASE_TABLES.products)
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const products = (data ?? []).map(mapSupabaseProduct).filter(Boolean);
  setProductCache(products);
  return products;
}

async function deleteProductFromSupabase(id) {
  await ensureSupabase();
  const client = getSupabaseClient();
  const { error } = await client
    .from(SUPABASE_TABLES.products)
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

async function upsertProductToSupabase(product) {
  await ensureSupabase();
  const client = getSupabaseClient();
  const payload = mapProductToRecord(product);
  if (!payload.id) {
    payload.id = crypto.randomUUID();
  }
  if (!payload.updated_at) {
    payload.updated_at = new Date().toISOString();
  }

  await executeSupabaseMutation({
    client,
    table: SUPABASE_TABLES.products,
    method: 'upsert',
    payload,
    options: { onConflict: 'id' },
    transform: builder => builder.select()
  });
}

async function bulkUpsertProductsToSupabase(products, { chunkSize = 50 } = {}) {
  const items = Array.isArray(products) ? products.filter(Boolean) : [];
  if (!items.length) {
    return;
  }

  await ensureSupabase();
  const client = getSupabaseClient();
  const normalized = items
    .map(product => {
      const record = mapProductToRecord(product);
      if (!record) {
        return null;
      }
      const payload = { ...record };
      if (!payload.id) {
        payload.id = crypto.randomUUID();
      }
      if (!payload.updated_at) {
        payload.updated_at = new Date().toISOString();
      }
      return payload;
    })
    .filter(Boolean);

  if (!normalized.length) {
    return;
  }

  const safeChunkSize = Math.max(1, Number.isFinite(chunkSize) ? Math.floor(chunkSize) : 50);

  for (let index = 0; index < normalized.length; index += safeChunkSize) {
    const slice = normalized.slice(index, index + safeChunkSize);
    await executeSupabaseMutation({
      client,
      table: SUPABASE_TABLES.products,
      method: 'upsert',
      payload: slice,
      options: { onConflict: 'id' },
      transform: builder => builder.select()
    });
  }
}

function mapSupabaseShippingVendor(record) {
  if (!record) {
    return null;
  }

  const airRate = parseNumericValue(record.air_rate);
  const seaRate = parseNumericValue(record.sea_rate);

  return normalizeShippingVendor({
    id: record.id,
    name: record.name ?? '',
    services: record.services ?? '',
    coverage: record.coverage ?? '',
    pic: record.pic ?? '',
    email: record.email ?? '',
    phone: record.phone ?? '',
    detailUrl: record.detail_url ?? '',
    airRate: airRate,
    seaRate: seaRate,
    note: record.note ?? '',
    createdAt: record.created_at ? new Date(record.created_at).getTime() : Date.now(),
    updatedAt: record.updated_at ? new Date(record.updated_at).getTime() : null
  });
}

function mapShippingVendorToRecord(vendor) {
  const normalizedVendor = normalizeShippingVendor(vendor);
  if (!normalizedVendor) {
    return null;
  }

  return {
    id: normalizedVendor.id,
    name: normalizedVendor.name,
    services: normalizedVendor.services || null,
    coverage: normalizedVendor.coverage || null,
    pic: normalizedVendor.pic || null,
    email: normalizedVendor.email || null,
    phone: normalizedVendor.phone || null,
    detail_url: normalizedVendor.detailUrl || null,
    air_rate: parseNumericValue(normalizedVendor.airRate),
    sea_rate: parseNumericValue(normalizedVendor.seaRate),
    note: normalizedVendor.note || null,
    created_at: toIsoTimestamp(normalizedVendor.createdAt) ?? new Date().toISOString(),
    updated_at: toIsoTimestamp(normalizedVendor.updatedAt)
  };
}

function normalizeShippingVendor(vendor) {
  if (!vendor || typeof vendor !== 'object') {
    return null;
  }

  const normalized = { ...vendor };

  return normalized;
}

function setShippingVendorCache(vendors) {
  const normalized = Array.isArray(vendors)
    ? vendors.map(vendor => normalizeShippingVendor(vendor)).filter(Boolean)
    : [];
  setRemoteCache(STORAGE_KEYS.shippingVendors, normalized);
}

function getShippingVendorsFromCache() {
  const cached = getRemoteCache(STORAGE_KEYS.shippingVendors, []);
  if (!Array.isArray(cached) || !cached.length) {
    const snapshot = loadShippingVendorSnapshot();
    const localOnly = loadLocalShippingVendors();

    const base = snapshot.length ? snapshot.map(vendor => ({ ...vendor })) : [];
    const merged = mergeShippingVendorCollections(base, localOnly);
    setRemoteCache(STORAGE_KEYS.shippingVendors, merged);
    return merged;
  }
  return cached;
}

async function refreshShippingVendorsFromSupabase() {
  await ensureSupabase();
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(SUPABASE_TABLES.shippingVendors)
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  const vendors = (data ?? []).map(mapSupabaseShippingVendor).filter(Boolean);
  setShippingVendorCache(vendors);
  saveShippingVendorSnapshot(vendors);
  return vendors;
}

async function deleteShippingVendorFromSupabase(id) {
  if (!id) {
    throw new Error('ID vendor pengiriman wajib diisi.');
  }

  await ensureSupabase();
  const client = getSupabaseClient();
  const { error } = await client
    .from(SUPABASE_TABLES.shippingVendors)
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

async function upsertShippingVendorToSupabase(vendor) {
  await ensureSupabase();
  const client = getSupabaseClient();
  const payload = mapShippingVendorToRecord(vendor);
  if (!payload) {
    throw new Error('Data vendor pengiriman tidak valid.');
  }

  const now = new Date().toISOString();
  payload.id = payload.id || createUuid();
  payload.created_at = payload.created_at ?? now;
  payload.updated_at = payload.updated_at ?? now;

  const { data } = await executeSupabaseMutation({
    client,
    table: SUPABASE_TABLES.shippingVendors,
    method: 'upsert',
    payload,
    options: { onConflict: 'id' },
    transform: builder => builder.select().maybeSingle()
  });

  return mapSupabaseShippingVendor(data ?? payload);
}

function sanitizeSessionUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name ?? '',
    company: user.company ?? '',
    email: user.email ?? ''
  };
}

function mapSupabaseUser(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    name: record.name ?? '',
    company: record.company ?? '',
    email: record.email ?? '',
    passwordHash: record.password_hash ?? '',
    createdAt: record.created_at ? new Date(record.created_at).getTime() : Date.now(),
    updatedAt: record.updated_at ? new Date(record.updated_at).getTime() : null
  };
}

function mapUserToRecord(user) {
  return {
    id: user.id,
    name: user.name,
    company: user.company,
    email: user.email,
    password_hash: user.passwordHash,
    created_at: toIsoTimestamp(user.createdAt) ?? new Date().toISOString(),
    updated_at: toIsoTimestamp(user.updatedAt)
  };
}

async function fetchUserByEmail(email) {
  await ensureSupabase();
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(SUPABASE_TABLES.users)
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116' || error.code === 'PGRST103') {
      return null;
    }
    if (error.details?.includes('No rows found')) {
      return null;
    }
    throw error;
  }

  return mapSupabaseUser(data);
}

async function fetchUserById(id) {
  await ensureSupabase();
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(SUPABASE_TABLES.users)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116' || error.code === 'PGRST103') {
      return null;
    }
    if (error.details?.includes('No rows found')) {
      return null;
    }
    throw error;
  }

  return mapSupabaseUser(data);
}

async function insertUserToSupabase(user) {
  await ensureSupabase();
  const client = getSupabaseClient();
  const payload = mapUserToRecord(user);
  const { data } = await executeSupabaseMutation({
    client,
    table: SUPABASE_TABLES.users,
    method: 'insert',
    payload,
    transform: builder => builder.select().maybeSingle()
  });

  return mapSupabaseUser(data ?? payload);
}

async function ensureSeeded() {
  if (isSupabaseSeedFresh()) {
    return;
  }

  if (!seedingPromise) {
    const task = (async () => {
      try {
        await ensureSupabase();
      } catch (error) {
        clearSupabaseSeedState();
        throw error;
      }

      const client = getSupabaseClient();

      let categoriesAvailable = true;
      try {
        const { count, error } = await client
          .from(SUPABASE_TABLES.categories)
          .select('id', { count: 'exact', head: true });

        if (error) {
          throw error;
        }

        if (!count) {
          const now = new Date().toISOString();
          const payload = DEFAULT_CATEGORIES.map(category => {
            const mapped = mapCategoryToRecord({
              ...category,
              createdAt: now,
              updatedAt: now
            });
            mapped.created_at = now;
            mapped.updated_at = now;
            return mapped;
          });

          await executeSupabaseMutation({
            client,
            table: SUPABASE_TABLES.categories,
            method: 'insert',
            payload
          });
        }
      } catch (error) {
        if (isTableMissingError(error) || isPermissionDeniedError(error)) {
          categoriesAvailable = false;
          console.warn('Tabel kategori tidak tersedia atau akses ditolak. Melewati seeding kategori.', error);
        } else {
          clearSupabaseSeedState();
          throw error;
        }
      }

      let productsAvailable = true;
      try {
        const { count, error } = await client
          .from(SUPABASE_TABLES.products)
          .select('id', { count: 'exact', head: true });

        if (error) {
          throw error;
        }

        if (!count) {
          const now = new Date().toISOString();
          const payload = DEFAULT_PRODUCTS.map(product => {
            const mapped = mapProductToRecord({
              ...product,
              createdAt: now,
              updatedAt: now
            });
            mapped.created_at = now;
            mapped.updated_at = now;
            return mapped;
          });

          await executeSupabaseMutation({
            client,
            table: SUPABASE_TABLES.products,
            method: 'insert',
            payload
          });
        }
      } catch (error) {
        if (isTableMissingError(error) || isPermissionDeniedError(error)) {
          productsAvailable = false;
          console.warn('Tabel produk tidak tersedia atau akses ditolak. Melewati seeding produk.', error);
        } else {
          clearSupabaseSeedState();
          throw error;
        }
      }

      let exchangeRatesAvailable = true;
      try {
        const { count, error } = await client
          .from(SUPABASE_TABLES.exchangeRates)
          .select('id', { count: 'exact', head: true });

        if (error) {
          throw error;
        }

        if (!count) {
          const now = new Date().toISOString();
          const payload = DEFAULT_EXCHANGE_RATES.map(rate => {
            if (!rate) {
              return null;
            }

            const { id: _ignoredId, currency, label, rate: value } = rate;
            return {
              currency,
              label,
              rate: value,
              created_at: now,
              updated_at: now
            };
          }).filter(Boolean);

          await executeSupabaseMutation({
            client,
            table: SUPABASE_TABLES.exchangeRates,
            method: 'insert',
            payload
          });
        }
      } catch (error) {
        if (isTableMissingError(error) || isPermissionDeniedError(error)) {
          exchangeRatesAvailable = false;
          console.warn('Tabel kurs tidak tersedia atau akses ditolak. Melewati seeding kurs.', error);
        } else {
          clearSupabaseSeedState();
          throw error;
        }
      }

      let shippingVendorsAvailable = true;
      try {
        const { count, error } = await client
          .from(SUPABASE_TABLES.shippingVendors)
          .select('id', { count: 'exact', head: true });

        if (error) {
          throw error;
        }

        if (!count) {
          const now = new Date().toISOString();
          const payload = DEFAULT_SHIPPING_VENDORS.map(vendor => {
            const mapped = mapShippingVendorToRecord({
              ...vendor,
              createdAt: now,
              updatedAt: now
            });
            if (!mapped) {
              return null;
            }
            mapped.created_at = now;
            mapped.updated_at = now;
            return mapped;
          }).filter(Boolean);

          await executeSupabaseMutation({
            client,
            table: SUPABASE_TABLES.shippingVendors,
            method: 'insert',
            payload
          });
        }
      } catch (error) {
        if (isTableMissingError(error) || isPermissionDeniedError(error)) {
          shippingVendorsAvailable = false;
          console.warn('Tabel vendor pengiriman tidak tersedia atau akses ditolak. Melewati seeding vendor pengiriman.', error);
        } else {
          clearSupabaseSeedState();
          throw error;
        }
      }

      let integrationsAvailable = true;
      try {
        const { count, error } = await client
          .from(SUPABASE_TABLES.integrations)
          .select('id', { count: 'exact', head: true });

        if (error) {
          throw error;
        }

        if (!count) {
          const now = new Date().toISOString();
          const payload = DEFAULT_API_INTEGRATIONS.map(integration => {
            const mapped = mapIntegrationToRecord({
              ...integration,
              createdAt: now,
              updatedAt: now
            });
            if (!mapped) {
              return null;
            }
            mapped.created_at = mapped.created_at ?? now;
            mapped.updated_at = mapped.updated_at ?? now;
            return mapped;
          }).filter(Boolean);

          await executeSupabaseMutation({
            client,
            table: SUPABASE_TABLES.integrations,
            method: 'insert',
            payload
          });
        }
      } catch (error) {
        if (isTableMissingError(error) || isPermissionDeniedError(error)) {
          integrationsAvailable = false;
          console.warn('Tabel integrasi API tidak tersedia atau akses ditolak. Melewati seeding integrasi.', error);
        } else {
          clearSupabaseSeedState();
          throw error;
        }
      }

      if (categoriesAvailable) {
        try {
          await refreshCategoriesFromSupabase();
        } catch (error) {
          if (isTableMissingError(error) || isPermissionDeniedError(error)) {
            categoriesAvailable = false;
            console.warn('Tabel kategori tidak tersedia atau akses ditolak saat refresh.', error);
          } else {
            clearSupabaseSeedState();
            throw error;
          }
        }
      }

      if (productsAvailable) {
        try {
          await refreshProductsFromSupabase();
        } catch (error) {
          if (isTableMissingError(error) || isPermissionDeniedError(error)) {
            productsAvailable = false;
            console.warn('Tabel produk tidak tersedia atau akses ditolak saat refresh.', error);
          } else {
            clearSupabaseSeedState();
            throw error;
          }
        }
      }

      if (exchangeRatesAvailable) {
        try {
          await refreshExchangeRatesFromSupabase();
        } catch (error) {
          if (isTableMissingError(error) || isPermissionDeniedError(error)) {
            exchangeRatesAvailable = false;
            console.warn('Tabel kurs tidak tersedia atau akses ditolak saat refresh.', error);
          } else {
            clearSupabaseSeedState();
            throw error;
          }
        }
      }

      if (shippingVendorsAvailable) {
        try {
          await refreshShippingVendorsFromSupabase();
        } catch (error) {
          if (isTableMissingError(error) || isPermissionDeniedError(error)) {
            shippingVendorsAvailable = false;
            console.warn('Tabel vendor pengiriman tidak tersedia atau akses ditolak saat refresh.', error);
          } else {
            clearSupabaseSeedState();
            throw error;
          }
        }
      }

      if (integrationsAvailable) {
        try {
          await refreshIntegrationsFromSupabase();
        } catch (error) {
          if (isTableMissingError(error) || isPermissionDeniedError(error)) {
            integrationsAvailable = false;
            console.warn('Tabel integrasi API tidak tersedia atau akses ditolak saat refresh.', error);
          } else {
            clearSupabaseSeedState();
            throw error;
          }
        }
      }

      writeSupabaseSeedState({ timestamp: Date.now(), success: true });
    })();

    seedingPromise = task
      .catch(error => {
        console.error('Gagal melakukan seeding awal Supabase.', error);
        throw error;
      });

    task.finally(() => {
      if (seedingPromise === task) {
        seedingPromise = null;
      }
    });
  }

  return seedingPromise;
}

async function hashPassword(password) {
  if (typeof password !== 'string') {
    return '';
  }

  try {
    if (typeof crypto?.subtle?.digest === 'function' && typeof TextEncoder === 'function') {
      const encoder = new TextEncoder();
      const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
      return Array.from(new Uint8Array(buffer))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch (error) {
    console.warn('Gagal melakukan hashing password, menggunakan fallback.', error);
  }

  return password;
}

const BANK_INDONESIA_SOURCE_TYPES = Object.freeze({
  JSON: 'json',
  HTML: 'html',
  EXCEL: 'excel'
});

const BANK_INDONESIA_EXCHANGE_SOURCES = Object.freeze([
  {
    type: BANK_INDONESIA_SOURCE_TYPES.EXCEL,
    url: 'https://www.bi.go.id/id/statistik/informasi-kurs/transaksi-bi/download-data'
  },
  {
    type: BANK_INDONESIA_SOURCE_TYPES.EXCEL,
    url: 'https://cors.isomorphic-git.org/https://www.bi.go.id/id/statistik/informasi-kurs/transaksi-bi/download-data'
  },
  {
    type: BANK_INDONESIA_SOURCE_TYPES.EXCEL,
    url: 'https://www.bi.go.id/id/statistik/informasi-kurs/transaksi-bi/DownloadData'
  },
  {
    type: BANK_INDONESIA_SOURCE_TYPES.EXCEL,
    url: 'https://cors.isomorphic-git.org/https://www.bi.go.id/id/statistik/informasi-kurs/transaksi-bi/DownloadData'
  },
  {
    type: BANK_INDONESIA_SOURCE_TYPES.JSON,
    url: 'https://www.bi.go.id/biwebservice/dataservice.svc/spotrate?$format=json'
  },
  {
    type: BANK_INDONESIA_SOURCE_TYPES.JSON,
    url: 'https://cors.isomorphic-git.org/https://www.bi.go.id/biwebservice/dataservice.svc/spotrate?$format=json'
  },
  {
    type: BANK_INDONESIA_SOURCE_TYPES.HTML,
    url: 'https://www.bi.go.id/id/statistik/informasi-kurs/transaksi-bi/default.aspx'
  },
  {
    type: BANK_INDONESIA_SOURCE_TYPES.HTML,
    url: 'https://cors.isomorphic-git.org/https://www.bi.go.id/id/statistik/informasi-kurs/transaksi-bi/default.aspx'
  },
  {
    type: BANK_INDONESIA_SOURCE_TYPES.HTML,
    url: 'assets/data/kurs-transaksi-bi.html'
  }
]);
const BANK_INDONESIA_SUPPORTED_CURRENCIES = Object.freeze(['IDR', 'USD', 'SGD', 'EUR']);
const BANK_INDONESIA_CACHE_KEY = 'entraverse_bank_indonesia_rates_v1';
const BANK_INDONESIA_CACHE_VERSION = 1;
const BANK_INDONESIA_REFRESH_TIME = Object.freeze({ hour: 0, minute: 1 });
const BANK_INDONESIA_RATE_TYPE_LABELS = Object.freeze({
  sell: 'kurs jual',
  mid: 'kurs tengah',
  buy: 'kurs beli',
  average: 'kurs rata-rata',
  fixed: 'kurs tetap'
});

function getNextBankIndonesiaRefreshTime(reference = Date.now()) {
  const now = reference instanceof Date ? new Date(reference.getTime()) : new Date(reference);
  if (Number.isNaN(now.getTime())) {
    return Date.now() + 24 * 60 * 60 * 1000;
  }
  const next = new Date(now);
  next.setHours(BANK_INDONESIA_REFRESH_TIME.hour, BANK_INDONESIA_REFRESH_TIME.minute, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

function getCurrentBankIndonesiaRefreshThreshold(reference = Date.now()) {
  const now = reference instanceof Date ? new Date(reference.getTime()) : new Date(reference);
  if (Number.isNaN(now.getTime())) {
    return Date.now();
  }
  const threshold = new Date(now);
  threshold.setHours(BANK_INDONESIA_REFRESH_TIME.hour, BANK_INDONESIA_REFRESH_TIME.minute, 0, 0);
  if (threshold > now) {
    threshold.setDate(threshold.getDate() - 1);
  }
  return threshold.getTime();
}

function decodeArrayBufferToString(buffer, preferredEncodings = []) {
  if (!buffer) {
    return '';
  }

  const arrayBuffer = buffer instanceof ArrayBuffer ? buffer : buffer.buffer;
  if (!(arrayBuffer instanceof ArrayBuffer)) {
    return '';
  }

  const encodings = Array.isArray(preferredEncodings) ? preferredEncodings.slice() : [];
  if (typeof TextDecoder === 'function') {
    const decoderCandidates = encodings.concat(['utf-8', 'iso-8859-1']);
    for (const encoding of decoderCandidates) {
      if (!encoding) {
        continue;
      }
      try {
        const decoder = new TextDecoder(encoding, { fatal: false });
        return decoder.decode(arrayBuffer);
      } catch (error) {
        if (encoding === decoderCandidates[decoderCandidates.length - 1]) {
          console.warn('Gagal mendekode ArrayBuffer dengan encoding', encoding, error);
        }
      }
    }
  }

  let result = '';
  try {
    const view = new Uint8Array(arrayBuffer);
    const chunkSize = 8192;
    for (let index = 0; index < view.length; index += chunkSize) {
      const chunk = view.subarray(index, index + chunkSize);
      result += String.fromCharCode(...chunk);
    }
  } catch (error) {
    console.warn('Gagal mengubah ArrayBuffer menjadi string.', error);
  }
  return result;
}

function parseDelimitedLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && char === delimiter) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(value => value.trim());
}

function parseBankIndonesiaCsvPayload(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return null;
  }

  const trimmed = text.trim();
  const lines = trimmed.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    return null;
  }

  const possibleDelimiters = [',', ';', '\t', '|'];
  const delimiter = possibleDelimiters.find(delim => lines[0].includes(delim)) || ',';
  const headers = parseDelimitedLine(lines[0], delimiter).map(header => header.toLowerCase());

  const currencyIndex = headers.findIndex(header => header.includes('mata uang') || header.includes('currency'));
  if (currencyIndex === -1) {
    return null;
  }

  let rateColumnIndex = headers.findIndex(header => header.includes('kurs jual') || header.includes('selling'));
  let rateType = 'sell';
  if (rateColumnIndex === -1) {
    rateColumnIndex = headers.findIndex(header => header.includes('kurs tengah') || header.includes('middle'));
    rateType = rateColumnIndex === -1 ? 'sell' : 'mid';
  }
  if (rateColumnIndex === -1) {
    rateColumnIndex = headers.findIndex(header => header.includes('kurs beli') || header.includes('buying'));
    rateType = rateColumnIndex === -1 ? 'sell' : 'buy';
  }
  if (rateColumnIndex === -1) {
    rateColumnIndex = headers.length - 1;
    rateType = 'sell';
  }

  const tanggalIndex = headers.findIndex(header => header.includes('tanggal'));

  const rates = new Map();
  let latestDate = null;

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseDelimitedLine(lines[i], delimiter);
    if (!cells.length) {
      continue;
    }

    const currencyCell = cells[currencyIndex] ?? '';
    const match = currencyCell.toUpperCase().match(/([A-Z]{3})/);
    if (!match) {
      continue;
    }

    const code = match[1];
    if (!BANK_INDONESIA_SUPPORTED_CURRENCIES.includes(code)) {
      continue;
    }

    const rate = parseNumericValue(cells[rateColumnIndex] ?? '');
    if (!Number.isFinite(rate)) {
      continue;
    }

    let entryDate = null;
    if (tanggalIndex !== -1 && tanggalIndex < cells.length) {
      entryDate = parseIndonesianDateString(cells[tanggalIndex]);
    }

    if (entryDate && (!latestDate || entryDate > latestDate)) {
      latestDate = entryDate;
    }

    rates.set(code, { rate, date: entryDate, rateType });
  }

  if (!rates.size) {
    return null;
  }

  rates.set('IDR', { rate: 1, date: latestDate, rateType: 'fixed' });
  return { rates, latestDate };
}

function parseBankIndonesiaExcelPayload(buffer, contentType) {
  if (!buffer) {
    return null;
  }

  const encodingCandidates = [];
  if (typeof contentType === 'string') {
    const charsetMatch = contentType.match(/charset=([^;]+)/i);
    if (charsetMatch) {
      encodingCandidates.push(charsetMatch[1].trim());
    }
  }

  const text = decodeArrayBufferToString(buffer, encodingCandidates);
  if (text && /<table/i.test(text)) {
    return parseBankIndonesiaHtmlPayload(text);
  }

  if (text && text.trim()) {
    const csvResult = parseBankIndonesiaCsvPayload(text);
    if (csvResult) {
      return csvResult;
    }
  }

  return null;
}

function readBankIndonesiaRatesCache() {
  if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
    return null;
  }

  try {
    const raw = localStorage.getItem(BANK_INDONESIA_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== BANK_INDONESIA_CACHE_VERSION) {
      return null;
    }

    if (typeof parsed.fetchedAt !== 'number') {
      return null;
    }

    const threshold = getCurrentBankIndonesiaRefreshThreshold();
    if (parsed.fetchedAt < threshold) {
      return null;
    }

    const expiresAt = typeof parsed.expiresAt === 'number'
      ? parsed.expiresAt
      : getNextBankIndonesiaRefreshTime(parsed.fetchedAt);
    if (expiresAt <= Date.now()) {
      return null;
    }

    const rates = new Map();
    if (Array.isArray(parsed.rates)) {
      parsed.rates.forEach(entry => {
        if (!Array.isArray(entry) || entry.length < 2) {
          return;
        }
        const [code, data] = entry;
        if (typeof code !== 'string' || !data) {
          return;
        }

        const normalizedCode = code.trim().toUpperCase();
        if (!BANK_INDONESIA_SUPPORTED_CURRENCIES.includes(normalizedCode) && normalizedCode !== 'IDR') {
          return;
        }

        const rate = parseNumericValue(data.rate);
        if (!Number.isFinite(rate)) {
          return;
        }

        const entryDate = parseDateValue(data.date);
        const rateType = typeof data.rateType === 'string' ? data.rateType : null;
        rates.set(normalizedCode, { rate, date: entryDate, rateType });
      });
    }

    if (!rates.size) {
      return null;
    }

    if (!rates.has('IDR')) {
      rates.set('IDR', { rate: 1, date: parseDateValue(parsed.lastUpdated) ?? null, rateType: 'fixed' });
    }

    return {
      rates,
      lastUpdated: parseDateValue(parsed.lastUpdated) ?? null,
      source: parsed.source && typeof parsed.source === 'object' ? parsed.source : null,
      fetchedAt: parsed.fetchedAt,
      expiresAt
    };
  } catch (error) {
    console.warn('Tidak dapat membaca cache kurs Bank Indonesia.', error);
    return null;
  }
}

function writeBankIndonesiaRatesCache({ rates, lastUpdated, source }) {
  if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') {
    return null;
  }

  try {
    const serializedRates = [];
    if (rates instanceof Map) {
      rates.forEach((value, code) => {
        if (!code) {
          return;
        }
        serializedRates.push([
          code,
          {
            rate: value?.rate ?? null,
            date: value?.date instanceof Date ? value.date.getTime() : value?.date ?? null,
            rateType: value?.rateType ?? null
          }
        ]);
      });
    }

    const now = Date.now();
    const expiresAt = getNextBankIndonesiaRefreshTime(now);
    const payload = {
      version: BANK_INDONESIA_CACHE_VERSION,
      fetchedAt: now,
      expiresAt,
      lastUpdated: lastUpdated instanceof Date ? lastUpdated.getTime() : lastUpdated ?? null,
      rates: serializedRates,
      source: source ? { url: source.url ?? null, type: source.type ?? null } : null
    };

    localStorage.setItem(BANK_INDONESIA_CACHE_KEY, JSON.stringify(payload));
    return expiresAt;
  } catch (error) {
    console.warn('Tidak dapat menyimpan cache kurs Bank Indonesia.', error);
    return null;
  }
}

const THEME_STORAGE_KEY = 'entraverse_theme_mode';
const THEME_MODES = ['system', 'light', 'dark'];
const DEFAULT_THEME_MODE = 'system';
const THEME_LABELS = {
  system: 'Auto (System)',
  light: 'Light Mode',
  dark: 'Dark Mode'
};
const THEME_ICON_MARKUP = {
  system: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v18m0 0a9 9 0 1 0 0-18"/></svg>',
  light: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.5v1.5m0 12v1.5m7.5-7.5h1.5m-18 0H3m13.364-6.364 1.06-1.06m-12.728 0-1.06-1.06m12.728 12.728 1.06 1.06m-12.728 0-1.06 1.06M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0z"/></svg>',
  dark: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12.79A9 9 0 1 1 11.21 3a7.5 7.5 0 0 0 9.79 9.79z"/></svg>'
};

const systemDarkQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

let themeControls = [];
let themeListenersAttached = false;
let systemPreferenceListenerAttached = false;

function isValidThemeMode(mode) {
  return THEME_MODES.includes(mode);
}

function resolveTheme(mode) {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  if (systemDarkQuery && typeof systemDarkQuery.matches === 'boolean') {
    return systemDarkQuery.matches ? 'dark' : 'light';
  }
  return 'light';
}

function getStoredThemeMode() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to read stored theme mode', error);
    return null;
  }
}

function persistThemeMode(mode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (error) {
    console.warn('Unable to persist theme mode', error);
  }
}

function setColorScheme(resolved) {
  document.documentElement.style.setProperty('color-scheme', resolved === 'dark' ? 'dark' : 'light');
}

function refreshSystemTheme() {
  if (document.body.dataset.themeMode !== 'system') {
    return;
  }
  const resolved = resolveTheme('system');
  document.body.dataset.theme = resolved;
  setColorScheme(resolved);
  updateThemeControlsUI('system');
}

function handleSystemPreferenceChange() {
  refreshSystemTheme();
}

function attachSystemPreferenceListener() {
  if (!systemDarkQuery || systemPreferenceListenerAttached) {
    return;
  }
  if (typeof systemDarkQuery.addEventListener === 'function') {
    systemDarkQuery.addEventListener('change', handleSystemPreferenceChange);
  } else if (typeof systemDarkQuery.addListener === 'function') {
    systemDarkQuery.addListener(handleSystemPreferenceChange);
  }
  systemPreferenceListenerAttached = true;
}

function detachSystemPreferenceListener() {
  if (!systemDarkQuery || !systemPreferenceListenerAttached) {
    return;
  }
  if (typeof systemDarkQuery.removeEventListener === 'function') {
    systemDarkQuery.removeEventListener('change', handleSystemPreferenceChange);
  } else if (typeof systemDarkQuery.removeListener === 'function') {
    systemDarkQuery.removeListener(handleSystemPreferenceChange);
  }
  systemPreferenceListenerAttached = false;
}

function updateThemeControlsUI(mode) {
  if (!themeControls.length) return;
  const normalizedMode = isValidThemeMode(mode) ? mode : DEFAULT_THEME_MODE;
  const resolved = resolveTheme(normalizedMode);

  themeControls.forEach(control => {
    const label = control.querySelector('[data-theme-label]');
    if (label) {
      label.textContent = THEME_LABELS[normalizedMode] ?? THEME_LABELS[DEFAULT_THEME_MODE];
    }

    const iconTarget = control.querySelector('[data-theme-icon]');
    if (iconTarget) {
      const markup = THEME_ICON_MARKUP[normalizedMode] ?? '';
      iconTarget.innerHTML = markup;
      iconTarget.dataset.iconMode = normalizedMode;
      iconTarget.dataset.iconTheme = resolved;
    }

    control.querySelectorAll('[data-theme-option]').forEach(option => {
      const isActive = option.dataset.themeOption === normalizedMode;
      option.setAttribute('aria-selected', isActive ? 'true' : 'false');
      option.classList.toggle('is-active', isActive);
    });
  });
}

function setThemeControlOpen(control, open) {
  if (!control) return;
  const trigger = control.querySelector('[data-theme-trigger]');
  if (trigger) {
    trigger.setAttribute('aria-expanded', String(open));
  }
  control.classList.toggle('open', open);
  control.querySelectorAll('[data-theme-option]').forEach(option => {
    option.tabIndex = open ? 0 : -1;
  });
}

function closeThemeControls(except) {
  themeControls.forEach(control => {
    if (control !== except) {
      setThemeControlOpen(control, false);
    }
  });
}

function handleThemeControlDocumentClick(event) {
  if (!themeControls.length) return;
  const control = event.target.closest('[data-theme-control]');
  if (!control || !themeControls.includes(control)) {
    closeThemeControls();
  }
}

function handleThemeControlEscape(event) {
  if (event.key === 'Escape') {
    closeThemeControls();
  }
}

function applyTheme(mode, { skipStorage } = {}) {
  const normalizedMode = isValidThemeMode(mode) ? mode : DEFAULT_THEME_MODE;
  const resolved = resolveTheme(normalizedMode);

  document.body.dataset.themeMode = normalizedMode;
  document.body.dataset.theme = resolved;
  setColorScheme(resolved);

  if (!skipStorage) {
    persistThemeMode(normalizedMode);
  }

  updateThemeControlsUI(normalizedMode);

  if (normalizedMode === 'system') {
    refreshSystemTheme();
    attachSystemPreferenceListener();
  } else {
    detachSystemPreferenceListener();
  }

  return resolved;
}

function initializeTheme() {
  const storedMode = getStoredThemeMode();
  const initialMode = isValidThemeMode(storedMode) ? storedMode : DEFAULT_THEME_MODE;
  applyTheme(initialMode, { skipStorage: true });
}

function setupThemeControls() {
  themeControls = Array.from(document.querySelectorAll('[data-theme-control]'));
  if (!themeControls.length) {
    return;
  }

  const currentMode = document.body.dataset.themeMode || DEFAULT_THEME_MODE;
  let hasMenuControl = false;

  themeControls.forEach(control => {
    const trigger = control.querySelector('[data-theme-trigger]') || control.querySelector('button');
    const options = Array.from(control.querySelectorAll('[data-theme-option]'));

    if (options.length) {
      hasMenuControl = true;

      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-haspopup', 'listbox');
      }

      options.forEach(option => {
        option.tabIndex = -1;
        const icon = option.querySelector('[data-theme-option-icon]');
        const optionMode = option.dataset.themeOption;
        if (icon && optionMode && THEME_ICON_MARKUP[optionMode]) {
          icon.innerHTML = THEME_ICON_MARKUP[optionMode];
        }
      });

      const openMenu = () => {
        closeThemeControls(control);
        setThemeControlOpen(control, true);
        options[0]?.focus();
      };

      trigger?.addEventListener('click', event => {
        event.preventDefault();
        const isOpen = control.classList.contains('open');
        if (isOpen) {
          setThemeControlOpen(control, false);
        } else {
          openMenu();
        }
      });

      trigger?.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          const isOpen = control.classList.contains('open');
          if (isOpen) {
            setThemeControlOpen(control, false);
          } else {
            openMenu();
          }
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (!control.classList.contains('open')) {
            openMenu();
          } else {
            options[0]?.focus();
          }
        }
      });

      options.forEach((option, index) => {
        const selectOption = () => {
          applyTheme(option.dataset.themeOption);
          closeThemeControls();
          setThemeControlOpen(control, false);
          trigger?.focus();
        };

        option.addEventListener('click', selectOption);

        option.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectOption();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setThemeControlOpen(control, false);
            trigger?.focus();
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            options[(index + 1) % options.length]?.focus();
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            options[(index - 1 + options.length) % options.length]?.focus();
          }
        });
      });
      return;
    }

    if (!trigger) {
      return;
    }

    const cycleAttr = control.dataset.themeCycle;
    const cycleModes = (cycleAttr ? cycleAttr.split(',') : THEME_MODES)
      .map(mode => mode.trim())
      .filter(Boolean)
      .filter(isValidThemeMode);

    const cycleOrder = Array.from(new Set(cycleModes));
    const modesToUse = cycleOrder.length ? cycleOrder : [...THEME_MODES];

    const cycleTheme = () => {
      const activeMode = document.body.dataset.themeMode || DEFAULT_THEME_MODE;
      const currentIndex = modesToUse.indexOf(activeMode);
      const nextMode = modesToUse[(currentIndex + 1) % modesToUse.length] || DEFAULT_THEME_MODE;
      applyTheme(nextMode);
    };

    trigger.addEventListener('click', event => {
      event.preventDefault();
      cycleTheme();
    });

    trigger.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        cycleTheme();
      }
    });
  });

  if (hasMenuControl && !themeListenersAttached) {
    document.addEventListener('click', handleThemeControlDocumentClick);
    document.addEventListener('keydown', handleThemeControlEscape);
    window.addEventListener('focus', refreshSystemTheme);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        refreshSystemTheme();
      }
    });
    themeListenersAttached = true;
  }

  updateThemeControlsUI(currentMode);
  if (currentMode === 'system') {
    attachSystemPreferenceListener();
    refreshSystemTheme();
  } else {
    detachSystemPreferenceListener();
  }
}

initializeTheme();

const toast = createToast();

function requireCatalogManager(message = 'Silakan login untuk mengelola katalog.') {
  if (canManageCatalog()) {
    return true;
  }
  toast.show(message);
  return false;
}

function clone(value) {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.error('Failed to clone value', error);
    return value;
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return value
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getData(key, fallback) {
  if (Object.prototype.hasOwnProperty.call(remoteCache, key)) {
    return getRemoteCache(key, fallback);
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return clone(fallback);
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read localStorage', error);
    return clone(fallback);
  }
}

function setData(key, value) {
  if (Object.prototype.hasOwnProperty.call(remoteCache, key)) {
    setRemoteCache(key, Array.isArray(value) ? value : []);
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

function getCategories() {
  return getCategoriesFromCache();
}

function saveCategories(categories) {
  setCategoryCache(Array.isArray(categories) ? categories : []);
}

function getGuestUser() {
  return { ...GUEST_USER };
}

function isGuestUser(user) {
  return !user || user.id === GUEST_USER.id;
}

function getActiveUser() {
  if (!activeSessionUser) {
    activeSessionUser = getGuestUser();
  }
  return activeSessionUser;
}

function setActiveSessionUser(user) {
  const sanitized = user && !isGuestUser(user) ? sanitizeSessionUser(user) : getGuestUser();
  activeSessionUser = sanitized;

  if (typeof document !== 'undefined' && document.body) {
    const isGuest = isGuestUser(activeSessionUser);
    document.body.dataset.sessionRole = isGuest ? 'guest' : 'user';
    const event = new CustomEvent('entraverse:session-change', {
      detail: { user: activeSessionUser, isGuest }
    });
    document.dispatchEvent(event);
  }
}

function canManageCatalog() {
  return !isGuestUser(getActiveUser());
}

function getNameInitials(name) {
  if (!name) {
    return '??';
  }

  return name
    .toString()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';
}

function getCurrentUser() {
  const session = getData(STORAGE_KEYS.session, null);
  if (!session || !session.user) {
    return null;
  }
  return sanitizeSessionUser(session.user);
}

function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.session);
    return;
  }

  const sanitized = sanitizeSessionUser(user);
  const payload = {
    userId: sanitized.id,
    loggedInAt: Date.now(),
    user: sanitized
  };
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(payload));
}

function createToast() {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  const append = () => {
    if (!el.isConnected) {
      document.body.appendChild(el);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', append);
  } else {
    append();
  }
  return {
    show(message) {
      el.textContent = message;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 3000);
    }
  };
}

function parseNumericValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const sanitized = trimmed.replace(/\s+/g, '');
  const lastComma = sanitized.lastIndexOf(',');
  const lastDot = sanitized.lastIndexOf('.');
  const hasComma = lastComma !== -1;
  const hasDot = lastDot !== -1;
  let normalized = sanitized;

  if (hasComma || hasDot) {
    const decimalIndex = Math.max(lastComma, lastDot);
    const decimalChar = decimalIndex === -1 ? null : sanitized[decimalIndex];
    const occurrences = decimalChar
      ? (sanitized.match(new RegExp(`\\${decimalChar}`, 'g')) || []).length
      : 0;
    const otherSeparator = decimalChar === ',' ? '.' : ',';
    const hasOtherSeparator = otherSeparator && sanitized.includes(otherSeparator);
    const fractionalCandidate = decimalChar ? sanitized.slice(decimalIndex + 1) : '';
    const shouldTreatAsDecimal = Boolean(decimalChar)
      && fractionalCandidate.length > 0
      && (fractionalCandidate.length !== 3 || occurrences === 1 || hasOtherSeparator);

    if (shouldTreatAsDecimal) {
      const integerPart = sanitized
        .slice(0, decimalIndex)
        .replace(/[^0-9-]/g, '');
      const fractionalPart = sanitized
        .slice(decimalIndex + 1)
        .replace(/[^0-9]/g, '');
      normalized = fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
    } else {
      normalized = sanitized.replace(/[^0-9-]/g, '');
    }
  } else {
    normalized = sanitized.replace(/[^0-9-]/g, '');
  }

  if (!normalized || normalized === '-' || normalized === '.-' || normalized === '-.') {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSku(value) {
  if (value === null || value === undefined) {
    return '';
  }

  try {
    return value.toString().trim().toLowerCase();
  } catch (error) {
    console.warn('Gagal menormalisasi SKU.', error);
    return '';
  }
}

function calculateProductTotalStock(product) {
  if (!product || typeof product !== 'object') {
    return null;
  }

  const variantPricing = Array.isArray(product.variantPricing) ? product.variantPricing : [];
  let total = 0;
  let hasStockValue = false;

  for (const row of variantPricing) {
    if (!row) continue;
    const parsed = parseNumericValue(row.stock);
    if (parsed !== null && Number.isFinite(parsed)) {
      total += parsed;
      hasStockValue = true;
    }
  }

  if (hasStockValue) {
    return total.toString();
  }

  const directStock = parseNumericValue(product.stock);
  if (directStock !== null && Number.isFinite(directStock)) {
    return directStock.toString();
  }

  return null;
}

function getPrimaryProductSku(product) {
  if (!product || typeof product !== 'object') {
    return '';
  }

  const directCandidates = [
    product.sku,
    product.inventory?.sku,
    product.inventory?.sellerSku,
    product.inventory?.productSku
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  const variantPricing = Array.isArray(product.variantPricing) ? product.variantPricing : [];
  for (const row of variantPricing) {
    if (!row) continue;
    const sku = typeof row.sellerSku === 'string' && row.sellerSku.trim()
      ? row.sellerSku
      : row.sku;
    if (typeof sku !== 'string') continue;
    const trimmed = sku.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];
  for (const variant of variants) {
    if (!variant) continue;
    const sku = typeof variant.sellerSku === 'string' && variant.sellerSku.trim()
      ? variant.sellerSku
      : variant.sku;
    if (typeof sku !== 'string') continue;
    const trimmed = sku.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return '';
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const match = value.match(/Date\((\d+)\)/);
    if (match) {
      const timestamp = Number(match[1]);
      if (Number.isFinite(timestamp)) {
        const date = new Date(timestamp);
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

const INDONESIAN_MONTH_INDEX = Object.freeze({
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11
});

function parseIndonesianDateString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const textualMatch = trimmed.match(
    /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i
  );
  if (textualMatch) {
    const day = Number(textualMatch[1]);
    const monthName = textualMatch[2].toLowerCase();
    const year = Number(textualMatch[3]);
    const monthIndex = INDONESIAN_MONTH_INDEX[monthName];
    if (Number.isFinite(day) && Number.isFinite(year) && Number.isFinite(monthIndex)) {
      const candidate = new Date(year, monthIndex, day);
      if (!Number.isNaN(candidate.getTime())) {
        return candidate;
      }
    }
  }

  const slashMatch = trimmed.match(/(\d{1,2})[\/](\d{1,2})[\/](\d{4})/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]) - 1;
    const year = Number(slashMatch[3]);
    if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
      const candidate = new Date(year, month, day);
      if (!Number.isNaN(candidate.getTime())) {
        return candidate;
      }
    }
  }

  const isoMatch = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
      const candidate = new Date(year, month, day);
      if (!Number.isNaN(candidate.getTime())) {
        return candidate;
      }
    }
  }

  const direct = new Date(trimmed);
  return Number.isNaN(direct.getTime()) ? null : direct;
}

function extractBankIndonesiaDateFromHtml(doc, rawHtml) {
  const candidates = [];

  if (doc) {
    const targetedElements = doc.querySelectorAll('[id*="tanggal" i], [class*="tanggal" i], [data-tanggal]');
    targetedElements.forEach(element => {
      const text = element?.textContent?.trim();
      if (text) {
        candidates.push(text);
      }
      const value = element?.getAttribute?.('value');
      if (value) {
        candidates.push(value);
      }
      const dataValue = element?.getAttribute?.('data-tanggal');
      if (dataValue) {
        candidates.push(dataValue);
      }
    });

    const hiddenInputs = doc.querySelectorAll('input[type="hidden" i]');
    hiddenInputs.forEach(input => {
      const name = input?.getAttribute?.('name')?.toLowerCase?.() ?? '';
      if (name.includes('tanggal')) {
        const value = input?.getAttribute?.('value')?.trim?.();
        if (value) {
          candidates.push(value);
        }
      }
    });

    const bodyText = doc.body?.textContent;
    if (bodyText) {
      candidates.push(bodyText);
    }
  }

  if (typeof rawHtml === 'string' && rawHtml.trim()) {
    candidates.push(rawHtml);
  }

  const patterns = [
    /Tanggal[^0-9A-Za-z]*:?\s*(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i,
    /Per\s*(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i,
    /(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i,
    /(\d{1,2}[\/](?:\d{1,2})[\/](?:\d{4}))/,
    /(\d{4}-\d{2}-\d{2})/
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    for (const pattern of patterns) {
      const match = candidate.match(pattern);
      if (match && match[1]) {
        const parsed = parseIndonesianDateString(match[1]);
        if (parsed) {
          return parsed;
        }
      }
    }
  }

  return null;
}

function parseBankIndonesiaJsonPayload(payload) {
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.d?.results)
      ? payload.d.results
      : Array.isArray(payload?.d)
        ? payload.d
        : Array.isArray(payload?.value)
          ? payload.value
          : [];

  const rates = new Map();
  let latestDate = null;

  candidates.forEach(item => {
    if (!item) return;
    const code = (item.currency ?? item.Currency ?? item.mata_uang ?? item.kode ?? item.symbol ?? '')
      .toString()
      .trim()
      .toUpperCase();
    if (!BANK_INDONESIA_SUPPORTED_CURRENCIES.includes(code)) {
      return;
    }

    const midRate = parseNumericValue(
      item.kurs_tengah ?? item.kursTengah ?? item.midRate ?? item.mid_rate ?? item.middleRate ?? item.rate
    );
    const buyRate = parseNumericValue(item.kurs_beli ?? item.buyRate ?? item.kursBeli);
    const sellRate = parseNumericValue(item.kurs_jual ?? item.sellRate ?? item.kursJual);

    let resolvedRate = Number.isFinite(sellRate) ? sellRate : null;
    let rateType = Number.isFinite(sellRate) ? 'sell' : null;

    if (!Number.isFinite(resolvedRate) && Number.isFinite(midRate)) {
      resolvedRate = midRate;
      rateType = 'mid';
    }

    if (!Number.isFinite(resolvedRate) && Number.isFinite(buyRate)) {
      resolvedRate = buyRate;
      rateType = 'buy';
    }

    if (!Number.isFinite(resolvedRate) && Number.isFinite(buyRate) && Number.isFinite(sellRate)) {
      resolvedRate = (buyRate + sellRate) / 2;
      rateType = 'average';
    }

    if (!Number.isFinite(resolvedRate)) {
      return;
    }

    const dateValue = parseDateValue(
      item.tanggal ?? item.Tanggal ?? item.date ?? item.Date ?? item.tanggal_update ?? item.valid_from
    );

    const existing = rates.get(code);
    if (!existing || (dateValue && (!existing.date || dateValue > existing.date))) {
      rates.set(code, { rate: resolvedRate, date: dateValue, rateType });
    }

    if (dateValue && (!latestDate || dateValue > latestDate)) {
      latestDate = dateValue;
    }
  });

  if (!rates.size) {
    return null;
  }

  rates.set('IDR', { rate: 1, date: latestDate, rateType: 'fixed' });
  return { rates, latestDate };
}

function parseBankIndonesiaHtmlPayload(html) {
  if (typeof html !== 'string' || !html.trim()) {
    return null;
  }

  if (typeof DOMParser === 'undefined') {
    console.warn('DOMParser tidak tersedia di lingkungan ini.');
    return null;
  }

  let doc;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(html, 'text/html');
  } catch (error) {
    console.warn('Tidak dapat mem-parsing HTML kurs Bank Indonesia.', error);
    return null;
  }

  if (!doc) {
    return null;
  }

  const tables = Array.from(doc.querySelectorAll('table'));
  let targetTable = null;
  let headerCells = [];

  for (const table of tables) {
    const headerRows = [
      ...Array.from(table.querySelectorAll('thead tr')),
      table.querySelector('tr')
    ].filter(Boolean);

    for (const row of headerRows) {
      const cells = Array.from(row.querySelectorAll('th,td'));
      if (!cells.length) {
        continue;
      }

      const normalized = cells.map(cell => cell.textContent?.trim().toLowerCase() ?? '');
      const hasCurrencyColumn = normalized.some(text => text.includes('mata uang') || text.includes('currency'));
      const hasRateColumn = normalized.some(text => {
        return (
          text.includes('kurs jual')
          || text.includes('kurs tengah')
          || text.includes('middle rate')
          || text.includes('selling rate')
        );
      });
      if (hasCurrencyColumn && hasRateColumn) {
        targetTable = table;
        headerCells = cells;
        break;
      }
    }

    if (targetTable) {
      break;
    }
  }

  if (!targetTable) {
    return null;
  }

  let currencyColumnIndex = headerCells.findIndex(cell => (cell.textContent ?? '').toLowerCase().includes('mata uang'));
  if (currencyColumnIndex === -1) {
    currencyColumnIndex = 1;
  }

  const tanggalColumnIndex = headerCells.findIndex(cell => (cell.textContent ?? '').toLowerCase().includes('tanggal'));

  let rateColumnIndex = headerCells.findIndex(cell => (cell.textContent ?? '').toLowerCase().includes('kurs jual'));
  let rateType = 'sell';
  if (rateColumnIndex === -1) {
    rateColumnIndex = headerCells.findIndex(cell => {
      const text = (cell.textContent ?? '').toLowerCase();
      return text.includes('kurs tengah') || text.includes('middle rate');
    });
    rateType = rateColumnIndex === -1 ? 'sell' : 'mid';
  }
  if (rateColumnIndex === -1) {
    rateColumnIndex = headerCells.findIndex(cell => {
      const text = (cell.textContent ?? '').toLowerCase();
      return text.includes('kurs beli') || text.includes('buying rate');
    });
    rateType = rateColumnIndex === -1 ? 'sell' : 'buy';
  }
  if (rateColumnIndex === -1) {
    rateColumnIndex = headerCells.length - 1;
    rateType = 'sell';
  }

  const dataRows = Array.from(targetTable.querySelectorAll('tbody tr')).filter(row => row.querySelectorAll('td').length);
  const fallbackRows = Array.from(targetTable.querySelectorAll('tr')).slice(1);
  const rows = dataRows.length ? dataRows : fallbackRows;

  const rates = new Map();
  let latestDate = extractBankIndonesiaDateFromHtml(doc, html);

  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (!cells.length) {
      return;
    }

    const currencyCell = cells[currencyColumnIndex] ?? cells.find(cell => /[A-Z]{3}/.test(cell.textContent ?? ''));
    if (!currencyCell) {
      return;
    }

    const currencyMatch = (currencyCell.textContent ?? '')
      .toUpperCase()
      .match(/([A-Z]{3})/);
    if (!currencyMatch) {
      return;
    }

    const code = currencyMatch[1];
    if (!BANK_INDONESIA_SUPPORTED_CURRENCIES.includes(code)) {
      return;
    }

    const rateCell = cells[rateColumnIndex] ?? cells[cells.length - 1];
    const rate = parseNumericValue(rateCell?.textContent ?? '');
    if (!Number.isFinite(rate)) {
      return;
    }

    let rowDate = null;
    if (tanggalColumnIndex !== -1 && tanggalColumnIndex < cells.length) {
      rowDate = parseIndonesianDateString(cells[tanggalColumnIndex]?.textContent ?? '');
    }

    const entryDate = rowDate || latestDate;
    if (rowDate && (!latestDate || rowDate > latestDate)) {
      latestDate = rowDate;
    }

    rates.set(code, { rate, date: entryDate, rateType });
  });

  if (!rates.size) {
    return null;
  }

  rates.set('IDR', { rate: 1, date: latestDate, rateType: 'fixed' });
  return { rates, latestDate };
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

function formatCurrencyCompact(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return formatCurrency(0);
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(numeric);
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  return new Intl.NumberFormat('id-ID').format(numeric);
}

function formatNumberCompact(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0';
  }

  return new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(numeric);
}

function formatPercentage(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0%';
  }
  return `${(numeric * 100).toFixed(1)}%`;
}

function normalizeVariants(variants) {
  if (!Array.isArray(variants)) {
    return [];
  }

  return variants
    .map(variant => {
      if (!variant) return null;
      const name = (variant.name ?? '').toString().trim() || 'Varian';

      if (Array.isArray(variant.options)) {
        const options = variant.options
          .map(option => option?.toString().trim())
          .filter(Boolean);
        if (options.length) {
          return { name, options };
        }
      }

      const fallback = [];
      const pushOption = value => {
        if (value === null || value === undefined) return;
        const text = value.toString().trim();
        if (text) {
          fallback.push(text);
        }
      };

      pushOption(variant.option);
      pushOption(variant.value);
      pushOption(variant.label);

      if (variant.sku) {
        pushOption(`SKU ${variant.sku}`);
      }

      if (variant.stock !== undefined) {
        pushOption(`Stok ${variant.stock}`);
      }

      if (typeof variant.price === 'number' && !Number.isNaN(variant.price)) {
        pushOption(formatCurrency(variant.price));
      }

      if (!fallback.length && variant.name) {
        pushOption(variant.name);
      }

      if (!fallback.length) {
        return null;
      }

      return { name, options: fallback };
    })
    .filter(Boolean);
}

function setupSidebarToggle() {
  const sidebar = document.querySelector('[data-sidebar]');
  const backdrop = document.querySelector('[data-sidebar-backdrop]');
  const toggleButtons = document.querySelectorAll('[data-sidebar-toggle]');

  if (!sidebar || toggleButtons.length === 0) {
    return;
  }

  const setExpanded = expanded => {
    toggleButtons.forEach(button => button.setAttribute('aria-expanded', String(expanded)));
  };

  const closeSidebar = () => {
    document.body.classList.remove('sidebar-open');
    setExpanded(false);
    sidebar.setAttribute('aria-hidden', 'false');
  };

  const openSidebar = () => {
    document.body.classList.remove('sidebar-collapsed');
    document.body.classList.add('sidebar-open');
    setExpanded(true);
    sidebar.setAttribute('aria-hidden', 'false');
  };

  const toggleSidebar = () => {
    if (document.body.classList.contains('sidebar-open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };

  toggleButtons.forEach(button => {
    button.addEventListener('click', toggleSidebar);
  });

  backdrop?.addEventListener('click', closeSidebar);

  sidebar.addEventListener('click', event => {
    if (event.target.closest('.nav-link')) {
      closeSidebar();
    }
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeSidebar();
    }
  });

  const mediaQuery = window.matchMedia('(min-width: 961px)');
  const handleMediaChange = event => {
    if (event.matches) {
      closeSidebar();
    }
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleMediaChange);
  } else {
    mediaQuery.addListener(handleMediaChange);
  }
}

function setupSidebarCollapse() {
  const toggle = document.querySelector('[data-sidebar-collapse]');
  const sidebar = document.querySelector('[data-sidebar]');
  if (!toggle || !sidebar) {
    return;
  }

  const applyState = collapsed => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    document.body.classList.remove('sidebar-open');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Tampilkan navigasi' : 'Sembunyikan navigasi');
    sidebar.setAttribute('aria-hidden', collapsed ? 'true' : 'false');
  };

  const currentCollapsed = document.body.classList.contains('sidebar-collapsed');
  applyState(currentCollapsed);

  toggle.addEventListener('click', () => {
    const collapsed = !document.body.classList.contains('sidebar-collapsed');
    applyState(collapsed);
  });

  const mediaQuery = window.matchMedia('(max-width: 960px)');
  const handleMediaChange = event => {
    if (event.matches) {
      applyState(false);
    }
  };

  handleMediaChange(mediaQuery);

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleMediaChange);
  } else {
    mediaQuery.addListener(handleMediaChange);
  }
}

function handleRegister() {
  const form = document.getElementById('register-form');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = (formData.get('name') ?? '').toString().trim();
    const company = (formData.get('company') ?? '').toString().trim();
    const email = (formData.get('email') ?? '').toString().trim().toLowerCase();
    const password = (formData.get('password') ?? '').toString().trim();
    const confirm = (formData.get('confirm') ?? '').toString().trim();

    if (password !== confirm) {
      toast.show('Kata sandi dan konfirmasi tidak sama.');
      return;
    }

    if (!email || !password) {
      toast.show('Lengkapi semua bidang formulir.');
      return;
    }

    try {
      await ensureSupabase();
    } catch (error) {
      console.error('Supabase belum siap.', error);
      toast.show('Supabase belum dikonfigurasi. Hubungi administrator.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
    }

    try {
      const existing = await fetchUserByEmail(email);
      if (existing) {
        toast.show('Email sudah terdaftar, silakan masuk.');
        return;
      }

      const passwordHash = await hashPassword(password);
      const now = new Date().toISOString();
      const newUser = {
        id: crypto.randomUUID(),
        name,
        company,
        email,
        passwordHash,
        createdAt: now,
        updatedAt: now
      };

      const saved = await insertUserToSupabase(newUser);
      setCurrentUser(saved);
      toast.show('Pendaftaran berhasil, mengalihkan...');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);
    } catch (error) {
      console.error('Gagal mendaftarkan pengguna.', error);
      toast.show('Gagal melakukan pendaftaran, coba lagi.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
    }
  });
}

function handleLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = (formData.get('email') ?? '').toString().trim().toLowerCase();
    const password = (formData.get('password') ?? '').toString().trim();

    if (!email || !password) {
      toast.show('Isi email dan kata sandi Anda.');
      return;
    }

    try {
      await ensureSupabase();
    } catch (error) {
      console.error('Supabase belum siap.', error);
      toast.show('Supabase belum dikonfigurasi. Hubungi administrator.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
    }

    try {
      const user = await fetchUserByEmail(email);
      if (!user) {
        toast.show('Email atau kata sandi salah.');
        return;
      }

      const hashed = await hashPassword(password);
      if (!user.passwordHash || user.passwordHash !== hashed) {
        toast.show('Email atau kata sandi salah.');
        return;
      }

      setCurrentUser(user);
      toast.show('Selamat datang kembali!');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
    } catch (error) {
      console.error('Gagal melakukan login.', error);
      toast.show('Gagal masuk, coba lagi.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
    }
  });
}

function handleGuestAccess() {
  const button = document.querySelector('[data-guest-access]');
  if (!button) return;

  button.addEventListener('click', () => {
    setCurrentUser(null);
    toast.show('Mengalihkan ke dashboard sebagai tamu...');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 400);
  });
}

async function ensureAuthenticatedPage() {
  const page = document.body.dataset.page;
  const guest = getGuestUser();

  if (!['dashboard', 'add-product', 'categories', 'shipping', 'integrations', 'reports'].includes(page)) {
    return { user: guest, status: 'guest' };
  }

  const sessionUser = getCurrentUser();
  if (!sessionUser) {
    return { user: guest, status: 'guest' };
  }

  try {
    await ensureSupabase();
    const remoteUser = await fetchUserById(sessionUser.id);
    if (remoteUser) {
      setCurrentUser(remoteUser);
      return { user: sanitizeSessionUser(remoteUser), status: 'authenticated' };
    }
    setCurrentUser(null);
    return { user: guest, status: 'expired' };
  } catch (error) {
    const supabaseError = getSupabaseInitializationError();
    if (supabaseError) {
      console.error('Supabase belum siap.', supabaseError);
    }
    console.error('Gagal memuat data pengguna.', error);
    return { user: sessionUser, status: 'authenticated' };
  }
}

function formatPhoneHref(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  const digits = trimmed.replace(/[^+\d]/g, '');
  if (!digits) {
    return trimmed;
  }
  return digits.startsWith('+') ? digits : `+${digits}`;
}

function createContactStack(items = []) {
  const normalized = items
    .filter(item => typeof item === 'string' && item.trim())
    .map(item => {
      const trimmed = item.trim();
      return /^<\s*(span|a|strong|em)\b/i.test(trimmed) ? trimmed : `<span>${trimmed}</span>`;
    });

  if (!normalized.length) {
    return '<div class="contact-stack"><span>-</span></div>';
  }

  return `<div class="contact-stack">${normalized.join('')}</div>`;
}

function renderShippingVendors(filterText = '') {
  const tbody = document.getElementById('shipping-table-body');
  if (!tbody) return;

  const countEl = document.getElementById('shipping-count');
  const addButton = document.getElementById('add-shipping-vendor-btn');
  const normalized = (filterText ?? '').toString().trim().toLowerCase();
  const canManage = canManageCatalog();
  const vendors = getShippingVendorsFromCache()
    .filter(vendor => {
      if (!normalized) return true;
      return [
        vendor.name,
        vendor.services,
        vendor.coverage,
        vendor.pic,
        vendor.email,
        vendor.phone,
        vendor.note,
        vendor.airRate,
        vendor.seaRate
      ]
        .map(field => (field ?? '').toString().toLowerCase())
        .some(value => value.includes(normalized));
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));

  if (!vendors.length) {
    tbody.innerHTML = '<tr class="empty-state"><td colspan="5">Tidak ada vendor pengiriman ditemukan.</td></tr>';
  } else {
    const rows = vendors.map(vendor => {
      const safeId = escapeHtml(vendor.id ?? '');
      const safeName = escapeHtml(vendor.name ?? '');
      const safeServices = escapeHtml(vendor.services ?? '') || '-';
      const safeCoverage = escapeHtml(vendor.coverage ?? '') || '-';

      const contactItems = [];
      if (vendor.pic) {
        contactItems.push(`<strong>${escapeHtml(vendor.pic)}</strong>`);
      }
      if (vendor.email) {
        const email = vendor.email.toString().trim();
        if (email) {
          contactItems.push(`<a href="mailto:${encodeURIComponent(email)}">${escapeHtml(email)}</a>`);
        }
      }
      if (vendor.phone) {
        const phoneLabel = vendor.phone.toString().trim();
        const phoneHref = formatPhoneHref(phoneLabel);
        if (phoneLabel) {
          const href = phoneHref ? escapeHtml(phoneHref) : '';
          const label = escapeHtml(phoneLabel);
          contactItems.push(href ? `<a href="tel:${href}">${label}</a>` : `<span>${label}</span>`);
        }
      }

      const contacts = createContactStack(contactItems);

      const actionButtons = [];
      if (canManage) {
        actionButtons.push(`
          <button class="icon-btn small" type="button" data-shipping-action="edit" data-id="${safeId}" title="Edit vendor">✏️</button>
        `);
        actionButtons.push(`
          <button class="icon-btn danger small" type="button" data-shipping-action="delete" data-id="${safeId}" title="Hapus vendor">🗑️</button>
        `);
      }

      if (vendor.detailUrl) {
        const detailUrl = escapeHtml(vendor.detailUrl);
        actionButtons.unshift(`<a class="btn ghost-btn small" href="${detailUrl}">Kelola Tarif</a>`);
      }

      const actionMarkup = actionButtons.map(action => action.trim()).join('');
      const actions = actionButtons.length
        ? `<div class="table-actions">${actionMarkup}</div>`
        : '<span class="table-note">Hubungi PIC</span>';

      return `
        <tr data-vendor-id="${safeId}">
          <td><strong>${safeName}</strong></td>
          <td>${safeServices}</td>
          <td>${safeCoverage}</td>
          <td>${contacts}</td>
          <td>${actions}</td>
        </tr>
      `;
    }).join('');
    tbody.innerHTML = rows;
  }

  if (countEl) {
    const suffix = vendors.length === 1 ? 'vendor' : 'vendor';
    countEl.textContent = `${vendors.length} ${suffix}`;
  }

  if (addButton) {
    if (canManage) {
      addButton.disabled = false;
      addButton.removeAttribute('aria-disabled');
      addButton.title = 'Tambah vendor pengiriman';
    } else {
      addButton.disabled = true;
      addButton.setAttribute('aria-disabled', 'true');
      addButton.title = 'Silakan login untuk menambah vendor pengiriman.';
    }
  }
}

async function initShippingPage() {
  const computeSupabaseReady = () => isSupabaseConfigured() && !getSupabaseInitializationError();
  let supabaseReady = computeSupabaseReady();

  const syncLocalWithSupabase = async () => {
    if (!computeSupabaseReady()) {
      supabaseReady = false;
      return;
    }

    supabaseReady = true;

    const localVendors = loadLocalShippingVendors();
    if (!localVendors.length) {
      return;
    }

    const remaining = [];
    for (const vendor of localVendors) {
      try {
        await upsertShippingVendorToSupabase({ ...vendor, localOnly: false });
      } catch (error) {
        console.error('Gagal menyinkronkan vendor pengiriman lokal.', error);
        remaining.push(vendor);
      }
    }

    saveLocalShippingVendors(remaining);

    if (remaining.length !== localVendors.length) {
      try {
        const refreshed = await refreshShippingVendorsFromSupabase();
        const merged = mergeShippingVendorCollections(refreshed, remaining);
        setShippingVendorCache(merged);
      } catch (error) {
        console.error('Gagal memperbarui vendor setelah sinkronisasi lokal.', error);
      }
    } else if (remaining.length) {
      const merged = mergeShippingVendorCollections(getShippingVendorsFromCache(), remaining);
      setShippingVendorCache(merged);
    }
  };

  try {
    await ensureSeeded();
    await refreshShippingVendorsFromSupabase();
    await syncLocalWithSupabase();
    supabaseReady = computeSupabaseReady();
  } catch (error) {
    console.error('Gagal memuat vendor pengiriman.', error);
    toast.show('Gagal memuat data vendor pengiriman dari Supabase.');
    const snapshot = loadShippingVendorSnapshot();
    const localOnly = loadLocalShippingVendors();
    const base = snapshot.length ? snapshot.map(vendor => ({ ...vendor })) : [];
    const fallback = mergeShippingVendorCollections(base, localOnly);
    setShippingVendorCache(fallback);
    supabaseReady = computeSupabaseReady();
  }

  renderShippingVendors();
  handleSearch(value => renderShippingVendors(value));

  if (supabaseReady) {
    document.addEventListener('entraverse:session-change', async () => {
      try {
        await refreshShippingVendorsFromSupabase();
        await syncLocalWithSupabase();
        const filter = document.getElementById('search-input')?.value ?? '';
        renderShippingVendors(filter.toString().trim().toLowerCase());
      } catch (error) {
        console.error('Gagal memperbarui vendor pengiriman setelah perubahan sesi.', error);
      }
    });
  }

  const tableBody = document.getElementById('shipping-table-body');
  const modal = document.getElementById('shipping-vendor-modal');
  const form = document.getElementById('shipping-vendor-form');
  const modalTitle = document.getElementById('shipping-vendor-modal-title');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const closeButtons = modal ? Array.from(modal.querySelectorAll('[data-close-modal]')) : [];
  const addButton = document.getElementById('add-shipping-vendor-btn');
  const nameInput = form?.querySelector('#shipping-vendor-name');
  const rupiahFieldSelectors = ['#shipping-vendor-air-rate', '#shipping-vendor-sea-rate'];
  const rupiahInputs = rupiahFieldSelectors
    .map(selector => form?.querySelector(selector))
    .filter(input => Boolean(input));

  const sanitizeRupiahDigits = value => {
    if (value === null || typeof value === 'undefined') {
      return '';
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.round(value)).toString();
    }

    if (typeof value === 'bigint') {
      return value < 0n ? '' : value.toString();
    }

    const text = value.toString();
    const digits = text.replace(/[^0-9]/g, '');
    if (!digits) {
      return '';
    }

    const normalized = digits.replace(/^0+(?=\d)/, '');
    return normalized || '0';
  };

  const formatRupiahDigits = digits => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const setRupiahInputValue = (input, value) => {
    if (!input) {
      return '';
    }

    const sanitized = sanitizeRupiahDigits(value);
    if (!sanitized) {
      delete input.dataset.numericValue;
      input.value = '';
      return '';
    }

    input.dataset.numericValue = sanitized;
    input.value = `Rp ${formatRupiahDigits(sanitized)}`;
    return sanitized;
  };

  const resetRupiahInputs = () => {
    rupiahInputs.forEach(input => {
      delete input.dataset.numericValue;
      input.value = '';
    });
  };

  const countDigitsBeforePosition = (value, position) => {
    if (!value) {
      return 0;
    }

    const slice = value.slice(0, Math.max(0, position));
    return slice.replace(/[^0-9]/g, '').length;
  };

  const findCaretPositionForDigitCount = (value, digitCount) => {
    if (!value) {
      return 0;
    }

    if (digitCount <= 0) {
      return value.startsWith('Rp ') ? 3 : 0;
    }

    let digitsSeen = 0;
    for (let index = 0; index < value.length; index += 1) {
      if (/\d/.test(value[index])) {
        digitsSeen += 1;
        if (digitsSeen === digitCount) {
          return index + 1;
        }
      }
    }

    return value.length;
  };

  const formatRupiahInputValue = input => {
    if (!input) {
      return { sanitized: '', caret: 0 };
    }

    const selectionStart = input.selectionStart ?? input.value.length;
    const digitsBefore = countDigitsBeforePosition(input.value, selectionStart);
    const sanitized = sanitizeRupiahDigits(input.value);

    if (!sanitized) {
      delete input.dataset.numericValue;
      input.value = '';
      return { sanitized: '', caret: 0 };
    }

    const formatted = `Rp ${formatRupiahDigits(sanitized)}`;
    input.dataset.numericValue = sanitized;
    input.value = formatted;

    const caret = findCaretPositionForDigitCount(formatted, digitsBefore);
    return { sanitized, caret };
  };

  const attachRupiahFormatter = input => {
    if (!input || input.readOnly) {
      return;
    }

    const handler = () => {
      const { caret } = formatRupiahInputValue(input);
      requestAnimationFrame(() => {
        const nextCaret = typeof caret === 'number' ? caret : input.value.length;
        try {
          input.setSelectionRange(nextCaret, nextCaret);
        } catch (error) {
          // Ignore selection errors on unfocused inputs.
        }
      });
    };

    input.addEventListener('input', handler);
    input.addEventListener('blur', handler);
  };

  rupiahInputs.forEach(input => {
    if (!input) return;
    if (!input.inputMode) {
      input.inputMode = 'numeric';
    }
    if (!input.autocomplete) {
      input.autocomplete = 'off';
    }
    attachRupiahFormatter(input);
  });

  const toInputValue = value => (value === null || value === undefined ? '' : value);

  const setFieldValue = (selector, value) => {
    if (!form) return;
    const field = form.querySelector(selector);
    if (field) {
      if (rupiahInputs.includes(field)) {
        setRupiahInputValue(field, value);
      } else {
        field.value = toInputValue(value);
      }
    }
  };

  const populateFormFields = vendor => {
    if (!form) return;
    form.reset();
    resetRupiahInputs();
    if (vendor) {
      form.dataset.editingId = vendor.id ?? '';
      setFieldValue('#shipping-vendor-name', vendor.name ?? '');
      setFieldValue('#shipping-vendor-services', vendor.services ?? '');
      setFieldValue('#shipping-vendor-coverage', vendor.coverage ?? '');
      setFieldValue('#shipping-vendor-pic', vendor.pic ?? '');
      setFieldValue('#shipping-vendor-email', vendor.email ?? '');
      setFieldValue('#shipping-vendor-phone', vendor.phone ?? '');
      setFieldValue('#shipping-vendor-detail-url', vendor.detailUrl ?? '');
      setFieldValue('#shipping-vendor-air-rate', vendor.airRate);
      setFieldValue('#shipping-vendor-sea-rate', vendor.seaRate);
      setFieldValue('#shipping-vendor-note', vendor.note ?? '');
    } else {
      delete form.dataset.editingId;
    }
  };

  const findVendorById = id => {
    if (!id) return null;
    return getShippingVendorsFromCache().find(vendor => vendor.id === id) || null;
  };

  const resetSubmitState = () => {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
    }
  };

  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (form) {
      populateFormFields(null);
    }
    resetSubmitState();
  };

  const focusNameField = () => {
    if (!nameInput) return;
    requestAnimationFrame(() => {
      nameInput.focus({ preventScroll: true });
      nameInput.select?.();
    });
  };

  const openModal = () => {
    if (!requireCatalogManager('Silakan login untuk menambah vendor pengiriman.')) {
      return;
    }
    if (modalTitle) {
      modalTitle.textContent = 'Tambah Vendor Pengiriman';
    }
    if (submitBtn) {
      submitBtn.textContent = 'Simpan';
    }
    populateFormFields(null);
    if (modal) {
      modal.hidden = false;
      document.body.classList.add('modal-open');
      focusNameField();
    }
  };

  const openEditModal = vendor => {
    if (!requireCatalogManager('Silakan login untuk mengelola vendor pengiriman.')) {
      return;
    }
    if (!vendor) {
      toast.show('Data vendor pengiriman tidak ditemukan.');
      return;
    }
    if (modalTitle) {
      modalTitle.textContent = 'Edit Vendor Pengiriman';
    }
    if (submitBtn) {
      submitBtn.textContent = 'Perbarui';
    }
    populateFormFields(vendor);
    if (modal) {
      modal.hidden = false;
      document.body.classList.add('modal-open');
      focusNameField();
    }
  };

  addButton?.addEventListener('click', openModal);
  closeButtons.forEach(button => button.addEventListener('click', closeModal));

  if (modal) {
    modal.addEventListener('click', event => {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !modal.hidden) {
        closeModal();
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async event => {
      event.preventDefault();

      if (!requireCatalogManager('Silakan login untuk menambah vendor pengiriman.')) {
        return;
      }

      const formData = new FormData(form);
      const name = (formData.get('name') ?? '').toString().trim();
      const services = (formData.get('services') ?? '').toString().trim();
      const coverage = (formData.get('coverage') ?? '').toString().trim();
      const pic = (formData.get('pic') ?? '').toString().trim();
      const email = (formData.get('email') ?? '').toString().trim();
      const phone = (formData.get('phone') ?? '').toString().trim();
      const detailUrl = (formData.get('detailUrl') ?? '').toString().trim();
      const airRate = parseNumericValue(formData.get('airRate'));
      const seaRate = parseNumericValue(formData.get('seaRate'));
      const note = (formData.get('note') ?? '').toString().trim();

      if (!name) {
        toast.show('Nama vendor wajib diisi.');
        focusNameField();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
      }

      const timestamp = Date.now();
      const editingId = form.dataset.editingId;
      const vendorId = editingId || createUuid();
      const existingVendor = editingId ? findVendorById(vendorId) : null;
      const createdAt = existingVendor?.createdAt ?? timestamp;

      const payload = {
        id: vendorId,
        name,
        services,
        coverage,
        pic,
        email,
        phone,
        detailUrl,
        airRate,
        seaRate,
        note,
        createdAt,
        updatedAt: timestamp
      };

      const successMessage = editingId
        ? 'Vendor pengiriman berhasil diperbarui.'
        : 'Vendor pengiriman berhasil disimpan.';
      const localFallbackMessage = editingId
        ? 'Perubahan vendor pengiriman disimpan secara lokal. Akan tersinkron saat Supabase tersedia.'
        : 'Vendor pengiriman disimpan secara lokal. Akan tersinkron saat Supabase tersedia.';

      const persistLocally = message => {
        const localVendor = sanitizeShippingVendor({ ...payload, localOnly: true }, { localOnly: true });
        const currentLocal = loadLocalShippingVendors().filter(vendor => vendor.id !== vendorId);
        const updatedLocal = mergeShippingVendorCollections(currentLocal, [localVendor]);
        saveLocalShippingVendors(updatedLocal);
        const mergedCache = mergeShippingVendorCollections(getShippingVendorsFromCache(), [localVendor]);
        setShippingVendorCache(mergedCache);
        const filter = document.getElementById('search-input')?.value ?? '';
        renderShippingVendors(filter.toString().trim().toLowerCase());
        toast.show(message ?? localFallbackMessage);
        closeModal();
      };

      try {
        supabaseReady = computeSupabaseReady();
        if (!supabaseReady) {
          persistLocally(
            'Supabase tidak dapat diakses. Data vendor disimpan secara lokal dan akan tersinkron otomatis.'
          );
          return;
        }

        await upsertShippingVendorToSupabase(payload);
        await refreshShippingVendorsFromSupabase();
        await syncLocalWithSupabase();
        const filter = document.getElementById('search-input')?.value ?? '';
        renderShippingVendors(filter.toString().trim().toLowerCase());
        toast.show(successMessage);
        closeModal();
      } catch (error) {
        console.error('Gagal menyimpan vendor pengiriman.', error);
        persistLocally(
          'Supabase tidak dapat diakses. Data vendor disimpan secara lokal dan akan tersinkron otomatis.'
        );
      } finally {
        resetSubmitState();
      }
    });
  }

  if (tableBody) {
    tableBody.addEventListener('click', async event => {
      const button = event.target.closest('[data-shipping-action]');
      if (!button) return;

      const action = button.dataset.shippingAction;
      const id = button.dataset.id;
      if (!action || !id) return;

      if (!requireCatalogManager('Silakan login untuk mengelola vendor pengiriman.')) {
        return;
      }

      if (action === 'edit') {
        const vendor = findVendorById(id);
        openEditModal(vendor);
        return;
      }

      if (action === 'delete') {
        if (!confirm('Hapus vendor pengiriman ini?')) {
          return;
        }

        button.disabled = true;
        button.classList.add('is-loading');

        try {
          supabaseReady = computeSupabaseReady();
          if (!supabaseReady) {
            const localVendors = loadLocalShippingVendors();
            const existsLocally = localVendors.some(vendor => vendor.id === id);
            if (existsLocally) {
              const updatedLocal = localVendors.filter(vendor => vendor.id !== id);
              saveLocalShippingVendors(updatedLocal);
              const updatedCache = getShippingVendorsFromCache().filter(vendor => vendor.id !== id);
              setShippingVendorCache(updatedCache);
              const filter = document.getElementById('search-input')?.value ?? '';
              renderShippingVendors(filter.toString().trim().toLowerCase());
              toast.show('Vendor pengiriman lokal dihapus. Akan tersinkron saat Supabase tersedia.');
            } else {
              toast.show('Supabase tidak dapat diakses. Hanya vendor lokal yang dapat dihapus saat ini.');
            }
            return;
          }

          await deleteShippingVendorFromSupabase(id);
          await refreshShippingVendorsFromSupabase();
          await syncLocalWithSupabase();
          const filter = document.getElementById('search-input')?.value ?? '';
          renderShippingVendors(filter.toString().trim().toLowerCase());
          toast.show('Vendor pengiriman berhasil dihapus.');
        } catch (error) {
          console.error('Gagal menghapus vendor pengiriman.', error);
          const localVendors = loadLocalShippingVendors();
          const existsLocally = localVendors.some(vendor => vendor.id === id);
          if (existsLocally) {
            const updatedLocal = localVendors.filter(vendor => vendor.id !== id);
            saveLocalShippingVendors(updatedLocal);
            const updatedCache = getShippingVendorsFromCache().filter(vendor => vendor.id !== id);
            setShippingVendorCache(updatedCache);
            const filter = document.getElementById('search-input')?.value ?? '';
            renderShippingVendors(filter.toString().trim().toLowerCase());
            toast.show('Vendor pengiriman dihapus secara lokal. Akan tersinkron saat Supabase tersedia.');
          } else {
            toast.show('Gagal menghapus vendor pengiriman. Coba lagi.');
          }
        } finally {
          button.disabled = false;
          button.classList.remove('is-loading');
        }
      }
    });
  }
}

function renderCategories(filterText = '') {
  const tbody = document.getElementById('category-table-body');
  if (!tbody) return;

  const categories = getCategories();
  const canManage = canManageCatalog();
  const normalized = (filterText ?? '').toString().trim().toLowerCase();
  const filtered = categories.filter(category => {
    if (!normalized) return true;
    return (
      (category.name ?? '').toString().toLowerCase().includes(normalized) ||
      (category.note ?? '').toString().toLowerCase().includes(normalized)
    );
  });

  tbody.innerHTML = '';

  if (!filtered.length) {
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'empty-state';
    emptyRow.innerHTML = '<td colspan="6">Tidak ada kategori ditemukan.</td>';
    tbody.appendChild(emptyRow);
  } else {
    filtered.forEach(category => {
      const row = document.createElement('tr');
      const safeId = escapeHtml(category.id ?? '');
      row.dataset.categoryId = category.id ?? '';

      const manageDisabledAttr = canManage ? '' : 'disabled aria-disabled="true"';
      const editTitle = canManage ? 'Edit kategori' : 'Login untuk mengedit kategori';
      const deleteTitle = canManage ? 'Hapus kategori' : 'Login untuk menghapus kategori';
      row.innerHTML = `
        <td><strong>${escapeHtml(category.name ?? '')}</strong></td>
        <td><span class="fee-chip">${escapeHtml(category.fees?.marketplace ?? '-')}</span></td>
        <td><span class="fee-chip">${escapeHtml(category.fees?.shopee ?? '-')}</span></td>
        <td><span class="fee-chip">${escapeHtml(category.fees?.entraverse ?? '-')}</span></td>
        <td class="category-margin"><span class="fee-chip fee-chip--highlight">${escapeHtml(category.margin?.value ?? '-')}</span></td>
        <td>
          <div class="table-actions">
            <button class="icon-btn small" type="button" data-category-action="edit" data-id="${safeId}" title="${editTitle}" ${manageDisabledAttr}>✏️</button>
            <button class="icon-btn danger small" type="button" data-category-action="delete" data-id="${safeId}" title="${deleteTitle}" ${manageDisabledAttr}>🗑️</button>
          </div>
        </td>
      `;

      tbody.appendChild(row);
    });
  }

  const countEl = document.getElementById('category-count');
  const metaEl = document.getElementById('category-meta');
  if (countEl) {
    countEl.textContent = `${filtered.length} kategori`;
  }
  if (metaEl) {
    metaEl.textContent = filtered.length
      ? `Menampilkan ${filtered.length} dari ${categories.length} kategori`
      : 'Tidak ada kategori ditemukan';
  }
}

function clampProductPage(page, totalPages) {
  const maxPage = Math.max(1, Number.isFinite(totalPages) ? Math.floor(totalPages) : Number(totalPages) || 1);
  const numeric = Number(page);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  const floored = Math.floor(numeric);
  if (!Number.isFinite(floored) || floored < 1) {
    return 1;
  }
  return Math.min(floored, maxPage);
}

function computeProductPageNumbers(totalPages, currentPage) {
  const maxPages = Math.max(1, Math.floor(totalPages));
  const current = clampProductPage(currentPage, maxPages);

  if (maxPages <= 7) {
    return Array.from({ length: maxPages }, (_, index) => index + 1);
  }

  const pages = [1];
  let start = Math.max(2, current - 1);
  let end = Math.min(maxPages - 1, current + 1);

  if (current <= 3) {
    start = 2;
    end = 4;
  } else if (current >= maxPages - 2) {
    start = maxPages - 3;
    end = maxPages - 1;
  }

  start = Math.max(2, Math.min(start, maxPages - 1));
  end = Math.max(start, Math.min(end, maxPages - 1));

  if (start > 2) {
    pages.push('ellipsis');
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < maxPages - 1) {
    pages.push('ellipsis');
  }

  pages.push(maxPages);
  return pages;
}

function goToProductPage(page) {
  const numeric = Number(page);
  if (!Number.isFinite(numeric)) {
    return;
  }
  PRODUCT_PAGINATION_STATE.currentPage = clampProductPage(numeric, PRODUCT_PAGINATION_STATE.totalPages);
  renderProducts(PRODUCT_PAGINATION_STATE.lastFilter, { forcePage: PRODUCT_PAGINATION_STATE.currentPage });
}

function renderProductPaginationControls(totalFiltered, totalPages) {
  const container = document.getElementById('product-pagination');
  if (!container) return;

  const pageSize = PRODUCT_PAGINATION_STATE.pageSize;
  if (!totalFiltered || totalFiltered <= pageSize) {
    container.innerHTML = '';
    container.hidden = true;
    return;
  }

  const maxPages = Math.max(1, Math.floor(totalPages));
  const currentPage = clampProductPage(PRODUCT_PAGINATION_STATE.currentPage, maxPages);
  PRODUCT_PAGINATION_STATE.currentPage = currentPage;

  container.hidden = false;
  container.innerHTML = '';

  const createButton = (label, page, { disabled = false, active = false, ariaLabel = null } = {}) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pagination__button';
    if (active) {
      button.classList.add('pagination__button--active');
      button.setAttribute('aria-current', 'page');
    }
    if (ariaLabel) {
      button.setAttribute('aria-label', ariaLabel);
    }
    if (disabled) {
      button.disabled = true;
    } else if (!active) {
      button.addEventListener('click', () => {
        goToProductPage(page);
      });
    }
    button.textContent = label;
    return button;
  };

  const prevPage = Math.max(1, currentPage - 1);
  container.appendChild(
    createButton('‹', prevPage, {
      disabled: currentPage === 1,
      ariaLabel: 'Halaman sebelumnya'
    })
  );

  const pageEntries = computeProductPageNumbers(maxPages, currentPage);
  pageEntries.forEach(entry => {
    if (entry === 'ellipsis') {
      const span = document.createElement('span');
      span.className = 'pagination__ellipsis';
      span.textContent = '…';
      container.appendChild(span);
      return;
    }

    const pageNumber = Number(entry);
    container.appendChild(
      createButton(String(pageNumber), pageNumber, {
        active: pageNumber === currentPage,
        ariaLabel: `Halaman ${pageNumber}`
      })
    );
  });

  const nextPage = Math.min(maxPages, currentPage + 1);
  container.appendChild(
    createButton('›', nextPage, {
      disabled: currentPage >= maxPages,
      ariaLabel: 'Halaman berikutnya'
    })
  );
}

function compareProductNames(nameA, nameB) {
  const left = (nameA ?? '').toString().trim();
  const right = (nameB ?? '').toString().trim();

  if (PRODUCT_NAME_COLLATOR) {
    return PRODUCT_NAME_COLLATOR.compare(left, right);
  }

  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortProductsByState(products) {
  if (!Array.isArray(products)) {
    return [];
  }

  const sorted = [...products];
  if (!sorted.length) {
    return sorted;
  }

  if (PRODUCT_SORT_STATE.field === 'name') {
    sorted.sort((a, b) => {
      const comparison = compareProductNames(a?.name, b?.name);
      return PRODUCT_SORT_STATE.direction === 'asc' ? comparison : -comparison;
    });
  }

  return sorted;
}

function getSortDirectionLabel(direction) {
  return direction === 'desc' ? 'Z-A' : 'A-Z';
}

function updateProductSortIndicator() {
  const sortButton = document.querySelector('[data-sort="product-name"]');
  if (!sortButton) {
    return;
  }

  const direction = PRODUCT_SORT_STATE.direction;
  sortButton.dataset.sortActive = 'true';
  sortButton.dataset.sortDirection = direction;
  sortButton.setAttribute('aria-label', `Urutkan Nama Produk (${getSortDirectionLabel(direction)})`);
  sortButton.setAttribute('aria-pressed', 'true');

  const headerCell = sortButton.closest('th');
  if (headerCell) {
    headerCell.setAttribute('aria-sort', direction === 'desc' ? 'descending' : 'ascending');
  }
}

function renderProductTableMessage(tbody, message, { className = 'empty-state' } = {}) {
  if (!tbody) {
    return;
  }

  const row = document.createElement('tr');
  if (className) {
    row.className = className;
  }
  const cell = document.createElement('td');
  cell.colSpan = 5;
  cell.textContent = message;
  row.appendChild(cell);
  tbody.innerHTML = '';
  tbody.appendChild(row);
}

async function fetchProductsPage({ filter = '', page = 1, perPage = PRODUCT_PAGINATION_STATE.pageSize } = {}) {
  const normalizedFilter = (filter ?? '').toString().trim();
  const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
  const safePerPage = Math.max(1, Number.isFinite(perPage) ? Math.floor(perPage) : PRODUCT_PAGINATION_STATE.pageSize);

  if (isSupabaseConfigured()) {
    try {
      await ensureSupabase();
      const client = getSupabaseClient();
      const from = (safePage - 1) * safePerPage;
      const to = from + safePerPage - 1;
      let query = client
        .from(SUPABASE_TABLES.products)
        .select('*', { count: 'exact' });

      if (normalizedFilter) {
        const filterValue = `%${normalizedFilter}%`;
        query = query.or(`name.ilike.${filterValue},brand.ilike.${filterValue}`);
      }

      if (PRODUCT_SORT_STATE.field === 'name') {
        const ascending = PRODUCT_SORT_STATE.direction !== 'desc';
        query = query.order('name', { ascending, nullsFirst: ascending });
      } else {
        query = query.order('created_at', { ascending: true });
      }

      const { data, error, count } = await query.range(from, to);

      if (error) {
        throw error;
      }

      const products = (data ?? []).map(mapSupabaseProduct).filter(Boolean);
      mergeProductsIntoCache(products);

      return {
        items: products,
        total: typeof count === 'number' && count >= 0 ? count : products.length,
        source: 'supabase'
      };
    } catch (error) {
      console.warn('Gagal memuat produk dari Supabase, menggunakan data lokal.', error);
    }
  }

  const products = Array.isArray(getProductsFromCache()) ? getProductsFromCache() : [];
  const normalizedProducts = sortProductsByState(
    products.filter(product => {
      if (!normalizedFilter) {
        return true;
      }
      const name = (product?.name ?? '').toString().toLowerCase();
      const brand = (product?.brand ?? '').toString().toLowerCase();
      const filterValue = normalizedFilter.toLowerCase();
      return name.includes(filterValue) || brand.includes(filterValue);
    })
  );

  const startIndex = normalizedProducts.length ? (safePage - 1) * safePerPage : 0;
  const paginated = normalizedProducts.slice(startIndex, startIndex + safePerPage);

  return {
    items: paginated,
    total: normalizedProducts.length,
    source: 'local'
  };
}

function renderProducts(filterText = '', options = {}) {
  const tbody = document.getElementById('product-table-body');
  if (!tbody) return;

  const normalizedOptions = options && typeof options === 'object' ? options : {};
  const resetPage = Boolean(normalizedOptions.resetPage);
  const forcePage = normalizedOptions.forcePage ?? null;

  const canManage = canManageCatalog();
  const normalizedFilter = (filterText ?? '').toString().trim();

  const filterChanged = normalizedFilter !== PRODUCT_PAGINATION_STATE.lastFilter;
  if (filterChanged || resetPage) {
    PRODUCT_PAGINATION_STATE.currentPage = 1;
  }
  PRODUCT_PAGINATION_STATE.lastFilter = normalizedFilter;

  if (forcePage !== null && forcePage !== undefined) {
    PRODUCT_PAGINATION_STATE.currentPage = clampProductPage(forcePage, PRODUCT_PAGINATION_STATE.totalPages);
  }

  const requestId = ++productRenderRequestToken;
  renderProductTableMessage(tbody, 'Memuat produk…', { className: 'loading-state' });

  const pageSize = PRODUCT_PAGINATION_STATE.pageSize;
  const requestedPage = PRODUCT_PAGINATION_STATE.currentPage;

  fetchProductsPage({ filter: normalizedFilter, page: requestedPage, perPage: pageSize })
    .then(result => {
      if (requestId !== productRenderRequestToken) {
        return;
      }

      const items = Array.isArray(result?.items) ? result.items : [];
      const totalFiltered = Number.isFinite(result?.total) && result.total >= 0 ? result.total : items.length;
      const totalPages = totalFiltered > 0 ? Math.ceil(totalFiltered / pageSize) : 1;
      PRODUCT_PAGINATION_STATE.totalFiltered = totalFiltered;
      PRODUCT_PAGINATION_STATE.totalPages = totalPages;
      const clampedPage = clampProductPage(requestedPage, totalPages);

      if (clampedPage !== requestedPage) {
        PRODUCT_PAGINATION_STATE.currentPage = clampedPage;
        renderProducts(normalizedFilter, { forcePage: clampedPage });
        return;
      }

      currentProductPageItems = items;
      PRODUCT_PAGINATION_STATE.currentPage = clampedPage;
      if (!normalizedFilter) {
        PRODUCT_PAGINATION_STATE.totalItems = totalFiltered;
      }

      updateProductSortIndicator();

      tbody.innerHTML = '';

      if (!items.length) {
        renderProductTableMessage(
          tbody,
          normalizedFilter ? 'Tidak ada produk yang cocok dengan pencarian.' : 'Tidak ada produk ditemukan.'
        );
      } else {
        items.forEach(product => {
          const row = document.createElement('tr');
          const firstPhoto = Array.isArray(product.photos) && product.photos.length ? product.photos[0] : null;
          const safeName = escapeHtml(product.name ?? '');
          const safeBrand = product.brand ? escapeHtml(product.brand) : '';
          const skuValue = getPrimaryProductSku(product);
      const safeSku = skuValue ? escapeHtml(skuValue) : '';
      const rawStock = product.stock;
      const normalizedStock = rawStock === null || rawStock === undefined ? '' : String(rawStock).trim();
      const safeStock = normalizedStock ? escapeHtml(normalizedStock) : '';
      const variantStockLines = Array.isArray(product.variantPricing)
        ? product.variantPricing
            .map(variant => {
              const variantStockRaw = variant?.stock;
              const normalizedVariantStock =
                variantStockRaw === null || variantStockRaw === undefined ? '' : String(variantStockRaw).trim();
              if (!normalizedVariantStock) {
                return null;
              }

              const variantValues = Array.isArray(variant?.variants)
                ? variant.variants
                    .map(option => {
                      const optionName = (option?.name ?? '').toString().trim();
                      const optionValue = (option?.value ?? '').toString().trim();
                      if (optionName && optionValue) {
                        return `${escapeHtml(optionName)}: ${escapeHtml(optionValue)}`;
                      }
                      if (optionValue) {
                        return escapeHtml(optionValue);
                      }
                      return '';
                    })
                    .filter(Boolean)
                : [];

              const variantLabel = variantValues.length ? variantValues.join(' · ') : 'Varian';
              return `<span class="product-meta product-variant-stock">${variantLabel} — ${escapeHtml(normalizedVariantStock)}</span>`;
            })
            .filter(Boolean)
        : [];
      const variantStockHtml = variantStockLines.join('');

      const normalizedMekariStatus = normalizeMekariStatus(product.mekariStatus);
      const statusState = normalizedMekariStatus.state ?? 'pending';
      const statusLabel = getMekariStatusLabel(statusState);
      const formattedSync = formatDateTimeForDisplay(normalizedMekariStatus.lastSyncedAt);
      const mekariIntegration = findIntegrationByName(MEKARI_INTEGRATION_NAME) ?? mekariIntegrationCache;
      const mekariLogoUrl =
        sanitizeIntegrationLogo(mekariIntegration?.logoUrl) || MEKARI_DEFAULT_LOGO_URL;

      const badgeLabelParts = [];
      if (statusLabel) {
        badgeLabelParts.push(`Status sinkronisasi Mekari: ${statusLabel}`);
      }
      if (statusState === 'synced' && formattedSync) {
        badgeLabelParts.push(`Terakhir sinkron pada ${formattedSync}`);
      }
      const statusMessage = (normalizedMekariStatus.message ?? '').toString().trim();
      if (statusMessage && statusMessage !== statusLabel) {
        badgeLabelParts.push(statusMessage);
      }
      const statusError = (normalizedMekariStatus.error ?? '').toString().trim();
      if (statusError) {
        badgeLabelParts.push(statusError);
      }

      const badgeAriaLabel =
        badgeLabelParts.length > 0
          ? badgeLabelParts.join('. ')
          : 'Status sinkronisasi Mekari tidak tersedia';

      const mekariStatusHtml = `
        <div class="mekari-status" data-state="${escapeHtml(statusState)}">
          <span class="mekari-status__badge" role="img" aria-label="${escapeHtml(badgeAriaLabel)}">
            <img src="${escapeHtml(mekariLogoUrl)}" alt="" aria-hidden="true">
          </span>
        </div>
      `;

      const manageDisabledAttr = canManage ? '' : 'disabled aria-disabled="true"';
      const editTitle = canManage ? 'Edit' : 'Login untuk mengedit produk';
      const deleteTitle = canManage ? 'Hapus' : 'Login untuk menghapus produk';

      row.innerHTML = `
        <td>
          <div class="photo-preview">
            ${firstPhoto ? `<img src="${firstPhoto}" alt="${safeName}">` : 'No Photo'}
          </div>
        </td>
        <td>
          <div class="product-cell">
            <strong>${safeName}</strong>
            ${safeSku ? `<span class="product-meta product-sku">SKU: ${safeSku}</span>` : ''}
            ${variantStockHtml}
            ${safeStock ? `<span class="product-meta product-stock">Stok: ${safeStock}</span>` : ''}
            ${safeBrand ? `<span class="product-meta">${safeBrand}</span>` : ''}
          </div>
        </td>
        <td>${mekariStatusHtml}</td>
        <td>
          <label class="switch">
            <input type="checkbox" ${product.tradeIn ? 'checked' : ''} data-action="toggle-trade" data-id="${product.id}" ${canManage ? '' : 'disabled'}>
            <span class="slider"></span>
          </label>
        </td>
        <td>
          <div class="table-actions">
            <button class="icon-btn small" type="button" data-action="edit" data-id="${product.id}" title="${editTitle}" ${manageDisabledAttr}>✏️</button>
            <button class="icon-btn small" type="button" data-action="view-variants" data-id="${product.id}" title="Lihat varian">👁️</button>
            <button class="icon-btn danger small" type="button" data-action="delete" data-id="${product.id}" title="${deleteTitle}" ${manageDisabledAttr}>🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
        });
      }

      const countEl = document.getElementById('product-count');
      const metaEl = document.getElementById('table-meta');
      const overallTotal = PRODUCT_PAGINATION_STATE.totalItems || totalFiltered;
      const startIndex = totalFiltered ? (clampedPage - 1) * pageSize : 0;
      const lastItemIndex = totalFiltered ? Math.min(totalFiltered, startIndex + items.length) : 0;

      if (countEl) {
        if (normalizedFilter) {
          countEl.textContent = `${totalFiltered} produk`;
        } else {
          countEl.textContent = `${overallTotal} produk`;
        }
      }

      if (metaEl) {
        if (!totalFiltered) {
          metaEl.textContent = normalizedFilter
            ? 'Tidak ada produk yang cocok dengan pencarian.'
            : 'Tidak ada produk ditemukan.';
        } else {
          const scopeText = normalizedFilter ? `${totalFiltered} produk cocok` : `${overallTotal} produk`;
          metaEl.textContent = `Menampilkan ${startIndex + 1}-${lastItemIndex} dari ${scopeText}`;
        }
      }

      renderProductPaginationControls(totalFiltered, totalPages);
    })
    .catch(error => {
      if (requestId !== productRenderRequestToken) {
        return;
      }
      console.error('Gagal merender produk.', error);
      currentProductPageItems = [];
      PRODUCT_PAGINATION_STATE.totalFiltered = 0;
      PRODUCT_PAGINATION_STATE.totalPages = 1;
      renderProductTableMessage(tbody, 'Gagal memuat produk. Coba lagi.');
      renderProductPaginationControls(0, 1);
    });
}

function handleProductActions() {
  const tbody = document.getElementById('product-table-body');
  if (!tbody) return;

  const getCurrentFilter = () => {
    const searchInput = document.getElementById('search-input');
    return (searchInput?.value ?? '').toString().trim().toLowerCase();
  };

  const sortButton = document.querySelector('[data-sort="product-name"]');
  if (sortButton) {
    sortButton.addEventListener('click', () => {
      PRODUCT_SORT_STATE.field = 'name';
      PRODUCT_SORT_STATE.direction = PRODUCT_SORT_STATE.direction === 'asc' ? 'desc' : 'asc';
      updateProductSortIndicator();
      renderProducts(getCurrentFilter(), { resetPage: false });
    });
  }

  const getCurrentPageProducts = () => {
    if (currentProductPageItems.length) {
      return currentProductPageItems;
    }
    const cached = getProductsFromCache();
    return Array.isArray(cached) ? cached : [];
  };

  tbody.addEventListener('click', async event => {
    const target = event.target.closest('button');
    if (!target) return;

    const id = target.dataset.id;
    if (!id) return;

    const products = getCurrentPageProducts();
    const productIndex = products.findIndex(p => p.id === id);
    if (productIndex === -1) return;

    if (target.dataset.action === 'edit') {
      if (!requireCatalogManager('Silakan login untuk mengedit produk.')) {
        return;
      }
      window.location.href = `add-product.html?id=${id}`;
      return;
    }

    if (target.dataset.action === 'delete') {
      if (!requireCatalogManager('Silakan login untuk menghapus produk.')) {
        return;
      }
      if (!confirm('Hapus produk ini?')) {
        return;
      }
      try {
        await deleteProductFromSupabase(id);
        await refreshProductsFromSupabase();
        toast.show('Produk berhasil dihapus.');
        renderProducts(getCurrentFilter());
      } catch (error) {
        console.error('Gagal menghapus produk.', error);
        toast.show('Gagal menghapus produk, coba lagi.');
      }
      return;
    }

    if (target.dataset.action === 'view-variants') {
      const product = products[productIndex];
      const normalizedVariants = normalizeVariants(product.variants);
      const variantText = normalizedVariants.length
        ? normalizedVariants.map(v => `• ${v.name}: ${v.options.join(', ')}`).join('\n')
        : 'Belum ada varian yang disimpan.';
      alert(`Varian ${product.name}:\n${variantText}`);
    }
  });

  tbody.addEventListener('change', async event => {
    const input = event.target.closest('input[data-action="toggle-trade"]');
    if (!input) return;

    if (!requireCatalogManager('Silakan login untuk memperbarui status trade-in.')) {
      input.checked = !input.checked;
      return;
    }

    const id = input.dataset.id;
    const products = getCurrentPageProducts();
    const product = products.find(p => p.id === id);
    if (!product) {
      return;
    }

    input.disabled = true;

    try {
      const updated = { ...product, tradeIn: input.checked, updatedAt: Date.now() };
      await upsertProductToSupabase(updated);
      await refreshProductsFromSupabase();
      toast.show(input.checked ? 'Trade-in diaktifkan.' : 'Trade-in dimatikan.');
      renderProducts(getCurrentFilter());
    } catch (error) {
      console.error('Gagal memperbarui status trade-in.', error);
      input.checked = !input.checked;
      toast.show('Gagal memperbarui status trade-in. Coba lagi.');
    } finally {
      input.disabled = false;
    }
  });
}

function handleCategoryActions() {
  const addButton = document.getElementById('add-category-btn');
  const modal = document.getElementById('category-modal');
  const form = document.getElementById('category-form');
  const modalTitle = document.getElementById('category-modal-title');
  const tableBody = document.getElementById('category-table-body');
  if (!addButton || !modal || !form || !modalTitle || !tableBody) return;

  const closeButtons = modal.querySelectorAll('[data-close-modal]');
  const nameInput = form.querySelector('#category-name');
  const noteInput = form.querySelector('#category-note');
  const marketplaceInput = form.querySelector('#category-fee-marketplace');
  const shopeeInput = form.querySelector('#category-fee-shopee');
  const entraverseInput = form.querySelector('#category-fee-entraverse');
  const marginValueInput = form.querySelector('#category-margin-value');
  const submitBtn = form.querySelector('button[type="submit"]');
  const searchInput = document.getElementById('search-input');

  const getCurrentFilter = () => (searchInput?.value ?? '').toString();

  const updateAddButtonState = () => {
    const canManage = canManageCatalog();
    if (canManage) {
      addButton.classList.remove('is-disabled');
      addButton.removeAttribute('aria-disabled');
      addButton.removeAttribute('tabindex');
    } else {
      addButton.classList.add('is-disabled');
      addButton.setAttribute('aria-disabled', 'true');
      addButton.setAttribute('tabindex', '-1');
    }
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    form.reset();
    delete form.dataset.editingId;
  };

  const fillForm = category => {
    if (!category) {
      form.reset();
      return;
    }

    if (nameInput) nameInput.value = category.name ?? '';
    if (noteInput) noteInput.value = category.note ?? '';
    if (marketplaceInput) marketplaceInput.value = category.fees?.marketplace ?? '';
    if (shopeeInput) shopeeInput.value = category.fees?.shopee ?? '';
    if (entraverseInput) entraverseInput.value = category.fees?.entraverse ?? '';
    if (marginValueInput) marginValueInput.value = category.margin?.value ?? '';
  };

  const focusNameField = () => {
    if (!nameInput) return;
    requestAnimationFrame(() => {
      nameInput.focus({ preventScroll: true });
      nameInput.select?.();
    });
  };

  const openModal = category => {
    const isEditing = Boolean(category);
    form.reset();
    if (isEditing) {
      form.dataset.editingId = category.id;
      modalTitle.textContent = 'Edit Kategori';
      if (submitBtn) submitBtn.textContent = 'Perbarui';
      fillForm(category);
    } else {
      delete form.dataset.editingId;
      modalTitle.textContent = 'Tambah Kategori';
      if (submitBtn) submitBtn.textContent = 'Simpan';
    }
    modal.hidden = false;
    document.body.classList.add('modal-open');
    focusNameField();
  };

  const handleEscape = event => {
    if (event.key === 'Escape' && !modal.hidden) {
      closeModal();
    }
  };

  addButton.addEventListener('click', () => {
    if (!requireCatalogManager('Silakan login untuk menambah kategori.')) {
      return;
    }
    openModal();
  });
  closeButtons.forEach(button => button.addEventListener('click', closeModal));
  document.addEventListener('keydown', handleEscape);
  modal.addEventListener('click', event => {
    if (event.target === modal) {
      closeModal();
    }
  });

  tableBody.addEventListener('click', async event => {
    const button = event.target.closest('[data-category-action]');
    if (!button) return;

    const id = button.dataset.id;
    if (!id) return;

    if (!requireCatalogManager('Silakan login untuk mengelola kategori.')) {
      return;
    }

    if (button.dataset.categoryAction === 'edit') {
      const categories = getCategories();
      const category = categories.find(item => item.id === id);
      if (!category) {
        toast.show('Kategori tidak ditemukan.');
        renderCategories(getCurrentFilter());
        return;
      }
      openModal(category);
      return;
    }

    if (button.dataset.categoryAction === 'delete') {
      if (!confirm('Hapus kategori ini?')) {
        return;
      }
      try {
        await deleteCategoryFromSupabase(id);
        await refreshCategoriesFromSupabase();
        toast.show('Kategori berhasil dihapus.');
        renderCategories(getCurrentFilter());
      } catch (error) {
        console.error('Gagal menghapus kategori.', error);
        toast.show('Gagal menghapus kategori. Coba lagi.');
      }
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();

    if (!requireCatalogManager('Silakan login untuk menyimpan kategori.')) {
      return;
    }

    const formData = new FormData(form);
    const name = (formData.get('name') ?? '').toString().trim();
    const note = (formData.get('note') ?? '').toString().trim();
    const feeMarketplace = (formData.get('feeMarketplace') ?? '').toString().trim();
    const feeShopee = (formData.get('feeShopee') ?? '').toString().trim();
    const feeEntraverse = (formData.get('feeEntraverse') ?? '').toString().trim();
    const marginValue = (formData.get('marginValue') ?? '').toString().trim();

    if (!name) {
      toast.show('Nama kategori wajib diisi.');
      nameInput?.focus();
      return;
    }

    const categories = getCategories();
    const editingId = form.dataset.editingId;
    const normalizedName = name.toLowerCase();
    const hasDuplicate = categories.some(category =>
      category.name?.toLowerCase() === normalizedName && category.id !== editingId
    );

    if (hasDuplicate) {
      toast.show('Nama kategori sudah digunakan.');
      nameInput?.focus();
      return;
    }

    const existingCategory = editingId
      ? categories.find(category => category.id === editingId)
      : null;

    if (editingId && !existingCategory) {
      toast.show('Kategori tidak ditemukan.');
      await refreshCategoriesFromSupabase();
      renderCategories(getCurrentFilter());
      return;
    }

    const payload = {
      id: editingId || crypto.randomUUID(),
      name,
      note,
      fees: {
        marketplace: feeMarketplace,
        shopee: feeShopee,
        entraverse: feeEntraverse
      },
      margin: {
        value: marginValue,
        note: existingCategory?.margin?.note ?? ''
      }
    };

    const timestamp = Date.now();
    if (existingCategory) {
      payload.createdAt = existingCategory.createdAt ?? timestamp;
      payload.updatedAt = timestamp;
    } else {
      payload.createdAt = timestamp;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
    }

    try {
      await upsertCategoryToSupabase(payload);
      await refreshCategoriesFromSupabase();
      toast.show(editingId ? 'Kategori berhasil diperbarui.' : 'Kategori berhasil ditambahkan.');
      closeModal();
      renderCategories(getCurrentFilter());
    } catch (error) {
      console.error('Gagal menyimpan kategori.', error);
      toast.show('Gagal menyimpan kategori. Coba lagi.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
    }
  });

  updateAddButtonState();
  document.addEventListener('entraverse:session-change', () => {
    updateAddButtonState();
    renderCategories(getCurrentFilter());
  });
}

function handleSearch(callback) {
  const input = document.getElementById('search-input');
  if (!input || typeof callback !== 'function') return;

  const triggerSearch = value => {
    callback((value ?? '').toString().trim().toLowerCase());
  };

  const form = input.closest('form');

  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      triggerSearch(input.value);
    });
  } else {
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      triggerSearch(event.target?.value ?? input.value);
    });
  }

  if (input.value) {
    triggerSearch(input.value);
  }
}

function handleSync() {
  const button = document.getElementById('sync-btn');
  if (!button) return;

  const mekariLogoElement = button.querySelector('[data-mekari-logo]');
  const normalizedMekariName = MEKARI_INTEGRATION_NAME.toLowerCase();
  const updateMekariLogo = (integrationsList = null) => {
    if (!mekariLogoElement) {
      return;
    }

    let integration = null;
    if (Array.isArray(integrationsList)) {
      integration =
        integrationsList.find(item => (item?.name ?? '').toString().trim().toLowerCase() === normalizedMekariName) ?? null;
    }

    if (!integration) {
      integration = findIntegrationByName(MEKARI_INTEGRATION_NAME) ?? mekariIntegrationCache;
    }

    const logoUrl = sanitizeIntegrationLogo(integration?.logoUrl) || MEKARI_DEFAULT_LOGO_URL;
    if (mekariLogoElement.getAttribute('src') !== logoUrl) {
      mekariLogoElement.setAttribute('src', logoUrl);
    }
  };

  updateMekariLogo();

  if (mekariLogoElement && !button.dataset.mekariLogoListenerBound) {
    const handleIntegrationsChange = event => {
      updateMekariLogo(event?.detail?.integrations ?? null);
    };

    document.addEventListener('integrations:changed', handleIntegrationsChange);
    button.dataset.mekariLogoListenerBound = 'true';
  }

  const hiddenLabel = button.querySelector('[data-label]');
  const defaultLabel = button.dataset.labelDefault || 'Sync ke Mekari Jurnal';
  const loadingLabel = button.dataset.labelLoading || 'Menyinkronkan...';
  const syncMetaElement = document.querySelector('[data-mekari-sync-text]');
  const syncErrorElement = document.querySelector('[data-mekari-sync-error]');

  const setLabel = value => {
    if (hiddenLabel) {
      hiddenLabel.textContent = value;
    }
    button.setAttribute('aria-label', value);
  };

  const getCurrentFilterValue = () => {
    const input = document.getElementById('search-input');
    return (input?.value ?? '').toString();
  };

  const getDefaultSyncMessage = () => 'Terakhir disinkronisasi Mekari Jurnal: Belum pernah disinkronkan.';

  const formatSyncDate = value => {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };

  const setSyncMetaToDate = value => {
    if (!syncMetaElement) return;
    const formatted = formatSyncDate(value);
    if (!formatted) {
      syncMetaElement.textContent = getDefaultSyncMessage();
      return;
    }
    syncMetaElement.innerHTML = `Terakhir disinkronisasi Mekari Jurnal pada <span class="sync-meta__time">${escapeHtml(
      formatted
    )}</span>.`;
  };

  const setSyncMetaMessage = message => {
    if (!syncMetaElement) return;
    syncMetaElement.textContent = message;
  };

  const setSyncErrorMessage = (message, { tone = null } = {}) => {
    if (!syncErrorElement) return;
    if (!message) {
      syncErrorElement.hidden = true;
      syncErrorElement.textContent = '';
      syncErrorElement.removeAttribute('data-tone');
      return;
    }
    syncErrorElement.hidden = false;
    syncErrorElement.textContent = message;
    if (tone) {
      syncErrorElement.dataset.tone = tone;
    } else {
      syncErrorElement.removeAttribute('data-tone');
    }
  };

  const formatSyncReason = reason => {
    switch (reason) {
      case 'manual':
        return 'manual';
      case 'scheduled':
        return 'terjadwal';
      case 'initial':
        return 'awal harian';
      default:
        return reason || '';
    }
  };

  const applyDailySyncState = state => {
    if (!state || typeof state !== 'object') {
      setSyncErrorMessage('');
      return;
    }

    const { lastStatus, lastError, lastSuccessAt, lastReason } = state;

    if (lastSuccessAt) {
      setSyncMetaToDate(lastSuccessAt);
    }

    if (lastStatus === 'error') {
      const reasonLabel = formatSyncReason(lastReason);
      const parts = ['Sinkronisasi Mekari Jurnal terakhir gagal'];
      if (reasonLabel) {
        parts[0] += ` (${reasonLabel})`;
      }
      if (lastError) {
        parts.push(`Alasan: ${lastError}`);
      }
      setSyncErrorMessage(parts.join('. '));
      return;
    }

    if (lastStatus === 'skipped') {
      const reasonLabel = formatSyncReason(lastReason);
      const parts = ['Sinkronisasi Mekari Jurnal dilewati'];
      if (reasonLabel) {
        parts[0] += ` (${reasonLabel})`;
      }
      if (lastError) {
        parts.push(`Alasan: ${lastError}`);
      }
      setSyncErrorMessage(parts.join('. '), { tone: 'warning' });
      return;
    }

    if (lastStatus === 'running') {
      setSyncErrorMessage('Sinkronisasi Mekari Jurnal sedang berjalan...');
      return;
    }

    setSyncErrorMessage('');
  };

  setLabel(defaultLabel);

  if (syncMetaElement) {
    syncMetaElement.textContent = getDefaultSyncMessage();
    void (async () => {
      try {
        const integration = await resolveMekariIntegration();
        if (!integration) {
          setSyncMetaMessage('Integrasi Mekari Jurnal belum dikonfigurasi.');
          setSyncErrorMessage('');
          return;
        }
        if (integration.lastSync) {
          setSyncMetaToDate(integration.lastSync);
        }
      } catch (error) {
        console.warn('Gagal memuat status sinkronisasi Mekari Jurnal.', error);
        setSyncMetaMessage('Status sinkronisasi Mekari Jurnal tidak tersedia.');
        setSyncErrorMessage('');
      }
    })();
  }

  applyDailySyncState(readDailyInventorySyncState());

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('entraverse:daily-sync-state', event => {
      const state = event?.detail?.state;
      applyDailySyncState(state);
    });
  }

  button.addEventListener('click', async () => {
    if (button.disabled) return;

    if (!requireCatalogManager('Silakan login untuk sinkronisasi produk.')) {
      return;
    }

    button.disabled = true;
    button.classList.add('is-loading');
    setLabel(loadingLabel);

    const attemptTime = new Date();

    try {
      const result = await synchronizeMekariProducts({ attemptTime, reason: 'manual' });

      if (!result?.success) {
        const message = result?.message || 'Gagal sinkronisasi produk dari Mekari Jurnal.';
        toast.show(message);
        return;
      }

      if (result.empty) {
        toast.show(result.message || 'Tidak ada produk Mekari yang ditemukan.');
      } else {
        const summary = Array.isArray(result.summaryParts) && result.summaryParts.length
          ? result.summaryParts.join(' ')
          : 'Sinkronisasi produk Mekari berhasil.';
        toast.show(summary);
      }

      const syncedAt = result.integration?.lastSync || result.state?.lastSuccessAt || result.attemptIso || attemptTime.toISOString();
      setSyncMetaToDate(syncedAt);
    } catch (error) {
      console.error('Gagal sinkronisasi produk Mekari.', error);
      const message =
        error?.message && typeof error.message === 'string'
          ? error.message
          : 'Gagal sinkronisasi produk dari Mekari Jurnal.';
      toast.show(message);
    } finally {
      button.disabled = false;
      button.classList.remove('is-loading');
      setLabel(defaultLabel);
    }
  });
}

function initTopbarAuth() {
  const profileMenu = document.querySelector('[data-profile-menu]');
  const profileToggle = document.querySelector('[data-profile-toggle]');
  const profileDropdown = document.querySelector('[data-profile-dropdown]');
  const profileName = profileDropdown?.querySelector('[data-profile-name]') || null;
  const guestActions = document.querySelector('[data-guest-actions]');
  const logoutButton = document.querySelector('[data-logout]');

  if (!profileMenu && !guestActions) {
    return { update() {} };
  }

  let dropdownOpen = false;
  let lastUserId = null;

  const setHidden = (element, hidden) => {
    if (!element) return;
    element.hidden = hidden;
    if (hidden) {
      element.setAttribute('aria-hidden', 'true');
    } else {
      element.removeAttribute('aria-hidden');
    }
  };

  const closeDropdown = () => {
    if (!profileDropdown) return;
    setHidden(profileDropdown, true);
    dropdownOpen = false;
    profileToggle?.setAttribute('aria-expanded', 'false');
  };

  const openDropdown = () => {
    if (!profileDropdown) return;
    setHidden(profileDropdown, false);
    dropdownOpen = true;
    profileToggle?.setAttribute('aria-expanded', 'true');
  };

  if (profileToggle && profileDropdown) {
    profileToggle.addEventListener('click', () => {
      if (dropdownOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });
  }

  document.addEventListener('click', event => {
    if (!dropdownOpen) return;
    if (!profileMenu) return;
    if (profileMenu.contains(event.target)) return;
    closeDropdown();
  });

  document.addEventListener('keydown', event => {
    if (!dropdownOpen) return;
    if (event.key !== 'Escape') return;
    closeDropdown();
    profileToggle?.focus();
  });

  const updateTopbarUser = user => {
    const guest = getGuestUser();
    const isGuest = isGuestUser(user);
    const activeUser = user && !isGuest ? user : guest;
    const shouldCloseDropdown = isGuest || activeUser?.id !== lastUserId;

    setActiveSessionUser(activeUser);

    if (shouldCloseDropdown) {
      closeDropdown();
    }

    setHidden(profileMenu, isGuest);
    setHidden(guestActions, !isGuest);

    const name = (activeUser.name || '').toString().trim() || guest.name;
    const initials = getNameInitials(name);

    document.querySelectorAll('[data-avatar-initials]').forEach(el => {
      el.textContent = initials;
    });

    if (profileName) {
      profileName.textContent = name;
    }

    lastUserId = activeUser?.id ?? null;
  };

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      setCurrentUser(null);
      updateTopbarUser(getGuestUser());
      closeDropdown();
      toast.show('Anda sekarang menjelajah sebagai tamu.');
    });
  }

  return { update: updateTopbarUser };
}

function populateCategorySelect(select, { selectedValue, helperEl } = {}) {
  if (!select) return;

  const placeholder = select.dataset.placeholder || 'Pilih kategori';
  const categories = getCategories()
    .filter(category => typeof category?.name === 'string' && category.name.trim())
    .map(category => ({ id: category.id, name: category.name.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));

  const currentValue = selectedValue ?? select.value ?? '';
  select.innerHTML = '';

  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = categories.length ? placeholder : 'Belum ada kategori';
  placeholderOption.selected = !currentValue;
  placeholderOption.disabled = categories.length > 0;
  select.appendChild(placeholderOption);

  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.name;
    option.textContent = category.name;
    select.appendChild(option);
  });

  let hasFallback = false;
  if (currentValue) {
    select.value = currentValue;
    if (select.value !== currentValue) {
      const fallbackOption = document.createElement('option');
      fallbackOption.value = currentValue;
      fallbackOption.textContent = `${currentValue} (tidak tersedia)`;
      select.appendChild(fallbackOption);
      select.value = currentValue;
      hasFallback = true;
    }
  }

  if (!currentValue) {
    select.value = '';
  }

  select.disabled = !categories.length && !hasFallback;

  if (helperEl) {
    if (!categories.length && !hasFallback) {
      helperEl.textContent = 'Belum ada kategori. Tambahkan kategori pada halaman Kategori.';
    } else if (hasFallback) {
      helperEl.textContent = 'Kategori lama tidak lagi tersedia. Pilih kategori terbaru atau tambahkan yang baru.';
    } else {
      helperEl.textContent = 'Kategori diambil dari daftar Kategori yang Anda kelola.';
    }
  }
}

async function handleAddProductForm() {
  const form = document.getElementById('add-product-form');
  if (!form) return;

  if (!canManageCatalog()) {
    toast.show('Silakan login untuk menambah atau mengedit produk.');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 600);
    return;
  }

  const variantBody = document.getElementById('variant-body');
  const pricingBody = document.getElementById('variant-pricing-body');
  const pricingHeaderRow = document.getElementById('variant-pricing-header');
  const addVariantBtn = document.getElementById('add-variant-btn');
  const addPricingRowBtn = document.getElementById('add-pricing-row-btn');
  const photoInputs = Array.from(form.querySelectorAll('[data-photo-field]'));
  const weightInput = form.querySelector('#product-weight');
  const packageLengthInput = form.querySelector('#package-length');
  const packageWidthInput = form.querySelector('#package-width');
  const packageHeightInput = form.querySelector('#package-height');
  const packageVolumeInput = form.querySelector('#package-volume');
  const titleEl = document.getElementById('product-form-title');
  const subtitleEl = document.getElementById('product-form-subtitle');
  const submitBtn = form.querySelector('.primary-btn');
  const categorySelect = form.querySelector('#product-category');
  const categoryHelper = document.getElementById('category-helper-text');
  const params = new URLSearchParams(window.location.search);
  const editingId = params.get('id');
  let suppressPricingRefresh = false;

  const parseDimensionValue = value => {
    if (value === null || typeof value === 'undefined') {
      return null;
    }

    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return null;
    }

    return numeric;
  };

  const formatCbmValue = value => {
    if (value === null || typeof value === 'undefined' || value === '') {
      return '';
    }

    const numeric = typeof value === 'number' ? value : Number.parseFloat(value);
    if (!Number.isFinite(numeric)) {
      return '';
    }

    if (numeric === 0) {
      return '0';
    }

    const fixed = numeric.toFixed(6);
    const trimmed = fixed.replace(/\.?0+$/, '').replace(/\.$/, '');
    return trimmed === '' ? '0' : trimmed;
  };

  const convertCm3ToCbm = value => {
    const numeric = typeof value === 'number' ? value : Number.parseFloat(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    return numeric / 1_000_000;
  };

  const updatePackageVolume = ({ preferExisting = false } = {}) => {
    if (!packageVolumeInput) {
      return;
    }

    const lengthValue = parseDimensionValue(packageLengthInput?.value);
    const widthValue = parseDimensionValue(packageWidthInput?.value);
    const heightValue = parseDimensionValue(packageHeightInput?.value);

    if ([lengthValue, widthValue, heightValue].every(value => value !== null)) {
      const volume = lengthValue * widthValue * heightValue;
      if (Number.isFinite(volume)) {
        const cbm = convertCm3ToCbm(volume);
        if (cbm !== null) {
          const formattedVolume = formatCbmValue(cbm);
          packageVolumeInput.value = formattedVolume;
          return;
        }
      }
    }

    if (!preferExisting) {
      packageVolumeInput.value = '';
    }
  };

  [packageLengthInput, packageWidthInput, packageHeightInput]
    .filter(Boolean)
    .forEach(input => {
      input.addEventListener('input', () => {
        updatePackageVolume();
        updateAllArrivalCosts();
      });
    });

  weightInput?.addEventListener('input', () => {
    updateAllArrivalCosts();
  });

  packageVolumeInput?.addEventListener('input', () => {
    updateAllArrivalCosts();
  });

  let dataPreparationError = null;
  const dataPreparationPromise = (async () => {
    try {
      await ensureSeeded();
      await Promise.all([
        refreshCategoriesFromSupabase(),
        refreshProductsFromSupabase(),
        refreshExchangeRatesFromSupabase()
      ]);
    } catch (error) {
      dataPreparationError = error;
      console.error('Gagal menyiapkan data produk.', error);
      toast.show('Gagal memuat data produk. Pastikan Supabase tersambung.');
    }
  })();

  const getPricingRows = () => Array.from(pricingBody?.querySelectorAll('.pricing-row') ?? []);

  const applyWarehouseAverageToRow = (row, map) => {
    if (!row || !map) {
      return;
    }

    const skuInput = row.querySelector('[data-field="sellerSku"]');
    const averageInput = row.querySelector('[data-field="dailyAverageSales"]');
    if (!skuInput || !averageInput) {
      return;
    }

    const normalizedSku = normalizeSku(skuInput.value || skuInput.dataset.value);
    if (!normalizedSku) {
      return;
    }

    const entry = map.get(normalizedSku);
    let formatted = null;

    if (entry && Number.isFinite(entry.average)) {
      formatted = formatDailyAverageSalesValue(entry.average);
    }

    if (formatted === null) {
      formatted = '0';
    }

    if (averageInput.value !== formatted) {
      averageInput.value = formatted;
      averageInput.dispatchEvent(new Event('input', { bubbles: true }));
      averageInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const applyWarehouseAverageToPricingRows = map => {
    if (!map) {
      return;
    }

    getPricingRows().forEach(row => applyWarehouseAverageToRow(row, map));
  };

  const updateRowAverageFromWarehouse = row => {
    ensureWarehouseAverageData()
      .then(cache => {
        if (!cache?.map) {
          return;
        }
        applyWarehouseAverageToRow(row, cache.map);
      })
      .catch(error => {
        console.warn('Gagal memperbarui rata-rata penjualan per hari dari data gudang.', error);
      });
  };

  const refreshWarehouseAveragesForPricing = () => {
    ensureWarehouseAverageData()
      .then(cache => {
        if (!cache?.map) {
          return;
        }
        applyWarehouseAverageToPricingRows(cache.map);
      })
      .catch(error => {
        console.warn('Gagal menerapkan rata-rata penjualan gudang ke daftar varian.', error);
      });
  };

  const RUPIAH_PRICING_FIELDS = new Set([
    'purchasePriceIdr',
    'offlinePrice',
    'entraversePrice',
    'tokopediaPrice',
    'shopeePrice',
    'arrivalCost'
  ]);

  const AUTO_COMPUTED_PRICING_FIELDS = new Set([
    'purchasePriceIdr',
    'arrivalCost',
    'offlinePrice',
    'entraversePrice',
    'tokopediaPrice',
    'shopeePrice'
  ]);

  const SAMPAI_EXPRESS_VENDOR_NAME = 'sampai express';

  function findSampaiExpressVendor() {
    const vendors = getShippingVendorsFromCache();
    if (!Array.isArray(vendors) || !vendors.length) {
      return null;
    }

    return (
      vendors.find(
        vendor => (vendor?.name ?? '').toString().trim().toLowerCase() === SAMPAI_EXPRESS_VENDOR_NAME
      ) || null
    );
  }

  function getInventoryWeightInKg() {
    if (!weightInput) {
      return null;
    }

    const rawValue = parseNumericValue(weightInput.value ?? '');
    if (!Number.isFinite(rawValue) || rawValue < 0) {
      return null;
    }

    if (rawValue === 0) {
      return 0;
    }

    return rawValue / 1000;
  }

  function getInventoryVolumeInCbm() {
    if (!packageVolumeInput) {
      return null;
    }

    const raw = (packageVolumeInput.value ?? '').toString().trim();
    if (!raw) {
      return null;
    }

    const normalized = Number.parseFloat(raw.replace(',', '.'));
    if (!Number.isFinite(normalized) || normalized < 0) {
      return null;
    }

    return normalized;
  }

  function updateArrivalCostForRow(row) {
    if (!row) {
      return;
    }

    const arrivalInput = row.querySelector('[data-field="arrivalCost"]');
    const shippingSelect = row.querySelector('select[data-field="shippingMethod"]');
    if (!arrivalInput || !shippingSelect) {
      return;
    }

    const vendor = findSampaiExpressVendor();
    const method = (shippingSelect.value ?? '').toString().trim().toLowerCase();

    let computedCost = 0;

    if (method === 'udara') {
      const weightKg = getInventoryWeightInKg();
      const airRate = Number.isFinite(vendor?.airRate) ? vendor.airRate : null;
      if (Number.isFinite(weightKg) && Number.isFinite(airRate)) {
        computedCost = weightKg * airRate;
      }
    } else if (method === 'laut') {
      const volumeCbm = getInventoryVolumeInCbm();
      const seaRate = Number.isFinite(vendor?.seaRate) ? vendor.seaRate : null;
      if (Number.isFinite(volumeCbm) && Number.isFinite(seaRate)) {
        computedCost = volumeCbm * seaRate;
      }
    } else {
      computedCost = 0;
    }

    if (!Number.isFinite(computedCost) || computedCost < 0) {
      computedCost = 0;
    }

    setRupiahInputValue(arrivalInput, Math.round(computedCost));
    recalculatePurchasePriceIdr(row);
  }

  function updateAllArrivalCosts() {
    getPricingRows().forEach(row => updateArrivalCostForRow(row));
  }

  const WARRANTY_RATE = 0.03;
  const WARRANTY_PROFIT_RATE = 1;
  const WARRANTY_MULTIPLIER = 1 + WARRANTY_RATE * (1 + WARRANTY_PROFIT_RATE);
  const TOKOPEDIA_FIXED_FEE = 1250;
  const TOKOPEDIA_SERVICE_FEE = 0.018;
  const TOKOPEDIA_DYNAMIC_COMMISSION_RATE = 0.04;
  const TOKOPEDIA_XTRA_CASHBACK_RATE = 0.035;

  const parsePercentToDecimal = (value, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value >= 0 && value <= 1) {
        return value;
      }
      if (Math.abs(value) > 1) {
        return Math.max(0, value / 100);
      }
    }

    if (value === null || value === undefined) {
      return fallback;
    }

    const text = value.toString().trim();
    if (!text) {
      return fallback;
    }

    const sanitized = text.replace(/[^0-9,.-]/g, '').replace(',', '.');
    if (!sanitized) {
      return fallback;
    }

    const numeric = Number.parseFloat(sanitized);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }

    if (numeric >= 0 && numeric <= 1) {
      return numeric;
    }

    if (numeric > 1) {
      return Math.max(0, numeric / 100);
    }

    return fallback;
  };

  const getSelectedCategoryConfig = () => {
    const selectedName = (categorySelect?.value ?? '').toString().trim().toLowerCase();
    if (!selectedName) {
      return null;
    }

    const categories = getCategories();
    return (
      categories.find(category => category?.name?.toString().trim().toLowerCase() === selectedName) || null
    );
  };

  const valueMatchesWarranty = value => {
    const normalized = (value ?? '').toString().trim().toLowerCase();
    if (!normalized) {
      return false;
    }

    if (normalized === 'garansi 1 tahun' || normalized === 'toko - 1 tahun') {
      return true;
    }

    if (normalized.includes('garansi') && normalized.includes('1') && normalized.includes('tahun')) {
      return true;
    }

    return false;
  };

  const hasWarrantyForRow = row => {
    if (!row) {
      return false;
    }

    const variantDefs = getVariantDefinitions();
    const variantSelects = Array.from(row.querySelectorAll('select[data-variant-select]'));

    const hasWarrantyVariant = variantSelects.some((select, index) => {
      const value = (select.value ?? '').toString().trim();
      if (valueMatchesWarranty(value)) {
        return true;
      }

      const variantName = (variantDefs[index]?.rawName || variantDefs[index]?.name || '')
        .toString()
        .trim()
        .toLowerCase();

      if (variantName.includes('garansi')) {
        const normalizedValue = value.toLowerCase();
        if (normalizedValue.includes('1 tahun')) {
          return true;
        }
      }

      return false;
    });

    if (hasWarrantyVariant) {
      return true;
    }

    const manualVariant = row.querySelector('[data-field="variantLabel"]');
    if (manualVariant) {
      const manualValue = (manualVariant.value ?? '').toString().trim();
      if (valueMatchesWarranty(manualValue) || manualValue.toLowerCase().includes('1 tahun')) {
        return true;
      }
    }

    return false;
  };

  const mround = (value, multiple) => {
    if (!Number.isFinite(value) || !Number.isFinite(multiple) || multiple <= 0) {
      return null;
    }
    return Math.round(value / multiple) * multiple;
  };

  const applyRoundingRules = value => {
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }

    let roundedValue = value;
    if (value >= 500000) {
      roundedValue = mround(value, 50000);
      if (!Number.isFinite(roundedValue)) return null;
      roundedValue -= 1000;
    } else if (value >= 250000) {
      roundedValue = mround(value, 10000);
      if (!Number.isFinite(roundedValue)) return null;
      roundedValue -= 1000;
    } else if (value >= 100000) {
      roundedValue = mround(value, 5000);
      if (!Number.isFinite(roundedValue)) return null;
      roundedValue -= 1000;
    } else {
      roundedValue = mround(value, 1000);
      if (!Number.isFinite(roundedValue)) return null;
      roundedValue -= 100;
    }

    if (!Number.isFinite(roundedValue)) {
      return null;
    }

    return Math.max(0, Math.round(roundedValue));
  };

  const calculateOfflinePrice = (purchasePriceIdr, marginRate, hasWarranty) => {
    if (!Number.isFinite(purchasePriceIdr) || purchasePriceIdr <= 0) {
      return null;
    }

    const margin = Number.isFinite(marginRate) ? Math.max(0, marginRate) : 0;
    if (margin >= 1) {
      return null;
    }

    const basePrice = purchasePriceIdr / (1 - margin);
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      return null;
    }

    const adjustedPrice = hasWarranty ? basePrice * WARRANTY_MULTIPLIER : basePrice;
    return applyRoundingRules(adjustedPrice);
  };

  const calculateTokopediaPrice = (purchasePriceIdr, { margin, marketplaceFee }, hasWarranty) => {
    if (!Number.isFinite(purchasePriceIdr) || purchasePriceIdr <= 0) {
      return null;
    }

    const marginRate = Number.isFinite(margin) ? Math.max(0, margin) : 0;
    const marketplaceRate = Number.isFinite(marketplaceFee) ? Math.max(0, marketplaceFee) : 0;

    const serviceFee = Math.min(TOKOPEDIA_SERVICE_FEE, 50000 / purchasePriceIdr);
    const dynamicCommission = Math.min(TOKOPEDIA_DYNAMIC_COMMISSION_RATE, 40000 / purchasePriceIdr);
    const cashback = Math.min(TOKOPEDIA_XTRA_CASHBACK_RATE, 60000 / purchasePriceIdr);

    const totalPercent =
      marginRate + marketplaceRate + serviceFee + dynamicCommission + cashback;

    if (!Number.isFinite(totalPercent) || totalPercent >= 1) {
      return null;
    }

    const base = (purchasePriceIdr + TOKOPEDIA_FIXED_FEE) / (1 - totalPercent);
    if (!Number.isFinite(base) || base <= 0) {
      return null;
    }

    const adjusted = hasWarranty ? base * WARRANTY_MULTIPLIER : base;
    return applyRoundingRules(adjusted);
  };

  const clearComputedPricing = row => {
    if (!row) {
      return;
    }

    ['offlinePrice', 'entraversePrice', 'tokopediaPrice', 'shopeePrice'].forEach(field => {
      const input = row.querySelector(`[data-field="${field}"]`);
      if (input) {
        setRupiahInputValue(input, '');
      }
    });
  };

  const updateComputedPricingForRow = row => {
    if (!row) {
      return;
    }

    const idrInput = row.querySelector('[data-field="purchasePriceIdr"]');
    const offlineInput = row.querySelector('[data-field="offlinePrice"]');
    const entraverseInput = row.querySelector('[data-field="entraversePrice"]');
    const tokopediaInput = row.querySelector('[data-field="tokopediaPrice"]');
    const shopeeInput = row.querySelector('[data-field="shopeePrice"]');

    const idrValue = parseNumericValue(
      idrInput?.dataset.numericValue ?? idrInput?.value ?? ''
    );

    if (!Number.isFinite(idrValue) || idrValue <= 0) {
      clearComputedPricing(row);
      return;
    }

    const category = getSelectedCategoryConfig();
    const marginRate = parsePercentToDecimal(category?.margin?.value ?? 0, 0);
    const marketplaceFee = parsePercentToDecimal(category?.fees?.marketplace ?? 0, 0);
    const hasWarranty = hasWarrantyForRow(row);

    const offlinePrice = calculateOfflinePrice(idrValue, marginRate, hasWarranty);
    setRupiahInputValue(offlineInput, offlinePrice ?? '');

    // Sementara gunakan harga offline untuk Entraverse hingga rumus khusus tersedia.
    const entraversePrice = Number.isFinite(offlinePrice) ? offlinePrice : null;
    setRupiahInputValue(entraverseInput, entraversePrice ?? '');

    const tokopediaPrice = calculateTokopediaPrice(
      idrValue,
      { margin: marginRate, marketplaceFee },
      hasWarranty
    );
    setRupiahInputValue(tokopediaInput, tokopediaPrice ?? '');

    // Harga Shopee juga mengikuti harga offline sampai rumus resmi diberikan.
    const shopeePrice = Number.isFinite(offlinePrice) ? offlinePrice : null;
    setRupiahInputValue(shopeeInput, shopeePrice ?? '');
  };

  const updateAllPricingRows = () => {
    getPricingRows().forEach(row => updateComputedPricingForRow(row));
  };

  dataPreparationPromise.then(() => {
    if (dataPreparationError) {
      return;
    }
    refreshWarehouseAveragesForPricing();
    updateAllPricingRows();
  });

  const sanitizeCurrencyDigits = value => {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.round(value).toString();
    }

    const text = value.toString();
    const digits = text.replace(/[^0-9]/g, '');
    if (!digits) {
      return '';
    }

    const normalized = digits.replace(/^0+(?=\d)/, '');
    return normalized || '0';
  };

  const formatRupiahDigits = digits => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const setRupiahInputValue = (input, value) => {
    if (!input) {
      return '';
    }

    const sanitized = sanitizeCurrencyDigits(value);
    if (!sanitized) {
      delete input.dataset.numericValue;
      input.value = '';
      return '';
    }

    input.dataset.numericValue = sanitized;
    input.value = `Rp ${formatRupiahDigits(sanitized)}`;
    return sanitized;
  };

  const countDigitsBeforePosition = (value, position) => {
    if (!value) {
      return 0;
    }
    const slice = value.slice(0, Math.max(0, position));
    return slice.replace(/[^0-9]/g, '').length;
  };

  const findCaretPositionForDigitCount = (value, digitCount) => {
    if (!value) {
      return 0;
    }

    if (digitCount <= 0) {
      return value.startsWith('Rp ') ? 3 : 0;
    }

    let digitsSeen = 0;
    for (let index = 0; index < value.length; index += 1) {
      if (/\d/.test(value[index])) {
        digitsSeen += 1;
        if (digitsSeen === digitCount) {
          return index + 1;
        }
      }
    }

    return value.length;
  };

  const formatRupiahInputValue = input => {
    if (!input) {
      return { sanitized: '', caret: 0 };
    }

    const selectionStart = input.selectionStart ?? input.value.length;
    const digitsBefore = countDigitsBeforePosition(input.value, selectionStart);
    const sanitized = sanitizeCurrencyDigits(input.value);

    if (!sanitized) {
      delete input.dataset.numericValue;
      input.value = '';
      return { sanitized: '', caret: 0 };
    }

    const formatted = `Rp ${formatRupiahDigits(sanitized)}`;
    input.dataset.numericValue = sanitized;
    input.value = formatted;

    const caret = findCaretPositionForDigitCount(formatted, digitsBefore);
    return { sanitized, caret };
  };

  const attachRupiahFormatter = input => {
    if (!input || input.readOnly) {
      return;
    }

    const handler = () => {
      const { caret } = formatRupiahInputValue(input);
      requestAnimationFrame(() => {
        const nextCaret = typeof caret === 'number' ? caret : input.value.length;
        try {
          input.setSelectionRange(nextCaret, nextCaret);
        } catch (error) {
          // Ignore selection errors on unfocused inputs.
        }
      });
    };

    input.addEventListener('input', handler);
    input.addEventListener('blur', handler);
  };

  const setExchangeRateInputValue = (input, value) => {
    if (!input) {
      return null;
    }

    const numeric = parseNumericValue(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      delete input.dataset.numericValue;
      input.value = '';
      return null;
    }

    const rounded = Number.isInteger(numeric) ? numeric : Number(numeric.toFixed(6));
    const display = rounded.toString();
    input.dataset.numericValue = display;
    input.value = display;
    return rounded;
  };

  const syncExchangeRateDatasetFromInput = input => {
    if (!input) {
      return;
    }

    const numeric = parseNumericValue(input.value ?? '');
    if (Number.isFinite(numeric) && numeric > 0) {
      input.dataset.numericValue = numeric.toString();
    } else {
      delete input.dataset.numericValue;
    }
  };

  const populateCurrencySelectOptions = (select, selectedValue = '') => {
    if (!select) {
      return;
    }

    const placeholder = select.dataset.placeholder || 'Pilih mata uang';
    const normalizedSelected = selectedValue?.toString().trim().toUpperCase() || '';
    const previousValue = select.value?.toString().trim().toUpperCase() || '';
    const targetValue = normalizedSelected || previousValue;

    select.innerHTML = '';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);

    const seen = new Set();
    getExchangeRates().forEach(rate => {
      if (!rate) return;
      const option = document.createElement('option');
      option.value = rate.currency;
      option.textContent =
        rate.label && rate.label !== rate.currency
          ? `${rate.currency} - ${rate.label}`
          : rate.currency;
      select.appendChild(option);
      seen.add(rate.currency);
    });

    if (targetValue && !seen.has(targetValue)) {
      const fallbackOption = document.createElement('option');
      fallbackOption.value = targetValue;
      fallbackOption.textContent = targetValue;
      fallbackOption.dataset.temporaryOption = 'true';
      select.appendChild(fallbackOption);
    }

    if (targetValue) {
      select.value = targetValue;
      if (select.value !== targetValue) {
        select.value = '';
      }
    } else {
      select.value = '';
    }
  };

  const recalculatePurchasePriceIdr = row => {
    if (!row) {
      return;
    }

    const purchasePriceInput = row.querySelector('[data-field="purchasePrice"]');
    const exchangeRateInput = row.querySelector('[data-field="exchangeRate"]');
    const idrInput = row.querySelector('[data-field="purchasePriceIdr"]');
    const arrivalInput = row.querySelector('[data-field="arrivalCost"]');

    if (!idrInput) {
      return;
    }

    const price = parseNumericValue(purchasePriceInput?.value ?? '');
    const arrivalCost = parseNumericValue(
      arrivalInput?.dataset.numericValue ?? arrivalInput?.value ?? ''
    );
    let rate = null;

    if (exchangeRateInput?.dataset.numericValue) {
      rate = parseNumericValue(exchangeRateInput.dataset.numericValue);
    }

    if (!Number.isFinite(rate)) {
      rate = parseNumericValue(exchangeRateInput?.value ?? '');
    }

    const normalizedArrival = Number.isFinite(arrivalCost) ? Math.max(0, arrivalCost) : 0;

    if (!Number.isFinite(price) || !Number.isFinite(rate)) {
      setRupiahInputValue(idrInput, '');
      updateComputedPricingForRow(row);
      return;
    }

    const total = Math.round(price * rate + normalizedArrival);
    if (!Number.isFinite(total)) {
      setRupiahInputValue(idrInput, '');
      updateComputedPricingForRow(row);
      return;
    }

    setRupiahInputValue(idrInput, total);
    updateComputedPricingForRow(row);
  };

  const syncCurrencyForRow = (row, { currency, fallbackRate } = {}) => {
    if (!row) {
      return;
    }

    const select = row.querySelector('select[data-field="purchaseCurrency"]');
    const exchangeRateInput = row.querySelector('[data-field="exchangeRate"]');
    const normalizedCurrency = currency?.toString().trim().toUpperCase() || select?.value?.toString().trim().toUpperCase() || '';

    if (select) {
      populateCurrencySelectOptions(select, normalizedCurrency);
    }

    let appliedRate = null;
    if (normalizedCurrency) {
      const record = findExchangeRateByCurrency(normalizedCurrency);
      if (record) {
        appliedRate = record.rate;
      }
    }

    if (!Number.isFinite(appliedRate) && Number.isFinite(parseNumericValue(fallbackRate))) {
      appliedRate = parseNumericValue(fallbackRate);
    }

    if (exchangeRateInput) {
      const overrideCurrency = (exchangeRateInput.dataset.overrideCurrency || '').toUpperCase();
      const hasManualValue = Number.isFinite(parseNumericValue(exchangeRateInput.dataset.numericValue));
      const shouldPreserveManual =
        exchangeRateInput.dataset.userOverride === 'true' &&
        hasManualValue &&
        (overrideCurrency === normalizedCurrency || (!overrideCurrency && !normalizedCurrency));

      if (!shouldPreserveManual) {
        if (Number.isFinite(appliedRate) && appliedRate > 0) {
          setExchangeRateInputValue(exchangeRateInput, appliedRate);
          exchangeRateInput.dataset.rateSource = 'auto';
          if (normalizedCurrency) {
            exchangeRateInput.dataset.appliedCurrency = normalizedCurrency;
          } else {
            delete exchangeRateInput.dataset.appliedCurrency;
          }
          delete exchangeRateInput.dataset.userOverride;
          delete exchangeRateInput.dataset.overrideCurrency;
        } else {
          setExchangeRateInputValue(exchangeRateInput, '');
          delete exchangeRateInput.dataset.rateSource;
          if (normalizedCurrency) {
            exchangeRateInput.dataset.appliedCurrency = normalizedCurrency;
          } else {
            delete exchangeRateInput.dataset.appliedCurrency;
          }
          delete exchangeRateInput.dataset.userOverride;
          delete exchangeRateInput.dataset.overrideCurrency;
        }
      }
    }

    recalculatePurchasePriceIdr(row);
  };

  populateCategorySelect(categorySelect, { helperEl: categoryHelper });
  if (categorySelect) {
    categorySelect.disabled = !getCategories().length;
    categorySelect.addEventListener('change', () => {
      updateAllPricingRows();
    });
  }

  document.addEventListener('categories:changed', () => {
    const selectedValue = categorySelect?.value ?? '';
    populateCategorySelect(categorySelect, { selectedValue, helperEl: categoryHelper });
    if (categorySelect) {
      categorySelect.disabled = !getCategories().length;
    }
    updateAllPricingRows();
  });

  document.addEventListener('exchangeRates:changed', () => {
    getPricingRows().forEach(row => {
      const select = row.querySelector('select[data-field="purchaseCurrency"]');
      if (!select) {
        return;
      }
      const currentValue = select.value ?? '';
      populateCurrencySelectOptions(select, currentValue);
      syncCurrencyForRow(row, { currency: select.value });
    });
  });

  const clearPreview = (container, preview, input) => {
    if (!container || !preview) return;
    preview.removeAttribute('src');
    preview.hidden = true;
    container.classList.remove('has-image');
    delete container.dataset.photoValue;
    if (input) {
      input.value = '';
    }
  };

  photoInputs.forEach(input => {
    const container = input.closest('.image-upload');
    const dropzone = container?.querySelector('[data-photo-preview]');
    const preview = container?.querySelector('[data-preview-image]');

    if (!container || !dropzone || !preview) {
      return;
    }

    const handleFileChange = () => {
      const [file] = input.files ?? [];
      if (!file) {
        clearPreview(container, preview, input);
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.show('Pilih file gambar dengan format yang didukung.');
        clearPreview(container, preview, input);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          toast.show('Gagal membaca file gambar.');
          clearPreview(container, preview, input);
          return;
        }

        preview.src = result;
        preview.alt = file.name ? `Foto ${file.name}` : 'Foto produk';
        preview.hidden = false;
        container.classList.add('has-image');
        container.dataset.photoValue = result;
      };

      reader.onerror = () => {
        toast.show('Gagal memuat gambar, coba lagi.');
        clearPreview(container, preview, input);
      };

      reader.readAsDataURL(file);
    };

    dropzone.addEventListener('click', event => {
      event.preventDefault();
      input.click();
    });

    dropzone.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        input.click();
      }
    });

    dropzone.addEventListener('focus', () => {
      dropzone.classList.add('is-focused');
    });

    dropzone.addEventListener('blur', () => {
      dropzone.classList.remove('is-focused');
    });

    input.addEventListener('focus', () => {
      dropzone.classList.add('is-focused');
    });

    input.addEventListener('blur', () => {
      dropzone.classList.remove('is-focused');
    });

    input.addEventListener('change', handleFileChange);

    preview.addEventListener('error', () => {
      toast.show('Tidak dapat menampilkan gambar tersebut.');
      clearPreview(container, preview, input);
    });
  });

  const getVariantDefinitions = () => {
    if (!variantBody) return [];
    return Array.from(variantBody.querySelectorAll('.variant-row')).map((row, index) => {
      const nameInput = row.querySelector('.variant-name');
      const rawName = (nameInput?.value ?? '').toString().trim();
      const options = Array.from(row.querySelectorAll('[data-option-chip]'))
        .map(chip => chip.dataset.optionValue?.toString().trim())
        .filter(Boolean);
      return {
        name: rawName || `Varian ${index + 1}`,
        rawName,
        options
      };
    });
  };

  function buildCombinationKeyFromValues(values = []) {
    return values
      .map(value => (value ?? '').toString().trim().toLowerCase())
      .join('||');
  }

  function buildCombinationKeyFromData(row, variantDefs) {
    if (!row || !variantDefs.length) {
      return '';
    }

    const values = variantDefs.map((variant, index) => {
      if (!Array.isArray(row.variants)) return '';
      const direct = row.variants[index];
      if (direct && typeof direct === 'object') {
        const directValue = (direct.value ?? '').toString().trim();
        if (directValue) {
          return directValue;
        }
      }

      const variantName = (variant.rawName || variant.name || '').toString().trim().toLowerCase();
      const match = row.variants.find(item => (item?.name ?? '').toString().trim().toLowerCase() === variantName);
      return (match?.value ?? '').toString().trim();
    });

    if (values.some(value => !value)) {
      return '';
    }

    return buildCombinationKeyFromValues(values);
  }

  function generateVariantCombinations(variantDefs) {
    if (!Array.isArray(variantDefs) || !variantDefs.length) {
      return [];
    }

    const hasEmptyOptions = variantDefs.some(variant => !Array.isArray(variant.options) || !variant.options.length);
    if (hasEmptyOptions) {
      return [];
    }

    const combinations = [];
    const traverse = (index, currentVariants, currentValues) => {
      if (index === variantDefs.length) {
        combinations.push({
          variants: currentVariants.map(item => ({ name: item.name, value: item.value })),
          key: buildCombinationKeyFromValues(currentValues)
        });
        return;
      }

      const variant = variantDefs[index];
      const variantName = (variant.rawName || variant.name || `Varian ${index + 1}`).toString().trim();

      variant.options.forEach(option => {
        const optionValue = (option ?? '').toString().trim();
        traverse(
          index + 1,
          [...currentVariants, { name: variantName, value: optionValue }],
          [...currentValues, optionValue]
        );
      });
    };

    traverse(0, [], []);
    return combinations;
  }

  function collectPricingRows(variantDefs = getVariantDefinitions()) {
    if (!pricingBody) return [];
    return Array.from(pricingBody.querySelectorAll('.pricing-row')).map(row => {
      const getValue = (selector, options = {}) => {
        const field = row.querySelector(selector);
        if (!field) return '';
        const { asRupiah = false, useDataset = false } = options;
        if (asRupiah) {
          if (Object.prototype.hasOwnProperty.call(field.dataset, 'numericValue')) {
            return field.dataset.numericValue;
          }
          return sanitizeCurrencyDigits(field.value ?? '');
        }
        if (useDataset && Object.prototype.hasOwnProperty.call(field.dataset, 'numericValue')) {
          return field.dataset.numericValue;
        }
        return (field.value ?? '').toString().trim();
      };

      const data = {
        id: row.dataset.pricingId || null,
        purchasePrice: getValue('[data-field="purchasePrice"]'),
        purchaseCurrency: getValue('[data-field="purchaseCurrency"]'),
        exchangeRate: getValue('[data-field="exchangeRate"]', { useDataset: true }),
        purchasePriceIdr: getValue('[data-field="purchasePriceIdr"]', { asRupiah: true }),
        shippingMethod: getValue('[data-field="shippingMethod"]'),
        arrivalCost: getValue('[data-field="arrivalCost"]', { asRupiah: true }),
        offlinePrice: getValue('[data-field="offlinePrice"]', { asRupiah: true }),
        entraversePrice: getValue('[data-field="entraversePrice"]', { asRupiah: true }),
        tokopediaPrice: getValue('[data-field="tokopediaPrice"]', { asRupiah: true }),
        shopeePrice: getValue('[data-field="shopeePrice"]', { asRupiah: true }),
        stock: getValue('[data-field="stock"]'),
        dailyAverageSales: getValue('[data-field="dailyAverageSales"]'),
        sellerSku: getValue('[data-field="sellerSku"]'),
        weight: getValue('[data-field="weight"]')
      };

      if (variantDefs.length) {
        data.variants = variantDefs.map((variant, index) => {
          const select = row.querySelector(`[data-variant-select="${index}"]`);
          const value = select ? (select.value ?? '').toString().trim() : '';
          return {
            name: variant.rawName || variant.name,
            value
          };
        });
      } else {
        data.variantLabel = getValue('[data-field="variantLabel"]');
      }

      return data;
    });
  }

  function hydratePricingRow(row, initialData = {}, variantDefs = getVariantDefinitions()) {
    if (!row) return;

    if (initialData.id) {
      row.dataset.pricingId = initialData.id;
    }

    if (variantDefs.length) {
      const valueMap = new Map();
      if (Array.isArray(initialData.variants)) {
        initialData.variants.forEach(item => {
          if (!item) return;
          const key = (item.name ?? '').toString().trim().toLowerCase();
          if (!key) return;
          valueMap.set(key, (item.value ?? '').toString().trim());
        });
      }

      variantDefs.forEach((variant, index) => {
        const select = row.querySelector(`[data-variant-select="${index}"]`);
        if (!select) return;
        const keys = [variant.rawName, variant.name]
          .map(name => (name ?? '').toString().trim().toLowerCase())
          .filter(Boolean);

        let value = '';
        for (const key of keys) {
          if (valueMap.has(key)) {
            value = valueMap.get(key) ?? '';
            break;
          }
        }

        if (value) {
          const exists = Array.from(select.options).some(option => option.value === value);
          if (!exists) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            option.dataset.temporaryOption = 'true';
            select.appendChild(option);
          }
          select.value = value;
        }
      });
    } else if (initialData.variantLabel) {
      const variantInput = row.querySelector('[data-field="variantLabel"]');
      if (variantInput) {
        variantInput.value = initialData.variantLabel;
      }
    }

    const currencySelect = row.querySelector('select[data-field="purchaseCurrency"]');
    const initialCurrency = (initialData.purchaseCurrency ?? '').toString().trim().toUpperCase();
    if (currencySelect) {
      populateCurrencySelectOptions(currencySelect, initialCurrency);
    }

    const shippingSelect = row.querySelector('select[data-field="shippingMethod"]');
    if (shippingSelect) {
      const shippingValue = (initialData.shippingMethod ?? '').toString().trim();
      if (shippingValue) {
        const exists = Array.from(shippingSelect.options).some(option => option.value === shippingValue);
        if (!exists) {
          const option = document.createElement('option');
          option.value = shippingValue;
          option.textContent = shippingValue;
          option.dataset.temporaryOption = 'true';
          shippingSelect.appendChild(option);
        }
        shippingSelect.value = shippingValue;
      } else {
        shippingSelect.value = '';
      }
    }

    const applyFieldValue = (field, value) => {
      const input = row.querySelector(`[data-field="${field}"]`);
      if (!input) {
        return;
      }

      if (field === 'exchangeRate') {
        const applied = setExchangeRateInputValue(input, value);
        if (Number.isFinite(applied)) {
          input.dataset.userOverride = 'true';
          if (initialCurrency) {
            input.dataset.overrideCurrency = initialCurrency;
          } else {
            delete input.dataset.overrideCurrency;
          }
          input.dataset.rateSource = 'manual';
        } else {
          delete input.dataset.userOverride;
          delete input.dataset.overrideCurrency;
          delete input.dataset.rateSource;
        }
        syncExchangeRateDatasetFromInput(input);
        return;
      }

      if (RUPIAH_PRICING_FIELDS.has(field)) {
        setRupiahInputValue(input, value ?? '');
        return;
      }

      if (value === undefined || value === null) {
        input.value = '';
        return;
      }

      input.value = value;
    };

    [
      'purchasePrice',
      'exchangeRate',
      'purchasePriceIdr',
      'arrivalCost',
      'offlinePrice',
      'entraversePrice',
      'tokopediaPrice',
      'shopeePrice',
      'stock',
      'dailyAverageSales',
      'sellerSku',
      'weight'
    ].forEach(field => {
      applyFieldValue(field, initialData[field]);
    });

    const fallbackRate = initialData.exchangeRate;
    syncCurrencyForRow(row, {
      currency: currencySelect?.value || initialCurrency,
      fallbackRate
    });

    updateArrivalCostForRow(row);
  }

  function createPricingRow(initialData = {}, variantDefs = getVariantDefinitions(), options = {}) {
    if (!pricingBody) return null;

    const row = document.createElement('tr');
    row.className = 'pricing-row';
    const { lockVariantSelection = false } = options;
    let purchasePriceInput = null;
    let currencySelect = null;
    let exchangeRateInput = null;
    let arrivalCostInput = null;

    if (variantDefs.length) {
      variantDefs.forEach((variant, index) => {
        const cell = document.createElement('td');
        cell.dataset.pricingVariantCell = 'true';
        const select = document.createElement('select');
        select.dataset.variantSelect = index;
        select.innerHTML = `<option value="">Pilih ${variant.name}</option>`;
        variant.options.forEach(option => {
          const opt = document.createElement('option');
          opt.value = option;
          opt.textContent = option;
          select.appendChild(opt);
        });
        select.setAttribute('aria-label', `Pilih ${variant.name}`);
        if (lockVariantSelection) {
          select.disabled = true;
        }
        cell.appendChild(select);
        row.appendChild(cell);
      });
    }

    if (!variantDefs.length) {
      const cell = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Nama Varian';
      input.dataset.field = 'variantLabel';
      cell.appendChild(input);
      row.appendChild(cell);
    }

    const buildInputCell = (field, placeholder, type = 'text') => {
      const cell = document.createElement('td');
      if (field === 'purchaseCurrency') {
        const select = document.createElement('select');
        select.dataset.field = field;
        select.dataset.placeholder = placeholder;
        select.setAttribute('aria-label', placeholder || 'Pilih mata uang');
        cell.appendChild(select);
        row.appendChild(cell);
        currencySelect = select;
        return select;
      }

      const input = document.createElement('input');
      input.type = type;
      input.placeholder = placeholder;
      input.dataset.field = field;

      if (
        [
          'purchasePrice',
          'exchangeRate',
          'purchasePriceIdr',
          'arrivalCost',
          'offlinePrice',
          'entraversePrice',
          'tokopediaPrice',
          'shopeePrice'
        ].includes(field)
      ) {
        input.inputMode = 'numeric';
        input.classList.add('numeric-input');
      }

      if (field === 'stock' || field === 'weight') {
        input.inputMode = 'numeric';
        input.pattern = '[0-9]*';
      }

      if (field === 'dailyAverageSales') {
        input.inputMode = 'decimal';
        input.min = '0';
        input.step = '0.01';
        input.readOnly = true;
        input.tabIndex = -1;
        input.setAttribute('aria-readonly', 'true');
        input.classList.add('readonly-input');
      }

      if (AUTO_COMPUTED_PRICING_FIELDS.has(field)) {
        input.readOnly = true;
        input.tabIndex = -1;
        input.setAttribute('aria-readonly', 'true');
        input.classList.add('readonly-input');
      }

      if (field === 'exchangeRate') {
        input.inputMode = 'decimal';
        input.autocomplete = 'off';
        input.step = 'any';
      }

      if (RUPIAH_PRICING_FIELDS.has(field)) {
        attachRupiahFormatter(input);
      }

      if (field === 'purchasePrice') {
        purchasePriceInput = input;
      }
      if (field === 'exchangeRate') {
        exchangeRateInput = input;
      }
      if (field === 'arrivalCost') {
        arrivalCostInput = input;
      }

      cell.appendChild(input);
      row.appendChild(cell);
      return input;
    };

    const buildShippingCell = () => {
      const cell = document.createElement('td');
      const select = document.createElement('select');
      select.dataset.field = 'shippingMethod';
      select.setAttribute('aria-label', 'Pilih metode pengiriman');

      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.textContent = 'Pilih pengiriman';
      select.appendChild(placeholderOption);

      ['Udara', 'Laut', 'Darat'].forEach(optionLabel => {
        const option = document.createElement('option');
        option.value = optionLabel;
        option.textContent = optionLabel;
        select.appendChild(option);
      });

      cell.appendChild(select);
      row.appendChild(cell);
      return select;
    };

    buildInputCell('purchasePrice', '0');
    buildInputCell('purchaseCurrency', 'Pilih mata uang');
    buildInputCell('exchangeRate', '0');
    const shippingSelect = buildShippingCell();
    buildInputCell('arrivalCost', 'Rp 0');
    buildInputCell('purchasePriceIdr', 'Rp 0');
    buildInputCell('offlinePrice', 'Rp 0');
    buildInputCell('entraversePrice', 'Rp 0');
    buildInputCell('tokopediaPrice', 'Rp 0');
    buildInputCell('shopeePrice', 'Rp 0');
    buildInputCell('stock', 'Stok');
    buildInputCell('dailyAverageSales', '0', 'number');
    buildInputCell('sellerSku', 'SKU Penjual');
    buildInputCell('weight', 'Gram');

    const actionsCell = document.createElement('td');
    actionsCell.className = 'variant-actions';
    if (lockVariantSelection) {
      actionsCell.classList.add('locked');
    }
    row.appendChild(actionsCell);

    pricingBody.appendChild(row);
    hydratePricingRow(row, initialData, variantDefs);

    if (currencySelect) {
      currencySelect.addEventListener('change', () => {
        syncCurrencyForRow(row, { currency: currencySelect.value });
      });
    }

    Array.from(row.querySelectorAll('select[data-variant-select]')).forEach(select => {
      select.addEventListener('change', () => {
        updateComputedPricingForRow(row);
      });
    });

    if (shippingSelect) {
      shippingSelect.addEventListener('change', () => {
        updateArrivalCostForRow(row);
      });
    }

    if (arrivalCostInput) {
      arrivalCostInput.addEventListener('input', () => {
        recalculatePurchasePriceIdr(row);
      });
    }

    const manualVariantInput = row.querySelector('[data-field="variantLabel"]');
    if (manualVariantInput) {
      manualVariantInput.addEventListener('input', () => {
        updateComputedPricingForRow(row);
      });
    }

    if (purchasePriceInput) {
      purchasePriceInput.addEventListener('input', () => {
        recalculatePurchasePriceIdr(row);
      });
    }

    if (exchangeRateInput) {
      syncExchangeRateDatasetFromInput(exchangeRateInput);
      exchangeRateInput.addEventListener('input', () => {
        syncExchangeRateDatasetFromInput(exchangeRateInput);
        if (exchangeRateInput.value?.toString().trim()) {
          const activeCurrency = currencySelect?.value?.toString().trim().toUpperCase() || '';
          exchangeRateInput.dataset.userOverride = 'true';
          exchangeRateInput.dataset.rateSource = 'manual';
          if (activeCurrency) {
            exchangeRateInput.dataset.overrideCurrency = activeCurrency;
          } else {
            delete exchangeRateInput.dataset.overrideCurrency;
          }
        } else {
          delete exchangeRateInput.dataset.userOverride;
          delete exchangeRateInput.dataset.rateSource;
          delete exchangeRateInput.dataset.overrideCurrency;
        }
        recalculatePurchasePriceIdr(row);
      });
      exchangeRateInput.addEventListener('blur', () => {
        syncExchangeRateDatasetFromInput(exchangeRateInput);
        const numericValue = parseNumericValue(exchangeRateInput.dataset.numericValue || '');
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
          delete exchangeRateInput.dataset.userOverride;
          delete exchangeRateInput.dataset.rateSource;
          delete exchangeRateInput.dataset.overrideCurrency;
        }
      });
    }

    const sellerSkuInput = row.querySelector('[data-field="sellerSku"]');
    if (sellerSkuInput) {
      const handleSkuUpdate = () => {
        const skuValue = sellerSkuInput.value?.toString().trim() ?? '';
        if (!skuValue) {
          const averageInput = row.querySelector('[data-field="dailyAverageSales"]');
          if (averageInput && averageInput.value !== '0') {
            averageInput.value = '0';
            averageInput.dispatchEvent(new Event('input', { bubbles: true }));
            averageInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return;
        }
        updateRowAverageFromWarehouse(row);
      };
      sellerSkuInput.addEventListener('change', handleSkuUpdate);
      sellerSkuInput.addEventListener('blur', handleSkuUpdate);

      if (sellerSkuInput.value?.toString().trim()) {
        updateRowAverageFromWarehouse(row);
      }
    }

    updateComputedPricingForRow(row);
    updateArrivalCostForRow(row);
    return row;
  }

  function refreshPricingTableStructure(options = {}) {
    if (!pricingBody || !pricingHeaderRow || suppressPricingRefresh) {
      return;
    }

    const { externalData = null } = options;
    const variantDefs = getVariantDefinitions();
    const sourceData = Array.isArray(externalData) ? externalData : collectPricingRows(variantDefs);
    const combinations = generateVariantCombinations(variantDefs);
    const hasAutoCombinations = combinations.length > 0;

    if (addPricingRowBtn) {
      addPricingRowBtn.classList.add('is-hidden');
      addPricingRowBtn.disabled = true;
    }

    pricingHeaderRow.innerHTML = '';
    if (variantDefs.length) {
      variantDefs.forEach(variant => {
        const th = document.createElement('th');
        th.textContent = variant.name;
        pricingHeaderRow.appendChild(th);
      });
    }

    const staticHeaders = [
      'Harga Beli',
      'Kurs',
      'Nilai Tukar Kurs',
      'Pengiriman',
      'Biaya Kedatangan',
      'Harga Beli (Rp.)',
      'Harga Jual Offline',
      'Harga Jual Entraverse.id',
      'Harga Jual Tokopedia',
      'Harga Jual Shopee',
      'Stok',
      'Rata-rata Penjualan per Hari',
      'SKU Penjual',
      'Berat Barang',
      ''
    ];

    if (!variantDefs.length) {
      staticHeaders.unshift('Varian');
    }

    staticHeaders.forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      if (!label) {
        th.className = 'actions-col';
      }
      pricingHeaderRow.appendChild(th);
    });

    pricingBody.innerHTML = '';

    if (variantDefs.length && hasAutoCombinations) {
      const dataMap = new Map();
      sourceData.forEach(row => {
        const key = buildCombinationKeyFromData(row, variantDefs);
        if (key) {
          dataMap.set(key, row);
        }
      });

      combinations.forEach(combo => {
        const rowData = dataMap.get(combo.key) || {};
        if (!rowData.variants) {
          rowData.variants = combo.variants;
        }
        createPricingRow(rowData, variantDefs, { lockVariantSelection: true });
      });
      updateAllArrivalCosts();
      refreshWarehouseAveragesForPricing();
      return;
    }

    const fallbackData = sourceData.length ? sourceData : [{}];
    fallbackData.forEach(data => {
      createPricingRow(data, variantDefs);
    });
    updateAllArrivalCosts();
    refreshWarehouseAveragesForPricing();
  }

  const variantRowTemplate = () => `
    <td>
      <input type="text" class="variant-name" placeholder="Contoh: Warna" required>
    </td>
    <td>
      <div class="variant-options" data-options>
        <div class="variant-options-list" data-options-list></div>
        <div class="variant-options-input">
          <input type="text" class="variant-option-field" placeholder="Tambah opsi (Enter)" aria-label="Tambah opsi varian" data-option-input>
          <button type="button" class="btn ghost-btn small" data-add-option>Tambah</button>
        </div>
        <p class="field-hint">Contoh: Merah, Biru, Hijau.</p>
      </div>
    </td>
    <td class="variant-actions">
      <button type="button" class="icon-btn danger remove-variant" aria-label="Hapus varian">🗑️</button>
    </td>
  `;

  function addOptionChip(list, rawValue, { silent = false } = {}) {
    if (!list) return false;
    const value = rawValue?.toString().trim();
    if (!value) {
      if (!silent) {
        toast.show('Masukkan nama opsi terlebih dahulu.');
      }
      return false;
    }

    const normalized = value.toLowerCase();
    const exists = Array.from(list.querySelectorAll('[data-option-chip]')).some(
      chip => chip.dataset.optionValue?.toLowerCase() === normalized
    );

    if (exists) {
      if (!silent) {
        toast.show('Opsi tersebut sudah ada.');
      }
      return false;
    }

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'option-chip';
    chip.dataset.optionChip = 'true';
    chip.dataset.optionValue = value;
    chip.innerHTML = `<span>${value}</span><span aria-hidden="true">×</span>`;
    chip.setAttribute('aria-label', `Hapus opsi ${value}`);
    list.appendChild(chip);

    if (!silent && !suppressPricingRefresh) {
      refreshPricingTableStructure();
    }

    return true;
  }

  function hydrateVariantRow(row, initialVariant = null) {
    if (!row) return;
    const optionsList = row.querySelector('[data-options-list]');
    if (initialVariant?.name) {
      const nameInput = row.querySelector('.variant-name');
      if (nameInput) {
        nameInput.value = initialVariant.name;
      }
    }

    if (Array.isArray(initialVariant?.options)) {
      initialVariant.options.forEach(option => addOptionChip(optionsList, option, { silent: true }));
    }
  }

  function createVariantRow(initialVariant = null) {
    if (!variantBody) return null;
    const row = document.createElement('tr');
    row.className = 'variant-row';
    row.innerHTML = variantRowTemplate();
    variantBody.appendChild(row);
    hydrateVariantRow(row, initialVariant);
    if (!suppressPricingRefresh) {
      refreshPricingTableStructure();
    }
    return row;
  }

  const handleAddOption = container => {
    if (!container) return;
    const input = container.querySelector('[data-option-input]');
    const list = container.querySelector('[data-options-list]');
    if (!input || !list) return;

    const added = addOptionChip(list, input.value);
    if (added) {
      input.value = '';
    }
    input.focus();
  };

  addVariantBtn?.addEventListener('click', () => {
    createVariantRow();
  });

  variantBody?.addEventListener('click', event => {
    const addButton = event.target.closest('[data-add-option]');
    if (addButton) {
      handleAddOption(addButton.closest('[data-options]'));
      return;
    }

    const chip = event.target.closest('[data-option-chip]');
    if (chip) {
      chip.remove();
      if (!suppressPricingRefresh) {
        refreshPricingTableStructure();
      }
      return;
    }

    const button = event.target.closest('.remove-variant');
    if (!button) return;
    button.closest('tr')?.remove();
    if (!suppressPricingRefresh) {
      refreshPricingTableStructure();
    }
  });

  variantBody?.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    if (!event.target.matches('[data-option-input]')) return;
    event.preventDefault();
    handleAddOption(event.target.closest('[data-options]'));
  });

  variantBody?.addEventListener('input', event => {
    if (!event.target.matches('.variant-name')) return;
    if (!suppressPricingRefresh) {
      refreshPricingTableStructure();
    }
  });

  addPricingRowBtn?.addEventListener('click', () => {
    toast.show('Daftar harga dibuat otomatis dari varian yang tersedia.');
  });

  if (editingId) {
    let products = getProductsFromCache();
    let product = products.find(p => p.id === editingId);

    if (!product) {
      await dataPreparationPromise;
      if (!dataPreparationError) {
        products = getProductsFromCache();
        product = products.find(p => p.id === editingId);
      }
    }

    if (!product) {
      toast.show('Produk tidak ditemukan.');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 900);
      if (!variantBody?.children.length) {
        createVariantRow();
      }
      return;
    }

    form.dataset.editingId = product.id;

    if (titleEl) {
      titleEl.textContent = 'Edit Produk';
    }
    if (subtitleEl) {
      subtitleEl.textContent = 'Perbarui detail produk dan varian Anda.';
    }
    if (submitBtn) {
      submitBtn.textContent = 'Simpan Perubahan';
    }

    const nameInput = form.querySelector('#product-name');
    if (nameInput) {
      nameInput.value = product.name ?? '';
    }
    if (categorySelect) {
      populateCategorySelect(categorySelect, {
        selectedValue: product.category ?? '',
        helperEl: categoryHelper
      });
    }
    const brandInput = form.querySelector('#product-brand');
    if (brandInput) {
      brandInput.value = product.brand ?? '';
    }
    const descriptionInput = form.querySelector('#product-description');
    if (descriptionInput) {
      descriptionInput.value = product.description ?? '';
    }
    const tradeToggle = form.querySelector('#trade-in-toggle');
    if (tradeToggle) {
      tradeToggle.checked = Boolean(product.tradeIn);
    }
    const inventoryFields = {
      initialStockPrediction: form.querySelector('#initial-stock-prediction'),
      leadTime: form.querySelector('#lead-time'),
      reorderPoint: form.querySelector('#reorder-point'),
      weightGrams: weightInput,
      packageLengthCm: packageLengthInput,
      packageWidthCm: packageWidthInput,
      packageHeightCm: packageHeightInput,
      packageVolumeCm3: packageVolumeInput
    };
    const inventory = product.inventory ?? {};
    Object.entries(inventoryFields).forEach(([key, input]) => {
      if (!input) return;
      let value = inventory?.[key] ?? '';

      if (value === null || typeof value === 'undefined') {
        value = '';
      }

      if (key === 'packageVolumeCm3') {
        if (!value) {
          input.value = '';
          return;
        }

        const numericValue = Number.parseFloat(value);
        if (Number.isFinite(numericValue)) {
          const shouldConvertFromCm3 = numericValue >= 1000;
          const cbmValue = shouldConvertFromCm3 ? convertCm3ToCbm(numericValue) : numericValue;
          const formattedValue = formatCbmValue(cbmValue);
          input.value = formattedValue;
        } else {
          input.value = value;
        }
        return;
      }

      input.value = value;
    });

    updatePackageVolume({ preferExisting: true });

    if (Array.isArray(product.photos)) {
      product.photos.slice(0, photoInputs.length).forEach((photo, index) => {
        const inputField = photoInputs[index];
        if (!inputField) return;
        const container = inputField.closest('.image-upload');
        const preview = container?.querySelector('[data-preview-image]');
        if (!container || !preview) return;
        preview.src = photo;
        preview.alt = product.name ? `Foto ${product.name}` : 'Foto produk';
        preview.hidden = false;
        container.classList.add('has-image');
        container.dataset.photoValue = photo;
      });
    }

    if (variantBody) {
      suppressPricingRefresh = true;
      variantBody.innerHTML = '';
      if (Array.isArray(product.variants) && product.variants.length) {
        product.variants.forEach(variant => createVariantRow(variant));
      }
      suppressPricingRefresh = false;
      refreshPricingTableStructure();
    }

    if (pricingBody) {
      const fallbackDailyAverage = (product.inventory?.dailyAverageSales ?? '').toString().trim();
      const pricingData = Array.isArray(product.variantPricing) && product.variantPricing.length
        ? product.variantPricing.map(row => {
            if (!row) return row;
            if (!fallbackDailyAverage) return row;
            const existingValue = (row.dailyAverageSales ?? '').toString().trim();
            if (existingValue) {
              return row;
            }
            return { ...row, dailyAverageSales: fallbackDailyAverage };
          })
        : [{}];
      refreshPricingTableStructure({ externalData: pricingData });
    }
  } else {
    refreshPricingTableStructure();
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    updatePackageVolume();
    if (categorySelect && categorySelect.disabled) {
      toast.show('Tambahkan kategori terlebih dahulu di halaman Kategori.');
      categorySelect.focus();
      return;
    }

    const formData = new FormData(form);
    const categoryValue = (formData.get('category') ?? '').toString().trim();
    const lengthValue = (formData.get('packageLengthCm') ?? '').toString().trim();
    const widthValue = (formData.get('packageWidthCm') ?? '').toString().trim();
    const heightValue = (formData.get('packageHeightCm') ?? '').toString().trim();
    const computedVolume = (() => {
      const lengthNumeric = parseDimensionValue(lengthValue);
      const widthNumeric = parseDimensionValue(widthValue);
      const heightNumeric = parseDimensionValue(heightValue);

      if ([lengthNumeric, widthNumeric, heightNumeric].every(value => value !== null)) {
        const volume = lengthNumeric * widthNumeric * heightNumeric;
        if (Number.isFinite(volume)) {
          const cbm = convertCm3ToCbm(volume);
          if (cbm !== null) {
            const formattedVolume = formatCbmValue(cbm);
            return formattedVolume;
          }
        }
      }

      return (formData.get('packageVolumeCm3') ?? '').toString().trim();
    })();
    const inventoryData = {
      initialStockPrediction: (formData.get('initialStockPrediction') ?? '').toString().trim(),
      leadTime: (formData.get('leadTime') ?? '').toString().trim(),
      reorderPoint: (formData.get('reorderPoint') ?? '').toString().trim(),
      weightGrams: (formData.get('weightGrams') ?? '').toString().trim(),
      packageLengthCm: lengthValue,
      packageWidthCm: widthValue,
      packageHeightCm: heightValue,
      packageVolumeCm3: computedVolume
    };
    const hasInventoryData = Object.values(inventoryData).some(value => (value ?? '').toString().trim());

    if (!categoryValue) {
      toast.show('Pilih kategori produk.');
      categorySelect?.focus();
      return;
    }

    const photos = photoInputs
      .map(input => input.closest('.image-upload')?.dataset.photoValue)
      .filter(Boolean);

    const variantRows = Array.from(form.querySelectorAll('.variant-row'));
    const variants = [];

    for (const row of variantRows) {
      const nameInput = row.querySelector('.variant-name');
      const optionChips = Array.from(row.querySelectorAll('[data-option-chip]'));
      const name = nameInput?.value.trim();
      const options = optionChips.map(chip => chip.dataset.optionValue).filter(Boolean);

      if (!name) {
        toast.show('Nama varian tidak boleh kosong.');
        nameInput?.focus();
        return;
      }

      if (!options.length) {
        toast.show(`Tambahkan minimal satu opsi untuk ${name}.`);
        row.querySelector('[data-option-input]')?.focus();
        return;
      }

      variants.push({ name, options });
    }

    const variantDefs = getVariantDefinitions();
    const rawPricingRows = collectPricingRows(variantDefs);
    const normalizedPricing = rawPricingRows.map(row => {
      const normalized = {
        purchasePrice: (row.purchasePrice ?? '').toString().trim(),
        purchaseCurrency: (row.purchaseCurrency ?? '').toString().trim(),
        exchangeRate: (row.exchangeRate ?? '').toString().trim(),
        purchasePriceIdr: (row.purchasePriceIdr ?? '').toString().trim(),
        shippingMethod: (row.shippingMethod ?? '').toString().trim(),
        arrivalCost: (row.arrivalCost ?? '').toString().trim(),
        offlinePrice: (row.offlinePrice ?? '').toString().trim(),
        entraversePrice: (row.entraversePrice ?? '').toString().trim(),
        tokopediaPrice: (row.tokopediaPrice ?? '').toString().trim(),
        shopeePrice: (row.shopeePrice ?? '').toString().trim(),
        stock: (row.stock ?? '').toString().trim(),
        dailyAverageSales: (row.dailyAverageSales ?? '').toString().trim(),
        sellerSku: (row.sellerSku ?? '').toString().trim(),
        weight: (row.weight ?? '').toString().trim()
      };

      if (row.id) {
        normalized.id = row.id;
      }

      if (variantDefs.length) {
        normalized.variants = variantDefs.map((variant, index) => {
          const source = row.variants?.[index];
          const value = (source?.value ?? '').toString().trim();
          const variantName = (variant.rawName || variant.name).toString().trim();
          return { name: variantName, value };
        });
      } else {
        normalized.variantLabel = (row.variantLabel ?? '').toString().trim();
      }

      return normalized;
    });

    const filteredPricing = normalizedPricing.filter(row => {
      const detailValues = [
        row.purchasePrice,
        row.purchaseCurrency,
        row.exchangeRate,
        row.purchasePriceIdr,
        row.shippingMethod,
        row.arrivalCost,
        row.offlinePrice,
        row.entraversePrice,
        row.tokopediaPrice,
        row.shopeePrice,
        row.stock,
        row.dailyAverageSales,
        row.sellerSku,
        row.weight
      ].map(value => (value ?? '').toString().trim());
      const hasDetails = detailValues.some(Boolean);

      if (variantDefs.length) {
        const hasVariantValue = row.variants?.some(variant => (variant?.value ?? '').toString().trim());
        return hasDetails || hasVariantValue;
      }

      return hasDetails || (row.variantLabel ?? '').toString().trim();
    });

    if (variantDefs.length) {
      const invalidCombination = filteredPricing.some(row => row.variants?.some(variant => !variant.value));
      if (invalidCombination) {
        toast.show('Lengkapi pilihan varian pada daftar harga.');
        return;
      }
    }

    filteredPricing.forEach(row => {
      if (!row.id) {
        row.id = crypto.randomUUID();
      }
    });

    const isEditing = Boolean(form.dataset.editingId);
    const timestamp = Date.now();
    const productId = isEditing ? form.dataset.editingId : crypto.randomUUID();

    let existingProduct = null;
    if (isEditing) {
      const products = getProductsFromCache();
      existingProduct = products.find(p => p.id === productId) ?? null;
      if (!existingProduct) {
        toast.show('Produk tidak ditemukan.');
        return;
      }
    }

    const productPayload = {
      id: productId,
      name: (formData.get('name') ?? '').toString().trim(),
      category: categoryValue,
      brand: (formData.get('brand') ?? '').toString().trim(),
      description: (formData.get('description') ?? '').toString().trim(),
      tradeIn: form.querySelector('#trade-in-toggle')?.checked ?? false,
      inventory: hasInventoryData ? inventoryData : null,
      photos,
      variants,
      variantPricing: filteredPricing
    };

    if (isEditing) {
      productPayload.createdAt = existingProduct?.createdAt ?? timestamp;
      productPayload.updatedAt = timestamp;
    } else {
      productPayload.createdAt = timestamp;
      productPayload.updatedAt = timestamp;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
    }

    try {
      await upsertProductToSupabase(productPayload);
      await refreshProductsFromSupabase();

      let mekariResult = null;
      if (!isEditing) {
        try {
          mekariResult = await syncProductVariantsToMekari({
            baseName: productPayload.name,
            variantPricing: filteredPricing
          });
        } catch (mekariError) {
          console.error('Gagal mengirim produk ke Mekari Jurnal.', mekariError);
          mekariResult = {
            success: false,
            skipped: false,
            attempted: 0,
            createdCount: 0,
            errors: [{ message: mekariError?.message || 'Permintaan ke Mekari gagal.' }]
          };
        }
      }

      const messageParts = [isEditing ? 'Produk berhasil diperbarui.' : 'Produk berhasil disimpan.'];

      if (mekariResult && !mekariResult.skipped) {
        if (Array.isArray(mekariResult.errors) && mekariResult.errors.length) {
          messageParts.push('Namun sinkronisasi ke Mekari Jurnal gagal.');
        } else if (mekariResult.createdCount > 0) {
          messageParts.push('Produk juga dikirim ke Mekari Jurnal.');
        }
      }

      toast.show(messageParts.join(' '));
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);
    } catch (error) {
      console.error('Gagal menyimpan produk.', error);
      toast.show('Gagal menyimpan produk. Coba lagi.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
    }
  });
}

const INTEGRATION_STATUS_SET = new Set(['connected', 'pending', 'available']);

function sanitizeIntegrationLogo(value) {
  if (!value) {
    return '';
  }

  const raw = value.toString().trim();
  if (!raw) {
    return '';
  }

  const lower = raw.toLowerCase();

  if (lower.startsWith('javascript:')) {
    return '';
  }

  if (lower.startsWith('data:')) {
    const dataMatch = lower.match(/^data:image\/(png|jpe?g|gif|svg\+xml|webp);/);
    return dataMatch ? raw : '';
  }

  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('/') ||
    raw.startsWith('./') ||
    raw.startsWith('../') ||
    raw.startsWith('assets/')
  ) {
    return raw;
  }

  return raw.includes(':') ? '' : raw;
}

function sanitizeIntegration(integration) {
  if (!integration || typeof integration !== 'object') {
    return null;
  }

  const raw = { ...integration };
  const sanitized = {};
  sanitized.id = (raw.id ?? '').toString().trim() || createUuid();
  sanitized.name = (raw.name ?? '').toString().trim();
  if (!sanitized.name) {
    return null;
  }

  const rawLogoPath = raw.logoPath ?? raw.logo_path;
  sanitized.logoPath = typeof rawLogoPath === 'string' ? rawLogoPath.trim() : '';

  const providedLogoUrl = sanitizeIntegrationLogo(raw.logoUrl ?? raw.logo_url);
  const fallbackLogoUrl = sanitized.logoPath
    ? sanitizeIntegrationLogo(
        buildSupabasePublicUrl(SUPABASE_STORAGE_BUCKETS.integrationLogos, sanitized.logoPath)
      )
    : '';

  sanitized.logoUrl = providedLogoUrl || fallbackLogoUrl;
  sanitized.category = (raw.category ?? 'Lainnya').toString().trim() || 'Lainnya';

  const status = (raw.status ?? 'available').toString().trim().toLowerCase();
  sanitized.status = INTEGRATION_STATUS_SET.has(status) ? status : 'available';

  sanitized.connectedAccount = (raw.connectedAccount ?? '').toString().trim();
  sanitized.syncFrequency = (raw.syncFrequency ?? 'Manual').toString().trim() || 'Manual';
  sanitized.capabilities = (raw.capabilities ?? '').toString().trim();
  sanitized.apiBaseUrl = (raw.apiBaseUrl ?? '').toString().trim();
  sanitized.authorizationPath = (raw.authorizationPath ?? '').toString().trim();
  sanitized.accessToken = (raw.accessToken ?? '').toString().trim();

  const syncTime = raw.lastSync ? new Date(raw.lastSync) : null;
  sanitized.lastSync = syncTime && !Number.isNaN(syncTime.getTime()) ? syncTime.toISOString() : null;

  sanitized.requiresSetup = sanitized.status === 'pending' && Boolean(raw.requiresSetup);
  sanitized.createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : Date.now();
  sanitized.updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : sanitized.createdAt;

  return sanitized;
}

function setIntegrationCache(integrations) {
  const sanitized = Array.isArray(integrations)
    ? integrations.map(item => sanitizeIntegration(item)).filter(Boolean)
    : [];

  setRemoteCache(STORAGE_KEYS.integrations, sanitized);

  try {
    localStorage.setItem(STORAGE_KEYS.integrations, JSON.stringify(sanitized));
  } catch (error) {
    console.error('Gagal menyimpan data integrasi ke localStorage.', error);
  }

  document.dispatchEvent(
    new CustomEvent('integrations:changed', {
      detail: { integrations: sanitized }
    })
  );

  return sanitized;
}

function getIntegrationsFromCache() {
  return getRemoteCache(STORAGE_KEYS.integrations, []);
}

function ensureIntegrationsSeeded() {
  try {
    if (localStorage.getItem(STORAGE_KEYS.integrations)) {
      return;
    }

    const seeded = DEFAULT_API_INTEGRATIONS
      .map(item => sanitizeIntegration({ ...item }))
      .filter(Boolean);

    setIntegrationCache(seeded);
  } catch (error) {
    console.error('Gagal melakukan seeding data integrasi.', error);
  }
}

function getStoredIntegrations() {
  const cached = getIntegrationsFromCache();
  if (Array.isArray(cached) && cached.length) {
    return cached.map(item => sanitizeIntegration(item)).filter(Boolean);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.integrations);
    if (!raw) {
      const fallback = DEFAULT_API_INTEGRATIONS
        .map(item => sanitizeIntegration({ ...item }))
        .filter(Boolean);
      setIntegrationCache(fallback);
      return fallback;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const sanitized = parsed.map(item => sanitizeIntegration(item)).filter(Boolean);
    setIntegrationCache(sanitized);
    return sanitized;
  } catch (error) {
    console.error('Gagal membaca data integrasi dari localStorage.', error);
    const fallback = DEFAULT_API_INTEGRATIONS
      .map(item => sanitizeIntegration({ ...item }))
      .filter(Boolean);
    setIntegrationCache(fallback);
    return fallback;
  }
}

function setStoredIntegrations(integrations) {
  return setIntegrationCache(integrations);
}

function mapSupabaseIntegration(record) {
  if (!record) {
    return null;
  }

  return sanitizeIntegration({
    id: record.id,
    name: record.name,
    logoUrl: record.logo_url,
    logoPath: record.logo_path,
    category: record.category,
    status: record.status,
    connectedAccount: record.connected_account,
    syncFrequency: record.sync_frequency,
    capabilities: record.capabilities,
    apiBaseUrl: record.api_base_url,
    authorizationPath: record.authorization_path,
    accessToken: record.access_token,
    lastSync: record.last_sync,
    requiresSetup: record.requires_setup,
    createdAt: record.created_at ? new Date(record.created_at).getTime() : Date.now(),
    updatedAt: record.updated_at ? new Date(record.updated_at).getTime() : Date.now()
  });
}

function mapIntegrationToRecord(integration) {
  const sanitized = sanitizeIntegration(integration);
  if (!sanitized) {
    return null;
  }

  return {
    id: sanitized.id,
    name: sanitized.name,
    logo_url: sanitized.logoUrl || null,
    logo_path: sanitized.logoPath || null,
    category: sanitized.category || null,
    status: sanitized.status,
    connected_account: sanitized.connectedAccount || null,
    sync_frequency: sanitized.syncFrequency || null,
    capabilities: sanitized.capabilities || null,
    api_base_url: sanitized.apiBaseUrl || null,
    authorization_path: sanitized.authorizationPath || null,
    access_token: sanitized.accessToken || null,
    last_sync: toIsoTimestamp(sanitized.lastSync),
    requires_setup: Boolean(sanitized.requiresSetup),
    created_at: toIsoTimestamp(sanitized.createdAt) ?? new Date().toISOString(),
    updated_at: toIsoTimestamp(sanitized.updatedAt) ?? new Date().toISOString()
  };
}

async function refreshIntegrationsFromSupabase() {
  await ensureSupabase();
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(SUPABASE_TABLES.integrations)
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  const integrations = (data ?? []).map(mapSupabaseIntegration).filter(Boolean);
  return setIntegrationCache(integrations);
}

async function upsertIntegrationToSupabase(integration) {
  await ensureSupabase();
  const client = getSupabaseClient();
  const payload = mapIntegrationToRecord(integration);
  if (!payload) {
    throw new Error('Data integrasi tidak valid.');
  }

  const nowIso = new Date().toISOString();
  payload.id = payload.id || createUuid();
  payload.created_at = payload.created_at ?? nowIso;
  payload.updated_at = nowIso;

  const { data } = await executeSupabaseMutation({
    client,
    table: SUPABASE_TABLES.integrations,
    method: 'upsert',
    payload,
    options: { onConflict: 'id' },
    transform: builder => builder.select().maybeSingle()
  });

  return mapSupabaseIntegration(data ?? payload);
}

async function deleteIntegrationFromSupabase(id) {
  if (!id) {
    throw new Error('ID integrasi wajib diisi.');
  }

  await ensureSupabase();
  const client = getSupabaseClient();
  const { error } = await client
    .from(SUPABASE_TABLES.integrations)
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

function findIntegrationByName(name) {
  if (!name) {
    return null;
  }

  const normalized = name.toString().trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const integrations = getStoredIntegrations();
  return (
    integrations.find(integration => (integration.name ?? '').toString().trim().toLowerCase() === normalized) ?? null
  );
}

function setMekariIntegrationCache(integration) {
  mekariIntegrationCache = integration ? { ...integration } : null;
  return mekariIntegrationCache;
}

async function resolveMekariIntegration({ refresh = false } = {}) {
  ensureIntegrationsSeeded();

  if (refresh) {
    mekariIntegrationFetchPromise = null;
  } else if (mekariIntegrationCache) {
    return mekariIntegrationCache;
  }

  if (!mekariIntegrationFetchPromise) {
    mekariIntegrationFetchPromise = (async () => {
      let integration = null;

      if (isSupabaseConfigured()) {
        try {
          await refreshIntegrationsFromSupabase();
          integration = findIntegrationByName(MEKARI_INTEGRATION_NAME) ?? null;
        } catch (error) {
          console.warn('Gagal memperbarui data integrasi dari Supabase.', error);
        }
      }

      if (!integration) {
        integration = findIntegrationByName(MEKARI_INTEGRATION_NAME) ?? null;
      }

      return setMekariIntegrationCache(integration);
    })();
  }

  try {
    const resolved = await mekariIntegrationFetchPromise;
    return resolved ?? null;
  } catch (error) {
    mekariIntegrationFetchPromise = null;
    throw error;
  }
}

async function markMekariIntegrationSynced(integration, syncedAt) {
  if (!integration) {
    return null;
  }

  const timestamp = toIsoTimestamp(syncedAt) ?? new Date().toISOString();

  const integrations = getStoredIntegrations();
  const index = integrations.findIndex(item => item.id === integration.id);
  let updatedIntegration = { ...integration, lastSync: timestamp };

  if (index !== -1) {
    const next = [...integrations];
    next[index] = { ...next[index], lastSync: timestamp };
    setStoredIntegrations(next);
    updatedIntegration = next[index];
  } else {
    setMekariIntegrationCache(updatedIntegration);
  }

  if (isSupabaseConfigured()) {
    try {
      await upsertIntegrationToSupabase(updatedIntegration);
    } catch (error) {
      console.warn('Gagal memperbarui waktu sinkronisasi Mekari Jurnal di Supabase.', error);
    }
  }

  setMekariIntegrationCache(updatedIntegration);
  return updatedIntegration;
}

function formatIntegrationSyncTime(value) {
  if (!value) {
    return 'Belum pernah';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Belum pernah';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function sanitizeSalesReport(report) {
  if (!report || typeof report !== 'object') {
    return null;
  }

  const raw = { ...report };
  const sanitized = {};

  sanitized.id = (raw.id ?? '').toString().trim() || createUuid();
  sanitized.productName = (raw.productName ?? '').toString().trim();
  if (!sanitized.productName) {
    return null;
  }

  sanitized.sku = (raw.sku ?? '').toString().trim();
  sanitized.channel = (raw.channel ?? '').toString().trim() || 'Lainnya';

  const period = typeof raw.period === 'object' && raw.period !== null ? raw.period : {};
  const periodKey = (period.key ?? '').toString().trim();
  const periodLabel = (period.label ?? periodKey ?? '').toString().trim();
  sanitized.period = {
    key: periodKey || 'custom',
    label: periodLabel || 'Periode tidak diketahui',
    start: period.start ?? null,
    end: period.end ?? null
  };

  const units = Number(raw.unitsSold);
  sanitized.unitsSold = Number.isFinite(units) && units >= 0 ? units : 0;

  const gross = Number(raw.grossSales);
  sanitized.grossSales = Number.isFinite(gross) ? gross : 0;

  const discounts = Number(raw.discounts);
  sanitized.discounts = Number.isFinite(discounts) ? discounts : 0;

  const netSales = Number(raw.netSales);
  sanitized.netSales = Number.isFinite(netSales) ? netSales : Math.max(0, sanitized.grossSales - sanitized.discounts);

  const cogs = Number(raw.cogs);
  sanitized.cogs = Number.isFinite(cogs) ? cogs : 0;

  const grossProfit = Number(raw.grossProfit);
  sanitized.grossProfit = Number.isFinite(grossProfit)
    ? grossProfit
    : Math.max(0, sanitized.netSales - sanitized.cogs);

  const margin = Number(raw.margin);
  sanitized.margin = Number.isFinite(margin) && margin >= 0
    ? margin
    : sanitized.netSales > 0
      ? sanitized.grossProfit / sanitized.netSales
      : 0;

  const syncStatus = (raw.syncStatus ?? '').toString().trim().toLowerCase();
  sanitized.syncStatus = SALES_REPORT_SYNC_STATUS.has(syncStatus) ? syncStatus : 'scheduled';
  sanitized.syncFrequency = (raw.syncFrequency ?? '').toString().trim() || 'Manual';
  sanitized.integration = (raw.integration ?? '').toString().trim() || 'Mekari Jurnal';

  const syncDate = raw.lastSyncAt ? new Date(raw.lastSyncAt) : null;
  sanitized.lastSyncAt = syncDate && !Number.isNaN(syncDate.getTime()) ? syncDate.toISOString() : null;

  return sanitized;
}

function ensureSalesReportsSeeded() {
  try {
    if (localStorage.getItem(STORAGE_KEYS.salesReports)) {
      return;
    }

    const seeded = DEFAULT_SALES_REPORTS.map(item => sanitizeSalesReport(item)).filter(Boolean);
    localStorage.setItem(STORAGE_KEYS.salesReports, JSON.stringify(seeded));
  } catch (error) {
    console.error('Gagal menyiapkan data laporan penjualan.', error);
  }
}

function getStoredSalesReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.salesReports);
    if (!raw) {
      const fallback = DEFAULT_SALES_REPORTS.map(item => sanitizeSalesReport(item)).filter(Boolean);
      localStorage.setItem(STORAGE_KEYS.salesReports, JSON.stringify(fallback));
      return fallback;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(item => sanitizeSalesReport(item)).filter(Boolean);
  } catch (error) {
    console.error('Gagal membaca data laporan penjualan dari localStorage.', error);
    const fallback = DEFAULT_SALES_REPORTS.map(item => sanitizeSalesReport(item)).filter(Boolean);
    try {
      localStorage.setItem(STORAGE_KEYS.salesReports, JSON.stringify(fallback));
    } catch (storageError) {
      console.error('Gagal menyimpan ulang data laporan penjualan.', storageError);
    }
    return fallback;
  }
}

function setStoredSalesReports(reports) {
  const sanitized = Array.isArray(reports)
    ? reports.map(item => sanitizeSalesReport(item)).filter(Boolean)
    : [];

  try {
    localStorage.setItem(STORAGE_KEYS.salesReports, JSON.stringify(sanitized));
  } catch (error) {
    console.error('Gagal menyimpan data laporan penjualan.', error);
  }

  return sanitized;
}

function toDateOnlyString(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function deriveRangeFromPeriodKey(periodKey) {
  if (!periodKey) {
    return null;
  }

  const quarterMatch = /^([0-9]{4})-q([1-4])$/i.exec(periodKey);
  if (quarterMatch) {
    const year = Number(quarterMatch[1]);
    const quarter = Number(quarterMatch[2]);
    if (Number.isFinite(year) && Number.isFinite(quarter)) {
      const startMonth = (quarter - 1) * 3;
      const start = new Date(Date.UTC(year, startMonth, 1));
      const end = new Date(Date.UTC(year, startMonth + 3, 0));
      return {
        startDate: toDateOnlyString(start),
        endDate: toDateOnlyString(end)
      };
    }
  }

  const monthMatch = /^([0-9]{4})-([0-9]{2})$/.exec(periodKey);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const monthIndex = Number(monthMatch[2]) - 1;
    if (Number.isFinite(year) && Number.isFinite(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
      const start = new Date(Date.UTC(year, monthIndex, 1));
      const end = new Date(Date.UTC(year, monthIndex + 1, 0));
      return {
        startDate: toDateOnlyString(start),
        endDate: toDateOnlyString(end)
      };
    }
  }

  return null;
}

function getProfitLossRangeFromReports(periodKey) {
  if (!periodKey) {
    return null;
  }

  const reports = getStoredSalesReports();
  const match = reports.find(report => report.period?.key === periodKey);
  if (!match) {
    return null;
  }

  const start = toDateOnlyString(match.period?.start);
  const end = toDateOnlyString(match.period?.end);
  if (!start || !end) {
    return null;
  }

  return { startDate: start, endDate: end };
}

function getProfitLossDateRange({ periodKey = 'all', startDate = null, endDate = null } = {}) {
  const normalizedStart = normalizeDateFilterValue(startDate);
  const normalizedEnd = normalizeDateFilterValue(endDate);

  if (normalizedStart || normalizedEnd) {
    return {
      startDate: normalizedStart,
      endDate: normalizedEnd,
      period: periodKey || 'custom'
    };
  }

  if (!periodKey || periodKey === 'all') {
    const today = new Date();
    const end = toDateOnlyString(today);
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return {
      startDate: toDateOnlyString(start),
      endDate: end,
      period: 'custom'
    };
  }

  const fromReports = getProfitLossRangeFromReports(periodKey);
  if (fromReports) {
    return { ...fromReports, period: periodKey };
  }

  const derived = deriveRangeFromPeriodKey(periodKey);
  if (derived) {
    return { ...derived, period: periodKey };
  }

  return { startDate: null, endDate: null, period: periodKey };
}

const DEFAULT_PNL_SUMMARY = Object.freeze({
  revenue: 0,
  cogs: 0,
  gross_profit: 0,
  opex: 0,
  net_income: 0
});

const PNL_NUMERIC_FIELDS = Object.freeze([
  'value',
  'amount',
  'total',
  'balance',
  'net',
  'sum',
  'income',
  'revenue'
]);

function resolveNumericValue(input) {
  const visited = typeof WeakSet === 'function' ? new WeakSet() : null;

  const walk = value => {
    if (value == null) {
      return { found: false, value: 0 };
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? { found: true, value } : { found: false, value: 0 };
    }

    if (typeof value === 'string') {
      const numeric = toNum(value);
      return Number.isFinite(numeric) ? { found: true, value: numeric } : { found: false, value: 0 };
    }

    if (visited) {
      if (visited.has(value)) {
        return { found: false, value: 0 };
      }
      visited.add(value);
    }

    if (Array.isArray(value)) {
      let total = 0;
      let found = false;
      value.forEach(entry => {
        const result = walk(entry);
        if (result.found) {
          total += result.value;
          found = true;
        }
      });
      return found ? { found: true, value: total } : { found: false, value: 0 };
    }

    if (typeof value === 'object') {
      for (const field of PNL_NUMERIC_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(value, field)) {
          const result = walk(value[field]);
          if (result.found) {
            return result;
          }
        }
      }

      for (const child of Object.values(value)) {
        const result = walk(child);
        if (result.found) {
          return result;
        }
      }
    }

    return { found: false, value: 0 };
  };

  return walk(input);
}

function formatDateForMekari(value) {
  const normalized = toDateOnlyString(value);
  if (!normalized) {
    return null;
  }

  const [year, month, day] = normalized.split('-');
  if (!year || !month || !day) {
    return null;
  }

  return `${day}/${month}/${year}`;
}

function resolveMekariApiDetails(integration) {
  const config = (window.entraverseConfig && window.entraverseConfig.mekari) || {};
  const rawBaseUrl =
    (typeof config.baseUrl === 'string' && config.baseUrl) ||
    (typeof integration?.apiBaseUrl === 'string' && integration.apiBaseUrl) ||
    'https://api.jurnal.id';
  const baseUrl = rawBaseUrl ? rawBaseUrl.trim().replace(/\/+$/, '') : 'https://api.jurnal.id';

  const rawToken =
    (typeof config.accessToken === 'string' && config.accessToken) ||
    (typeof integration?.accessToken === 'string' && integration.accessToken) ||
    '';
  const token = rawToken ? rawToken.trim() : '';

  return {
    baseUrl: baseUrl || 'https://api.jurnal.id',
    token
  };
}

async function syncProductVariantsToMekari({ baseName, variantPricing }) {
  const sanitizedName = (baseName ?? '').toString().trim();
  if (!sanitizedName) {
    return { success: false, skipped: true, attempted: 0, createdCount: 0, errors: [] };
  }

  const pricingRows = Array.isArray(variantPricing) ? variantPricing : [];
  const rowsWithSku = pricingRows.filter(row => (row?.sellerSku ?? '').toString().trim());
  if (!rowsWithSku.length) {
    return { success: false, skipped: true, attempted: 0, createdCount: 0, errors: [] };
  }

  let integration;
  try {
    integration = await resolveMekariIntegration();
  } catch (error) {
    console.warn('Gagal mendapatkan konfigurasi integrasi Mekari Jurnal.', error);
    return { success: false, skipped: true, attempted: 0, createdCount: 0, errors: [] };
  }

  if (!integration) {
    console.warn('Integrasi Mekari Jurnal belum tersedia.');
    return { success: false, skipped: true, attempted: 0, createdCount: 0, errors: [] };
  }

  const { baseUrl, token } = resolveMekariApiDetails(integration);
  if (!token) {
    console.warn('Token API Mekari Jurnal tidak ditemukan.');
    return { success: false, skipped: true, attempted: 0, createdCount: 0, errors: [] };
  }

  const endpointBase = baseUrl ? baseUrl.replace(/\/+$/, '') : 'https://api.jurnal.id';
  const endpoint = `${endpointBase}/partner/core/api/v1/products`;

  const result = {
    success: true,
    skipped: false,
    attempted: 0,
    createdCount: 0,
    errors: []
  };

  const seenSkus = new Set();

  const resolveVariantSuffix = row => {
    const values = Array.isArray(row?.variants)
      ? row.variants
          .map(variant => (variant?.value ?? '').toString().trim())
          .filter(Boolean)
      : [];

    if (!values.length) {
      const label = (row?.variantLabel ?? '').toString().trim();
      if (label) {
        values.push(label);
      }
    }

    return values.join(' ').trim();
  };

  const extractErrorMessage = async response => {
    let message = `HTTP ${response.status}`;
    const contentType = response.headers?.get('Content-Type') || '';

    if (contentType.includes('application/json')) {
      try {
        const body = await response.json();
        const candidates = [body?.message, body?.error];
        for (const candidate of candidates) {
          if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
          }
        }
        const errors = body?.errors;
        if (Array.isArray(errors) && errors.length) {
          const joined = errors
            .map(item => {
              if (!item) return '';
              if (typeof item === 'string') return item.trim();
              if (typeof item === 'object') {
                const detail = item.message ?? item.error ?? item.detail ?? item.description;
                return typeof detail === 'string' ? detail.trim() : '';
              }
              return '';
            })
            .filter(Boolean)
            .join(', ');
          if (joined) {
            return joined;
          }
        }
        if (errors && typeof errors === 'object') {
          const values = Object.values(errors)
            .flat()
            .map(item => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);
          if (values.length) {
            return values.join(', ');
          }
        }
      } catch (error) {
        console.warn('Gagal membaca respons error Mekari.', error);
      }
    } else {
      try {
        const text = await response.text();
        if (text) {
          return text.trim();
        }
      } catch (error) {
        console.warn('Gagal membaca respons teks Mekari.', error);
      }
    }

    return message;
  };

  for (const row of rowsWithSku) {
    const rawSku = (row?.sellerSku ?? '').toString().trim();
    if (!rawSku) {
      continue;
    }

    const normalizedSku = rawSku.toLowerCase();
    if (seenSkus.has(normalizedSku)) {
      continue;
    }
    seenSkus.add(normalizedSku);

    result.attempted += 1;

    const variantSuffix = resolveVariantSuffix(row);
    const mekariName = variantSuffix ? `${sanitizedName} ${variantSuffix}` : sanitizedName;

    const buyPriceNumeric = parseNumericValue(row?.purchasePriceIdr);
    const sellPriceNumeric = parseNumericValue(row?.offlinePrice);

    const payload = {
      product: {
        name: mekariName,
        custom_id: rawSku,
        product_code: rawSku,
        buy_price_per_unit: Number.isFinite(buyPriceNumeric)
          ? Math.max(0, Math.round(buyPriceNumeric)).toString()
          : '0',
        sell_price_per_unit: Number.isFinite(sellPriceNumeric)
          ? Math.max(0, Math.round(sellPriceNumeric)).toString()
          : '0',
        taxable_buy: false,
        taxable_sell: false,
        unit_name: 'Unit',
        track_inventory: 'true',
        is_bought: true,
        buy_account_number: '5-50000',
        buy_account_name: 'Beban Pokok Pendapatan',
        is_sold: true,
        sell_account_number: '4-40000',
        sell_account_name: 'Pendapatan',
        inventory_asset_account_name: 'Persediaan Barang'
      }
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: token
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const message = await extractErrorMessage(response);
        result.errors.push({ sku: rawSku, message });
        result.success = false;
        continue;
      }

      result.createdCount += 1;
    } catch (error) {
      result.success = false;
      result.errors.push({ sku: rawSku, message: error?.message || 'Permintaan ke Mekari gagal.' });
    }
  }

  if (!result.attempted) {
    result.skipped = true;
    result.success = false;
  }

  return result;
}

async function fetchMekariProducts({ includeArchive = false, integration: integrationOverride } = {}) {
  const integration = integrationOverride ?? (await resolveMekariIntegration());
  if (!integration) {
    throw new Error('Integrasi Mekari Jurnal belum dikonfigurasi.');
  }

  const { baseUrl, token } = resolveMekariApiDetails(integration);
  if (!token) {
    throw new Error('Token API Mekari Jurnal belum tersedia. Perbarui pengaturan integrasi.');
  }

  const baseParams = new URLSearchParams();
  baseParams.set('include_archive', includeArchive ? 'true' : 'false');

  const toNumber = value => {
    const parsed = parseNumericValue(value);
    return parsed !== null ? Number(parsed) : null;
  };

  const parseBooleanValue = value => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value === 0) {
        return false;
      }
      return value > 0;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) {
        return null;
      }
      if (['true', '1', 'yes', 'y'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no', 'n'].includes(normalized)) {
        return false;
      }
    }
    return null;
  };

  const parsePageFromLink = link => {
    if (!link || (typeof link !== 'string' && typeof link !== 'object')) {
      return null;
    }
    let href = '';
    if (typeof link === 'string') {
      href = link.trim();
    } else if (link && typeof link.href === 'string') {
      href = link.href.trim();
    }
    if (!href) {
      return null;
    }

    try {
      const absolute = new URL(href, baseUrl);
      const pageParam = absolute.searchParams.get('page');
      const parsed = toNumber(pageParam);
      if (parsed !== null) {
        return parsed;
      }
    } catch (error) {
      // Ignore invalid URLs and fall back to regex parsing.
    }

    const match = href.match(/[?&]page=(\d+)/i);
    if (match) {
      const parsed = toNumber(match[1]);
      if (parsed !== null) {
        return parsed;
      }
    }

    return null;
  };

  const parseHeaderNumber = (response, names) => {
    if (!response || typeof response.headers?.get !== 'function') {
      return null;
    }
    for (const name of names) {
      const value = response.headers.get(name);
      if (value === null || value === undefined) {
        continue;
      }
      const parsed = toNumber(value);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  };

  const resolvePagination = (body, response, { page, perPage }) => {
    const pagination = {
      currentPage: Number.isFinite(page) ? Number(page) : toNumber(page),
      totalPages: null,
      nextPage: null,
      perPage: Number.isFinite(perPage) ? Number(perPage) : toNumber(perPage),
      hasMore: null
    };

    const headerCurrent = parseHeaderNumber(response, ['X-Page', 'X-Current-Page', 'X-CurrentPage']);
    if (headerCurrent !== null) {
      pagination.currentPage = headerCurrent;
    }

    const headerTotalPages = parseHeaderNumber(response, [
      'X-Total-Pages',
      'X-TotalPages',
      'X-Pagination-Total-Pages',
      'X-Total-Page'
    ]);
    if (headerTotalPages !== null) {
      pagination.totalPages = headerTotalPages;
    }

    const headerNextPage = parseHeaderNumber(response, ['X-Next-Page', 'X-NextPage']);
    if (headerNextPage !== null) {
      pagination.nextPage = headerNextPage;
    }

    const headerPerPage = parseHeaderNumber(response, ['X-Per-Page', 'X-PerPage']);
    if (headerPerPage !== null) {
      pagination.perPage = headerPerPage;
    }

    const headerHasMore = response?.headers?.get('X-Has-More') ?? response?.headers?.get('X-HasMore');
    const headerHasMoreBool = parseBooleanValue(headerHasMore);
    if (headerHasMoreBool !== null) {
      pagination.hasMore = headerHasMoreBool;
    }

    const candidates = [
      body?.meta?.pagination,
      body?.pagination,
      body?.data?.pagination,
      body?.meta?.paging,
      body?.paging,
      body?.meta
    ];

    const assignFromCandidate = candidate => {
      if (!candidate || typeof candidate !== 'object') {
        return;
      }

      if (pagination.currentPage === null) {
        const current = toNumber(
          candidate.current_page ??
            candidate.currentPage ??
            candidate.page ??
            candidate.page_no ??
            candidate.pageNo ??
            candidate.page_number ??
            candidate.pageNumber
        );
        if (current !== null) {
          pagination.currentPage = current;
        }
      }

      if (pagination.totalPages === null) {
        const total = toNumber(
          candidate.total_pages ??
            candidate.totalPages ??
            candidate.total_page ??
            candidate.totalPage ??
            candidate.last_page ??
            candidate.lastPage ??
            candidate.pages ??
            candidate.total
        );
        if (total !== null) {
          pagination.totalPages = total;
        }
      }

      if (pagination.nextPage === null) {
        const next = toNumber(
          candidate.next_page ??
            candidate.nextPage ??
            candidate.next ??
            candidate.next_page_number ??
            candidate.nextPageNumber ??
            candidate.next_page_no ??
            candidate.nextPageNo
        );
        if (next !== null) {
          pagination.nextPage = next;
        }
      }

      const perPageCandidate = toNumber(
        candidate.per_page ??
          candidate.perPage ??
          candidate.page_size ??
          candidate.pageSize ??
          candidate.limit
      );
      if (perPageCandidate !== null) {
        pagination.perPage = perPageCandidate;
      }

      if (pagination.hasMore === null) {
        const rawHasMore =
          candidate.has_more ??
          candidate.hasMore ??
          candidate.more ??
          candidate.has_next ??
          candidate.hasNext;
        const parsedHasMore = parseBooleanValue(rawHasMore);
        if (parsedHasMore !== null) {
          pagination.hasMore = parsedHasMore;
        }
      }

      const linkContainer =
        candidate.links ?? candidate._links ?? candidate.pagination_links ?? candidate.paginationLinks ?? null;
      if (linkContainer && typeof linkContainer === 'object') {
        const nextLink = linkContainer.next ?? linkContainer.next_page ?? linkContainer.nextPage ?? null;
        const parsedNext = parsePageFromLink(nextLink);
        if (parsedNext !== null) {
          pagination.nextPage = pagination.nextPage !== null ? Math.max(pagination.nextPage, parsedNext) : parsedNext;
          if (pagination.currentPage !== null && parsedNext > pagination.currentPage) {
            pagination.hasMore = true;
          }
        }
      }
    };

    candidates.forEach(assignFromCandidate);

    const bodyLinks = body?.links ?? body?.meta?.links ?? body?.data?.links ?? null;
    if (bodyLinks && typeof bodyLinks === 'object') {
      const nextLink = bodyLinks.next ?? bodyLinks.next_page ?? bodyLinks.nextPage ?? null;
      const parsedNext = parsePageFromLink(nextLink);
      if (parsedNext !== null) {
        pagination.nextPage = pagination.nextPage !== null ? Math.max(pagination.nextPage, parsedNext) : parsedNext;
        if (pagination.currentPage !== null && parsedNext > pagination.currentPage) {
          pagination.hasMore = true;
        }
      }
    }

    if (pagination.hasMore === null && pagination.totalPages !== null && pagination.currentPage !== null) {
      pagination.hasMore = pagination.currentPage < pagination.totalPages;
    }

    if (pagination.hasMore === null && pagination.nextPage !== null && pagination.currentPage !== null) {
      pagination.hasMore = pagination.nextPage > pagination.currentPage;
    }

    if (
      pagination.hasMore === true &&
      (pagination.nextPage === null || !Number.isFinite(pagination.nextPage) || pagination.nextPage <= (pagination.currentPage ?? 0))
    ) {
      const basePage = Number.isFinite(pagination.currentPage) ? pagination.currentPage : toNumber(pagination.currentPage) || 1;
      pagination.nextPage = basePage + 1;
    }

    return pagination;
  };

  const requestPage = async (page, perPage) => {
    const params = new URLSearchParams(baseParams);
    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    params.set('page', safePage.toString());
    if (Number.isFinite(perPage) && perPage > 0) {
      params.set('per_page', Math.floor(perPage).toString());
    }
    const query = params.toString();
    const url = `${baseUrl}/partner/core/api/v1/products${query ? `?${query}` : ''}`;

    const headers = new Headers({ Accept: 'application/json' });
    headers.set('Authorization', token);

    let response;
    try {
      response = await fetch(url, { method: 'GET', headers });
    } catch (networkError) {
      const message = networkError?.message || networkError || 'Gagal terhubung ke API Mekari Jurnal.';
      throw new Error(`[network • -] ${message}`);
    }

    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch (error) {
      bodyText = '';
    }

    if (!bodyText) {
      const pagination = resolvePagination(null, response, { page: safePage, perPage });
      const statusText = response?.status ? ` (status ${response.status})` : '';
      if (!response.ok) {
        throw new Error(`Gagal memuat data produk dari Mekari Jurnal${statusText}.`);
      }
      return { records: [], pagination };
    }

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError) {
      const statusText = response?.status ? ` (status ${response.status})` : '';
      throw new Error(`Respons Mekari Jurnal tidak valid${statusText}.`);
    }

    if (!response.ok) {
      const status = response?.status ? `status ${response.status}` : '';
      const message =
        body?.error || body?.message || body?.response_message || status || 'Gagal memuat data produk Mekari.';
      const trace = body?.trace_id || body?.request_id || null;
      throw new Error(`${status}${trace ? ` • Trace ${trace}` : ''} • ${message}`.trim());
    }

    const payloadCandidates = [
      body?.products,
      body?.data?.products,
      body?.data,
      body?.result?.products,
      body?.result
    ];

    let records = [];
    for (const candidate of payloadCandidates) {
      if (Array.isArray(candidate) && candidate.length) {
        records = candidate.filter(Boolean);
        break;
      }
    }

    if (!Array.isArray(records)) {
      records = [];
    }

    const pagination = resolvePagination(body, response, { page: safePage, perPage });
    return { records, pagination };
  };

  const collected = [];
  const seenKeys = new Set();
  const defaultPerPage = 100;
  let perPage = defaultPerPage;
  let page = 1;
  const maxPages = 200;
  let iterations = 0;

  while (iterations < maxPages) {
    const { records, pagination } = await requestPage(page, perPage);
    iterations += 1;

    const pageSize = Number.isFinite(pagination?.perPage) && pagination.perPage > 0 ? pagination.perPage : perPage;
    perPage = pageSize > 0 ? pageSize : perPage;
    perPage = Number.isFinite(perPage) && perPage > 0 ? Math.floor(perPage) : defaultPerPage;

    let uniqueAdded = 0;
    records.forEach(record => {
      if (!record || typeof record !== 'object') {
        return;
      }

      const skuKey = normalizeSku(record.product_code ?? record.productCode ?? record.sku ?? '');
      let dedupeKey = skuKey ? `sku:${skuKey}` : null;
      if (!dedupeKey) {
        const idCandidate = record.id ?? record.ID ?? record.uuid ?? record._id;
        if (idCandidate !== undefined && idCandidate !== null) {
          try {
            const idKey = idCandidate.toString().trim();
            if (idKey) {
              dedupeKey = `id:${idKey}`;
            }
          } catch (error) {
            dedupeKey = null;
          }
        }
      }

      if (dedupeKey && seenKeys.has(dedupeKey)) {
        return;
      }
      if (dedupeKey) {
        seenKeys.add(dedupeKey);
      }
      collected.push(record);
      uniqueAdded += 1;
    });

    const rawHasMore = pagination?.hasMore;
    const hasMore = rawHasMore === null || rawHasMore === undefined ? null : Boolean(rawHasMore);
    const totalPages = Number.isFinite(pagination?.totalPages) ? pagination.totalPages : null;
    const currentPage = Number.isFinite(pagination?.currentPage) ? pagination.currentPage : page;
    const nextPageCandidate = Number.isFinite(pagination?.nextPage) ? pagination.nextPage : null;

    if (!records.length) {
      if (hasMore === true && nextPageCandidate && nextPageCandidate > currentPage) {
        page = nextPageCandidate;
        continue;
      }
      break;
    }

    if (uniqueAdded === 0 && hasMore !== true) {
      break;
    }

    if (totalPages && currentPage >= totalPages) {
      break;
    }

    let nextPage = null;
    if (nextPageCandidate && nextPageCandidate > currentPage) {
      nextPage = nextPageCandidate;
    } else if (hasMore === true) {
      nextPage = currentPage + 1;
    }

    if (!nextPage) {
      if (hasMore === false && records.length < perPage) {
        break;
      }
      nextPage = currentPage + 1;
    }

    if (!Number.isFinite(nextPage) || nextPage <= currentPage) {
      break;
    }

    page = Math.max(1, Math.floor(nextPage));
  }

  return { products: collected, integration };
}

function extractMekariStock(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

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

function mapMekariProductRecord(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const rawName = record.name ?? '';
  const name = typeof rawName === 'string' ? rawName.trim() : String(rawName).trim();
  if (!name) {
    return null;
  }

  const rawSku = record.product_code ?? record.productCode ?? record.sku ?? '';
  const sku = typeof rawSku === 'string' ? rawSku.trim() : String(rawSku).trim();
  const normalizedSku = normalizeSku(sku);
  if (!normalizedSku) {
    return null;
  }

  const category = (() => {
    if (Array.isArray(record.product_categories)) {
      const match = record.product_categories.find(
        item => item && typeof item.name === 'string' && item.name.trim()
      );
      if (match && match.name) {
        return match.name.trim();
      }
    }

    const categoriesString = (record.product_categories_string ?? '').toString().trim();
    if (categoriesString) {
      const [first] = categoriesString.split(/[,>/]/);
      if (first && first.trim()) {
        return first.trim();
      }
    }

    return 'Lainnya';
  })();

  const description = record.description ? record.description.toString().trim() : '';

  const currencyCandidate = record.company_currency?.code ?? record.currency ?? '';
  let purchaseCurrency = typeof currencyCandidate === 'string' ? currencyCandidate.trim().toUpperCase() : '';
  if (!purchaseCurrency) {
    purchaseCurrency = 'IDR';
  }

  const priceCandidates = [
    record.buy_price_per_unit,
    record.last_buy_price,
    record.average_price,
    record.buyPrice,
    record.purchase_price
  ];
  const priceFormatCandidates = [
    record.buy_price_per_unit_currency_format,
    record.last_buy_price_currency_format,
    record.average_price_currency_format,
    record.purchase_price_currency_format
  ];

  let buyPriceNumber = null;
  for (const candidate of priceCandidates) {
    const parsed = parseNumericValue(candidate);
    if (parsed !== null && Number.isFinite(parsed)) {
      buyPriceNumber = parsed;
      break;
    }
  }

  if (buyPriceNumber === null) {
    for (const candidate of priceFormatCandidates) {
      if (!candidate && candidate !== 0) {
        continue;
      }
      const parsed = parseNumericValue(candidate);
      if (parsed !== null && Number.isFinite(parsed)) {
        buyPriceNumber = parsed;
        break;
      }
    }
  }

  const purchasePrice = buyPriceNumber !== null ? buyPriceNumber.toString() : '';
  const purchasePriceIdr = purchaseCurrency === 'IDR' && buyPriceNumber !== null ? buyPriceNumber.toString() : '';

  const stockValue = extractMekariStock(record);
  const stock = stockValue !== null ? stockValue : '';

  const imageCandidates = [
    record.image?.url,
    record.image?.mini_url,
    record.image?.preview_url,
    record.image_url
  ];
  const photoUrl = imageCandidates
    .map(candidate => {
      if (!candidate && candidate !== 0) {
        return '';
      }
      return candidate.toString().trim();
    })
    .find(url => Boolean(url));
  const photos = photoUrl ? [photoUrl] : [];

  const createdAtSource = record.created_at || record.createdAt || record.init_date;
  const updatedAtSource = record.updated_at || record.updatedAt;

  const createdAt = (() => {
    if (createdAtSource) {
      const parsed = new Date(createdAtSource);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
    return Date.now();
  })();

  const updatedAt = (() => {
    if (updatedAtSource) {
      const parsed = new Date(updatedAtSource);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
    return createdAt;
  })();

  return {
    id: createUuid(),
    name,
    category,
    brand: '',
    description,
    tradeIn: false,
    inventory: null,
    photos,
    variants: [],
    variantPricing: [
      {
        id: createUuid(),
        variantLabel: 'Default',
        purchasePrice,
        purchaseCurrency,
        exchangeRate: '1',
        purchasePriceIdr,
        shippingMethod: '',
        arrivalCost: '',
        offlinePrice: '',
        entraversePrice: '',
        tokopediaPrice: '',
        shopeePrice: '',
        stock,
        dailyAverageSales: '',
        sellerSku: sku,
        weight: ''
      }
    ],
    stock,
    mekariStatus: normalizeMekariStatus({
      state: 'synced',
      lastSyncedAt: Date.now(),
      message: 'Diimpor dari Mekari Jurnal'
    }),
    createdAt,
    updatedAt
  };
}

async function fetchPnL({ start, end } = {}) {
  const qs = new URLSearchParams();
  const formattedStart = formatDateForMekari(start);
  const formattedEnd = formatDateForMekari(end);

  if (formattedStart) qs.set('start_date', formattedStart);
  if (formattedEnd) qs.set('end_date', formattedEnd);

  const integration = await resolveMekariIntegration();
  if (!integration) {
    throw new Error('Integrasi Mekari Jurnal belum dikonfigurasi.');
  }

  const baseUrl = (integration.apiBaseUrl || 'https://api.jurnal.id').replace(/\/+$/, '');
  const query = qs.toString();
  const url = `${baseUrl}/partner/core/api/v1/profit_and_loss${query ? `?${query}` : ''}`;

  const token = (integration.accessToken || '').trim();
  if (!token) {
    throw new Error('Token API Mekari Jurnal belum tersedia. Perbarui pengaturan integrasi.');
  }

  const headers = new Headers({ Accept: 'application/json' });
  headers.set('Authorization', token);

  let response;
  try {
    response = await fetch(url, { method: 'GET', headers });
  } catch (networkError) {
    const message = networkError?.message || networkError || 'Gagal terhubung ke API Mekari Jurnal.';
    throw new Error(`[network • -] ${message}`);
  }

  let bodyText = '';
  try {
    bodyText = await response.text();
  } catch (error) {
    bodyText = '';
  }

  if (!bodyText) {
    const statusText = response?.status ? ` (status ${response.status})` : '';
    if (!response.ok) {
      throw new Error(`Gagal memuat data P&L dari Mekari Jurnal${statusText}.`);
    }
    throw new Error('Respons Mekari Jurnal tidak berisi data.');
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch (parseError) {
    const statusText = response?.status ? ` (status ${response.status})` : '';
    throw new Error(`Respons Mekari Jurnal tidak valid${statusText}.`);
  }

  if (!response.ok) {
    const status = response?.status ? `status ${response.status}` : '';
    const message =
      body?.error || body?.message || body?.response_message || status || 'Gagal memuat data P&L Mekari.';
    const trace = body?.trace_id || body?.request_id || null;
    throw new Error(`${status}${trace ? ` • Trace ${trace}` : ''} • ${message}`.trim());
  }

  const payload = body?.data ?? body?.result ?? body?.report ?? body;
  return payload;
}

const toNum = value => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    const parenNegative = /^\(.*\)$/.test(trimmed.replace(/\s+/g, ''));

    const sanitized = trimmed.replace(/\s+/g, '').replace(/[^0-9,.-]/g, '');
    if (!sanitized) {
      return 0;
    }

    const hasLeadingMinus = sanitized.startsWith('-');
    const negative = hasLeadingMinus || parenNegative;
    const unsigned = hasLeadingMinus ? sanitized.slice(1) : sanitized;

    const commaCount = (unsigned.match(/,/g) || []).length;
    const dotCount = (unsigned.match(/\./g) || []).length;

    let normalized = unsigned;
    if (commaCount && dotCount) {
      normalized = unsigned.replace(/\./g, '').replace(/,/g, '.');
    } else if (commaCount) {
      normalized = unsigned.replace(/,/g, '.');
    } else if (dotCount > 1) {
      normalized = unsigned.replace(/\./g, '');
    } else if (dotCount === 1) {
      const [head, tail = ''] = unsigned.split('.');
      if (tail.length === 3 && Number(head) >= 1) {
        normalized = `${head}${tail}`;
      }
    }

    const numeric = Number(`${negative ? '-' : ''}${normalized}`);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

function flattenPnLLines(payload) {
  const out = [];
  const visited = typeof WeakSet === 'function' ? new WeakSet() : null;
  const numericKeys = ['amount', 'value', 'total', 'balance', 'net', 'sum'];

  const hasNumericKey = node =>
    numericKeys.some(key => Object.prototype.hasOwnProperty.call(node, key));

  const aggregateFromCollection = collection => {
    let aggregated = 0;
    let found = false;

    collection.forEach(entry => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      if (!found && hasNumericKey(entry)) {
        found = true;
      }

      aggregated += toNum(
        entry.amount ?? entry.value ?? entry.total ?? entry.balance ?? entry.net ?? entry.sum
      );
    });

    return { aggregated, found };
  };

  const crawl = node => {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (visited) {
      if (visited.has(node)) {
        return;
      }
      visited.add(node);
    }

    if (Array.isArray(node)) {
      node.forEach(child => crawl(child));
      return;
    }

    const name = node.name || node.account_name || node.title || node.label;

    const hasDirectNumeric = hasNumericKey(node);
    let amount = toNum(
      node.amount ?? node.value ?? node.total ?? node.balance ?? node.net ?? node.sum
    );
    let hasValue = hasDirectNumeric && Number.isFinite(amount);

    if (!hasValue) {
      const nestedSources = [node.data, node.entries, node.values, node.details];
      for (const source of nestedSources) {
        if (!Array.isArray(source) || !source.length) {
          continue;
        }

        const { aggregated, found } = aggregateFromCollection(source);
        if (found) {
          amount = aggregated;
          hasValue = true;
          break;
        }
      }
    }

    if (name != null && hasValue) {
      const categoryName =
        node.category && typeof node.category === 'object' && node.category.name != null
          ? String(node.category.name)
          : null;

      out.push({ name: String(name), amount, category: categoryName });
    }

    const candidateCollections = [
      node.children,
      node.items,
      node.data,
      node.lines,
      node.results,
      node.sections,
      node.report,
      node.accounts,
      node.entries,
      node.values,
      node.details
    ];

    candidateCollections.forEach(collection => {
      if (Array.isArray(collection)) {
        collection.forEach(child => crawl(child));
      } else if (collection && typeof collection === 'object' && !(collection instanceof Date)) {
        crawl(collection);
      }
    });

    Object.values(node).forEach(value => {
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        crawl(value);
      }
    });
  };

  crawl(payload);
  return out;
}

function extractAggregatedPnL(payload) {
  const queue = [{ node: payload, key: null }];
  const keyMap = {
    revenue: ['totalrevenue', 'revenue', 'pendapatan', 'primaryincome', 'salesincome'],
    cogs: ['totalcogs', 'cogs', 'costofgoodssold', 'costofgoodsold', 'costofgoods', 'hpp'],
    gross_profit: ['grossprofit', 'labakotor'],
    opex: [
      'operatingexpenses',
      'operatingexpense',
      'bebanoperasional',
      'bebanusaha',
      'opex',
      'expense',
      'expenses'
    ],
    other_income: ['otherincome', 'pendapatanlain', 'nonoperatingincome'],
    other_expense: ['otherexpense', 'bebanlain', 'nonoperatingexpense'],
    tax: ['tax', 'pajak', 'taxexpense'],
    net_income: [
      'netincome',
      'netoperatingincome',
      'lababersih',
      'profit',
      'totalcomprehensiveincome'
    ]
  };

  const normalizeKey = key => key.toString().toLowerCase().replace(/[\s_\-]/g, '');

  while (queue.length) {
    const { node: current, key: parentKey } = queue.shift();
    if (!current || typeof current !== 'object') {
      continue;
    }
    if (Array.isArray(current)) {
      current.forEach(child => {
        queue.push({ node: child, key: parentKey || null });
      });
      continue;
    }

    const normalized = {};
    for (const [key, value] of Object.entries(current)) {
      const normalizedKey = normalizeKey(key);
      normalized[normalizedKey] = value;
      queue.push({ node: value, key: normalizedKey });
    }

    if (parentKey) {
      normalized[parentKey] = current;
    }

    const hasAggregate = Object.values(keyMap).some(patterns =>
      patterns.some(pattern => typeof normalized[pattern] !== 'undefined')
    );

    if (hasAggregate) {
      const aggregate = {};
      let foundAny = false;

      for (const [bucket, patterns] of Object.entries(keyMap)) {
        for (const pattern of patterns) {
          if (typeof normalized[pattern] === 'undefined') {
            continue;
          }

          const result = resolveNumericValue(normalized[pattern]);
          if (result.found) {
            aggregate[bucket] = result.value;
            foundAny = true;
            break;
          }
        }
      }

      const filledBuckets = Object.entries(aggregate).filter(([, value]) =>
        typeof value === 'number' && Number.isFinite(value)
      );

      if (foundAny && filledBuckets.length >= 2) {
        const rawNet = aggregate.net_income;
        const revenue = aggregate.revenue ?? 0;
        const rawCogs = aggregate.cogs ?? 0;
        const rawOpex = aggregate.opex ?? 0;
        const rawTax = aggregate.tax ?? 0;
        const otherIncome = aggregate.other_income ?? 0;
        const rawOtherExpense = aggregate.other_expense ?? 0;
        const otherExpense = rawOtherExpense <= 0 ? rawOtherExpense : -Math.abs(rawOtherExpense);
        const gross =
          typeof aggregate.gross_profit === 'number'
            ? aggregate.gross_profit
            : revenue + (rawCogs <= 0 ? rawCogs : -Math.abs(rawCogs));
        const cogs = rawCogs <= 0 ? rawCogs : -Math.abs(rawCogs);
        const opex = rawOpex <= 0 ? rawOpex : -Math.abs(rawOpex);
        const tax = rawTax <= 0 ? rawTax : -Math.abs(rawTax);
        const otherNet = otherIncome + otherExpense;
        const net =
          typeof rawNet === 'number' && Number.isFinite(rawNet)
            ? rawNet
            : gross + opex + tax + otherNet;

        return {
          revenue,
          cogs,
          gross_profit: gross,
          opex,
          net_income: net
        };
      }
    }

  }

  return null;
}

function toSummary(lines) {
  const rx = {
    revenue: /(pendapatan(?!.*lain)|penjualan|revenue|sales|income(?!.*other))/i,
    cogs: /(hpp|beban pokok|cost of goods|cogs)/i,
    opex: /(biaya|beban (usaha|operasional)|operating expense|selling|general|administrative|sg&a)/i,
    other_income: /(pendapatan lain|other income|non-?operating income)/i,
    other_expense: /(beban lain|other expense|non-?operating expense)/i,
    tax: /(pajak|tax)/i
  };

  const sums = { revenue: 0, cogs: 0, opex: 0, other_income: 0, other_expense: 0, tax: 0 };

  for (const { name, amount, category } of lines) {
    if (name == null && category == null) {
      continue;
    }

    let classified = false;

    const apply = bucket => {
      sums[bucket] += amount;
      classified = true;
    };

    const categoryName = category ? String(category) : '';
    if (categoryName) {
      const categoryPatterns = [
        { rx: /(other income|pendapatan lain)/i, bucket: 'other_income' },
        { rx: /(other expense|beban lain)/i, bucket: 'other_expense' },
        { rx: /(cost of sales|cost of goods|beban pokok)/i, bucket: 'cogs' },
        { rx: /(expense|beban|biaya)/i, bucket: 'opex' },
        { rx: /(income|pendapatan|penjualan)/i, bucket: 'revenue' }
      ];

      for (const { rx: pattern, bucket } of categoryPatterns) {
        if (pattern.test(categoryName)) {
          apply(bucket);
          break;
        }
      }
    }

    if (classified) {
      continue;
    }

    const label = name ? String(name) : '';
    if (!label) {
      continue;
    }

    if (rx.cogs.test(label)) apply('cogs');
    else if (rx.opex.test(label)) apply('opex');
    else if (rx.other_expense.test(label)) apply('other_expense');
    else if (rx.other_income.test(label)) apply('other_income');
    else if (rx.tax.test(label)) apply('tax');
    else if (rx.revenue.test(label)) apply('revenue');
  }

  const gross_profit = sums.revenue - Math.abs(sums.cogs);
  const other_net = sums.other_income - Math.abs(sums.other_expense);
  const pretax = gross_profit - Math.abs(sums.opex) + other_net;
  const net_income = pretax - Math.abs(sums.tax);

  return {
    revenue: sums.revenue,
    cogs: -Math.abs(sums.cogs),
    gross_profit,
    opex: -Math.abs(sums.opex),
    net_income
  };
}

function mapProfitAndLossPayload(payload) {
  let summary = null;
  const aggregate = extractAggregatedPnL(payload);
  if (aggregate) {
    summary = {
      revenue: aggregate.revenue ?? 0,
      cogs: aggregate.cogs ?? 0,
      gross_profit: aggregate.gross_profit ?? (aggregate.revenue ?? 0) + (aggregate.cogs ?? 0),
      opex: aggregate.opex ?? 0,
      net_income: aggregate.net_income ?? 0
    };
  }

  if (!summary) {
    const lines = flattenPnLLines(payload);
    if (!lines.length) {
      summary = { ...DEFAULT_PNL_SUMMARY };
    } else {
      summary = toSummary(lines);
    }
  }

  const reportRoot =
    payload && typeof payload === 'object' && payload.profit_and_loss
      ? payload.profit_and_loss
      : payload;

  const headerComprehensive = resolveNumericValue(reportRoot?.header?.total_comprehensive_income);
  const headerNet = resolveNumericValue(reportRoot?.header?.net_income);

  if (headerComprehensive.found) {
    summary.net_income = headerComprehensive.value;
  } else if (headerNet.found) {
    summary.net_income = headerNet.value;
  }

  return summary;
}

function createProfitLossSummaryUI() {
  const container = document.querySelector('[data-pnl-summary]');
  if (!container) {
    return {
      setLoading() {},
      setCards() {},
      setLastSync() {},
      setError() {},
      setIntegration() {}
    };
  }

  const valueElements = {
    revenue: container.querySelector('[data-pnl-value="revenue"]'),
    cogs: container.querySelector('[data-pnl-value="cogs"]'),
    gross_profit: container.querySelector('[data-pnl-value="gross_profit"]'),
    opex: container.querySelector('[data-pnl-value="opex"]'),
    net_income: container.querySelector('[data-pnl-value="net_income"]')
  };

  const errorElement = container.querySelector('[data-pnl-error]');
  const lastSyncElement = container.querySelector('[data-pnl-last-sync]');
  const integrationCard = container.querySelector('[data-pnl-integration]');
  const integrationDetails = container.querySelector('[data-pnl-integration-details]');
  const integrationPlaceholder = container.querySelector('[data-pnl-integration-placeholder]');
  const integrationNameElement = container.querySelector('[data-pnl-integration-name]');
  const integrationAccountElement = container.querySelector('[data-pnl-integration-account]');
  const integrationStatusElement = container.querySelector('[data-pnl-integration-status]');
  const baseUrlElement = container.querySelector('[data-pnl-api-base-url]');
  const authPathElement = container.querySelector('[data-pnl-api-auth-path]');
  const tokenElement = container.querySelector('[data-pnl-api-access-token]');

  const formatAccountingCurrency = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return formatCurrency(0);
    }

    const absoluteValue = Math.abs(numeric);
    const shouldUseCompact = absoluteValue >= 1000;
    const formatted = shouldUseCompact
      ? formatCurrencyCompact(absoluteValue)
      : formatCurrency(absoluteValue);

    if (numeric < 0) {
      return `(${formatted})`;
    }

    return formatted;
  };

  const setCards = (values = DEFAULT_PNL_SUMMARY) => {
    const merged = { ...DEFAULT_PNL_SUMMARY, ...values };
    Object.entries(valueElements).forEach(([key, element]) => {
      if (!element) return;
      const value = merged[key];
      element.textContent = formatAccountingCurrency(value);
    });
  };

  const setLastSync = value => {
    if (!lastSyncElement) return;
    if (!value) {
      lastSyncElement.textContent = '–';
      return;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      lastSyncElement.textContent = '–';
      return;
    }
    const formatted = formatIntegrationSyncTime(date.toISOString());
    lastSyncElement.textContent = formatted && formatted !== 'Belum pernah' ? formatted : '–';
  };

  const setError = message => {
    if (!errorElement) return;
    if (message) {
      errorElement.textContent = message;
      errorElement.hidden = false;
    } else {
      errorElement.hidden = true;
    }
  };

  const setConfigValue = (element, value, { fallback = 'Belum diatur', rawValue = null } = {}) => {
    if (!element) {
      return;
    }

    const wrapper = element.closest('[data-pnl-config-item]');
    const text = typeof value === 'string' ? value.trim() : value;
    const hasValue = Boolean(text);

    if (hasValue) {
      element.textContent = text;
      if (rawValue) {
        element.setAttribute('title', rawValue);
      } else {
        element.removeAttribute('title');
      }
      if (wrapper) {
        wrapper.classList.remove('is-empty');
      }
    } else {
      element.textContent = fallback;
      element.removeAttribute('title');
      if (wrapper) {
        wrapper.classList.add('is-empty');
      }
    }
  };

  const setIntegration = integration => {
    if (!integrationCard) {
      return;
    }

    const hasIntegration = Boolean(integration);
    integrationCard.classList.toggle('is-empty', !hasIntegration);

    if (integrationDetails) {
      integrationDetails.hidden = !hasIntegration;
    }
    if (integrationPlaceholder) {
      integrationPlaceholder.hidden = hasIntegration;
    }

    const statusMeta = getIntegrationStatusMeta(integration?.status ?? 'available');
    if (integrationStatusElement) {
      integrationStatusElement.className = statusMeta.className;
      integrationStatusElement.textContent = statusMeta.label;
    }

    const integrationName = integration?.name || MEKARI_INTEGRATION_NAME;
    if (integrationNameElement) {
      integrationNameElement.textContent = integrationName;
    }

    const connectedAccount = integration?.connectedAccount
      ? `Terhubung sebagai ${integration.connectedAccount}`
      : 'Belum ada akun terhubung';
    if (integrationAccountElement) {
      integrationAccountElement.textContent = connectedAccount;
      integrationAccountElement.classList.toggle('is-empty', !integration?.connectedAccount);
    }

    if (!hasIntegration) {
      setConfigValue(baseUrlElement, '', { fallback: 'Belum diatur' });
      setConfigValue(authPathElement, '', { fallback: 'Belum diatur' });
      setConfigValue(tokenElement, '', { fallback: 'Belum diatur' });
      return;
    }

    const baseUrl = (integration.apiBaseUrl ?? '').toString().trim();
    const authPath = (integration.authorizationPath ?? '').toString().trim();
    const token = (integration.accessToken ?? '').toString().trim();

    setConfigValue(baseUrlElement, baseUrl, {
      fallback: 'Belum diatur',
      rawValue: baseUrl || null
    });
    setConfigValue(authPathElement, authPath, {
      fallback: 'Belum diatur',
      rawValue: authPath || null
    });

    const maskedToken = maskAccessToken(token);
    setConfigValue(tokenElement, maskedToken, {
      fallback: 'Belum diatur',
      rawValue: token || null
    });
  };

  return {
    setLoading: isLoading => {
      container.classList.toggle('is-loading', Boolean(isLoading));
    },
    setCards,
    setLastSync,
    setError,
    setIntegration
  };
}

function getReportStatusMeta(status) {
  switch (status) {
    case 'on-track':
      return { label: 'On Track', className: 'report-status-pill is-on-track' };
    case 'manual':
      return { label: 'Butuh Tindakan Manual', className: 'report-status-pill is-manual' };
    case 'scheduled':
    default:
      return { label: 'Terjadwal', className: 'report-status-pill is-scheduled' };
  }
}

function updateSalesReportMetrics(filtered = [], allReports = []) {
  const totalGross = filtered.reduce((sum, report) => sum + (Number(report.grossSales) || 0), 0);
  const totalNet = filtered.reduce((sum, report) => sum + (Number(report.netSales) || 0), 0);
  const totalProfit = filtered.reduce((sum, report) => sum + (Number(report.grossProfit) || 0), 0);
  const totalUnits = filtered.reduce((sum, report) => sum + (Number(report.unitsSold) || 0), 0);
  const averageMargin = filtered.length
    ? filtered.reduce((sum, report) => sum + (Number(report.margin) || 0), 0) / filtered.length
    : 0;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  };

  setText('report-total-gross', formatCurrencyCompact(totalGross));
  setText('report-total-net', formatCurrencyCompact(totalNet));
  setText('report-total-profit', formatCurrencyCompact(totalProfit));
  setText('report-total-units', formatNumberCompact(totalUnits));
  setText('report-average-margin', formatPercentage(averageMargin));

  const indicator = document.querySelector('.report-sync-indicator');
  if (indicator) {
    const hasHealthySync = allReports.some(
      report => report.syncStatus === 'on-track' || report.syncStatus === 'scheduled'
    );
    indicator.classList.toggle('is-online', hasHealthySync);
  }

  const lastSyncElement = document.getElementById('report-last-sync');
  if (lastSyncElement) {
    const latest = allReports.reduce((latestReport, report) => {
      if (!report?.lastSyncAt) {
        return latestReport;
      }
      const date = new Date(report.lastSyncAt);
      if (Number.isNaN(date.getTime())) {
        return latestReport;
      }
      if (!latestReport || date > latestReport.date) {
        return { date, value: report.lastSyncAt };
      }
      return latestReport;
    }, null);

    lastSyncElement.textContent = latest ? formatIntegrationSyncTime(latest.value) : 'Belum pernah';
  }
}

function getReportPeriodPreset(key) {
  if (!key) {
    return REPORT_PERIOD_PRESETS[0] ?? null;
  }

  return REPORT_PERIOD_PRESETS.find(preset => preset.key === key) || null;
}

function normalizeDateFilterValue(value) {
  const normalized = toDateOnlyString(value);
  return normalized ?? null;
}

function parseDateOnlyValue(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateRangeDisplay(start, end) {
  const format = value => {
    const parsed = parseDateOnlyValue(value);
    if (!parsed) {
      return null;
    }
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(parsed);
  };

  const formattedStart = format(start);
  const formattedEnd = format(end);

  if (formattedStart && formattedEnd) {
    if (formattedStart === formattedEnd) {
      return formattedStart;
    }
    return `${formattedStart} – ${formattedEnd}`;
  }

  if (formattedStart) {
    return `Mulai ${formattedStart}`;
  }

  if (formattedEnd) {
    return `Sampai ${formattedEnd}`;
  }

  return null;
}

function doesReportMatchPeriod(report, { key = 'all', startDate = null, endDate = null } = {}) {
  const filterStart = parseDateOnlyValue(startDate);
  const filterEnd = parseDateOnlyValue(endDate);
  const hasRange = Boolean(filterStart || filterEnd);

  if (!hasRange) {
    if (!key || key === 'all') {
      return true;
    }
    return (report?.period?.key ?? '') === key;
  }

  const reportStart = parseDateOnlyValue(report?.period?.start);
  const reportEnd = parseDateOnlyValue(report?.period?.end ?? report?.period?.start);

  if (!reportStart && !reportEnd) {
    return false;
  }

  const effectiveStart = reportStart || reportEnd;
  const effectiveEnd = reportEnd || reportStart;

  if (filterStart && filterEnd) {
    return effectiveEnd >= filterStart && effectiveStart <= filterEnd;
  }

  if (filterStart) {
    return effectiveEnd >= filterStart;
  }

  if (filterEnd) {
    return effectiveStart <= filterEnd;
  }

  return true;
}

function getPeriodSelectionSignature(selection) {
  if (!selection) {
    return 'all||';
  }

  const key = selection.key ?? 'all';
  const start = selection.start ?? selection.startDate ?? '';
  const end = selection.end ?? selection.endDate ?? '';
  return `${key}|${start || ''}|${end || ''}`;
}

function setupReportDateFilter({ onChange } = {}) {
  const container = document.querySelector('[data-report-date-filter]');
  if (!container) {
    return null;
  }

  const trigger = container.querySelector('[data-date-filter-trigger]');
  const popover = container.querySelector('[data-date-filter-popover]');
  const labelElement = container.querySelector('[data-date-filter-label]');
  const quickButtons = Array.from(container.querySelectorAll('[data-date-filter-preset]'));
  const startInput = container.querySelector('[data-date-filter-start]');
  const endInput = container.querySelector('[data-date-filter-end]');
  const applyButton = container.querySelector('[data-date-filter-apply]');
  const resetButton = container.querySelector('[data-date-filter-reset]');
  const closeButton = container.querySelector('[data-date-filter-close]');
  const hiddenKeyInput = container.querySelector('#report-period-filter');
  const hiddenStartInput = container.querySelector('#report-period-start');
  const hiddenEndInput = container.querySelector('#report-period-end');

  const initialSelection = {
    key: hiddenKeyInput?.value || 'all',
    start: hiddenStartInput?.value || null,
    end: hiddenEndInput?.value || null
  };

  const normalizeSelection = selection => {
    if (!selection) {
      return { key: 'all', start: null, end: null };
    }

    const key = selection.key ?? 'custom';
    let start = normalizeDateFilterValue(selection.start ?? selection.startDate);
    let end = normalizeDateFilterValue(selection.end ?? selection.endDate);

    if (key === 'all') {
      start = null;
      end = null;
    }

    return { key, start, end };
  };

  let appliedSelection = normalizeSelection(initialSelection);
  let draftSelection = { ...appliedSelection };

  const updateHiddenInputs = selection => {
    if (hiddenKeyInput) {
      hiddenKeyInput.value = selection.key ?? 'custom';
    }
    if (hiddenStartInput) {
      hiddenStartInput.value = selection.start ?? '';
    }
    if (hiddenEndInput) {
      hiddenEndInput.value = selection.end ?? '';
    }
  };

  const updateQuickButtons = selection => {
    quickButtons.forEach(button => {
      const presetKey = button.dataset.dateFilterPreset;
      button.classList.toggle('is-active', Boolean(presetKey) && presetKey === selection.key);
    });
  };

  const updateInputs = selection => {
    if (startInput) {
      startInput.value = selection.start ?? '';
    }
    if (endInput) {
      endInput.value = selection.end ?? '';
    }
  };

  const updateLabel = selection => {
    if (!labelElement) {
      return;
    }

    const preset = getReportPeriodPreset(selection.key);
    const rangeText = formatDateRangeDisplay(selection.start, selection.end);

    if (selection.key === 'all' && !selection.start && !selection.end) {
      labelElement.textContent = preset?.label ?? 'Semua periode';
      return;
    }

    if (preset && rangeText) {
      labelElement.textContent = `${preset.label} • ${rangeText}`;
      return;
    }

    if (preset && !selection.start && !selection.end) {
      labelElement.textContent = preset.label;
      return;
    }

    labelElement.textContent = rangeText || 'Periode kustom';
  };

  const setDraftSelection = selection => {
    draftSelection = normalizeSelection(selection);
    updateQuickButtons(draftSelection);
    updateInputs(draftSelection);
  };

  const setAppliedSelection = (selection, { silent = false } = {}) => {
    appliedSelection = normalizeSelection(selection);
    updateHiddenInputs(appliedSelection);
    updateLabel(appliedSelection);

    if (!silent && typeof onChange === 'function') {
      onChange({ ...appliedSelection });
    }
  };

  const resetDraftToApplied = () => {
    setDraftSelection(appliedSelection);
  };

  const closePopover = () => {
    if (!popover) {
      return;
    }
    popover.hidden = true;
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    }
    resetDraftToApplied();
  };

  const openPopover = () => {
    if (!popover) {
      return;
    }
    popover.hidden = false;
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
    }
    resetDraftToApplied();
  };

  const applyDraftSelection = ({ close = true, silent = false } = {}) => {
    setAppliedSelection(draftSelection, { silent });
    if (close) {
      closePopover();
    }
  };

  const getSelection = () => ({ ...appliedSelection });

  if (trigger) {
    trigger.addEventListener('click', () => {
      if (!popover) {
        return;
      }
      if (popover.hidden) {
        openPopover();
      } else {
        closePopover();
      }
    });
  }

  document.addEventListener('click', event => {
    if (!container.contains(event.target)) {
      closePopover();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closePopover();
    }
  });

  quickButtons.forEach(button => {
    button.addEventListener('click', () => {
      const presetKey = button.dataset.dateFilterPreset;
      const preset = presetKey ? getReportPeriodPreset(presetKey) : null;
      if (!preset) {
        return;
      }
      const range = typeof preset.getRange === 'function' ? preset.getRange(new Date()) : { start: null, end: null };
      setDraftSelection({ key: preset.key, start: range?.start ?? null, end: range?.end ?? null });
    });
  });

  if (closeButton) {
    closeButton.addEventListener('click', () => {
      closePopover();
      if (trigger) {
        trigger.focus();
      }
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      setDraftSelection({ key: 'all', start: null, end: null });
      applyDraftSelection({ close: false });
    });
  }

  if (applyButton) {
    applyButton.addEventListener('click', () => {
      if (draftSelection.key !== 'custom') {
        applyDraftSelection();
        return;
      }

      const startValue = startInput?.value || '';
      const endValue = endInput?.value || '';

      if (!startValue || !endValue) {
        toast.show('Pilih tanggal mulai dan selesai.');
        return;
      }

      const startDate = parseDateOnlyValue(startValue);
      const endDate = parseDateOnlyValue(endValue);

      if (!startDate || !endDate) {
        toast.show('Format tanggal tidak valid.');
        return;
      }

      if (startDate > endDate) {
        toast.show('Tanggal mulai tidak boleh melebihi tanggal selesai.');
        return;
      }

      setDraftSelection({ key: 'custom', start: startValue, end: endValue });
      applyDraftSelection();
    });
  }

  [startInput, endInput].forEach(input => {
    if (!input) {
      return;
    }
    input.addEventListener('input', () => {
      const startValue = startInput?.value || '';
      const endValue = endInput?.value || '';
      setDraftSelection({ key: 'custom', start: startValue, end: endValue });
    });
  });

  setAppliedSelection(appliedSelection, { silent: true });
  setDraftSelection(appliedSelection);

  return {
    getSelection,
    setSelection: (selection, options) => {
      setDraftSelection(selection);
      applyDraftSelection(options);
    }
  };
}

function setWarehouseMovementsLoading(isLoading, options = {}) {
  const { preservePage = false } = options;
  warehouseMovementsState.loading = Boolean(isLoading);
  if (isLoading) {
    warehouseMovementsState.error = null;
    if (!preservePage) {
      warehouseMovementsState.currentPage = 1;
    }
    warehouseMovementsState.lastFilteredCount = 0;
    if (!warehouseMovementsState.rows.length) {
      const tbody = document.getElementById('warehouse-movements-table-body');
      if (tbody) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="7">Memuat pergerakan barang dari Mekari Jurnal...</td></tr>';
      }
    }
  }
}

function setWarehouseMovementsError(message) {
  warehouseMovementsState.error = message || 'Gagal memuat data pergerakan barang.';
  if (!warehouseMovementsState.rows.length) {
    warehouseMovementsState.currentPage = 1;
    warehouseMovementsState.lastFilteredCount = 0;
    const tbody = document.getElementById('warehouse-movements-table-body');
    if (tbody) {
      tbody.innerHTML = `<tr class="empty-state"><td colspan="7">${escapeHtml(warehouseMovementsState.error)}</td></tr>`;
    }
    const countElement = document.getElementById('warehouse-movement-count');
    if (countElement) {
      countElement.textContent = '0 baris';
    }
  }
}

function sanitizeWarehouseSort(sort) {
  if (!sort || typeof sort !== 'object') {
    return { key: null, direction: 'asc' };
  }

  const key = typeof sort.key === 'string' && sort.key ? sort.key : null;
  const direction = sort.direction === 'desc' ? 'desc' : 'asc';
  return { key, direction };
}

function getCachedWarehouseMovements(signature) {
  if (!signature) {
    return null;
  }

  try {
    const raw = localStorage.getItem(WAREHOUSE_MOVEMENTS_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const cache = JSON.parse(raw);
    if (!cache || typeof cache !== 'object' || cache.signature !== signature) {
      return null;
    }

    if (cache.expiresAt && Number(cache.expiresAt) > 0 && Date.now() > Number(cache.expiresAt)) {
      localStorage.removeItem(WAREHOUSE_MOVEMENTS_CACHE_KEY);
      return null;
    }

    const snapshot = cache.snapshot;
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }

    return {
      rows: Array.isArray(snapshot.rows) ? snapshot.rows.map(row => ({ ...row })) : [],
      header: snapshot.header && typeof snapshot.header === 'object' ? { ...snapshot.header } : null,
      totals: snapshot.totals && typeof snapshot.totals === 'object' ? { ...snapshot.totals } : null,
      warehouses: Number(snapshot.warehouses) || 0,
      currentPage: Number(snapshot.currentPage) || 1,
      pageSize: Number(snapshot.pageSize) || warehouseMovementsState.pageSize || 10,
      sort: sanitizeWarehouseSort(snapshot.sort),
      lastLoadedAt: snapshot.lastLoadedAt || null
    };
  } catch (error) {
    console.error('Gagal membaca cache pergerakan gudang.', error);
    return null;
  }
}

function setCachedWarehouseMovements(signature, state) {
  if (!signature) {
    return;
  }

  const snapshot = {
    rows: Array.isArray(state.rows) ? state.rows.map(row => ({ ...row })) : [],
    header: state.header && typeof state.header === 'object' ? { ...state.header } : null,
    totals: state.totals && typeof state.totals === 'object' ? { ...state.totals } : null,
    warehouses: Number(state.warehouses) || 0,
    currentPage: Number(state.currentPage) || 1,
    pageSize: Number(state.pageSize) || 10,
    sort: sanitizeWarehouseSort(state.sort),
    lastLoadedAt: state.lastLoadedAt || Date.now()
  };

  const payload = {
    signature,
    snapshot,
    expiresAt: Date.now() + WAREHOUSE_MOVEMENTS_CACHE_TTL_MS
  };

  try {
    localStorage.setItem(WAREHOUSE_MOVEMENTS_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Gagal menyimpan cache pergerakan gudang.', error);
  }
}

function normalizeWarehouseMovementsPayload(summary) {
  if (!summary || typeof summary !== 'object') {
    return { header: null, rows: [], totals: null, warehouses: 0 };
  }

  const header = summary.header && typeof summary.header === 'object'
    ? {
        date: summary.header.date ? summary.header.date.toString() : null,
        currency: summary.header.currency ? summary.header.currency.toString() : null,
        companyName: summary.header.company_name ? summary.header.company_name.toString() : null
      }
    : null;

  const list = Array.isArray(summary.list) ? summary.list : [];
  const rows = [];

  const targetName = TARGET_WAREHOUSE_NAME.trim().toLowerCase();
  const trackedWarehouses = new Set();

  list.forEach(entry => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const rawWarehouseName = (entry.warehouse_name ?? 'Gudang Tanpa Nama').toString();
    const warehouseName = rawWarehouseName.trim();
    if (!warehouseName || warehouseName.toLowerCase() !== targetName) {
      return;
    }

    trackedWarehouses.add(warehouseName);

    const products = Array.isArray(entry.products) ? entry.products : [];

    products.forEach(product => {
      if (!product || typeof product !== 'object') {
        return;
      }

      rows.push({
        warehouseName,
        warehouseUrl: entry.warehouse_name_url ? entry.warehouse_name_url.toString() : null,
        productName: (product.product_name ?? product.product_code ?? 'Produk tanpa nama').toString(),
        productCode: product.product_code ? product.product_code.toString() : '',
        units: product.units ? product.units.toString() : '-',
        openingBalance: toNum(product.opening_balance),
        qtyIn: toNum(product.qty_in),
        qtyOut: toNum(product.qty_out),
        closingBalance: toNum(product.closing_balance)
      });
    });
  });

  const totals = rows.length
    ? rows.reduce(
        (acc, item) => ({
          opening: acc.opening + (Number.isFinite(item.openingBalance) ? item.openingBalance : 0),
          in: acc.in + (Number.isFinite(item.qtyIn) ? item.qtyIn : 0),
          out: acc.out + (Number.isFinite(item.qtyOut) ? item.qtyOut : 0),
          closing: acc.closing + (Number.isFinite(item.closingBalance) ? item.closingBalance : 0)
        }),
        { opening: 0, in: 0, out: 0, closing: 0 }
      )
    : null;

  return {
    header,
    rows,
    totals,
    warehouses: trackedWarehouses.size
  };
}

function sortWarehouseRows(rows, sort) {
  const workingRows = Array.isArray(rows) ? rows.slice() : [];
  const { key, direction } = sanitizeWarehouseSort(sort);

  if (!key) {
    return workingRows;
  }

  const multiplier = direction === 'desc' ? -1 : 1;

  workingRows.sort((a, b) => {
    const left = a && typeof a === 'object' ? a[key] : null;
    const right = b && typeof b === 'object' ? b[key] : null;

    if (WAREHOUSE_NUMERIC_SORT_KEYS.has(key)) {
      const valueA = Number(left) || 0;
      const valueB = Number(right) || 0;
      if (valueA === valueB) {
        return 0;
      }
      return valueA < valueB ? -1 * multiplier : 1 * multiplier;
    }

    const textA = left === null || left === undefined ? '' : left.toString();
    const textB = right === null || right === undefined ? '' : right.toString();
    const comparison = textA.localeCompare(textB, 'id', { sensitivity: 'base', numeric: true });
    return comparison * multiplier;
  });

  return workingRows;
}

function updateWarehouseSortIndicators() {
  const sortState = sanitizeWarehouseSort(warehouseMovementsState.sort);
  const buttons = document.querySelectorAll('.table-sort-button[data-sort-key]');

  buttons.forEach(button => {
    const key = button.dataset.sortKey;
    const isActive = key && sortState.key === key;
    button.dataset.sortActive = isActive ? 'true' : 'false';
    if (isActive) {
      button.dataset.sortDirection = sortState.direction;
      const th = button.closest('th');
      if (th) {
        th.setAttribute('aria-sort', sortState.direction === 'desc' ? 'descending' : 'ascending');
      }
    } else {
      button.dataset.sortDirection = '';
      const th = button.closest('th');
      if (th) {
        th.removeAttribute('aria-sort');
      }
    }
  });
}

function renderSalesReports({ search = '' } = {}) {
  const tbody = document.getElementById('warehouse-movements-table-body');
  if (!tbody) {
    return;
  }

  const normalizedSearch = search.toString().trim().toLowerCase();
  const rows = Array.isArray(warehouseMovementsState.rows) ? warehouseMovementsState.rows : [];

  const filtered = normalizedSearch
    ? rows.filter(row => {
        const terms = [row.warehouseName, row.productName, row.productCode]
          .filter(Boolean)
          .map(value => value.toString().toLowerCase());
        return terms.some(value => value.includes(normalizedSearch));
      })
    : rows.slice();

  const sorted = sortWarehouseRows(filtered, warehouseMovementsState.sort);

  warehouseMovementsState.lastFilteredCount = sorted.length;

  const pageSize = Math.max(1, Number(warehouseMovementsState.pageSize) || 10);
  let currentPage = Math.max(1, Number(warehouseMovementsState.currentPage) || 1);
  const totalRows = sorted.length;
  const totalPages = totalRows > 0 ? Math.ceil(totalRows / pageSize) : 0;

  if (!totalPages) {
    currentPage = 1;
  } else if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  if (warehouseMovementsState.currentPage !== currentPage) {
    warehouseMovementsState.currentPage = currentPage;
  }

  const startIndex = totalRows ? (currentPage - 1) * pageSize : 0;
  const endIndex = totalRows ? Math.min(startIndex + pageSize, totalRows) : 0;
  const paginatedRows = totalRows ? sorted.slice(startIndex, endIndex) : [];

  if (!totalRows) {
    const message = warehouseMovementsState.loading
      ? 'Memuat pergerakan barang dari Mekari Jurnal...'
      : warehouseMovementsState.error
        ? warehouseMovementsState.error
        : 'Tidak ada data pergerakan barang untuk filter saat ini.';
    tbody.innerHTML = `<tr class="empty-state"><td colspan="7">${escapeHtml(message)}</td></tr>`;
  } else {
    tbody.innerHTML = paginatedRows
      .map(row => `
        <tr>
          <td>
            <div class="product-cell">
              <strong>${escapeHtml(row.warehouseName)}</strong>
            </div>
          </td>
          <td>
            <div class="product-cell">
              <strong>${escapeHtml(row.productName)}</strong>
              ${row.productCode ? `<span class="product-meta">${escapeHtml(row.productCode)}</span>` : ''}
            </div>
          </td>
          <td>${escapeHtml(row.units || '-')}</td>
          <td>${escapeHtml(formatNumber(row.openingBalance))}</td>
          <td>${escapeHtml(formatNumber(row.qtyIn))}</td>
          <td>${escapeHtml(formatNumber(row.qtyOut))}</td>
          <td>${escapeHtml(formatNumber(row.closingBalance))}</td>
        </tr>
      `)
      .join('');
  }

  const countElement = document.getElementById('warehouse-movement-count');
  if (countElement) {
    countElement.textContent = `${formatNumber(totalRows)} baris`;
  }

  const metaElement = document.getElementById('warehouse-table-meta');
  if (metaElement) {
    const parts = [];
    if (warehouseMovementsState.header?.date) {
      parts.push(`Periode ${warehouseMovementsState.header.date}`);
    }
    if (warehouseMovementsState.header?.currency) {
      parts.push(warehouseMovementsState.header.currency);
    }
    if (warehouseMovementsState.header?.companyName) {
      parts.push(`Perusahaan: ${warehouseMovementsState.header.companyName}`);
    }
    if (totalRows) {
      const startDisplay = startIndex + 1;
      const endDisplay = endIndex;
      const baseText = rows.length !== totalRows
        ? `Menampilkan ${formatNumber(startDisplay)}–${formatNumber(endDisplay)} dari ${formatNumber(totalRows)} produk (total ${formatNumber(rows.length)} produk tersedia)`
        : `Menampilkan ${formatNumber(startDisplay)}–${formatNumber(endDisplay)} dari ${formatNumber(totalRows)} produk`;
      parts.push(baseText);
    } else if (rows.length) {
      parts.push(`0 produk ditemukan dari ${formatNumber(rows.length)} total produk`);
    }
    if (warehouseMovementsState.warehouses) {
      parts.push(`Gudang: ${formatNumber(warehouseMovementsState.warehouses)}`);
    }
    if (warehouseMovementsState.totals) {
      parts.push(
        `Total Saldo Awal: ${formatNumber(warehouseMovementsState.totals.opening)} • Masuk: ${formatNumber(warehouseMovementsState.totals.in)} • Keluar: ${formatNumber(warehouseMovementsState.totals.out)} • Saldo Akhir: ${formatNumber(warehouseMovementsState.totals.closing)}`
      );
    }
    if (warehouseMovementsState.loading) {
      parts.push('Sedang menyinkronkan data gudang...');
    }
    if (warehouseMovementsState.error && !warehouseMovementsState.loading) {
      parts.push(`⚠ ${warehouseMovementsState.error}`);
    }
    metaElement.textContent = parts.filter(Boolean).join(' • ') || 'Data Mekari Jurnal belum dimuat.';
  }

  renderWarehousePagination({
    totalRows,
    pageSize,
    currentPage,
    totalPages,
    start: totalRows ? startIndex + 1 : 0,
    end: totalRows ? endIndex : 0
  });

  updateWarehouseSortIndicators();

  return { filtered: sorted, rows, header: warehouseMovementsState.header };
}

function renderWarehousePagination({ totalRows, pageSize, currentPage, totalPages, start, end }) {
  const container = document.getElementById('warehouse-pagination');
  if (!container) {
    return;
  }

  const info = container.querySelector('[data-pagination-info]');
  const prevButton = container.querySelector('[data-pagination="prev"]');
  const nextButton = container.querySelector('[data-pagination="next"]');
  const jumpContainer = container.querySelector('[data-pagination-jump]');
  const input = container.querySelector('[data-pagination-input]');

  if (!totalRows || !totalPages || totalPages <= 1) {
    container.hidden = true;
    if (info) {
      info.textContent = 'Halaman 1 dari 1';
    }
    if (prevButton) {
      prevButton.disabled = true;
    }
    if (nextButton) {
      nextButton.disabled = true;
    }
    if (jumpContainer) {
      jumpContainer.hidden = true;
    }
    if (input) {
      input.value = '1';
      input.disabled = true;
      input.setAttribute('aria-disabled', 'true');
    }
    return;
  }

  container.hidden = false;

  if (info) {
    const rangeText = `${formatNumber(start)}–${formatNumber(end)} dari ${formatNumber(totalRows)} baris`;
    info.textContent = `Halaman ${currentPage} dari ${totalPages} • ${rangeText}`;
  }

  if (prevButton) {
    prevButton.disabled = currentPage <= 1;
  }

  if (nextButton) {
    nextButton.disabled = currentPage >= totalPages;
  }

  if (jumpContainer) {
    jumpContainer.hidden = false;
  }

  if (input) {
    input.disabled = false;
    input.removeAttribute('aria-disabled');
    input.min = '1';
    input.max = String(totalPages);
    input.value = String(currentPage);
  }

  container.dataset.totalPages = String(totalPages);
  container.dataset.currentPage = String(currentPage);
  container.dataset.pageSize = String(pageSize);
}

function goToWarehousePage(page) {
  const pageSize = Math.max(1, Number(warehouseMovementsState.pageSize) || 10);
  const totalRows = warehouseMovementsState.lastFilteredCount || 0;
  const totalPages = totalRows > 0 ? Math.ceil(totalRows / pageSize) : 0;

  if (!totalPages) {
    warehouseMovementsState.currentPage = 1;
    renderSalesReports({ search: document.getElementById('search-input')?.value ?? '' });
    return;
  }

  const nextPage = Math.min(Math.max(1, Number(page) || 1), totalPages);

  if (nextPage === warehouseMovementsState.currentPage) {
    return;
  }

  warehouseMovementsState.currentPage = nextPage;
  renderSalesReports({ search: document.getElementById('search-input')?.value ?? '' });

  if (warehouseMovementsState.lastSignature) {
    setCachedWarehouseMovements(warehouseMovementsState.lastSignature, warehouseMovementsState);
  }
}

function changeWarehousePage(delta) {
  const currentPage = Math.max(1, Number(warehouseMovementsState.currentPage) || 1);
  goToWarehousePage(currentPage + delta);
}

function setWarehouseSort(sortKey) {
  if (!sortKey) {
    return;
  }

  const currentSort = sanitizeWarehouseSort(warehouseMovementsState.sort);
  const direction = currentSort.key === sortKey && currentSort.direction === 'asc' ? 'desc' : 'asc';

  warehouseMovementsState.sort = { key: sortKey, direction };
  warehouseMovementsState.currentPage = 1;

  renderSalesReports({ search: document.getElementById('search-input')?.value ?? '' });

  if (warehouseMovementsState.lastSignature) {
    setCachedWarehouseMovements(warehouseMovementsState.lastSignature, warehouseMovementsState);
  }
}

async function fetchWarehouseMovements({ start, end } = {}) {
  const qs = new URLSearchParams();
  const formattedStart = formatDateForMekari(start);
  const formattedEnd = formatDateForMekari(end);

  if (formattedStart) qs.set('start_date', formattedStart);
  if (formattedEnd) qs.set('end_date', formattedEnd);

  const integration = await resolveMekariIntegration();
  if (!integration) {
    throw new Error('Integrasi Mekari Jurnal belum dikonfigurasi.');
  }

  const baseUrl = (integration.apiBaseUrl || 'https://api.jurnal.id').replace(/\/+$/, '');
  const query = qs.toString();
  const url = `${baseUrl}/partner/core/api/v1/warehouse_items_stock_movement_summary${query ? `?${query}` : ''}`;

  const token = (integration.accessToken || '').trim();
  if (!token) {
    throw new Error('Token API Mekari Jurnal belum tersedia. Perbarui pengaturan integrasi.');
  }

  const headers = new Headers({ Accept: 'application/json' });
  headers.set('Authorization', token);

  let response;
  try {
    response = await fetch(url, { method: 'GET', headers });
  } catch (networkError) {
    const message = networkError?.message || networkError || 'Gagal terhubung ke API Mekari Jurnal.';
    throw new Error(`[network • warehouse] ${message}`);
  }

  let bodyText = '';
  try {
    bodyText = await response.text();
  } catch (error) {
    bodyText = '';
  }

  if (!bodyText) {
    const statusText = response?.status ? ` (status ${response.status})` : '';
    if (!response.ok) {
      throw new Error(`Gagal memuat data pergerakan barang dari Mekari Jurnal${statusText}.`);
    }
    throw new Error('Respons Mekari Jurnal tidak berisi data pergerakan barang.');
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch (parseError) {
    const statusText = response?.status ? ` (status ${response.status})` : '';
    throw new Error(`Respons Mekari Jurnal tidak valid${statusText}.`);
  }

  if (!response.ok) {
    const status = response?.status ? `status ${response.status}` : '';
    const message =
      body?.error || body?.message || body?.response_message || status || 'Gagal memuat data pergerakan barang Mekari.';
    const trace = body?.trace_id || body?.request_id || null;
    throw new Error(`${status}${trace ? ` • Trace ${trace}` : ''} • ${message}`.trim());
  }

  const payload = body?.warehouse_items_stock_movement_summary ?? body?.data ?? body;
  if (!payload || typeof payload !== 'object') {
    throw new Error('Respons Mekari Jurnal tidak berisi ringkasan pergerakan barang.');
  }

  return payload;
}

async function syncWarehouseMovements({ selection, force = false, showToastOnError = false } = {}) {
  const normalizedSelection = selection ?? getPeriodSelection();
  const signature = getPeriodSelectionSignature(normalizedSelection);

  if (!force && signature === warehouseMovementsState.lastSignature && warehouseMovementsState.rows.length) {
    renderSalesReports({ search: document.getElementById('search-input')?.value ?? '' });
    return { success: true, cached: true };
  }

  let cachedSnapshot = null;
  if (!force) {
    cachedSnapshot = getCachedWarehouseMovements(signature);
    if (cachedSnapshot && cachedSnapshot.rows.length) {
      warehouseMovementsState = {
        ...warehouseMovementsState,
        rows: cachedSnapshot.rows,
        header: cachedSnapshot.header,
        totals: cachedSnapshot.totals,
        warehouses: cachedSnapshot.warehouses,
        lastSignature: signature,
        loading: false,
        error: null,
        currentPage: Math.max(1, Number(cachedSnapshot.currentPage) || 1),
        pageSize: Math.max(1, Number(cachedSnapshot.pageSize) || warehouseMovementsState.pageSize || 10),
        sort: sanitizeWarehouseSort(cachedSnapshot.sort),
        lastLoadedAt: cachedSnapshot.lastLoadedAt || null,
        lastFilteredCount: 0
      };

      renderSalesReports({ search: document.getElementById('search-input')?.value ?? '' });
    }
  }

  setWarehouseMovementsLoading(true, { preservePage: Boolean(cachedSnapshot) });
  renderSalesReports({ search: document.getElementById('search-input')?.value ?? '' });

  try {
    const range = getProfitLossDateRange({
      periodKey: normalizedSelection?.key ?? 'all',
      startDate: normalizedSelection?.start ?? normalizedSelection?.startDate ?? null,
      endDate: normalizedSelection?.end ?? normalizedSelection?.endDate ?? null
    });

    const payload = await fetchWarehouseMovements({ start: range.startDate, end: range.endDate });
    const normalized = normalizeWarehouseMovementsPayload(payload);

    const previousPage = Math.max(1, Number(warehouseMovementsState.currentPage) || 1);
    const pageSize = Math.max(1, Number(warehouseMovementsState.pageSize) || 10);
    const totalPages = normalized.rows.length ? Math.ceil(normalized.rows.length / pageSize) : 1;
    const nextPage = Math.min(previousPage, totalPages) || 1;

    warehouseMovementsState = {
      ...warehouseMovementsState,
      rows: normalized.rows,
      header: normalized.header,
      totals: normalized.totals,
      warehouses: normalized.warehouses,
      lastSignature: signature,
      loading: false,
      error: null,
      currentPage: nextPage,
      lastFilteredCount: 0,
      lastLoadedAt: Date.now()
    };

    setCachedWarehouseMovements(signature, warehouseMovementsState);

    renderSalesReports({ search: document.getElementById('search-input')?.value ?? '' });
    return { success: true, data: normalized };
  } catch (error) {
    warehouseMovementsState = {
      ...warehouseMovementsState,
      loading: false
    };

    const message = error?.message ? String(error.message) : 'Gagal memuat data pergerakan barang.';
    setWarehouseMovementsError(message);
    renderSalesReports({ search: document.getElementById('search-input')?.value ?? '' });

    if (showToastOnError) {
      toast.show(message);
    }

    return { success: false, error };
  }
}

function maskAccessToken(token) {
  if (!token) {
    return '';
  }

  const text = token.toString();
  if (!text.trim()) {
    return '';
  }

  const normalized = text.trim();
  if (normalized.length <= 6) {
    return '••••';
  }

  const prefix = normalized.slice(0, 4);
  const suffix = normalized.slice(-2);
  const hiddenLength = Math.max(2, normalized.length - prefix.length - suffix.length);
  const hidden = '•'.repeat(hiddenLength);
  return `${prefix}${hidden}${suffix}`;
}

function getIntegrationStatusMeta(status) {
  switch (status) {
    case 'connected':
      return { label: 'Tersambung', className: 'status-chip status-chip--connected' };
    case 'pending':
      return { label: 'Menunggu Setup', className: 'status-chip status-chip--pending' };
    default:
      return { label: 'Belum Terhubung', className: 'status-chip status-chip--available' };
  }
}

function updateIntegrationMetrics(integrations = []) {
  const connected = integrations.filter(item => item.status === 'connected').length;
  const pending = integrations.filter(item => item.status === 'pending').length;
  const available = Math.max(0, integrations.length - connected - pending);

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  };

  setText('[data-integrations-connected]', connected);
  setText('[data-integrations-pending]', pending);
  setText('[data-integrations-available]', available);
}

function createIntegrationLogoMarkup(integration) {
  const name = (integration?.name ?? 'Integrasi API').toString().trim() || 'Integrasi API';
  const initials = getNameInitials(name).slice(0, 2) || 'API';
  const logoUrl = sanitizeIntegrationLogo(integration?.logoUrl);

  if (logoUrl) {
    const escapedUrl = escapeHtml(logoUrl);
    const alt = escapeHtml(`Logo ${name}`);
    return `
      <div class="integration-logo">
        <img class="integration-logo__image" src="${escapedUrl}" alt="${alt}" loading="lazy">
      </div>
    `;
  }

  return `
    <div class="integration-logo" aria-hidden="true">
      <span class="integration-logo__initial">${escapeHtml(initials)}</span>
    </div>
  `;
}

function renderIntegrations(filter = '') {
  const tbody = document.getElementById('integrations-table-body');
  if (!tbody) {
    return;
  }

  const integrations = getStoredIntegrations();
  updateIntegrationMetrics(integrations);

  const query = (filter ?? '').toString().trim().toLowerCase();
  const filtered = query
    ? integrations.filter(integration => {
        const fields = [
          integration.name,
          integration.category,
          integration.connectedAccount,
          integration.syncFrequency,
          integration.capabilities
        ]
          .filter(Boolean)
          .map(value => value.toString().toLowerCase());

        return fields.some(text => text.includes(query));
      })
    : integrations;

    if (!filtered.length) {
      const message = query
        ? `Tidak ditemukan integrasi untuk "${escapeHtml(filter)}".`
        : 'Belum ada integrasi terdaftar.';
      tbody.innerHTML = `<tr class="empty-state"><td colspan="7">${message}</td></tr>`;
  } else {
    tbody.innerHTML = filtered
      .map(integration => {
        const statusMeta = getIntegrationStatusMeta(integration.status);
        const account = integration.connectedAccount
          ? `<span class="integration-account">${escapeHtml(integration.connectedAccount)}</span>`
          : '<span class="integration-account is-empty">Belum terhubung</span>';
        const lastSync = formatIntegrationSyncTime(integration.lastSync);
        const requiresSetup = integration.status === 'pending' && integration.requiresSetup;
        const setupNote = requiresSetup
          ? '<span class="integration-note">Butuh konfigurasi token callback</span>'
          : '';

        const baseUrlDisplay = integration.apiBaseUrl
          ? `<code>${escapeHtml(integration.apiBaseUrl)}</code>`
          : '<span class="is-empty">Belum diatur</span>';
        const authPathDisplay = integration.authorizationPath
          ? `<code>${escapeHtml(integration.authorizationPath)}</code>`
          : '<span class="is-empty">Belum diatur</span>';
        const maskedToken = maskAccessToken(integration.accessToken);
        const tokenDisplay = maskedToken
          ? `<span class="token-value" title="${escapeHtml(integration.accessToken)}">${escapeHtml(maskedToken)}</span>`
          : '<span class="is-empty">Belum diatur</span>';

        let actionLabel = 'Hubungkan';
        let actionClass = 'btn primary-btn small';
        let actionState = 'connect';

        if (integration.status === 'connected') {
          actionLabel = 'Putuskan';
          actionClass = 'btn ghost-btn small';
          actionState = 'disconnect';
        } else if (integration.status === 'pending') {
          actionLabel = 'Selesaikan Setup';
          actionClass = 'btn primary-btn small';
          actionState = 'complete';
        }

        const logo = createIntegrationLogoMarkup(integration).trim();

        return `
          <tr data-integration-id="${escapeHtml(integration.id)}">
            <td>
              <div class="integration-name">
                ${logo}
                <div>
                  <strong>${escapeHtml(integration.name)}</strong>
                  <p class="integration-capabilities">${escapeHtml(integration.capabilities)}</p>
                  ${setupNote}
                </div>
              </div>
            </td>
            <td>${escapeHtml(integration.category)}</td>
            <td><span class="${statusMeta.className}">${statusMeta.label}</span></td>
            <td>${account}</td>
            <td>
              <div class="integration-sync">
                <span class="integration-sync__frequency">${escapeHtml(integration.syncFrequency)}</span>
                <span class="integration-sync__meta">Terakhir: ${escapeHtml(lastSync)}</span>
              </div>
            </td>
            <td class="integration-config">
              <dl>
                <div>
                  <dt>Base URL</dt>
                  <dd>${baseUrlDisplay}</dd>
                </div>
                <div>
                  <dt>Auth Path</dt>
                  <dd>${authPathDisplay}</dd>
                </div>
                <div>
                  <dt>Access Token</dt>
                  <dd>${tokenDisplay}</dd>
                </div>
              </dl>
            </td>
            <td class="integration-actions">
              <div class="integration-actions__layout">
                <div class="integration-actions__primary">
                  <button class="${actionClass}" type="button" data-integration-action="toggle" data-action-state="${actionState}">${actionLabel}</button>
                </div>
                <div class="integration-actions__secondary">
                  <button class="btn ghost-btn small" type="button" data-integration-action="edit">Edit</button>
                  <button class="btn danger-btn small" type="button" data-integration-action="delete">Hapus</button>
                </div>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  const countEl = document.getElementById('integration-count');
  if (countEl) {
    const suffix = filtered.length === 1 ? 'integrasi' : 'integrasi';
    countEl.textContent = `${filtered.length} ${suffix}`;
  }
}

async function toggleIntegrationConnection(integrationId) {
  if (!integrationId) {
    return;
  }

  if (!requireCatalogManager('Silakan login untuk mengelola integrasi API.')) {
    throw new Error('Tidak memiliki izin.');
  }

  const integrations = getStoredIntegrations();
  const index = integrations.findIndex(item => item.id === integrationId);
  if (index === -1) {
    throw new Error('Integrasi tidak ditemukan.');
  }

  const integration = { ...integrations[index] };
  const previousStatus = integration.status;

  if (previousStatus === 'connected') {
    integration.status = 'available';
    integration.connectedAccount = '';
    integration.lastSync = null;
    integration.requiresSetup = false;
    integration.updatedAt = Date.now();
  } else {
    integration.status = 'connected';
    if (!integration.connectedAccount) {
      integration.connectedAccount = 'Entraverse API';
    }
    integration.lastSync = new Date().toISOString();
    integration.requiresSetup = false;
    integration.updatedAt = Date.now();
  }

  const updatedList = [...integrations];
  updatedList[index] = integration;

  let supabaseSynced = false;
  if (isSupabaseConfigured()) {
    try {
      await upsertIntegrationToSupabase(integration);
      await refreshIntegrationsFromSupabase();
      supabaseSynced = true;
    } catch (error) {
      console.error('Gagal memperbarui status integrasi di Supabase.', error);
      toast.show('Supabase tidak dapat diakses. Perubahan hanya tersimpan lokal.');
    }
  }

  if (!supabaseSynced) {
    setStoredIntegrations(updatedList);
  }

  const filter = document.getElementById('search-input')?.value ?? '';
  renderIntegrations(filter);

  const message = previousStatus === 'connected'
    ? `${integration.name} telah diputuskan dari Entraverse.`
    : previousStatus === 'pending'
    ? `${integration.name} siap digunakan setelah setup selesai.`
    : `${integration.name} berhasil terhubung.`;
  toast.show(message + (supabaseSynced ? '' : ' (lokal)'));
}

function handleIntegrationActions(options = {}) {
  const tableBody = document.getElementById('integrations-table-body');
  if (!tableBody) {
    return;
  }

  tableBody.addEventListener('click', async event => {
    const button = event.target.closest('[data-integration-action]');
    if (!button) {
      return;
    }

    event.preventDefault();

    const action = button.dataset.integrationAction;
    const row = button.closest('tr');
    const integrationId = row?.dataset.integrationId;
    if (!integrationId) {
      return;
    }

    if (action === 'toggle') {
      button.disabled = true;
      button.classList.add('is-loading');
      try {
        await toggleIntegrationConnection(integrationId);
      } catch (error) {
        console.error('Gagal mengubah status integrasi.', error);
        toast.show('Gagal mengubah status integrasi.');
      } finally {
        button.disabled = false;
        button.classList.remove('is-loading');
      }
      return;
    }

    if (action === 'edit' && typeof options.onEdit === 'function') {
      options.onEdit(integrationId);
      return;
    }

    if (action === 'delete' && typeof options.onDelete === 'function') {
      options.onDelete(integrationId);
    }
  });
}

function initReportsPage() {
  ensureIntegrationsSeeded();

  let mekariIntegration = null;
  const pnlUI = createProfitLossSummaryUI();
  pnlUI.setIntegration(mekariIntegration);

  const refreshMekariIntegrationCard = async ({ refresh = false } = {}) => {
    try {
      const integration = await resolveMekariIntegration({ refresh });
      mekariIntegration = integration ?? null;
      pnlUI.setIntegration(mekariIntegration);
    } catch (error) {
      console.warn('Gagal memperbarui konfigurasi Mekari Jurnal.', error);
    }
  };

  refreshMekariIntegrationCard().catch(error => {
    console.warn('Gagal memuat konfigurasi Mekari Jurnal.', error);
  });

  document.addEventListener('integrations:changed', () => {
    refreshMekariIntegrationCard({ refresh: true });
  });

  const pnlState = {
    lastSignature: null,
    hasData: false,
    loading: false,
    requestSignature: null
  };

  const runInitialSync = async () => {
    let supabaseReady = true;
    try {
      await ensureSeeded();
    } catch (error) {
      supabaseReady = false;
      console.error('Gagal menyiapkan data laporan stok gudang.', error);
      toast.show('Gagal memuat data dari Supabase. Menggunakan data lokal.');
    }

    if (supabaseReady) {
      try {
        await refreshIntegrationsFromSupabase();
      } catch (error) {
        console.error('Gagal memperbarui data integrasi Mekari.', error);
        toast.show('Data integrasi Mekari Jurnal mungkin tidak terbaru.');
      }
    } else {
      setStoredIntegrations(getStoredIntegrations());
    }

    await refreshMekariIntegrationCard({ refresh: true });
  };

  runInitialSync().catch(error => {
    console.error('Gagal menyelesaikan sinkronisasi laporan.', error);
  });

  let dateFilter = null;

  const getPeriodSelection = () => {
    const fallback = {
      key: document.getElementById('report-period-filter')?.value ?? 'all',
      start: document.getElementById('report-period-start')?.value || null,
      end: document.getElementById('report-period-end')?.value || null
    };

    if (dateFilter && typeof dateFilter.getSelection === 'function') {
      const selection = dateFilter.getSelection();
      return {
        key: selection?.key ?? fallback.key,
        start: normalizeDateFilterValue(selection?.start) ?? normalizeDateFilterValue(fallback.start),
        end: normalizeDateFilterValue(selection?.end) ?? normalizeDateFilterValue(fallback.end)
      };
    }

    return {
      key: fallback.key,
      start: normalizeDateFilterValue(fallback.start),
      end: normalizeDateFilterValue(fallback.end)
    };
  };

  let currentPeriodSelection = getPeriodSelection();

  const handleSyncPnL = async ({
    selection = getPeriodSelection(),
    showToastOnSuccess = false,
    showToastOnError = false,
    force = false
  } = {}) => {
    const signature = getPeriodSelectionSignature(selection);

    if (!force && signature === pnlState.lastSignature && pnlState.hasData) {
      return { success: true, skipped: true };
    }

    if (!force && pnlState.loading && pnlState.requestSignature === signature) {
      return { success: false, reason: 'in-progress' };
    }

    pnlState.loading = true;
    pnlState.requestSignature = signature;
    pnlUI.setLoading(true);
    pnlUI.setError(null);

    try {
      const payload = await fetchPnL({ start: selection.start, end: selection.end });
      const summary = mapProfitAndLossPayload(payload);

      pnlUI.setCards(summary);
      const syncedAt = new Date();
      pnlUI.setLastSync(syncedAt);
      pnlUI.setError(null);

      pnlState.lastSignature = signature;
      pnlState.hasData = true;

      try {
        const integration = await resolveMekariIntegration();
        mekariIntegration = integration ?? null;
        if (integration) {
          const updated = await markMekariIntegrationSynced(integration, syncedAt.toISOString());
          if (updated) {
            mekariIntegration = updated;
          }
        }
        pnlUI.setIntegration(mekariIntegration);
      } catch (syncError) {
        console.warn('Gagal memperbarui status sinkronisasi Mekari.', syncError);
      }

      if (showToastOnSuccess) {
        toast.show('Data profit & loss Mekari berhasil diperbarui.');
      }

      return { success: true, summary, syncedAt };
    } catch (error) {
      console.error('Gagal sinkronisasi P&L Mekari.', error);
      pnlUI.setCards(DEFAULT_PNL_SUMMARY);
      pnlUI.setLastSync(null);
      const message = error?.message ? String(error.message) : 'Gagal sinkronisasi P&L dari Mekari Jurnal.';
      pnlUI.setError(message);
      pnlState.hasData = false;
      pnlState.lastSignature = null;

      if (showToastOnError) {
        toast.show(message);
      }

      return { success: false, error };
    } finally {
      pnlState.loading = false;
      pnlState.requestSignature = null;
      pnlUI.setLoading(false);
    }
  };

  const applyFilters = ({ triggerProfitLoss = true, forceWarehouseSync = false } = {}) => {
    const searchInput = document.getElementById('search-input');

    currentPeriodSelection = getPeriodSelection();

    warehouseMovementsState.currentPage = 1;
    warehouseMovementsState.lastFilteredCount = 0;

    renderSalesReports({
      search: searchInput ? searchInput.value : ''
    });

    syncWarehouseMovements({
      selection: currentPeriodSelection,
      force: forceWarehouseSync,
      showToastOnError: triggerProfitLoss
    }).catch(error => {
      console.error('Gagal memuat data pergerakan barang Mekari.', error);
    });

    if (triggerProfitLoss) {
      const signature = getPeriodSelectionSignature(currentPeriodSelection);
      if (signature !== pnlState.lastSignature || !pnlState.hasData) {
        handleSyncPnL({ selection: currentPeriodSelection }).catch(error => {
          console.error('Gagal memperbarui ringkasan P&L.', error);
        });
      }
    }
  };

  dateFilter = setupReportDateFilter({
    onChange: () => {
      currentPeriodSelection = getPeriodSelection();
      applyFilters({ triggerProfitLoss: true });
    }
  });

  currentPeriodSelection = getPeriodSelection();

  handleSearch(() => {
    applyFilters({ triggerProfitLoss: false });
  });

  const pagination = document.getElementById('warehouse-pagination');
  if (pagination) {
    pagination.addEventListener('click', event => {
      const button = event.target.closest('[data-pagination]');
      if (!button) {
        return;
      }
      event.preventDefault();
      const action = button.dataset.pagination;
      if (action === 'prev') {
        changeWarehousePage(-1);
      } else if (action === 'next') {
        changeWarehousePage(1);
      }
    });

    const paginationInput = pagination.querySelector('[data-pagination-input]');
    if (paginationInput) {
      paginationInput.addEventListener('keydown', event => {
        if (event.key !== 'Enter') {
          return;
        }
        event.preventDefault();
        goToWarehousePage(event.target.value);
      });

      paginationInput.addEventListener('change', event => {
        goToWarehousePage(event.target.value);
      });
    }
  }

  const sortButtons = document.querySelectorAll('.table-sort-button[data-sort-key]');
  sortButtons.forEach(button => {
    button.addEventListener('click', () => {
      setWarehouseSort(button.dataset.sortKey);
    });
  });

  const filtersForm = document.getElementById('sales-report-filters');
  if (filtersForm) {
    filtersForm.addEventListener('change', () => applyFilters({ triggerProfitLoss: true }));
  }

  const syncButton = document.querySelector('[data-report-sync-now]');
  if (syncButton) {
    const defaultLabel = (syncButton.dataset.labelDefault || syncButton.textContent || '').trim() || 'Sinkronkan Sekarang';
    const loadingLabel = (syncButton.dataset.labelLoading || 'Menyinkronkan...').trim();

    const setButtonLabel = label => {
      syncButton.textContent = label;
    };

    const runManualSync = async () => {
      if (syncButton.disabled) {
        return;
      }

      const selection = getPeriodSelection();

      syncButton.disabled = true;
      syncButton.classList.add('is-loading');
      setButtonLabel(loadingLabel);

      try {
        const result = await handleSyncPnL({
          selection,
          showToastOnSuccess: true,
          showToastOnError: true,
          force: true
        });

        await syncWarehouseMovements({
          selection,
          force: true,
          showToastOnError: true
        });

        if (result?.success) {
          currentPeriodSelection = selection;
        }
      } finally {
        syncButton.disabled = false;
        syncButton.classList.remove('is-loading');
        setButtonLabel(defaultLabel);
      }
    };

    setButtonLabel(defaultLabel);
    syncButton.addEventListener('click', () => {
      runManualSync().catch(error => {
        console.error('Gagal sinkronisasi laporan Mekari.', error);
      });
    });
  }

  applyFilters();
}

function initIntegrations() {
  ensureIntegrationsSeeded();

  const getFilterValue = () => document.getElementById('search-input')?.value ?? '';
  const refreshTable = () => {
    const filter = getFilterValue();
    renderIntegrations(filter);
  };

  renderIntegrations();
  handleSearch(value => renderIntegrations(value));

  const runInitialSync = async () => {
    let supabaseReady = true;
    try {
      await ensureSeeded();
    } catch (error) {
      supabaseReady = false;
      console.error('Gagal menyiapkan data integrasi.', error);
      toast.show('Gagal memuat data integrasi. Pastikan Supabase tersambung.');
    }

    if (supabaseReady) {
      try {
        await refreshIntegrationsFromSupabase();
      } catch (error) {
        console.error('Gagal memperbarui data integrasi.', error);
        toast.show('Data integrasi mungkin tidak terbaru.');
      }
    } else {
      setStoredIntegrations(getStoredIntegrations());
    }

    refreshTable();
  };

  runInitialSync().catch(error => {
    console.error('Gagal menyelesaikan sinkronisasi integrasi.', error);
  });

  const modal = document.getElementById('integration-modal');
  const form = document.getElementById('integration-form');
  const modalTitle = document.getElementById('integration-modal-title');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const closeButtons = modal ? Array.from(modal.querySelectorAll('[data-close-modal]')) : [];
  const addButton = document.getElementById('add-integration-btn');
  const nameInput = form?.querySelector('#integration-name');
  const logoFileInput = form?.querySelector('#integration-logo-file');
  const existingLogoInput = form?.querySelector('#integration-logo-existing');
  const logoPreview = form?.querySelector('[data-logo-preview]');
  const logoPreviewImage = form?.querySelector('[data-logo-preview-image]');
  const logoPreviewInitial = form?.querySelector('[data-logo-preview-initial]');

  document.addEventListener('integrations:changed', refreshTable);

  const toInputValue = value => (value === null || value === undefined ? '' : value);

  const setFieldValue = (selector, value) => {
    if (!form) return;
    const field = form.querySelector(selector);
    if (!field) {
      return;
    }

    if (field.type === 'checkbox') {
      field.checked = Boolean(value);
    } else {
      field.value = toInputValue(value);
    }
  };

  let logoPreviewObjectUrl = null;
  const revokeLogoPreviewObjectUrl = () => {
    if (logoPreviewObjectUrl) {
      URL.revokeObjectURL(logoPreviewObjectUrl);
      logoPreviewObjectUrl = null;
    }
  };

  const updateLogoPreview = () => {
    if (!logoPreview) {
      return;
    }

    const nameValue = (nameInput?.value || '').toString().trim() || 'Integrasi API';
    const initials = getNameInitials(nameValue).slice(0, 2) || 'API';

    if (logoPreviewInitial) {
      logoPreviewInitial.textContent = initials;
      logoPreviewInitial.hidden = false;
    }

    if (!logoPreviewImage) {
      return;
    }

    let previewUrl = '';
    const selectedFile = logoFileInput?.files?.[0] ?? null;
    if (selectedFile) {
      revokeLogoPreviewObjectUrl();
      logoPreviewObjectUrl = URL.createObjectURL(selectedFile);
      previewUrl = logoPreviewObjectUrl;
    } else {
      previewUrl = sanitizeIntegrationLogo(logoPreview?.dataset.persistedUrl ?? '');
    }

    if (previewUrl) {
      logoPreviewImage.src = previewUrl;
      logoPreviewImage.alt = `Logo ${nameValue}`;
      logoPreviewImage.hidden = false;
      if (logoPreviewInitial) {
        logoPreviewInitial.hidden = true;
      }
    } else {
      if (logoPreviewObjectUrl) {
        revokeLogoPreviewObjectUrl();
      }
      logoPreviewImage.removeAttribute('src');
      logoPreviewImage.hidden = true;
      if (logoPreviewInitial) {
        logoPreviewInitial.hidden = false;
      }
    }
  };

  const populateFormFields = integration => {
    if (!form) return;
    form.reset();
    revokeLogoPreviewObjectUrl();
    if (logoFileInput) {
      logoFileInput.value = '';
    }

    if (integration) {
      form.dataset.editingId = integration.id ?? '';
      setFieldValue('#integration-name', integration.name ?? '');
      setFieldValue('#integration-logo-existing', integration.logoPath ?? '');
      setFieldValue('#integration-category', integration.category ?? '');
      setFieldValue('#integration-status', integration.status ?? 'available');
      setFieldValue('#integration-connected-account', integration.connectedAccount ?? '');
      setFieldValue('#integration-sync-frequency', integration.syncFrequency ?? '');
      setFieldValue('#integration-api-base-url', integration.apiBaseUrl ?? '');
      setFieldValue('#integration-authorization-path', integration.authorizationPath ?? '');
      setFieldValue('#integration-access-token', integration.accessToken ?? '');
      setFieldValue('#integration-capabilities', integration.capabilities ?? '');
      setFieldValue('#integration-requires-setup', Boolean(integration.requiresSetup));
    } else {
      delete form.dataset.editingId;
      setFieldValue('#integration-status', 'available');
      setFieldValue('#integration-logo-existing', '');
      setFieldValue('#integration-requires-setup', false);
    }

    const persistedUrl = integration ? sanitizeIntegrationLogo(integration.logoUrl) : '';
    if (logoPreview) {
      logoPreview.dataset.persistedUrl = persistedUrl;
    }

    updateLogoPreview();
  };

  const resetSubmitState = () => {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
    }
  };

  const focusNameField = () => {
    if (!nameInput) return;
    requestAnimationFrame(() => {
      nameInput.focus({ preventScroll: true });
      nameInput.select?.();
    });
  };

  nameInput?.addEventListener('input', updateLogoPreview);
  logoFileInput?.addEventListener('change', () => {
    updateLogoPreview();
  });

  updateLogoPreview();

  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    populateFormFields(null);
    resetSubmitState();
    revokeLogoPreviewObjectUrl();
  };

  const openCreateModal = () => {
    if (!requireCatalogManager('Silakan login untuk menambah integrasi API.')) {
      return;
    }
    if (modalTitle) {
      modalTitle.textContent = 'Tambah Integrasi API';
    }
    if (submitBtn) {
      submitBtn.textContent = 'Simpan';
    }
    populateFormFields(null);
    if (modal) {
      modal.hidden = false;
      document.body.classList.add('modal-open');
      focusNameField();
    }
  };

  const openEditModal = integration => {
    if (!requireCatalogManager('Silakan login untuk mengelola integrasi API.')) {
      return;
    }
    if (!integration) {
      toast.show('Integrasi tidak ditemukan.');
      return;
    }
    if (modalTitle) {
      modalTitle.textContent = 'Edit Integrasi API';
    }
    if (submitBtn) {
      submitBtn.textContent = 'Perbarui';
    }
    populateFormFields(integration);
    if (modal) {
      modal.hidden = false;
      document.body.classList.add('modal-open');
      focusNameField();
    }
  };

  const findIntegrationById = id => {
    if (!id) return null;
    return getStoredIntegrations().find(integration => integration.id === id) || null;
  };

  const handleDeleteIntegration = async integrationId => {
    if (!requireCatalogManager('Silakan login untuk menghapus integrasi API.')) {
      return;
    }

    const integration = findIntegrationById(integrationId);
    if (!integration) {
      toast.show('Integrasi tidak ditemukan.');
      return;
    }

    const confirmed = window.confirm(`Hapus integrasi "${integration.name}"?`);
    if (!confirmed) {
      return;
    }

    let supabaseSynced = false;
    if (isSupabaseConfigured()) {
      try {
        await deleteIntegrationFromSupabase(integrationId);
        if (integration.logoPath) {
          await removeIntegrationLogoFromStorage(integration.logoPath);
        }
        await refreshIntegrationsFromSupabase();
        supabaseSynced = true;
      } catch (error) {
        console.error('Gagal menghapus integrasi di Supabase.', error);
        toast.show('Supabase tidak dapat diakses. Perubahan hanya tersimpan lokal.');
      }
    }

    if (!supabaseSynced) {
      const remaining = getStoredIntegrations().filter(item => item.id !== integrationId);
      setStoredIntegrations(remaining);
    }

    refreshTable();
    toast.show(`${integration.name} telah dihapus.${supabaseSynced ? '' : ' (lokal)'}`);
  };

  addButton?.addEventListener('click', openCreateModal);
  closeButtons.forEach(button => button.addEventListener('click', closeModal));

  if (modal) {
    modal.addEventListener('click', event => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async event => {
      event.preventDefault();

      if (!requireCatalogManager('Silakan login untuk mengelola integrasi API.')) {
        return;
      }

      if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
      }

      const formData = new FormData(form);
      const editingId = form.dataset.editingId;
      const isEditing = Boolean(editingId);

      const getValue = name => {
        const value = formData.get(name);
        if (value === null || typeof value === 'undefined') {
          return '';
        }
        return value.toString().trim();
      };

      const status = getValue('status') || 'available';
      const existingLogoPath = getValue('existingLogoPath');
      let logoPath = existingLogoPath;
      let logoUrl = sanitizeIntegrationLogo(logoPreview?.dataset.persistedUrl ?? '');
      const selectedLogoFile = logoFileInput?.files?.[0] ?? null;

      if (selectedLogoFile) {
        if (!isSupabaseConfigured()) {
          toast.show('Supabase belum dikonfigurasi sehingga logo tidak dapat diunggah.');
          resetSubmitState();
          return;
        }

        try {
          const { path, publicUrl } = await uploadIntegrationLogoFile(selectedLogoFile, {
            existingPath: logoPath || undefined
          });
          logoPath = path;
          logoUrl = sanitizeIntegrationLogo(publicUrl);
          if (logoPreview) {
            logoPreview.dataset.persistedUrl = logoUrl;
          }
          if (existingLogoInput) {
            existingLogoInput.value = logoPath;
          }
        } catch (error) {
          console.error('Gagal mengunggah logo integrasi.', error);
          toast.show('Gagal mengunggah logo. Pastikan Supabase Storage tersedia.');
          resetSubmitState();
          return;
        }
      }

      const payload = {
        id: editingId || createUuid(),
        name: getValue('name'),
        logoUrl,
        logoPath,
        category: getValue('category'),
        status,
        connectedAccount: getValue('connectedAccount'),
        syncFrequency: getValue('syncFrequency'),
        capabilities: getValue('capabilities'),
        apiBaseUrl: getValue('apiBaseUrl'),
        authorizationPath: getValue('authorizationPath'),
        accessToken: getValue('accessToken'),
        requiresSetup: formData.get('requiresSetup') === 'on'
      };

      if (!payload.name) {
        toast.show('Nama integrasi wajib diisi.');
        resetSubmitState();
        return;
      }

      if (payload.status === 'connected' && !payload.connectedAccount) {
        payload.connectedAccount = 'Entraverse API';
      }

      const integrations = getStoredIntegrations();
      let nextIntegrations = [...integrations];

      if (isEditing) {
        const index = integrations.findIndex(item => item.id === editingId);
        if (index === -1) {
          toast.show('Integrasi tidak ditemukan.');
          resetSubmitState();
          return;
        }

        const existing = integrations[index];
        const updated = {
          ...existing,
          ...payload,
          updatedAt: Date.now()
        };

        if (payload.status === 'connected') {
          updated.lastSync = existing.lastSync || new Date().toISOString();
        } else if (payload.status === 'available') {
          updated.lastSync = null;
        }

        nextIntegrations[index] = updated;
      } else {
        const now = Date.now();
        const newIntegration = {
          ...payload,
          createdAt: now,
          updatedAt: now,
          lastSync: payload.status === 'connected' ? new Date().toISOString() : null
        };
        nextIntegrations = [...integrations, newIntegration];
      }

      let supabaseSynced = false;
      if (isSupabaseConfigured()) {
        try {
          await upsertIntegrationToSupabase(nextIntegrations.find(item => item.id === payload.id));
          await refreshIntegrationsFromSupabase();
          supabaseSynced = true;
        } catch (error) {
          console.error('Gagal menyimpan integrasi ke Supabase.', error);
          toast.show('Supabase tidak dapat diakses. Perubahan hanya tersimpan lokal.');
        }
      }

      if (!supabaseSynced) {
        setStoredIntegrations(nextIntegrations);
      }

      refreshTable();
      toast.show(isEditing ? 'Integrasi berhasil diperbarui.' : 'Integrasi baru ditambahkan.' + (supabaseSynced ? '' : ' (lokal)'));
      closeModal();
      resetSubmitState();
    });
  }

  handleIntegrationActions({
    onEdit: integrationId => {
      const integration = findIntegrationById(integrationId);
      openEditModal(integration);
    },
    onDelete: handleDeleteIntegration
  });
}

function initDashboard() {
  const resolveCurrentFilter = () => (document.getElementById('search-input')?.value ?? '').toString();

  const tableBody = document.getElementById('product-table-body');
  const countEl = document.getElementById('product-count');
  const metaEl = document.getElementById('table-meta');

  const showLoadingIndicators = () => {
    if (countEl) {
      countEl.textContent = 'Memuat…';
    }
    if (metaEl) {
      metaEl.textContent = 'Menyiapkan data produk…';
    }
    if (tableBody) {
      renderProductTableMessage(tableBody, 'Memuat produk…', { className: 'loading-state' });
    }
  };

  showLoadingIndicators();
  handleProductActions();
  handleSync();
  scheduleDailyInventorySync();

  let initialSyncCompleted = false;
  let pendingFilter = (resolveCurrentFilter() ?? '').toString();
  let pendingRenderOptions = {};

  const requestRender = (filter, options = {}) => {
    pendingFilter = (filter ?? '').toString();
    pendingRenderOptions = options && typeof options === 'object' ? { ...options } : {};
    if (initialSyncCompleted) {
      renderProducts(pendingFilter, pendingRenderOptions);
    } else {
      showLoadingIndicators();
    }
  };

  handleSearch(value => requestRender(value, { resetPage: true }));

  const addProductLink = document.querySelector('[data-add-product-link]');
  const updateAddProductLinkState = () => {
    if (!addProductLink) return;
    const canManage = canManageCatalog();
    if (canManage) {
      addProductLink.classList.remove('is-disabled');
      addProductLink.removeAttribute('aria-disabled');
      addProductLink.removeAttribute('tabindex');
    } else {
      addProductLink.classList.add('is-disabled');
      addProductLink.setAttribute('aria-disabled', 'true');
      addProductLink.setAttribute('tabindex', '-1');
    }
  };

  if (addProductLink) {
    addProductLink.addEventListener('click', event => {
      if (!requireCatalogManager('Silakan login untuk menambah produk.')) {
        event.preventDefault();
      }
    });
  }

  updateAddProductLinkState();

  document.addEventListener('entraverse:session-change', () => {
    updateAddProductLinkState();
    requestRender(resolveCurrentFilter());
  });

  const runInitialSync = async () => {
    let supabaseReady = true;

    try {
      await ensureSeeded();
    } catch (error) {
      supabaseReady = false;
      console.error('Gagal menyiapkan data dashboard.', error);
      toast.show('Gagal memuat data dashboard. Pastikan Supabase tersambung.');
    }

    const followUpTasks = [];

    if (supabaseReady) {
      followUpTasks.push(
        (async () => {
          try {
            await refreshCategoriesFromSupabase();
          } catch (error) {
            console.error('Gagal memperbarui data dashboard.', error);
            toast.show('Data dashboard mungkin tidak terbaru.');
          }
        })()
      );

      if (isSupabaseConfigured()) {
        followUpTasks.push(
          (async () => {
            try {
              await refreshProductsFromSupabase();
            } catch (error) {
              console.error('Gagal memperbarui data produk dashboard.', error);
              toast.show('Data produk mungkin tidak terbaru.');
            }
          })()
        );

        followUpTasks.push(
          (async () => {
            try {
              await resolveMekariIntegration();
            } catch (error) {
              console.warn('Gagal memuat integrasi Mekari Jurnal terbaru.', error);
            }
          })()
        );
      }
    }

    if (followUpTasks.length) {
      await Promise.all(followUpTasks);
    }

    initialSyncCompleted = true;
    renderProducts(pendingFilter, pendingRenderOptions);
  };

  runInitialSync().catch(error => {
    console.error('Gagal menyelesaikan sinkronisasi dashboard.', error);
    initialSyncCompleted = true;
    renderProducts(pendingFilter, pendingRenderOptions);
  });
}

function initCategories() {
  const runInitialSync = async () => {
    let supabaseReady = true;

    try {
      await ensureSeeded();
    } catch (error) {
      supabaseReady = false;
      console.error('Gagal menyiapkan data kategori.', error);
      toast.show('Gagal memuat data kategori. Pastikan Supabase tersambung.');
    }

    if (supabaseReady) {
      try {
        await refreshCategoriesFromSupabase();
      } catch (error) {
        console.error('Gagal memperbarui data kategori.', error);
        toast.show('Data kategori mungkin tidak terbaru.');
      }
    }

    renderCategories();
  };

  renderCategories();
  handleSearch(value => renderCategories(value));
  handleCategoryActions();

  runInitialSync().catch(error => {
    console.error('Gagal menyelesaikan sinkronisasi kategori.', error);
  });
}

function initPage() {
  document.addEventListener('DOMContentLoaded', async () => {
    const page = document.body.dataset.page;
    const topbarAuth = initTopbarAuth();
    const initialUser = getCurrentUser();
    topbarAuth.update(initialUser ?? getGuestUser());
    setupThemeControls();

    if (page === 'login') {
      const existingUser = getCurrentUser();
      if (existingUser) {
        window.location.href = 'dashboard.html';
        return;
      }
      handleLogin();
      handleGuestAccess();
    }

    if (page === 'register') {
      handleRegister();
    }

    if (['dashboard', 'add-product', 'categories', 'shipping', 'integrations', 'reports'].includes(page)) {
      setupSidebarToggle();
      setupSidebarCollapse();
      const { user, status } = await ensureAuthenticatedPage();
      if (status === 'expired') {
        toast.show('Sesi Anda telah berakhir. Silakan login kembali.');
      }
      topbarAuth.update(user);
    }

    if (page === 'dashboard') {
      initDashboard();
    }

    if (page === 'add-product') {
      handleAddProductForm();
    }

    if (page === 'categories') {
      initCategories();
    }

    if (page === 'shipping') {
      await initShippingPage();
    }

    if (page === 'integrations') {
      initIntegrations();
    }

    if (page === 'reports') {
      initReportsPage();
    }

  });
}

loadPersistedRemoteCache();
initPage();
