// server.js — CRE360 Signal API (minimal, ASCII-safe)
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();
app.use(cors());                // lock later if you want
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Chat endpoint ---
const SYSTEM_PROMPT =
  "You are the CRE360 Assistant — institutional, concise, decisive. " +
  "Focus on extended-stay hotels, underwriting logic, development risk, and daily Signals. " +
  "Lead with the point, then 2–4 supporting bullets.";

app.post("/chat", async (req, res) => {
  try {
    const text = String(req.body && req.body.message || "").slice(0, 8000);
    if (!text) return res.status(400).json({ error: "Missing message" });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text }
      ]
    });

    for await (const chunk of stream) {
      const delta = (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) || "";
      if (delta) res.write(delta);
    }
    res.end();
  } catch (e) {
    console.error("Chat error:", e && e.message || e);
    try { res.end(" (service error)"); } catch {}
  }
});

// --- Inline /console page (no external JS, no unicode traps) ---
app.get("/console", (_req, res) => {
  const API = process.env.RENDER_EXTERNAL_URL || "https://cre360-signal-api.onrender.com";
  const html = [
    "<!doctype html>",
    "<html><head><meta charset='utf-8'/>",
    "<meta name='viewport' content='width=device-width, initial-scale=1'/>",
    "<title>CRE360 Signal Console</title>",
    "<style>",
    "html,body{margin:0;height:100%;background:#0B0B0B;color:#FFFFFF;font-family:Inter,Arial,sans-serif}",
    ".panel{display:flex;flex-direction:column;height:100vh;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35)}",
    ".head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.1);",
    "background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))}",
    ".brand{font-weight:800;letter-spacing:.3px;font-size:16px}",
    ".powered{font-size:12px;color:rgba(255,255,255,.72)} .powered b{color:#BFA77A}",
    ".sub{padding:8px 16px 10px;font-size:13px;color:rgba(255,255,255,.72)}",
    ".chips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 16px 12px}",
    ".chip{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#fff;border-radius:999px;padding:8px 10px;font-size:12px;cursor:pointer;text-align:center}",
    "@media (max-width:1024px){.chips{grid-template-columns:1fr}}",
    ".msgs{flex:1;overflow:auto;padding:10px 16px;display:flex;flex-direction:column;gap:10px}",
    ".b{padding:12px 14px;border-radius:12px;max-width:92%;line-height:1.35;font-size:14px;white-space:pre-wrap}",
    ".u{background:rgba(255,255,255,.10);align-self:flex-end}",
    ".t{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}",
    ".input{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.02)}",
    ".f{flex:1;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.1);color:#fff;border-radius:10px;padding:11px 12px;font-size:14px}",
    ".s{padding:10px 14px;border:none;border-radius:10px;background:#BFA77A;color:#111;font-weight:800;cursor:pointer}",
    ".foot{padding:6px 12px;font-size:11px;text-align:center;color:rgba(255,255,255,.72);border-top:1px solid rgba(255,255,255,.1)}",
    "</style></head><body>",
    "<div class='panel'>",
    "<div class='head'><div class='brand'>CRE360 Signal</div><div class='powered'>Powered by <b>ChatGPT + CRE360.ai</b></div></div>",
    "<div class='sub'>Operator-grade market intelligence - ask sharper questions.</div>",
    "<div id='chips' class='chips'></div>",
    "<div id='m' class='msgs'></div>",
    "<div class='input'><input id='f' class='f' placeholder='Ask the Signal...'><button id='s' class='s'>Send</button></div>",
    "<div class='foot'>&#169; CRE360 - Institutional, decisive, no fluff.</div>",
    "</div>",
    "<script>",
    "(function(){",
    "var API='" + API + "';",
    "var m=document.getElementById('m'), f=document.getElementById('f'), s=document.getElementById('s');",
    "var chips=document.getElementById('chips');",
   var starters = [
  { label: 'Today\'s Signal', text: 'Give me today\'s CRE360 Signal in 3 bullets.' },
  { label: 'Market Pulse',    text: 'Give a 2-bullet market pulse for CRE this week.' },
  { label: 'Deal Screener',   text: 'Screen a CRE deal: what 3 red flags should I check first?' },
  { label: 'Dev Risk Radar',  text: 'List the top 3 execution risks on a new hotel development.' }
];

    "starters.forEach(function(sx){ var b=document.createElement('button'); b.className='chip'; b.textContent=sx.label; b.onclick=function(){ f.value=sx.text; f.focus(); }; chips.appendChild(b); });",
    "function bub(t,who){ var d=document.createElement('div'); d.className='b '+who; d.textContent=t; m.appendChild(d); m.scrollTop=m.scrollHeight; return d; }",
    "async function ask(q){ if(!q) return; bub(q,'u'); f.value=''; var bot=bub('...', 't');",
    " try{ var r=await fetch(API+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})});",
    " if(!r.body){ bot.textContent='(service error)'; return; } var rd=r.body.getReader(), dec=new TextDecoder(); bot.textContent='';",
    " while(true){ var x=await rd.read(); if(x.done) break; bot.textContent+=dec.decode(x.value,{stream:true}); m.scrollTop=m.scrollHeight; }",
    " }catch(e){ bot.textContent='(network error)'; } }",
    "s.onclick=function(){ ask(f.value.trim()); };",
    "f.onkeydown=function(e){ if(e.key==='Enter') ask(f.value.trim()); };",
    "bub('Here is the deal - ask about underwriting, extended-stay, or today\\'s Signal.','t');",
    "})();",
    "</script>",
    "</body></html>"
  ].join("");
  res.send(html);
});

// health
app.get("/", (_req, res) => res.send("CRE360 Signal API running"));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log("[CRE360] Listening on " + PORT));
