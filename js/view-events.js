function viewEvents(){
  const evs=(state.sentinel.calendarEvents||[]).filter(e=>!gameSrc(e)).map(e=>({...e,days:daysBetween(TODAY,e.date)})).filter(e=>e.days>=0&&e.days<=180);
  const sps=(state.sentinel.sponsors||[]).filter(s=>s.due).map(s=>({id:"sp"+s.id,title:"💼 "+(s.brand||s.name||"Sponsor")+" deliverable",date:s.due,days:daysBetween(TODAY,s.due),sponsor:true})).filter(s=>s.days>=-7&&s.days<=180);
  const all=[...evs,...sps].sort((a,b)=>a.days-b.days);
  const row=e=>{ const urgent=(e.sponsor&&e.days<=0)||(!!e.important&&e.days<=0);
    return `<div class="listrow"><span class="grow" style="font-size:13px">${esc(e.title)}</span>${evTierChip(e.days,urgent,fmtDate(e.date))}</div>`; };
  const groups=[["🌸 Today & tomorrow",e=>e.days<=1],["💙 This week",e=>e.days>1&&e.days<=7],["💜 This month",e=>e.days>7&&e.days<=30],["🩶 Later",e=>e.days>30]];
  // ── birthdays, one month at a time — the list stays calm as the circle grows ──
  const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const curM=new Date(TODAY+"T00:00").getMonth()+1;
  const selM=state.evBdayMonth||curM;
  const monthBdays=(state.sentinel.birthdays||[]).filter(b=>Number(b.month)===selM)
    .map(b=>({...b,...nextBirthdayInfo(b)})).sort((a,b)=>Number(a.day)-Number(b.day));
  const bdayRows=monthBdays.length?monthBdays.map(b=>`<div class="agenda-row"><span class="agenda-when">${MONTHS[selM-1]} ${b.day}</span><span class="agenda-dot" style="background:var(--lav)"></span><span class="grow">🎂 ${esc(b.name)} <span class="soft" style="font-size:11px">· ${whenLabel(b.days)}</span></span><button class="x" data-act="delBirthday" data-v="${b.id}" title="remove">✕</button></div>`).join(""):`<p class="soft" style="font-size:12.5px;margin:6px 0 0">No birthdays in ${MONTHS[selM-1]} yet — add one below. 🎂</p>`;
  const monthChips=MONTHS.map((m,i)=>`<button class="chiptog ${selM===i+1?'on':''}" data-act="evBdayMonth" data-v="${i+1}">${m}${i+1===curM?' ·':''}</button>`).join("");
  return `<div class="page">
    <section class="panel"><div class="card-head"><h2 style="font-size:18px">🎉 Events &amp; birthdays</h2></div>
      <p class="soft" style="font-size:12px;margin:0">Your one place for the people and plans that matter. Add events by tapping a day on the 📅 Calendar; birthdays live right here. 🌸</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
        <span class="pill tier-today">Today</span><span class="pill tier-tmrw">Tomorrow</span><span class="pill tier-week">This Week</span><span class="pill tier-month">This Month</span><span class="pill tier-later">Later</span><span class="pill tier-urgent">Urgent — real deadlines only</span>
      </div></section>
    <section class="panel"><div class="card-head"><h2 style="font-size:17px">📌 Coming up</h2></div>
      ${all.length?groups.map(([t,f])=>{const L2=all.filter(f); return L2.length?`<div class="label" style="margin:8px 0 4px">${t}</div>${L2.map(row).join("")}`:"";}).join(""):`<p class="soft" style="font-size:12.5px;margin:0">Nothing on the horizon — add a con, a collab, or a trip on the Calendar and it shows up here. ❄️</p>`}
    </section>
    <section class="panel">
      <div class="card-head"><h2 style="font-size:17px">🎂 Birthdays</h2></div>
      <p class="soft" style="font-size:12px;margin:0 0 8px">Pick a month to see just those people — the list stays calm as your circle grows. 💗</p>
      <div class="chiprow" style="margin-bottom:10px">${monthChips}</div>
      ${bdayRows}
      <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">
        <input class="inp" id="bdayName" placeholder="name" style="flex:1;min-width:90px">
        <input class="inp" id="bdayDate" type="date" style="max-width:150px">
        <button class="btn btn-grad" data-act="addBirthday">+ add</button>
      </div>
    </section>
    ${cardEventPrep()}
  </div>`;
}

/* (the AI "daily briefing" card was replaced 2026-06-12 by the deterministic glance — per Mifu's notes,
   every home observation must be explainable from check-ins and stored data; no generated guesses) */
/* ===== Event prep assistant — never arrive unprepared (lives on the Events page) ===== */
const PREP_TEMPLATE=["Hotel booked","Ticket booked","Travel booked","Merch ordered","Business cards ready"];

function nextBigEvent(){
  const evs=(state.sentinel.calendarEvents||[]).filter(e=>!gameSrc(e)).map(e=>({...e,days:daysBetween(TODAY,e.date)}))
    .filter(e=>e.days>=0&&e.days<=180).sort((a,b)=>a.days-b.days);
  const withList=evs.find(e=>((state.sentinel.eventPrep||{})[e.id]||{}).items&&(state.sentinel.eventPrep||{})[e.id].items.length);
  return withList||evs.find(e=>e.days>=7)||evs[0]||null;
}

function cardEventPrep(){
  const ev=nextBigEvent();
  if(!ev) return `<section class="panel"><div class="label" style="margin-bottom:6px">🧳 Event prep</div><p class="soft" style="font-size:12px">No upcoming events to prep — when something lands on the calendar (a con, a collab, a trip), the checklist appears here. ❄️</p></section>`;
  const prep=((state.sentinel.eventPrep||{})[ev.id])||{items:[]};
  const items=prep.items||[];
  const doneN=items.filter(i=>i.done).length;
  return `<section class="panel">
    <div class="card-head"><span class="label">🧳 ${esc(ev.title)}</span><span class="pill pill-lav">${ev.days===0?"today!":ev.days===1?"tomorrow":"in "+ev.days+"d"}</span></div>
    ${items.length?`<div style="margin-bottom:6px">${items.map(i=>`<div class="listrow"><button class="x" data-act="prepToggle" data-kind="event" data-key="${esc(ev.id)}" data-v="${i.id}" style="font-size:16px;color:${i.done?'var(--mint,#2f9d79)':'var(--muted)'}">${i.done?'●':'○'}</button><span class="grow ${i.done?'soft':''}" style="font-size:12.5px;${i.done?'text-decoration:line-through':''}">${esc(i.text)}</span><button class="x" data-act="prepDel" data-kind="event" data-key="${esc(ev.id)}" data-v="${i.id}">✕</button></div>`).join("")}<p class="soft" style="font-size:10.5px;margin-top:4px">${doneN}/${items.length} sorted ✨</p></div>`
      :`<p class="soft" style="font-size:12px;margin:0 0 6px">Nothing to forget yet — add what needs doing, or tap a suggestion:</p>`}
    <div class="chiprow" style="margin-bottom:8px">${PREP_TEMPLATE.filter(t=>!items.some(i=>i.text===t)).map(t=>`<button class="chiptog" data-act="prepAddChip" data-kind="event" data-key="${esc(ev.id)}" data-t="${esc(t)}"><span>＋</span>${esc(t)}</button>`).join("")}</div>
    <div style="display:flex;gap:6px"><input class="inp" id="prepInput_${esc(ev.id)}" placeholder="add a prep item…"><button class="btn" data-act="prepAdd" data-kind="event" data-key="${esc(ev.id)}">add</button></div>
  </section>`;
}
