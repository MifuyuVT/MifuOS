function logicalDisplayDate(){ return new Date(Date.now() - DAY_ROLLOVER_HOURS*3600*1000); }

/* per-day stream ideas, recomputed per week. REAL dated items (updates/events/streams) come ONLY from her
   game calendar so they land on the correct day; filler days get date-agnostic activity ideas. */
function streamSuggestions(wkISO){
  const sent=state.sentinel||{}; const games=(sent.gameTopics&&sent.gameTopics.length)?sent.gameTopics:DEFAULT_GAMES;
  const start=new Date(wkISO+"T00:00"); const byDay={};
  (sent.calendarEvents||[]).filter(gameSrc).forEach(ev=>{ const d=new Date(ev.date+"T00:00"); const diff=Math.round((d-start)/86400000);
    if(diff>=0&&diff<7){ const wd=DOW_ORDER[(d.getDay()+6)%7]; if(!byDay[wd]) byDay[wd]=ev.title; } });
  const ideas=(g,i)=>[`Cozy ${g} stream`,`${g} grind session`,`Just chatting + ${g}`,`Variety stream`][i%4];
  return DOW_ORDER.map((wd,i)=>({day:wd, text:byDay[wd]||ideas(games[i%games.length],i), real:!!byDay[wd]}));
}

function cardSchedule(){
  if(state.schedWeekOff===undefined)state.schedWeekOff=0;
  const off=state.schedWeekOff, wkISO=weekStartISO(off), ed=state.schedEdit;
  const slots=weekSlots(wkISO);
  const label=off===0?"This week":off===1?"Next week":off===-1?"Last week":(off>0?`In ${off} wks`:`${-off} wks ago`);
  const byDay={}; slots.forEach(r=>{byDay[r.day]=r;});
  const nav=`<div style="display:flex;align-items:center;gap:4px">
    <button class="btn" data-act="schedWeek" data-d="-1">‹</button>
    <button class="btn" data-act="schedWeekToday">${label}</button>
    <button class="btn" data-act="schedWeek" data-d="1">›</button>
    <button class="btn" data-act="schedEdit">${ed?'done':'edit'}</button></div>`;
  let body;
  if(ed){
    const rows=DOW_ORDER.map(day=>{
      const r=byDay[day];
      return `<div class="listrow sched-ed-row" data-day="${day}" style="gap:8px;align-items:center">
        <span class="pill pill-lav" style="min-width:38px;text-align:center;flex-shrink:0">${day}</span>
        <input class="inp sched-show" placeholder="what you're streaming" value="${esc(r?.show||'')}" style="flex:1;min-width:0">
        <input class="inp sched-time" value="${esc(r?.time||'')}" style="max-width:64px" placeholder="${STREAM_TIME_DEFAULT}">
      </div>`;
    }).join("");
    const sug=streamSuggestions(wkISO);
    body=`${rows}
    <div class="label" style="margin:14px 0 6px">💡 Ideas — tap to add</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${sug.map(s=>`<button class="chiptog ${s.real?'on':''}" data-act="addSchedSug" data-day="${s.day}" data-show="${esc(s.text)}" style="white-space:normal;text-align:left;height:auto"><span>＋</span>${s.day} · ${s.real?'🎮 ':''}${esc(s.text)}</button>`).join("")}</div>`;
  } else {
    body=DOW_ORDER.map(day=>{
      const r=byDay[day];
      return r
        ?`<div class="listrow"><span class="pill pill-lav" style="min-width:38px;text-align:center;flex-shrink:0">${day}</span><span class="grow" style="font-size:13px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.show||'Stream')}</span><span class="soft" style="font-size:12px;flex-shrink:0">${esc(r.time||'')}</span></div>`
        :`<div class="listrow" style="opacity:.38"><span class="pill pill-gray" style="min-width:38px;text-align:center;flex-shrink:0">${day}</span><span class="soft" style="font-size:12px">—</span></div>`;
    }).join("");
  }
  return `<section class="panel">
    <div class="card-head"><span class="label">🗓️ Stream schedule</span>${nav}</div>
    ${body}
  </section>`;
}

function cardGoals(){
  const wk=state.sentinel.goalsWeek||[], mo=state.sentinel.goalsMonth||[];
  const list=(arr,period)=>arr.map(g=>`<div class="listrow"><button class="x" data-act="toggleGoal" data-p="${period}" data-v="${g.id}" style="color:${g.done?'var(--mint)':'var(--muted)'};font-size:16px">${g.done?'●':'○'}</button><span class="grow ${g.done?'soft':''}" style="font-size:13px;${g.done?'text-decoration:line-through':''}">${esc(g.text)}</span><button class="x" data-act="delGoal" data-p="${period}" data-v="${g.id}">✕</button></div>`).join("");
  return `<section class="panel">
    <div class="card-head"><span class="label">🌷 Goals</span></div>
    <div class="label" style="color:var(--peri-deep);margin-bottom:2px">This week</div>
    ${list(wk,"week")}
    <div style="display:flex;gap:6px;margin:4px 0 12px"><input class="inp" id="goalWeek" placeholder="+ add a goal" value="${esc((state.goalDraft||{}).week||'')}"><button class="btn" data-act="addGoal" data-p="week">add</button></div>
    <div class="label" style="color:var(--peri-deep);margin-bottom:2px">This month</div>
    ${list(mo,"month")}
    <div style="display:flex;gap:6px;margin-top:4px"><input class="inp" id="goalMonth" placeholder="+ add a goal" value="${esc((state.goalDraft||{}).month||'')}"><button class="btn" data-act="addGoal" data-p="month">add</button></div>
  </section>`;
}

function cardJournal(){
  const entry=(state.today.journal||"").trim();
  const preview=entry?entry.slice(0,160)+(entry.length>160?"…":""):"";
  const det=(state.kikoDetected||{})[TODAY];
  const moodEmoji=det&&det.mood!=null?['😶','😢','😔','😐','🙂','😊'][Math.max(0,Math.min(5,det.mood))]:'';
  return `<section class="panel">
    <div class="card-head"><span class="label">📓 Journal</span><button class="btn btn-grad" data-act="tab" data-tab="journal">📝 open today's page</button></div>
    ${preview
      ? `<p style="font-size:13px;line-height:1.6;margin:0 0 8px;color:var(--ink-soft);font-style:italic">"${esc(preview)}"</p>
         ${det?`<div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px;margin-top:4px">
           ${det.mood!=null?`<span>${moodEmoji} mood ${det.mood}/5</span>`:''}
           ${det.energy!=null?`<span>⚡ energy ${det.energy}/5</span>`:''}
           ${det.sleep!=null?`<span>🌙 ${det.sleep}h sleep</span>`:''}
           ${det.dayColor?`<span>🌈 ${esc(det.dayColor)}</span>`:''}
         </div>`:'<p class="soft" style="font-size:11px;margin:4px 0 0">Tap <b>🦊 Kiko, read this</b> to detect mood & energy from your words.</p>'}`
      : `<p class="soft" style="font-size:12.5px;margin:0">Nothing written yet today — tap to open your journal and add a few words. 🌸</p>`}
  </section>`;
}

/* weekly habit/goal helpers (done-this-week toggles, like gacha weeklies) */
function wkDoneThisWeek(map,gid){ const mon=mondayOf(new Date(TODAY+"T00:00")).toLocaleDateString("en-CA"); return (map||{})[gid]===mon; }

/* shared renderer for a clean checklist card (daily rows by energy + progress + weekly section) */
function checklistCard(opt){
  const {label,list,checks,ed,toggleAct,delAct,editAct,addAct,inputId,energyId,draft,
         weekly,wkDoneMap,wkToggleAct,wkAddAct,wkDelAct,wkInputId,wkDraft,wkLabel,wkPlaceholder}=opt;
  const done=list.filter(h=>checks[h.id]).length, total=list.length;
  const pct=total?Math.round(done/total*100):0;
  const groups=[["low","🌙 Low energy"],["med","🌤 Medium energy"],["high","🌞 High energy"]];
  const row=h=>`<button class="ck-row" data-act="${toggleAct}" data-v="${h.id}">
      <span class="ck-box ${checks[h.id]?'on':''}">${checks[h.id]?'✓':''}</span>
      <span class="ck-name ${checks[h.id]?'ck-donetxt':''}">${esc(h.text)}</span>
      ${ed?`<span class="ck-del" data-act="${delAct}" data-v="${h.id}" title="remove">✕</span>`:''}</button>`;
  return `<section class="panel">
    <div class="card-head"><span class="label">${label}</span><span style="display:flex;gap:6px;align-items:center"><span class="pill ${done&&done===total?'pill-mint':'pill-gray'}">${done}/${total}${done&&done===total?' ♡':''}</span><button class="btn" data-act="${editAct}">${ed?'done':'edit'}</button></span></div>
    <div class="ck-prog"><span style="width:${pct}%"></span></div>
    ${groups.map(([g,gl])=>{ const its=list.filter(h=>(h.energy||"med")===g); return its.length?`<div class="gt-sec" style="margin-top:10px">${gl}</div><div class="gt-list">${its.map(row).join("")}</div>`:""; }).join("")}
    ${ed?`<div class="gt-add"><input class="inp" id="${inputId}" placeholder="new item…" style="flex:1;min-width:110px" value="${esc((draft||{}).text||'')}"><select class="inp" id="${energyId}" style="max-width:90px;flex:0 0 auto">${[["low","🌙 low"],["med","🌤 med"],["high","🌞 high"]].map(([v,l])=>`<option value="${v}" ${(((draft||{}).energy)||"med")===v?'selected':''}>${l}</option>`).join("")}</select><button class="btn btn-grad" data-act="${addAct}">add</button></div>`:''}
    <div class="gt-div"></div>
    <div class="gt-sec">${wkLabel}</div>
    ${weekly.length?`<div class="chiprow gt-wk">${weekly.map(h=>`<button class="chiptog ${wkDoneThisWeek(wkDoneMap,h.id)?'on':''}" data-act="${wkToggleAct}" data-v="${h.id}"><span>${wkDoneThisWeek(wkDoneMap,h.id)?'✓':'•'}</span>${esc(h.text)}${ed?`<span class="x" data-act="${wkDelAct}" data-v="${h.id}" style="margin-left:2px">✕</span>`:''}</button>`).join("")}</div>`:`<p class="soft" style="font-size:11.5px;margin:2px 0">No weekly tasks yet${ed?` — add one below (${esc(wkPlaceholder)})`:''}.</p>`}
    ${ed?`<div class="gt-add"><input class="inp" id="${wkInputId}" placeholder="new weekly task…" value="${esc(wkDraft||'')}"><button class="btn btn-grad" data-act="${wkAddAct}">add</button></div>`:''}
  </section>`;
}

function cardHabits(){
  return checklistCard({ label:"Daily habits ✅",
    list:habitsList(), checks:state.today.habits||{}, ed:!!state.habitEdit,
    toggleAct:"habitToggle", delAct:"delHabit", editAct:"habitEdit", addAct:"addHabitUI",
    inputId:"habitInput", energyId:"habitEnergy", draft:state.habitDraft,
    weekly:habitsWeekly(), wkDoneMap:state.sentinel.habitsWkDone, wkToggleAct:"habitWkToggle",
    wkAddAct:"addHabitWk", wkDelAct:"delHabitWk", wkInputId:"habitWkInput", wkDraft:state.habitWkDraft,
    wkLabel:"🧹 Weekly", wkPlaceholder:"vacuum, tidy room, clean the toilet…" });
}

function cardCreatorGoals(){
  return checklistCard({ label:"🎯 Daily goals",
    list:cgoalsList(), checks:state.today.cgoals||{}, ed:!!state.cgoalEdit,
    toggleAct:"cgoalToggle", delAct:"delCgoal", editAct:"cgoalEdit", addAct:"addCgoalUI",
    inputId:"cgoalInput", energyId:"cgoalEnergy", draft:state.cgoalDraft,
    weekly:cgoalsWeekly(), wkDoneMap:state.sentinel.cgoalsWkDone, wkToggleAct:"cgoalWkToggle",
    wkAddAct:"addCgoalWk", wkDelAct:"delCgoalWk", wkInputId:"cgoalWkInput", wkDraft:state.cgoalWkDraft,
    wkLabel:"🗂 Weekly", wkPlaceholder:"do taxes, clean streaming room, clear inbox…" });
}

function cardCreatorGrowth(){
  const list=cgrowthList(), checks=state.today.cgrowth||{}, ed=!!state.cgrowthEdit;
  const done=list.filter(h=>checks[h.id]).length, total=list.length, pct=total?Math.round(done/total*100):0;
  const groups=[["low","🌙 Low energy"],["med","🌤 Medium energy"],["high","🌞 High energy"]];
  const row=h=>`<button class="ck-row" data-act="cgrowthToggle" data-v="${h.id}"><span class="ck-box ${checks[h.id]?'on':''}">${checks[h.id]?'✓':''}</span><span class="ck-name ${checks[h.id]?'ck-donetxt':''}">${esc(h.text)}</span>${ed?`<span class="ck-del" data-act="delCgrowth" data-v="${h.id}" title="remove">✕</span>`:''}</button>`;
  return `<section class="panel">
    <div class="card-head"><span class="label">🌱 Creator growth</span><span style="display:flex;gap:6px;align-items:center"><span class="pill ${done&&done===total?'pill-mint':'pill-gray'}">${done}/${total}${done&&done===total?' ♡':''}</span><button class="btn" data-act="cgrowthEdit">${ed?'done':'edit'}</button></span></div>
    <p class="soft" style="font-size:11px;margin:0 0 8px">Tiny ways to put yourself out there — pick what matches your energy. 💜</p>
    <div class="ck-prog"><span style="width:${pct}%"></span></div>
    ${groups.map(([g,gl])=>{ const its=list.filter(h=>(h.energy||"med")===g); return its.length?`<div class="gt-sec" style="margin-top:10px">${gl}</div><div class="gt-list">${its.map(row).join("")}</div>`:""; }).join("")}
    ${ed?`<div class="gt-add"><input class="inp" id="cgrowthInput" placeholder="new growth action…" style="flex:1;min-width:110px" value="${esc((state.cgrowthDraft||{}).text||'')}"><select class="inp" id="cgrowthEnergy" style="max-width:90px;flex:0 0 auto">${[["low","🌙 low"],["med","🌤 med"],["high","🌞 high"]].map(([v,l])=>`<option value="${v}" ${(((state.cgrowthDraft||{}).energy)||"med")===v?'selected':''}>${l}</option>`).join("")}</select><button class="btn btn-grad" data-act="addCgrowthUI">add</button></div>`:''}
  </section>`;
}

function cardBrainDump(){
  const caps=(state.sentinel.captures||[]).slice().reverse();
  return `<section class="panel">
    <div class="card-head"><span class="label">🎙️ Voice dump</span><button class="btn btn-grad" data-act="voiceOpen">＋ capture a thought</button></div>
    <p class="soft" style="font-size:12px;margin:0 0 8px">Tap the button or the pink FAB — your thought lands here instantly. Pin 📌 any to a sticky.</p>
    ${caps.length?`<div>${caps.map(c=>`<div class="listrow"><span class="soft" style="font-size:10px;margin-right:6px;flex-shrink:0">${(VOICE_CATS.find(x=>x[0]===c.cat)||["","💭"])[1]}</span><span class="grow" style="font-size:12.5px">${esc(c.text)}</span><button class="x" data-act="capPin" data-v="${c.id}" title="pin to a sticky">📌</button><button class="x" data-act="capDel" data-v="${c.id}">✕</button></div>`).join("")}</div>`:`<p class="soft" style="font-size:12.5px;margin:8px 0 0">Nothing captured yet — tap the button or use Alt+R to park a thought! 🌸</p>`}
  </section>`;
}

/* mood taps live on Health & Care; the home greeting is the deterministic glance block (2026-06-12) */
function cardGlance(){ const s=state.sentinel; const lastShot=(s.injectionLog||[]).slice(-1)[0];
  let nextDose=null; if(lastShot){ const d=new Date(lastShot.date+"T00:00"); d.setDate(d.getDate()+7); nextDose=d.toLocaleDateString("en-CA"); }
  const dueIn=nextDose?daysBetween(TODAY,nextDose):null;
  return `<section class="panel">
    <div class="card-head"><span class="label">Today at a glance</span></div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <span class="pill pill-ice" style="padding:6px 11px">💉 ${lastShot?"Last shot "+fmtDate(lastShot.date):"No shot logged yet"}</span>
      ${nextDose?`<span class="pill pill-lav" style="padding:6px 11px">📅 Next dose ${fmtDate(nextDose)}${dueIn!=null?` · ${dueIn<=0?'around now':'in '+dueIn+'d'}`:''}</span>`:''}
      <span class="pill pill-peri" style="padding:6px 11px">💊 ${(s.medsList||[]).length} meds tracked</span>
    </div>
    <p class="soft" style="font-size:11.5px;margin-top:8px;text-align:center">No pressure — just a soft snapshot. ❄️</p>
  </section>`; }

/* a little data-driven, motivating health note linking hydration / muscle / fat / weight to how she feels */
function healthInsight(){
  const wl=(state.sentinel.weightLog||[]).filter(x=>x).slice().sort(cmpDate);
  if(wl.length<2) return "";
  const unit=CONFIG.weightUnit||"kg";
  const pair=k=>{ const a=wl.filter(x=>x[k]!=null); return a.length>=2?[a[a.length-2],a[a.length-1]]:null; };
  const msgs=[];
  const w=pair("water"); if(w&&w[1].water<w[0].water-0.3) msgs.push("Your scale's body-water reading dipped a touch since last time 💧 — day-to-day wobble there is completely normal, and a few extra sips today never hurt. ❄️");
  const f=pair("fat"), mu=pair("muscle");
  if((f&&f[1].fat<f[0].fat-0.2)||(mu&&mu[1].muscle>mu[0].muscle+0.1)) msgs.push("Muscle and fat naturally wobble day to day, but yours are clearly heading the right direction 💪✨ — keep going, keep trying, you're doing it.");
  const ws=wl.filter(x=>x.w!=null);
  if(ws.length>=2){ const ch=ws[ws.length-1].w-ws[0].w; if(ch<=-0.5) msgs.push(`Down ${Math.abs(ch).toFixed(1)} ${unit} since you started tracking — slow and steady, exactly how it's meant to go. 🌱`); else if(ch>=0.8) msgs.push("A small up-tick lately — totally normal (water, hormones, the day). The line over weeks is what matters, and you're showing up for it. 💗"); }
  if(!msgs.length) return "Every weigh-in is just one dot — the line across the weeks is the real story, and you're building it. 💗";
  return msgs[parseInt(TODAY.replace(/-/g,""),10)%msgs.length];   // rotate daily so it stays fresh
}

function cardWeightTrend(){ const wl=(state.sentinel.weightLog||[]).slice().sort(cmpDate).filter(x=>x.w!=null).slice(-26);
  const vals=wl.map(x=>x.w), unit=CONFIG.weightUnit||"kg";
  let body='<p class="soft" style="font-size:12px">No weigh-ins yet.</p>';
  if(vals.length===1){
    body=`<div style="text-align:center;padding:6px 0"><span class="bignum">${vals[0].toFixed(1)} ${unit}</span><div class="soft" style="font-size:11px;margin-top:2px">${fmtDate(wl[0].date)} · one more weigh-in and your line begins ❄️</div></div>`;
  } else if(vals.length>=2){
    const mn=Math.min(...vals), mx=Math.max(...vals), rng=Math.max(0.4,mx-mn);
    const W=280,H=72,pad=8,plotH=H-pad*2;
    const xs=i=>pad+i*(W-pad*2)/(vals.length-1);
    const ys=v=>pad+(mx-v)/rng*plotH;     // higher weight sits higher; the line dips as she loses
    const line=vals.map((v,i)=>`${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
    const area=`${pad.toFixed(1)},${(H-pad).toFixed(1)} ${line} ${(W-pad).toFixed(1)},${(H-pad).toFixed(1)}`;
    const dots=vals.map((v,i)=>`<circle cx="${xs(i).toFixed(1)}" cy="${ys(v).toFixed(1)}" r="${i===vals.length-1?3:1.5}" fill="${i===vals.length-1?'var(--sakura-deep)':'var(--peri)'}"/>`).join("");
    const cur=vals[vals.length-1], prev=vals[vals.length-2];
    body=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="66" preserveAspectRatio="none" style="display:block;overflow:visible">
        <polyline points="${area}" fill="rgba(255,158,216,.12)" stroke="none"/>
        <polyline points="${line}" fill="none" stroke="var(--peri)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
        ${dots}
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:3px"><span>${fmtDate(wl[0].date)}</span><span>${fmtDate(wl[wl.length-1].date)}</span></div>
      <div style="display:flex;justify-content:center;margin-top:8px">${UI.stat({icon:"⚖️",label:"Current weight",value:cur.toFixed(1),unit:unit,delta:+(cur-prev).toFixed(1),good:"down",hint:"since last weigh-in"})}</div>
      <div style="text-align:center;font-size:10.5px;color:var(--muted);margin-top:2px">lowest ${mn.toFixed(1)} · highest ${mx.toFixed(1)} ${unit} over these weigh-ins</div>`;
  }
  const insight=healthInsight();
  return `<section class="panel">
    <div class="card-head"><span class="label">Weight trend</span><button class="btn" data-act="tab" data-tab="trends">open →</button></div>
    ${body}
    ${insight?`<p class="soft" style="font-size:11.5px;margin-top:8px;line-height:1.5;background:rgba(201,184,240,.14);border-radius:10px;padding:8px 10px">🦊 ${insight}</p>`:'<p class="soft" style="font-size:11.5px;margin-top:6px;text-align:center">The trend is the story, not any single day.</p>'}
  </section>`; }

function ciDays(k){ if(ciOn(k))return 0;
  const log=((state.sentinel.checkinLog||{})[k]||[]); let last=log.length?log[log.length-1]:null;
  if(k==="madeArt"){ const al=(state.sentinel.artLog||[]); const la=al.length?al[al.length-1].date:null; if(la&&(!last||la>last))last=la; }
  return last?daysBetween(last,TODAY):null; }

function ciWeek(k){ const wk=artMonday(TODAY); const set=new Set(((state.sentinel.checkinLog||{})[k]||[]).filter(d=>d>=wk&&d<=TODAY)); if(ciOn(k))set.add(TODAY); return set.size; }

function cardHero(){
  const creator=OS_MODE!=="health"; const d=new Date();
  const date=d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"});
  const defs=CI_DEFS[creator?"creator":"health"];
  if(!creator) return `<section class="panel hero-card">
    <div class="label" style="margin-bottom:8px;letter-spacing:.08em">TODAY'S CHECK-INS</div>
    <div class="ci-grid">${defs.map(([k,em,l])=>`<button class="ci-btn ${ciOn(k)?'on':''}" data-act="ciToggle" data-k="${k}"><span class="ci-ic">${em}</span><span>${l}</span></button>`).join("")}</div>
    <p class="soft" style="font-size:11.5px;text-align:center;margin:10px 0 0">✨ Click any check-in above when you complete it!</p>
  </section>`;
  return "";
}

function fmtSleep(hrs){ const H=Math.floor(hrs), M=Math.round((hrs-H)*60); return H+"h "+("0"+M).slice(-2)+"m"; }

function sleepStreakUnder(h){ let n=0; for(let i=0;i<10;i++){ const d=i===0?(state.today||{}):rangeRow(dayAgo(-i)); if(!d)break; const s=Number(d.sleep); if(s&&s<h)n++; else break; } return n; }

/* game-calendar nudges (Creator side only — respects the OS separation rule):
   things leaving soon (uses endDate) + things worth pre-farming (upcoming start date). */
function gameDeadlineObs(){
  const O=[]; const seen=new Set();
  (state.sentinel.calendarEvents||[]).filter(gameSrc).forEach(e=>{
    if(!e||!e.date)return; const end=e.endDate||null;
    // a live, multi-day event that's about to end — "finish it before it's gone"
    if(end&&end>e.date&&e.date<=TODAY&&end>=TODAY){
      const left=daysBetween(TODAY,end);
      if(left>=0&&left<=7){ seen.add(e.id);
        const span=left===0?"today is the last day":left===1?"1 day left":left+" days left";
        O.push({t:`${e.title} leaves soon — ${span}. ⏳`,
          focus:{t:`Finish the ${e.title} before it leaves soon — ${span}. ⏳`,tab:"calendar"}}); }
    }
    // an upcoming debut / new banner worth pre-farming (start 8–21 days out)
    if(e.date>TODAY&&!seen.has(e.id)){
      const d=daysBetween(TODAY,e.date);
      if(d>=8&&d<=21){ const when=d>=13?Math.round(d/7)+" weeks":d+" days";
        O.push({t:`${e.title} debuts in ${when}. 🌱`,
          focus:{t:`Maybe pre-farm for ${e.title} — it debuts in about ${when}. 🌱`,tab:"calendar"}}); }
    }
  });
  return O;
}

/* anchor: a single best nudge from what's still open today, so Suggested focus + Kiko
   noticed are NEVER empty in either OS — always a "where am I headed today" idea. */
function anchorFocus(mode){
  const byEnergy=a=>({low:0,med:1,high:2}[(a&&a.energy)||"med"]);
  if(mode==="creator"){
    const gw=(state.sentinel.goalsWeek||[]).filter(g=>g&&!g.done);
    if(gw.length) return {t:`${gw.length} weekly goal${gw.length>1?"s":""} still open. 🌷`,focus:{t:`A tiny step on “${gw[0].text}” would move the week forward. 🌷`,tab:"planner"}};
    const cg=cgoalsList(), cc=(state.today||{}).cgoals||{}; const left=cg.filter(g=>!cc[g.id]).sort((a,b)=>byEnergy(a)-byEnergy(b));
    if(left.length) return {t:`${left.length} daily goal${left.length>1?"s":""} left for today. 🎯`,focus:{t:`Start with the easy one: “${left[0].text}”. 🎯`,seed:`help me take the first tiny step on: ${left[0].text}`}};
    const ci=CI_DEFS.creator.filter(d=>!ciOn(d[0]));
    if(ci.length) return {t:`A few check-ins are still open today. 🌸`,focus:{t:`One gentle thing for today: ${ci[0][2]}. ${ci[0][1]}`,seed:`cheer me on to ${ci[0][2].toLowerCase()} today`}};
    return {t:`Everything's checked off today — lovely. ✨`,focus:{t:`Follow your joy today — what's one small thing you'd love to make? ✨`,seed:"suggest one small joyful creative thing I could do today"}};
  } else {
    const hl=habitsList(), hc=(state.today||{}).habits||{}; const left=hl.filter(h=>!hc[h.id]).sort((a,b)=>byEnergy(a)-byEnergy(b));
    if(left.length) return {t:`${left.length} daily habit${left.length>1?"s":""} left for today. ✅`,focus:{t:`Start small: “${left[0].text}”. ✅`,seed:`help me take the first tiny step on: ${left[0].text}`}};
    const ci=CI_DEFS.health.filter(d=>!ciOn(d[0]));
    if(ci.length) return {t:`A few check-ins are still open today. 🌸`,focus:{t:`One gentle thing for today: ${ci[0][2]}. ${ci[0][1]}`,seed:`cheer me on to ${ci[0][2].toLowerCase()} today`}};
    return {t:`Every habit's done today — rest is productive too. 🌙`,focus:{t:`You're all caught up — a slow, kind evening counts as a win. 🌙`,seed:"suggest a gentle relaxing way to wind down tonight"}};
  }
}

/* ── Kiko noticed: trends, correlations & observations (NOT to-dos) ── */
function kikoNoticed(mode){
  const prio=[], O=[];
  try{ kikoCorrelations(mode).forEach(o=>prio.push(o)); }catch(e){}
  if(mode==="creator"){
    // peek at today's health data to make observations feel personal
    const _m=state.today.mind||{}, _sl=Number(state.today.sleep||0);
    const _energy=_m.energy, _mood=_m.mood;
    // ── streak / week observations ──
    try{ const wkS=ciWeek("streamed"); if(wkS>=3) O.push({t:`You've streamed ${wkS} days this week — lovely momentum! 💜`}); }catch(e){}
    try{ const wkA=ciWeek("madeArt"); if(wkA>=3) O.push({t:`You've made art ${wkA} days this week — your hands have been really busy! 🎨`}); }catch(e){}
    try{ const wkY=ciWeek("ytShort")+ciWeek("ytVideo"); if(wkY>=2) O.push({t:`You've uploaded ${wkY} times to YouTube this week — staying visible! ▶️`}); }catch(e){}
    try{ const gl=(state.sentinel.goalsWeek||[]); const done=gl.filter(g=>g&&g.done).length; if(gl.length&&done&&done>=Math.ceil(gl.length/2)) O.push({t:`You've cleared ${done}/${gl.length} weekly goals — over halfway. 🌷`}); }catch(e){}
    // ── cross-data: energy/mood × creator activity ──
    try{ const dArt=ciDays("madeArt");
      if(dArt!=null&&dArt>=5&&_energy>=4) O.push({t:`Kiko noticed you haven't drawn in ${dArt} days — but your energy is at ${_energy}/5 today! Great time to pick up that pencil and draw something cute. 🎨`});
      else if(dArt!=null&&dArt>=5&&_mood>=4) O.push({t:`No art in ${dArt} days, and your mood is looking bright today — sounds like the perfect excuse to doodle something. 🌸`});
      else if(dArt!=null&&dArt>=7) O.push({t:`It's been ${dArt} days since you last drew something — even a tiny sketch counts! 🎨`}); }catch(e){}
    try{ const dSh=ciDays("ytShort");
      if(dSh!=null&&dSh>=7&&_energy>=3) O.push({t:`Shorts have been quiet for ${dSh} days — energy looks okay today, even a quick clip from a VOD would do! 🎬`}); }catch(e){}
    try{ if(_energy!=null&&_energy<=1) O.push({t:`Energy's low today — Kiko says: rest IS part of the creative process. A good nap makes better art than a burnt-out stream. 🌙`}); }catch(e){}
    // ── affirmation fallback so creator Kiko noticed is never empty ──
    if(!O.length&&!prio.length){
      const AFF=["You're building something real, one stream and one drawing at a time. Kiko believes in you. 🌸","Consistency beats perfection — showing up counts, even on slow days. 💜","Kiko noticed you're still here and still creating. That's the whole thing. ✨","Rest days are part of the creative schedule too. Recharge, come back stronger. 🦊","Your audience loves you for showing up as yourself. Keep doing that. 💗","Small channels with big hearts grow into something beautiful. This is that story. 🌱","Every piece of art, every stream, every short — it's all adding up. 🎨"];
      O.push({t:AFF[Math.floor(Date.now()/86400000)%AFF.length]}); }
  } else {
    try{ const wl=(state.sentinel.weightLog||[]).filter(x=>x&&x.w!=null).slice().sort(cmpDate); const u=CONFIG.weightUnit||"kg";
      if(wl.length>=2){ const d2=wl[wl.length-1].w-wl[wl.length-2].w;
        if(d2>=0.3) O.push({t:`Your weight is up ${d2.toFixed(1)} ${u} since your last weigh-in — day-to-day wobble is completely normal. ⚖️`});
        else if(d2<=-0.3) O.push({t:`Down ${Math.abs(d2).toFixed(1)} ${u} since your last weigh-in. 🌱`}); } }catch(e){}
    try{ const wl2=(state.sentinel.weightLog||[]).filter(x=>x).slice().sort(cmpDate);
      const mu=wl2.filter(x=>x.muscle!=null), fa=wl2.filter(x=>x.fat!=null);
      if(mu.length>=2&&mu[mu.length-1].muscle>mu[0].muscle+0.2) O.push({t:`Your muscle is trending up since ${fmtDate(mu[0].date)}. 💪`});
      if(fa.length>=2&&fa[fa.length-1].fat<fa[0].fat-0.3) O.push({t:`Your body-fat % is trending down — the work is showing. 🌱`}); }catch(e){}
    // anticipatory (Tier 3C down-payment): gentle forward-looking note from a robust pattern
    try{ if(sleepStreakUnder(7)>=2) O.push({t:`Two short nights in a row — your energy often runs lower the day after, so today's a kind, gentle-pace day. 🌙`}); }catch(e){}
    try{ const inj=(state.sentinel.injectionLog||[]).slice().sort(cmpDate); if(inj.length){ const nd=new Date(inj[inj.length-1].date+"T00:00"); nd.setDate(nd.getDate()+7); const di=daysBetween(TODAY,nd.toLocaleDateString("en-CA"));
      if(di===0) O.push({t:`Today is your Mounjaro day. 💉`});
      else if(di===1) O.push({t:`Your next Mounjaro shot is tomorrow. 💉`}); } }catch(e){}
    try{ const c=state.sentinel.cycle||{}; if(c.lastStart){ const dx=daysBetween(c.lastStart,TODAY); if(dx>=45) O.push({t:`${dx} days since your last period — common with PCOS, but worth a gentle note for your doctor. 🌙`}); } }catch(e){}
    try{ const hl=habitsList(), hc=(state.today||{}).habits||{}; if(hl.length&&hl.every(h=>hc[h.id])) O.push({t:`All your daily habits are done today — lovely. ✨`}); }catch(e){}
    // ── Day-1 observations: fire from today's logged data alone ──
    try{ const m=state.today.mind||{};
      if(m.energy!=null){ if(m.energy<=1) O.push({t:`Energy is at ${m.energy}/5 today — a rest-and-recover day. No pressure to push through. 🌙`});
        else if(m.energy>=4) O.push({t:`Energy at ${m.energy}/5 today — a good day to tackle something you've been putting off! ⚡`}); }
      if(m.mood!=null&&m.mood<=1) O.push({t:`Mood is low today (${m.mood}/5) — Kiko sees you. You don't have to be "on" right now. 💜`});
      if(m.anxiety!=null&&m.anxiety<=1) O.push({t:`Anxiety's high today — try to keep the to-do list short and be extra gentle with yourself. 🫂`}); }catch(e){}
    try{ const mj=state.today.mounjaro||{};
      if(mj.nausea!=null&&mj.nausea<=1) O.push({t:`Nausea's rough today — bland foods, slow sips, and small portions are your best friends right now. 💗`});
      else if(mj.nausea!=null&&mj.nausea>=4) O.push({t:`Low nausea today — a good sign. Note what you ate so you can repeat it! 🥄`});
      if(mj.foodnoise!=null&&mj.foodnoise<=1) O.push({t:`Food noise is loud today — that's the PCOS talking, not hunger. A high-protein snack can help quiet it. 🍩`}); }catch(e){}
    try{ const sl=Number(state.today.sleep||0); if(sl>=1){
      if(sl<6) O.push({t:`Only ${sl} hour${sl!==1?"s":""} of sleep last night — your body may feel it today. A gentle pace is a smart pace. 🌙`});
      else if(sl>=8) O.push({t:`${sl} hours of sleep — well rested! That tends to carry into your energy and mood today. 💤`}); } }catch(e){}
    try{ const w40=water40(), goal=CUPS_PER_40OZ*2;
      if(w40>=goal) O.push({t:`Water goal hit today — that directly helps with nausea and food noise. Great job! 🥤`});
      else if(w40===0&&new Date().getHours()>=14) O.push({t:`No water logged yet today — even one 40oz now makes a difference for nausea and energy. 💧`}); }catch(e){}
    // ── Affirmation fallback: so the card is NEVER empty ──
    if(!O.length&&!prio.length){
      const AFF=["Managing PCOS and Mounjaro while creating is genuinely hard work. You're doing it. 💜","Every check-in you log is a gift to future-you — Kiko is keeping it safe. ✨","Rest is part of the plan, not a detour from it. 🌙","Your body is doing a lot right now. Be kind to it today. 💗","Small consistent days build the life you're after. You're already in it. 🌱","Kiko is proud of you for showing up, even on the hard ones. 🦊","You are allowed to have a low-output day and still count it as a win. 🌸"];
      O.push({t:AFF[Math.floor(Date.now()/86400000)%AFF.length]}); }
  }
  return [...prio,...O].slice(0,6);
}

/* evergreen 5-minute creator nudges — fill Suggested focus when there's no specific
   gap, so the creator side always has real content work to reach for (never game beats).
   Grounded in the Growth Playbook: X rewards replies/conversation, short-form clips that
   travel, sponsor outreach, collabs, pinned posts. Rotates daily so it stays fresh. */
const EVERGREEN_CREATOR=[
  {t:"Spend 5 minutes drafting an X post — replies and conversations are what the algorithm rewards now. 🐦",seed:"help me draft a quick, engaging X/Twitter post for today",cat:"x-post"},
  {t:"Spend 5 minutes drafting a short script from a recent stream moment. 🎬",seed:"help me draft a 30-second short script from a recent stream moment",cat:"short-script"},
  {t:"Spend 5 minutes hunting for one new sponsor to reach out to. 🤝",seed:"help me find one new sponsor to reach out to and draft a short pitch",cat:"sponsors"},
  {t:"Reply to a few people on X for 5 minutes — returning fans bring the most traction. 💬",seed:"give me a quick 5-minute X engagement plan for today",cat:"x-engage"},
  {t:"Reach out to one creator about a possible collab. 💜",seed:"help me draft a friendly collab message to another VTuber",cat:"collab"},
  {t:"Refresh a pinned post or your tip menu. 📌",seed:"help me refresh my pinned posts and tip menu",cat:"pinned"},
  {t:"Draft one clip idea that would travel beyond VTuber circles. ✂️",seed:"brainstorm a clip idea that would land with people who've never heard of VTubing",cat:"clip"},
  {t:"Check in with your editors or reply to a couple of emails. ✉️",seed:"help me draft a quick check-in to my editors",cat:"email"},
  {t:"Peek at the Growth Playbook for one fresh idea to try. 🌱",link:"https://creatorhub.eggieweggie.ca/growth.html",cat:"playbook"},
];

/* ── behavioural learning: Kiko watches which focus categories Mifu actually taps and
   floats those up over time (recency-weighted). No labels, no retraining — just what she
   does. (Tier 1B from KIKO-INTELLIGENCE-RESEARCH-2026-06-14.md.) ── */
function focusAff(){ return (state.sentinel&&state.sentinel.focusAffinity)||{}; }

function focusScore(cat){ if(!cat)return 0; const a=focusAff()[cat]; if(!a)return 0;
  const n=a.n||0; const d=a.last?Math.max(0,daysBetween(a.last,TODAY)):999;
  const rec=d<=3?1.6:d<=10?1.3:d<=30?1:0.7;   // recent taps weigh more than old ones
  return n*rec; }

function evergreenCreatorFocus(n, existing){
  const have=new Set((existing||[]).map(o=>o&&o.t)); const out=[];
  const doy=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/86400000), len=EVERGREEN_CREATOR.length;
  // her most-engaged content types first; among ties rotate by day so it stays fresh
  const pool=EVERGREEN_CREATOR.map((it,idx)=>({it,idx})).sort((a,b)=> focusScore(b.it.cat)-focusScore(a.it.cat) || ((a.idx+doy)%len)-((b.idx+doy)%len));
  for(const p of pool){ if(out.length>=n)break; if(!have.has(p.it.t)){ out.push(p.it); have.add(p.it.t); } }
  return out;
}

/* ── Suggested focus: actionable nudges from trends & gaps (content + health) ── */
function suggestedFocus(mode){
  const prio=[], F=[]; const push=f=>{ if(f&&f.t)F.push(f); };
  if(mode==="creator"){
    // 🎬 a stream is scheduled today but prep isn't finished → top priority
    try{ const slot=todayStreamSlot(); if(slot){ const c=state.today.streamPrep||{}; const left=streamPrepList().filter(p=>!c[p.id]).length;
      if(left>0) push({t:`${slot.show||slot.text||"Your stream"} is today${slot.time?" at "+slot.time:""} — ${left} stream-prep item${left>1?"s":""} left. Finish before going live. 🎬`,tab:"home",cat:"stream",urgent:true}); } }catch(e){}
    // ⏳ only surface a game event if it ends TODAY — one compact nudge max, rest lives on Gachas page
    try{ const todayEvs=gameDeadlineObs().filter(o=>o&&o.focus&&/today is the last day/i.test(o.focus.t)); if(todayEvs.length) push({...todayEvs[0].focus,cat:"game",t:`${todayEvs[0].focus.t} → Open Gachas for more.`}); }catch(e){}
    // game pre-farm beats live only in the Game Updates box — content work goes here
    const dArt=ciDays("madeArt"); if(dArt!=null&&dArt>=7) push({t:"You haven't drawn in a while — maybe it's time to make some art together! 🎨",tab:"art",cat:"art"});
    const dYt=ciDays("ytVideo"); if(dYt!=null&&dYt>=7) push({t:"It's been a while since a YouTube upload — want to check in with your editors? 🎥",seed:"help me draft a check-in message to my YouTube editors",cat:"youtube"});
    const dSh=ciDays("ytShort"); if(dSh!=null&&dSh>=7) push({t:"Shorts have been quiet — one clip from a recent VOD could be plenty! 🎬",tab:"script",cat:"shorts"});
    const dCv=ciDays("coverSong"); if(dCv!=null&&dCv>=7) push({t:"30 gentle minutes of cover-song progress today? 🎤",seed:"help me plan a 30-minute cover song session for today",cat:"music"});
    const dStr=ciDays("streamed"); if(dStr!=null&&dStr>=4) push({t:"It's been a few days since a stream — want to review this week's plans? 📺",tab:"optimize",cat:"stream"});
    const dEm=ciDays("emails"); if(dEm!=null&&dEm>=5) push({t:"You haven't replied to emails in a while — a gentle 15-minute triage? ✉️",seed:"help me do a gentle 15-minute email triage",cat:"email"});
    const dSp=ciDays("sponsors"); if(dSp!=null&&dSp>=7) push({t:"A quick look at sponsor opportunities? 🤝",tab:"money",cat:"sponsors"});
    try{ (state.sentinel.sponsors||[]).forEach(sp=>{ const nm=sp.name||sp.brand||"a sponsor"; if(sp.due&&sp.status!=="done"){ const dd=daysBetween(TODAY,sp.due);
      if(dd<0) push({t:`The ${nm} deliverable is overdue — want to sort it or push the date? 💼`,tab:"events",cat:"sponsors",urgent:true});
      else if(dd<=3) push({t:`A ${nm} deliverable is coming up — block a little time? 💼`,tab:"events",cat:"sponsors",urgent:true}); } }); }catch(e){}
    try{ const gw=(state.sentinel.goalsWeek||[]).filter(g=>!g.done); if(gw.length) push({t:`You've got ${gw.length} weekly goal${gw.length>1?"s":""} open — pick one tiny next step? 🌷`,tab:"planner",cat:"goals"}); }catch(e){}
  } else {
    try{ const tg=foodTargets(); const tt=foodTotals(); const y=rangeRow(dayAgo(-1));
      const yp=y&&Array.isArray(y.food)&&y.food.length?y.food.reduce((a,f)=>a+Number(f.protein||0),0):null;
      if(foodToday().length&&tt.protein<tg.protein&&yp!=null&&yp<tg.protein) push({t:"Protein's been low a couple of days — try adding more protein-rich meals today! 🥣",tab:"food",cat:"protein"});
      else if(foodToday().length&&tt.protein<tg.protein*0.6) push({t:"Protein's running low today — a protein-y snack could help! 🥣",tab:"food",cat:"protein"});
    }catch(e){}
    const dG=ciDays("gym"); if(dG!=null&&dG>=3) push({t:"It's been a few days since the gym — how about a quick workout today? 💪",seed:"suggest a gentle quick workout for today",cat:"gym"});
    const sl=sleepStreakUnder(7);
    if(sl>=2) push({t:"Your sleep's been under 7 hours — try winding down a bit earlier tonight. 🌙",tab:"care",cat:"sleep"});
    else { const s0=Number((state.today||{}).sleep); if(s0&&s0<7) push({t:"A short night — maybe an earlier wind-down tonight? 🌙",tab:"care",cat:"sleep"}); }
    const dW=ciDays("walk"); if(dW!=null&&dW>=3) push({t:"A tiny 10-minute walk today? It absolutely counts! 🚶",seed:"motivate me for a tiny 10-minute walk",cat:"walk"});
    try{ const avg=waterWeekAvg(); const goal=CUPS_PER_40OZ*2; if(avg!=null&&avg<goal*0.6) push({t:"Water's been low this week — a glass right now is a lovely start! 💧",tab:"food",cat:"water"}); }catch(e){}
    try{ const inj=(state.sentinel.injectionLog||[]).slice().sort(cmpDate); if(inj.length){ const nd=new Date(inj[inj.length-1].date+"T00:00"); nd.setDate(nd.getDate()+7); const di=daysBetween(TODAY,nd.toLocaleDateString("en-CA"));
      if(di===0) push({t:"It's your Mounjaro day — want a reminder for tonight and a fresh injection site? 💉",seed:"remind me to take my Mounjaro shot tonight",cat:"meds",urgent:true}); } }catch(e){}
    try{ const je=(state.sentinel.journalEntries||[]).map(e=>e.date); (state.range||[]).forEach(r=>{ if(r&&r.notes&&r.notes.journal&&String(r.notes.journal).trim())je.push(r.date); }); if((state.today||{}).journal&&String(state.today.journal).trim())je.push(TODAY);
      const lastJ=je.length?je.sort()[je.length-1]:null; const dj=lastJ?daysBetween(lastJ,TODAY):null;
      if(dj==null||dj>=5) push({t:"A soft journal entry might feel nice — want to do one with Kiko? 📓",seed:"let's journal",cat:"journal"}); }catch(e){}
    try{ const tg=foodTargets(), tt=foodTotals(); if(foodToday().length&&tt.fiber<tg.fiber*0.5) push({t:"Fibre's running low today — psyllium or some veggies could help. 🌿",tab:"food",cat:"fiber"}); }catch(e){}
    try{ (state.sentinel.medsList||[]).forEach(m=>{ if(m.refill){ const dd=daysBetween(TODAY,m.refill); if(dd>=0&&dd<=5) push({t:`Your ${m.name} refill is coming up — worth sorting before you run low. 💊`,tab:"settings",cat:"meds",urgent:true}); } }); }catch(e){}
  }
  // 🗒️ planner task nudges — energy-aware, shown in both OS modes
  try{ const _pt=(state.sentinel.tasks||[]).filter(t=>!t.done);
    const _el=state.energyLevel||"medium";
    const _ov=_pt.filter(t=>t.due&&t.due<TODAY);
    const _td=_pt.filter(t=>t.due===TODAY);
    const _urg=_pt.filter(t=>(t.priority||"medium")==="urgent"&&!_ov.some(x=>x.id===t.id)&&!_td.some(x=>x.id===t.id));
    if(_ov.length) prio.push({t:`You have ${_ov.length} overdue task${_ov.length>1?"s":""} — start there first. 📋`,tab:"planner",cat:"planner",urgent:true});
    else if(_td.length) F.push({t:`${_td.length} task${_td.length>1?"s":""} due today. 📌`,tab:"planner",cat:"planner"});
    else if(_urg.length) F.push({t:`${_urg.length} urgent task${_urg.length>1?"s":""} waiting for attention. 🔥`,tab:"planner",cat:"planner"});
    else if(_el!=="high"){ const _m=_pt.filter(t=>normEnergy(t.energy||t.spoon)===_el); if(_m.length) F.push({t:`${_m.length} ${_el}-energy task${_m.length>1?"s":""} ready for today. ⚡`,tab:"planner",cat:"planner"}); }
  }catch(e){}
  // NOTE: things Mifu tells Kiko (kikoMemory) are CONTEXT, not tasks — they must never be echoed
  // here as Suggested Focus items. Suggested Focus only ever shows actionable, data-driven nudges.
  // learn from what she taps: float her engaged categories up; urgent/time-sensitive stay first
  const Fr=F.map((f,i)=>({f,i})).sort((a,b)=> (a.f.urgent?0:1)-(b.f.urgent?0:1) || focusScore(b.f.cat)-focusScore(a.f.cat) || a.i-b.i).map(x=>x.f);
  let out=[...prio,...Fr];
  // creator: top up with evergreen 5-minute content ideas so there's always real work here
  if(mode==="creator"&&out.length<3){ try{ evergreenCreatorFocus(3-out.length,out).forEach(f=>out.push(f)); }catch(e){} }
  out=out.slice(0,3);
  // never leave Suggested focus empty — anchor to today's open work
  if(!out.length){ try{ const a=anchorFocus(mode); if(a&&a.focus)out.push({...a.focus,cat:"anchor"}); }catch(e){} }
  return out;
}

function glanceHeader(){ const d=logicalDisplayDate().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"Europe/Amsterdam"});
  return `<div class="glance-head"><span class="glance-fox">🦊</span><div><h2>${greeting()}, ${esc(CONFIG.creator.name)}! 🌸</h2><div class="label" style="margin-top:3px">${d} • Today at a Glance</div></div></div>`; }

/* ===== Quick Notices — recent, actionable status with a tiny next step (lives up top) ===== */
function quickNotices(mode){
  const O=[]; const wkISO=mondayOf(new Date(TODAY+"T00:00")).toLocaleDateString("en-CA");
  if(mode==="creator"){
    try{ const slot=todayStreamSlot(); if(slot){ const c=state.today.streamPrep||{}, list=streamPrepList(), dn=list.filter(p=>c[p.id]).length; if(dn<list.length) O.push({t:`Stream today — ${dn}/${list.length} prep done.`,sub:"Finish before going live.",tab:"home"}); } }catch(e){}
    try{ const gl=gachaList(), gc=state.today.gacha||{}, dn=gl.filter(g=>gc[g.id]).length; if(gl.length&&dn<gl.length) O.push({t:`Gacha dailies: ${dn}/${gl.length} done.`,sub:"A few left to clear.",tab:"gachas"}); }catch(e){}
    try{ const gr=cgrowthList(), gc=state.today.cgrowth||{}, dn=gr.filter(h=>gc[h.id]).length; if(dn===0) O.push({t:`No creator-growth action yet today.`,sub:"Pick one low-energy one.",tab:"home"}); }catch(e){}
    try{ const ends=(state.sentinel.calendarEvents||[]).filter(gameSrc).filter(e=>e&&e.endDate&&e.endDate>=TODAY&&e.date<=TODAY&&daysBetween(TODAY,e.endDate)<=2); if(ends.length) O.push({t:`${ends.length} game event${ends.length>1?"s":""} ending soon.`,sub:"Do them before they disappear.",tab:"calendar"}); }catch(e){}
    try{ const vault=(state.sentinel.sparkVault||[]); if(!vault.some(x=>x&&x.date&&x.date>=wkISO)) O.push({t:`No new stream idea saved this week.`,sub:"Tap Creator Spark for one.",tab:"home"}); }catch(e){}
  } else {
    try{ const hl=habitsList(), hc=state.today.habits||{}, dn=hl.filter(h=>hc[h.id]).length; if(hl.length&&dn<hl.length) O.push({t:`Daily habits: ${dn}/${hl.length} done.`,sub:"Tick what you've done.",tab:"home"}); }catch(e){}
    try{ const cups=waterCups(), goal=CUPS_PER_40OZ*2; if(cups<goal*0.5) O.push({t:`Water's low so far today.`,sub:"A glass now is a lovely start.",tab:"food"}); }catch(e){}
    try{ const meds=(state.sentinel.medsList||[]), mt=state.today.medsTaken||{}, dn=meds.filter(m=>mt[m.id]).length; if(meds.length&&dn<meds.length) O.push({t:`Meds: ${dn}/${meds.length} taken today.`,tab:"food"}); }catch(e){}
  }
  return O.slice(0,4);
}

function quickNoticesCard(){ const Q=quickNotices(OS_MODE==="health"?"health":"creator");
  return `<div class="gcard" style="padding:12px 14px"><div style="font-size:10px;font-weight:700;color:var(--muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:8px">⚡ Notices</div>
    ${Q.length?Q.map(o=>`<button class="focus-row" data-act="focusGo" ${o.tab?`data-tab="${o.tab}"`:""}><span class="kn-dot" style="background:var(--lav-deep)"></span><span class="grow" style="text-align:left;font-size:12.5px">${esc(o.t)}${o.sub?`<br><span class="soft" style="font-size:11px">${esc(o.sub)}</span>`:""}</span>${o.tab?'<span class="fr-chev">›</span>':''}</button>`).join(""):`<p class="soft" style="font-size:12px;margin:0">All caught up — nothing needs you right now. ✨</p>`}</div>`;
}

/* ===== Kiko noticed — reflective observations (lives lower on the page) ===== */
function deepPatternsCard(){ const N=kikoNoticed(OS_MODE==="health"?"health":"creator");
  return `<section class="panel"><div class="card-head"><span class="label">🦊 Kiko noticed</span></div>
    <p class="soft" style="font-size:11px;margin:0 0 8px">Things Kiko is keeping an eye on for you. 💜</p>
    ${N.length?N.map(o=>`<div class="kn-row"><span class="kn-dot"></span><span>${esc(o.t)}</span></div>`).join(""):`<p class="soft" style="font-size:12.5px;margin:0">All caught up — Kiko's watching and will flag things as they come. ❄️</p>`}</section>`;
}

function focusCard(F){ F=(F||[]).slice(0,3);
  return `<div class="gcard" style="padding:12px 14px">
    <div style="font-size:10px;font-weight:700;color:var(--muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:8px">✦ Focus</div>
    ${F.length?F.map(o=>`<button class="focus-row" data-act="focusGo" ${o.tab?`data-tab="${o.tab}"`:""} ${o.seed?`data-seed="${esc(o.seed)}"`:""} ${o.link?`data-link="${esc(o.link)}"`:""} ${o.cat?`data-cat="${esc(o.cat)}"`:""}><span class="kn-dot" style="background:var(--sakura-deep)"></span><span class="grow" style="text-align:left;font-size:12.5px">${esc(o.t)}</span>${(o.tab||o.seed||o.link)?'<span class="fr-chev">›</span>':''}</button>`).join(""):`<p class="soft" style="font-size:12px;margin:0">No nudges today — follow your joy. ✨</p>`}
  </div>`; }

function hsBar(l,v,p,grad){ p=Math.max(0,Math.min(1,p||0));
  return `<div class="hs-row"><span class="hs-l">${l}</span><span class="hs-v num">${v}</span><span class="hs-bar"><span style="width:${Math.round(p*100)}%;background:${grad}"></span></span></div>`; }

function healthSnapshotCard(){
  const rows=[]; const u=CONFIG.weightUnit||"kg";
  const wl=(state.sentinel.weightLog||[]).filter(x=>x&&x.w!=null).slice().sort(cmpDate);
  if(wl.length>=2){ const d2=wl[wl.length-1].w-wl[wl.length-2].w;
    rows.push(`<div class="hs-row"><span class="hs-l">Weight Trend</span><span class="hs-v" style="color:${d2>0.05?'#c0566a':d2<-0.05?'#2f9d79':'var(--ink-soft)'}">${Math.abs(d2)<0.05?"steady →":(d2>0?"Up ":"Down ")+Math.abs(d2).toFixed(1)+" "+u+(d2>0?" ↑":" ↓")}</span></div>`); }
  else if(wl.length===1) rows.push(`<div class="hs-row"><span class="hs-l">Weight</span><span class="hs-v">${wl[0].w} ${u}</span></div>`);
  try{ if(foodToday().length){ const tg=foodTargets(), tt=foodTotals(); rows.push(hsBar("Protein Goal",Math.round(tt.protein)+" / "+tg.protein+"g",tt.protein/tg.protein,"linear-gradient(90deg,var(--sakura),var(--sakura-deep))")); } }catch(e){}
  const cups=waterCups(), goalC=CUPS_PER_40OZ*2, L=c=>(c*0.2366);
  rows.push(hsBar("Water Intake",L(cups).toFixed(1)+" / "+L(goalC).toFixed(1)+" L",cups/goalC,"linear-gradient(90deg,var(--ice),var(--peri))"));
  const meds=(state.sentinel.medsList||[]); if(meds.length){ const mt=(state.today||{}).medsTaken||{}; const dn=meds.filter(m2=>mt[m2.id]).length; rows.push(hsBar("Meds Today",dn+" / "+meds.length,dn/meds.length,"linear-gradient(90deg,var(--lav),var(--lav-deep))")); }
  const sl=Number((state.today||{}).sleep); if(sl) rows.push(hsBar("Sleep",fmtSleep(sl),Math.min(1,sl/8),"linear-gradient(90deg,var(--lav),var(--peri))"));
  return `<div class="gcard"><div class="sec-label">💗 Today's health snapshot</div>
    ${rows.length?rows.join(""):'<p class="soft" style="font-size:12.5px;margin:0">Log a weigh-in, a meal, or some water and your snapshot appears here. ❄️</p>'}
    <button class="btn" data-act="tab" data-tab="trends" style="margin-top:10px">view full health stats →</button></div>`;
}

function cardThisWeek(){
  const rows=[];
  const isEnding=t=>/\bend\b|\bends\b|\bclos|\blast\s*day/i.test(t||'');
  const isBanner=t=>/banner|rerun/i.test(t||'');
  const isStream=src=>src==='stream'||src==='streamday';
  // birthdays in the next 14 days
  try{(state.sentinel.birthdays||[]).map(b=>({...b,...nextBirthdayInfo(b)})).filter(x=>x.days>=0&&x.days<=14).sort((a,b)=>a.days-b.days).forEach(b=>rows.push({days:b.days,date:b.date,icon:'🎂',text:`${esc(b.name)}'s birthday`,src:'bday'}));}catch(_){}
  // calendar events starting in next 14 days — no streams, no endings, no banners, deduplicated by title
  try{const seen=new Set();(state.sentinel.calendarEvents||[]).map(e=>({...e,days:daysBetween(TODAY,e.date)})).filter(e=>e.days>=0&&e.days<=14&&!isStream(e.src)&&!isEnding(e.title)&&!isBanner(e.title)).sort((a,b)=>a.days-b.days).forEach(e=>{const key=(e.title||'').toLowerCase().replace(/speculated|estimated|rumored|confirmed/g,'').replace(/[^a-z0-9]/g,'');if(seen.has(key))return;seen.add(key);rows.push({days:e.days,date:e.date,icon:gameSrc(e)?'🎮':'🌸',text:esc(e.title),src:e.src});});}catch(_){}
  rows.sort((a,b)=>a.days-b.days);
  return `<section class="panel">
    <div class="card-head"><span class="label">📅 Coming up</span><button class="btn" data-act="tab" data-tab="calendar">calendar →</button></div>
    ${rows.length?rows.slice(0,6).map(r=>`<div class="kn-row"><span style="font-size:15px;flex:none;line-height:1">${r.icon}</span><span class="grow" style="font-size:13px">${r.text}</span>${evTierChip(r.days,r.days===0,fmtDate(r.date))}</div>`).join(''):`<p class="soft" style="font-size:12.5px;margin:0">Nothing new in the next two weeks — enjoy the calm! ✨</p>`}
  </section>`;
}

/* today's stream from the calendar/schedule (matches the weekday slot) */
function todayStreamSlot(){ const wd=DOW_ORDER[(new Date().getDay()+6)%7];
  const slots=slotsForDate(new Date(TODAY+"T00:00"))||[]; return slots.find(s=>s.day===wd&&(s.show||s.text))||null; }

function cardContentOps(){
  const slot=todayStreamSlot(), ed=!!state.spEdit;
  if(slot){
    const show=slot.show||slot.text||"Stream"; const list=streamPrepList(); const checks=state.today.streamPrep||{};
    const done=list.filter(p=>checks[p.id]).length, total=list.length, pct=total?Math.round(done/total*100):0;
    return `<section class="panel">
      <div class="card-head"><span class="label">🎬 Stream prep</span><span style="display:flex;gap:6px;align-items:center"><span class="pill ${done===total&&total?'pill-mint':'pill-gray'}">${done}/${total}${done===total&&total?' ✦':''}</span><button class="btn" data-act="spEdit">${ed?'done':'edit'}</button></span></div>
      <div style="font-size:14px;margin-bottom:2px"><b>${esc(show)}</b> <span class="soft">· stream today${slot.time?" · "+esc(slot.time):""}</span></div>
      <p class="soft" style="font-size:11.5px;margin:0 0 8px">Let's get ready — tap each as you go 💜</p>
      <div class="ck-prog"><span style="width:${pct}%"></span></div>
      <div class="gt-list">${list.map(p=>`<button class="ck-row" data-act="streamPrepToggle" data-k="${p.id}"><span class="ck-box ${checks[p.id]?'on':''}">${checks[p.id]?'✓':''}</span><span class="ck-icon">${p.em||'📝'}</span><span class="ck-name ${checks[p.id]?'ck-donetxt':''}">${esc(p.text)}</span>${ed?`<span class="ck-del" data-act="delStreamPrep" data-v="${p.id}" title="remove">✕</span>`:''}</button>`).join("")}</div>
      ${ed?`<div class="gt-add"><input class="inp" id="spInput" placeholder="add a prep step…" value="${esc(state.spDraft||'')}"><button class="btn btn-grad" data-act="addStreamPrep">add</button></div>`:''}
    </section>`;
  }
  // not a stream day → off-stream content work (built-ins + custom)
  const extra=offStreamExtra(), xchecks=state.today.offStreamX||{};
  const total=OFFSTREAM_WORK.length+extra.length;
  const done=OFFSTREAM_WORK.filter(w=>ciOn(w[0])).length + extra.filter(e=>xchecks[e.id]).length;
  const pct=total?Math.round(done/total*100):0;
  return `<section class="panel">
    <div class="card-head"><span class="label">🌙 Off-stream prep</span><span style="display:flex;gap:6px;align-items:center"><span class="pill ${done===total&&total?'pill-mint':'pill-gray'}">${done}/${total}${done===total&&total?' ✦':''}</span><button class="btn" data-act="spEdit">${ed?'done':'edit'}</button></span></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">No stream today — a calm day for the behind-the-scenes work. 🌸</p>
    <div class="ck-prog"><span style="width:${pct}%"></span></div>
    <div class="gt-list">${OFFSTREAM_WORK.map(([k,em,l])=>`<button class="ck-row" data-act="ciToggle" data-k="${k}"><span class="ck-box ${ciOn(k)?'on':''}">${ciOn(k)?'✓':''}</span><span class="ck-icon">${em}</span><span class="ck-name ${ciOn(k)?'ck-donetxt':''}">${esc(l)}</span></button>`).join("")}${extra.map(e=>`<button class="ck-row" data-act="offStreamXToggle" data-k="${e.id}"><span class="ck-box ${xchecks[e.id]?'on':''}">${xchecks[e.id]?'✓':''}</span><span class="ck-icon">📝</span><span class="ck-name ${xchecks[e.id]?'ck-donetxt':''}">${esc(e.text)}</span>${ed?`<span class="ck-del" data-act="delOffStream" data-v="${e.id}" title="remove">✕</span>`:''}</button>`).join("")}</div>
    ${ed?`<div class="gt-add"><input class="inp" id="osInput" placeholder="add an off-stream task…" value="${esc(state.osDraft||'')}"><button class="btn btn-grad" data-act="addOffStream">add</button></div>`:''}
  </section>`;
}
