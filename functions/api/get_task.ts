// VPS定期拉取新任务，建议用token认证
export const onRequestGet: PagesFunction<{ KV: KVNamespace }> = async ({ request, env }) => {
  const url = new URL(request.url);
  const user_id = url.searchParams.get("user_id") || "";
  const task_id = url.searchParams.get("task_id") || "";
  // 支持拉取所有待执行任务，也可只拉一个
  if (task_id) {
    const t = await env.KV.get(`user:${user_id}:task:${task_id}`);
    return new Response(t || "{}", { headers: { "Content-Type": "application/json" } });
  }
  // 返回所有pending/waiting任务（可扩展为队列/分页）
  const tasks = JSON.parse((await env.KV.get(`user:${user_id}:tasks`)) || "[]");
  const pending = tasks.filter(t => t.status === "pending" || t.status === "waiting");
  return new Response(JSON.stringify(pending), { headers: { "Content-Type": "application/json" } });
};