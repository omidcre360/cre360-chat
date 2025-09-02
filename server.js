/* CRE360 panel — ultra-safe, no ShadowDOM, NL prompts, {message} payload */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  function init() {
    // Find the first script tag that has data-endpoint (or just use the last script tag)
    var cfg = document.querySelector('script[data-endpoint]') || (function () {
      var s = document.getElementsByTagName('script');
      return s[s.length - 1] || null;
    })();

    // Config (all optional)
    var API_BASE  = cfg && cfg.getAttribute('data-api-base') ? cfg.getAttribute('data-api-base') : '';
    var ENDPOINT  = cfg && cfg.getAttribute('data-endpoint')  ? cfg.getAttribute('data-endpoint')  : '/chat';
    var BOT_NAME  = cfg && cfg.getAttribute('data-bot-name')  ? cfg.getAttribute('data-bot-name')  : 'CRE360 Assistant';
    var C_PRIMARY = cfg && cfg.getAttribute('data-primary')   ? cfg.getAttribute('data-primary')   : '#BFA77A';
    var C_SURFACE = cfg && cfg.getAttribute('data-surface')   ? cfg.getAttribute('data-surface')   : '#0B0B0B';
    var C_TEXT    = cfg && cfg.getAttribute('data-text')      ? cfg.getAttribute('data-text')      : '#FFFFFF';
    var C_ACCENT  = cfg && cfg.getAttribute('data-accent')    ? cfg.getAttribute('data-accent')    : '#D9CBA2';

    // If API_BASE not provided, use same-origin (works inside /console iframe)
    if (!API_BASE) API_BASE = window.location.origin;

    // ===== Mount basic DOM (no Shadow DOM)
    var host = document.createElement('div');
    host.id = 'cre360-panel-host';
    host.style.position = 'fixed';
    host.style.right = '24px';
    host.style.bottom = '24px';
    host.style.zIndex = 999999;
    document.body.appendChild(host);

    // CSS
    var style = document.createElement('style');
    style.innerHTML =
      '*{box-sizing:border-box}'+
      '.cre360-btn{cursor:pointer;border:none}'+
      '.cre360-fab{width:56px;height:56px;border-radius:50%;background:'+C_PRIMARY+';color:#111;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 30px rgba(0,0,0,.3);font-weight:700}'+
      '.cre360-panel{position:fixed;right:24px;bottom:96px;width:360px;max-width:90vw;height:560px;max-height:80vh;border-radius:16px;overflow:hidden;background:'+C_SURFACE+';color:'+C_TEXT+';box-shadow:0 24px 60px rgba(0,0,0,.5);display:none;flex-direction:column;border:1px solid rgba(255,255,255,.08)}'+
      '.cre360-panel.open{display:flex}'+
      '.cre360-header{padding:14px 16px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:12px}'+
      '.cre360-badge{width:28px;height:28px;border-radius:8px;background:'+C_PRIMARY+';display:grid;place-items:center;color:#111;font-weight:800}'+
      '.cre360-title{font-size:14px;font-weight:700;letter-spacing:.3px}'+
      '.cre360-sub{font-size:12px;opacity:.75}'+
      '.cre360-msgs{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px}'+
      '.cre360-bubble{padding:12px 14px;border-radius:12px;max-width:85%;line-height:1.35;font-size:14px;white-space:pre-wrap}'+
      '.cre360-user{background:rgba(255,255,255,.08);align-self:flex-end}'+
      '.cre360-bot{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}'+
      '.cre360-starter{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 16px}'+
      '.cre360-chip{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:'+C_TEXT+';padding:8px 10px;border-radius:999px;font-size:12px;text-align:center;cursor:pointer}'+
      '.cre360-inputBar{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.08);background:'+C_SURFACE+'}'+
      '.cre360-input{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:'+C_TEXT+';border-radius:10px;padding:10px 12px;font-size:14px}'+
      '.cre360-send{padding:10px 14px;border-radius:10px;background:'+C_PRIMARY+';color:#111;font-weight:700}'+
      '.cre360-foot{padding:8px 12px;font-size:11px;text-align:center;opacity:.7}'+
      '.cre360-link{color:'+C_ACCENT+';text-decoration:none}'+
      '.cre360-typing{font-size:12px;opacity:.7;padding:0 16px 8px;display:none}';
    document.head.appendChild(style);

    // Structure
    var fab = document.createElement('button');
    fab.className = 'cre360-btn cre360-fab';
    fab.setAttribute('aria-label','Open CRE360 chat');
    fab.appendChild(document.createTextNode('✦'));

    var panel = document.createElement('section'); panel.className = 'cre360-panel';
    var header = document.createElement('div'); header.className = 'cre360-header';
    header.innerHTML = '<div class="cre360-badge">C</div><div><div class="cre360-title">'+BOT_NAME+'</div><div class="cre360-sub">Here’s the deal — ask me something specific.</div></div>';

    var starter = document.createElement('div'); starter.className = 'cre360-starter';
    var typing = document.createElement('div'); typing.className = 'cre360-typing'; typing.appendChild(document.createTextNode('CRE360 Assistant is typing…'));
    var msgs = document.createElement('div'); msgs.className = 'cre360-msgs';

    var inputBar = document.createElement('div'); inputBar.className = 'cre360-inputBar';
    var field = document.createElement('input'); field.className = 'cre360-input'; field.placeholder = 'Type your question…';
    var send = document.createElement('button'); send.className = 'cre360-btn cre360-send'; send.appendChild(document.createTextNode('Send'));
    inputBar.appendChild(field); inputBar.appendChild(send);

    var foot = document.createElement('div'); foot.className = 'cre360-foot';
    foot.innerHTML = 'Powered by <a class="cre360-link" href="https://cre360.ai" target="_blank" rel="noopener">CRE360</a>';

    panel.appendChild(header); panel.appendChild(starter); panel.appendChild(typing);
    panel.appendChild(msgs); panel.appendChild(inputBar); panel.appendChild(foot);

    host.appendChild(fab); host.appendChild(panel);

    fab.addEventListener('click', function () { panel.classList.toggle('open'); });

    // Helpers
    function bubble(text, who) {
      var el = document.createElement('div');
      el.className = 'cre360-bubble ' + (who === 'user' ? 'cre360-user' : 'cre360-bot');
      el.textContent = text;
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
      return el;
    }
    function setTyping(v){ typing.style.display = v ? 'block' : 'none'; }

    function sendToBackend(question) {
      return fetch(API_BASE + ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question })
      });
    }

    function streamResponse(resp, botEl) {
      if (!resp || !resp.ok) { botEl.textContent = 'Sorry—service is busy. Try again.'; return Promise.resolve(); }
      if (!resp.body || !resp.body.getReader) {
        // fallback no-stream
        return resp.text().then(function (t) { botEl.textContent = t; });
      }
      var reader = resp.body.getReader();
      var decoder = new TextDecoder();
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          botEl.textContent += decoder.decode(r.value, { stream: true });
          msgs.scrollTop = msgs.scrollHeight;
          return pump();
        });
      }
      return pump();
    }

    function ask(q) {
      if (!q) return;
      bubble(q, 'user');
      field.value = '';
      setTyping(true);
      var botEl = bubble('', 'bot');
      sendToBackend(q)
        .then(function (r) { return streamResponse(r, botEl); })
        .catch(function () { botEl.textContent = 'Network error. Please retry.'; })
        .finally(function () { setTyping(false); });
    }

    send.addEventListener('click', function(){ ask(field.value.trim()); });
    field.addEventListener('keydown', function(e){ if (e.key === 'Enter') ask(field.value.trim()); });

    // 8 quick prompts (natural-language)
    var buttons = [
      { label:'📰 Today’s Signal',    text:"Give me today’s CRE360 Signal in 3 bullets." },
      { label:'📈 Rates Now',         text:"What are today’s CRE rates? (10Y, 5Y, SOFR, Prime, 2s10s spread). Include Source | Date (CT)." },
      { label:'🧮 DSCR',              text:"Calculate DSCR for NOI=1,200,000 and Annual Debt Service=950,000. One line, then Why it matters." },
      { label:'🧮 Debt Yield',        text:"Debt Yield if NOI=1,200,000 and Loan=14,000,000?" },
      { label:'🏦 Size My Loan',      text:"Max loan if NOI=1,200,000, rate=7%, amort=30 years, DSCR≥1.25, LTV≤65%, value=20,000,000. Show binding constraint." },
      { label:'🎯 Break-Even Rate',   text:"At NOI=1,200,000, loan=13,000,000, amort=30 years, what interest rate makes DSCR=1.20?" },
      { label:'📐 Cap↔Value↔NOI',     text:"Solve Value if NOI=1,400,000 at 6.75% cap." },
      { label:'🔁 Refi Check',        text:"Refi check: NOI=1,300,000, value=21,000,000, rate=7.25%, amort=30 yrs, DSCR≥1.25, LTV≤65%. Pass/fail with max loan numbers." }
    ];
    for (var i=0;i<buttons.length;i++){
      var chip = document.createElement('button');
      chip.className = 'cre360-chip';
      chip.appendChild(document.createTextNode(buttons[i].label));
      (function(txt){ chip.addEventListener('click', function(){ ask(txt); }); })(buttons[i].text);
      starter.appendChild(chip);
    }

    bubble('Welcome to '+BOT_NAME+'. Ask about underwriting, extended-stay strategy, or today’s Signal.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
