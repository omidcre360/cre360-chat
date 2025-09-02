/* CRE360 Assistant loader — clean full copy */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  function init() {
    // --- Config from script tag ---
    var cfg = document.querySelector('script[data-endpoint]') || document.currentScript;
    var API_BASE  = (cfg && cfg.getAttribute('data-api-base')) || '';
    var ENDPOINT  = (cfg && cfg.getAttribute('data-endpoint')) || '/chat';
    var BOT_NAME  = (cfg && cfg.getAttribute('data-bot-name')) || 'CRE360 Assistant';
    var C_PRIMARY = (cfg && cfg.getAttribute('data-primary')) || '#BFA77A';
    var C_SURFACE = (cfg && cfg.getAttribute('data-surface')) || '#0B0B0B';
    var C_TEXT    = (cfg && cfg.getAttribute('data-text')) || '#FFFFFF';
    var C_ACCENT  = (cfg && cfg.getAttribute('data-accent')) || '#D9CBA2';
    if (!API_BASE) API_BASE = window.location.origin;

    // --- Host mount ---
    var host = document.createElement('div');
    Object.assign(host.style,{position:'fixed',bottom:'24px',right:'24px',zIndex:999999});
    document.body.appendChild(host);
    var root = host.attachShadow({mode:'open'});

    // --- Styles ---
    var style=document.createElement('style');
    style.textContent=`
      :host{all:initial}
      *,*::before,*::after{box-sizing:border-box;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
      .btn{cursor:pointer;border:none}
      .fab{width:56px;height:56px;border-radius:50%;background:${C_PRIMARY};color:#111;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 30px rgba(0,0,0,.3);font-weight:700}
      .panel{position:fixed;bottom:96px;right:24px;width:360px;max-width:90vw;height:560px;max-height:80vh;border-radius:16px;overflow:hidden;background:${C_SURFACE};color:${C_TEXT};box-shadow:0 24px 60px rgba(0,0,0,.5);display:none;flex-direction:column;border:1px solid rgba(255,255,255,.08)}
      .panel.open{display:flex}
      .header{padding:14px 16px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:12px}
      .badge{width:28px;height:28px;border-radius:8px;background:${C_PRIMARY};display:grid;place-items:center;color:#111;font-weight:800}
      .title{font-size:14px;font-weight:700;letter-spacing:.3px}
      .subtitle{font-size:12px;opacity:.75}
      .messages{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
      .bubble{padding:12px 14px;border-radius:12px;max-width:85%;line-height:1.35;font-size:14px;white-space:pre-wrap}
      .user{background:rgba(255,255,255,.08);align-self:flex-end}
      .bot{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
      .starter{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 16px 8px}
      .chip{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:${C_TEXT};padding:8px 10px;border-radius:999px;font-size:12px;text-align:center;cursor:pointer}
      .inputBar{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.08);background:${C_SURFACE}}
      .field{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:${C_TEXT};border-radius:10px;padding:10px 12px;font-size:14px}
      .send{padding:10px 14px;border-radius:10px;background:${C_PRIMARY};color:#111;font-weight:700}
      .footer{padding:8px 12px;font-size:11px;text-align:center;opacity:.7}
      .link{color:${C_ACCENT};text-decoration:none}
      .typing{font-size:12px;opacity:.7;padding:0 16px 8px}
    `;
    root.appendChild(style);

    // --- Structure ---
    var fab=document.createElement('button');fab.className='btn fab';fab.textContent='✦';
    var panel=document.createElement('section');panel.className='panel';
    var header=document.createElement('div');header.className='header';
    header.innerHTML=`<div class="badge">C</div><div><div class="title">${BOT_NAME}</div><div class="subtitle">Here’s the deal — ask me something specific.</div></div>`;
    var starterWrap=document.createElement('div');starterWrap.className='starter';
    var typing=document.createElement('div');typing.className='typing';typing.style.display='none';typing.textContent='CRE360 Assistant is typing…';
    var msgs=document.createElement('div');msgs.className='messages';
    var inputBar=document.createElement('div');inputBar.className='inputBar';
    var input=document.createElement('input');input.className='field';input.placeholder='Type your question…';
    var send=document.createElement('button');send.className='btn send';send.textContent='Send';
    inputBar.appendChild(input);inputBar.appendChild(send);
    var footer=document.createElement('div');footer.className='footer';
    footer.innerHTML=`Powered by <a class="link" href="https://cre360.ai" target="_blank">CRE360</a>`;
    panel.appendChild(header);panel.appendChild(starterWrap);panel.appendChild(typing);
    panel.appendChild(msgs);panel.appendChild(inputBar);panel.appendChild(footer);
    root.appendChild(fab);root.appendChild(panel);

    fab.addEventListener('click',()=>panel.classList.toggle('open'));

    // --- Helpers ---
    function bubble(text,who){var el=document.createElement('div');el.className='bubble '+(who==='user'?'user':'bot');el.textContent=text;msgs.appendChild(el);msgs.scrollTop=msgs.scrollHeight;return el;}
    function setTyping(v){typing.style.display=v?'block':'none';}
    function sendToBackend(question){
      return fetch(API_BASE+ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:question})});
    }
    function streamResponse(resp,botEl){
      if(!resp||!resp.ok||!resp.body){botEl.textContent='Sorry—service is busy.';return;}
      var r=resp.body.getReader();var d=new TextDecoder();
      function pump(){return r.read().then(({value,done})=>{if(done)return;botEl.textContent+=d.decode(value,{stream:true});msgs.scrollTop=msgs.scrollHeight;return pump();});}
      return pump();
    }
    function ask(q){
      if(!q)return;bubble(q,'user');input.value='';setTyping(true);var botEl=bubble('','bot');
      sendToBackend(q).then(r=>streamResponse(r,botEl)).catch(()=>botEl.textContent='Network error.').finally(()=>setTyping(false));
    }
    send.addEventListener('click',()=>ask(input.value.trim()));
    input.addEventListener('keydown',(e)=>{if(e.key==='Enter')ask(input.value.trim());});

    // --- 8 Quick Buttons ---
    [
      {label:'📰 Today’s Signal',text:"Give me today’s CRE360 Signal in 3 bullets."},
      {label:'📈 Rates Now',text:"What are today’s CRE rates? (10Y, 5Y, SOFR, Prime, 2s10s spread)"},
      {label:'🧮 DSCR',text:"Calculate DSCR for NOI=1,200,000 and Debt Service=950,000."},
      {label:'🧮 Debt Yield',text:"Debt Yield if NOI=1,200,000 and Loan=14,000,000?"},
      {label:'🏦 Size My Loan',text:"Max loan if NOI=1,200,000, rate=7%, amort=30y, DSCR≥1.25, LTV≤65%, value=20M."},
      {label:'🎯 Break-Even Rate',text:"At NOI=1,200,000, Loan=13,000,000, 30y amort, what rate = DSCR 1.20?"},
      {label:'📐 Cap↔Value↔NOI',text:"Value if NOI=1,400,000 at 6.75% cap rate."},
      {label:'🔁 Refi Check',text:"Refi check: NOI=1,300,000, Value=21M, rate=7.25%, 30y, DSCR≥1.25, LTV≤65%."}
    ].forEach(btn=>{
      var chip=document.createElement('button');chip.className='chip btn';chip.textContent=btn.label;
      chip.addEventListener('click',()=>ask(btn.text));starterWrap.appendChild(chip);
    });

    // --- Welcome bubble ---
    bubble(`Welcome to ${BOT_NAME}. Ask about underwriting, extended-stay strategy, or today’s Signal.`);
  }
})();
