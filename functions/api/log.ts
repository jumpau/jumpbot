export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const task_id = url.searchParams.get("task_id") ?? "";
  // VPS日志API地址
  const vpsLogApi = `http://你的VPS_IP:8000/log${task_id ? `?task_id=${task_id}` : ""}`;
  const resp = await fetch(vpsLogApi);
  const logContent = await resp.text();
  return new Response(logContent, { headers: { "Content-Type": "text/plain" } });
};