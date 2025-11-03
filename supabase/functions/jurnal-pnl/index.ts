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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    const url = new URL(req.url)
    const start_date = url.searchParams.get("start_date") ?? ""
    const end_date = url.searchParams.get("end_date") ?? ""

    const { SUPABASE_URL, SUPABASE_ANON_KEY } = Deno.env.toObject()
    const { createClient } = await import("npm:@supabase/supabase-js")
    const sb = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)

    const { data: cfg, error: cfgErr } = await sb
      .from("api_integrations")
      .select("api_base_url, authorization_path, access_token")
      .limit(1)
      .single()

    if (cfgErr || !cfg)
      return new Response(
        JSON.stringify({ ok: false, error: "Config integrasi tidak ditemukan." }),
        { status: 500, headers: { "content-type": "application/json", ...CORS } }
      )

    const baseUrl = (cfg.api_base_url || "").replace(/\/+$/g, "")
    const authPath = (cfg.authorization_path || "").replace(/^\/+|\/+$/g, "")
    const token = cfg.access_token
    if (!baseUrl || !authPath || !token)
      return new Response(
        JSON.stringify({ ok: false, error: "Config tidak lengkap (base_url/auth_path/token)." }),
        { status: 500, headers: { "content-type": "application/json", ...CORS } }
      )

    const endpoint = `${baseUrl}/${authPath}/api/v1/profit_and_loss`
    const qs = new URLSearchParams()
    if (start_date) qs.set("start_date", start_date)
    if (end_date) qs.set("end_date", end_date)

    const res = await fetch(`${endpoint}?${qs.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json", apikey: token }
    })

    const bodyText = await res.text()
    if (!res.ok)
      return new Response(
        JSON.stringify({ ok: false, error: `Jurnal API error ${res.status}`, body: safeJson(bodyText) }),
        { status: 502, headers: { "content-type": "application/json", ...CORS } }
      )

    return new Response(
      JSON.stringify({ ok: true, data: safeJson(bodyText) }),
      { headers: { "content-type": "application/json", ...CORS } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { status: 500, headers: { "content-type": "application/json", ...CORS } }
    )
  }
})
