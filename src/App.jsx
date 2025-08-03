import React, { useState, useEffect } from "react";
import { setSession, setRule, sendTask, fetchRules, fetchLog } from "./api";

export default function App() {
  const [ss, setSs] = useState("");
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [blacklist, setBlacklist] = useState("");
  const [replaceRules, setReplaceRules] = useState("");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [batch, setBatch] = useState(50);
  const [interval, setInterval] = useState(60);
  const [log, setLog] = useState("");

  useEffect(() => {
    fetchRules().then(r => {
      setBlacklist((r.blacklist || []).join("\n"));
      setReplaceRules(JSON.stringify(r.replace_rules || {}, null, 2));
    });
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h1>转发机器人管理后台</h1>
      <h2>1. 设置 String Session</h2>
      <input placeholder="api_id" value={apiId} onChange={e => setApiId(e.target.value)} /><br />
      <input placeholder="api_hash" value={apiHash} onChange={e => setApiHash(e.target.value)} /><br />
      <input placeholder="string_session" value={ss} onChange={e => setSs(e.target.value)} /><br />
      <button onClick={() => setSession(ss, apiId, apiHash)}>提交</button>

      <h2>2. 规则设置</h2>
      <textarea rows={4} placeholder="黑名单关键词(一行一个)" value={blacklist} onChange={e => setBlacklist(e.target.value)} /><br />
      <textarea rows={4} placeholder="违禁词替换(JSON格式)" value={replaceRules} onChange={e => setReplaceRules(e.target.value)} /><br />
      <button onClick={() => setRule(blacklist.split("\n").filter(Boolean), JSON.parse(replaceRules))}>保存规则</button>

      <h2>3. 提交转发任务</h2>
      <input placeholder="源频道ID/用户名" value={source} onChange={e => setSource(e.target.value)} /><br />
      <input placeholder="目标频道ID/用户名" value={target} onChange={e => setTarget(e.target.value)} /><br />
      <input placeholder="开始ID" value={start} onChange={e => setStart(e.target.value)} />
      <input placeholder="结束ID" value={end} onChange={e => setEnd(e.target.value)} /><br />
      <input placeholder="BATCH_SIZE" value={batch} onChange={e => setBatch(e.target.value)} />
      <input placeholder="INTERVAL" value={interval} onChange={e => setInterval(e.target.value)} /><br />
      <button onClick={() => sendTask(source, target, start, end, batch, interval)}>提交任务</button>

      <h2>4. 查询日志</h2>
      <button onClick={async () => setLog(await fetchLog())}>查看日志</button>
      <pre style={{ background: "#eee", padding: 10, whiteSpace: "pre-wrap" }}>{log}</pre>
    </div>
  );
}