// server.js — CRE360 Signal API (stable, ASCII-safe)
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();
app.use(cors());            // lock to your domain later if you want
app.use(express.json());

// ---------- OpenAI ----------
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Voice + quick context
const SYSTEM_PROMPT = [
  "You are CRE360 Signal — institutional, concise, decisive.",
  "Prioritize extended-stay hotels, underwriting logic, development risk, and daily Signals.",
  "Style: point-first answer, then 2-4 bullets with specifics. No fluff.",
  "Never claim to be a broker; refer to CRE360 Advisory for representation."
].join(" ");

const CONTEXT = [
  "Extended-stay: resilient occupancy, lean staffing, lower turnover costs, weekly LOS economics.",
  "Deal screening: sponsor track record, capital stack clarity, brand or flag fit, site feasibility, exit paths.",
  "Development risk: entitlements, GC capacity and schedule realism, lender covenants, contingency sufficiency.",
  "Operator lens: cash conversion cycle, FF&E and PIP exposure, ramp realism, RevPAR vs comp set."
].join(" ");

// ---------- /chat ----------
app.post("/chat", async (req, res) => {
  try {
    const text = String((req.body && req.body.message) || "").slice(0, 8000);
    if (!text) return res.status(400).json({ error: "Missing message" });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: CONTEXT },
        { role: "user", content: text }
      ]
    });

    for await (const chunk of stream) {
      const delta =
        (chunk.choices &&
          chunk.choices[0] &&
          chunk.choices[0].delta &&
          chunk.choices[0].delta.content) ||
        "";
      if (delta) res.write(delta);
    }
    res.end();
  } catch (e) {
    console.error("Chat error:", e && e.message ? e.message : e);
    try { res.end(" (service error)"); } catch {}
  }
});

// ---------- /console (inline UI, no external files) ----------
app.get("/console", (_req, res) => {
  const API = process.env.RENDER_EXTERNAL_URL || "https://cre360-signal-api.onrender.com";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const html = [
    "<!doctype html>",
    "<html><head><meta charset='utf-8'/>",
    "<meta name='viewport' content='width=device-width, initial-scale=1'/>",
    "<title>CRE360 Signal Console</title>",
    "<style>",
    ":root{--bg:#0B0B0B;--text:#FFFFFF;--gold:#BFA77A;--muted:rgba(255,255,255,.72);--line:rgba(255,255,255,.10)}",
    "html,body{margin:0;height:100%;background:var(--bg);color:var(--text);font-family:Inter,Arial,sans-serif}",
    ".panel{display:flex;flex-direction:column;height:100vh;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35);",
    " background:#0B0B0B; background-image:",
    "  linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,0) 30%),",
    "  radial-gradient(800px 400px at 100% 0, rgba(191,167,122,.08), transparent 60%);",
    " background-blend-mode:overlay}",
    ".head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line);",
    " background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))}",
    ".brand{font-weight:800;letter-spacing:.3px;font-size:16px}",
    ".powered{font-size:12px;color:var(--muted)} .powered .gold{color:var(--gold)}",
    ".sub{padding:8px 16px 10px;font-size:13px;color:var(--muted)}",
    ".chips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 16px 12px}",
    ".chip{border:1px solid var(--line);background:rgba(255,255,255,.06);color:var(--text);border-radius:999px;padding:8px 10px;font-size:12px;cursor:pointer;text-align:center}",
    "@media (max-width:1024px){.chips{grid-template-columns:1fr}}",
    ".msgs{flex:1;overflow:auto;padding:10px 16px;display:flex;flex-direction:column;gap:10px}",
    ".b{padding:12px 14px;border-radius:12px;max-width:92%;line-height:1.35;font-size:14px;white-space:pre-wrap}",
    ".u{background:rgba(255,255,255,.10);align-self:flex-end}",
    ".t{background:rgba(255,255,255,.06);border:1px solid var(--line);align-self:flex-start}",
    ".input{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line);background:rgba(255,255,255,.02)}",
    ".f{flex:1;background:rgba(255,255,255,.10);border:1px solid var(--line);color:#fff;border-radius:10px;padding:11px 12px;font-size:14px}",
    ".s{padding:10px 14px;border:none;border-radius:10px;background:var(--gold);color:#111;font-weight:800;cursor:pointer}",
    ".foot{padding:6px 12px;font-size:11px;text-align:center;color:var(--muted);border-top:1px solid var(--line)}",
    "</style></head><body>",
    "<div class='panel'>",
    "<div class='head'>",
    "<div class='brand'>CRE360 Signal</div>",
    "<div class='powered'>Powered by <span>ChatGPT</span> + <span class='gold'>CRE360.ai</span></div>",
    "</div>",
    "<div class='sub'>Operator-grade market intelligence - ask sharper questions.</div>",
    "<div id='chips' class='chips'></div>",
    "<div id='m' class='msgs'></div>",
    "<div class='input'><input id='f' class='f' placeholder='Ask the Signal...'><button id='s' class='s'>Send</button></div>",
    "<div class='foot'>&#169; CRE360 - Institutional, decisive, no fluff.</div>",
    "</div>",
    "<script>",
    "(function(){",
    "var API='" + API + "';",
    "var m=document.getElementById('m'), f=document.getElementById('f'), s=document.getElementById('s'), chips=document.getElementById('chips');",
    "var starters = [",
    "  { label: '📰 Today\\'s Signal',  text: 'Give me today\\'s CRE360 Signal in 3 bullets.' },",
    "  { label: '📈 Rates Now',       text: 'What are today\\'s CRE rates? (10Y, 5Y, SOFR, Prime, 2s10s spread). Include Source | Date (CT).' },",
    "  { label: '🧮 DSCR',            text: 'Calculate DSCR for NOI=1,200,000 and Annual Debt Service=950,000. One line, then Why it matters.' },",
    "  { label: '🧮 Debt Yield',      text: 'Debt Yield if NOI=1,200,000 and Loan=14,000,000?' },",
    "  { label: '🏦 Size My Loan',    text: 'Max loan if NOI=1,200,000, rate=7%, amort=30 years, DSCR>=1.25, LTV<=65%, value=20,000,000. Show binding constraint.' },",
    "  { label: '🎯 Break-Even Rate', text: 'At NOI=1,200,000, loan=13,000,000, amort=30 years, what interest rate makes DSCR=1.20?' },",
    "  { label: '📐 Cap-Value-NOI',   text: 'Solve Value if NOI=1,400,000 at 6.75% cap.' },",
    "  { label: '🔁 Refi Check',      text: 'Refi check: NOI=1,300,000, value=21,000,000, rate=7.25%, amort=30 yrs, DSCR>=1.25, LTV<=65%. Pass/fail with max loan numbers.' }",
    "];",
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
