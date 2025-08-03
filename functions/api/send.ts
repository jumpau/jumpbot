export const onRequestPost: PagesFunction<{ KV: KVNamespace }> = async ({ request, env }) => {
  const { source, target, start_id, end_id, batch_size, interval } = await request.json();
  // 简单验证
  if (batch_size > 30) return new Response("BATCH_SIZE最大30", { status: 400 });
  if (interval < 60) return new Response("INTERVAL最小60", { status: 400 });
  await env.KV.put("task", JSON.stringify({ source, target, start_id, end_id, batch_size, interval, ts: Date.now() }));
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
};