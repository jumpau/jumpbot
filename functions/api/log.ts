import { KVNamespace } from "@cloudflare/workers-types";

export const onRequestGet: PagesFunction<{ KV: KVNamespace }> = async ({ request, env }) => {
  const url = new URL(request.url);
  const task_id = url.searchParams.get("task_id") ?? "";

  // 从KV读取全局 VPS 日志API地址
  const vpsLogApi = await env.KV.get("vps_log_api");
  if (!vpsLogApi) {
    return new Response("No VPS log API configured", { status: 400 });
  }

  // 拼接日志API URL
  const logUrl = `${vpsLogApi.replace(/\/$/, "")}/log?task_id=${encodeURIComponent(task_id)}`;
  const resp = await fetch(logUrl);
  const logContent = await resp.text();
  return new Response(logContent, { headers: { "Content-Type": "text/plain" } });
};