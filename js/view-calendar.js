// sky · lavender · mint · sakura · ice
const GAME_COLOR_DEFAULT="#f6cba9";
   // game updates (peach)
const GAME_EVENT_COLOR="#a9e0cb";
     // limited-time game events (mint)
const GAME_STREAM_COLOR="#c9b8f0";

function gameSrcColor(ev,gameColor){ return ev.src==="gamestream"?GAME_STREAM_COLOR : ev.src==="gameevent"?(ev.color||GAME_EVENT_COLOR) : (gameColor||GAME_COLOR_DEFAULT); }


function renderCalendar(){
  const sent=state.sentinel||{};
  const events=sent.calendarEvents||[];
  const gameColor=sent.gameColor||GAME_COLOR_DEFAULT;
  const showStreams=state.calShowStreams!==false, showGames=state.calShowGames!==false, showEvents=state.calShowEvents!==false, showBdays=state.calShowBdays!==false;
  const view=state.calView||"week";
  if(!state.calRef) state.calRef=new Date();

  const filterBar=`<div class="chiprow" style="margin-bottom:10px">
    <button class="chiptog ${showEvents?'on':''}" data-act="calToggleEvents"><span>${showEvents?'✓':''}</span>📌 Events</button>
    <button class="chiptog ${showBdays?'on':''}" data-act="calToggleBdays"><span>${showBdays?'✓':''}</span>🎂 Birthdays</button>
    <button class="chiptog ${showStreams?'on':''}" data-act="calToggleStreams"><span>${showStreams?'✓':''}</span>🔴 Streams</button>
    <button class="chiptog ${showGames?'on':''}" data-act="calToggleGames"><span>${showGames?'✓':''}</span>🎮 Games</button>
  </div>`;
  const viewToggle=`<div class="seg"><button class="${view==='week'?'on':''}" data-act="calViewWeek">📋 Week</button><button class="${view==='month'?'on':''}" data-act="calViewMonth">🗓️ Month</button></div>`;

  if(view==="week"){
    const ref=state.calRef instanceof Date?state.calRef:new Date();
    const dow=ref.getDay(); const diffToMon=dow===0?-6:1-dow;
    const monday=new Date(ref); monday.setDate(ref.getDate()+diffToMon);
    const sunday=new Date(monday); sunday.setDate(monday.getDate()+6);
    const dayNames=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const days=dayNames.map((_,i)=>{ const d=new Date(monday); d.setDate(monday.getDate()+i); return d; });
    const fmtS=(d)=>d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    const rangeStr=monday.getMonth()===sunday.getMonth()?
      `${monday.toLocaleDateString("en-US",{month:"long",year:"numeric"})}, ${monday.getDate()}–${sunday.getDate()}`:
      `${fmtS(monday)} – ${fmtS(sunday)}, ${sunday.getFullYear()}`;

    const rows=days.map((d,i)=>{
      const ds=d.toLocaleDateString("en-CA"), isToday=ds===TODAY, dayName=dayNames[i];
      const monthShort=d.toLocaleDateString("en-US",{month:"short"});
      const streamChips=showStreams?slotsForDate(d).filter(s=>s.day===dayName).map(s=>
        `<div class="cal-wk-stream" data-act="editSchedule">🔴 ${s.time?esc(s.time)+" · ":""}${esc(s.show||s.title||"Stream")}</div>`
      ).join(""):"";
      const bdayChips=showBdays?(sent.birthdays||[]).filter(b=>(d.getMonth()+1)===Number(b.month)&&d.getDate()===Number(b.day)).map(b=>
        `<div class="cal-wk-bday">🎂 ${esc(b.name)}</div>`
      ).join(""):"";
      const dayEvs=events.filter(ev=>(ds===ev.date||ds===(ev.endDate||ev.date))&&(gameSrc(ev)?showGames:showEvents));
      const evChips=dayEvs.sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99")).map(ev=>{
        const bg=gameSrc(ev)?gameSrcColor(ev,gameColor):(ev.color||CAL_COLORS[0]);
        const ic=gameSrcIcon(ev);
        const et=toLocal(ev.date,ev.time,ev.tz);
        const timeStr=et?`<span class="cal-wk-time">${et.tTime}</span>`:(ev.time?`<span class="cal-wk-time">${fmt12(ev.time)}</span>`:"");
        const multi=ev.endDate&&ev.endDate>ev.date, isEnd=multi&&ds===ev.endDate, suffix=multi?(isEnd?" · ends":" · starts"):"";
        const lk=ev.url?` 🔗`:"";
        return `<div class="cal-wk-ev" style="background:${bg}" data-act="calEvent" data-eid="${ev.id}">${ic}${timeStr}${esc(ev.title)}${suffix}${lk}</div>`;
      }).join("");
      const empty=!streamChips&&!bdayChips&&!evChips;
      return `<div class="cal-wk-row${isToday?' today':''}" data-date="${ds}" data-act="calAdd">
        <div class="cal-wk-label">
          <span class="cal-wk-dn">${isToday?'Today':dayName}</span>
          <span class="cal-wk-dd">${d.getDate()}</span>
          <span class="cal-wk-mo">${monthShort}</span>
        </div>
        <div class="cal-wk-events">${streamChips}${bdayChips}${evChips}${empty?`<span class="cal-wk-empty">nothing planned 🌙</span>`:""}</div>
      </div>`;
    }).join("");

    return `<div class="page"><div class="panel">
      <div class="card-head" style="flex-wrap:wrap;gap:10px">
        <div><h2 style="font-size:18px">📅 ${rangeStr}</h2>
          <div class="label" style="margin-top:2px">tap a day to add · 🔴 streams · 🎮 games · 📌 events</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          ${viewToggle}
          <div style="display:flex;gap:6px"><button class="btn" data-act="calPrev">‹ prev</button><button class="btn" data-act="calToday">this week</button><button class="btn" data-act="calNext">next ›</button></div>
        </div>
      </div>
      ${filterBar}
      <div class="cal-wk-list">${rows}</div>
      <p class="soft" style="font-size:11.5px;margin-top:12px">Nothing here is set in stone — tap any day to add or edit. 💗 Games refresh automatically every Friday.</p>
    </div>
    ${gamesTrackedCard(sent)}</div>`;
  }

  // ── Month view ──
  const ref=state.calRef instanceof Date?state.calRef:new Date();
  const y=ref.getFullYear(), m=ref.getMonth();
  const startDow=new Date(y,m,1).getDay();
  const gridStart=new Date(y,m,1-startDow);
  const monthName=ref.toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const dows=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  let cells="";
  for(let i=0;i<42;i++){
    const d=new Date(gridStart); d.setDate(gridStart.getDate()+i);
    const ds=d.toLocaleDateString("en-CA");
    const inMonth=d.getMonth()===m, isToday=ds===TODAY;
    const dayShort=dows[d.getDay()];
    const streamChips=showStreams?slotsForDate(d).filter(s=>s.day===dayShort).map(s=>`<div class="cal-stream" data-act="editSchedule" title="Stream day — tap to edit your schedule">🔴 ${s.time?esc(s.time)+" · ":""}${esc(s.show||s.title||"Stream")}</div>`).join(""):"";
    const bdayChips=showBdays?(sent.birthdays||[]).filter(b=>(d.getMonth()+1)===Number(b.month)&&d.getDate()===Number(b.day)).map(b=>`<div class="cal-bday" data-act="scrollAgenda" title="🎂 ${esc(b.name)}'s birthday">🎂 ${esc(b.name)}</div>`).join(""):"";
    const dayEvents=events.filter(ev=>(ds===ev.date||ds===(ev.endDate||ev.date))&&(gameSrc(ev)?showGames:showEvents));
    const evChips=dayEvents.sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99")).map(ev=>{
      const multi=ev.endDate&&ev.endDate>ev.date, isEnd=multi&&ds===ev.endDate, suffix=multi?(isEnd?" · ends":" · starts"):"";
      const bg=gameSrc(ev)?gameSrcColor(ev,gameColor):(ev.color||CAL_COLORS[0]);
      const ic=gameSrcIcon(ev);
      const et=toLocal(ev.date,ev.time,ev.tz);
      const lk=ev.url?" 🔗":"", act=`data-act="calEvent"`;
      const tip=esc((et?et.tTime+" "+CAL_TZ_LABEL+" — ":"")+ev.title+(multi?` (${fmtDate(ev.date)}–${fmtDate(ev.endDate)})`:"")+(ev.note?" — "+ev.note:"")+(linkable?" — (tap to open)":""));
      return `<div class="cal-ev" draggable="${(!multi||!isEnd)?'true':'false'}" data-eid="${ev.id}" ${act} style="background:${bg}" title="${tip}">${ic}${esc(ev.title)}${suffix}${lk}</div>`;
    }).join("");
    cells+=`<div class="cal-cell ${inMonth?"":"other"} ${isToday?"today":""}" data-date="${ds}" data-act="calAdd"><span class="cal-daynum">${d.getDate()}</span>${streamChips}${bdayChips}${evChips}</div>`;
  }
  return `<div class="page"><div class="panel">
    <div class="card-head"><div><h2 style="font-size:18px">📅 ${monthName}</h2><div class="label" style="margin-top:2px">tap a day to add · drag to move · 🔴 streams · 🎮 game updates</div></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${viewToggle}
        <div style="display:flex;gap:6px"><button class="btn" data-act="calPrev">‹</button><button class="btn" data-act="calToday">today</button><button class="btn" data-act="calNext">›</button></div>
      </div>
    </div>
    <div class="chiprow" style="margin-bottom:8px">
      <button class="chiptog ${showEvents?'on':''}" data-act="calToggleEvents"><span>${showEvents?'✓':''}</span>📌 Events</button>
      <button class="chiptog ${showBdays?'on':''}" data-act="calToggleBdays"><span>${showBdays?'✓':''}</span>🎂 Birthdays</button>
      <button class="chiptog ${showStreams?'on':''}" data-act="calToggleStreams"><span>${showStreams?'✓':''}</span>🔴 Stream schedule</button>
      <button class="chiptog ${showGames?'on':''}" data-act="calToggleGames"><span>${showGames?'✓':''}</span>🎮 Games (updates · events · streams)</button>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:10.5px;color:var(--muted);margin-bottom:10px">
      <span><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${GAME_COLOR_DEFAULT};vertical-align:middle"></span> 🎮 update</span>
      <span><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${GAME_EVENT_COLOR};vertical-align:middle"></span> 🎉 event start/end</span>
      <span><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${GAME_STREAM_COLOR};vertical-align:middle"></span> 📺 livestream</span>
    </div>
    <div class="cal-grid" style="margin-bottom:6px">${dows.map(d=>`<div class="cal-dow">${d}</div>`).join("")}</div>
    <div class="cal-grid">${cells}</div>
    <p class="soft" style="font-size:11.5px;margin-top:12px">Konfuyu~ nothing here is set in stone — drag things around whenever your week shifts. 💗 Games refresh automatically every Friday.</p>
  </div>
  ${gamesTrackedCard(sent)}</div>`;
}

function gamesTrackedCard(sent){
  const games=(sent.gameTopics&&sent.gameTopics.length)?sent.gameTopics:DEFAULT_GAMES;
  return `<section class="panel" style="margin-top:14px">
    <div class="card-head"><div class="label">🎮 Games I track</div><span class="pill pill-gray">${games.length}</span></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Updates, limited-time events &amp; livestream days for these are pulled in each Friday. Ask Kiko to "track [game]" or "stop tracking [game]" anytime, or use the box below.</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${games.map(g=>`<span class="pill pill-lav" style="display:inline-flex;align-items:center;gap:6px">${esc(g)} <button class="x" data-act="delGameTopic" data-v="${esc(g)}" style="font-size:11px;padding:0">✕</button></span>`).join("")}</div>
    <div style="display:flex;gap:8px"><input class="inp" id="gameTopicInput" placeholder="add a game (e.g. Genshin Impact)"><button class="btn btn-grad" data-act="addGameTopic">＋ track</button></div>
  </section>`;
}


function wireCalDnD(){
  let dragEid=null;
  document.querySelectorAll(".cal-ev[draggable='true'],.cal-span[draggable='true']").forEach(ev=>{
    ev.addEventListener("dragstart",e=>{ dragEid=ev.dataset.eid; ev.classList.add("dragging"); if(e.dataTransfer){e.dataTransfer.effectAllowed="move"; try{e.dataTransfer.setData("text/plain",dragEid);}catch(_){}}});
    ev.addEventListener("dragend",()=>{ ev.classList.remove("dragging"); document.querySelectorAll(".cal-cell.drag-over").forEach(c=>c.classList.remove("drag-over")); });
  });
  document.querySelectorAll(".cal-cell").forEach(cell=>{
    cell.addEventListener("dragover",e=>{ e.preventDefault(); if(e.dataTransfer)e.dataTransfer.dropEffect="move"; cell.classList.add("drag-over"); });
    cell.addEventListener("dragleave",()=>cell.classList.remove("drag-over"));
    cell.addEventListener("drop",async e=>{
      e.preventDefault(); cell.classList.remove("drag-over");
      const eid=dragEid||(e.dataTransfer&&e.dataTransfer.getData("text/plain"));
      const date=cell.dataset.date;
      if(!eid||!date)return;
      state.sentinel=await DB.saveDaily(SENTINEL,n=>{ const evs=(n.calendarEvents||[]).slice(); const t=evs.find(x=>x.id===eid);
        if(t){ if(t.endDate&&t.endDate>t.date){ const delta=daysBetween(t.date,date); t.endDate=calShift(t.endDate,delta); } t.date=date; } return {...n,calendarEvents:evs}; });
      render();
    });
  });
}
