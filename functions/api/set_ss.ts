import { KVNamespace } from "@cloudflare/workers-types";

export const onRequestPost: PagesFunction<{ KV: KVNamespace }> = async ({ request, env }) => {
  const { api_id, api_hash, string_session } = await request.json();
  await env.KV.put("bot_config", JSON.stringify({ api_id, api_hash, string_session }));
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
};