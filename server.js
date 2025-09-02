// server.js — CRE360 Signal API (stable with disclaimer)
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ---------- OpenAI ----------
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = [
  "You are CRE360 Signal — institutional, concise, decisive.",
  "Prioritize extended-stay hotels, underwriting logic, development risk, and daily Signals.",
  "Style: point-first answer, then 2-4 bullets with specifics. No fluff.",
  "Never claim to be a broker; refer to CRE360 Advisory for representation."
].join(" ");

const CONTEXT = [
  "Formulas: DSCR = NOI / Annual Debt Service; Debt Yield = NOI / Loan.",
  "Cap math: Value = NOI / CapRate; CapRate = NOI / Value; NOI = Value * CapRate."
].join(" ");

// ---------- Live Rates ----------
async function getTreasuryCurve() {
  const url =
    "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/" +
    "daily_treasury_yield_curve?sort=-record_date&fields=record_date,bc_2year,bc_5year,bc_10year&page%5Bnumber%5D=1";
  const r = await fetch(url);
  const j = await r.json();
  const row = j.data[0];
  return {
    date: row.record_date,
    twoY: Number(row.bc_2year),
    fiveY: Number(row.bc_5year),
    tenY: Number(row.bc_10year),
    spread_2s10s: Number(row.bc_2year) - Number(row.bc_10year),
    source: "U.S. Treasury Daily Yield Curve"
  };
}

async function getSOFR() {
  try {
    const r = await fetch("https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json");
    const j = await r.json();
    const item = (j.refRates || [])[0];
    return { rate: Number(item.percentRate), date: item.effectiveDate, source: "NY Fed SOFR" };
  } catch {
    return { rate: null, date: null, source: "SOFR unavailable" };
  }
}

function tsChicago(dateStr) {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleString("en-US", { timeZone: "America/Chicago" });
}

app.get("/rates", async (_req, res) => {
  try {
    const [treas, sofr] = await Promise.all([getTreasuryCurve(), getSOFR()]);
    res.json({
      as_of_ct: tsChicago(treas.date),
      treasuries: { "2Y": treas.twoY, "5Y": treas.fiveY, "10Y": treas.tenY, spread_2s10s: treas.spread_2s10s },
      sofr: sofr.rate,
      sources: { treasuries: treas.source, sofr: sofr.source }
    });
  } catch (e) {
    res.status(502).json({ error: "rates_fetch_failed", message: e.message });
  }
});

// ---------- /chat ----------
app.post("/chat", async (req, res) => {
  try {
    const text = String(req.body.message || "").slice(0, 8000);
    if (!text) return res.status(400).json({ error: "Missing message" });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: CONTEXT },
        { role: "user", content: text }
      ]
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || "";
      if (delta) res.write(delta);
    }
    res.end();
  } catch (e) {
    console.error("Chat error:", e.message);
    try { res.end(" (service error)"); } catch {}
  }
});

// ---------- /console ----------
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
    ".panel{display:flex;flex-direction:column;height:100vh;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35);background:#0B0B0B}",
    ".head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line)}",
    ".brand{font-weight:800;font-size:16px}",
    ".powered{font-size:12px;color:var(--muted)} .powered .gold{color:var(--gold)}",
    ".chips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 16px 12px}",
    ".chip{border:1px solid var(--line);background:rgba(255,255,255,.06);color:var(--gold);font-weight:700;border-radius:999px;padding:8px 10px;font-size:12px;cursor:pointer;text-align:center}",
    ".msgs{flex:1;overflow:auto;padding:10px 16px;display:flex;flex-direction:column;gap:10px}",
    ".b{padding:12px 14px;border-radius:12px;max-width:92%;line-height:1.35;font-size:14px;white-space:pre-wrap}",
    ".u{background:rgba(255,255,255,.10);align-self:flex-end}",
    ".t{background:rgba(255,255,255,.06);border:1px solid var(--line);align-self:flex-start}",
    ".input{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line)}",
    ".f{flex:1;background:rgba(255,255,255,.10);border:1px solid var(--line);color:#fff;border-radius:10px;padding:11px 12px;font-size:14px}",
    ".s{padding:10px 14px;border:none;border-radius:10px;background:var(--gold);color:#111;font-weight:800;cursor:pointer}",
    "</style></head><body>",
    "<div class='panel'>",
    "<div class='head'><div class='brand'>CRE360 Signal</div><div class='powered'>Powered by <span>ChatGPT</span> + <span class='gold'>CRE360.ai</span></div></div>",
    "<div id='chips' class='chips'></div>",
    "<div id='m' class='msgs'></div>",
    "<div class='input'><input id='f' class='f' placeholder='Ask the Signal...'><button id='s' class='s'>Send</button></div>",
    "</div>",
    "<script>",
    "(function(){",
    "var API='" + API + "';",
    "var m=document.getElementById('m'), f=document.getElementById('f'), s=document.getElementById('s'), chips=document.getElementById('chips');",

    "function bub(t,who){ var d=document.createElement('div'); d.className='b '+who; d.textContent=t; m.appendChild(d); m.scrollTop=m.scrollHeight; return d; }",
    "async function ask(q){ if(!q) return; bub(q,'u'); f.value=''; var bot=bub('...','t');",
    "  try{ var r=await fetch(API+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})});",
    "    var rd=r.body.getReader(), dec=new TextDecoder(); bot.textContent='';",
    "    while(true){ var x=await rd.read(); if(x.done) break; bot.textContent+=dec.decode(x.value,{stream:true}); m.scrollTop=m.scrollHeight; }",
    "  }catch(e){ bot.textContent='(network error)'; }",
    "}",

    // Buttons
    "var starters=[",
    " { label:'📰 Today\\'s Signal', kind:'auto', text:'Give me today\\'s CRE360 Signal in 3 bullets.' },",
    " { label:'📈 Rates Now', kind:'live' }",
    "];",

    "starters.forEach(function(sx){",
    "  var b=document.createElement('button'); b.className='chip'; b.textContent=sx.label;",
    "  if(sx.kind==='auto'){ b.onclick=function(){ ask(sx.text); }; }",
    "  else if(sx.kind==='live'){",
    "    b.onclick=async function(){",
    "      var bot=bub('Fetching live rates...','t');",
    "      try{ var r=await fetch(API+'/rates'); var d=await r.json();",
    "        var txt='Rates Now ('+d.as_of_ct+') 10Y:'+d.treasuries['10Y']+'%, 5Y:'+d.treasuries['5Y']+'%, 2Y:'+d.treasuries['2Y']+'%; 2s10s:'+d.treasuries.spread_2s10s+'; SOFR:'+(d.sofr!=null?d.sofr+'%':'n/a');",
    "        bot.textContent=txt; ask('Market take: '+txt);",
    "      }catch(e){ bot.textContent='(rates error)'; }",
    "    };",
    "  }",
    "  chips.appendChild(b);",
    "});",

    // Greeting disclaimer
    "bub('Disclaimer: I do not provide investment advice. I\\'ll do my best to help you analyze CRE360 signals, underwriting, and development risks.','t');",

    "s.onclick=function(){ ask(f.value.trim()); };",
    "f.onkeydown=function(e){ if(e.key==='Enter') ask(f.value.trim()); };",
    "})();",
    "</script></body></html>"
  ].join("");
  res.send(html);
});

// health
app.get("/", (_req, res) => res.send("CRE360 Signal API running"));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log("[CRE360] Listening on " + PORT));
