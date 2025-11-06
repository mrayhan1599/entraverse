import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type"
}

function safeJson(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

function excerpt(s: string, n = 900) {
  return (s ?? "").toString().slice(0, n)
}

function normalizeBaseUrl(input: string | undefined | null) {
  const base = (input ?? "https://api.jurnal.id").toString().trim()
  if (!base) return "https://api.jurnal.id"
  if (/^https?:\/\//i.test(base)) {
    return base.replace(/\/+$/, "")
  }
  return `https://${base.replace(/\/+$/, "")}`
}

function normalizePath(path: string | undefined | null) {
  const value = (path ?? "partner/core/api/v1/profit_and_loss").toString().trim()
  return value.replace(/^\/+/, "").replace(/\/+$/, "")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS })
  }

  const trace_id = crypto.randomUUID()

  try {
    const { JURNAL_API_BASE_URL, JURNAL_API_PATH, JURNAL_API_TOKEN } = Deno.env.toObject()

    const baseUrl = normalizeBaseUrl(JURNAL_API_BASE_URL)
    const path = normalizePath(JURNAL_API_PATH)
    const token = (JURNAL_API_TOKEN ?? "").toString().trim()

    if (!token) {
      return new Response(
        JSON.stringify({
          ok: false,
          trace_id,
          stage: "validate_config",
          error: "JURNAL_API_TOKEN belum dikonfigurasi."
        }),
        { status: 500, headers: { "content-type": "application/json", ...CORS } }
      )
    }

    const u = new URL(req.url)
    const qs = new URLSearchParams()
    const start_date = u.searchParams.get("start_date") ?? ""
    const end_date = u.searchParams.get("end_date") ?? ""
    if (start_date) qs.set("start_date", start_date)
    if (end_date) qs.set("end_date", end_date)

    const queryString = qs.toString()
    const endpoint = `${baseUrl}/${path}`
    const finalUrl = queryString ? `${endpoint}?${queryString}` : endpoint

    const headers = new Headers({ Accept: "application/json" })
    headers.set("Authorization", token)
    headers.set("apikey", token)

    const res = await fetch(finalUrl, { method: "GET", headers })
    const raw = await res.text()

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          trace_id,
          stage: "jurnal_call",
          status: res.status,
          finalUrl,
          request_query: Object.fromEntries(qs.entries()),
          error: `Jurnal API error ${res.status}`,
          response_excerpt: excerpt(raw)
        }),
        { status: 502, headers: { "content-type": "application/json", ...CORS } }
      )
    }

    return new Response(
      JSON.stringify({ ok: true, trace_id, finalUrl, data: safeJson(raw) }),
      { headers: { "content-type": "application/json", ...CORS } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({
        ok: false,
        trace_id,
        stage: "exception",
        error: String(e?.message ?? e)
      }),
      { status: 500, headers: { "content-type": "application/json", ...CORS } }
    )
  }
})
