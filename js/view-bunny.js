/* ===== Bunny Health Trends (Idea #13) — daily check-ins → gentle trend analysis ===== */
const BUNNY_STATUS=[["great","😊 great"],["normal","🙂 normal"],["concern","⚠️ concern"],["vet","🏥 vet"]];

const BUNNY_FLAGS=[
  {field:"ate",    label:"Appetite", on:["yes","🥬 ate well"], off:["less","⚠️ ate less"]},
  {field:"poop",   label:"Poops",    on:["normal","💩 normal"], off:["off","⚠️ off"]},
  {field:"energy", label:"Energy",   on:["good","⚡ good"],      off:["low","😴 low"]},
];

/* gentle, non-alarmist patterns + rabbit-aware alerts from the bunny log */
function bunnyTrends(id){
  const name=(BUNNIES.find(b=>b.id===id)||{}).name||id;
  const log=(state.sentinel.bunnyLog||[]).filter(x=>x&&x.bunny===id).slice().sort(cmpDate);   // oldest→newest
  const lines=[], alerts=[];
  if(!log.length) return {lines,alerts,logged:0};
  const rev=log.slice().reverse(), today=log.find(x=>x.date===TODAY);
  let good=0; for(const e of rev){ const logged=e.status||e.ate||e.poop||e.energy; const ok=e.status==="great"||e.status==="normal"||(!e.status&&e.ate!=="less"&&e.poop!=="off"&&e.energy!=="low"); if(logged&&ok) good++; else break; }
  if(good>=3) lines.push(`${name} has been doing well ${good} days running 🌿`);
  let ate=0; for(const e of rev){ if(e.ate==="yes") ate++; else break; } if(ate>=5) lines.push(`${name}'s appetite has been good for ${ate} days.`);
  const concerns=rev.filter(e=>daysBetween(e.date,TODAY)<=14&&(e.status==="concern"||e.status==="vet")).length;
  if(concerns>=2) alerts.push(`${name} was marked concern/vet ${concerns}× in the last two weeks — worth a closer eye.`);
  const poopOff=rev.filter(e=>daysBetween(e.date,TODAY)<=7&&e.poop==="off").length;
  if(poopOff>=2) alerts.push(`${name}'s poops were marked off ${poopOff}× this week — monitor; lasting changes deserve a vet note.`);
  if(today){
    if(today.ate==="less") alerts.push(`${name} is eating less today. If a rabbit stops eating or pooping it can turn urgent fast — please watch closely. 💛`);
    if(today.energy==="low") lines.push(`${name}'s energy is marked low today.`);
  }
  const ago=daysBetween(rev[0].date,TODAY); if(ago>=3) lines.push(`No check-in for ${name} in ${ago} days — a quick tap keeps the trend honest.`);
  return {lines,alerts,logged:log.length};
}

/* per-bunny memory timeline: milestones + photos that mention this bunny by name */
function bunnyMemories(id){
  const name=(BUNNIES.find(b=>b.id===id)||{}).name||id; let re; try{ re=new RegExp("\\b"+name+"\\b","i"); }catch(e){ re=null; }
  const out=[];
  (state.sentinel.bunnyMilestones||[]).forEach(mi=>{ if(mi&&(mi.bunny===id||mi.bunny==="both")&&mi.date) out.push({date:mi.date,kind:"milestone",text:mi.text||""}); });
  (state.media||[]).forEach(m=>{ if(!m)return; const hay=(m.people||[]).join(" ")+" "+(m.caption||"")+" "+(m.title||""); if(re&&re.test(hay)) out.push({date:m.date||TODAY,kind:"photo",url:m.url,text:m.caption||"",id:m.id}); });
  return out.sort(cmpDate).reverse().slice(0,12);
}

function bunnyFlagChips(b){
  const day=bunnyStatusToday(b.id)||{};
  return BUNNY_FLAGS.map(f=>{ const cur=day[f.field];
    const btn=pair=>`<button class="chiptog ${cur===pair[0]?'on':''}" data-act="bunnyFlag" data-bunny="${b.id}" data-field="${f.field}" data-val="${pair[0]}">${pair[1]}</button>`;
    return `<div style="margin-top:6px"><div class="label" style="font-size:10px;margin-bottom:3px">${f.label}</div><div class="chiprow">${btn(f.on)}${btn(f.off)}</div></div>`;
  }).join("");
}

function viewBunny(){
  const allAlerts=BUNNIES.flatMap(b=>bunnyTrends(b.id).alerts);
  const intro=`<section class="panel"><div class="card-head"><h2 style="font-size:18px">🐰 Bunny hub</h2><button class="btn" data-act="tab" data-tab="memories">📸 Photos</button></div>
    <p class="soft" style="font-size:11.5px;margin:0">Myla &amp; Kieran's daily check-ins, gentle health trends, and your favourite moments — all in one place. One tap a day is plenty. 💗</p></section>`;
  const alertCard=allAlerts.length?`<section class="panel" style="border:1px solid var(--peach);background:rgba(243,169,120,.10)"><div class="label" style="margin-bottom:4px">💛 Gentle watch</div>${allAlerts.map(a=>`<p style="font-size:12.5px;margin:2px 0">${esc(a)}</p>`).join("")}</section>`:"";
  const cards=BUNNIES.map(b=>{ const st=bunnyStatusToday(b.id), nb=bunnyNextBday(b.born), tr=bunnyTrends(b.id);
    return `<div class="soft-card">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:16px;font-family:var(--display)">${b.name}</b><span class="soft" style="font-size:11px">${esc(b.sex)}</span></div>
      <div class="soft" style="font-size:12px">${esc(b.col)} · ${bunnyAge(b.born)} old</div>
      <div class="soft" style="font-size:11px;margin-top:2px">🎂 ${nb===0?"birthday today! 🎉":nb!=null?`birthday in ${nb} day${nb>1?"s":""}`:""}</div>
      <div class="label" style="margin:8px 0 4px">how is ${b.name} today?</div>
      <div class="chiprow">${BUNNY_STATUS.map(([v,l])=>`<button class="chiptog ${st&&st.status===v?'on':''}" data-act="bunnyStatus" data-bunny="${b.id}" data-status="${v}">${l}</button>`).join("")}</div>
      ${bunnyFlagChips(b)}
      ${tr.lines.length?`<div style="margin-top:8px">${tr.lines.map(l=>`<div class="kn-row"><span class="kn-dot"></span><span style="font-size:12px">${esc(l)}</span></div>`).join("")}</div>`:`<p class="soft" style="font-size:11px;margin:8px 0 0">Log a few days and Kiko will start noticing ${b.name}'s patterns. ❄️</p>`}
    </div>`; }).join("");
  const grid=`<section class="panel"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px">${cards}</div></section>`;
  const photos=`<section class="panel"><div class="card-head"><span class="label">📸 Recent bunny photos</span></div>${state.media===undefined?UI.spinner({label:"loading photos…"}):(function(){ const pics=(state.media||[]).filter(memIsBunny).slice().reverse().slice(0,8); return pics.length?`<div class="md-grid">${pics.map(m=>`<div class="md-tile"><img src="${esc(m.url)}" alt="${esc(m.caption||'bunny')}" loading="lazy" data-act="mediaView" data-id="${esc(m.id)}"></div>`).join("")}</div>`:`<p class="soft" style="font-size:12.5px;margin:0">No bunny photos yet — upload some in ✨ Memories and tag them Myla / Kieran. 🐰</p>`; })()}</section>`;
  const memBlocks=BUNNIES.map(b=>{ const mem=bunnyMemories(b.id); if(!mem.length) return "";
    return `<div style="margin-bottom:10px"><div class="label" style="margin-bottom:4px">${b.name}</div>${mem.map(x=>x.kind==="photo"
      ? `<div class="listrow"><span style="flex:0 0 auto" aria-hidden="true">📸</span><span class="grow" style="min-width:0"><span class="soft" style="font-size:11px">${esc(fmtDate(x.date))}</span><div style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.text||"photo")}</div></span><button class="btn" data-act="mediaView" data-id="${esc(x.id||"")}">view</button></div>`
      : `<div class="listrow"><span style="flex:0 0 auto" aria-hidden="true">🐰</span><span class="grow"><span class="soft" style="font-size:11px">${esc(fmtDate(x.date))}</span><div style="font-size:12.5px">${esc(x.text)}</div></span></div>`).join("")}</div>`; }).join("");
  const timelines=`<section class="panel"><div class="card-head"><span class="label">📖 Bunny memories</span></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><select class="inp" id="mileBunny" style="max-width:130px">${BUNNIES.map(b=>`<option value="${b.id}">${b.name}</option>`).join("")}<option value="both">Both 💕</option></select><input class="inp" id="mileText" placeholder="a bunny memory or milestone…" style="flex:1;min-width:150px"><button class="btn btn-grad" data-act="bunnyMilestone">add</button></div>
    ${memBlocks||`<p class="soft" style="font-size:12.5px;margin:0">🖤 Kieran born 3 Jan 2021 · 🩶 Myla born 28 Dec 2021 — add your favourite moments, and tag bunny photos in ✨ Memories to see them here.</p>`}
  </section>`;
  return `<div class="page">${alertCard}${intro}${grid}${photos}${timelines}</div>${DISCLAIMER}`;
}
