export const onRequestGet: PagesFunction<{ KV: KVNamespace }> = async ({ env }) => {
  const task = await env.KV.get("task");
  return new Response(task || "{}", { headers: { "Content-Type": "application/json" } });
};