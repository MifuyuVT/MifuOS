/* ===================== CONFIG (everything here is yours to change) ===== */
const APP_BUILD="2026-06-20.betterDrama";


/* ===================== SETTINGS ===================== */
function viewSettings(){
  const meds=state.sentinel.medsList||[];
  return `<div class="page">
  <section class="panel">
    <div class="card-head"><div class="label">🗄️ Backup &amp; restore</div></div>
    <p class="soft" style="font-size:12.5px;margin:0 0 12px">Export downloads a full copy of all your data as a JSON file. Restore imports it back — useful if data is ever lost or you switch devices. <b>Export regularly and keep it somewhere safe.</b></p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <button id="exportBtn" class="btn btn-grad" data-act="exportBackup">⬇️ Export all data</button>
      <label class="btn" style="cursor:pointer;display:inline-flex;align-items:center;gap:5px">📂 Restore from file<input type="file" accept=".json" style="display:none" data-act-change="restoreFromBackupInput"></label>
    </div>
    <p id="backupMsg" style="font-size:12px;margin:8px 0 0;min-height:16px;color:var(--lav-deep)"></p>
    <p id="restoreMsg" style="font-size:12px;margin:4px 0 0;min-height:16px;color:var(--lav-deep)"></p>
  </section>
  <section class="panel">
    <div class="card-head"><div class="label">⚙️ Comfort &amp; display</div><span class="chip" title="if something seems broken, check this matches the newest build first">build ${APP_BUILD}</span></div>
    <p class="soft" style="font-size:12px;margin:0 0 10px">However today needs to feel. Saved on this device.</p>
    <div class="chiprow">
      ${chiptog("Calm mode (less motion, softer colours)","pref","calm",PREF.calm)}
      ${chiptog("Focus mode (Home shows only today)","pref","focus",PREF.focus)}
    </div>
    <div class="field" style="margin-top:14px">
      <div class="label" style="display:flex;justify-content:space-between;align-items:center">🔠 Text size <span class="soft" id="textSizeVal" style="font-size:12px">${PREF.textSize}px</span></div>
      <input type="range" id="textSizeSlider" min="${TEXT_MIN}" max="${TEXT_MAX}" step="1" value="${PREF.textSize}" data-act-input="setTextSize" style="width:100%;margin-top:6px;accent-color:var(--sakura)">
      <p class="soft" style="font-size:11px;margin:6px 0 0">Slide to taste — bigger or smaller. Saved on this device, stays put every time you open the app. 💗</p>
    </div>
  </section>

  <section class="panel">
    <div class="label" style="margin-bottom:8px">💊 Meds &amp; supplements</div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Tick these off daily on the Food tab. Add a refill date and Kiko will gently remind you before you run low.</p>
    ${meds.length?meds.map(m=>{ const days=m.refill?daysBetween(TODAY,m.refill):null;
      return `<div class="listrow"><span class="grow"><b>${esc(m.name)}</b> <span class="soft" style="font-size:11.5px">${esc(m.dose||'')} ${m.time?'· '+esc(m.time):''}</span>${m.refill?` <span class="pill ${days!=null&&days<=7?'':'pill-gray'}" style="font-size:9px;${days!=null&&days<=7?'background:#fdebd9;color:#b4764a':''}">refill ${fmtDate(m.refill)}</span>`:''}</span><label class="btn" style="padding:3px 8px;cursor:pointer" title="set refill date">📅<input type="date" data-medrefill="${m.id}" value="${m.refill||''}" style="display:none"></label><button class="x" data-act="delMed" data-v="${m.id}">✕</button></div>`; }).join("")
      :`<p class="soft" style="font-size:12.5px">No meds added yet.</p>`}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
      <input class="inp" id="medName" placeholder="name (e.g. Metformin)">
      <input class="inp" id="medDose" placeholder="dose (e.g. 500 mg)"></div>
    <div style="display:flex;gap:8px;margin-top:8px"><input class="inp" id="medTime" placeholder="when (e.g. morning)" style="max-width:200px"><button class="btn btn-grad" data-act="addMed">Add med</button></div>
  </section>

  <section class="panel">
    <div class="label" style="margin-bottom:8px">📝 Your details</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="field"><div class="label">Name</div><input class="inp" id="cfgName" value="${esc(CONFIG.creator.name)}"></div>
      <div class="field"><div class="label">Greeting</div><input class="inp" id="cfgGreet" value="${esc(CONFIG.creator.greeting)}"></div>
    </div>
    <div class="field"><div class="label">Weight unit</div><select class="inp" id="cfgUnit"><option ${CONFIG.weightUnit==='kg'?'selected':''}>kg</option><option ${CONFIG.weightUnit==='lb'?'selected':''}>lb</option></select></div>
    <div class="field"><div class="label">Weight display</div><select class="inp" id="cfgWdisp">
      <option value="soft" ${CONFIG.weightDisplay==='soft'?'selected':''}>Soft / trend-first</option>
      <option value="numbers" ${CONFIG.weightDisplay==='numbers'?'selected':''}>Numbers visible</option>
      <option value="hidden" ${CONFIG.weightDisplay==='hidden'?'selected':''}>Hide numbers by default</option></select></div>
    <button class="btn btn-grad" data-act="saveCfg">Save details</button>
    <p class="soft" style="font-size:11px;margin-top:8px">Saved to your database — these stick across reloads and devices. ❄️</p>
  </section>

  <section class="panel">
    <div class="label" style="margin-bottom:8px">🎨 Palette</div>
    <div class="chiprow">${Object.entries(CONFIG.palette).map(([k,v])=>`<div title="${k}: ${v}" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:${v}"></div>`).join("")}</div>
    <p class="soft" style="font-size:11px;margin-top:8px">Snowfox winter: periwinkle → sakura, with lavender &amp; ice. ❄️🌸</p>
  </section>

  <section class="panel">
    <div class="label" style="margin-bottom:8px">💾 Your data</div>
    <p class="soft" style="font-size:12px;margin:0 0 8px">It's yours. Back it up anytime.</p>
    <button class="btn btn-grad" data-act="export">Export all my data (JSON)</button>
    <button class="btn" data-act="logout" style="margin-top:8px">🔒 Log out</button>
    <details class="acc" style="margin-top:12px"><summary>🔒 Privacy upgrade (optional)</summary><div class="acc-body">
      <p class="soft" style="font-size:12px">Right now this is a private, single-user app. When you're ready, you can lock it behind Supabase Auth so only you can open it — an option, never a requirement. The included <b>setup.sql</b> notes where to tighten the row-level security policy. ❄️</p></div></details>
    <p class="soft" style="font-size:11px;margin-top:10px">${DEMO?'Running in <b>demo mode</b> — seeded sample data; changes preview this session but are not saved to a backend.':(SB?'Connected to Supabase ✓ — your entries are saving.':'Connecting to Supabase…')}</p>
  </section>

  <section class="panel">
    <div class="card-head"><div class="label">💌 Wishlist for Eggie</div><span class="pill pill-gray">${(state.sentinel.eggieRequests||[]).filter(r=>r.status!=="done").length} open</span></div>
    <p class="soft" style="font-size:12px;margin:0 0 8px">Want something new or different in your OS? Just tell Kiko — <b>"note for Eggie: …"</b> — and it lands here for Eggie to pick up and build. 💗</p>
    ${(state.sentinel.eggieRequests||[]).slice().reverse().map(r=>`<div class="listrow"><span class="grow" style="font-size:12.5px">${esc(r.text)} <span class="soft" style="font-size:10.5px">· ${fmtDate(r.date)}${r.tab?" · from "+esc(r.tab):""}</span></span><span class="pill ${r.status==="done"?"pill-mint":"pill-lav"}">${r.status==="done"?"done ✓":"noted"}</span><button class="x" data-act="delEggieReq" data-v="${r.id}">✕</button></div>`).join("")||'<p class="soft" style="font-size:12px">Nothing yet — wish away ✨</p>'}
    ${(state.sentinel.eggieRequests||[]).length?`<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn" data-act="copyEggieReqs">📋 copy the list for Eggie</button><button class="btn" data-act="clearEggieReqs" title="Eggie's actioned these — clear the list to start fresh">🧹 clear actioned notes</button></div>`:''}
  </section>

  <section class="panel">
    <div class="label" style="margin-bottom:8px">📅 Calendar</div>
    <p class="soft" style="font-size:12px;margin:0 0 8px">Colour for the auto game-update events (refreshed every Friday).</p>
    <div class="chiprow">${["#f6cba9","#9fc7f0","#c9b8f0","#a9e0cb","#ff9ed8","#b8d4f0","#d8c7a0"].map(c=>`<button class="cal-swatch" data-act="setGameColor" data-v="${c}" style="background:${c};border:2px solid ${(state.sentinel.gameColor||'#f6cba9')===c?'var(--ink)':'transparent'}"></button>`).join("")}</div>
  </section>
  ${DISCLAIMER}</div>`;
}
