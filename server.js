// server.js — CRE360 Signal API
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// System prompt
const SYSTEM_PROMPT = `You are the CRE360 Assistant — sharp, professional, and decisive.
Tone: institutional but human. Avoid fluff.
Focus on extended-stay hotels, underwriting, CRE360 Signal insights, and development risk.
Keep answers tight: lead with the point, then 2–4 bullets of support.`;

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const userMessage = String(req.body?.message || "").slice(0, 8000);
    if (!userMessage) return res.status(400).json({ error: "Missing message" });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    for await (const chunk of response) {
      const delta = chunk.choices?.[0]?.delta?.content || "";
      if (delta) res.write(delta);
    }
    res.end();
  } catch (err) {
    console.error("Chat error:", err.message);
    try { res.end(" (service error)"); } catch {}
  }
});

// Console route (inline panel, no external JS file)
app.get("/console", (_req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CRE360 Signal Console</title>
  <style>
    html,body{margin:0;height:100%;background:#0B0B0B}
    .cre360-panel{display:flex;flex-direction:column;width:100%;height:100vh;background:#0B0B0B;color:#fff;font-family:Inter,Arial,sans-serif}
    .cre360-head{display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.1)}
    .cre360-title{font-weight:800;font-size:16px}
    .cre360-sub{padding:8px 16px;font-size:13px;opacity:.8}
    .cre360-messages{flex:1;overflow:auto;padding:10px 16px;display:flex;flex-direction:column;gap:10px}
    .cre360-bubble{padding:10px;border-radius:8px;max-width:90%;font-size:14px;white-space:pre-wrap}
    .user{background:rgba(255,255,255,.1);align-self:flex-end}
    .bot{background:rgba(255,255,255,.05);align-self:flex-start}
    .cre360-input{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.1)}
    .cre360-field{flex:1;background:rgba(255,255,255,.1);border:none;color:#fff;padding:10px;border-radius:6px}
    .cre360-send{padding:10px 14px;background:#BFA77A;color:#111;font-weight:700;border:none;border-radius:6px;cursor:pointer}
  </style>
</head>
<body>
  <div class="cre360-panel">
    <div class="cre360-head">
      <div class="cre360-title">CRE360 Signal™</div>
      <div>Powered by <strong>ChatGPT + CRE360.ai</strong></div>
    </div>
    <div class="cre360-sub">Operator-grade market intelligence — ask sharper questions.</div>
    <div class="cre360-messages"></div>
    <div class="cre360-input">
      <input class="cre360-field" placeholder="Ask the Signal…" />
      <button class="cre360-send">Send</button>
    </div>
  </div>
<script>
(function(){
  const API_BASE = "${process.env.RENDER_EXTERNAL_URL || "https://cre360-signal-api.onrender.com"}";
  const msgs = document.querySelector('.cre360-messages');
  const field = document.querySelector('.cre360-field');
  const send = document.querySelector('.cre360-send');

  function bubble(text, who){
    const div = document.createElement('div');
    div.className = 'cre360-bubble ' + who;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  async function ask(q){
    if(!q) return;
    bubble(q,'user');
    field.value='';
    const bot = bubble('…','bot');
    try {
      const resp = await fetch(API_BASE + '/chat',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:q})
      });
      if(!resp.body){bot.textContent='(service error)';return;}
      const reader=resp.body.getReader();const dec=new TextDecoder();
      bot.textContent='';
      while(true){
        const {done,value}=await reader.read();if(done)break;
        bot.textContent+=dec.decode(value,{stream:true});
        msgs.scrollTop=msgs.scrollHeight;
      }
    }catch{bot.textContent='(network error)';}
  }

  send.onclick=()=>ask(field.value.trim());
  field.onkeydown=(e)=>{if(e.key==='Enter')ask(field.value.trim());};

  bubble("Here’s the deal — ask about underwriting, extended-stay, or today’s Signal.","bot");
})();
</script>
</body>
</html>`);
});

// Health check
app.get("/", (_req, res) => res.send("CRE360 Signal API running"));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`[CRE360] Listening on ${PORT}`));
