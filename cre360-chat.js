(function () {
  const cfgScript = document.currentScript;
  const API_BASE = cfgScript.getAttribute('data-api-base') || '';
  const ENDPOINT = cfgScript.getAttribute('data-endpoint') || '/chat';
  const BOT_NAME = cfgScript.getAttribute('data-bot-name') || 'CRE360 Assistant';
  const C_PRIMARY = cfgScript.getAttribute('data-primary') || '#BFA77A';
  const C_SURFACE = cfgScript.getAttribute('data-surface') || '#0B0B0B';
  const C_TEXT = cfgScript.getAttribute('data-text') || '#FFFFFF';
  const C_ACCENT = cfgScript.getAttribute('data-accent') || '#D9CBA2';
  const STARTERS = (() => { try { return JSON.parse(cfgScript.getAttribute('data-starter-prompts') || '[]'); } catch { return []; } })();

  const host = document.createElement('div');
  host.id = 'cre360-chat-host';
  Object.assign(host.style, { position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999 });
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });

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
    .bubble{padding:12px 14px;border-radius:12px;max-width:85%;line-height:1.35;font-size:14px}
    .user{background:rgba(255,255,255,.08);align-self:flex-end}
    .bot{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
    .starter{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 16px 8px}
    .chip{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:${C_TEXT};padding:8px 10px;border-radius:999px;font-size:12px;text-align:center;cursor:pointer}
    .inputBar{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.08);background:${C_SURFACE}}
    .field{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:${C_TEXT};border-radius:10px;padding:10px 12px;font-size:14px}
    .send{padding:10px 14px;border-radius:10px;background:${C_PRIMARY};color:#111;font-weight:700}
    .footer{padding:8px 12px;font-size:11px;text-align:center;opacity:.7}
    .link{color:${C_ACCENT};text-decoration:none}
    .typing{font-size:12px;opacity:.7;padding:0 16px 8px}
  `;
  root.appendChild(style);

  const fab = document.createElement('button');
  fab.className = 'btn fab';
  fab.setAttribute('aria-label', 'Open CRE360 chat');
  fab.textContent = '✦';

  const panel = document.createElement('section'); panel.className = 'panel';
  const header = document.createElement('div'); header.className = 'header';
  header.innerHTML = `<div class="badge">C</div><div><div class="title">${BOT_NAME}</div><div class="subtitle">Here’s the deal — ask me something specific.</div></div>`;

  const starterWrap = document.createElement('div'); starterWrap.className = 'starter';
  STARTERS.slice(0,4).forEach(s => { const chip=document.createElement('button'); chip.className='chip btn'; chip.textContent=s.label; chip.addEventListener('click',()=>{input.value=s.text; input.focus();}); starterWrap.appendChild(chip); });

  const typing = document.createElement('div'); typing.className='typing'; typing.style.display='none'; typing.textContent='CRE360 Assistant is typing…';
  const msgs = document.createElement('div'); msgs.className='messages';
  const inputBar = document.createElement('div'); inputBar.className='inputBar';
  const input = document.createElement('input'); input.className='field'; input.placeholder='Type your question…';
  const send = document.createElement('button'); send.className='btn send'; send.textContent='Send';
  inputBar.appendChild(input); inputBar.appendChild(send);

  const footer = document.createElement('div'); footer.className='footer';
  footer.innerHTML = `Powered by <a class="link" href="https://cre360.ai" target="_blank" rel="noopener">CRE360</a>`;

  panel.appendChild(header); panel.appendChild(starterWrap); panel.appendChild(typing);
  panel.appendChild(msgs); panel.appendChild(inputBar); panel.appendChild(footer);
  root.appendChild(fab); root.appendChild(panel);

  fab.addEventListener('click', () => panel.classList.toggle('open'));
  function bubble(text, who='bot'){ const el=document.createElement('div'); el.className=`bubble ${who==='user'?'user':'bot'}`; el.textContent=text; msgs.appendChild(el); msgs.scrollTop=msgs.scrollHeight; return el; }
  function setTyping(v){ typing.style.display = v ? 'block' : 'none'; }

  async function ask(question){
    if(!question) return;
    bubble(question,'user'); input.value=''; setTyping(true);
    const botEl=bubble('','bot');
    try{
      const resp = await fetch(`${API_BASE}${ENDPOINT}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message: question }) });
      if(!resp.ok || !resp.body){ botEl.textContent='Sorry—service is busy. Try again.'; setTyping(false); return; }
      const reader = resp.body.getReader(); const decoder = new TextDecoder();
      while(true){ const {value, done} = await reader.read(); if(done) break; botEl.textContent += decoder.decode(value, {stream:true}); msgs.scrollTop=msgs.scrollHeight; }
    }catch{ botEl.textContent='Network error. Please retry.'; } finally { setTyping(false); }
  }
  send.addEventListener('click', ()=>ask(input.value.trim()));
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') ask(input.value.trim()); });

  bubble(`Welcome to ${BOT_NAME}. Ask about underwriting, extended-stay strategy, or today’s Signal.`);
})();
