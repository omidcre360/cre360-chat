(function () {
  // ---- SSR guard ----
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Run only after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // read attributes safely (script may be inlined or injected)
    var scripts = document.getElementsByTagName('script');
    var cfgScript = scripts[scripts.length - 1];
    try {
      // if this file is bundled, fallback to any script tag with data-endpoint
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].getAttribute && scripts[i].getAttribute('data-endpoint')) { cfgScript = scripts[i]; break; }
      }
    } catch (e) {}

    var API_BASE = (cfgScript && cfgScript.getAttribute('data-api-base')) || '';
    var ENDPOINT = (cfgScript && cfgScript.getAttribute('data-endpoint')) || '/chat';
    var BOT_NAME = (cfgScript && cfgScript.getAttribute('data-bot-name')) || 'CRE360 Assistant';
    var C_PRIMARY = (cfgScript && cfgScript.getAttribute('data-primary')) || '#BFA77A';
    var C_SURFACE = (cfgScript && cfgScript.getAttribute('data-surface')) || '#0B0B0B';
    var C_TEXT = (cfgScript && cfgScript.getAttribute('data-text')) || '#FFFFFF';
    var C_ACCENT = (cfgScript && cfgScript.getAttribute('data-accent')) || '#D9CBA2';

    // ---------- mount host ----------
    var host = document.createElement('div');
    host.id = 'cre360-chat-host';
    host.style.position = 'fixed';
    host.style.bottom = '24px';
    host.style.right = '24px';
    host.style.zIndex = 999999;
    document.body.appendChild(host);
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host; // fallback if Shadow DOM unavailable

    var style = document.createElement('style');
    style.textContent =
      '.btn{cursor:pointer;border:none}' +
      '.fab{width:56px;height:56px;border-radius:50%;background:' + C_PRIMARY + ';color:#111;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 30px rgba(0,0,0,.3);font-weight:700}' +
      '.panel{position:fixed;bottom:96px;right:24px;width:360px;max-width:90vw;height:560px;max-height:80vh;border-radius:16px;overflow:hidden;background:' + C_SURFACE + ';color:' + C_TEXT + ';box-shadow:0 24px 60px rgba(0,0,0,.5);display:none;flex-direction:column;border:1px solid rgba(255,255,255,.08)}' +
      '.panel.open{display:flex}' +
      '.header{padding:14px 16px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:12px}' +
      '.badge{width:28px;height:28px;border-radius:8px;background:' + C_PRIMARY + ';display:grid;place-items:center;color:#111;font-weight:800}' +
      '.title{font-size:14px;font-weight:700;letter-spacing:.3px}.subtitle{font-size:12px;opacity:.75}' +
      '.messages{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px}' +
      '.bubble{padding:12px 14px;border-radius:12px;max-width:85%;line-height:1.35;font-size:14px;white-space:pre-wrap}' +
      '.user{background:rgba(255,255,255,.08);align-self:flex-end}' +
      '.bot{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}' +
      '.starter{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 16px 8px}' +
      '.chip{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:' + C_TEXT + ';padding:8px 10px;border-radius:999px;font-size:12px;text-align:center;cursor:pointer}' +
      '.inputBar{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.08);background:' + C_SURFACE + '}' +
      '.field{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:' + C_TEXT + ';border-radius:10px;padding:10px 12px;font-size:14px}' +
      '.send{padding:10px 14px;border-radius:10px;background:' + C_PRIMARY + ';color:#111;font-weight:700}' +
      '.footer{padding:8px 12px;font-size:11px;text-align:center;opacity:.7}.link{color:' + C_ACCENT + ';text-decoration:none}' +
      '.typing{font-size:12px;opacity:.7;padding:0 16px 8px}' +
      '.modalWrap{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center}' +
      '.modal{width:340px;max-width:90vw;background:' + C_SURFACE + ';color:' + C_TEXT + ';border:1px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.6);padding:14px}' +
      '.modal h3{margin:0 0 8px 0;font-size:14px}' +
      '.formRow{display:flex;gap:8px;margin:6px 0}.label{font-size:12px;opacity:.8;width:44%}' +
      '.input{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:' + C_TEXT + ';border-radius:8px;padding:8px 10px;font-size:13px}' +
      '.rowActions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}' +
      '.btnGhost{background:transparent;border:1px solid rgba(255,255,255,.18);color:' + C_TEXT + ';padding:8px 10px;border-radius:10px}' +
      '.btnPrimary{background:' + C_PRIMARY + ';color:#111;padding:8px 12px;border-radius:10px;font-weight:700}' +
      '.err{color:#ffb4b4;font-size:12px;margin-top:6px;display:none}' +
      '*, *::before, *::after{font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}';
    root.appendChild(style);

    var fab = document.createElement('button');
    fab.className = 'btn fab';
    fab.setAttribute('aria-label', 'Open CRE360 chat');
    fab.textContent = '✦';

    var panel = document.createElement('section'); panel.className = 'panel';
    var header = document.createElement('div'); header.className = 'header';
    header.innerHTML = '<div class="badge">C</div><div><div class="title">' + BOT_NAME + '</div><div class="subtitle">Here’s the deal — ask me something specific.</div></div>';

    var typing = document.createElement('div'); typing.className='typing'; typing.style.display='none'; typing.textContent='CRE360 Assistant is typing…';
    var msgs = document.createElement('div'); msgs.className='messages';

    var starterWrap = document.createElement('div'); starterWrap.className = 'starter';

    var inputBar = document.createElement('div'); inputBar.className='inputBar';
    var input = document.createElement('input'); input.className='field'; input.placeholder='Type your question…';
    var send  = document.createElement('button'); send.className='btn send'; send.textContent='Send';
    inputBar.appendChild(input); inputBar.appendChild(send);

    var footer = document.createElement('div'); footer.className='footer';
    footer.innerHTML = 'Powered by <a class="link" href="https://cre360.ai" target="_blank" rel="noopener">CRE360</a>';

    panel.appendChild(header); panel.appendChild(starterWrap); panel.appendChild(typing);
    panel.appendChild(msgs); panel.appendChild(inputBar); panel.appendChild(footer);
    root.appendChild(fab); root.appendChild(panel);

    var modalWrap = document.createElement('div'); modalWrap.className = 'modalWrap'; root.appendChild(modalWrap);

    fab.addEventListener('click', function(){ panel.classList.toggle('open'); });

    function bubble(text, who){
      if (who === void 0) who = 'bot';
      var el = document.createElement('div');
      el.className = 'bubble ' + (who === 'user' ? 'user' : 'bot');
      el.textContent = text;
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
      return el;
    }
    function setTyping(v){ typing.style.display = v ? 'block' : 'none'; }

    function sendToBackend(payload, isFunctionCall){
      var body = isFunctionCall ? { function_call: payload } : { message: payload };
      return fetch(API_BASE + ENDPOINT, {
        method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body)
      });
    }

    function streamResponse(resp, botEl){
      if (!resp || !resp.ok || !resp.body) { botEl.textContent='Sorry—service is busy. Try again.'; return Promise.resolve(); }
      var reader = resp.body.getReader();
      var decoder = new TextDecoder();
      return reader.read().then(function pump(result){
        if (result.done) return;
        botEl.textContent += decoder.decode(result.value, {stream:true});
        msgs.scrollTop = msgs.scrollHeight;
        return reader.read().then(pump);
      });
    }

    function ask(question){
      if(!question) return;
      bubble(question,'user'); input.value=''; setTyping(true);
      var botEl=bubble('','bot');
      sendToBackend(question,false)
        .then(function(r){ return streamResponse(r, botEl); })
        .catch(function(){ botEl.textContent='Network error. Please retry.'; })
        .finally(function(){ setTyping(false); });
    }
    send.addEventListener('click', function(){ ask(input.value.trim()); });
    input.addEventListener('keydown', function(e){ if(e.key==='Enter') ask(input.value.trim()); });

    function triggerFunction(funcCall, userPreview){
      bubble(userPreview ? userPreview : ('→ ' + funcCall.name), 'user');
      setTyping(true);
      var botEl = bubble('', 'bot');
      sendToBackend(funcCall,true)
        .then(function(r){ return streamResponse(r, botEl); })
        .catch(function(){ botEl.textContent='Network error. Please retry.'; })
        .finally(function(){ setTyping(false); });
    }

    function openModal(title, fields, onSubmit){
      modalWrap.innerHTML = '';
      var m = document.createElement('div'); m.className = 'modal';
      var h = document.createElement('h3'); h.textContent = title;
      m.appendChild(h);
      var err = document.createElement('div'); err.className='err'; err.textContent='Please fill all fields with valid numbers.'; m.appendChild(err);

      var refs = {};
      fields.forEach(function(f){
        var row = document.createElement('div'); row.className='formRow';
        var lab = document.createElement('label'); lab.className='label'; lab.textContent = f.label;
        var inputEl;
        if (f.type === 'select') {
          inputEl = document.createElement('select'); inputEl.className='input';
          f.options.forEach(function(o){ var op=document.createElement('option'); op.value=o.value; op.textContent=o.label; inputEl.appendChild(op); });
          if (f.value) inputEl.value = f.value;
        } else {
          inputEl = document.createElement('input'); inputEl.className='input';
          inputEl.placeholder = f.placeholder || '';
          inputEl.type = 'text';
          if (f.value !== undefined) inputEl.value = f.value;
        }
        row.appendChild(lab); row.appendChild(inputEl); m.appendChild(row);
        refs[f.name] = inputEl;
      });

      var acts = document.createElement('div'); acts.className='rowActions';
      var cancel = document.createElement('button'); cancel.className='btnGhost'; cancel.textContent='Cancel';
      var submit = document.createElement('button'); submit.className='btnPrimary'; submit.textContent='Run';
      acts.appendChild(cancel); acts.appendChild(submit); m.appendChild(acts);

      modalWrap.appendChild(m); modalWrap.style.display='flex';
      cancel.onclick = function(){ modalWrap.style.display='none'; };
      submit.onclick = function(){
        var values = {}; var ok = true;
        fields.forEach(function(f){
          var el = refs[f.name]; var v = (f.type === 'select') ? el.value : el.value.trim();
          if (f.required && !v) ok = false;
          if (f.kind === 'number' && (v === '' || isNaN(Number(v)))) ok = false;
          values[f.name] = (f.kind === 'number') ? Number(v) : v;
        });
        if (!ok) { err.style.display='block'; return; }
        modalWrap.style.display='none';
        onSubmit(values);
      };
    }

    // -------- 8 Quick Buttons with forms --------
    var quickButtons = [
      { label:'📰 Today’s Signal', run:function(){ triggerFunction({ name:'get_signal', arguments:{} }, 'Today’s Signal'); } },
      { label:'📈 Rates Now', run:function(){ openModal('Rates Now', [
          { name:'rate_type', label:'Rate', type:'select', options:[
            {label:'10Y UST', value:'ust_10y'}, {label:'5Y UST', value:'ust_5y'},
            {label:'SOFR', value:'sofr'}, {label:'Prime', value:'prime'},
            {label:'2s10s Spread', value:'spread_2s10s'}
          ], value:'ust_10y', required:true }
        ], function(v){ triggerFunction({ name:'get_rates', arguments:{ rate_type: v.rate_type } }, 'Rates • ' + v.rate_type); }); } },
      { label:'🧮 DSCR', run:function(){ openModal('Calculate DSCR', [
          { name:'noi', label:'NOI ($/yr)', kind:'number', required:true },
          { name:'debt_service', label:'Debt Service ($/yr)', kind:'number', required:true }
        ], function(v){ triggerFunction({ name:'calculate_dscr', arguments:v }, 'DSCR • NOI ' + v.noi + ' / Debt ' + v.debt_service); }); } },
      { label:'🧮 Debt Yield', run:function(){ openModal('Debt Yield', [
          { name:'noi', label:'NOI ($/yr)', kind:'number', required:true },
          { name:'loan_amount', label:'Loan Amount ($)', kind:'number', required:true }
        ], function(v){ triggerFunction({ name:'calculate_debt_yield', arguments:v }, 'Debt Yield • NOI ' + v.noi + ' / Loan ' + v.loan_amount); }); } },
      { label:'🏦 Size My Loan', run:function(){ openModal('Loan Sizing', [
          { name:'noi', label:'NOI ($/yr)', kind:'number', required:true },
          { name:'rate_pct', label:'Rate (%)', kind:'number', required:true, placeholder:'7.0' },
          { name:'amort_years', label:'Amort (yrs)', kind:'number', required:true, placeholder:'30' },
          { name:'min_dscr', label:'Min DSCR', kind:'number', required:false, placeholder:'1.25' },
          { name:'max_ltv', label:'Max LTV', kind:'number', required:false, placeholder:'0.65' },
          { name:'value', label:'Value ($) (for LTV)', kind:'number', required:false }
        ], function(v){ triggerFunction({ name:'loan_sizing', arguments:v }, 'Loan Sizing'); }); } },
      { label:'🎯 Break-Even Rate', run:function(){ openModal('Break-Even Rate', [
          { name:'noi', label:'NOI ($/yr)', kind:'number', required:true },
          { name:'loan_amount', label:'Loan Amount ($)', kind:'number', required:true },
          { name:'amort_years', label:'Amort (yrs)', kind:'number', required:true },
          { name:'target_dscr', label:'Target DSCR', kind:'number', required:true }
        ], function(v){ triggerFunction({ name:'break_even_rate', arguments:v }, 'Break-Even Rate'); }); } },
      { label:'📐 Cap↔Value↔NOI', run:function(){ openModal('Solve Cap / Value / NOI', [
          { name:'solve', label:'Solve for', type:'select', options:[
            {label:'Value (given NOI & Cap)', value:'value'},
            {label:'NOI (given Value & Cap)', value:'noi'},
            {label:'Cap Rate (given NOI & Value)', value:'cap'}
          ], value:'value', required:true },
          { name:'noi', label:'NOI ($/yr)', kind:'number', required:false },
          { name:'value', label:'Value ($)', kind:'number', required:false },
          { name:'cap_rate_pct', label:'Cap Rate (%)', kind:'number', required:false }
        ], function(v){ triggerFunction({ name:'cap_value_noi', arguments:v }, 'Cap/Value/NOI'); }); } },
      { label:'🔁 Refi Check', run:function(){ openModal('Refi Feasibility', [
          { name:'noi', label:'NOI ($/yr)', kind:'number', required:true },
          { name:'value', label:'Value ($)', kind:'number', required:true },
          { name:'rate_pct', label:'Rate (%)', kind:'number', required:true },
          { name:'amort_years', label:'Amort (yrs)', kind:'number', required:true },
          { name:'target_dscr', label:'Min DSCR', kind:'number', required:true },
          { name:'max_ltv', label:'Max LTV', kind:'number', required:true }
        ], function(v){ triggerFunction({ name:'refi_check', arguments:v }, 'Refi Check'); }); } }
    ];

    // render chips
    quickButtons.forEach(function(btn){
      var chip = document.createElement('button');
      chip.className = 'chip btn';
      chip.textContent = btn.label;
      chip.addEventListener('click', btn.run);
      starterWrap.appendChild(chip);
    });

    // welcome line
    bubble('Welcome to ' + BOT_NAME + '. Ask about underwriting, extended-stay strategy, or today’s Signal.');
  }
})();
