export const onRequestGet: PagesFunction<{ KV: KVNamespace }> = async ({ request, env }) => {
  const url = new URL(request.url);
  const user_id = url.searchParams.get("user_id") || "";
  const task_id = url.searchParams.get("task_id") || "";

  if (task_id) {
    const t = await env.KV.get(`user:${user_id}:task:${task_id}`);
    return new Response(t || "{}", { headers: { "Content-Type": "application/json" } });
  }

  const tasks = JSON.parse((await env.KV.get(`user:${user_id}:tasks`)) || "[]");
  const pending = tasks.filter(t => t.status === "pending" || t.status === "waiting");
  return new Response(JSON.stringify(pending), { headers: { "Content-Type": "application/json" } });
};