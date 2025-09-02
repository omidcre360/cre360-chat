// server.js — CRE360 Signal API (forms + live chat, ASCII-safe)
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();

// CORS (loosened for now; lock to your domain later)
// const corsOptions = { origin: ["https://cre360.ai","https://www.cre360.ai"] };
// app.use(cors(corsOptions));
app.use(cors());
app.use(express.json());

// ---------- OpenAI ----------
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Voice + quick context
const SYSTEM_PROMPT = [
  "You are CRE360 Signal — institutional, concise, decisive.",
  "Prioritize extended-stay hotels, underwriting logic, development risk, and daily Signals.",
  "Style: point-first answer, then 2-4 bullets with specifics. No fluff.",
  "Never claim to be a broker; refer to CRE360 Advisory for representation.",
  "If the user asks for calculations, show the key number first, then a short why-it-matters note."
].join(" ");

const CONTEXT = [
  "Extended-stay: resilient occupancy, lean staffing, lower turnover costs, weekly LOS economics.",
  "Deal screening: sponsor track record, capital stack clarity, brand or flag fit, site feasibility, exit paths.",
  "Development risk: entitlements, GC capacity and schedule realism, lender covenants, contingency sufficiency.",
  "Operator lens: cash conversion cycle, FF&E and PIP exposure, ramp realism, RevPAR vs comp set.",
  "When asked to calculate DSCR: DSCR = NOI / Annual Debt Service.",
  "When asked debt yield: Debt Yield = NOI / Loan Amount.",
  "When asked cap rate math: Value = NOI / CapRate; CapRate = NOI / Value; NOI = Value * CapRate.",
  "When asked amortized payment logic: Use standard mortgage payment formula; if constraints conflict, state binding constraint."
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
      temperature: 0.3,
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

// ---------- /console (inline UI, mini-forms + live stream) ----------
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
    ".formwrap{padding:12px 16px;border-top:1px solid var(--line);background:rgba(255,255,255,.02)}",
    ".formrow{display:flex;gap:8px;align-items:center;margin-bottom:8px}",
    ".label{width:160px;opacity:.8;font-size:13px}",
    ".inp{flex:1;background:rgba(255,255,255,.10);border:1px solid var(--line);color:#fff;border-radius:8px;padding:8px}",
    ".go{padding:8px 12px;border:none;border-radius:8px;background:var(--gold);color:#111;font-weight:700;cursor:pointer}",
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

    // Starter buttons (your list)
    "var starters = [",
    "  { label: '📰 Today\\'s Signal',  kind:'auto', text: 'Give me today\\'s CRE360 Signal in 3 bullets.' },",
    "  { label: '📈 Rates Now',       kind:'auto', text: 'What are today\\'s CRE rates? (10Y, 5Y, SOFR, Prime, 2s10s spread). Include Source | Date (CT).' },",
    "  { label: '🧮 DSCR',            kind:'form', id:'dscr' },",
    "  { label: '🧮 Debt Yield',      kind:'form', id:'dy' },",
    "  { label: '🏦 Size My Loan',    kind:'form', id:'size' },",
    "  { label: '🎯 Break-Even Rate', kind:'form', id:'ber' },",
    "  { label: '📐 Cap-Value-NOI',   kind:'form', id:'cap' },",
    "  { label: '🔁 Refi Check',      kind:'form', id:'refi' }",
    "];",

    // Mini-form helper
    "function miniForm(title, fields, onSubmit){",
    "  var wrap=document.createElement('div'); wrap.className='formwrap';",
    "  var h=document.createElement('div'); h.textContent=title; h.style.cssText='font-size:13px;opacity:.8;margin-bottom:8px'; wrap.appendChild(h);",
    "  var inputs={};",
    "  fields.forEach(function(fd){",
    "    var row=document.createElement('div'); row.className='formrow';",
    "    var lab=document.createElement('div'); lab.className='label'; lab.textContent=fd.label;",
    "    var inp=document.createElement('input'); inp.className='inp'; inp.type='number'; inp.step='any'; inp.placeholder=fd.placeholder||'';",
    "    inputs[fd.key]=inp; row.appendChild(lab); row.appendChild(inp); wrap.appendChild(row);",
    "  });",
    "  var go=document.createElement('button'); go.className='go'; go.textContent='Calculate';",
    "  go.onclick=function(){ var vals={}; fields.forEach(function(fd){ vals[fd.key]=inputs[fd.key].value; }); onSubmit(vals); wrap.remove(); };",
    "  wrap.appendChild(go);",
    "  document.querySelector('.input').before(wrap);",
    "}",

    // Send a chat message
    "function bub(t,who){ var d=document.createElement('div'); d.className='b '+who; d.textContent=t; m.appendChild(d); m.scrollTop=m.scrollHeight; return d; }",
    "async function ask(q){ if(!q) return; bub(q,'u'); f.value=''; var bot=bub('...','t');",
    "  try{ var r=await fetch(API+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})});",
    "    if(!r.body){ bot.textContent='(service error)'; return; }",
    "    var rd=r.body.getReader(), dec=new TextDecoder(); bot.textContent='';",
    "    while(true){ var x=await rd.read(); if(x.done) break; bot.textContent+=dec.decode(x.value,{stream:true}); m.scrollTop=m.scrollHeight; }",
    "  }catch(e){ bot.textContent='(network error)'; }",
    "}",

    // Wire chips
    "starters.forEach(function(sx){",
    "  var b=document.createElement('button'); b.className='chip'; b.textContent=sx.label;",

    // Auto chips
    "  if(sx.kind==='auto'){ b.onclick=function(){ ask(sx.text); }; }",

    // Form chips
    "  else if(sx.kind==='form'){",
    "    if(sx.id==='dscr'){",
    "      b.onclick=function(){ miniForm('DSCR Calculator',[",
    "        {key:'noi',label:'NOI',placeholder:'1200000'},",
    "        {key:'ads',label:'Annual Debt Service',placeholder:'950000'}",
    "      ],function(v){ var p='Calculate DSCR for NOI='+v.noi+' and Annual Debt Service='+v.ads+'. One line, then Why it matters.'; ask(p); }); };",
    "    }",
    "    else if(sx.id==='dy'){",
    "      b.onclick=function(){ miniForm('Debt Yield',[",
    "        {key:'noi',label:'NOI',placeholder:'1200000'},",
    "        {key:'loan',label:'Loan',placeholder:'14000000'}",
    "      ],function(v){ var p='Debt Yield if NOI='+v.noi+' and Loan='+v.loan+'?'; ask(p); }); };",
    "    }",
    "    else if(sx.id==='size'){",
    "      b.onclick=function(){ miniForm('Size My Loan',[",
    "        {key:'noi',label:'NOI',placeholder:'1200000'},",
    "        {key:'rate',label:'Rate %',placeholder:'7'},",
    "        {key:'am',label:'Amort yrs',placeholder:'30'},",
    "        {key:'dscr',label:'Min DSCR',placeholder:'1.25'},",
    "        {key:'ltv',label:'Max LTV %',placeholder:'65'},",
    "        {key:'val',label:'Value',placeholder:'20000000'}",
    "      ],function(v){",
    "        var p='Max loan if NOI='+v.noi+', rate='+v.rate+'%, amort='+v.am+' years, DSCR>= '+v.dscr+', LTV<= '+v.ltv+'%, value='+v.val+'. Show binding constraint.';",
    "        ask(p);",
    "      }); };",
    "    }",
    "    else if(sx.id==='ber'){",
    "      b.onclick=function(){ miniForm('Break-Even Rate',[",
    "        {key:'noi',label:'NOI',placeholder:'1200000'},",
    "        {key:'loan',label:'Loan',placeholder:'13000000'},",
    "        {key:'am',label:'Amort yrs',placeholder:'30'},",
    "        {key:'dscr',label:'Target DSCR',placeholder:'1.20'}",
    "      ],function(v){",
    "        var p='At NOI='+v.noi+', loan='+v.loan+', amort='+v.am+' years, what interest rate makes DSCR='+v.dscr+'?';",
    "        ask(p);",
    "      }); };",
    "    }",
    "    else if(sx.id==='cap'){",
    "      b.onclick=function(){ miniForm('Cap-Value-NOI',[",
    "        {key:'noi',label:'NOI',placeholder:'1400000'},",
    "        {key:'cap',label:'Cap %',placeholder:'6.75'}",
    "      ],function(v){",
    "        var p='Solve Value if NOI='+v.noi+' at '+v.cap+'% cap.';",
    "        ask(p);",
    "      }); };",
    "    }",
    "    else if(sx.id==='refi'){",
    "      b.onclick=function(){ miniForm('Refi Check',[",
    "        {key:'noi',label:'NOI',placeholder:'1300000'},",
    "        {key:'val',label:'Value',placeholder:'21000000'},",
    "        {key:'rate',label:'Rate %',placeholder:'7.25'},",
    "        {key:'am',label:'Amort yrs',placeholder:'30'},",
    "        {key:'dscr',label:'Min DSCR',placeholder:'1.25'},",
    "        {key:'ltv',label:'Max LTV %',placeholder:'65'}",
    "      ],function(v){",
    "        var p='Refi check: NOI='+v.noi+', value='+v.val+', rate='+v.rate+'%, amort='+v.am+' yrs, DSCR>= '+v.dscr+', LTV<= '+v.ltv+'%. Pass/fail with max loan numbers.';",
    "        ask(p);",
    "      }); };",
    "    }",
    "  }",

    "  chips.appendChild(b);",
    "});",

    // Freeform send
    "s.onclick=function(){ ask(f.value.trim()); };",
    "f.onkeydown=function(e){ if(e.key==='Enter') ask(f.value.trim()); };",

    // Greeting
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
