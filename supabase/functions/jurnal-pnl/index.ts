import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type"
}

function safeJson(s: string) { try { return JSON.parse(s) } catch { return s } }
function excerpt(s: string, n=900) { return (s ?? "").toString().slice(0, n) }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  const trace_id = crypto.randomUUID()

  try {
    const u = new URL(req.url)
    const start_date = u.searchParams.get("start_date") ?? ""
    const end_date   = u.searchParams.get("end_date")   ?? ""

    // ⚠️ Pakai SERVICE ROLE untuk membaca tabel config (RLS ON).
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env.toObject()
    const { createClient } = await import("npm:@supabase/supabase-js")
    const sb = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession:false } })

    // 1) Load config dari public.api_integrations
    const { data: cfg, error: cfgErr } = await sb
      .from("api_integrations")
      .select("api_base_url, authorization_path, access_token")
      .limit(1)
      .single()

    if (cfgErr || !cfg) {
      return new Response(JSON.stringify({
        ok:false, trace_id, stage:"load_config",
        error: cfgErr?.message || "Config integrasi tidak ditemukan (public.api_integrations)."
      }), { status:500, headers:{ "content-type":"application/json", ...CORS } })
    }

    const baseUrl  = String(cfg.api_base_url || "").trim().replace(/\/+$/, "")
    const authPath = String(cfg.authorization_path || "").trim().replace(/^\/+|\/+$/g, "")
    const token    = String(cfg.access_token || "").trim()

    if (!baseUrl || !authPath || !token) {
      return new Response(JSON.stringify({
        ok:false, trace_id, stage:"validate_config",
        error:"Config tidak lengkap (api_base_url / authorization_path / access_token).",
        config_preview:{ baseUrl, authPath, token_len: token?.length ?? 0 }
      }), { status:500, headers:{ "content-type":"application/json", ...CORS } })
    }

    // 2) Build URL sesuai dokumen
    const endpoint = `${baseUrl}/${authPath}/api/v1/profit_and_loss`
    const qs = new URLSearchParams()
    if (start_date) qs.set("start_date", start_date)
    if (end_date)   qs.set("end_date", end_date)

    const queryString = qs.toString()
    const finalUrl = queryString ? `${endpoint}?${queryString}` : endpoint

    // 3) Call Jurnal dengan header apikey
    const res = await fetch(finalUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "apikey": token
      }
    })

    const raw = await res.text()

    if (!res.ok) {
      // (opsional) simpan log ringkas ke tabel khusus jika ada
      // await sb.from("integration_logs").insert({ provider:"mekari_jurnal", trace_id, stage:"jurnal_call", status:res.status, request_url:endpoint, query:qs.toString(), response_excerpt: excerpt(raw) })

      const requestQuery = Object.fromEntries(qs.entries())
      return new Response(JSON.stringify({
        ok:false, trace_id, stage:"jurnal_call",
        status: res.status,
        request: { url: finalUrl, query: requestQuery },
        error: `Jurnal API error ${res.status}`,
        response_excerpt: excerpt(raw)
      }), { status:502, headers:{ "content-type":"application/json", ...CORS } })
    }

    return new Response(JSON.stringify({ ok:true, trace_id, data: safeJson(raw) }), {
      headers:{ "content-type":"application/json", ...CORS }
    })

  } catch (e) {
    return new Response(JSON.stringify({
      ok:false, trace_id, stage:"exception",
      error: String(e?.message ?? e)
    }), { status:500, headers:{ "content-type":"application/json", ...CORS } })
  }
})
