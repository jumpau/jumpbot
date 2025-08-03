export async function setSession(ss, api_id, api_hash) {
  await fetch("/api/set_ss", {
    method: "POST",
    body: JSON.stringify({ string_session: ss, api_id, api_hash }),
    headers: { "Content-Type": "application/json" }
  });
}
export async function setRule(blacklist, replace_rules) {
  await fetch("/api/rule", {
    method: "POST",
    body: JSON.stringify({ blacklist, replace_rules }),
    headers: { "Content-Type": "application/json" }
  });
}
export async function sendTask(source, target, start_id, end_id, batch_size, interval) {
  await fetch("/api/send", {
    method: "POST",
    body: JSON.stringify({ source, target, start_id: Number(start_id), end_id: Number(end_id), batch_size: Number(batch_size), interval: Number(interval) }),
    headers: { "Content-Type": "application/json" }
  });
}
export async function fetchRules() {
  const r = await fetch("/api/rule");
  return r.json();
}
export async function fetchLog() {
  const r = await fetch("/api/log");
  return r.text();
}