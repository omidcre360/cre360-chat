/* CRE360 loader — clean copy (client-only, SSR-safe, NL prompts) */
(function () {
  // ---------- 0) SSR guard ----------
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // ---------- 1) Find the config script tag safely ----------
    var cfgScript =
      (document.currentScript && document.currentScript.getAttribute && document.currentScript.getAttribute('data-endpoint') && document.currentScript) ||
      document.querySelector('script[data-api-base][data-endpoint]') ||
      null;

    if (!cfgScript) {
      console.error('[CRE360] Config script with data-api-base & data-endpoint not found.');
      return;
    }

    var API_BASE  = cfgScript.getAttribute('data-api-base') || '';
    var ENDPOINT  = cfgScript.getAttribute('data-endpoint') || '/chat';
    var BOT_NAME  = cfgScript.getAttribute('data-bot-name') || 'CRE360 Assistant';
    var C_PRIMARY = cfgScript.getAttribute('data-primary') || '#BFA77A';
    var C_SURFACE = cfgScript.getAttribute('data-surface') || '#0B0B0B';
    var C_TEXT    = cfgScript.getAttribute('data-text') || '#FFFFFF';
    var C_ACCENT  = cfgScript.getAttribute('data-accent') || '#D9CBA2';

    if (!API_BASE) {
      console.error('[CRE360] data-api-base is empty — set it on the script tag.');
      return;
    }

    // ---------- 2) Mount host ----------
    var host = document.createElement('div');
    Object.assign(host.style, { position:'fixed', bottom:'24px', right:'24px', zIndex: 999999 });
    document.body.appendChild(host);
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    var style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
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

    var fab = document.createElement('button');
    fab.className = 'btn fab';
    fab.setAttribute('aria-label', 'Open CRE360 chat');
    fab.textContent = '✦';

    var panel = document.createElement('section'); panel.className = 'panel';
    var header = document.createElement('div'); header.className = 'header';
    header.innerHTML = `<div class="badge">C</div><div><div class="title">${BOT_NAME}</div><div class="subtitle">Here’s the deal — ask me something specific.</div></div>`;

    var starterWrap = document.createElement('div'); starterWrap.className = 'starter';
    var typing = document.createElement('div'); typing.className='typing'; typing.style.display='none'; typing.textContent='CRE360 Assistant is typing…';
    var msgs = document.createElement('div'); msgs.className='messages';

    var inputBar = document.createElement('div'); inputBar.className='inputBar';
    var input = document.createElement('input'); input.className='field'; input.placeholder='Type your question…';
    var send  = document.createElement('button'); send.className='btn send'; send.textContent='Send';
    inputBar.appendChild(input); inputBar.appendChild(send);

    var footer = document.createElement('div'); footer.className='footer';
    footer.innerHTML = `Powered by <a class="link" href="https://cre360.ai" target="_blank" rel="noopener">CRE360</a>`;

    panel.appendChild(header); panel.appendChild(starterWrap); panel.appendChild(typing);
    panel.appendChild(msgs); panel.appendChild(inputBar); panel.appendChild(footer);
    root.appendChild(fab); root.appendChild(panel);

    fab.addEventListener('click', function(){ panel.classList.toggle('open'); });

    // ---------- 3) Helpers ----------
    function bubble(text, who){
      var el = document.createElement('div');
      el.className = 'bubble ' + (who === 'user' ? 'user' : 'bot');
      el.textContent = text;
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
      return el;
    }
    function setTyping(v){ typing.style.display = v ? 'block' : 'none'; }

    function sendToBackend(question){
      return fetch(API_BASE + ENDPOINT, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ message: question })
      });
    }

    function streamResponse(resp, botEl){
      if(!resp || !resp.ok || !resp.body){ botEl.textContent='Sorry—service is busy. Try again.'; return Promise.resolve(); }
      var reader = resp.body.getReader(); var decoder = new TextDecoder();
      function pump(){ return reader.read().then(function(r){ if(r.done) return; botEl.textContent += decoder.decode(r.value, {stream:true}); msgs.scrollTop=msgs.scrollHeight; return pump(); }); }
      return pump();
    }

    function ask(q){
      if(!q) return;
      bubble(q,'user'); input.value=''; setTyping(true);
      var botEl=bubble('','bot');
      sendToBackend(q)
        .then(function(r){ return streamResponse(r, botEl); })
        .catch(function(){ botEl.textContent='Network error. Please retry.'; })
        .finally(function(){ setTyping(false); });
    }

    send.addEventListener('click', function(){ ask(input.value.trim()); });
    input.addEventListener('keydown', function(e){ if(e.key==='Enter') ask(input.value.trim()); });

    // ---------- 4) Quick buttons (8 NL prompts) ----------
    var quickButtons = [
      { label:'📰 Today’s Signal',    text:"Give me today’s CRE360 Signal in 3 tight bullets with sources and dates." },
      { label:'📈 Rates Now',         text:"What are key CRE rates right now (10Y UST, 5Y UST, SOFR, Prime, 2s10s spread)? Include Source | Date (CT)." },
      { label:'🧮 DSCR',              text:"Calculate DSCR for NOI=1,200,000 and Annual Debt Service=950,000. One line, then Why it matters." },
      { label:'🧮 Debt Yield',        text:"Compute Debt Yield for NOI=1,200,000 and Loan Amount=14,000,000. One line, then lender context." },
      { label:'🏦 Size My Loan',      text:"Max loan if NOI=1,200,000, rate=7%, amort=30 years, with constraints DSCR≥1.25 and LTV≤65% and value=20,000,000. Show binding constraint." },
      { label:'🎯 Break-Even Rate',   text:"At NOI=1,200,000, loan=13,000,000, amort=30 years, what interest rate gives DSCR=1.20? One line result." },
      { label:'📐 Cap↔Value↔NOI',     text:"Solve Value if NOI=1,400,000 at 6.75% cap. One line result." },
      { label:'🔁 Refi Check',        text:"Refi check: NOI=1,300,000, value=21,000,000, rate=7.25%, amort=30 yrs, DSCR≥1.25, LTV≤65%. Pass/fail with max-allowable loan numbers." }
    ];

    quickButtons.forEach(function(btn){
      var chip = document.createElement('button');
      chip.className = 'chip btn';
      chip.textContent = btn.label;
      chip.addEventListener('click', function(){ ask(btn.text); });
      starterWrap.appendChild(chip);
    });

    // ---------- 5) Welcome ----------
    bubble('Welcome to ' + BOT_NAME + '. Ask about underwriting, extended-stay strategy, or today’s Signal.');
  }
})();
