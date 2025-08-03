export const onRequestPost: PagesFunction<{ KV: KVNamespace }> = async ({ request, env }) => {
  const { blacklist, replace_rules } = await request.json();
  await env.KV.put("rules", JSON.stringify({ blacklist, replace_rules }));
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
};

export const onRequestGet: PagesFunction<{ KV: KVNamespace }> = async ({ env }) => {
  const data = await env.KV.get("rules");
  return new Response(data || "{}", { headers: { "Content-Type": "application/json" } });
};