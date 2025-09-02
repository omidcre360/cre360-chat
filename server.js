(function () {
  const cfgScript = document.currentScript;
  const API_BASE = cfgScript.getAttribute('data-api-base') || '';
  const ENDPOINT  = cfgScript.getAttribute('data-endpoint') || '/chat';
  const BOT_NAME  = cfgScript.getAttribute('data-bot-name') || 'CRE360 Assistant';
  const C_PRIMARY = cfgScript.getAttribute('data-primary') || '#BFA77A';
  const C_SURFACE = cfgScript.getAttribute('data-surface') || '#0B0B0B';
  const C_TEXT    = cfgScript.getAttribute('data-text') || '#FFFFFF';
  const C_ACCENT  = cfgScript.getAttribute('data-accent') || '#D9CBA2';

  // ---------- Mount ----------
  const host = document.createElement('div');
  Object.assign(host.style, { position:'fixed', bottom:'24px', right:'24px', zIndex: 999999 });
  document.body.appendChild(host);
  const root = host.attachShadow({ mode:'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    *, *::before, *::after { box-sizing: border-box; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
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

    /* Modal */
    .modalWrap{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center}
    .modal{width:340px;max-width:90vw;background:${C_SURFACE};color:${C_TEXT};border:1px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.6);padding:14px}
    .modal h3{margin:0 0 8px 0;font-size:14px}
    .formRow{display:flex;gap:8px;margin:6px 0}
    .label{font-size:12px;opacity:.8;width:44%}
    .input{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:${C_TEXT};border-radius:8px;padding:8px 10px;font-size:13px}
    .rowActions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
    .btnGhost{background:transparent;border:1px solid rgba(255,255,255,.18);color:${C_TEXT};padding:8px 10px;border-radius:10px}
    .btnPrimary{background:${C_PRIMARY};color:#111;padding:8px 12px;border-radius:10px;font-weight:700}
    .err{color:#ffb4b4;font-size:12px;margin-top:6px;display:none}
    select.input{appearance:none}
  `;
  root.appendChild(style);

  const fab = document.createElement('button');
  fab.className = 'btn fab'; fab.textContent = '✦'; fab.setAttribute('aria-label', 'Open CRE360 chat');

  const panel = document.createElement('section'); panel.className = 'panel';
  const header = document.createElement('div'); header.className = 'header';
  header.innerHTML = `<div class="badge">C</div><div><div class="title">${BOT_NAME}</div><div class="subtitle">Here’s the deal — ask me something specific.</div></div>`;

  const typing = document.createElement('div'); typing.className='typing'; typing.style.display='none'; typing.textContent='CRE360 Assistant is typing…';
  const msgs = document.createElement('div'); msgs.className='messages';

  // ---------- Quick buttons container ----------
  const starterWrap = document.createElement('div'); starterWrap.className = 'starter';

  // ---------- Input bar ----------
  const inputBar = document.createElement('div'); inputBar.className='inputBar';
  const input = document.createElement('input'); input.className='field'; input.placeholder='Type your question…';
  const send  = document.createElement('button'); send.className='btn send'; send.textContent='Send';
  inputBar.appendChild(input); inputBar.appendChild(send);

  const footer = document.createElement('div'); footer.className='footer';
  footer.innerHTML = `Powered by <a class="link" href="https://cre360.ai" target="_blank" rel="noopener">CRE360</a>`;

  panel.appendChild(header); panel.appendChild(starterWrap); panel.appendChild(typing);
  panel.appendChild(msgs); panel.appendChild(inputBar); panel.appendChild(footer);
  root.appendChild(fab); root.appendChild(panel);

  // Modal root
  const modalWrap = document.createElement('div'); modalWrap.className = 'modalWrap'; root.appendChild(modalWrap);

  fab.addEventListener('click', () => panel.classList.toggle('open'));

  function bubble(text, who='bot'){ const el=document.createElement('div'); el.className=`bubble ${who==='user'?'user':'bot'}`; el.textContent=text; msgs.appendChild(el); msgs.scrollTop=msgs.scrollHeight; return el; }
  function setTyping(v){ typing.style.display = v ? 'block' : 'none'; }

  // ---------- Backend caller ----------
  async function sendToBackend(payload, isFunctionCall=false){
    const res = await fetch(`${API_BASE}${ENDPOINT}`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(isFunctionCall ? { function_call: payload } : { message: payload })
    });
    return res;
  }

  async function streamResponse(resp, botEl){
    if(!resp.ok || !resp.body){ botEl.textContent='Sorry—service is busy. Try again.'; return; }
    const reader = resp.body.getReader(); const decoder = new TextDecoder();
    while(true){ const {value, done} = await reader.read(); if(done) break; botEl.textContent += decoder.decode(value, {stream:true}); msgs.scrollTop=msgs.scrollHeight; }
  }

  async function ask(question){
    if(!question) return;
    bubble(question,'user'); input.value=''; setTyping(true);
    const botEl=bubble('','bot');
    try{ const resp = await sendToBackend(question,false); await streamResponse(resp, botEl); }
    catch{ botEl.textContent='Network error. Please retry.'; }
    finally{ setTyping(false); }
  }
  send.addEventListener('click', ()=>ask(input.value.trim()));
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') ask(input.value.trim()); });

  async function triggerFunction(funcCall, userPreview){
    if(userPreview) bubble(userPreview, 'user'); else bubble(`→ ${funcCall.name}`, 'user');
    setTyping(true);
    const botEl=bubble('','bot');
    try{ const resp = await sendToBackend(funcCall,true); await streamResponse(resp, botEl); }
    catch{ botEl.textContent='Network error. Please retry.'; }
    finally{ setTyping(false); }
  }

  // ---------- Modal helpers ----------
  function openModal(title, fields, onSubmit){
    modalWrap.innerHTML = '';
    const m = document.createElement('div'); m.className = 'modal';
    const err = document.createElement('div'); err.className='err'; err.textContent='Please fill all fields with valid numbers.';
    const h = document.createElement('h3'); h.textContent = title;
    m.appendChild(h);

    const refs = {};
    fields.forEach(f => {
      const row = document.createElement('div'); row.className='formRow';
      const lab = document.createElement('label'); lab.className='label'; lab.textContent = f.label;
      let inputEl;
      if (f.type === 'select') {
        inputEl = document.createElement('select');
        inputEl.className = 'input';
        f.options.forEach(o => {
          const op = document.createElement('option');
          op.value = o.value; op.textContent = o.label; inputEl.appendChild(op);
        });
      } else {
        inputEl = document.createElement('input');
        inputEl.className='input'; inputEl.placeholder = f.placeholder || '';
        inputEl.type = f.type || 'text';
      }
      if (f.value !== undefined) inputEl.value = f.value;
      row.appendChild(lab); row.appendChild(inputEl);
      m.appendChild(row);
      refs[f.name] = inputEl;
    });

    m.appendChild(err);
    const acts = document.createElement('div'); acts.className='rowActions';
    const cancel = document.createElement('button'); cancel.className='btnGhost'; cancel.textContent='Cancel';
    const submit = document.createElement('button'); submit.className='btnPrimary'; submit.textContent='Run';
    acts.appendChild(cancel); acts.appendChild(submit); m.appendChild(acts);

    modalWrap.appendChild(m);
    modalWrap.style.display='flex';

    cancel.onclick = () => { modalWrap.style.display='none'; };
    submit.onclick = () => {
      const values = {};
      let ok = true;
      fields.forEach(f => {
        let v;
        if (f.type === 'select') {
          v = refs[f.name].value;
        } else {
          v = refs[f.name].value.trim();
        }
        if (f.required && !v) ok = false;
        if (f.kind === 'number' && (v === '' || isNaN(Number(v)))) ok = false;
        values[f.name] = f.kind === 'number' ? Number(v) : v;
      });
      if (!ok) { err.style.display='block'; return; }
      modalWrap.style.display='none';
      onSubmit(values);
    };
  }

  // ---------- Quick Action Buttons (with modals) ----------
  const quickButtons = [
    {
      label: '📰 Today’s Signal',
      run: () => triggerFunction({ name:'get_signal', arguments:{} }, 'Today’s Signal')
    },
    {
      label: '📈 Rates Now',
      run: () => openModal('Rates Now', [
        { name:'rate_type', label:'Rate', type:'select', options:[
          {label:'10Y UST', value:'ust_10y'}, {label:'5Y UST', value:'ust_5y'},
          {label:'SOFR', value:'sofr'}, {label:'Prime', value:'prime'},
          {label:'2s10s Spread', value:'spread_2s10s'}
        ], value:'ust_10y', required:true }
      ], ({rate_type}) => triggerFunction({ name:'get_rates', arguments:{ rate_type } }, `Rates • ${rate_type}`))
    },
    {
      label: '🧮 DSCR',
      run: () => openModal('Calculate DSCR', [
        { name:'noi', label:'NOI ($/yr)', kind:'number', required:true, placeholder:'1200000' },
        { name:'debt_service', label:'Debt Service ($/yr)', kind:'number', required:true, placeholder:'950000' }
      ], ({noi, debt_service}) =>
        triggerFunction({ name:'calculate_dscr', arguments:{ noi, debt_service } }, `DSCR • NOI ${noi} / Debt ${debt_service}`))
    },
    {
      label: '🧮 Debt Yield',
      run: () => openModal('Debt Yield', [
        { name:'noi', label:'NOI ($/yr)', kind:'number', required:true },
        { name:'loan_amount', label:'Loan Amount ($)', kind:'number', required:true }
      ], ({noi, loan_amount}) =>
        triggerFunction({ name:'calculate_debt_yield', arguments:{ noi, loan_amount } }, `Debt Yield • NOI ${noi} / Loan ${loan_amount}`))
    },
    {
      label: '🏦 Size My Loan',
      run: () => openModal('Loan Sizing', [
        { name:'noi', label:'NOI ($/yr)', kind:'number', required:true },
        { name:'rate_pct', label:'Rate (%)', kind:'number', required:true, placeholder:'7.0' },
        { name:'amort_years', label:'Amort (yrs)', kind:'number', required:true, placeholder:'30' },
        { name:'min_dscr', label:'Min DSCR', kind:'number', required:false, placeholder:'1.25' },
        { name:'max_ltv', label:'Max LTV', kind:'number', required:false, placeholder:'0.65' },
        { name:'value', label:'Value ($) (for LTV)', kind:'number', required:false }
      ], (vals) => triggerFunction({ name:'loan_sizing', arguments: vals }, 'Loan Sizing'))
    },
    {
      label: '🎯 Break-Even Rate',
      run: () => openModal('Break-Even Rate (target DSCR)', [
        { name:'noi', label:'NOI ($/yr)', kind:'number', required:true },
        { name:'loan_amount', label:'Loan Amount ($)', kind:'number', required:true },
        { name:'amort_years', label:'Amort (yrs)', kind:'number', required:true },
        { name:'target_dscr', label:'Target DSCR', kind:'number', required:true, placeholder:'1.20' }
      ], (vals) => triggerFunction({ name:'break_even_rate', arguments: vals }, 'Break-Even Rate'))
    },
    {
      label: '📐 Cap↔Value↔NOI',
      run: () => openModal('Solve Cap / Value / NOI', [
        { name:'solve', label:'Solve for', type:'select', options:[
          {label:'Value (given NOI & Cap)', value:'value'},
          {label:'NOI (given Value & Cap)', value:'noi'},
          {label:'Cap Rate (given NOI & Value)', value:'cap'}
        ], value:'value', required:true },
        { name:'noi', label:'NOI ($/yr)', kind:'number', required:false },
        { name:'value', label:'Value ($)', kind:'number', required:false },
        { name:'cap_rate_pct', label:'Cap Rate (%)', kind:'number', required:false }
      ], (vals) => {
        // Send fields as provided; your backend function decides what to compute
        triggerFunction({ name:'cap_value_noi', arguments: vals }, 'Cap/Value/NOI');
      })
    },
    {
      label: '🔁 Refi Check',
      run: () => openModal('Refi Feasibility', [
        { name:'noi', label:'NOI ($/yr)', kind:'number', required:true },
        { name:'value', label:'Value ($)', kind:'number', required:true },
        { name:'rate_pct', label:'Rate (%)', kind:'number', required:true },
        { name:'amort_years', label:'Amort (yrs)', kind:'number', required:true },
        { name:'target_dscr', label:'Min DSCR', kind:'number', required:true, placeholder:'1.25' },
        { name:'max_ltv', label:'Max LTV', kind:'number', required:true, placeholder:'0.65' }
      ], (vals) => triggerFunction({ name:'refi_check', arguments: vals }, 'Refi Check'))
    }
  ];

  // Render chips
  quickButtons.forEach(btn => {
    const chip = document.createElement('button');
    chip.className = 'chip btn';
    chip.textContent = btn.label;
    chip.addEventListener('click', btn.run);
    starterWrap.appendChild(chip);
  });

  // Welcome
  bubble(`Welcome to ${BOT_NAME}. Ask about underwriting, extended-stay strategy, or today’s Signal.`);
})();
