// 新建任务
export const onRequestPost: PagesFunction<{ KV: KVNamespace }> = async ({ request, env }) => {
  const { user_id, source, target, start_id, end_id, batch_size, interval } = await request.json();
  if (batch_size > 30) return new Response("BATCH_SIZE最大30", { status: 400 });
  if (interval < 60) return new Response("INTERVAL最小60", { status: 400 });
  const task_id = crypto.randomUUID();
  const task = { task_id, source, target, start_id, end_id, batch_size, interval, status: "pending", ts: Date.now() };

  // 记录任务列表
  const userTaskKey = `user:${user_id}:tasks`;
  let tasks = JSON.parse((await env.KV.get(userTaskKey)) || "[]");
  tasks.push(task);
  await env.KV.put(userTaskKey, JSON.stringify(tasks));

  // 记录任务详情
  await env.KV.put(`user:${user_id}:task:${task_id}`, JSON.stringify(task));
  return new Response(JSON.stringify({ ok: true, task_id }), { headers: { "Content-Type": "application/json" } });
};

// 查询用户所有任务
export const onRequestGet: PagesFunction<{ KV: KVNamespace }> = async ({ request, env }) => {
  const url = new URL(request.url);
  const user_id = url.searchParams.get("user_id") || "";
  const tasks = await env.KV.get(`user:${user_id}:tasks`);
  return new Response(tasks || "[]", { headers: { "Content-Type": "application/json" } });
};