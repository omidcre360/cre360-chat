app.get("/console", (_req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CRE360 Signal Console</title>
  <style>
    :root{
      --bg:#0B0B0B;        /* panel background */
      --text:#FFFFFF;      /* body text */
      --gold:#BFA77A;      /* CRE360 gold */
      --accent:#D9CBA2;    /* soft accent */
      --muted:rgba(255,255,255,.72);
      --line:rgba(255,255,255,.10);
    }
    html,body{margin:0;height:100%;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}

    /* PANEL */
    .panel{position:relative;display:flex;flex-direction:column;width:100%;height:100vh;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35);}

    /* SUBTLE ANIMATED TEXTURE (gold sheen + fine noise) */
    .panel::before{
      content:"";
      position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:.22;
      background:
        radial-gradient(1200px 600px at -10% -20%, rgba(191,167,122,.12), transparent 60%),
        radial-gradient(900px 500px at 120% 120%, rgba(191,167,122,.08), transparent 55%);
      animation: drift 14s ease-in-out infinite alternate;
    }
    .panel::after{
      content:"";
      position:absolute;inset:0;pointer-events:none;opacity:.07;mix-blend-mode:soft-light;
      background-image: url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>\
<defs><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2' stitchTiles='stitch'/></filter></defs>\
<rect width='100%' height='100%' filter='url(%23n)' opacity='0.6' fill='none'/></svg>");
      background-size: 320px 320px;
    }
    @keyframes drift{
      0%{transform:translate3d(0,0,0)}100%{transform:translate3d(-2%, -3%, 0)}
    }

    /* HEADER */
    .head{
      position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;
      padding:14px 16px;border-bottom:1px solid var(--line);
      background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
    }
    .brandL{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.3px}
    .dot{color:var(--gold);font-size:14px}
    .title{font-size:16px}
    .powered{font-size:12px;color:var(--muted)}
    .powered b{color:var(--gold)}

    .sub{padding:8px 16px 10px;font-size:13px;color:var(--muted)}

    /* BODY */
    .messages{position:relative;z-index:1;flex:1;overflow:auto;padding:10px 16px 16px;display:flex;flex-direction:column;gap:10px}
    .bub{padding:12px 14px;border-radius:12px;max-width:92%;line-height:1.35;font-size:14px;white-space:pre-wrap}
    .user{background:rgba(255,255,255,.10);align-self:flex-end}
    .bot{background:rgba(255,255,255,.06);border:1px solid var(--line);align-self:flex-start}
    .chipbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 16px 12px}
    .chip{border:1px solid var(--line);background:rgba(255,255,255,.06);color:var(--text);border-radius:999px;padding:8px 10px;font-size:12px;text-align:center;cursor:pointer}
    @media (max-width:1024px){.chipbar{grid-template-columns:1fr}}

    /* INPUT */
    .input{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line);background:rgba(255,255,255,.02)}
    .field{flex:1;background:rgba(255,255,255,.10);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:11px 12px;font-size:14px}
    .send{padding:10px 14px;border-radius:10px;border:none;cursor:pointer;background:var(--gold);color:#111;font-weight:800}
    .foot{padding:6px 12px;font-size:11px;text-align:center;color:var(--muted);border-top:1px solid var(--line)}
  </style>
</head>
<body>
  <div class="panel">
    <div class="head">
      <div class="brandL"><span class="dot">●</span><span class="title">CRE360 Signal™</span></div>
      <div class="powered">Powered by <b>ChatGPT + CRE360.ai</b></div>
    </div>
    <div class="sub">Operator-grade market intelligence — ask sharper questions.</div>
    <div class="chipbar" id="chips"></div>
    <div class="messages" id="msgs"></div>
    <div class="input">
      <input class="field" id="field" placeholder="Ask the Signal…" />
      <button class="send" id="send">Send</button>
    </div>
    <div class="foot">© CRE360 — Institutional, decisive, no fluff.</div>
  </div>

  <script>
  (function(){
    const API_BASE = "${process.env.RENDER_EXTERNAL_URL || "https://cre360-signal-api.onrender.com"}";
    const msgs = document.getElementById('msgs');
    const field = document.getElementById('field');
    const send  = document.getElementById('send');
    const starters = [
      {label:"Today’s Signal", text:"Give me today’s CRE360 Signal in 3 bullets."},
      {label:"Underwriting",   text:"Pressure-test my extended-stay underwriting."},
      {label:"Extended-Stay",  text:"Why are extended-stay hotels outperforming in 2025?"},
      {label:"Risk Check",     text:"List the top 3 execution risks on a new hotel development."}
    ];
    const chips = document.getElementById('chips');
    starters.forEach(s => {
      const b=document.createElement('button'); b.className='chip'; b.textContent=s.label;
      b.onclick=()=>{ field.value=s.text; field.focus(); }; chips.appendChild(b);
    });

    function bubble(t, who){ const d=document.createElement('div'); d.className='bub '+who; d.textContent=t; msgs.appendChild(d); msgs.scrollTop=msgs.scrollHeight; return d; }

    async function ask(q){
      if(!q) return;
      bubble(q,'user'); field.value='';
      const bot = bubble('…','bot');
      try{
        const r = await fetch(API_BASE + '/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})});
        if(!r.body){ bot.textContent='(service error)'; return; }
        const rd=r.body.getReader(); const dec=new TextDecoder(); bot.textContent='';
        while(true){ const {done,value}=await rd.read(); if(done) break; bot.textContent+=dec.decode(value,{stream:true}); msgs.scrollTop=msgs.scrollHeight; }
      }catch{ bot.textContent='(network error)'; }
    }

    send.onclick=()=>ask(field.value.trim());
    field.onkeydown=(e)=>{ if(e.key==='Enter') ask(field.value.trim()); };
    bubble("Here’s the deal — ask about underwriting, extended-stay, or today’s Signal.","bot");
  })();
  </script>
</body>
</html>`);
});
