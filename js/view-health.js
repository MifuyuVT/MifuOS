/* combined Health tab — PCOS on the left, Mounjaro on the right (stacks on narrow screens) */
function viewDailyCheckin(){
  const m=state.today.mind||{}, mj=state.today.mounjaro||{}, p=state.today.pcos||{};
  const w40=water40();
  return `
  <section class="panel">
    <div class="card-head"><div class="label">📊 How's today?</div><button class="btn" data-act="healthReport" title="30-day summary for your doctor">📋 Doctor report</button></div>
    <p class="soft" style="font-size:11px;margin:0 0 12px">Everything in one place — fill this once. &nbsp;0 = rough / bad · 5 = great / none 💗</p>

    <div class="label" style="margin-bottom:6px;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Wellbeing</div>
    ${scaleRow("Energy","mindSet","energy",m.energy,"depleted","full")}
    ${scaleRow("Mood","mindSet","mood",m.mood,"low","bright")}
    ${scaleRow("Anxiety / calm","mindSet","anxiety",m.anxiety,"stressed","calm")}

    <div class="label" style="margin:14px 0 6px;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Symptoms</div>
    ${scaleRow("Nausea","mjSet","nausea",mj.nausea,"rough","fine")}
    ${scaleRow("Bloating","mjSet","belly",mj.belly,"severe","none")}
    ${scaleRow("Fatigue / heaviness","mjSet","fatigue",mj.fatigue,"heavy","none")}
    ${scaleRow("Food noise / cravings","mjSet","foodnoise",mj.foodnoise,"loud","quiet")}
    ${scaleRow("Constipation","mjSet","constipation",mj.constipation,"severe","none")}
    ${scaleRow("Diarrhea","mjSet","diarrhea",mj.diarrhea,"severe","none")}
    ${scaleRow("Reflux / heartburn","mjSet","reflux",mj.reflux,"severe","none")}
    ${scaleRow("Acne flare","pcosSet","acne",p.acne,"severe","clear")}
    ${scaleRow("Scalp hair shedding","pcosSet","shedding",p.shedding,"heavy","none")}

    <div class="label" style="margin:14px 0 6px;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Basics</div>
    <div class="field"><div class="label">Water today <span class="soft" style="text-transform:none;letter-spacing:0;font-weight:500">· goal 2–3 × 40oz</span></div>
      <div class="hcount"><button class="step" data-act="waterCup" data-v="-1">−</button><span>${w40%1?w40.toFixed(1):w40}</span><button class="step" data-act="waterCup" data-v="1">＋</button><span class="soft" style="font-size:12px;font-family:var(--sans)">× 40oz 🥤</span></div></div>
    <div class="field"><div class="label">Sleep last night</div>
      <div class="hcount"><button class="step" data-act="sleepStep" data-v="-1">−</button><span>${(state.today.sleep!=null?state.today.sleep:0)}</span><button class="step" data-act="sleepStep" data-v="1">＋</button><span class="soft" style="font-size:12px;font-family:var(--sans)">hrs 🌙</span></div></div>

    <div class="label" style="margin:14px 0 6px;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Gentle habits</div>
    <p class="soft" style="font-size:11px;margin:0 0 8px">No targets to fail — just a soft tally. 🌱</p>
    <div class="chiprow">
      ${chiptog("Moved my body","pcosToggle","moved",p.moved)}
      ${chiptog("Balanced meals","pcosToggle","balanced",p.balanced)}
      ${chiptog("Protein with meals","pcosToggle","protein",p.protein)}
      ${chiptog("Eased sugar spikes","pcosToggle","lowsugar",p.lowsugar)}
      ${chiptog("Smaller meals","mjToggle","smallerMeals",mj.smallerMeals)}
      ${chiptog("Fiber / veggies","mjToggle","fiber",mj.fiber)}
    </div>
  </section>`;
}

function viewHealth(){
  const p=state.today.pcos||{}, cyc=state.sentinel.cycle||{};
  const cur=currentDose();
  const log=(state.sentinel.injectionLog||[]).slice().reverse();
  const doses=CONFIG.mounjaro.doses, sites=CONFIG.mounjaro.sites;
  const unit=CONFIG.weightUnit||"kg";
  const wl=(state.sentinel.weightLog||[]).filter(x=>x&&x.w!=null).slice().sort(cmpDate);
  const firstShot=(state.sentinel.injectionLog||[]).slice().sort(cmpDate)[0];
  const journeyStart=firstShot?firstShot.date:(wl[0]?wl[0].date:null);
  const weeksOnMj=journeyStart?Math.floor(daysBetween(journeyStart,TODAY)/7):0;
  let startW=null; if(wl.length){ const after=wl.find(x=>!journeyStart||x.date>=journeyStart); startW=(after||wl[0]).w; }
  const nowW=wl.length?wl[wl.length-1].w:null;
  const lost=(startW!=null&&nowW!=null)?-(nowW-startW):null;
  const lostStr=lost==null?"—":(Math.abs(lost)<0.05?"±0":(lost>0?"↓ ":"↑ ")+Math.abs(lost).toFixed(1)+" "+unit);
  const lostColor=lost==null?"var(--ink)":(lost>0?"#3a9d83":(lost<-0.05?"var(--sakura-deep)":"var(--ink))"));
  const trendNote=lost==null?`Log a weight or two and your progress since starting will show here. ⚖️`:`Since starting${journeyStart?` ~${weeksOnMj} week${weeksOnMj===1?'':'s'} ago`:''}: ${startW} → ${nowW} ${unit}. Every direction is data, not a verdict — be kind to yourself. ❄️`;
  const st=cycleStats(cyc);
  const dx=cyc.lastStart?daysBetween(cyc.lastStart,TODAY):null;
  const months=dx!=null?dx/30.44:null;
  const longGap=dx!=null&&dx>=45;
  return `<div class="page">
  ${viewDailyCheckin()}

  <details class="acc"><summary>💉 Mounjaro journey</summary><div class="acc-body">
    <div class="soft-card" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
      <div><div class="label">Current dose</div><div class="bignum">${cur?cur.dose:'—'} mg</div></div>
      <div><div class="label">Weight so far</div><div class="bignum" style="color:${lostColor}">${lostStr}</div></div>
      <div class="grow" style="min-width:160px"><p class="soft" style="font-size:11.5px;margin:0">${trendNote}</p></div>
    </div>
    <div class="label" style="margin-bottom:6px">💉 Log this week's shot</div>
    <p class="soft" style="font-size:12px;margin:0 0 10px">${siteHint()}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="field"><div class="label">Date</div><input class="inp" type="date" id="shotDate" value="${TODAY}"></div>
      <div class="field"><div class="label">Time</div><input class="inp" type="time" id="shotTime" value="20:00"></div>
    </div>
    <div class="field"><div class="label">Dose (mg)</div><select class="inp" id="shotDose">${doses.map(d=>`<option value="${d}" ${cur&&cur.dose===d?'selected':''}>${d} mg</option>`).join("")}</select></div>
    <div class="field"><div class="label">Injection site (rotate!)</div><div class="chiprow" id="siteRow">
      ${sites.map(s2=>`<button class="sitebtn" data-act="pickSite" data-v="${esc(s2)}">${esc(s2)}</button>`).join("")}</div>
      <input type="hidden" id="shotSite" value=""></div>
    <div class="field" id="afterField"><div class="label">~30 min after — how do you feel?</div>
      <div class="scale">${[0,1,2,3,4,5].map(i=>`<button data-act="mjAfter" data-v="${i}">${i}</button>`).join("")}</div>
      <div class="scale-ends"><span>rough</span><span>fine</span></div></div>
    <div class="field"><div class="label">Note (optional)</div><input class="inp" type="text" id="shotNote" placeholder="how it went…"></div>
    <button class="btn btn-grad" data-act="logShot">Log shot ❄️</button>
    <div class="label" style="margin:14px 0 6px">📜 Injection history</div>
    ${log.length?log.map(s2=>`<div class="listrow"><div><b>${fmtDate(s2.date)}</b> ${s2.time?`<span class="soft">· ${esc(s2.time)}</span>`:''}
      <div class="soft" style="font-size:11.5px">${s2.dose} mg · ${esc(s2.site||'—')}${s2.after!=null?` · after ${s2.after}/5`:''}${s2.note?` · ${esc(s2.note)}`:''}</div></div>
      <span class="grow"></span><button class="x" data-act="delShot" data-v="${s2.id}">✕</button></div>`).join("")
      :`<p class="soft" style="font-size:12.5px">No shots logged yet — your first one starts the rotation helper. 🦊</p>`}
    <details style="margin-top:14px"><summary class="soft" style="font-size:12px;cursor:pointer">🩺 When to check in with your doctor</summary>
      <p class="soft" style="font-size:12px;margin:8px 0 4px">Most tummy stuff settles. Gentle reasons to call your care team — a reminder, never a diagnosis:</p>
      <ul style="font-size:12px;color:var(--ink-soft);padding-left:18px">
        <li>Severe stomach pain radiating to your back</li><li>Relentless vomiting or signs of dehydration</li>
        <li>Gallbladder-type pain (upper-right belly), fever, or yellowing skin/eyes</li><li>Anything that simply feels wrong</li>
      </ul>
    </details>
  </div></details>

  <details class="acc"><summary>🌙 Cycle tracker</summary><div class="acc-body">
    <div class="soft-card">
      ${cyc.lastStart
        ?`<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="bignum">Day ${dx}</span><span class="soft" style="font-size:12px">since your last period started (${fmtDate(cyc.lastStart)})${months>=1.5?` · ~${months.toFixed(1)} months`:''}</span></div>`
        :`<p class="soft" style="font-size:12.5px;margin:0">No period logged yet — log a start whenever you need to. ❄️</p>`}
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-grad" data-act="cycleStart">Log period start</button>
        <button class="btn" data-act="cycleEnd">Log period end</button>
      </div>
      <div class="field"><div class="label">Flow today (optional)</div><div class="chiprow">
        ${["light","med","heavy"].map(f=>`<button class="sitebtn ${state.today.flow===f?'on':''}" data-act="pcosSet" data-f="flow" data-v="${f}">${f}</button>`).join("")}</div></div>
      ${st.count?`<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:4px">
          <div><div class="label">Logged</div><div style="font-weight:700">${st.count} period${st.count===1?'':'s'}</div></div>
          ${st.avgGap?`<div><div class="label">Avg cycle</div><div style="font-weight:700">~${st.avgGap}d</div></div>`:''}
          ${st.gaps&&st.gaps.length>1?`<div><div class="label">Range</div><div style="font-weight:700">${st.minGap}–${st.maxGap}d</div></div>`:''}
          ${st.avgLen?`<div><div class="label">Avg length</div><div style="font-weight:700">~${st.avgLen}d</div></div>`:''}
        </div>`:''}
      <p class="soft" style="font-size:11px;margin-top:8px">Cycles vary a lot with PCOS — long or skipped months are common, and that's okay. 🦊</p>
      ${longGap?`<div class="disc" style="margin-top:8px">${CONFIG.creator.snow}<span>It's been ${months>=2?`about ${Math.round(months)} months`:'a longer stretch'} since your last period — worth a gentle mention to your doctor next time. No alarm, just a note. 🦊</span></div>`:''}
      ${st.count?`<details style="margin-top:8px;border:none;background:transparent;padding:0;box-shadow:none"><summary style="font-size:12px">📜 Period history (${st.count}) · tap ✕ to remove a mistaken log</summary>
        <div style="margin-top:6px">${st.h.slice().reverse().map(x=>`<div class="listrow"><span class="grow" style="font-size:12px">${fmtDate(x.start)}${x.end?` – ${fmtDate(x.end)}`:''} ${x.flow?`<span class="soft">· ${esc(x.flow)}</span>`:''}</span>${x.gap!=null?`<span class="soft" style="font-size:11px">+${x.gap}d</span>`:''}<button class="x" data-act="delPeriod" data-start="${esc(x.start)}" data-end="${esc(x.end||'')}" title="remove">✕</button></div>`).join("")}</div></details>`:''}
    </div>
  </div></details>

  <details class="acc"><summary>💗 Notes &amp; extras</summary><div class="acc-body">
    <div class="label" style="margin-bottom:6px">What helps me feel better</div>
    <textarea class="inp" id="helpsNote" placeholder="things that make a rough health day softer…" style="min-height:80px">${esc(state.sentinel.helps||"")}</textarea>
    <div style="margin-top:8px;margin-bottom:14px"><button class="btn btn-grad" data-act="saveHelps">Save</button></div>
    ${scaleRow("Unwanted hair / hirsutism (check in weekly)","pcosSet","hirsutism",p.hirsutism,"none","heavy")}
  </div></details>

  ${DISCLAIMER}</div>`;
}

function siteHint(){
  const last=(state.sentinel.injectionLog||[]).slice(-1)[0]; if(!last) return "Pick any site to start your rotation.";
  const sites=CONFIG.mounjaro.sites; const i=sites.indexOf(last.site);
  const sug=sites[(i+1+Math.floor(sites.length/2))%sites.length];
  return `Last site: <b>${esc(last.site)}</b> → maybe try <b>${esc(sug)}</b> this week (rotating spots helps absorption &amp; avoids lumps).`;
}
