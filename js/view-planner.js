/* ===== Birthday assistant — remember people without another system ===== */
function cardBirthdayPrep(){
  const bd=(state.sentinel.birthdays||[]).map(b=>({...b,...nextBirthdayInfo(b)})).sort((a,b)=>a.days-b.days)[0];
  if(!bd||bd.days>30) return `<section class="panel"><div class="label" style="margin-bottom:6px">🎂 Birthday assistant</div><p class="soft" style="font-size:12px">${bd?`Next up: ${esc(bd.name)} in ${bd.days} days — I'll set this up closer to the date. ❄️`:"Add birthdays on the 🎉 Events tab and I'll help you remember the people who matter. 💗"}</p></section>`;
  const key=bd.id+"-"+bd.date.slice(0,4);
  const prep=((state.sentinel.bdayPrep||{})[key])||{items:[],skipped:false};
  if(prep.skipped) return `<section class="panel"><div class="label" style="margin-bottom:6px">🎂 Birthday assistant</div><p class="soft" style="font-size:12px">${esc(bd.name)}'s birthday — skipped this year, no guilt. 💗</p></section>`;
  const SUG=["Send a message","Buy a gift","Commission artwork"];
  const items=prep.items||[];
  return `<section class="panel">
    <div class="card-head"><span class="label">🎂 ${esc(bd.name)}'s birthday</span><span class="pill pill-sak">${bd.days===0?"today!":bd.days===1?"tomorrow":"in "+bd.days+"d"}</span></div>
    ${items.length?`<div style="margin-bottom:6px">${items.map(i=>`<div class="listrow"><button class="x" data-act="prepToggle" data-kind="bday" data-key="${esc(key)}" data-v="${i.id}" style="font-size:16px;color:${i.done?'var(--mint,#2f9d79)':'var(--muted)'}">${i.done?'●':'○'}</button><span class="grow ${i.done?'soft':''}" style="font-size:12.5px;${i.done?'text-decoration:line-through':''}">${esc(i.text)}</span><button class="x" data-act="prepDel" data-kind="bday" data-key="${esc(key)}" data-v="${i.id}">✕</button></div>`).join("")}</div>`:""}
    <div class="chiprow" style="margin-bottom:8px">${SUG.filter(t=>!items.some(i=>i.text===t)).map(t=>`<button class="chiptog" data-act="prepAddChip" data-kind="bday" data-key="${esc(key)}" data-t="${esc(t)}"><span>＋</span>${esc(t)}</button>`).join("")}<button class="chiptog" data-act="bdaySkip" data-key="${esc(key)}" title="totally allowed"><span>🌙</span>Skip this year</button></div>
    <div style="display:flex;gap:6px"><input class="inp" id="prepInput_${esc(key)}" placeholder="add your own…"><button class="btn" data-act="prepAdd" data-kind="bday" data-key="${esc(key)}">add</button></div>
  </section>`;
}

function energyMeta(s){ return TASK_ENERGY.find(x=>x[0]===normEnergy(s))||TASK_ENERGY[1]; }

function duePill(t){
  if(!t.due)return "";
  const diff=Math.ceil((new Date(t.due+"T00:00")-new Date(TODAY+"T00:00"))/86400000);
  if(t.done)return `<span class="pill pill-gray">📅 ${esc(t.due.slice(5))}</span>`;          // done = calm gray, no shaming
  if(diff<0)return `<span class="pill" style="background:#fde4e4;color:#c0566a">📅 ${-diff}d late</span>`;
  if(diff===0)return `<span class="pill" style="background:#fdebd9;color:#b4764a">📅 today</span>`;
  if(diff<=3)return `<span class="pill" style="background:#fdebd9;color:#b4764a">📅 ${diff===1?"tomorrow":"in "+diff+"d"}</span>`;
  return `<span class="pill pill-gray">📅 ${esc(t.due.slice(5))}</span>`;
}

function remBellBtn(t,R){ return `<button class="x" data-act="taskRem" data-v="${t.id}" title="due date & reminder" style="font-size:13px;${R?'color:var(--peri-deep)':'color:var(--muted)'}">⏰${R&&R.time?`<span style="font-size:9px">${fmt12(R.time)}</span>`:''}</button>`; }

function viewPlanner(){
  const tasks=(state.sentinel.tasks||[]);
  const today=TODAY;
  const tomorrow=(()=>{ const d=new Date(today+"T00:00"); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })();
  const wkEnd=(()=>{ const d=new Date(today+"T00:00"); d.setDate(d.getDate()+6); return d.toISOString().slice(0,10); })();
  const el=state.energyLevel||"medium";
  const showAll=!!state.plnShowAll;
  const doneAll=tasks.filter(t=>t.done);
  const doneToday=doneAll.filter(t=>t.completedAt===today);
  const open=tasks.filter(t=>!t.done);
  const seen=new Set();
  const grab=(fn)=>{ const r=open.filter(t=>!seen.has(t.id)&&fn(t)); r.forEach(t=>seen.add(t.id)); return r; };
  const priOrder={urgent:0,high:1,medium:2,low:3};
  const urgencySort=(a,b)=>(priOrder[a.priority||"medium"]||2)-(priOrder[b.priority||"medium"]||2);
  const overdue=grab(t=>t.due&&t.due<today).sort(urgencySort);
  const dueToday=grab(t=>t.due===today).sort(urgencySort);
  const dueWeek=grab(t=>t.due&&t.due>=tomorrow&&t.due<=wkEnd).sort(urgencySort);
  const urgentRest=grab(t=>(t.priority||"medium")==="urgent");
  const matchesEnergy=t=>{ const te=normEnergy(t.energy||t.spoon); if(showAll)return true; if(el==="low")return te==="low"; if(el==="medium")return te==="low"||te==="medium"; return true; };
  const energyMatched=grab(t=>matchesEnergy(t));
  const later=grab(()=>true);
  const urgentCount=open.filter(t=>(t.priority||"medium")==="urgent").length;
  const dueTodayCount=open.filter(t=>t.due===today).length;
  const dueWeekCount=open.filter(t=>t.due&&t.due>=tomorrow&&t.due<=wkEnd).length;

  function plnTaskRow(t){
    const pri=t.priority||"medium"; const em2=energyMeta(t.energy||t.spoon);
    const bm=TASK_BUCKETS.find(b=>b[0]===t.bucket)||TASK_BUCKETS[0]; const R=remByTask()[t.id];
    const subLeft=(t.sub||[]).filter(s=>!s.done).length;
    const priBadge=pri==="urgent"?`<span class="pln-badge pri-urgent">🔥 urgent</span>`:pri==="high"?`<span class="pln-badge pri-high">↑ high</span>`:pri==="low"?`<span class="pln-badge pri-low">↓ low</span>`:"";
    return `<div class="pln-row">
      <button class="x" data-act="toggleTask" data-v="${t.id}" style="color:${t.done?"var(--mint)":"var(--muted)"};font-size:16px;flex-shrink:0;padding-top:2px">${t.done?"●":"○"}</button>
      <div class="pln-row-body">
        <div class="pln-rt${t.done?" done-text":""}">${t.emoji?esc(t.emoji)+" ":""}${esc(t.text)}</div>
        <div class="pln-rm">${priBadge}<span class="pln-badge en-${em2[0]}">${em2[1]}</span><span class="pln-badge cat-pill">${bm[1]}</span>${duePill(t)}${subLeft?`<span class="pln-badge cat-pill">▸${subLeft}</span>`:""}${R?remBellBtn(t,R):""}
          <button class="x" data-act="taskEdit" data-v="${t.id}" style="font-size:11px;margin-left:auto;color:var(--muted)">✏️</button>
          <button class="x" data-act="delTask" data-v="${t.id}" style="font-size:11px;color:var(--muted)">✕</button>
        </div>
      </div>
    </div>`;
  }
  function mkSec(emoji,title,items,cls,emptyMsg){
    const show=items.length>0||emptyMsg;
    if(!show)return "";
    return `<div class="pln-sec${cls?" "+cls:""}"><div class="pln-sh"><span class="pln-sh-ttl">${emoji} ${title}</span><span class="pln-cnt">${items.length}</span></div>${items.length?items.map(plnTaskRow).join(""):`<div class="pln-empty-sm">${emptyMsg}</div>`}</div>`;
  }

  // nearest birthday surfaces here as a "plan ahead" nudge (only when it's close)
  const bdNext=(state.sentinel.birthdays||[]).map(b=>({...b,...nextBirthdayInfo(b)})).sort((a,b)=>a.days-b.days)[0];
  const birthdayNudge=(bdNext&&bdNext.days<=30)?cardBirthdayPrep():"";

  const draft=state.plnDraft||{};
  const moreOpen=!!state.plnMoreOpen;
  const energyNote=el==="low"?"🌙 Showing gentle tasks first.":el==="medium"?"🌤️ Low + medium tasks first.":"☀️ All tasks — full energy mode.";

  const leftCol=[
    mkSec("🚨","Overdue",overdue,"s-overdue","No overdue tasks. ✨"),
    mkSec("📌","Due Today",dueToday,"s-today",""),
    mkSec("📅","Due This Week",dueWeek,"",""),
    doneAll.length?`<details class="acc"><summary style="font-size:12.5px">✅ Done (${doneAll.length}${doneToday.length?" · "+doneToday.length+" today":""})</summary><div class="acc-body">${doneAll.map(plnTaskRow).join("")}</div></details>`:""
  ].filter(Boolean).join("");

  const rightCol=[
    urgentRest.length?mkSec("🔥","Urgent",urgentRest,"s-urgent",""):"",
    `<div class="pln-sec s-energy"><div class="pln-sh"><span class="pln-sh-ttl">⚡ Energy Match</span><span class="pln-cnt">${energyMatched.length}</span></div><div style="font-size:10.5px;color:var(--ink-soft);margin-bottom:6px">${energyNote}</div>${energyMatched.length?energyMatched.map(plnTaskRow).join(""):`<div class="pln-empty-sm">No tasks matching your current energy.</div>`}${!showAll&&later.length?`<button class="btn" data-act="plnToggleAll" style="font-size:11px;margin-top:8px;width:100%">Show all tasks (${later.length} more)</button>`:""}</div>`,
    showAll&&later.length?mkSec("🗂️","Backlog",later,"",""):""
  ].filter(Boolean).join("");

  return `
  <section class="panel" style="padding-bottom:10px">
    <div class="card-head" style="margin-bottom:6px"><h2 style="font-size:17px">🗒️ Planner</h2></div>
    <div class="pln-stats">
      ${overdue.length?`<div class="pln-stat has-alert"><div class="pln-stat-n">${overdue.length}</div><div class="pln-stat-l">Overdue</div></div>`:""}
      <div class="pln-stat"><div class="pln-stat-n">${dueTodayCount}</div><div class="pln-stat-l">Today</div></div>
      <div class="pln-stat"><div class="pln-stat-n">${dueWeekCount}</div><div class="pln-stat-l">This week</div></div>
      ${urgentCount?`<div class="pln-stat has-alert"><div class="pln-stat-n">${urgentCount}</div><div class="pln-stat-l">Urgent</div></div>`:""}
      <div class="pln-stat"><div class="pln-stat-n">${doneToday.length}</div><div class="pln-stat-l">Done today</div></div>
    </div>
    <div style="background:rgba(169,143,224,.06);border-radius:12px;padding:10px 12px">
      <div class="pln-add-bar">
        <input class="inp" id="plnText" placeholder="Add a task… (Enter)" value="${esc(draft.text||'')}">
        <button class="btn btn-grad" data-act="addTask" style="white-space:nowrap;flex-shrink:0">＋ Add</button>
        <button class="x" data-act="plnMoreToggle" title="more options" style="font-size:18px;padding:3px 7px;color:var(--muted)">⋯</button>
      </div>
      ${moreOpen?`<div class="pln-more">
        <select class="inp" id="plnBucket" style="max-width:155px">${TASK_BUCKETS.map(([v,e,l])=>`<option value="${v}" ${draft.bucket===v?'selected':''}>${e} ${l}</option>`).join("")}</select>
        <select class="inp" id="plnEnergy" style="max-width:115px">${TASK_ENERGY.map(([v,e,l])=>`<option value="${v}" ${(draft.energy||"medium")===v?'selected':''}>${e} ${l}</option>`).join("")}</select>
        <select class="inp" id="plnPriority" style="max-width:115px">${TASK_PRIORITY.map(([v,e,l])=>`<option value="${v}" ${(draft.priority||"medium")===v?'selected':''}>${e} ${l}</option>`).join("")}</select>
        <input class="inp" id="plnEmoji" placeholder="emoji" value="${esc(draft.emoji||'')}" style="max-width:60px">
        <input class="inp" id="plnDue" type="date" value="${esc(draft.due||'')}" style="max-width:150px">
      </div>`:""}
    </div>
  </section>
  <div class="pln-grid">
    <div class="pln-col">${leftCol||`<div class="pln-sec"><div class="pln-empty-sm">Nothing overdue or due soon. 🌸</div></div>`}</div>
    <div class="pln-col">${rightCol}</div>
  </div>
  ${remindersCard()}
  ${birthdayNudge}
  ${DISCLAIMER}`;
}

/* board drag — native HTML5 for mouse; finger/Pencil use the ◀ ▶ buttons (iOS has no native drag) */
function wireTaskDnD(){
  document.querySelectorAll("[data-drag-task]").forEach(c=>{
    c.addEventListener("dragstart",e=>{ if(window._lastPtr&&window._lastPtr!=="mouse"){ e.preventDefault(); return; }
      e.dataTransfer.setData("text/task",c.dataset.dragTask); e.dataTransfer.effectAllowed="move"; });
  });
  document.querySelectorAll(".kcol").forEach(col=>{
    col.addEventListener("dragover",e=>{ if([...(e.dataTransfer.types||[])].includes("text/task")){ e.preventDefault(); col.classList.add("kover"); } });
    col.addEventListener("dragleave",()=>col.classList.remove("kover"));
    col.addEventListener("drop",async e=>{ e.preventDefault(); col.classList.remove("kover");
      const id=e.dataTransfer.getData("text/task"); if(id) await setTaskStatusById(id,col.dataset.kstatus); });
  });
}

/* (calAgenda removed 2026-06-18 — Events & birthdays now live on the Events tab; reminders moved to the Planner) */
/* the 🔔 Reminders card — shared by the Calendar and the Planner (same data, same buttons) */
function remindersCard(){
  const rem=state.sentinel.reminders||{};
  const OFFSETS=[[0,"Same day"],[1,"1 day before"],[3,"3 days before"],[7,"1 week before"]];
  const offs=rem.offsets||[0,1];
  const notif=(typeof Notification!=="undefined")?Notification.permission:"unsupported";
  return `<section class="panel" style="margin-top:14px">
    <div class="card-head"><h2 style="font-size:17px">🔔 Reminders</h2></div>
    <p class="soft" style="font-size:12px;margin:0 0 10px">Get a gentle nudge before events &amp; birthdays. Pick how far ahead you'd like to be reminded.</p>
    <div class="chiprow" style="margin-bottom:12px">
      ${OFFSETS.map(([v,l])=>`<button class="chiptog ${offs.includes(v)?'on':''}" data-act="remOffset" data-v="${v}"><span>${offs.includes(v)?'✓':''}</span>${l}</button>`).join("")}
    </div>
    <div class="chiprow" style="margin-bottom:10px">
      <button class="chiptog ${rem.browser?'on':''}" data-act="remBrowser"><span>${rem.browser?'✓':''}</span>💻 Browser pop-ups${notif==="denied"?" (blocked in browser)":notif==="unsupported"?" (not in this browser — use 📱)":""}</button>
      <button class="chiptog ${rem.push?'on':''}" data-act="remPush"><span>${rem.push?'✓':''}</span>📱 Phone push</button>
      <button class="chiptog ${rem.email?'on':''}" data-act="remEmail"><span>${rem.email?'✓':''}</span>✉️ Email</button>
    </div>
    <div style="margin:12px 0 0">
      <div class="label" style="margin-bottom:4px">⏰ Your reminders <span class="soft" style="text-transform:none;letter-spacing:0">· or just tell Kiko "remind me to…"</span></div>
      ${activeReminders().length?activeReminders().map(r=>({r,eff:nextReminderDate(r)})).sort((a,b)=>a.eff<b.eff?-1:1).map(({r,eff})=>{
        const days=Math.round((new Date(eff+"T00:00")-new Date(TODAY+"T00:00"))/86400000);
        return `<div class="agenda-row"><span class="agenda-when">${whenLabel(Math.max(0,days))}</span><span class="agenda-dot" style="background:var(--peri)"></span><span class="grow">⏰ ${esc(r.text)} <span class="soft" style="font-size:11px">· ${fmtDate(eff)}${r.time?" · "+fmt12(r.time):""}${r.repeat&&r.repeat!=="none"?" · "+esc(r.repeat):""}</span></span><button class="x" data-act="doneReminderCR" data-v="${r.id}" title="done">✓</button><button class="x" data-act="delReminderCR" data-v="${r.id}" title="remove">✕</button></div>`;
      }).join(""):`<p class="soft" style="font-size:12px">No reminders yet — add anything: meds at 9pm, water the plants, email the accountant… ❄️</p>`}
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
        <input class="inp" id="crText" placeholder="remind me to…" style="flex:2;min-width:140px">
        <input class="inp" id="crDate" type="date" value="${TODAY}" style="max-width:140px">
        <input class="inp" id="crTime" type="time" style="max-width:110px">
        <select class="inp" id="crRepeat" style="max-width:110px"><option value="none">once</option><option value="daily">daily</option><option value="weekly">weekly</option><option value="monthly">monthly</option></select>
        <button class="btn btn-grad" data-act="addReminderCR">＋ add</button>
      </div>
    </div>
    ${rem.email?`<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><input class="inp" id="remEmailAddr" type="email" placeholder="you@email.com" value="${esc(rem.emailAddr||CONFIG.ownerEmail||"")}" style="max-width:260px"><button class="btn" data-act="saveRemEmail">save email</button><span class="soft" style="font-size:11px">${rem.emailAddr?"sending to "+esc(rem.emailAddr):"add your email to receive reminders"}</span></div>`:""}
    <p class="soft" style="font-size:11px;margin-top:10px">💻 Browser pop-ups appear while Mifuyu OS is open in a tab. ✉️ Email needs the reminder service set up on the server (one-time). Both respect Calm mode. ❄️</p>
  </section>`;
}
