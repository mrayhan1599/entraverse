import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type"
}

function safeJson(s: string) { try { return JSON.parse(s) } catch { return s } }
function excerpt(s: string, n = 900) { return (s ?? "").toString().slice(0, n) }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  const trace_id = crypto.randomUUID()

  try {
    const u = new URL(req.url)
    const start_date = u.searchParams.get("start_date") ?? ""
    const end_date = u.searchParams.get("end_date") ?? ""

    // Pakai SERVICE ROLE untuk baca tabel (RLS aman)
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env.toObject()
    const { createClient } = await import("npm:@supabase/supabase-js")
    const sb = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

    // 1) Load config
    const { data: cfg, error: cfgErr } = await sb
      .from("api_integrations")
      .select("api_base_url, authorization_path, access_token")
      .limit(1).single()

    if (cfgErr || !cfg) {
      return new Response(JSON.stringify({
        ok: false, trace_id, stage: "load_config",
        error: cfgErr?.message || "Config integrasi tidak ditemukan (public.api_integrations)."
      }), { status: 500, headers: { "content-type": "application/json", ...CORS } })
    }

    // 2) Sanitasi + fallback authPath = "partner/core"
    const baseUrl = String(cfg.api_base_url || "https://api.jurnal.id").trim().replace(/\/+$/, "")
    const authPathFromDb = String(cfg.authorization_path || "").trim().replace(/^\/+|\/+$/g, "")
    const token = String(cfg.access_token || "").trim()

    const authPath = authPathFromDb || "partner/core"
    const normalizedAuthPath = authPath.split("/").filter(Boolean).join("/")

    const needsProfitLossSuffix = !/profit_and_loss(?:\.json)?$/i.test(normalizedAuthPath)

    let endpointPath = normalizedAuthPath
    if (needsProfitLossSuffix) {
      const hasApiVersionSegment = /(?:^|\/)api\/v\d+(?:\/|$)/i.test(normalizedAuthPath)
      const suffixBase = hasApiVersionSegment ? normalizedAuthPath : `${normalizedAuthPath}/api/v1`
      endpointPath = `${suffixBase}/profit_and_loss`
    }

    if (!/\.json$/i.test(endpointPath)) {
      endpointPath = `${endpointPath}.json`
    }

    const endpoint = `${baseUrl.replace(/\/+$/, "")}/${endpointPath}`

    if (!baseUrl || !token) {
      return new Response(JSON.stringify({
        ok: false, trace_id, stage: "validate_config",
        error: "Config tidak lengkap (api_base_url / access_token).",
        config_preview: { baseUrl, authPath, token_len: token?.length ?? 0 }
      }), { status: 500, headers: { "content-type": "application/json", ...CORS } })
    }

    // 3) Build URL FINAL SESUAI DOKUMEN
    //    CONTOH hasil: https://api.jurnal.id/partner/core/api/v1/profit_and_loss?start_date=...&end_date=...
    const qs = new URLSearchParams()
    if (start_date) qs.set("start_date", start_date)
    if (end_date) qs.set("end_date", end_date)
    const queryString = qs.toString()
    const finalUrl = queryString ? `${endpoint}?${queryString}` : endpoint

    // 4) Call Jurnal (auth header: apikey)
    const headers = new Headers({
      "Accept": "application/json",
      "apikey": token
    })
    const bearerToken = /^bearer\s/i.test(token) ? token : `Bearer ${token}`
    headers.set("Authorization", bearerToken)

    const res = await fetch(finalUrl, { method: "GET", headers })

    const raw = await res.text()

    if (!res.ok) {
      return new Response(JSON.stringify({
        ok: false, trace_id, stage: "jurnal_call",
        status: res.status,
        finalUrl,
        request_query: Object.fromEntries(qs.entries()),
        error: `Jurnal API error ${res.status}`,
        response_excerpt: excerpt(raw)
      }), { status: 502, headers: { "content-type": "application/json", ...CORS } })
    }

    return new Response(JSON.stringify({ ok: true, trace_id, finalUrl, data: safeJson(raw) }), {
      headers: { "content-type": "application/json", ...CORS }
    })

  } catch (e) {
    return new Response(JSON.stringify({
      ok: false, trace_id, stage: "exception",
      error: String(e?.message ?? e)
    }), { status: 500, headers: { "content-type": "application/json", ...CORS } })
  }
})
