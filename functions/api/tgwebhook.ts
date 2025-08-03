import { KVNamespace } from "@cloudflare/workers-types";

// 环境变量
const TELEGRAM_TOKEN = (globalThis as any).TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const VISIBLE_COMMANDS = `
/login - 一步一步获取并绑定 string_session
/set_ss <api_id> <api_hash> <string_session> - 手动设置凭证
/rule <黑名单,逗号分隔> {"敏感词":"替换词"} - 设置规则
/send <source> <target> <start_id> <end_id> <batch_size> <interval> - 新建转发任务
/log <task_id> - 查询任务日志
/cancel - 取消当前流程
/help - 显示帮助
`;

async function sendMessage(chat_id: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    body: JSON.stringify({ chat_id, text }),
    headers: { "Content-Type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<{ KV: KVNamespace, TELEGRAM_TOKEN: string, VPS_LOGIN_API: string, VPS_CORE_API: string }> = async ({ request, env }) => {
  const update = await request.json();
  const msg = update.message;
  if (!msg) return new Response("ok");
  const user_id = msg.from.id.toString();
  const chat_id = msg.chat.id;

  // 读取每个用户的登录流程状态
  let login_state = {};
  try {
    login_state = JSON.parse((await env.KV.get(`user:${user_id}:login_state`)) || "{}");
  } catch { login_state = {}; }

  // 1. 登录流程
  if (msg.text?.startsWith("/login")) {
    login_state = { step: "api_id" };
    await env.KV.put(`user:${user_id}:login_state`, JSON.stringify(login_state));
    await sendMessage(chat_id, "请输入你的 api_id(数字):");
    return new Response("ok");
  }
  if (login_state.step === "api_id") {
    if (/^\d+$/.test(msg.text.trim())) {
      login_state.api_id = msg.text.trim();
      login_state.step = "api_hash";
      await env.KV.put(`user:${user_id}:login_state`, JSON.stringify(login_state));
      await sendMessage(chat_id, "请输入你的 api_hash:");
    } else {
      await sendMessage(chat_id, "api_id 必须是数字，请重新输入:");
    }
    return new Response("ok");
  }
  if (login_state.step === "api_hash") {
    login_state.api_hash = msg.text.trim();
    login_state.step = "phone";
    await env.KV.put(`user:${user_id}:login_state`, JSON.stringify(login_state));
    await sendMessage(chat_id, "请输入你的phone num 带区号，如+8613712345678:");
    return new Response("ok");
  }
  if (login_state.step === "phone") {
    login_state.phone = msg.text.trim();
    const vpsApi = env.VPS_LOGIN_API;
    const resp = await fetch(`${vpsApi}/start_login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id, api_id: login_state.api_id, api_hash: login_state.api_hash, phone: login_state.phone,
      }),
    });
    const result = await resp.json();
    if (result.ok) {
      login_state.step = "code";
      await env.KV.put(`user:${user_id}:login_state`, JSON.stringify(login_state));
      await sendMessage(chat_id, "验证码已发送，请输入你收到的验证码:");
    } else {
      await sendMessage(chat_id, `发送验证码失败：${result.msg || "请确认手机号和API信息"}`);
    }
    return new Response("ok");
  }
  if (login_state.step === "code") {
    const code = msg.text.trim();
    const vpsApi = env.VPS_LOGIN_API;
    const resp = await fetch(`${vpsApi}/finish_login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id, api_id: login_state.api_id, api_hash: login_state.api_hash, phone: login_state.phone, code,
      }),
    });
    const result = await resp.json();
    if (result.ok) {
      await sendMessage(chat_id, "绑定成功！你的 string_session 已生成。");
      await env.KV.delete(`user:${user_id}:login_state`);
    } else {
      await sendMessage(chat_id, `登录失败：${result.msg || "请重试或重新 /login"}`);
    }
    return new Response("ok");
  }


  if (msg.text?.startsWith("/set_ss")) {
    const parts = msg.text.trim().split(" ");
    if (parts.length !== 4) {
      await sendMessage(chat_id, "格式错误：/set_ss <api_id> <api_hash> <string_session>");
      return new Response("ok");
    }
    const [_, api_id, api_hash, string_session] = parts;
    await env.KV.put(`user:${user_id}:config`, JSON.stringify({ api_id, api_hash, string_session }));
    await sendMessage(chat_id, "已保存你的 string_session 信息！");
    return new Response("ok");
  }

  // 3. 设置规则
  if (msg.text?.startsWith("/rule")) {
    const args = msg.text.split(" ");
    if (args.length >= 3) {
      const blacklist = args[1].split(",");
      let replace_rules = {};
      try { replace_rules = JSON.parse(args.slice(2).join(" ")); } catch {}
      await env.KV.put(`user:${user_id}:rules`, JSON.stringify({ blacklist, replace_rules }));
      await sendMessage(chat_id, "规则已保存！");
    } else {
      await sendMessage(chat_id, "格式：/rule 黑名单,关键词 {" + `"abc":"def"` + "}");
    }
    return new Response("ok");
  }

  // 4. 新建任务
  if (msg.text?.startsWith("/send")) {
    const args = msg.text.trim().split(" ");
    if (args.length !== 7) {
      await sendMessage(chat_id, "格式：/send <source> <target> <start_id> <end_id> <batch_size> <interval>");
      return new Response("ok");
    }
    const [_, source, target, start_id, end_id, batch_size, interval] = args;
    const task_id = crypto.randomUUID();
    const task = { task_id, source, target, start_id, end_id, batch_size, interval, status: "pending", ts: Date.now() };
    // 推送到 VPS 后端任务队列
    const vpsCoreApi = env.VPS_CORE_API;
    await fetch(`${vpsCoreApi}/add_task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, ...task })
    });
    await sendMessage(chat_id, `任务已创建，ID: ${task_id}`);
    return new Response("ok");
  }

  // 5. 查询日志
  if (msg.text?.startsWith("/log")) {
    const args = msg.text.trim().split(" ");
    if (args.length !== 2) {
      await sendMessage(chat_id, "格式：/log <task_id>");
      return new Response("ok");
    }
    const task_id = args[1];
    const vpsCoreApi = env.VPS_CORE_API;
    const resp = await fetch(`${vpsCoreApi}/log?user_id=${encodeURIComponent(user_id)}&task_id=${encodeURIComponent(task_id)}`);
    const text = await resp.text();
    await sendMessage(chat_id, text.slice(-200));
    return new Response("ok");
  }

  // 6. 取消流程
  if (msg.text?.startsWith("/cancel")) {
    await env.KV.delete(`user:${user_id}:login_state`);
    await sendMessage(chat_id, "已取消当前流程。");
    return new Response("ok");
  }

  // 7. 帮助
  if (msg.text?.startsWith("/help")) {
    await sendMessage(chat_id, VISIBLE_COMMANDS);
    return new Response("ok");
  }

  // 默认回复
  await sendMessage(chat_id, "未知指令。请输入 /help 查看支持的命令。");
  return new Response("ok");
};