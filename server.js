app.get("/console", (_req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CRE360 Signal Console</title>
  <style>
    html,body{margin:0;height:100%;background:#0B0B0B}
    .cre360-panel{display:flex;flex-direction:column;width:100%;height:100vh;background:#0B0B0B;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
    .cre360-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02))}
    .cre360-title{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.3px;font-size:16px}
    .cre360-title .dot{color:#BFA77A;font-size:14px}
    .cre360-powered{font-size:12px;opacity:.9;display:flex;align-items:center;gap:6px}
    .cre360-powered .brand{color:#D9CBA2;font-weight:700}
    .cre360-sub{padding:8px 16px 12px;font-size:13px;opacity:.85}
    .cre360-starters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 16px 12px}
    .cre360-chip{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;border-radius:999px;padding:8px 10px;font-size:12px;text-align:center;cursor:pointer}
    .cre360-typing{font-size:12px;opacity:.7;padding:0 16px 8px}
    .cre360-messages{flex:1;overflow:auto;padding:10px 16px 16px;display:flex;flex-direction:column;gap:10px}
    .cre360-bubble{padding:12px 14px;border-radius:12px;max-width:92%;line-height:1.35;font-size:14px;white-space:pre-wrap}
    .cre360-user{background:rgba(255,255,255,.08);align-self:flex-end}
    .cre360-bot{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
    .cre360-input{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.08)}
    .cre360-field{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:10px;padding:11px 12px;font-size:14px}
    .cre360-send{padding:10px 14px;border-radius:10px;border:none;cursor:pointer;background:#BFA77A;color:#111;font-weight:800}
    .cre360-foot{padding:8px 12px;font-size:11px;text-align:center;opacity:.7;border-top:1px solid rgba(255,255,255,.08)}
    @media (max-width:1024px){.cre360-starters{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div id="signal-panel" style="width:100%;height:100vh;"></div>
  <script>
  (function () {
    const API_BASE = "${process.env.RENDER_EXTERNAL_URL || "https://cre360-signal-api.onrender.com"}";
    const TARGET = "#signal-panel";
    const BOT_NAME = "CRE360 Signal™";
    const SUBTITLE = "Operator-grade market intelligence — ask sharper questions.";
    const STARTERS = [
      {label:"Today’s Signal", text:"Give me today’s CRE360 Signal in 3 bullets."},
      {label:"Underwriting", text:"Pressure-test my extended-stay underwriting."},
      {label:"Extended-Stay", text:"Why are extended-stay hotels outperforming in 2025?"},
      {label:"Risk Check", text:"List the top 3 execution risks on a new hotel development."}
    ];

    const mount = document.querySelector(TARGET);
    if (!mount) return;
    mount.innerHTML =
      '<div class="cre360-panel" role="region" aria-label="CRE360 Signal Console">'
      + '<div class="cre360-head"><div class="cre360-title"><span class="dot">●</span><span class="t">'+BOT_NAME+'</span></div>'
      + '<div class="cre360-powered"><span>Powered by</span><strong class="brand">ChatGPT + CRE360.ai</strong></div></div>'
      + '<div class="cre360-sub">'+SUBTITLE+'</div>'
      + '<div class="cre360-starters" aria-label="Starter prompts"></div>'
      + '<div class="cre360-typing" style="display:none;">Signal is typing…</div>'
      + '<div class="cre360-messages" aria-live="polite"></div>'
      + '<div class="cre360-input"><input class="cre360-field" placeholder="Ask the Signal…" aria-label="Message input"/>'
      + '<button class="cre360-send" aria-label="Send message">Send</button></div>'
      + '<div class="cre360-foot">© CRE360 — Institutional, decisive, no fluff.</div></div>';

    const startersEl = mount.querySelector('.cre360-starters');
    const typingEl = mount.querySelector('.cre360-typing');
    const msgsEl = mount.querySelector('.cre360-messages');
    const field = mount.querySelector('.cre360-field');
    const sendBtn = mount.querySelector('.cre360-send');

    function bubble(text, who){
      const div = document.createElement('div');
      div.className = 'cre360-bubble ' + (who === 'user' ? 'cre360-user' : 'cre360-bot');
      div.textContent = text;
      msgsEl.appendChild(div);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      return div;
    }
    function setTyping(v){ typingEl.style.display = v ? 'block' : 'none'; }

    STARTERS.forEach(s=>{
      const chip=document.createElement('button');
      chip.className='cre360-chip';
      chip.textContent=s.label;
      chip.addEventListener('click', ()=>{ field.value=s.text; field.focus(); });
      startersEl.appendChild(chip);
    });

    async function ask(q){
      if(!q) return;
      bubble(q,'user'); field.value=''; setTyping(true);
      const bot = bubble('','bot');
      try{
        const resp = await fetch(API_BASE + '/chat', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ message:q })
        });
        if(!resp.ok || !resp.body){ bot.textContent='Service error — try again.'; setTyping(false); return; }
        const reader = resp.body.getReader(); const decoder=new TextDecoder();
        while(true){ const {value,done}=await reader.read(); if(done) break;
          bot.textContent += decoder.decode(value,{stream:true});
          msgsEl.scrollTop = msgsEl.scrollHeight;
        }
      }catch{ bot.textContent='Network error — check connection.'; }
      finally{ setTyping(false); }
    }

    sendBtn.addEventListener('click', ()=>ask(field.value.trim()));
    field.addEventListener('keydown', e=>{ if(e.key==='Enter') ask(field.value.trim()); });

    bubble("Here’s the deal — ask about underwriting, extended-stay strategy, or today’s Signal.", "bot");
  })();
  </script>
</body>
</html>`);
});
