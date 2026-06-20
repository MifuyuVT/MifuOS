"use strict";
   // bump on EVERY change — the Settings chip ends "is it the fix or the cache?" forever
const CONFIG = {
  url: "https://hdkhoijkawwyfnjvsmdi.supabase.co",          // Supabase project URL — blank = demo mode
  anonKey: "sb_publishable_DovTvekKojWHLpSNHfZLjQ_C9Gn_LFs", // sb_publishable_... — blank = demo mode
  userId: "dba5e0b4-ec1c-455a-a93d-88b167b9ce26",
  creator: {
    name:"Mifu", fullName:"Yukitsune Mifuyu", emoji:"🦊", snow:"❄️",
    greeting:"Konfuyu~!", pronouns:"she/they",
    tagline:"your cute and chaotic Snowfox Shrine maiden",
  },
  palette:{ periwinkle:"#758ac6", blueLav:"#99a6d5", sakura:"#ff9ed8", orchid:"#c8a8ca",
            lavender:"#a98fe0", ice:"#f4f8ff", ink:"#3a3550", ringFrom:"#758ac6", ringTo:"#ff9ed8" },
  // Mounjaro reference (display/tracking only — NOT advice):
  mounjaro:{ doses:[2.5,5,7.5,10,12.5,15], maxDose:15, minWeeksBetweenIncreases:4,
             sites:["L abdomen","R abdomen","L thigh","R thigh","L upper arm","R upper arm"] },
  weightUnit:"kg",
  weightDisplay:"soft", // soft | numbers | hidden
  aiFn:"ai",            // Supabase Edge Function name powering the Optimize tab (keys live there, never here)
  kikoFn:"ChatGPT_KIKO_AI", // Kiko's Edge Function
  youtube:{ handle:"@mifuyu", url:"https://youtube.com/@mifuyu", channelId:"" },
  platforms:{ youtube:"YouTube", tiktok:"TikTok", instagram:"Instagram", twitter:"X", twitch:"Twitch" },
  // Pasted verbatim into generated descriptions — edit freely.
  descFooter: "🔗 Find me everywhere:\n▸ Twitch: https://twitch.tv/mifuyu\n▸ YouTube: https://youtube.com/@mifuyu\n▸ Discord: https://discord.gg/mifuyu\n▸ X / TikTok / Instagram: @mifuyuvt\n\n💜 GamerSupps — code MIFUYU for 10% off: https://gamersupps.gg/mifuyu",
  socials:[ ["Twitch","https://twitch.tv/mifuyu"],["YouTube","https://youtube.com/@mifuyu"],
            ["X","https://x.com/mifuyuvt"],["TikTok","https://www.tiktok.com/@mifuyuvt"],
            ["Instagram","https://www.instagram.com/mifuyuvt"],["Bluesky","https://bsky.app/profile/mifuyuvt.bsky.social"],
            ["Kick","https://kick.com/mifuyuvt"],["Discord","https://discord.gg/mifuyu"] ],
};


/* ===================== SUPABASE / DEMO ===================== */
const DEMO = !(CONFIG.url && CONFIG.anonKey);

let SB = null;
 // set in start() once the Supabase library has loaded (live mode only)
let UID = CONFIG.userId;
  // set to your real account id after login (see start())
const SENTINEL = "2000-01-01";

/* The "day" rolls over at 4:00 AM Europe/Amsterdam, not midnight — Mifu's a night owl,
   so anything she checks off at 12–1 AM still counts for the day she's mentally in.
   Trick: shift the real instant back 4h, then ask what Amsterdam calendar date that lands on. */
const DAY_ROLLOVER_HOURS = 4;

function logicalDateKey(d){ return new Date((d||new Date()).getTime() - DAY_ROLLOVER_HOURS*3600*1000).toLocaleDateString("en-CA",{timeZone:"Europe/Amsterdam"}); }
   // a Date whose Amsterdam date == the logical day, for headers
const TODAY = logicalDateKey();

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id"+Math.random().toString(36).slice(2));

const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const $ = s => document.querySelector(s);

function dayAgo(n){const d=new Date(TODAY+"T00:00");d.setDate(d.getDate()+n);return d.toLocaleDateString("en-CA");}

function daysBetween(a,b){ return Math.round((new Date(b)-new Date(a))/86400000); }

const cmpDate=(a,b)=>a.date<b.date?-1:a.date>b.date?1:0;
   // ascending, total-order (stable for equal dates) — single source for the date sort duplicated app-wide
function fmtDate(iso){ try{ return new Date(iso+"T00:00").toLocaleDateString(undefined,{month:'short',day:'numeric'}); }catch(e){ return iso; } }

/* strip Markdown so Kiko's chat shows clean plain text (keeps words + emojis) */
async function autoResearchGames(){
  if(DEMO||!SB) return;
  const isSunday=new Date(TODAY).getDay()===0;
  const vault=state.sentinel.sparkVault||[];
  const list=gachaList();
  // find games with no entry this week (Sunday = refresh all, other days = only fill missing)
  const needsResearch=list.filter(g=>{
    const entry=vault.find(v=>v.gid===g.id);
    if(!entry) return true;
    if(isSunday) return entry.date<TODAY; // Sunday: re-research if not already done today
    return false; // other days: only fill if completely missing (handled by !entry above)
  });
  if(!needsResearch.length) return;
  for(const g of needsResearch){
    try{
      const seed=pulsePrompt(g.name);
      const d=await kikoSimpleCall({question:seed,history:[],tab:'gachas',userModel:state.sentinel.kikoUserModel||'',smart:false});
      const ans=d.reply||'';
      if(ans) await setSent(n=>{ const v=(n.sparkVault||[]).filter(x=>x.gid!==g.id); return {...n,sparkVault:[...v,{id:'spark'+Date.now(),gid:g.id,text:ans,date:TODAY}]}; });
      await new Promise(r=>setTimeout(r,2000)); // small delay between games to avoid rate limits
    }catch(_){}
  }
  if(needsResearch.length) try{ render(); }catch(_){}
}

function stripMd(t){ return String(t==null?"":t)
  .replace(/```+/g,"")                       // code fences
  .replace(/(\*\*\*|___)(.*?)\1/g,"$2")      // bold+italic
  .replace(/(\*\*|__)(.*?)\1/g,"$2")         // bold
  .replace(/(\*|_)(.*?)\1/g,"$2")            // italic
  .replace(/~~(.*?)~~/g,"$1")                // strikethrough
  .replace(/`([^`]+)`/g,"$1")                // inline code
  .replace(/^\s{0,3}#{1,6}\s+/gm,"")         // # headers
  .replace(/^\s{0,3}>\s?/gm,"")              // blockquotes
  .replace(/^\s{0,3}[-*+]\s+/gm,"• ")        // bullet markers → clean bullet
  .replace(/\[([^\]]+)\]\([^)]+\)/g,"$1")    // [text](link) → text
  .trim(); }

function greeting(){ const h=new Date().getHours(); return h<5?"Late night":h<12?"Good morning":h<18?"Good afternoon":"Good evening"; }

function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),1700); }

/* ============================================================================
   UI — reusable, accessible component helpers (vanilla; each returns an HTML string).
   "Props" are a single options object. The CSS Foundation lifts existing markup
   automatically; these standardise loading/empty states and new controls.
   Docs: UI-COMPONENTS.md at the project root.
   ============================================================================ */
const _dataAttrs = d => d ? Object.entries(d).map(([k,v])=>` data-${esc(k)}="${esc(String(v))}"`).join("") : "";

/* tidy numeric formatting for meters/stats: 80.9 → "80.9", 110 → "110", 0.50 → "0.5" */
const _num = n => { const x = Number(n); if (!isFinite(x)) return "0"; return (Math.round(x*100)/100).toString(); };

const UI = {
  /* spinner({size:'sm'|'lg', label?}) — inline, announced to screen readers */
  spinner({ size, label } = {}) {
    return `<span class="loading-row" role="status" aria-live="polite"><span class="spinner${size==="lg"?" lg":""}" aria-hidden="true"></span>${label?`<span>${esc(label)}</span>`:`<span class="sr-only">Loading</span>`}</span>`;
  },
  /* skeleton({lines=3, width?}) — shimmer placeholder lines */
  skeleton({ lines = 3, width } = {}) {
    let h = ""; for (let i=0;i<lines;i++){ const w = i===lines-1 ? "70%" : (width||"100%"); h += `<div class="skeleton sk-line" style="width:${w}"></div>`; }
    return `<div aria-hidden="true">${h}</div>`;
  },
  /* skeletonCard({lines=3}) — a panel-shaped loading placeholder */
  skeletonCard({ lines = 3 } = {}) {
    return `<div class="panel sk-card" aria-busy="true" aria-hidden="true"><div class="skeleton sk-title"></div>${UI.skeleton({ lines })}</div>`;
  },
  /* empty({emoji,title,msg?,action?:{label,act,data?,variant?}}) — friendly empty state */
  empty({ emoji = "❄️", title = "Nothing here yet", msg = "", action } = {}) {
    const btn = action ? `<button class="btn${action.variant==="primary"?" btn-grad":""}" data-act="${esc(action.act)}"${_dataAttrs(action.data)}>${esc(action.label)}</button>` : "";
    return `<div class="empty"><span class="empty-emoji" aria-hidden="true">${emoji}</span><div class="empty-title">${esc(title)}</div>${msg?`<div class="empty-msg">${esc(msg)}</div>`:""}${btn}</div>`;
  },
  /* button({label,variant:'primary'|'ghost',icon?,act?,data?,ariaLabel?,loading?,disabled?}) */
  button({ label, variant = "ghost", icon, act, data, ariaLabel, loading, disabled } = {}) {
    const cls = variant === "primary" ? "btn btn-grad" : "btn";
    const inner = loading ? `<span class="spinner" aria-hidden="true"></span> ${esc(label||"")}` : `${icon?icon+" ":""}${esc(label||"")}`;
    return `<button class="${cls}"${act?` data-act="${esc(act)}"`:""}${_dataAttrs(data)}${ariaLabel?` aria-label="${esc(ariaLabel)}"`:""}${disabled?" disabled aria-disabled=\"true\"":""}${loading?" aria-busy=\"true\"":""}>${inner}</button>`;
  },
  /* iconButton({icon,act,data?,ariaLabel,title?}) — icon-only control (label is required for a11y) */
  iconButton({ icon, act, data, ariaLabel, title } = {}) {
    return `<button class="x" data-act="${esc(act)}"${_dataAttrs(data)} aria-label="${esc(ariaLabel||title||"")}"${title?` title="${esc(title)}"`:""}>${icon}</button>`;
  },
  /* pill({text, tone:'peri'|'sak'|'lav'|'mint'|'ice'|'gray'}) */
  pill({ text, tone = "gray" } = {}) { return `<span class="pill pill-${tone}">${esc(text)}</span>`; },
  /* field({label,id?,control,hint?}) — labelled form-control wrapper */
  field({ label, id, control, hint } = {}) {
    return `<div class="field">${label?`<label class="label"${id?` for="${esc(id)}"`:""}>${esc(label)}</label>`:""}${control||""}${hint?`<div class="soft" style="font-size:11px;margin-top:4px">${esc(hint)}</div>`:""}</div>`;
  },
  /* progress({value,max=100,label?,tone?:'peri'|'mint'|'sak'|'lav'|'peach',unit?,showValue=true,valueText?,indeterminate?})
     Accessible target meter (role=progressbar). Clamps value, handles over-target,
     completion, max<=0 / NaN (→ indeterminate), and exposes a human aria-valuetext. */
  progress({ value = 0, max = 100, label, tone = "peri", unit = "", showValue = true, valueText, indeterminate = false } = {}) {
    const m = Number(max) > 0 ? Number(max) : 0;
    let v = Number(value); if (!isFinite(v)) v = 0;
    const safeV = Math.max(0, v);
    const ind = indeterminate || m === 0;                       // unknown total → indeterminate bar
    const pct = ind ? 35 : Math.max(0, Math.min(100, (safeV / m) * 100));
    const over = !ind && v > m;                                 // exceeded the target
    const complete = !ind && !over && pct >= 100;
    const u = unit ? esc(unit) : "";
    const cls = `progress tone-${esc(tone)}${over?" is-over":""}${complete?" is-complete":""}${ind?" is-indeterminate":""}`;
    const headRight = (showValue && !ind)
      ? `<span class="progress-val"><b>${esc(_num(safeV))}</b>${u} / ${esc(_num(m))}${u}</span>` : "";
    const head = (label || headRight)
      ? `<div class="progress-head">${label?`<span class="progress-label">${esc(label)}</span>`:"<span></span>"}${headRight}</div>` : "";
    const human = valueText || (ind ? "Loading" : `${_num(safeV)}${unit?" "+unit:""} of ${_num(m)}${unit?" "+unit:""}`);
    const aria = ind
      ? `role="progressbar" aria-label="${esc(label||"Loading")}"`
      : `role="progressbar" aria-valuenow="${esc(_num(safeV))}" aria-valuemin="0" aria-valuemax="${esc(_num(m))}" aria-valuetext="${esc(human)}"${label?` aria-label="${esc(label)}"`:""}`;
    return `<div class="${cls}">${head}<div class="progress-track" ${aria}><div class="progress-fill" style="width:${pct}%"></div></div></div>`;
  },
  /* stat({label,value,unit?,delta?,deltaText?,good?:'up'|'down',icon?,hint?,loading?})
     Metric card body — value + optional trend chip. `good` says which direction is
     positive (e.g. weight → 'down'), colouring the delta green/amber; omit for neutral.
     A screen-reader phrase ("decreased") is attached so the arrow isn't the only cue. */
  stat({ label, value, unit, delta, deltaText, good, icon, hint, loading } = {}) {
    if (loading) {
      return `<div class="stat" aria-busy="true" aria-label="Loading ${esc(label||"stat")}"><div class="skeleton sk-line" style="width:42%;height:11px;margin:2px 0"></div><div class="skeleton" style="width:64%;height:26px;border-radius:9px;margin:8px 0 4px"></div></div>`;
    }
    let deltaHtml = "";
    if (delta !== undefined && delta !== null && delta !== "") {
      const dn = Number(delta);
      const dir = !isFinite(dn) ? "flat" : dn > 0 ? "up" : dn < 0 ? "down" : "flat";
      const tone = dir === "flat" ? "is-flat" : (good && good === dir) ? "is-good" : good ? "is-bad" : "";
      const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
      const shown = deltaText || (isFinite(dn) ? `${dn>0?"+":""}${_num(dn)}${unit?" "+unit:""}` : String(delta));
      const sr = dir === "up" ? "increased" : dir === "down" ? "decreased" : "no change";
      deltaHtml = `<span class="stat-delta ${tone}"><span aria-hidden="true">${arrow}</span>${esc(shown)}<span class="sr-only"> (${sr})</span></span>`;
    }
    return `<div class="stat"><span class="stat-label">${icon?`<span aria-hidden="true">${esc(icon)}</span>`:""}${esc(label||"")}</span>`
      + `<span class="stat-main"><span class="stat-value">${esc(value==null||value===""?"—":String(value))}</span>${unit?`<span class="stat-unit">${esc(unit)}</span>`:""}${deltaHtml}</span>`
      + `${hint?`<span class="stat-hint">${esc(hint)}</span>`:""}</div>`;
  },
  /* toggle({label?,on,act,data?,hint?,disabled?,ariaLabel?}) — accessible switch.
     Native <button role="switch"> ⇒ Space/Enter work for free; flip state in the
     data-act handler and re-render. Always carries an accessible name. */
  toggle({ label, on = false, act, data, hint, disabled, ariaLabel } = {}) {
    const name = ariaLabel || label || "toggle";
    const sw = `<button type="button" class="switch" role="switch" aria-checked="${on?"true":"false"}" aria-label="${esc(name)}"`
      + `${act?` data-act="${esc(act)}"`:""}${_dataAttrs(data)}${disabled?` disabled aria-disabled="true"`:""}></button>`;
    if (!label && !hint) return sw;
    return `<div class="switch-row"><span class="switch-text"><span class="switch-label">${esc(label||"")}</span>${hint?`<span class="switch-hint">${esc(hint)}</span>`:""}</span>${sw}</div>`;
  },
};


/* ===================== DEMO STORE ===================== */
function seedDemo(){
  const daily={}; const rnd=(a,b)=>Math.round(a+Math.random()*(b-a));
  for(let i=13;i>=0;i--){
    const d=dayAgo(-i);
    const protein=Math.random()>0.4, moved=Math.random()>0.45, water=rnd(3,9);
    let nausea=rnd(0,4); if(water>=6)nausea=Math.max(0,nausea-2); if(protein)nausea=Math.max(0,nausea-1);
    let cravings=rnd(1,5); if(moved)cravings=Math.max(0,cravings-2);
    const sleep=rnd(5,9); let mood=rnd(1,4); if(sleep>=7)mood=Math.min(5,mood+1);
    const anxiety=rnd(0,4); if(mood>3&&anxiety>3)mood=3;
    daily[d]={ energy:rnd(1,5),
      mind:{ mood, anxiety, energy:rnd(1,5), weather:rnd(1,5), kind:Math.random()>0.5 },
      pcos:{ fatigue:rnd(0,5), bloating:rnd(0,4), cravings, acne:rnd(0,3), shedding:rnd(0,2),
             moved, balanced:protein, protein, lowsugar:Math.random()>0.5 },
      mounjaro:{ nausea, constipation:rnd(0,3), diarrhea:rnd(0,2), reflux:rnd(0,3), belly:rnd(0,3),
                 fatigue:rnd(0,4), foodnoise:cravings, water, proteinMeals:protein,
                 smallerMeals:Math.random()>0.4, fiber:Math.random()>0.5, gentleMove:moved },
      sleep, note:"" };
  }
  delete daily[dayAgo(-3)]; delete daily[dayAgo(-9)]; // rest days from tracking
  if(daily[TODAY]) daily[TODAY].food=[
    {id:"fd1",name:"Greek yogurt + berries",serving:"1 bowl",kcal:210,protein:18,carbs:24,fiber:4,fat:5,time:""},
    {id:"fd2",name:"Chicken & rice bowl",serving:"~350g",kcal:520,protein:42,carbs:55,fiber:6,fat:12,time:""} ];
  const start=dayAgo(-44);
  daily[SENTINEL]={
    medsList:[ {id:"m1",name:"Metformin",dose:"500 mg",time:"with dinner"},
      {id:"m2",name:"Vitamin D3",dose:"1000 IU",time:"morning"},
      {id:"m3",name:"Inositol",dose:"2 g",time:"morning"},
      {id:"m4",name:"Omega-3",dose:"1 cap",time:"evening"} ],
    injectionLog:[ {id:"i1",date:dayAgo(-21),time:"20:00",dose:5,site:"L thigh",after:1,note:"a little tired"},
      {id:"i2",date:dayAgo(-14),time:"20:15",dose:5,site:"R abdomen",after:2,note:""},
      {id:"i3",date:dayAgo(-7),time:"19:45",dose:7.5,site:"L abdomen",after:3,note:"queasy first eve, settled"} ],
    doseHistory:[ {dose:2.5,started:start},{dose:5,started:dayAgo(-44+28)},{dose:7.5,started:dayAgo(-7)} ],
    weightLog:[ {date:dayAgo(-42),w:84.6},{date:dayAgo(-35),w:84.1},{date:dayAgo(-28),w:83.2},
      {date:dayAgo(-21),w:82.7},{date:dayAgo(-14),w:82.0,fat:39.1,muscle:46.2,bone:2.8,water:48.0,visceral:9,hr:72},
      {date:dayAgo(-7),w:81.4,fat:38.6,muscle:46.4,bone:2.8,water:48.4,visceral:8,hr:70},
      {date:TODAY,w:80.9,fat:38.1,muscle:46.6,bone:2.9,water:48.9,visceral:8,hr:69} ],
    heightCm:165,
    foodTargets:{kcal:1500,protein:110,fiber:28},
    measurements:[ {date:dayAgo(-28),bust:96,waist:88,hips:102,thighs:60,arms:31},{date:TODAY,bust:94,waist:85,hips:100,thighs:58,arms:30} ],
    nsv:[ {id:"n1",t:"Climbed the shrine steps without stopping ⛩️",date:dayAgo(-5)},
      {id:"n2",t:"Cravings were quiet all afternoon",date:dayAgo(-2)} ],
    cycle:{ lastStart:dayAgo(-39), history:[
      {start:dayAgo(-180),end:dayAgo(-175),flow:"med"},
      {start:dayAgo(-110),end:dayAgo(-106),flow:"light"},
      {start:dayAgo(-39),end:dayAgo(-34),flow:"med"} ] },
    joyJar:["a warm cup of hojicha","fox plushie cuddle","cozy game + soft blanket","slow morning, no alarm",
            "snow falling outside the window","a favourite comfort song","stretch + sunshine","draw something silly"],
    helps:"Warm shower, hojicha, lo-fi, and a 10-min walk usually resets me. Protein breakfast = calmer day.",
    stickies:[ {id:"sk1",text:"refill Mounjaro pen before Fri ❄️",color:"#fde2f2",x:0.62,y:0.30},
               {id:"sk2",text:"ask Dr about cycle gap 🦊",color:"#e6ecfb",x:0.72,y:0.50} ],
    tasks:[
      {id:"t1",text:"Book PCOS follow-up appointment",bucket:"health",spoon:"some",done:false,sub:[{id:"s1",text:"find the clinic number",done:true},{id:"s2",text:"check calendar for a free morning",done:false}]},
      {id:"t2",text:"Refill Metformin + Mounjaro",bucket:"health",spoon:"low",done:false,sub:[]},
      {id:"t3",text:"Edit cozy gacha highlight short",bucket:"content",spoon:"full",done:false,sub:[]},
      {id:"t4",text:"Water the plants 🌱",bucket:"personal",spoon:"low",done:false,sub:[]},
      {id:"t5",text:"Replay a comfort game — just for fun",bucket:"hobbies",spoon:"low",done:false,sub:[]},
      {id:"t6",text:"Try watercolours again, sometime",bucket:"someday",spoon:"some",done:false,sub:[]},
    ],
    goalsWeek:[ {id:"g1",text:"Ship 2 cozy shorts",done:false},{id:"g2",text:"Rest one full day, guilt-free",done:true} ],
    goalsMonth:[ {id:"g3",text:"Keep the weight trend gentle",done:false},{id:"g4",text:"Start a song-cover WIP",done:false} ],
    schedule:[ {id:"sc1",day:"Wed",show:"REACT / POE2",time:"5PM"},{id:"sc2",day:"Thu",show:"REACT / POE2",time:"5PM"},{id:"sc3",day:"Sat",show:"Warframe Day",time:"5PM"} ],
    captures:[ {id:"cap1",text:"bit idea: rate chat's comfort games out of 10",date:TODAY},{id:"cap2",text:"ask Dr about the cycle gap at next appt",date:TODAY} ],
    calendarEvents:[
      {id:"ce1",title:"Collab stream with Eggie 🎀",date:dayAgo(-2),endDate:null,color:"#ff9ed8",time:"15:00",tz:"Europe/Amsterdam",note:"co-op horror"},
      {id:"ce2",title:"Wuthering Waves 2.x update",date:dayAgo(-1),endDate:dayAgo(20),color:"#f6cba9",time:"04:00",tz:"Asia/Tokyo",note:"new region + limited banners",src:"game"} ],
    gameColor:"#f6cba9",
    appConfig:{},
  };
  return daily;
}

let demo = DEMO ? seedDemo() : null;


/* ===================== UNDO (Ctrl/⌘+Z rolls back the last data change — persists across reloads) ===================== */
let UNDO=[];
 const UNDO_MAX=50;
 let UNDO_RESTORING=false;
 const UNDO_KEY="mifu-undo";

function _saveUndoNow(){ try{ let arr=UNDO.slice(-25);   // keep recent history small enough for localStorage
  while(arr.length){ try{ localStorage.setItem(UNDO_KEY,JSON.stringify(arr)); return; }catch(e){ arr=arr.slice(1); } }
  localStorage.removeItem(UNDO_KEY);
}catch(e){} }

// PERF: each action used to JSON.stringify the whole 25-snapshot undo stack synchronously — heavy and
// growing with her data. Coalesce those writes onto a short debounce (undo still works instantly in
// memory), and flush on pagehide so nothing is lost when the tab/app closes.
let _undoSaveT=null;

function saveUndo(){ if(_undoSaveT) return; _undoSaveT=setTimeout(()=>{ _undoSaveT=null; _saveUndoNow(); },400); }

addEventListener("pagehide",()=>{ if(_undoSaveT){ clearTimeout(_undoSaveT); _undoSaveT=null; } _saveUndoNow(); });

function loadUndo(){ try{ const s=localStorage.getItem(UNDO_KEY); if(s){ const a=JSON.parse(s); if(Array.isArray(a)) UNDO=a; } }catch(e){} }

loadUndo();

async function undoLast(){
  if(!UNDO.length){ toast("nothing to undo ❄️"); return; }
  const {date,prev}=UNDO.pop(); saveUndo(); const snap=JSON.parse(JSON.stringify(prev||{}));
  UNDO_RESTORING=true;
  try{
    if(DEMO){ demo[date]=snap; }
    else if(SB){ await SB.from("daily_logs").upsert({user_id:UID,date,notes:snap},{onConflict:"user_id,date"}); }
    if(date===SENTINEL) state.sentinel=JSON.parse(JSON.stringify(snap));
    else if(date===TODAY) state.today=JSON.parse(JSON.stringify(snap));
    else { state._loaded=false; await loadData(); }   // some other day's row → refresh from DB
  }catch(e){ console.error(e); }
  UNDO_RESTORING=false;
  try{ await render(); }catch(_){ try{ renderStickies(); }catch(__){} }
  toast("undone ↩️");
}


/* ===================== DATA LAYER ===================== */
const DB = {
  async daily(date){
    if(DEMO) return JSON.parse(JSON.stringify(demo[date]||{}));
    if(!SB) return {};                       // not connected yet — show empty, re-render once SB ready
    const {data}=await SB.from("daily_logs").select("notes").eq("user_id",UID).eq("date",date).maybeSingle();
    return (data&&data.notes)||{};
  },
  async saveDaily(date,merge){
    let cur;
    if(DEMO){ cur=JSON.parse(JSON.stringify(demo[date]||{})); }
    else if(!SB){ cur=JSON.parse(JSON.stringify((date===SENTINEL?state.sentinel:date===TODAY?state.today:{})||{})); }
    else if(date===SENTINEL){
      // sentinel: ALWAYS fetch fresh from DB — never use stale cache as merge base.
      // using a cached copy risks overwriting real data with a sparse in-memory snapshot.
      const {data}=await SB.from("daily_logs").select("notes").eq("user_id",UID).eq("date",SENTINEL).maybeSingle();
      cur=JSON.parse(JSON.stringify((data&&data.notes)||{}));
      // do NOT update state.sentinel here — optimistic updates may already be applied
    } else {
      // daily rows: cache is safe — only one writer (this session) ever touches today's row
      const cached=date===TODAY?state.today:null;
      cur=JSON.parse(JSON.stringify(cached||{}));
      if(!Object.keys(cur).length) { const {data}=await SB.from("daily_logs").select("notes").eq("user_id",UID).eq("date",date).maybeSingle(); cur=(data&&data.notes)||{}; }
    }
    const prev=JSON.parse(JSON.stringify(cur));
    const next=merge({...cur});
    if(!UNDO_RESTORING){ try{ UNDO.push({date,prev}); if(UNDO.length>UNDO_MAX) UNDO.shift(); saveUndo(); }catch(e){} }
    if(date===SENTINEL) state.sentinel=next; else if(date===TODAY) state.today=next;
    // localStorage backup of sentinel before every write — last-resort recovery if DB write fails
    if(date===SENTINEL){ try{ localStorage.setItem("sentinel-backup",JSON.stringify({ts:Date.now(),data:next})); }catch(_){} }
    if(DEMO){ demo[date]=next; return next; }
    if(!SB) return next;
    await SB.from("daily_logs").upsert({user_id:UID,date,notes:next},{onConflict:"user_id,date"});
    return next;
  },
  async range(days){
    if(DEMO) return Object.entries(demo).filter(([d])=>d!==SENTINEL).map(([date,notes])=>({date,notes}));
    if(!SB) return [];
    const since=dayAgo(-days);
    const {data}=await SB.from("daily_logs").select("date,notes").eq("user_id",UID).gte("date",since).neq("date",SENTINEL);
    return (data||[]).map(r=>({date:r.date,notes:r.notes||{}}));
  },
  async exportAll(){
    if(DEMO) return Object.entries(demo).map(([date,notes])=>({date,notes}));
    if(!SB) return [];
    const {data}=await SB.from("daily_logs").select("*").eq("user_id",UID); return data||[];
  }
};


/* ===================== STATE + A11Y ===================== */
const TEXT_MIN=13, TEXT_MAX=22, TEXT_DEFAULT=14;

const PREF={ calm:false, textSize:TEXT_DEFAULT, focus:false };

function applyTextZoom(size){
  const z=(size/TEXT_DEFAULT).toFixed(4);
  const col=document.getElementById("main-col"); if(col) col.style.zoom=z;
}

function wireNavDrag(nav, tabOrder, groups, mode){
  let _dragTab=null, _overEl=null;
  nav.addEventListener("dragstart",e=>{
    const w=e.target.closest("[data-drag-tab]"); if(!w)return;
    _dragTab=w.dataset.dragTab; e.dataTransfer.effectAllowed="move";
    setTimeout(()=>w.classList.add("dragging"),0);
  });
  nav.addEventListener("dragend",e=>{
    const w=e.target.closest("[data-drag-tab]"); if(w)w.classList.remove("dragging");
    if(_overEl){_overEl.classList.remove("drag-over");_overEl=null;}
    _dragTab=null;
  });
  nav.addEventListener("dragover",e=>{
    e.preventDefault(); e.dataTransfer.dropEffect="move";
    const w=e.target.closest("[data-drag-tab]")||e.target.closest("[data-drop-group]");
    if(!w)return;
    if(_overEl&&_overEl!==w) _overEl.classList.remove("drag-over");
    _overEl=w; w.classList.add("drag-over");
  });
  nav.addEventListener("dragleave",e=>{
    const w=e.target.closest("[data-drag-tab]")||e.target.closest("[data-drop-group]");
    if(w&&w===_overEl){_overEl.classList.remove("drag-over");_overEl=null;}
  });
  nav.addEventListener("drop",e=>{
    e.preventDefault();
    if(_overEl){_overEl.classList.remove("drag-over");_overEl=null;}
    if(!_dragTab)return;
    // drop on a group label → move tab to that group
    const groupEl=e.target.closest("[data-drop-group]");
    if(groupEl){
      const targetGroup=groupEl.dataset.dropGroup;
      const newGroups=groups.map(g=>({...g,tabs:g.tabs.filter(t=>t!==_dragTab)}));
      const tg=newGroups.find(g=>g.label===targetGroup);
      if(tg) tg.tabs.push(_dragTab);
      try{localStorage.setItem("nav-groups-"+mode,JSON.stringify(newGroups));}catch(_){}
      _dragTab=null; render(); return;
    }
    // drop on another tab → reorder
    const w=e.target.closest("[data-drag-tab]"); if(!w||w.dataset.dragTab===_dragTab)return;
    const toTab=w.dataset.dragTab;
    const order=[...tabOrder];
    const fi=order.indexOf(_dragTab), ti=order.indexOf(toTab);
    if(fi>=0&&ti>=0){ order.splice(fi,1); order.splice(ti,0,_dragTab); }
    try{localStorage.setItem("tab-order",JSON.stringify(order));}catch(_){}
    _dragTab=null; render();
  });
}

function applyPrefs(){
  try{
    PREF.calm=localStorage.getItem("mifu-calm")==="1";
    const sz=parseInt(localStorage.getItem("mifu-textsize"),10);
    PREF.textSize=(sz>=TEXT_MIN&&sz<=TEXT_MAX)?sz:TEXT_DEFAULT;
    PREF.focus=localStorage.getItem("mifu-focus")==="1";
  }catch{}
  document.body.classList.toggle("calm",PREF.calm);
  applyTextZoom(PREF.textSize);
  const locked=localStorage.getItem("layout-locked")==="1";
  document.body.classList.toggle("locked",locked);
  const lc=document.getElementById("lockChip"); if(lc){ lc.textContent=locked?"🔒":"🔓"; lc.className="chip"+(locked?" on":""); }
}

const MODULAR_TABS=["home","homehealth","care","food","gachas"];

const MODULAR_GRID_TABS=["home","homehealth","care","food","gachas"];

const MODULAR_LABELS={};

function modLayout(tab){ const L=(state.sentinel.layout||{})[tab]||{}; return {order:L.order||[],size:L.size||{},min:L.min||{},hidden:L.hidden||{},left:L.left||null,right:L.right||null}; }

async function setLayout(tab, mut){ await setSent(n=>{ const layout={...(n.layout||{})}; const L={order:[],size:{},min:{},hidden:{},...(layout[tab]||{})}; mut(L); layout[tab]=L; return {...n,layout}; }); }

function modularGrid(tab, items, addable){
  const L=modLayout(tab); MODULAR_LABELS[tab]={}; const byKey={};
  items.forEach(it=>{ byKey[it.key]=it; MODULAR_LABELS[tab][it.key]=it.label||it.key; });
  let order=L.order.filter(k=>byKey[k]); items.forEach(it=>{ if(!order.includes(it.key)) order.push(it.key); });
  const visible=order.filter(k=>!L.hidden[k]);
  const isFW=k=>((L.size[k]||{}).c||byKey[k].cols||4)>=10;
  const makeW=k=>{ const it=byKey[k]; const s=L.size[k]||{}; const min=!!L.min[k]; const fw=isFW(k);
    return `<div class="home-widget ${fw?'span2':''} ${min?'min':''}" data-w="${k}" data-tab="${tab}" data-h="" data-c="${s.c||it.cols||4}">
      <div class="home-tools"><button class="home-grip" title="drag to move">⠿</button><button data-act="homeHide" data-w="${k}" data-tab="${tab}" title="remove card">✕</button></div>
      <span class="home-resize" title="drag to resize">⤡</span>
      ${it.html}</div>`; };
  const hiddenN=Object.keys(L.hidden).filter(k=>L.hidden[k]&&byKey[k]).length;
  const add=addable===false?"":`<button class="home-add" data-act="manageCards" data-tab="${tab}">＋ cards${hiddenN?` · ${hiddenN} hidden`:""}</button>`;
  let html='', buf=[];
  const flushBuf=()=>{
    if(!buf.length)return;
    let l,r;
    if(L.left||L.right){
      // use explicit column assignment saved from drag
      const lSet=new Set(L.left||[]), rSet=new Set(L.right||[]);
      l=buf.filter(k=>lSet.has(k)||(!rSet.has(k)&&buf.indexOf(k)%2===0));
      r=buf.filter(k=>rSet.has(k));
      // any buf item not in either set falls to left (above handles it via indexOf%2)
    } else {
      l=buf.filter((_,i)=>i%2===0); r=buf.filter((_,i)=>i%2!==0);
    }
    html+=`<div class="grid-col" data-col="0">${l.map(makeW).join("")}</div><div class="grid-col" data-col="1">${r.map(makeW).join("")}</div>`; buf=[];
  };
  visible.forEach(k=>{ if(isFW(k)){flushBuf();html+=makeW(k);}else buf.push(k); });
  flushBuf();
  return `<div class="grid-modular" data-tab="${tab}">${html}${add}</div>`;
}

/* width preference → whole columns. Stored width (data-c) keeps its old 3-16 scale for
   back-compat: small/default → 1 col, mid → 2 cols, large → full. Clamped to what fits now. */
function spanFromC(c, colCount){ c=c||4; let span; if(colCount<=2) span=c>=9?2:1; else span=c>=9?3:c>=6?2:1; return Math.max(1,Math.min(span,colCount)); }

/* inverse — when a resize picks N columns, store a value that maps back to N via spanFromC */
function cForSpan(span){ return span>=3 ? 12 : span===2 ? 10 : 4; }

function layoutHome(){
  const tab=state.tab; if(!MODULAR_TABS.includes(tab))return;
  const viewFn={home:viewHome,homehealth:viewHome,food:viewFood,care:viewCare,gachas:viewGachas}[tab]||viewHome; if(!viewFn)return;
  const grid=document.querySelector('.grid-modular'); if(!grid)return;
  const tmp=document.createElement('div'); tmp.innerHTML=viewFn();
  const ng=tmp.querySelector('.grid-modular'); if(ng)grid.replaceWith(ng);
}

function manageCardsModal(tab){
  const L=modLayout(tab); const labels=MODULAR_LABELS[tab]||{}; const keys=Object.keys(labels);
  $("#modal").innerHTML=`<div class="modal-bg" data-act="closeModal"><div class="modal" data-act="noop" style="max-width:380px;width:100%;max-height:90vh;overflow:auto"><div class="card-head"><h3 style="font-size:16px">🧩 Cards</h3><button class="btn" data-act="closeModal">✕</button></div>
    <p class="soft" style="font-size:12px;margin:0 0 8px">Toggle which cards show here. You can also drag, resize or minimize them right on the page. 🌸</p>
    ${keys.map(k=>`<button class="chiptog ${L.hidden[k]?'':'on'}" data-act="cardToggle" data-w="${k}" data-tab="${tab}" style="width:100%;justify-content:flex-start;margin-top:6px"><span>${L.hidden[k]?'＋':'✓'}</span>${esc(labels[k])}</button>`).join("")}
    <button class="btn" data-act="resetLayout" data-tab="${tab}" style="margin-top:12px">↺ reset this page's layout</button>
  </div></div>`;
}

const state={ tab:"home", today:{}, sentinel:{}, range:[], breathOn:false, plannerEnergy:"all", energyLevel:"medium", plnMoreOpen:false, plnShowAll:false, trendMetrics:["mood"], trendType:"area", trendDays:14, wtMetrics:["w"], wtType:"area", wtRange:"all", calView:"week", creatorSub:"script", gachaWeekOffset:0 };

try{ state.trendType=localStorage.getItem("mifu-trend-type")||state.trendType; state.wtType=localStorage.getItem("mifu-wt-type")||state.wtType; }catch(e){}
   // remember her chart choices
const OPT={ mode:"video", drops:false, busy:"", err:"", channel:null, video:null, stream:null, thumbData:null, thumb:null };
 // Optimize tab

const TABS=[["home","🏠 Home"],["gachas","🎮 Gachas"],["kiko","🦊 Ask Kiko"],["planner","🗒️ Planner"],["calendar","📅 Calendar"],["events","🎉 Events"],["creator","✍️ Creator"],["money","💶 Money"],["art","🎨 Art"],["toolbox","🧠 Brain Tools"],["life","💗 Life"],["health","❄️ Health"],["food","🍱 Food"],["journal","📓 Journal"],["care","🫂 Care"],["bunny","🐰 Bunny"],["trends","📈 Trends"],["memories","✨ Memories"],["settings","⚙️ Settings"]];

/* ===== one app, two minds — Creator OS 🎀 / Health OS ❄️ (tap the logo to swap) ===== */
const CREATOR_TABS=["home","gachas","planner","calendar","events","creator","money","art","toolbox","memories","kiko"];

const SB_GROUPS={
  creator:[
    {label:null,tabs:["home","gachas"]},
    {label:"Create",tabs:["planner","creator","art","toolbox"]},
    {label:"Publish",tabs:["calendar","events"]},
    {label:"Business",tabs:["money","studio","memories"]},
  ],
  health:[
    {label:null,tabs:["home","journal"]},
    {label:"Health",tabs:["food","care","bunny","health","trends"]},
    {label:"Mind & Life",tabs:["life"]},
    {label:"Memories",tabs:["memories"]},
  ]
};

const HEALTH_TABS=["home","journal","food","care","bunny","life","trends","health","memories","kiko"];
   /* Settings removed from the nav bar — reach it via the ⚙️ chip by the avatar */
let OS_MODE=(function(){ try{ return localStorage.getItem("mifu-mode")==="health"?"health":"creator"; }catch(e){ return "creator"; } })();
   // default: Creator OS
function modeTabs(){ return OS_MODE==="health"?HEALTH_TABS:CREATOR_TABS; }

function modeSwapAnim(){ const v=$("#view"); if(!v)return; v.classList.remove("mode-anim"); void v.offsetWidth; v.classList.add("mode-anim");
  clearTimeout(window._modeT); window._modeT=setTimeout(()=>{ const vv=$("#view"); if(vv)vv.classList.remove("mode-anim"); },600); }

function setTab(t){
  if(!modeTabs().includes(t)){ const other=OS_MODE==="creator"?HEALTH_TABS:CREATOR_TABS;
    if(other.includes(t)){ OS_MODE=(OS_MODE==="creator"?"health":"creator"); try{localStorage.setItem("mifu-mode",OS_MODE);}catch(e){} modeSwapAnim(); } }   // follow her across minds
  state.tab=t; render(); }


/* permission slips */
const SLIPS=["Rest is productive. ❄️","A slow day is still a valid day.","You don't have to earn rest.",
  "Your worth isn't a number on a scale.","Konfuyu~ — be soft with yourself today. 🦊",
  "Tap what fits. You don't have to fill everything.","Bodies fluctuate. The trend is the story, not today.",
  "A gap in tracking is just a rest day. That's okay.","Feelings are visitors, not residents.",
  "You're doing better than the anxious voice says."];

const slip=()=>SLIPS[new Date().getDate()%SLIPS.length];

const slipBanner=(mb)=>`<div class="slip"${mb?' style="margin-bottom:16px"':''}><img class="deco" src="snowflake.png" alt=""/><span class="slip-txt">${esc(slip())}</span><img class="deco" src="sakura.png" alt=""/></div>`;


/* ===================== shared builders ===================== */
const DISCLAIMER=`<div class="disc">${CONFIG.creator.snow}<span><b>Gentle reminder:</b> this is your own self-tracking — noticing patterns, not a diagnosis. Your care team's plan always comes first. ${CONFIG.creator.emoji}</span></div>`;


function scaleRow(label,act,field,val,lo="none",hi="a lot",max=5){
  let b=""; for(let i=0;i<=max;i++) b+=`<button data-act="${act}" data-f="${field}" data-v="${i}" class="${val===i?'on':''}">${i}</button>`;
  return `<div class="field"><div class="label">${label}</div><div class="scale">${b}</div><div class="scale-ends"><span>${lo}</span><span>${hi}</span></div></div>`;
}

function chiptog(label,act,field,on){ return `<button class="chiptog ${on?'on':''}" data-act="${act}" data-f="${field}"><span>${on?'✓':'＋'}</span>${label}</button>`; }


/* ===================== RENDER ROOT ===================== */
async function render(){
  applyPrefs();
  let _to=[]; try{_to=JSON.parse(localStorage.getItem("tab-order")||"[]");}catch(e){}
  const _mt=modeTabs(); const _modeTabsList=TABS.filter(([t])=>_mt.includes(t));
  const _tabs=_to.length?[..._modeTabsList].sort((a,b)=>{const ia=_to.indexOf(a[0]),ib=_to.indexOf(b[0]);return (ia<0?999:ia)-(ib<0?999:ib);}):[..._modeTabsList];
  { const _ki=_tabs.findIndex(t=>t[0]==="kiko"); if(_ki>=0) _tabs.push(_tabs.splice(_ki,1)[0]); }   // 🦊 Ask Kiko always sits at the tail of the nav, both modes
  const _bn=$("#brandName"); if(_bn) _bn.textContent=OS_MODE==="health"?"Mifuyu Health OS":"Mifuyu Creator OS";
  const _mp=$("#modePill"); if(_mp){ _mp.textContent=OS_MODE==="health"?"❄️ health":"🎀 creator"; _mp.className="mode-pill "+(OS_MODE==="health"?"mode-health":"mode-creator"); _mp.title="tap the logo to swap to "+(OS_MODE==="health"?"Creator OS":"Health OS"); }
  // sync sidebar mode buttons
  { const sc=$("#sbCreatorBtn"),sh=$("#sbHealthBtn"); if(sc)sc.className=OS_MODE==="creator"?"on":""; if(sh)sh.className=OS_MODE==="health"?"on":""; }
  // build grouped sidebar nav
  { const _unlocked=localStorage.getItem("layout-locked")==="0";
    const _sbTabBtn=([t,l])=>{ const sp=l.split(' '); const em=sp[0]; const lb=sp.slice(1).join(' ');
      return _unlocked
        ? `<div class="tab-drag-wrap" draggable="true" data-drag-tab="${t}"><span class="drag-grip">⠿</span><button class="tab${state.tab===t?' active':''}" data-act="tab" data-tab="${t}"><span class="tab-emoji">${em}</span><span class="tab-label">${lb}</span></button></div>`
        : `<button class="tab${state.tab===t?' active':''}" data-act="tab" data-tab="${t}"><span class="tab-emoji">${em}</span><span class="tab-label">${lb}</span></button>`; };
    const _kikoTab=_tabs.find(([t])=>t==="kiko"); const _nonKiko=_tabs.filter(([t])=>t!=="kiko");
    const _sbGroups=(SB_GROUPS[OS_MODE]||SB_GROUPS.creator);
    const _groupedSet=new Set(_sbGroups.flatMap(g=>g.tabs));
    // load custom group overrides from localStorage
    let _customGroups; try{ _customGroups=JSON.parse(localStorage.getItem("nav-groups-"+OS_MODE)||"null"); }catch(_){ _customGroups=null; }
    const _activeGroups=_customGroups||_sbGroups.map(g=>({...g,tabs:[...g.tabs]}));
    const _groupedSet2=new Set(_activeGroups.flatMap(g=>g.tabs));
    let _navHtml=_unlocked?`<div class="sb-unlock-banner">🔓 drag to reorder · drop on a section label to move groups <button class="btn" style="font-size:10px;padding:2px 7px;margin-left:6px" data-act="resetNavOrder">↺ reset</button></div>`:"";
    for(const g of _activeGroups){
      const gt=_nonKiko.filter(([t])=>g.tabs.includes(t)); if(!gt.length)continue;
      _navHtml+=g.label
        ?`<div class="sb-group" data-group-label="${esc(g.label)}"><span class="sb-group-label" data-drop-group="${esc(g.label)}">${g.label}</span>${gt.map(_sbTabBtn).join("")}</div>`
        :`<div data-group-label="">${gt.map(_sbTabBtn).join("")}</div>`;
    }
    _nonKiko.filter(([t])=>!_groupedSet2.has(t)).forEach(tb=>{ _navHtml+=_sbTabBtn(tb); });
    _navHtml+=`<div style="flex:1;min-height:8px"></div>`;
    if(_kikoTab) _navHtml+=_sbTabBtn(_kikoTab);
    const _nav=$("#nav"); _nav.innerHTML=_navHtml;
    if(_unlocked){ wireNavDrag(_nav, _tabs.map(([t])=>t), _activeGroups, OS_MODE); }
  }
  const _stxt=DEMO?"◇ demo data":(SB?"● live":"◌ connecting…"); const _scls="chip"+(DEMO?" demo":(SB?" on":""));
  const st=$("#status"); if(st){ st.textContent=_stxt; st.className=_scls; }
  const str=$("#status-rail"); if(str){ str.textContent=_stxt; str.className=_scls; }
  const v=$("#view");
  // Decide NOW whether this is a real page change, but DON'T start the animation yet.
  // (Never animate the very first paint, so the boot splash hands straight to home.)
  const animate = state._booted && state._lastTab!==state.tab;
  state._lastTab=state.tab; state._booted=true;
  try{
    // Fetch from the database ONLY on first load. Every tab switch used to re-fetch 3 times
    // (~260ms of network) before painting — that freeze-then-jump was the "stutter/stop".
    // The data is already in memory after boot: saves keep state.sentinel/today current, and
    // state.range holds only past days (today is always overlaid from state.today below), so
    // there's nothing to re-fetch on navigation. Result: tab switches render instantly.
    if(!state._loaded) await loadData();
    const fn={home:viewHome,gachas:viewGachas,kiko:viewKiko,money:viewMoney,health:viewHealth,pcos:viewHealth,mj:viewHealth,weight:viewTrends,food:viewFood,care:viewCare,bunny:viewBunny,studio:viewStudio,life:viewLife,planner:viewPlanner,calendar:renderCalendar,events:viewEvents,creator:viewCreator,script:viewCreator,optimize:viewCreator,trends:viewTrends,art:viewArt,toolbox:viewToolbox,journal:viewJournal,memories:viewMemories,settings:viewSettings}[state.tab]||viewHome;
    // --- one synchronous block from here (NO awaits) so the browser paints exactly once ---
    // Arm the animation BEFORE building, so the new cards are created already in their hidden
    // start state and animate in cleanly. Because there's no await between this and innerHTML,
    // the heavy DOM rebuild happens BEFORE the first painted frame — it can't stall the
    // animation mid-flight (that interruption, caused by an await splitting the two, was the stutter).
    if(animate){ v.classList.remove('anim'); void v.offsetWidth; v.classList.add('anim');
      clearTimeout(state._animT); state._animT=setTimeout(()=>{ const vv=$("#view"); if(vv) vv.classList.remove('anim'); },1000); }
    v.innerHTML = fn();
    renderGlobalHeader();
    renderStickies();
    if(state.tab==='care'){ try{ state.breathOn ? startBreath() : stopBreath(); }catch(_){}
      if(state.media===undefined && !state._mediaLoading){ loadMedia().then(()=>{ if(state.tab==='care') render(); }); } }   // loadMedia owns the _mediaLoading guard; pre-setting it here made loadMedia bail, leaving media undefined → infinite re-render loop
    if(state.tab==='bunny' && state.media===undefined && !state._mediaLoading){ loadMedia().then(()=>{ if(state.tab==='bunny') render(); }); }   // lazy-load photos for the bunny tab (loadMedia owns its own guard)
    if(state.tab==='calendar'){ try{ wireCalDnD(); }catch(e){ console.error(e); } } // re-attach drag listeners after innerHTML
    if(state.tab==='planner'){ try{ wireTaskDnD(); }catch(e){ console.error(e); } } // board drag (mouse) — touch uses ◀▶
    if(state.tab==='trends'){ try{ paintTrendChart(); }catch(e){ console.error(e); } }
    if(state.tab==='art'){ try{ if(state.art&&state.art.notan) artNotanPaint(); }catch(e){} }   // repaint the value-checker canvas after innerHTML
    if(MODULAR_TABS.includes(state.tab)){
      // Position the masonry cards SYNCHRONOUSLY now — before the browser paints — so it never
      // shows cards stacked-then-snapping (that one-frame reflow was the "whole page jiggles" bug).
      try{layoutHome();}catch(e){}
      // The extra staggered passes ONLY matter on first load / tab change (late images, fonts settling).
      // On a plain check-off (same tab) they re-pack with no real change and just cause jitter on iOS —
      // so skip them then. The single synchronous pass above already measured the post-tap heights.
      if(animate || !state._homeLaidOnce){
        state._homeLaidOnce=true;
        requestAnimationFrame(()=>{try{layoutHome();}catch(e){}}); setTimeout(()=>{try{layoutHome();}catch(e){}},150); setTimeout(()=>{try{layoutHome();}catch(e){}},520); setTimeout(()=>{try{layoutHome();}catch(e){}},1000);
      }
    }
    if(state.tab==='kiko'){ KIKO.open=false; const cc=$("#kikoChat"); if(cc)cc.classList.add("hidden"); try{ paintKiko(); }catch(e){} }   // fill the Ask-Kiko chat panel
    if(state.tab==='memories'){ if(state.media===undefined&&!state._mediaLoading){ loadMedia().then(()=>{ if(state.tab==='memories') render(); }); } try{ wireMedia(); }catch(e){} }   // lazy-load the media row + wire upload/caption inputs
    if(state.tab==='journal'){ try{ wireJrPage(); }catch(e){} }   // attach the daily-page auto-save
    try{ if(window.twemoji) twemoji.parse(document.body,{folder:'svg',ext:'.svg'}); }catch(_){}
  }catch(e){ console.error(e); v.innerHTML=`<div class="panel"><h3>aw, a little hiccup ❄️</h3><p class="soft">${esc(e&&e.message||e)}</p><p class="soft" style="font-size:11px">(If you see this, screenshot it for me and I'll fix it fast.)</p></div>`; }
}


/* ===================== HOME cards ===================== */
/* ===== per-week stream schedule — every week is its own independent plan (blank until you fill it) ===== */
const DOW_ORDER=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const STREAM_TIME_DEFAULT="3PM";

const CUPS_PER_40OZ=5;
   // water stored internally in 8oz cups; shown to Mifu as 40oz cups (≈5 cups each)
function mondayOf(d){ const x=new Date(d); const wd=(x.getDay()+6)%7; x.setDate(x.getDate()-wd); x.setHours(0,0,0,0); return x; }

function weekStartISO(off){ const d=mondayOf(new Date(TODAY+"T00:00")); d.setDate(d.getDate()+(off||0)*7); return d.toLocaleDateString("en-CA"); }

/* each week's slots are stored under its Monday in schedWeeks. No repeating template — a week with no
   entry is blank. The current week falls back to her legacy `schedule` once, so she keeps existing streams. */
function weekSlots(wkISO){ const sw=(state.sentinel.schedWeeks||{}); if(sw[wkISO]) return sw[wkISO];
  if(wkISO===weekStartISO(0)) return (state.sentinel.schedule||[]); return []; }

function slotsForDate(d){ return weekSlots(mondayOf(d).toLocaleDateString("en-CA")); }

async function setWeekSlots(wkISO,fn){
  await setSent(n=>{ const sw={...(n.schedWeeks||{})};
    const base = sw[wkISO] ? sw[wkISO].slice() : (wkISO===weekStartISO(0) ? (n.schedule||[]).slice() : []);
    sw[wkISO]=fn(base); return {...n,schedWeeks:sw}; });
}


/* ===== Daily habits + gacha dailies (Mifu's request 💜) ===== */
const HABITS_DEFAULT=[
  {id:"h_meds",   text:"Take meds AM & PM",        energy:"low"},
  {id:"h_floss",  text:"Floss teeth & skincare",   energy:"low"},
  {id:"h_dishes", text:"1 round of dishes",        energy:"med"},
  {id:"h_twitter",text:"Twitter time (1 pomo)",    energy:"med"},
  {id:"h_comments",text:"Reply to comments (1 pomo)",energy:"med"},
  {id:"h_steps",  text:"5k+ steps",                energy:"high"},
  {id:"h_laundry",text:"1 wash of clothes",        energy:"high"},
];

const GACHA_DEFAULT=["Nikki","R1999","Arknights","ZZZ","NTE","WUWA","GENSHIN","HSR"].map(n=>({id:"g_"+n.toLowerCase().replace(/\W+/g,""),name:n}));

function habitsList(){ const l=state.sentinel.habitsList; return (Array.isArray(l)&&l.length)?l:HABITS_DEFAULT; }

function gachaList(){ const l=state.sentinel.gachaList; return (Array.isArray(l)&&l.length)?l:GACHA_DEFAULT; }

function weekStrip(field,total){
  const byDate={}; (state.range||[]).forEach(r=>byDate[r.date]=r.notes); byDate[TODAY]=state.today;
  let bars=""; for(let i=6;i>=0;i--){ const d=dayAgo(-i); const checks=(byDate[d]&&byDate[d][field])||{}; const n=Object.values(checks).filter(Boolean).length;
    const pct=total?Math.min(1,n/total):0;
    bars+=`<div title="${fmtDate(d)} — ${n}/${total}" style="flex:1;border-radius:4px;height:${Math.max(10,Math.round(pct*100))}%;background:${pct>=1?'#9fdcc0':'var(--sakura)'};opacity:${(0.3+pct*0.7).toFixed(2)}"></div>`; }
  return `<div style="display:flex;gap:4px;align-items:flex-end;height:30px;margin-top:10px">${bars}</div>
    <div style="display:flex;justify-content:space-between;font-size:9.5px;color:var(--muted);margin-top:2px"><span>${fmtDate(dayAgo(-6))}</span><span>this week 🌱</span><span>today</span></div>`;
}

function habitsWeekly(){ const l=state.sentinel.habitsWeekly; return Array.isArray(l)?l:[]; }

function cgoalsWeekly(){ const l=state.sentinel.cgoalsWeekly; return Array.isArray(l)?l:[]; }

/* creator-focused daily goals — mirrors Daily Habits but a SEPARATE list, for content work (own energy tags) */
const CGOALS_DEFAULT=[
  {id:"cg_comments",text:"Reply to comments",       energy:"low"},
  {id:"cg_socials", text:"Post on socials / X",     energy:"low"},
  {id:"cg_clip",    text:"Edit a clip / Short",     energy:"med"},
  {id:"cg_thumb",   text:"Make a thumbnail",        energy:"med"},
  {id:"cg_cover",   text:"Cover-song progress",     energy:"med"},
  {id:"cg_stream",  text:"Stream",                  energy:"high"},
  {id:"cg_video",   text:"Work on a YouTube video", energy:"high"},
];

function cgoalsList(){ const l=state.sentinel.cgoalsList; return (Array.isArray(l)&&l.length)?l:CGOALS_DEFAULT; }

/* ===== Creator Growth — low-friction "put yourself out there" checklist (energy-tagged) ===== */
const CGROWTH_DEFAULT=[
  {id:"cgr_comments",text:"Reply to 2–3 comments",                 energy:"low"},
  {id:"cgr_kind",    text:"Leave 1 kind comment on a creator's post", energy:"low"},
  {id:"cgr_discord", text:"Check in on Discord once",              energy:"low"},
  {id:"cgr_tweet",   text:"Post 1 personality tweet",             energy:"med"},
  {id:"cgr_visit",   text:"Visit 1 VTuber's stream",              energy:"med"},
  {id:"cgr_share",   text:"Share 1 creator's work",               energy:"med"},
  {id:"cgr_dm",      text:"Reach out / DM 1 creator",             energy:"high"},
  {id:"cgr_collab",  text:"Brainstorm or save 1 collab idea",     energy:"high"},
];

function cgrowthList(){ const l=state.sentinel.cgrowthList; return (Array.isArray(l)&&l.length)?l:CGROWTH_DEFAULT; }

/* ===== Creator Spark — one personalized idea starter from her own app data (no generic AI prompts) ===== */
function sparkIdeas(){
  const out=[], seen=new Set(); const add=(ctx,idea)=>{ if(idea&&!seen.has(idea)){ seen.add(idea); out.push({ctx,idea}); } };
  try{ const evs=(state.sentinel.calendarEvents||[]).filter(gameSrc).map(e=>({...e,days:daysBetween(TODAY,e.date)})).filter(e=>e.days>=-2&&e.days<=21).sort((a,b)=>Math.abs(a.days)-Math.abs(b.days));
    evs.slice(0,3).forEach(e=>{ const g=String(e.title).split(/[\s—·-]+/)[0]; add(`${e.title} is on the radar`,`"Is ${g} Worth Streaming Right Now?" — a quick first-impressions / reaction stream.`); add(`${e.title} is coming up`,`A short: "3 things to know before ${g} drops."`); }); }catch(e){}
  try{ const gl=gachaList(); if(gl.length>=2){ const names=gl.slice(0,3).map(g=>g.name).join(", "); add(`You actively play ${gl.length} gacha games`,`"Which Gacha Respects Your Time the Most?" — rank ${names}.`); add(`You juggle a few gacha dailies`,`A cozy "do my gacha dailies with me" body-double stream.`); } }catch(e){}
  try{ (state.sentinel.captures||[]).slice(-6).reverse().forEach(c=>{ const t=String((c&&c.text)||"").trim(); if(t.length>4&&t.length<110) add("From your brain-dump",`Turn "${t}" into a short or a stream segment.`); }); }catch(e){}
  [`"The VTuber Burnout Pipeline" — why creators quit, and how you pace yourself.`,
   `"Why streamers need a second brain" — show your notes/setup system.`,
   `A "get ready with me before stream" prep-routine short.`,
   `React to VTuber hot-takes while chatting — low prep, high interaction.`,
   `"A day in the life of a snowfox shrine maiden" cozy vlog short.`
  ].forEach(idea=>add("Idea starter",idea));
  return out;
}

function cardCreatorSpark(){
  const ideas=sparkIdeas();
  if(!ideas.length) return `<section class="panel"><div class="label" style="margin-bottom:6px">✨ Creator spark</div><p class="soft" style="font-size:12px">Add a brain-dump or a game to your calendar and Kiko will spark ideas from them. 💡</p></section>`;
  const i=(((state.sparkIdx||0)%ideas.length)+ideas.length)%ideas.length; const s=ideas[i];
  return `<section class="panel">
    <div class="card-head"><span class="label">✨ Creator spark</span><button class="btn" data-act="sparkNext">↻ another</button></div>
    <p class="soft" style="font-size:11px;margin:0 0 6px">${esc(s.ctx)} 💡</p>
    <div class="spark-idea">${esc(s.idea)}</div>
    <div class="chiprow" style="margin-top:10px">
      <button class="chiptog" data-act="sparkSave"><span>📌</span>Save idea</button>
      <button class="chiptog" data-act="sparkToGoal"><span>🎯</span>Add to goals</button>
    </div>
  </section>`;
}

function gachaWeeklies(){ const l=state.sentinel.gachaWeeklies; return Array.isArray(l)?l:[]; }


function cardSnowfox(){ const energy=state.today.energy||0;
  return `<section class="panel">
    <div class="card-head"><span class="label">Snowfox</span><span class="pill pill-mint">● here for you</span></div>
    <div style="display:flex;gap:12px;align-items:center">
      <div class="avatar" style="width:52px;height:52px"><img src="AYAYA.png" alt="Mifu"/></div>
      <div><div style="font-family:var(--display);font-size:18px">${esc(CONFIG.creator.name)}</div><div class="label" style="margin-top:1px">${esc(CONFIG.creator.pronouns)}</div></div>
    </div>
    <div class="soft-card" style="margin-top:12px;font-style:italic;font-size:12.5px">${esc(CONFIG.creator.tagline)}</div>
    <div style="margin-top:12px"><div class="label" style="margin-bottom:5px">Energy today 🥄</div>
      <div class="seg">${[["1","🌙","Low"],["3","🌤","Med"],["5","🌞","High"]].map(([v,e,l])=>`<button data-act="energySet" data-v="${v}" class="${energy==v?'on':''}">${e} ${l}</button>`).join("")}</div></div>
  </section>`; }


/* ===================== HOME — dual structure (Creator OS ≠ Health OS), per Mifu's 2026-06 notes =====================
   Top: profile pic + BIG 24h clock + date + mode-specific daily check-in buttons (the OS only knows what
   she tells it — no pretend integrations). Glance: deterministic Kiko Noticed + Suggested Focus — every
   line traceable to a check-in or a stored number. The two OSes never leak into each other. */
const CI_DEFS={
  creator:[["streamed","📺","Streamed Today"],["ytVideo","▶️","Uploaded YouTube Video"],["ytShort","🎬","Uploaded YouTube Short"]],
  health:[["medsAM","💊","Took Meds AM"],["medsPM","💊","Took Meds PM"],["weighed","⚖️","Weighed In"],["journaled","📓","Journaled"],["gym","💪","Went to Gym"],["walk","🚶","Walked a Bit"],["water","💧","Drank Water"],["sleep","😴","Slept Well"]]
};

/* meds classified AM vs PM by their time text — drives the AM/PM check-in linking */
function medPeriod(m){ const t=String((m&&m.time)||"").toLowerCase();
  if(/\b(pm|night|evening|dinner|bed|bedtime|nighttime|supper|tea)\b/.test(t)) return "pm";
  return "am"; }
   // default to AM (morning/breakfast/anytime)
const WATER_SUPP_NAMES=["electrolyte","creatine","collagen","psyllium"];
   // her four morning-drink supplements (auto-tick with first water)
function medsByPeriod(p){ return (state.sentinel.medsList||[]).filter(m=>medPeriod(m)===p); }

/* some check-ins can be derived from data she already logs elsewhere — those light up on their own */
function ciDerived(k){ const d=state.today||{};
  if(k==="madeArt") return (state.sentinel.artLog||[]).some(e=>e.date===TODAY);
  if(k==="journaled") return !!(d.journal&&String(d.journal).trim());
  if(k==="medsAM") return !!(d.meds&&d.meds.am);
  if(k==="medsPM") return !!(d.meds&&d.meds.pm);
  if(k==="weighed") return (state.sentinel.weightLog||[]).some(w=>w.date===TODAY&&w.w!=null);
  if(k==="water") return waterCups()>=CUPS_PER_40OZ;   // a full 40oz cup logged on Food counts
  if(k==="sleep") return Number(d.sleep)>=7;            // a real sleep log lights it
  return false; }

function ciOn(k){ return !!(((state.today||{}).checkins||{})[k])||ciDerived(k); }

function nowHM(){ const d=new Date(); return ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2); }

function renderGlobalHeader(){
  const h=document.getElementById("global-header"); if(!h) return;
  const time=nowHM();
  const date=new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"});
  const el=state.energyLevel||"medium";
  const creator=OS_MODE!=="health";
  h.innerHTML=`
    <img class="gh-ava" src="AYAYA.png" data-fallback="Logo.png" alt=""/>
    <div class="gh-title">
      <div class="gh-title-label">Welcome to</div>
      <div class="gh-title-name">Mifu's ${creator?"Creator":"Health"} OS 🌸</div>
      <div class="gh-title-sub">Kiko is here to ${creator?"help":"support"} you. 💜</div>
    </div>
    <div class="gh-right">
      <div class="gh-energy">
        ${[["low","🌙"],["medium","🌤️"],["high","☀️"]].map(([v,em])=>`<button class="gh-energy-btn energy-${v}${el===v?" on":""}" data-act="setEnergy" data-v="${v}" title="${v} energy">${em}</button>`).join("")}
      </div>
      <div class="gh-clockwrap">
        <div class="gh-clock" id="ghClock">${time}</div>
        <div class="gh-date-str">${date}</div>
      </div>
    </div>`;
}

/* deterministic observations — each one traceable to a check-in or stored number; ticking today resets it */
function rangeRow(date){ const r=(state.range||[]).find(x=>x&&x.date===date); return r?(r.notes||{}):null; }

function waterWeekAvg(){ const vals=[]; for(let i=1;i<=7;i++){ const d=rangeRow(dayAgo(-i)); if(d&&d.mounjaro&&d.mounjaro.water!=null)vals.push(Number(d.mounjaro.water)||0); } return vals.length>=3?vals.reduce((a,b)=>a+b,0)/vals.length:null; }

/* Kiko's notebook -> gentle forward nudges. Only surfaces durable notes that read like
   an intention/deadline (finish / before / pre-farm / due / debut / remember to ...),
   and keeps game-flavoured notes off the Health home to honour the OS separation. */
const MEM_ACTION_RE=/\b(finish|before|pre-?farm|save up|don'?t forget|remember to|reminder|deadline|due|leaves?|ends?|debut|upcoming|need to|have to|should)\b/i;

const MEM_GAME_RE=/\b(farm|banner|pull|gacha|debut|stream|patch|character|limited|arknights|endfield|genshin|hoyo|wuthering|star rail|zzz)\b/i;

function memoryNudges(mode){
  const O=[]; const mem=(state.sentinel.kikoMemory||[]);
  for(let i=mem.length-1;i>=0&&O.length<2;i--){ const m=mem[i]; const tx=String((m&&m.text)||"").trim();
    if(!tx||!MEM_ACTION_RE.test(tx))continue;
    if(MEM_GAME_RE.test(tx))continue;   // game beats belong only in the Game Updates box
    const short=tx.length>96?tx.slice(0,94).trim()+"…":tx;
    O.push({t:`Kiko remembered: ${short} 🧠`,focus:{t:short,seed:`help me make a tiny plan for: ${tx}`}}); }
  return O;
}

/* ── correlation engine: genuine relationships Kiko spots in her own logs ──
   Pearson over date-aligned daily metrics. Observations only (patterns, not proof,
   never causal) — these are the heart of "Kiko noticed". */
function kikoPearson(pairs){ const n=pairs.length; if(n<5) return null;
  let sx=0,sy=0,sxx=0,syy=0,sxy=0; for(const p of pairs){ const x=p[0],y=p[1]; sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y; }
  const cov=sxy-sx*sy/n, vx=sxx-sx*sx/n, vy=syy-sy*sy/n; if(vx<=1e-9||vy<=1e-9) return null;
  return cov/Math.sqrt(vx*vy); }

/* build one row per tracked day with every numeric signal aligned by date */
function kikoCorrData(days){
  const byDate={}; (state.range||[]).forEach(r=>{ if(r&&r.date)byDate[r.date]=r.notes||{}; }); byDate[TODAY]=state.today||{};
  const wByDate={}; (state.sentinel.weightLog||[]).forEach(w=>{ if(w&&w.date&&w.w!=null)wByDate[w.date]=w; });
  const setOf=k=>new Set(((state.sentinel.checkinLog||{})[k]||[]));
  const streamSet=setOf("streamed"), artSet=setOf("madeArt");
  (state.sentinel.artLog||[]).forEach(e=>{ if(e&&e.date)artSet.add(e.date); });
  const rows=[];
  for(let i=days-1;i>=0;i--){ const d=dayAgo(-i); const n=byDate[d]; if(!n)continue;
    const food=(n.food||[]); const hasFood=food.length>0;
    const protein=food.reduce((a,f)=>a+(+f.protein||0),0), fiber=food.reduce((a,f)=>a+(+f.fiber||0),0);
    const w=wByDate[d];
    rows.push({
      water: n.mounjaro&&n.mounjaro.water!=null?+n.mounjaro.water:null,
      nausea: n.mounjaro&&n.mounjaro.nausea!=null?+n.mounjaro.nausea:null,
      sleep: n.sleep!=null?+n.sleep:null,
      mood: n.mind&&n.mind.mood!=null?+n.mind.mood:null,
      anxiety: n.mind&&n.mind.anxiety!=null?+n.mind.anxiety:null,
      energy: n.mind&&n.mind.energy!=null?+n.mind.energy:null,
      cravings: n.pcos&&n.pcos.cravings!=null?+n.pcos.cravings:null,
      protein: hasFood?protein:null,
      fiber: hasFood?fiber:null,
      weight: w?+w.w:null,
      streamed: streamSet.has(d)?1:0,
      madeArt: artSet.has(d)?1:0,
    });
  }
  return rows;
}

function kikoCorrelations(mode){
  let rows; try{ rows=kikoCorrData(45); }catch(e){ return []; }
  if(rows.length<3) return [];
  const col=k=>rows.map(r=>r[k]);
  const C=[];
  const add=(a,b,opt)=>{ const A=col(a),B=col(b),pairs=[]; for(let i=0;i<rows.length;i++){ if(A[i]!=null&&B[i]!=null)pairs.push([A[i],B[i]]); }
    const minN=opt.minN||5, thr=opt.thr||0.45; if(pairs.length<minN) return;
    const r=kikoPearson(pairs); if(r==null) return;
    if(r>=thr&&opt.pos) C.push({score:Math.abs(r),t:opt.pos});
    else if(r<=-thr&&opt.neg) C.push({score:Math.abs(r),t:opt.neg}); };
  if(mode!=="creator"){
    add("water","weight",{pos:"💧 Your water and weight tend to rise and fall together — day-to-day water weight, completely harmless. ⚖️"});
    add("water","nausea",{neg:"🥤 On your higher-water days, nausea tends to run lower."});
    add("protein","nausea",{neg:"🍳 Protein-heavier days tend to come with less nausea for you."});
    add("sleep","mood",{pos:"😴 Your longer-sleep nights tend to land with gentler moods."});
    add("sleep","energy",{pos:"⚡ More sleep tends to show up as more energy the same day."});
    add("anxiety","mood",{neg:"🌧️ Higher-anxiety days tend to dip your mood — those may deserve extra softness."});
    add("water","energy",{pos:"💧 Your energy tends to be brighter on well-hydrated days."});
    add("cravings","sleep",{neg:"🍩 Your cravings tend to be quieter after longer-sleep nights."});
    add("fiber","cravings",{neg:"🌿 Higher-fibre days tend to come with quieter cravings."});
  } else {
    add("energy","streamed",{pos:"⚡ You tend to stream on your higher-energy days."});
    add("mood","streamed",{pos:"💜 Your streams tend to land on your gentler-mood days."});
    add("energy","madeArt",{pos:"🎨 Your art tends to happen on your higher-energy days."});
    add("sleep","streamed",{pos:"😴 Your better-slept days tend to be your streaming days."});
  }
  C.sort((a,b)=>b.score-a.score);
  return C.slice(0,3).map(c=>({t:c.t}));
}

function noticedCard(N){ return `<div class="gcard"><div class="sec-label">✨ Kiko noticed</div>
  ${N.length?N.map(o=>`<div class="kn-row"><span class="kn-dot"></span><span>${esc(o.t)}</span></div>`).join(""):`<p class="soft" style="font-size:12.5px;margin:0">No clear patterns yet — a few more tracked days and Kiko will start spotting trends and connections for you. ❄️</p>`}</div>`; }

function gameUpdatesCard(){
  const evs=(state.sentinel.calendarEvents||[]).filter(gameSrc).map(e=>({...e,days:daysBetween(TODAY,e.date)})).filter(e=>e.days>=0&&e.days<=14).sort((a,b)=>a.days-b.days).slice(0,6);
  return `<div class="gcard"><div class="sec-label">🎮 Game updates</div>
    ${evs.length?evs.map(e=>`<div class="kn-row"><span class="kn-dot"></span><span class="grow">${esc(e.title)}</span>${evTierChip(e.days,false,fmtDate(e.date))}</div>`).join(""):`<p class="soft" style="font-size:12.5px;margin:0">No game beats on the radar — ask Kiko to refresh the game calendar. 🎮</p>`}
    <button class="btn" data-act="tab" data-tab="calendar" style="margin-top:10px">view all game events →</button></div>`;
}

/* ===== On This Day — gentle date-anchored memory resurfacing (Idea #14) =====
   Reads the shared buildMemoryIndex() and surfaces past memories that fall on
   today's anniversary or in soft windows (last week / two weeks / a month / ~a year).
   Pure read — no new storage; anything pushed into the memory index appears here free. */
function onThisDayPicks(){
  let idx; try{ idx=buildMemoryIndex(); }catch(e){ return []; }
  if(!idx||!idx.length) return [];
  const now=new Date(TODAY+"T00:00"); if(isNaN(now)) return [];
  const tY=now.getFullYear(), tM=now.getMonth(), tD=now.getDate(), t0=now.getTime();
  const out=[], seen=new Set();
  const add=(m,when,rank)=>{ if(!m||!m.id||seen.has(m.id))return; seen.add(m.id); out.push({m,when,rank}); };
  idx.forEach(m=>{
    const dt=new Date(String(m.date)+"T00:00"); if(isNaN(dt))return;
    const diff=Math.round((t0-dt.getTime())/86400000); if(diff<1)return;          // past only
    if(dt.getMonth()===tM && dt.getDate()===tD){                                  // exact anniversary
      const ya=tY-dt.getFullYear(); add(m, ya<=1?"One year ago today":`${ya} years ago today`, 0); return; }
    if(diff>=5 && diff<=9)         add(m,"Last week",2);
    else if(diff>=12 && diff<=16)  add(m,"Two weeks ago",3);
    else if(diff>=26 && diff<=34)  add(m,"A month ago",4);
    else if(diff>=355 && diff<=375) add(m,"About a year ago",5);
  });
  out.sort((a,b)=>a.rank-b.rank);   // anniversaries first; index is already newest-first within a rank
  return out;
}

function cardOnThisDay(){
  const picks=onThisDayPicks();
  const head=`<div class="card-head"><span class="label">🗓️ On this day</span>${picks.length>1?`<button class="btn" data-act="otdAnother">↻ another</button>`:""}</div>`;
  if(!picks.length) return `<section class="panel">${head}${UI.empty({emoji:"🗓️",title:"No echoes yet",msg:"As your journals, photos and milestones gather, Kiko will resurface what happened on this day in the past. ❄️"})}</section>`;
  const i=((state._otdIdx||0)%picks.length+picks.length)%picks.length, {m,when}=picks[i];
  const icon=MEM_ICON[m.kind]||"✨";
  const openBtn=m.kind==="photo"
    ? `<button class="btn" data-act="mediaView" data-id="${esc(m.mediaId||"")}">view</button>`
    : (m.source?`<button class="btn" data-act="memOpen" data-page="${esc(m.source.page)}" data-ref="${esc(m.source.refId||"")}">open</button>`:"");
  return `<section class="panel">${head}
    <div style="font-family:var(--display);font-size:13px;color:var(--lav-deep);margin:2px 0 4px">${esc(when)} · ${esc(fmtDate(m.date))}</div>
    <div class="listrow"><span style="font-size:18px;flex:0 0 auto" aria-hidden="true">${icon}</span>
      <span class="grow" style="min-width:0"><b style="font-size:13px">${esc(m.title||"")}</b>
        <div class="soft" style="font-size:12px;line-height:1.45">${esc(m.preview||"")}</div></span>${openBtn}</div>
    ${picks.length>1?`<p class="soft" style="font-size:10.5px;margin:8px 0 0;text-align:right">${i+1} of ${picks.length}</p>`:""}
  </section>`;
}

function gachaGameSpark(g,evs){
  const n=g.name;
  // only upcoming STARTS — skip anything with "end/ends/close/last day" in the title
  const starts=evs.filter(x=>x.days>=0&&!/\bend\b|\bends\b|\bclos/i.test(x.title||''));
  if(!starts.length) return null;
  const e=starts[0];
  const type=gachaEventType(e);
  const when=e.days===0?'today':e.days===1?'tomorrow':`in ${e.days} days`;
  return {text:`${type} — "${e.title}" starts ${when}. Stream idea?`, type};
}

function gachaUpdatesSection(allEvs){
  const fut=allEvs.filter(e=>e.days>=0&&e.days<=21).sort((a,b)=>a.days-b.days);
  const ending=fut.filter(e=>/end|close|last\s*day/i.test(e.title||''));
  const streams=fut.filter(e=>e.src==='gamestream');
  const rest=fut.filter(e=>!ending.includes(e)&&!streams.includes(e));
  const mkSec=(em,label,items)=>items.length?`<div style="margin-bottom:10px"><div class="sec-label">${em} ${label}</div>${items.map(e=>`<div class="kn-row"><span class="kn-dot"></span><span class="grow" style="font-size:12.5px">${esc(e.title)}</span>${evTierChip(e.days,e.days===0,fmtDate(e.date))}</div>`).join('')}</div>`:'';
  const body=mkSec('⏳','Ending soon',ending)+mkSec('🌟','Updates & banners',rest)+mkSec('📺','Livestreams',streams);
  return `<section class="panel" style="margin-bottom:16px"><div class="card-head"><span class="label">🗓️ Game events</span><button class="btn" data-act="tab" data-tab="calendar">calendar →</button></div>${body||`<p class="soft" style="font-size:12.5px;margin:0">No game events on the radar. Add them to the Calendar to see them here. 🎮</p>`}</section>`;
}

function compactGachaAlert(){
  const list=gachaList(), checks=state.today.gacha||{};
  const done=list.filter(g=>checks[g.id]).length, total=list.length;
  const urgent=(state.sentinel.calendarEvents||[]).filter(gameSrc).map(e=>({...e,days:daysBetween(TODAY,e.date)})).filter(e=>e.days>=0&&e.days<=1).sort((a,b)=>a.days-b.days);
  if(!total) return '';
  return `<div class="gcard"><div class="sec-label" style="margin-bottom:8px">🎮 Gachas</div>
    <p style="font-size:13px;margin:0 0 4px;font-weight:600">${done}/${total} dailies done${done===total?' ✦':''}</p>
    ${urgent.slice(0,2).map(e=>`<p style="font-size:11.5px;margin:2px 0;color:var(--ink-soft)">⏳ ${esc(e.title)}</p>`).join('')}
    <button class="btn" data-act="tab" data-tab="gachas" style="margin-top:10px;width:100%">Open Gachas →</button>
  </div>`;
}

function pulsePrompt(gameName){
  return `Today is ${TODAY}. You are a community sentiment researcher for a VTuber content creator who covers gacha games. Search Reddit (r/${gameName.replace(/\s/g,'')}, r/gachagaming), Twitter/X trending posts, and YouTube video comments RIGHT NOW.

FRESHNESS RULE — CRITICAL: Every single piece of information you include — hype, drama, events, reactions — must be from the last 14 days (between ${new Date(new Date(TODAY).getTime()-14*86400000).toISOString().slice(0,10)} and ${TODAY}). If you cannot find something recent enough, say so honestly rather than pulling in old news. A year-old lawsuit, a months-old controversy, or a stale Reddit post is USELESS and embarrassing to share with a live audience. Only include things that happened or are actively being discussed RIGHT NOW.

WHAT I NEED FOR DRAMA — READ THIS CAREFULLY:
I do NOT want:
- Complaints about web events, login bonuses, or event duration
- Minor gacha rate complaints
- Random blog/news site opinions
- Anything a random content farm website wrote

I DO want REAL community-wide frustration that a content creator could actually make a video or stream about:
- Mass review bombing campaigns (App Store, Google Play, Steam)
- Character design changes/controversies that upset the fanbase
- Developer decisions that went against what the community wanted
- Lackluster or poorly received livestreams/showcases
- Long-running frustrations that have been building up (content drought, ignored feedback, powercreep, censorship)
- Harbinger/character design controversies, "waifu-bait" concerns, changing art direction
- Community splits, prominent creator callouts, dev PR failures
- Anything trending negatively on r/${gameName.replace(/\s/g,'')} or r/gachagaming with significant upvotes

The drama should be something real fans are ACTUALLY angry about — not something a content site wrote to fill space. If recent posts on Reddit or Twitter are calling something out loudly, that's what I want.

RULES:
- Only include things specific to ${gameName}
- Every claim needs a real source link (Reddit thread, Twitter post, YouTube video)
- Do NOT mention web events or login rewards as drama under any circumstances
- Be brutally honest — do not soften the community's actual reaction

Reply in EXACTLY this format — no intro, no preamble:
HYPE: [one sentence — what SPECIFIC thing people are genuinely excited about right now, name it exactly + source link]
DRAMA: [one sentence — the most significant real community frustration/backlash right now. Name exactly what happened, when, and why people are upset. Must be something content-creator-worthy. Include a Reddit or Twitter source link.]
IDEA: [one punchy stream or video title reacting to the REAL community mood — something you could actually click on YouTube]
DETAIL: [full breakdown: what happened, timeline, how the community reacted, notable Reddit posts or tweets, direct quotes if you can find them, why this matters for a streamer covering ${gameName}]`;
}

async function refreshCommunityPulse(gid){
  const btn=document.getElementById("pulse-btn-"+gid);
  if(btn){ btn.disabled=true; btn.textContent="🦊…"; }
  try{
    const g=(gachaList()||[]).find(x=>x.id===gid); if(!g) return;
    const d=await kikoSimpleCall({question:pulsePrompt(g.name),history:[],tab:"gachas",userModel:state.sentinel.kikoUserModel||"",smart:false});
    const ans=d.reply||"";
    if(ans) await setSent(n=>{ const v=(n.sparkVault||[]).filter(x=>x.gid!==gid); return {...n,sparkVault:[...v,{id:"spark"+Date.now(),gid,text:ans,date:TODAY}]}; });
    try{ render(); }catch(_){}
  }catch(e){ if(btn){ btn.disabled=false; btn.textContent="research"; } }
}

async function refreshAllCommunityPulse(){
  const btn=document.getElementById("pulseAllBtn");
  if(btn){ btn.disabled=true; btn.textContent="🦊 researching…"; }
  const list=gachaList()||[];
  for(const g of list){
    try{
      const d=await kikoSimpleCall({question:pulsePrompt(g.name),history:[],tab:"gachas",userModel:state.sentinel.kikoUserModel||"",smart:false});
      const ans=d.reply||"";
      if(ans) await setSent(n=>{ const v=(n.sparkVault||[]).filter(x=>x.gid!==g.id); return {...n,sparkVault:[...v,{id:"spark"+Date.now(),gid:g.id,text:ans,date:TODAY}]}; });
      await new Promise(r=>setTimeout(r,2000));
    }catch(_){}
  }
  try{ render(); }catch(_){}
  if(btn){ btn.disabled=false; btn.textContent="🔄 refresh all"; }
}

function viewGachas(){
  const list=gachaList(), checks=state.today.gacha||{};
  const done=list.filter(g=>checks[g.id]).length, total=list.length;
  // weeklies = ALL tracked games (not just the old sub-list)
  const wkDone=list.filter(g=>gachaWkDoneThisWeek(g.id)).length;
  const wkPending=list.filter(g=>!gachaWkDoneThisWeek(g.id));
  const allEvs=(state.sentinel.calendarEvents||[]).filter(gameSrc).map(e=>({...e,days:daysBetween(TODAY,e.date)}));
  const endingSoon=allEvs.filter(e=>e.days>=0&&e.days<=3&&/\bend\b|\bends\b|\bclos/i.test(e.title||''));
  const todayUpd=allEvs.filter(e=>e.days>=0&&e.days<=30&&!/\bend\b|\bends\b|\bclos/i.test(e.title||''));
  // bi-weekly focus — offset 0 = this week (days 0-7), offset 1 = next week (days 7-14)
  const wkOff=state.gachaWeekOffset||0;
  const wkLo=wkOff*7, wkHi=wkLo+7;
  const daysUntilEnd=e=>{ if(!e.endDate) return null; const d=daysBetween(TODAY,e.endDate); return d>=0?d:null; };
  const isEndingTitle=e=>/\bend\b|\bends\b|\bclos|\bexpir|\blast day|\breset\b/i.test(e.title||'');
  // "due in days" = days until endDate if set, else days until start (for title-based ending events)
  const dueDays=e=>{ const d=daysUntilEnd(e); return d!=null?d:e.days; };
  const isEndingEvent=e=>{ const due=daysUntilEnd(e); if(due!=null) return due>=0&&due<=14; return isEndingTitle(e)&&e.days>=0&&e.days<=14; };
  // split into today / this-week / next-week
  const focusToday=allEvs.filter(e=>isEndingEvent(e)&&dueDays(e)===0).sort((a,b)=>dueDays(a)-dueDays(b));
  const todayIds=new Set(focusToday.map(e=>e.id));
  const isBanner=e=>gachaEventType(e)==='Banner';
  const focusEnding=allEvs.filter(e=>!todayIds.has(e.id)&&!isBanner(e)&&isEndingEvent(e)&&dueDays(e)>=wkLo&&dueDays(e)<=wkHi).sort((a,b)=>dueDays(a)-dueDays(b));
  const endingIds=new Set([...todayIds,...focusEnding.map(e=>e.id)]);
  const focusStart=allEvs.filter(e=>!endingIds.has(e.id)&&!isBanner(e)&&e.days>=wkLo&&e.days<=wkHi).sort((a,b)=>a.days-b.days);
  // checked-off state (day-scoped, stored in localStorage)
  const checkedKey="gachaEvChecked_"+TODAY;
  const getChecked=()=>{ try{ return new Set(JSON.parse(localStorage.getItem(checkedKey)||"[]")); }catch(_){ return new Set(); } };
  const toggleEvChecked=id=>{ const s=getChecked(); s.has(id)?s.delete(id):s.add(id); localStorage.setItem(checkedKey,JSON.stringify([...s])); try{render();}catch(_){} };
  window._toggleEvChecked=toggleEvChecked;
  const wkLabel=wkOff===0?"This week":"Next week";
  const lastRefresh=localStorage.getItem("gachaEvLastRefresh")||"never";
  const weeklies=gachaWeeklies();
  // game cards as modular widgets — drag/resize/minimize come for free
  const gameItems=list.map(g=>({key:g.id,label:g.name,cols:4,html:gachaGameCard(g,checks,weeklies,allEvs)}));
  const leftPanel=`<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;gap:10px">
      <div class="gg-stat" style="flex:1"><span class="gg-stat-n ${done===total&&total?'ok':''}">${done}/${total}</span><span class="gg-stat-l">Dailies</span></div>
      <div class="gg-stat" style="flex:1"><span class="gg-stat-n ${wkDone===total&&total?'ok':''}">${wkDone}/${total}</span><span class="gg-stat-l">Weeklies</span></div>
    </div>
    <section class="panel" style="margin:0;flex:1;display:flex;flex-direction:column">
      <div class="card-head"><span class="label">✨ Gacha Focus</span><button id="gachaRefreshBtn" class="btn btn-grad" data-act="refreshGachaEvents">🔄 Refresh events</button></div>
      <div style="display:flex;align-items:center;gap:6px;margin:0 0 8px">
        <button class="btn" style="padding:3px 8px;font-size:11px" data-act="gachaWeekOffset" data-v="0" ${wkOff===0?'disabled':''}>← This week</button>
        <span style="font-size:12px;font-weight:700;color:var(--lav-deep);flex:1;text-align:center">${wkLabel}</span>
        <button class="btn" style="padding:3px 8px;font-size:11px" data-act="gachaWeekOffset" data-v="1" ${wkOff===1?'disabled':''}>Next week →</button>
      </div>
      <p class="soft" style="font-size:11px;margin:0 0 6px">Last updated: ${lastRefresh==="never"?"never — press Refresh!":lastRefresh}</p>
      <div id="gachaFocusBody">
      ${!focusToday.length&&!focusEnding.length&&!focusStart.length?`<p class="soft" style="font-size:12px;margin:4px 0">No events found for ${wkLabel.toLowerCase()} — press 🔄 Refresh and Kiko will look them up!</p>`:""}
      ${(()=>{ const checked=getChecked(); return focusToday.length?`
        <div style="background:rgba(220,80,60,.08);border:1.5px solid rgba(220,80,60,.25);border-radius:10px;padding:8px 10px;margin:4px 0 10px">
          <p style="font-size:13px;font-weight:800;color:#d94f30;margin:0 0 2px;letter-spacing:-.01em">🚨 Do today!</p>
          <p class="soft" style="font-size:11px;margin:0 0 8px">These end or reset today — grab your gems now!</p>
          ${focusToday.map(e=>{ const done=checked.has(e.id); return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:0.5px solid rgba(220,80,60,.15)">
            <button data-act="toggleEvChecked" data-id="${esc(e.id)}" style="width:22px;height:22px;border-radius:6px;border:2px solid ${done?'#d94f30':'rgba(220,80,60,.4)'};background:${done?'#d94f30':'transparent'};color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer">${done?'✓':''}</button>
            <span class="grow" style="font-size:13px;${done?'text-decoration:line-through;color:var(--muted)':''}">${esc(e.title)}</span>
            <span class="pill tier-urgent" style="flex:none">Today!</span>
          </div>`; }).join('')}
        </div>`:''})()}
      ${focusEnding.length?`<p style="font-size:14px;font-weight:800;color:#e07030;margin:8px 0 2px;letter-spacing:-.01em">⏳ Ending ${wkLabel.toLowerCase()}</p><p class="soft" style="font-size:11px;margin:0 0 6px">Make sure to grab all event gems before they're gone!</p>${focusEnding.map(e=>`<div class="kn-row"><span class="kn-dot" style="background:#e07030;flex:none"></span><span class="grow" style="font-size:13px">${esc(e.title)}</span>${evDaysChip(dueDays(e),fmtDate(e.endDate||e.date))}</div>`).join('')}`:''}
      ${focusStart.length?`<p style="font-size:14px;font-weight:800;color:var(--lav-deep);margin:8px 0 2px;letter-spacing:-.01em">🌟 Starting ${wkLabel.toLowerCase()}</p><p class="soft" style="font-size:11px;margin:0 0 6px">Content opportunities!</p>${focusStart.map(e=>`<div class="kn-row"><span class="kn-dot" style="flex:none"></span><span class="grow" style="font-size:13px">${esc(e.title)}</span>${evDaysChip(e.days,fmtDate(e.date))}</div>`).join('')}`:''}
      </div>
    </section>
  </div>`;
  return `<div class="page" style="padding-top:12px">
    <div style="display:flex;gap:14px;align-items:stretch;margin-bottom:16px;flex-wrap:wrap">
      ${leftPanel}
      <div style="flex:1;min-width:260px">${cardGacha()}</div>
    </div>
    ${gameItems.length?modularGrid('gachas',gameItems,false):`<p class="soft" style="font-size:12.5px">No games yet — add them in the tracker above. 🎮</p>`}
    ${cardGachaCommunityPulse()}
    ${DISCLAIMER}
  </div>`;
}


function viewHome(){
  const m=state.today.mind||{};
  if(PREF.focus){
    return `<div style="max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:16px">
      <section class="panel"><div class="card-head"><span class="label">🌙 Just today</span><button class="btn" data-act="pref" data-f="focus">exit focus</button></div>
        <h2 style="font-size:20px">${greeting()}, ${esc(CONFIG.creator.name)} ${CONFIG.creator.emoji}</h2>
        <p class="soft" style="font-size:12.5px;margin:4px 0 12px">One gentle tap at a time. That's a whole check-in. ❄️</p>
        ${scaleRow("Mood","mindSet","mood",m.mood,"low","bright")}
        ${scaleRow("Anxiety","mindSet","anxiety",m.anxiety,"stressed","calm")}
        ${scaleRow("Energy","mindSet","energy",m.energy,"empty","full")}
      </section>
      ${cardBrainDump()}
    </div>${DISCLAIMER}`;
  }
  const creator=OS_MODE!=="health";
  const _md=creator?"creator":"health";
  const F=suggestedFocus(_md);
  const glance=`<section class="panel">
    ${glanceHeader()}
    <div class="glance-cols" style="margin-bottom:12px">${focusCard(F)}${quickNoticesCard()}</div>
    ${creator?'':healthSnapshotCard()}
    <p class="got-this">You've got this, ${esc(CONFIG.creator.name)}! ✨</p>
  </section>`;
  const items=creator?[
    {key:"cgoals",label:"Daily goals",cols:4,html:cardCreatorGoals()},
    {key:"schedule",label:"Stream schedule",cols:4,html:cardSchedule()},
    {key:"contentops",label:"Stream prep",cols:4,html:cardContentOps()},
    {key:"cgrowth",label:"Creator growth",cols:4,html:cardCreatorGrowth()},
    {key:"goals",label:"Goals",cols:4,html:cardGoals()},
    {key:"deeppatterns",label:"Kiko noticed",cols:4,html:deepPatternsCard()},
    {key:"thisweek",label:"Coming up",cols:4,html:cardThisWeek()},
  ]:[
    {key:"habits",label:"Daily habits",cols:4,html:cardHabits()},
    {key:"journal",label:"Journal",cols:4,html:cardJournal()},
    {key:"weight",label:"Weight trend",cols:4,html:cardWeightTrend()},
    {key:"glance",label:"Dose & day glance",cols:4,html:cardGlance()},
    {key:"deeppatterns",label:"Kiko noticed",cols:4,html:deepPatternsCard()},
  ];
  return `<div class="home-fixed">${cardHero()}${glance}</div>${modularGrid(creator?"home":"homehealth",items)}${DISCLAIMER}`;
}

/* ===================== 🎉 EVENTS — dedicated page (never mixed with game updates) ===================== */
function evTier(days,urgent){ if(urgent)return ["Urgent","tier-urgent"]; if(days<=0)return["Today","tier-today"]; if(days===1)return["Tomorrow","tier-tmrw"]; if(days<=7)return["This Week","tier-week"]; if(days<=30)return["This Month","tier-month"]; return["Later","tier-later"]; }

function evTierChip(days,urgent,dateStr){ const T=evTier(days,urgent); return `<span class="pill ${T[1]}" style="flex:none">${T[0]}${dateStr?" • "+dateStr:""}</span>`; }

/* toolbox keeps half-typed inputs across re-renders (same capture pattern as the script tab) */
function tbCapture(){ if(!state.tb)state.tb={spice:3}; const g=id=>{const e=document.getElementById(id);return e?e.value:null;};
  const t=g("tbTask"); if(t!=null)state.tb.task=t; const f=g("tbFText"); if(f!=null)state.tb.fText=f;
  const tn=g("tbFTone"); if(tn!=null)state.tb.fTone=tn; const e2=g("tbETask"); if(e2!=null)state.tb.eTask=e2; const c=g("tbCText"); if(c!=null)state.tb.cText=c;
  const tt=g("tbTText"); if(tt!=null)state.tb.tText=tt; }

/* shared store for event-prep + birthday-prep checklists (sentinel.eventPrep / sentinel.bdayPrep) */
async function prepWrite(kind,key,fn){ const field=kind==="bday"?"bdayPrep":"eventPrep";
  await setSent(n=>{ const all={...(n[field]||{})}; const cur={items:[],...(all[key]||{})}; all[key]=fn({...cur,items:(cur.items||[]).slice()}); return {...n,[field]:all}; }); render(); }

/* ===== Stream prep — a per-stream checklist that flips to off-stream work on non-stream days ===== */
/* both lists are editable + saved on the sentinel; stream-prep checks live per-day on today.streamPrep,
   off-stream built-ins reuse the check-in system, and custom off-stream tasks live on today.offStreamX. */
const STREAM_PREP_DEFAULT=[
  {id:"title",em:"🏷️",text:"Twitch title + tags"},
  {id:"thumb",em:"🖼️",text:"Thumbnail"},
  {id:"discord",em:"📣",text:"Discord announcement"},
  {id:"youtube",em:"📺",text:"YouTube premiere / stream"},
  {id:"scene",em:"🎬",text:"Scene + overlays ready"},
];

function streamPrepList(){ const l=state.sentinel.streamPrepList; return (Array.isArray(l)&&l.length)?l:STREAM_PREP_DEFAULT; }

/* off-stream content work — 4 built-ins (wired to the check-in system) + her own custom tasks */
const OFFSTREAM_WORK=[["emails","✉️","Reply to emails"],["sponsors","🤝","Work on sponsorships"],["coverSong","🎤","Cover-song progress"],["madeArt","🎨","Make art"]];

function offStreamExtra(){ const l=state.sentinel.offStreamExtra; return Array.isArray(l)?l:[]; }

function offStreamAllDone(){ const x=state.today.offStreamX||{}; return OFFSTREAM_WORK.every(w=>ciOn(w[0])) && offStreamExtra().every(e=>x[e.id]); }

function streamPrepAllDone(){ const c=state.today.streamPrep||{}; return streamPrepList().every(p=>c[p.id]); }

/* celebration popper — confetti bursts OUTWARD from the finished card (like a party popper / firework),
   peaks, then falls with gravity. Pass the card element so it pops right where you tapped. Respects Calm. */
function popConfetti(anchor){
  try{ if(document.body.classList.contains("calm")||matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const colors=["#758ac6","#ff9ed8","#a98fe0","#9fc3e8","#6fc3ab","#f3a978"];
    const r=(anchor&&anchor.getBoundingClientRect)?anchor.getBoundingClientRect():null;
    const cx=r?r.left+r.width/2:window.innerWidth/2;
    const cy=r?r.top+Math.min(r.height*0.45,140):window.innerHeight*0.4;   // burst from near the top-middle of the card
    const cont=document.createElement("div"); cont.style.cssText="position:fixed;inset:0;z-index:9500;pointer-events:none;overflow:hidden";
    document.body.appendChild(cont);
    for(let i=0;i<32;i++){ const p=document.createElement("div"); const c=colors[i%colors.length]; const sz=6+Math.random()*6;
      p.style.cssText=`position:absolute;left:${cx}px;top:${cy}px;width:${sz}px;height:${sz*0.55}px;background:${c};border-radius:2px;will-change:transform,opacity;`;
      const ang=-Math.PI/2+(Math.random()-0.5)*Math.PI*1.5;   // fan upward & out, like a popper
      const power=90+Math.random()*150, bx=Math.cos(ang)*power, by=Math.sin(ang)*power;   // burst peak
      const fall=160+Math.random()*200, rot=Math.random()*720-360;
      p.animate([
        {transform:"translate(-50%,-50%) rotate(0deg)",opacity:1,offset:0},
        {transform:`translate(calc(-50% + ${bx}px),calc(-50% + ${by}px)) rotate(${rot*0.4}deg)`,opacity:1,offset:0.32},   // shoot out & peak
        {transform:`translate(calc(-50% + ${bx*1.15}px),calc(-50% + ${by+fall}px)) rotate(${rot}deg)`,opacity:0,offset:1} // gravity pulls them down
      ],{duration:1100+Math.random()*600,easing:"cubic-bezier(.15,.6,.4,1)"});
      cont.appendChild(p); }
    setTimeout(()=>cont.remove(),1900);
  }catch(e){}
}


/* ===================== 🎨 ART STUDIO — full creative suite (ported from Eggie OS 2026-06-12) =====================
   16 cards: permission slip · challenges · draw-this prompt · art minutes · practice timer (+focus mode) ·
   100-of-anything · ideas dump · inspiration vault · emote previewer · value checker · palette & ramps ·
   platform specs · Live2D cut prep · drawing guides · mood board · tools & tutorials. All client-side maths
   (colour, SVG guides, canvas) — zero libraries. Data lives on the sentinel row. */
const ART_SUBJECTS=[
  "your OC at a summer festival (yukata)","your OC as a magical girl","your OC in their dream outfit","your OC in the clothes you're wearing right now","your OC as a flower fairy","your OC with wings","your OC in a Ghibli-esque style","your OC's most powerful moment","your OC on a rainy day in their world","your OC meeting their rival","your OC as a mecha pilot","your OC mid-laugh, a genuine smile","your OC half-asleep / just woke up","your OC bundled up for winter","your OC's villain alt / dark version","your OC as royalty","your OC as a café maid / butler","your OC and their pet or familiar","your OC taking a selfie","your OC in an idol stage outfit","your OC caught in the rain","your OC as a vampire / monster cutie","your OC at a school festival","your OC in a battle stance","your OC giving a shy confession","your OC in a cozy oversized hoodie","your OC as a fellow VTuber's design (fanart)","your OC reimagined in another art style",
  "your VTuber OC, half-body bust, ¾ view","a chibi version of your OC","an emote concept (pog / happy / crying)","an expression sheet, 5 emotions","a key-visual splash of your OC","a 'currently streaming' screen illustration","a detailed anime eye study","your OC's hairstyle explored 3 ways"
];

const ART_MOODS=["soft anime cel-shading","golden-hour rim light","neon cyberpunk glow","dreamy pastel gradient","moody dramatic backlight","sakura petals & bloom","cozy warm indoor light","ethereal cool blues","high-contrast manga inks","vaporwave sunset"];

const ART_CONSTRAINTS=["cel-shade with 2 light values","limited 3-colour palette","clean, finished lineart","one accent colour only","push the expression further","fully render the eyes","try foreshortening","background gradient + bloom","post it even if unfinished","30-minute speedpaint"];

const ART_GESTURES=["anime ¾ face","expressive anime eyes","dynamic action pose","hands holding a prop","idol / performance pose","cozy seated pose","hair-flow study","chibi proportions","dramatic foreshortening","two characters interacting","clothing-fold study","confident hero pose"];

const ART_REFRAMES=[
  "Art isn't a detour from your work — it's the well your work draws from. A dry well makes nothing. 🌊",
  "You're allowed to make things that only matter to you. That's not wasted time, that's being a person. 💗",
  "Play is how skill sneaks in. Every doodle is reps. 🖍️",
  "Rest and joy ARE productive — they're what keep you able to do everything else. 🥄",
  "No one ever regretted the 20 minutes they spent drawing something silly. 🦊",
  "Done beats perfect. A scribble finished beats a masterpiece imagined. 🌸",
  "Your worth isn't an output. You're allowed to make art for absolutely no reason. ✨",
  "The pressure to be 'productive' is what's stealing your art — not the art stealing your productivity. 🌙"
];

const ART_DAILY=["warm up with 5 expression doodles","a quick chibi of your OC","one detailed anime eye study","redraw an old piece of your OC art","30-min colour study from an anime screencap","design one new emote","ink one clean character","draw your OC's hairstyle 3 ways","a half-body bust, sketch only","gesture 5 poses, 30s each"];

const ART_WEEKLY=["finish one polished half-body illustration of your OC","design a post-ready emote","a master study of an artist you admire","render your OC in a brand-new outfit","build an expression sheet you can reuse","make a key-visual splash to post","draw fanart of a VTuber you like","learn + apply one new rendering technique"];

const DEFAULT_ART_RES=[
  {id:"r1",title:"Line of Action — gesture / figure timer",url:"https://line-of-action.com/practice-tools/",tag:"reference"},
  {id:"r2",title:"Coolors — palette generator",url:"https://coolors.co/",tag:"colour"},
  {id:"r3",title:"Adobe Color — colour wheel + harmonies",url:"https://color.adobe.com/create/color-wheel",tag:"colour"},
  {id:"r4",title:"Paletton — classical colour schemes",url:"https://paletton.com/",tag:"colour"},
  {id:"r5",title:"Free perspective grid generator",url:"https://art-and-see.com/blogs/tools/perspective-grid-generator",tag:"perspective"},
  {id:"r6",title:"17 digital drawing exercises (Don Corgi)",url:"https://doncorgi.com/blog/digital-drawing-exercises/",tag:"learn"},
  {id:"r7",title:"Color theory for digital artists (Clip Studio)",url:"https://www.clipstudio.net/how-to-draw/archives/161372",tag:"learn"}
];

/* research pack — added via the one-tap button (never force-merged, so deletes stick) */
const ART_PACK=[
  {title:"AdorkaStock — photo poses (CC, diverse, SFW)",url:"https://www.adorkastock.com",tag:"reference"},
  {title:"AdorkaStock Sketch — timed pose sessions",url:"https://www.adorkastock.com/sketch/",tag:"reference"},
  {title:"Posemaniacs — 3D écorché + free hand viewer",url:"https://www.posemaniacs.com/en",tag:"reference"},
  {title:"x6ud — pose a skeleton, find photo refs",url:"https://x6ud.github.io/pose-search/",tag:"reference"},
  {title:"Quickposes — timed gesture",url:"https://quickposes.com/en/gestures/timed",tag:"reference"},
  {title:"PoseMy.Art — 3D posing, anime models",url:"https://posemy.art",tag:"reference"},
  {title:"Character Design References — visual library",url:"https://characterdesignreferences.com/visual-library",tag:"learn"},
  {title:"Sakugabooru — standout anime cuts (safe-filtered)",url:"https://www.sakugabooru.com/post?tags=rating%3As",tag:"learn"},
  {title:"e-shuushuu — strictly-SFW anime board",url:"https://e-shuushuu.net",tag:"reference"},
  {title:"Clip Studio Assets — free brushes & materials",url:"https://assets.clip-studio.com/en-us",tag:"learn"},
  {title:"Drawabox — free fundamentals (the 50% rule 💗)",url:"https://drawabox.com",tag:"learn"},
  {title:"Colormind — ML palettes (Ghibli-pastel vibes)",url:"http://colormind.io",tag:"colour"},
  {title:"Coblis — colour-blindness check for emotes/thumbs",url:"https://www.color-blindness.com/coblis-color-blindness-simulator/",tag:"colour"},
  {title:"PureRef — floating reference board (pay-what-you-want)",url:"https://www.pureref.com",tag:"other"},
];

function aid(p){ return (p||"a")+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

function artRand(a){ return a[Math.floor(Math.random()*a.length)]; }

function seedPick(list,seed){ let h=0; for(let i=0;i<seed.length;i++)h=(h*31+seed.charCodeAt(i))>>>0; return list[h%list.length]; }

function artMonday(d){ const dt=new Date(d+"T00:00"); const off=(dt.getDay()+6)%7; dt.setDate(dt.getDate()-off); return dt.toLocaleDateString("en-CA"); }

function fmtClock(s){ s=Math.max(0,s); return Math.floor(s/60)+":"+("0"+(s%60)).slice(-2); }

function hsl2hex(h,s,l){ h=(h%360+360)%360; s=Math.max(0,Math.min(100,s))/100; l=Math.max(0,Math.min(100,l))/100; const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2; let r,g,b; if(h<60){r=c;g=x;b=0;}else if(h<120){r=x;g=c;b=0;}else if(h<180){r=0;g=c;b=x;}else if(h<240){r=0;g=x;b=c;}else if(h<300){r=x;g=0;b=c;}else{r=c;g=0;b=x;} const t=v=>("0"+Math.round((v+m)*255).toString(16)).slice(-2); return "#"+t(r)+t(g)+t(b); }

function randHex(){ return hsl2hex(Math.random()*360, 42+Math.random()*42, 44+Math.random()*26); }

async function mbUpdate(id,patch){ await setSent(n=>({...n,artBoard:(n.artBoard||[]).map(c=>c.id===id?{...c,...patch}:c)})); }

/* uploaded photos → downscaled data-URL so they persist in the DB and always export to PNG (no CORS) */
function mbFileToDataURL(file){ return new Promise((res,rej)=>{ const img=new Image(); const u=URL.createObjectURL(file);
  img.onload=()=>{ const MAX=900; let w=img.width,h=img.height; if(Math.max(w,h)>MAX){ const s=MAX/Math.max(w,h); w=Math.round(w*s); h=Math.round(h*s); }
    const cv=document.createElement("canvas"); cv.width=w; cv.height=h; cv.getContext("2d").drawImage(img,0,0,w,h); URL.revokeObjectURL(u);
    const png=(file.type==="image/png"); res({url:cv.toDataURL(png?"image/png":"image/jpeg",0.82), ar:w/h}); };
  img.onerror=()=>{ URL.revokeObjectURL(u); rej(new Error("couldn't read image")); };
  img.src=u; }); }

function mbWrapText(ctx,text,x,y,maxW,lh){ let yy=y; String(text).split("\n").forEach(para=>{ const words=para.split(/\s+/); let line=""; words.forEach(w=>{ const test=line?line+" "+w:w; if(ctx.measureText(test).width>maxW && line){ ctx.fillText(line,x,yy); line=w; yy+=lh; } else line=test; }); ctx.fillText(line,x,yy); yy+=lh; }); }

/* rasterise the freeform mood board to a PNG (for importing into Clip Studio etc.). CORS-blocked
   images can't be read back by the browser, so those become placeholder boxes — layout is preserved. */
async function exportMoodBoardPNG(){
  const boardEl=document.getElementById("moodBoard");
  const cards=(state.sentinel.artBoard||[]);
  if(!cards.length){ toast("Board's empty — add something first 🌸"); return; }
  const BW=Math.round((boardEl&&boardEl.clientWidth)||900), BH=Math.round((boardEl&&boardEl.clientHeight)||520), scale=2;
  const cv=document.createElement("canvas"); cv.width=BW*scale; cv.height=BH*scale; const ctx=cv.getContext("2d"); ctx.scale(scale,scale);
  ctx.fillStyle="#f6f8ff"; ctx.fillRect(0,0,BW,BH);
  ctx.fillStyle="#dfe5f4"; for(let y=0;y<BH;y+=22)for(let x=0;x<BW;x+=22){ ctx.beginPath(); ctx.arc(x,y,1,0,7); ctx.fill(); }
  const imgs={}; let failed=0;
  await Promise.all(cards.filter(c=>c.type==="img").map(c=>new Promise(res=>{ const im=new Image(); im.crossOrigin="anonymous"; im.onload=()=>{imgs[c.id]=im;res();}; im.onerror=()=>{failed++;res();}; im.src=c.url; })));
  const rr=(x,y,w,h,r)=>{ r=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); };
  cards.forEach(c=>{ const x=c.x||0,y=c.y||0,w=c.w||160,h=c.h||160; ctx.save();
    ctx.shadowColor="rgba(90,100,150,.18)"; ctx.shadowBlur=10; ctx.shadowOffsetY=3;
    if(c.type==="img"){ rr(x,y,w,h,12); ctx.fillStyle="#e9edf8"; ctx.fill(); ctx.shadowColor="transparent"; ctx.save(); rr(x,y,w,h,12); ctx.clip(); const im=imgs[c.id];
        if(im){ const ar=im.width/im.height, br=w/h; let dw,dh,dx,dy; if(ar>br){ dh=h; dw=h*ar; dx=x-(dw-w)/2; dy=y; } else { dw=w; dh=w/ar; dx=x; dy=y-(dh-h)/2; } ctx.drawImage(im,dx,dy,dw,dh); }
        else { ctx.fillStyle="#9aa5c8"; ctx.font="13px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("🖼 image",x+w/2,y+h/2); }
        ctx.restore(); }
    else if(c.type==="note"){ rr(x,y,w,h,12); ctx.fillStyle="#fff7da"; ctx.fill(); ctx.shadowColor="transparent"; ctx.strokeStyle="#f0e3a8"; ctx.lineWidth=1; rr(x,y,w,h,12); ctx.stroke(); ctx.fillStyle="#5a5230"; ctx.font="12.5px sans-serif"; ctx.textAlign="left"; ctx.textBaseline="top"; ctx.save(); rr(x,y,w,h,12); ctx.clip(); mbWrapText(ctx,c.text||"",x+9,y+9,w-18,17); ctx.restore(); }
    else { rr(x,y,w,h,12); ctx.fillStyle=c.color||"#ff9ed8"; ctx.fill(); ctx.shadowColor="transparent"; ctx.font="10px sans-serif"; const lw=ctx.measureText(c.color||"").width+12; ctx.fillStyle="rgba(0,0,0,.4)"; rr(x+w/2-lw/2,y+h-22,lw,16,6); ctx.fill(); ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(c.color||"",x+w/2,y+h-14); }
    ctx.restore(); });
  try{ cv.toBlob(b=>{ if(!b){ toast("Couldn't make the PNG 🌸"); return; } const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download="mood-board.png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),1500); toast(failed?("Saved 🎨 — "+failed+" image"+(failed>1?"s":"")+" couldn't embed (that site blocks it)"):"Mood board saved as PNG 🎨"); },"image/png"); }
  catch(err){ toast("Some images block PNG export — try CORS-friendly image links 🌸"); }
}

/* challenges refresh daily/weekly by DERIVING from the date — no render-time write */
function artChallengeState(sent){
  const ch=sent.artChallenge||{}; const wk=artMonday(TODAY);
  return {
    wk,
    dayText:(ch.dayRollDate===TODAY&&ch.dayRollText)?ch.dayRollText:seedPick(ART_DAILY,TODAY),
    weekText:(ch.weekRollWk===wk&&ch.weekRollText)?ch.weekRollText:seedPick(ART_WEEKLY,wk),
    dayDone:ch.dayDoneDate===TODAY,
    weekDone:ch.weekDoneWk===wk
  };
}

/* practice timer — global interval so it survives re-renders; updates the DOM by id */
let _artInt=null;

function artPickGesture(){ return ART_GESTURES[Math.floor(Math.random()*ART_GESTURES.length)]; }

function artTimerStart(){ if(!state.art)state.art={}; const t=state.art.timer=state.art.timer||{len:60,round:0,left:60}; t.on=true; t.left=t.len; t.round=(t.round||0)+1; t.elapsed=0; t.subject=artPickGesture(); state.art.pendingLog=null; if(_artInt)clearInterval(_artInt); _artInt=setInterval(artTick,1000); render(); }

function artTimerStop(){ const t=state.art&&state.art.timer; if(t){ t.on=false; if((t.elapsed||0)>=60) state.art.pendingLog=Math.round(t.elapsed/60); t.elapsed=0; } if(_artInt){clearInterval(_artInt);_artInt=null;} render(); }
   /* stopping offers to log the minutes — practice counts */
function artTimerSkip(){ const t=state.art&&state.art.timer; if(!t||!t.on)return; t.left=t.len; t.round=(t.round||0)+1; t.subject=artPickGesture(); artPaint(); }

function artPaint(){ const t=state.art&&state.art.timer; if(!t)return; const d=document.getElementById("artTimerDisp"); if(d)d.textContent=fmtClock(t.left); const s=document.getElementById("artTimerSub"); if(s)s.textContent=t.subject||""; const r=document.getElementById("artTimerRound"); if(r)r.textContent="round "+t.round; }

function artTick(){ const t=state.art&&state.art.timer; if(!t||!t.on||state.tab!=="art"){ if(_artInt){clearInterval(_artInt);_artInt=null;} if(t&&t.on){ t.on=false; if((t.elapsed||0)>=60)state.art.pendingLog=Math.round(t.elapsed/60); t.elapsed=0; } return; } t.elapsed=(t.elapsed||0)+1; t.left--; if(t.left<0){ t.round++; t.left=t.len-1; t.subject=artPickGesture(); const w=document.getElementById("artStage"); if(w){ w.style.background="#fdeaf6"; setTimeout(()=>{ w.style.background=""; },450); } } artPaint(); }

/* ===================== 📓 JOURNAL — private life archive (calendar · entries · capsules) =====================
   Privacy-first: the grid shows only summary chips; her written words appear ONLY after she opens a day.
   No forked data: it reads/writes the same day rows everything else uses (mood, sleep, weight, symptoms,
   the `journal` text) — new fields are just stress, sleepQ, tags, special. */
const JR_MOODS=["😶","🌧️","😔","😌","🙂","✨"];

function jrYM(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); }

async function jrFetchMonth(ref){
  const ym=jrYM(ref); state.jrCache=state.jrCache||{};
  if(state.jrCache[ym]) return state.jrCache[ym];
  const last=new Date(ref.getFullYear(),ref.getMonth()+1,0).getDate();
  const start=ym+"-01", end=ym+"-"+String(last).padStart(2,"0");
  const rows={};
  if(DEMO){ Object.entries(demo).forEach(([d,n])=>{ if(d>=start&&d<=end&&d!==SENTINEL) rows[d]=n; }); }
  else if(SB){ try{ const {data}=await SB.from("daily_logs").select("date,notes").eq("user_id",UID).gte("date",start).lte("date",end).neq("date",SENTINEL); (data||[]).forEach(r=>rows[r.date]=r.notes||{}); }catch(e){} }
  if(TODAY.slice(0,7)===ym) rows[TODAY]={...(rows[TODAY]||{}),...state.today};
  state.jrCache[ym]=rows; return rows;
}

async function jrFetchAll(){
  if(state.jrAll) return state.jrAll;
  let rows={};
  if(DEMO){ Object.entries(demo).forEach(([d,n])=>{ if(d!==SENTINEL) rows[d]=n; }); }
  else if(SB){ try{ const {data}=await SB.from("daily_logs").select("date,notes").eq("user_id",UID).neq("date",SENTINEL); (data||[]).forEach(r=>rows[r.date]=r.notes||{}); }catch(e){} }
  rows[TODAY]={...(rows[TODAY]||{}),...state.today};
  state.jrAll=rows; return rows;
}

/* write to ANY day's row (today or the past) and keep caches in step */
async function setDay(date,merge){
  const next=await DB.saveDaily(date,n=>merge(n));
  if(date===TODAY) state.today=next;
  const ym=date.slice(0,7);
  if(state.jrCache&&state.jrCache[ym]) state.jrCache[ym][date]=next;
  if(state.jrAll) state.jrAll[date]=next;
  return next;
}

function jrWeightMap(){ const m={}; (state.sentinel.weightLog||[]).forEach(x=>{ if(x.w!=null)m[x.date]=x.w; }); return m; }

/* was this date a stream day? best effort: planned week slots (current/overridden weeks; past defaults under-detect) */
function jrStreamDay(date){ try{ const d=new Date(date+"T00:00"); const wd=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
  return slotsForDate(d).some(s=>s.day===wd); }catch(e){ return false; } }

function jrSymptomFlag(n){ if(!n)return false; const p=n.pcos||{},mj=n.mounjaro||{};
  return ["fatigue","bloating","acne","shedding","cravings"].some(k=>(p[k]||0)>=3)||["nausea","constipation","diarrhea","reflux","belly"].some(k=>(mj[k]||0)>=3); }

/* ============================================================================
   GLOBAL MEMORY SYSTEM (foundation) — one index that Search, Timeline, Favourites and
   Bunny-timeline all read from. Derived from existing stores (no migration) + explicit
   sentinel.memories (future quotes/cards). Deterministic ids so favourites are stable.
   Next slice: the Media Library (uploads) that these items will reference by id.
   ============================================================================ */
const MEM_ICON={journal:"📖",milestone:"⚖️",quote:"💬",memcard:"✨",health:"💗",bunny:"🐰",bunnymoment:"🐰",event:"🎉",photo:"📸",win:"🏆",lore:"📜",house:"🏡"};

function memFavSet(){ return new Set((state.sentinel&&state.sentinel.memFav)||[]); }

function memMonthLabel(ym){ try{ return new Date(ym+"-01T00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"}); }catch(e){ return ym; } }

function buildMemoryIndex(){
  const s=state.sentinel||{}; const out=[]; const seen=new Set();
  const clip=(t,n)=>{ t=String(t||"").replace(/\s+/g," ").trim(); n=n||130; return t.length>n?t.slice(0,n-1).trim()+"…":t; };
  const push=(it)=>{ if(!it||!it.id||!it.date||seen.has(it.id))return; seen.add(it.id); out.push(it); };
  try{ (s.memories||[]).forEach(m=>{ if(m&&m.id&&m.date) push({...m, preview:clip(m.preview||m.title)}); }); }catch(e){}
  try{ (s.journalEntries||[]).forEach((e,i)=>{ if(!e||!e.date)return; const txt=e.text||(Array.isArray(e.log)?e.log.filter(x=>x&&x.who==="Mifu").map(x=>x.text).join(" "):"")||"";
    push({id:"jr:"+(e.id||e.date+":"+i), kind:"journal", date:e.date, title:"Journal", preview:clip(txt), source:{page:"journal",refId:e.date}}); }); }catch(e){}
  try{ const byd={}; (state.range||[]).forEach(r=>{ if(r&&r.date)byd[r.date]=r.notes||{}; }); if(state.today)byd[TODAY]=state.today;
    Object.entries(byd).forEach(([d,n])=>{ if(!n)return;
      if(n.journal&&String(n.journal).trim()) push({id:"jrd:"+d, kind:"journal", date:d, title:"Journal", preview:clip(n.journal), source:{page:"journal",refId:d}});
      if(n.special) push({id:"sp:"+d, kind:"event", date:d, title:"Special day", preview:clip(typeof n.special==="string"?n.special:"A day worth remembering",110), source:{page:"journal",refId:d}}); }); }catch(e){}
  try{ const wl=(s.weightLog||[]).filter(x=>x&&x.w!=null).slice().sort(cmpDate); let min=Infinity; const u=CONFIG.weightUnit||"kg";
    wl.forEach(x=>{ if(x.w<min-0.001){ min=x.w; push({id:"wt:"+x.date, kind:"milestone", date:x.date, title:"New lowest weight", preview:`${x.w} ${u}`, source:{page:"trends",refId:x.date}}); } }); }catch(e){}
  try{ (s.calendarEvents||[]).forEach(e=>{ if(!e||!e.date)return; if(typeof gameSrc==="function"&&gameSrc(e))return;
    if(/🎂|birthday/i.test(e.title||""))return;   // birthdays live only in the Events & Birthdays hub, never duplicated here
    push({id:"ev:"+(e.id||e.date), kind:"event", date:e.date, title:clip(e.title,80), preview:clip(e.note||e.title,120), source:{page:"events",refId:e.id||e.date}}); }); }catch(e){}
  try{ (s.memoryCapsules||[]).forEach(c=>{ const ym=c.ym||c.month; if(!ym)return; push({id:"cap:"+ym, kind:"memcard", date:ym+"-15", title:"Monthly memory · "+memMonthLabel(ym), preview:clip(c.capsule||c.text), source:{page:"journal",refId:ym+"-01"}}); }); }catch(e){}
  try{ (state.media||[]).forEach(m=>{ if(!m||!m.id)return; push({id:"md:"+m.id, kind:"photo", date:m.date||(String(m.addedAt||"").slice(0,10))||TODAY, title:m.caption||"Photo", preview:m.caption||"", people:m.people||[], tags:m.tags||[], fav:!!m.fav, mediaId:m.id, url:m.url, source:{page:"memories",refId:m.id}}); }); }catch(e){}
  try{ (s.bunnyMilestones||[]).forEach(mi=>{ if(!mi||!mi.date)return; const who=({kieran:"Kieran",myla:"Myla",both:"Myla & Kieran"})[mi.bunny]||"Bunny"; push({id:"bun:"+(mi.id||mi.date), kind:"bunnymoment", date:mi.date, title:who, preview:clip(mi.text), people:who==="Myla & Kieran"?["Myla","Kieran"]:[who], source:{page:"bunny",refId:mi.id||mi.date}}); }); }catch(e){}
  try{ (s.wins||[]).forEach(w=>{ if(!w||!w.date)return; push({id:"win:"+(w.id||w.date), kind:"win", date:w.date, title:w.title||"Win", preview:clip(w.why||w.cat||""), source:{page:"wins",refId:w.id||w.date}}); }); }catch(e){}
  try{ (s.streamLore||[]).forEach(L=>{ if(!L||!L.date)return; push({id:"lore:"+(L.id||L.date), kind:"lore", date:L.date, title:L.title||"Stream moment", preview:clip(L.summary||L.why||""), tags:L.tags||[], source:{page:"streamlore",refId:L.id||L.date}}); }); }catch(e){}
  try{ (s.houseLog||[]).forEach(h=>{ if(!h||!h.date)return; push({id:"house:"+(h.id||h.date), kind:"house", date:h.date, title:h.place||"Home", preview:clip(h.summary||h.meaning||""), source:{page:"house",refId:h.id||h.date}}); }); }catch(e){}
  const fav=memFavSet();
  out.forEach(m=>{ if(m.kind!=="photo") m.fav=fav.has(m.id); m.people=m.people||[]; m.tags=m.tags||[]; });   // photos use their own media.fav
  out.sort((a,b)=> a.date<b.date?1:a.date>b.date?-1:0);   // newest first
  return out;
}

function memIsBunny(m){ const p=(m.people||[]).map(x=>String(x).toLowerCase()); return p.includes("myla")||p.includes("kieran")||/\b(myla|kieran|bunny|bunnies|rabbit)\b/i.test((m.title||"")+" "+(m.preview||"")); }

/* ---- Media library: assets live in their OWN lazily-loaded row (not the hot sentinel, so boot
   stays fast), referenced by id. Client-side compression keeps each photo small; writes bypass
   the undo system (a multi-MB image snapshot would blow the localStorage undo quota). Scale-up
   path = Supabase Storage (URLs only) when the library outgrows a curated set — see the blueprint. */
const MEDIA_KEY="2000-01-02", MEDIA_CAP=80;

async function loadMedia(){ if(state.media!==undefined||state._mediaLoading)return; state._mediaLoading=true;
  try{ const notes=await DB.daily(MEDIA_KEY); state.media=(notes&&notes.media)||[]; }catch(e){ state.media=[]; } state._mediaLoading=false; }

async function setMedia(fn){
  const cur=(state.media!==undefined&&state.media!==null)?state.media:(((await DB.daily(MEDIA_KEY))||{}).media||[]);
  const next=fn(cur.slice()).slice(-MEDIA_CAP); state.media=next;
  if(DEMO){ demo[MEDIA_KEY]={media:next}; return; }
  if(SB){ try{ await SB.from("daily_logs").upsert({user_id:UID,date:MEDIA_KEY,notes:{media:next}},{onConflict:"user_id,date"}); }catch(e){ console.error(e); toast("couldn't save media 🌧️"); } }
}

function compressImage(file,maxDim=1000,q=0.72){ return new Promise(res=>{ try{ const r=new FileReader();
  r.onload=()=>{ const img=new Image(); img.onload=()=>{ try{ let w=img.naturalWidth||img.width, h=img.naturalHeight||img.height;
    if(!w||!h){ res(r.result); return; } if(w>maxDim||h>maxDim){ const s=maxDim/Math.max(w,h); w=Math.round(w*s); h=Math.round(h*s); }
    const c=document.createElement("canvas"); c.width=w; c.height=h; c.getContext("2d").drawImage(img,0,0,w,h); res(c.toDataURL("image/jpeg",q)); }catch(_){ res(r.result); } };
    img.onerror=()=>res(null); img.src=r.result; }; r.onerror=()=>res(null); r.readAsDataURL(file); }catch(_){ res(null); } }); }

function wireMedia(){
  const inp=$("#mediaFile");
  if(inp&&!inp._wired){ inp._wired=true; inp.addEventListener("change", async ()=>{
    const files=[...(inp.files||[])]; inp.value=""; if(!files.length)return;
    const room=MEDIA_CAP-((state.media||[]).length); if(room<=0){ toast(`library is full (${MEDIA_CAP}) — delete a few first ❄️`); return; }
    toast("adding photos… 📸"); const adds=[];
    for(const f of files.slice(0,room)){ if(!/^image\//.test(f.type))continue; const url=await compressImage(f); if(url) adds.push({ id:"m"+Date.now()+Math.floor(Math.random()*1000), type:"photo", url, caption:"", date:TODAY, addedAt:new Date().toISOString(), people:[], tags:[], fav:false }); }
    if(adds.length){ await setMedia(arr=>[...arr,...adds]); toast(`added ${adds.length} 📸`); render(); }
  }); }
  document.querySelectorAll('.md-cap').forEach(el=>{ if(el._wired)return; el._wired=true;
    el.addEventListener("blur", async ()=>{ const id=el.dataset.id, cap=String(el.value||"").slice(0,160);
      const m=(state.media||[]).find(x=>x.id===id); if(!m||m.caption===cap)return; await setMedia(arr=>arr.map(x=>x.id===id?{...x,caption:cap}:x)); }); });
}

function jrMonthLabel(ym){ const d=new Date((ym||TODAY.slice(0,7))+"-01T00:00"); return d.toLocaleDateString("en-US",{month:"long"})+" · "+jrColorName(ym); }

let _jrSaveT=null;

/* the day view/editor — her words live HERE, behind a click, never on the grid */
async function jrEntryModal(date){
  await jrFetchMonth(new Date(date+"T00:00"));
  const n=((state.jrCache||{})[date.slice(0,7)]||{})[date]||{};
  const m=n.mind||{}, mj=n.mounjaro||{}, p=n.pcos||{};
  const wm=jrWeightMap();
  const kikoEntries=(state.sentinel.journalEntries||[]).filter(e=>e.date===date);
  const scaleBtns=(id,val)=>[0,1,2,3,4,5].map(i=>`<button data-jrscale="${id}" data-v="${i}" class="${val===i?'on':''}">${i}</button>`).join("");
  $("#modal").innerHTML=`<div class="modal-bg" data-act="closeModal"><div class="modal" data-act="noop" style="max-width:560px;width:100%;max-height:92vh;overflow:auto">
    <div class="card-head"><h3 style="font-size:16px">📓 ${new Date(date+"T00:00").toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})} ${jrStreamDay(date)?'<span class="pill pill-sak">🔴 stream day</span>':""}</h3><button class="btn" data-act="closeModal">✕</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field" style="margin:0"><div class="label">Mood</div><div class="scale">${scaleBtns("mood",m.mood)}</div></div>
      <div class="field" style="margin:0"><div class="label">Energy</div><div class="scale">${scaleBtns("energy",m.energy)}</div></div>
      <div class="field" style="margin:0"><div class="label">Stress</div><div class="scale">${scaleBtns("stress",n.stress)}</div></div>
      <div class="field" style="margin:0"><div class="label">Sleep quality</div><div class="scale">${scaleBtns("sleepQ",n.sleepQ)}</div></div>
      <div class="field" style="margin:0"><div class="label">Sleep (hrs)</div><input class="inp" id="jrSleep" type="number" step="0.5" value="${n.sleep!=null?n.sleep:""}"></div>
      <div class="field" style="margin:0"><div class="label">Weight (${CONFIG.weightUnit})</div><input class="inp" id="jrWeight" type="number" step="0.1" value="${wm[date]!=null?wm[date]:""}"></div>
      <div class="field" style="margin:0"><div class="label">Food noise</div><div class="scale">${scaleBtns("foodnoise",mj.foodnoise)}</div></div>
      <div class="field" style="margin:0"><div class="label">Cravings</div><div class="scale">${scaleBtns("cravings",p.cravings)}</div></div>
    </div>
    <div class="field"><div class="label">Tags <span class="soft" style="text-transform:none">· comma separated</span></div><input class="inp" id="jrTags" placeholder="collab, con-prep, cozy…" value="${esc((n.tags||[]).join(", "))}"></div>
    <label style="display:flex;gap:8px;align-items:center;font-size:12.5px;cursor:pointer;margin:4px 0 10px"><input type="checkbox" id="jrSpecial" ${n.special?"checked":""}> 💜 special day</label>
    <div class="field"><div class="label">Your journal <span class="soft" style="text-transform:none">· private, only behind this click 🔒</span></div>
      <textarea class="inp" id="jrText" rows="6" placeholder="today, in your own words…">${esc(n.journal||"")}</textarea></div>
    ${kikoEntries.length?`<details class="acc" style="margin:4px 0 10px"><summary>🦊 Kiko journal${kikoEntries.length>1?"s":""} from this day (${kikoEntries.length})</summary><div class="acc-body">${kikoEntries.map(e=>`<div style="white-space:pre-wrap;font-size:12.5px;line-height:1.6;margin-bottom:8px">${esc(e.text||"")}</div>`).join("")}</div></details>`:""}
    <p class="soft" style="font-size:10.5px;margin:0 0 10px">Full symptom check-ins live on the ❄️ Health tab — these are the journal essentials. Notes on PCOS/Mounjaro from that day ride along automatically.</p>
    <button class="btn btn-grad" data-act="jrSave" data-date="${date}" style="width:100%">💾 save this day</button>
  </div></div>`;
  document.querySelectorAll("[data-jrscale]").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll(`[data-jrscale="${b.dataset.jrscale}"]`).forEach(x=>x.classList.remove("on")); b.classList.add("on"); }));
}

function tbStepText(s){ return typeof s==="string"?s:(s&&s.text)||""; }

/* ===================== PCOS / HEALTH ===================== */
function cycleStats(cyc){
  const h=(cyc.history||[]).filter(x=>x&&x.start).slice().sort((a,b)=>a.start<b.start?-1:1);
  const gaps=[]; for(let i=1;i<h.length;i++) gaps.push(daysBetween(h[i-1].start,h[i].start));
  const lens=h.filter(x=>x.end).map(x=>Math.max(1,daysBetween(x.start,x.end)+1));
  const avg=a=>a.length?Math.round(a.reduce((p,c)=>p+c,0)/a.length):null;
  const withGap=h.map((x,i)=>({...x, gap:i>0?daysBetween(h[i-1].start,x.start):null}));
  return { h:withGap, count:h.length, gaps, avgGap:avg(gaps), minGap:gaps.length?Math.min(...gaps):null, maxGap:gaps.length?Math.max(...gaps):null, avgLen:avg(lens) };
}

function waterCups(){ return (state.today&&state.today.mounjaro&&state.today.mounjaro.water)||0; }

function water40(){ return waterCups()/CUPS_PER_40OZ; }
            // her unit: full 40oz cups
/* ===== doctor-ready health report (compiled from her own data; tracking, not advice) ===== */
function buildHealthReport(){
  const s=state.sentinel||{}, u=CONFIG.weightUnit||"kg"; const R=[];
  const range=30; const since=dayAgo(-(range-1));
  const byDate={}; (state.range||[]).forEach(r=>byDate[r.date]=r.notes); byDate[TODAY]=state.today;
  const avg=a=>a.length?(a.reduce((x,y)=>x+y,0)/a.length):null;
  R.push(`HEALTH SUMMARY — ${esc(CONFIG.creator.name||"Mifu")}`);
  R.push(`Prepared ${new Date().toLocaleDateString()} · covers the last ${range} days (${fmtDate(since)}–${fmtDate(TODAY)})`);
  R.push(`This is a self-tracked summary to support a conversation with your clinician — it is not a medical record or advice.`);
  R.push("");
  // weight & body composition
  const wl=withBMI((s.weightLog||[]).filter(x=>x).slice().sort(cmpDate));
  const inRange=wl.filter(x=>x.date>=since);
  R.push("— WEIGHT & BODY COMPOSITION —");
  const wlw=wl.filter(x=>x.w!=null);
  if(wlw.length){ const cur=wlw[wlw.length-1], first=wlw[0];
    R.push(`Weight: ${cur.w}${u} (latest ${fmtDate(cur.date)})${wlw.length>1?`; ${(cur.w-first.w>=0?"+":"")}${Math.round((cur.w-first.w)*10)/10}${u} since ${fmtDate(first.date)}`:""}`); }
  BODYCOMP.filter(([k])=>k!=="w").forEach(([k,l,unit])=>{ const e=wl.filter(x=>x[k]!=null); if(!e.length)return; const last=e[e.length-1], f=e[0];
    R.push(`${l}: ${last[k]}${unit||""}${e.length>1?` (${last[k]-f[k]>=0?"+":""}${Math.round((last[k]-f[k])*10)/10} over ${e.length} readings)`:""}`); });
  if(!wlw.length) R.push("No weigh-ins logged in this period.");
  R.push("");
  // mounjaro
  R.push("— MOUNJARO (tirzepatide) —");
  const cur=currentDose(); const inj=(s.injectionLog||[]).slice().sort(cmpDate);
  if(inj.length){ const li=inj[inj.length-1]; const start=inj[0].date; const weeks=Math.floor(daysBetween(start,TODAY)/7);
    R.push(`Current dose: ${cur?cur.dose:li.dose} mg · on treatment ~${weeks} weeks · ${inj.length} injections logged (last ${fmtDate(li.date)}${li.site?", "+li.site:""}).`); }
  else R.push("No injections logged.");
  const seKeys=[["nausea","Nausea"],["constipation","Constipation"],["diarrhea","Diarrhea"],["reflux","Reflux"],["belly","Abdominal discomfort"],["fatigue","Fatigue"],["foodnoise","Appetite/food-noise"]];
  const seLines=seKeys.map(([k,l])=>{ const vals=[]; for(let i=0;i<range;i++){ const d=dayAgo(-i); const v=byDate[d]&&byDate[d].mounjaro&&byDate[d].mounjaro[k]; if(v!=null)vals.push(v); } const a=avg(vals); return a!=null?`${l} ${a.toFixed(1)}/5`:null; }).filter(Boolean);
  if(seLines.length) R.push("Avg side-effect levels: "+seLines.join(", ")+".");
  R.push("");
  // pcos & cycle
  R.push("— PCOS & CYCLE —");
  const st=cycleStats(s.cycle||{});
  if((s.cycle||{}).lastStart){ const dx=daysBetween(s.cycle.lastStart,TODAY); R.push(`Last period start: ${fmtDate(s.cycle.lastStart)} (${dx} days ago).${st.avgGap?` Avg cycle ~${st.avgGap}d over ${st.count} logged.`:""}${dx>=45?" Note: a longer gap, common with PCOS.":""}`); }
  else R.push("No periods logged.");
  const pcKeys=[["acne","Acne"],["shedding","Hair shedding"]];  // fatigue/bloating/cravings now consolidated into mounjaro fields
  const pcLines=pcKeys.map(([k,l])=>{ const vals=[]; for(let i=0;i<range;i++){ const d=dayAgo(-i); const v=byDate[d]&&byDate[d].pcos&&byDate[d].pcos[k]; if(v!=null)vals.push(v); } const a=avg(vals); return a!=null?`${l} ${a.toFixed(1)}/5`:null; }).filter(Boolean);
  if(pcLines.length) R.push("Avg PCOS symptoms: "+pcLines.join(", ")+".");
  R.push("");
  // mood / energy / sleep / water trends
  R.push("— WELLBEING TRENDS (avg, direction over period) —");
  try{ const {series}=buildSeries(); const tl=TREND_METRICS.map(([k,e,l])=>{ const vals=(series[k]||[]).filter(v=>v!=null); if(!vals.length)return null; const a=avg(vals); const h=Math.floor(vals.length/2)||1; const d=avg(vals.slice(-h))-avg(vals.slice(0,h)); const dir=d>0.4?"rising":d<-0.4?"falling":"steady"; return `${l} ${a.toFixed(1)} (${dir})`; }).filter(Boolean);
    if(tl.length) R.push(tl.join(", ")+"."); else R.push("Not enough tracked days yet."); }catch(_){ R.push("—"); }
  R.push("");
  // meds + adherence
  R.push("— MEDICATIONS —");
  const meds=(s.medsList||[]);
  if(meds.length){ meds.forEach(m=>R.push(`• ${m.name}${m.dose?" "+m.dose:""}${m.time?" ("+m.time+")":""}${m.refill?` — refill by ${fmtDate(m.refill)}`:""}`));
    let amY=0,pmY=0,days=0; for(let i=0;i<range;i++){ const d=dayAgo(-i); const md=byDate[d]&&byDate[d].meds; if(md&&(md.am!=null||md.pm!=null)){ days++; if(md.am)amY++; if(md.pm)pmY++; } }
    if(days) R.push(`Adherence (days both AM+PM tracked): AM ${Math.round(amY/days*100)}%, PM ${Math.round(pmY/days*100)}% over ${days} logged days.`); }
  else R.push("No medications listed.");
  R.push("");
  // nutrition
  const fh=foodHistory(Math.min(range,30)).filter(h=>h.meals.length);
  if(fh.length){ R.push("— NUTRITION (logged days) —"); R.push(`Avg protein ${Math.round(avg(fh.map(h=>h.protein)))}g, fibre ${Math.round(avg(fh.map(h=>h.fiber)))}g per logged day.`); R.push(""); }
  // notable patterns
  try{ const ps=patternSpotter(byDate).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(); if(ps && ps.length>10 && !/few more tracked/i.test(ps)){ R.push("— GENTLE PATTERNS NOTICED —"); R.push(ps); R.push(""); } }catch(_){}
  R.push("Generated by Mifuyu OS · self-tracked data · not a diagnosis.");
  return R.join("\n");
}

function showHealthReport(){
  const txt=buildHealthReport();
  $("#modal").innerHTML=`<div class="modal-bg" data-act="closeModal"><div class="modal" data-act="noop" style="max-width:560px">
    <div class="card-head"><h3 style="font-size:16px">📋 Health report for your doctor</h3><button class="btn" data-act="closeModal">✕</button></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">A tidy summary of your last 30 days — copy it, or print/save as PDF to bring to an appointment. Tracking only, not medical advice. ❄️</p>
    <pre id="hrText" style="white-space:pre-wrap;font-family:var(--sans);font-size:12px;line-height:1.5;background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;max-height:50vh;overflow:auto;margin:0">${esc(txt)}</pre>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn btn-grad" data-act="copyHealthReport">📋 copy</button><button class="btn" data-act="printHealthReport">🖨️ print / save PDF</button></div>
  </div></div>`;
}

function viewPcos(){
  const p=state.today.pcos||{}, cyc=state.sentinel.cycle||{};
  const st=cycleStats(cyc);
  const dx=cyc.lastStart?daysBetween(cyc.lastStart,TODAY):null;
  const months=dx!=null?dx/30.44:null;
  const longGap=dx!=null&&dx>=45;
  return `
  <section class="panel">
    <div class="card-head"><h2 style="font-size:18px">❄️ PCOS — your patterns</h2><button class="btn" data-act="healthReport" title="a tidy 30-day summary for your doctor">📋 Doctor report</button></div>
    <p class="soft" style="font-size:12px;margin:0 0 4px">PCOS-specific symptoms and gentle habits — fill the shared daily check-in above once. ❄️</p>
  </section>

  <section class="panel">
    <div class="label" style="margin-bottom:4px">🌸 PCOS symptoms</div>
    <p class="soft" style="font-size:11px;margin:0 0 8px">Skin + hair signals that are specific to PCOS — 0 = rough day · 5 = fine. 💗</p>
    ${scaleRow("Acne flare","pcosSet","acne",p.acne,"severe","clear")}
    ${scaleRow("Scalp hair shedding","pcosSet","shedding",p.shedding,"heavy","none")}
    <div class="label" style="margin:14px 0 6px">🌱 Gentle, supportive habits</div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">No targets to fail — just a soft tally on the days they happen.</p>
    <div class="chiprow">
      ${chiptog("Moved my body","pcosToggle","moved",p.moved)}
      ${chiptog("Balanced meals","pcosToggle","balanced",p.balanced)}
      ${chiptog("Protein with meals","pcosToggle","protein",p.protein)}
      ${chiptog("Eased sugar spikes","pcosToggle","lowsugar",p.lowsugar)}
    </div>
  </section>

  <details class="acc"><summary>🪶 Weekly / occasional notes</summary><div class="acc-body">
    ${scaleRow("Unwanted hair / hirsutism (check in weekly)","pcosSet","hirsutism",p.hirsutism)}
  </div></details>
  <details class="acc"><summary>💗 What helps me</summary><div class="acc-body">
    <textarea class="inp" id="helpsNote" placeholder="things that make a PCOS day softer…">${esc(state.sentinel.helps||"")}</textarea>
    <div style="margin-top:8px"><button class="btn btn-grad" data-act="saveHelps">Save</button></div>
  </div></details>

  <details class="acc"><summary>🌙 Cycle <span class="soft" style="font-weight:500">· tucked away — open if you ever need it</span></summary><div class="acc-body">
    <div class="soft-card">
      ${cyc.lastStart
        ? `<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="bignum">Day ${dx}</span><span class="soft" style="font-size:12px">since your last period started (${fmtDate(cyc.lastStart)})${months>=1.5?` · ~${months.toFixed(1)} months`:''}</span></div>`
        : `<p class="soft" style="font-size:12.5px;margin:0">No period logged yet — log a start whenever you need to. ❄️</p>`}
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-grad" data-act="cycleStart">Log period start</button>
        <button class="btn" data-act="cycleEnd">Log period end</button>
      </div>
      <div class="field"><div class="label">Flow today (optional)</div><div class="chiprow">
        ${["light","med","heavy"].map(f=>`<button class="sitebtn ${state.today.flow===f?'on':''}" data-act="pcosSet" data-f="flow" data-v="${f}">${f}</button>`).join("")}</div></div>
      ${st.count?`<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:4px">
          <div><div class="label">Logged</div><div style="font-weight:700">${st.count} period${st.count===1?'':'s'}</div></div>
          ${st.avgGap?`<div><div class="label">Avg cycle</div><div style="font-weight:700">~${st.avgGap}d</div></div>`:''}
          ${st.gaps.length>1?`<div><div class="label">Range</div><div style="font-weight:700">${st.minGap}–${st.maxGap}d</div></div>`:''}
          ${st.avgLen?`<div><div class="label">Avg length</div><div style="font-weight:700">~${st.avgLen}d</div></div>`:''}
        </div>`:''}
      <p class="soft" style="font-size:11px;margin-top:8px">Cycles vary a lot with PCOS — long or skipped months are common, and that's okay. 🦊</p>
      ${longGap?`<div class="disc" style="margin-top:8px">${CONFIG.creator.snow}<span>It's been ${months>=2?`about ${Math.round(months)} months`:'a longer stretch'} since your last period — worth a gentle mention to your doctor whenever you next chat. No alarm, just a note. 🦊</span></div>`:''}
      ${st.count?`<details style="margin-top:8px;border:none;background:transparent;padding:0;box-shadow:none"><summary style="font-size:12px">📜 Period history (${st.count}) · tap ✕ to remove a mistaken log</summary>
        <div style="margin-top:6px">${st.h.slice().reverse().map(x=>`<div class="listrow"><span class="grow" style="font-size:12px">${fmtDate(x.start)}${x.end?` – ${fmtDate(x.end)}`:''} ${x.flow?`<span class="soft">· ${esc(x.flow)}</span>`:''}</span>${x.gap!=null?`<span class="soft" style="font-size:11px" title="days since previous">+${x.gap}d</span>`:''}<button class="x" data-act="delPeriod" data-start="${esc(x.start)}" data-end="${esc(x.end||'')}" title="remove this log">✕</button></div>`).join("")}</div></details>`:''}
    </div>
  </div></details>
  ${DISCLAIMER}`;
}


/* ===================== MOUNJARO ===================== */
function currentDose(){ const h=(state.sentinel.doseHistory||[]).slice().sort((a,b)=>a.started<b.started?-1:1); return h.length?h[h.length-1]:null; }

function viewMj(){
  const mj=state.today.mounjaro||{}, cur=currentDose();
  const log=(state.sentinel.injectionLog||[]).slice().reverse();
  const doses=CONFIG.mounjaro.doses, sites=CONFIG.mounjaro.sites;
  const unit=CONFIG.weightUnit||"kg";
  // journey weight trend: start = first weight on/after the first shot (else earliest weight) → latest
  const wl=(state.sentinel.weightLog||[]).filter(x=>x&&x.w!=null).slice().sort(cmpDate);
  const firstShot=(state.sentinel.injectionLog||[]).slice().sort(cmpDate)[0];
  const journeyStart=firstShot?firstShot.date:(wl[0]?wl[0].date:null);
  const weeksOnMj=journeyStart?Math.floor(daysBetween(journeyStart,TODAY)/7):0;
  let startW=null; if(wl.length){ const after=wl.find(x=>!journeyStart||x.date>=journeyStart); startW=(after||wl[0]).w; }
  const nowW=wl.length?wl[wl.length-1].w:null;
  const change=(startW!=null&&nowW!=null)?(nowW-startW):null;       // negative = loss
  const lost=change!=null?-change:null;
  const lostStr=lost==null?"—":(Math.abs(lost)<0.05?"±0":(lost>0?"↓ ":"↑ ")+Math.abs(lost).toFixed(1)+" "+unit);
  const lostColor=lost==null?"var(--ink)":(lost>0?"#3a9d83":(lost<-0.05?"var(--sakura-deep)":"var(--ink)"));
  const trendNote = lost==null
    ? `Log a weight or two and your progress since starting will show here. ⚖️`
    : `Since starting${journeyStart?` ~${weeksOnMj} week${weeksOnMj===1?'':'s'} ago`:''}: ${startW} → ${nowW} ${unit}. Every direction is data, not a verdict — be kind to yourself. ❄️`;
  return `
  <section class="panel">
    <div class="card-head"><h2 style="font-size:18px">💉 Mounjaro journey</h2><span class="pill pill-ice">once weekly</span></div>
    <p class="soft" style="font-size:12px;margin:0 0 4px">Tracking and reflecting only — never advice. Dose changes are always your doctor's call. 🦊</p>
  </section>

  <section class="panel">
    <div class="label" style="margin-bottom:4px">🩹 Mounjaro-specific side effects</div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">These three are specific to the medication — nausea, bloating, fatigue and food noise are in the shared daily check-in above. 0 = rough · 5 = fine.</p>
    ${scaleRow("Constipation","mjSet","constipation",mj.constipation,"severe","none")}
    ${scaleRow("Diarrhea","mjSet","diarrhea",mj.diarrhea,"severe","none")}
    ${scaleRow("Reflux / heartburn","mjSet","reflux",mj.reflux,"severe","none")}
    <div class="label" style="margin:14px 0 6px">🌿 Supportive habits</div>
    <div class="chiprow">
      ${chiptog("Protein with meals","mjToggle","proteinMeals",mj.proteinMeals)}
      ${chiptog("Smaller meals","mjToggle","smallerMeals",mj.smallerMeals)}
      ${chiptog("Fiber / veggies","mjToggle","fiber",mj.fiber)}
      ${chiptog("Gentle movement","mjToggle","gentleMove",mj.gentleMove)}
    </div>
  </section>

  <section class="panel">
    <div class="soft-card" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
      <div><div class="label">Current dose</div><div class="bignum">${cur?cur.dose:'—'} mg</div></div>
      <div><div class="label">Weight so far</div><div class="bignum" style="color:${lostColor}">${lostStr}</div></div>
      <div class="grow" style="min-width:160px"><p class="soft" style="font-size:11.5px;margin:0">${trendNote}</p></div>
    </div>
  </section>

  <details class="acc"><summary>🩺 When to check in with your doctor</summary><div class="acc-body">
    <p class="soft" style="font-size:12px">Most tummy stuff is normal and settles. Still, you know your body — these are gentle reasons to give your care team a call (a reminder, never a diagnosis):</p>
    <ul style="font-size:12px;color:var(--ink-soft);padding-left:18px">
      <li>Severe stomach pain that won't ease — especially if it radiates to your back (can be a sign of something urgent like pancreatitis, worth prompt medical attention)</li>
      <li>Relentless vomiting, or signs of dehydration (very dry mouth, dizziness, barely peeing)</li>
      <li>Gallbladder-type pain (upper-right belly), fever, or yellowing skin/eyes</li>
      <li>Anything that simply feels wrong or frightening to you</li>
    </ul>
    <p class="peri" style="font-size:12px;font-weight:700">You know your body — this is a reminder, not a diagnosis. ❄️</p>
  </div></details>

  <section class="panel">
    <div class="label" style="margin-bottom:6px">💉 Log this week's shot</div>
    <p class="soft" style="font-size:12px;margin:0 0 10px">${siteHint()}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="field"><div class="label">Date</div><input class="inp" type="date" id="shotDate" value="${TODAY}"></div>
      <div class="field"><div class="label">Time</div><input class="inp" type="time" id="shotTime" value="20:00"></div>
    </div>
    <div class="field"><div class="label">Dose (mg)</div><select class="inp" id="shotDose">${doses.map(d=>`<option value="${d}" ${cur&&cur.dose===d?'selected':''}>${d} mg</option>`).join("")}</select></div>
    <div class="field"><div class="label">Injection site (rotate!)</div><div class="chiprow" id="siteRow">
      ${sites.map(stt=>`<button class="sitebtn" data-act="pickSite" data-v="${esc(stt)}">${esc(stt)}</button>`).join("")}</div>
      <input type="hidden" id="shotSite" value=""></div>
    <div class="field" id="afterField"><div class="label">~30 min after — how do you feel?</div>
      <div class="scale">${[0,1,2,3,4,5].map(i=>`<button data-act="mjAfter" data-v="${i}">${i}</button>`).join("")}</div>
      <div class="scale-ends"><span>rough</span><span>fine</span></div></div>
    <div class="field"><div class="label">Note (optional)</div><input class="inp" type="text" id="shotNote" placeholder="how it went…"></div>
    <button class="btn btn-grad" data-act="logShot">Log shot ❄️</button>
  </section>

  <section class="panel">
    <div class="label" style="margin-bottom:6px">📜 Injection history</div>
    ${log.length?log.map(s=>`<div class="listrow"><div><b>${fmtDate(s.date)}</b> ${s.time?`<span class="soft">· ${esc(s.time)}</span>`:''}
      <div class="soft" style="font-size:11.5px">${s.dose} mg · ${esc(s.site||'—')}${s.after!=null?` · after ${s.after}/5`:''}${s.note?` · ${esc(s.note)}`:''}</div></div>
      <span class="grow"></span><button class="x" data-act="delShot" data-v="${s.id}">✕</button></div>`).join("")
      :`<p class="soft" style="font-size:12.5px">No shots logged yet. Your first one starts the rotation helper. 🦊</p>`}
  </section>
  ${DISCLAIMER}`;
}


/* ===================== WEIGHT ===================== */
function rollingAvg(arr){ if(!arr.length)return null; const l=arr.filter(x=>x.w!=null).slice(-4); return l.length?l.reduce((a,b)=>a+b.w,0)/l.length:null; }

// everything the Withings Body Smart can report (manual entry + sync both use these keys)
const BODYCOMP=[["w","Weight",CONFIG.weightUnit,"⚖️"],["bmi","BMI","","📐"],["fat","Body fat","%","🫧"],["muscle","Muscle","kg","💪"],["bone","Bone","kg","🦴"],["water","Body water","%","💧"],["visceral","Visceral fat","","🎯"]];

function bcLatest(wl,k){ const ent=wl.filter(x=>x[k]!=null); if(!ent.length)return null; const last=ent[ent.length-1], prev=ent.length>1?ent[ent.length-2]:null; return {v:last[k], date:last.date, d:prev?Math.round((last[k]-prev[k])*10)/10:null}; }

function withBMI(wl){ // attach a derived bmi to entries that have weight + we know height
  const h=state.sentinel.heightCm; if(!h) return wl;
  return wl.map(x=> (x.w!=null && x.bmi==null) ? {...x, bmi: Math.round((x.w/Math.pow(h/100,2))*10)/10} : x);
}


/* ===================== FOOD (photo → macros, protein & fibre forward) ===================== */
function foodTargets(){ const t=state.sentinel.foodTargets||{}; return { kcal:t.kcal||1500, protein:t.protein||110, fiber:t.fiber||28 }; }

function foodToday(){ return (state.today&&state.today.food)||[]; }

function foodTotals(){ return foodToday().reduce((a,x)=>({kcal:a.kcal+(+x.kcal||0),protein:a.protein+(+x.protein||0),carbs:a.carbs+(+x.carbs||0),fiber:a.fiber+(+x.fiber||0),fat:a.fat+(+x.fat||0)}),{kcal:0,protein:0,carbs:0,fiber:0,fat:0}); }

function foodHistory(days){
  const byDate={}; (state.range||[]).forEach(r=>byDate[r.date]=r.notes); byDate[TODAY]=state.today;
  const out=[]; for(let i=days-1;i>=0;i--){ const dd=dayAgo(-i); const f=(byDate[dd]&&byDate[dd].food)||[];
    const tot=f.reduce((a,x)=>({protein:a.protein+(+x.protein||0),fiber:a.fiber+(+x.fiber||0),kcal:a.kcal+(+x.kcal||0)}),{protein:0,fiber:0,kcal:0});
    out.push({date:dd, meals:f, ...tot}); } return out;
}

function viewFood(){
  if(!state.foodDraft) state.foodDraft={image:null,desc:"",est:null};
  const d=state.foodDraft, T=foodTargets(), tot=foodTotals(), list=foodToday();
  const items=[
    {key:"summary",label:"Today's totals",cols:5,html:`<section class="panel">
      <div class="card-head"><h2 style="font-size:18px">🍱 Today's food</h2><span class="pill pill-gray">${list.length} logged</span></div>
      <div class="soft-card">
        <div class="bignum" style="text-align:center">${Math.round(tot.kcal)} <span class="soft" style="font-size:12px;font-family:var(--sans)">kcal${T.kcal?` / ${T.kcal}`:''}</span></div>
        <div style="margin:10px 0 2px;display:flex;flex-direction:column;gap:11px">
          ${UI.progress({label:"Protein 💪",value:tot.protein,max:T.protein,unit:"g",tone:"peri"})}
          ${UI.progress({label:"Fiber 🌿",value:tot.fiber,max:T.fiber,unit:"g",tone:"mint"})}
        </div>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:10px"><span class="pill pill-ice">Carbs ${Math.round(tot.carbs)}g</span><span class="pill pill-lav">Fat ${Math.round(tot.fat)}g</span></div>
      </div>
      <p class="soft" style="font-size:11px;text-align:center;margin-top:8px">Protein &amp; fibre are the stars for you — aim to fill those bars. 💗 Numbers are friendly estimates.</p>
    </section>`},
    {key:"add",label:"Add a meal",cols:5,html:`<section class="panel">
      <div class="label" style="margin-bottom:6px">📸 Add a meal</div>
      <p class="soft" style="font-size:12px;margin:0 0 10px">Snap or upload your food and add a quick note — Kiko estimates the macros for you.${DEMO?` <b>(Deploy the ai function &amp; turn demo off to estimate.)</b>`:''}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start">
        <label class="btn btn-grad" style="cursor:pointer">📷 Photo<input type="file" id="foodFile" accept="image/*" capture="environment" style="display:none"></label>
        ${d.image?`<img src="${d.image}" alt="meal" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid var(--line)">`:''}
      </div>
      <textarea class="inp" id="foodDesc" rows="2" placeholder="what is it? (e.g. grilled chicken, rice &amp; kimchi · ~1 bowl)" style="margin-top:10px">${esc(d.desc||"")}</textarea>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-grad" data-act="foodAnalyze" ${state.foodBusy?'disabled':''}>${state.foodBusy?'estimating… ❄️':'✨ Estimate macros'}</button>${(d.image||d.desc)?'<button class="btn" data-act="foodClear">clear</button>':''}</div>
      ${d.est?foodEstCard(d.est):''}
      ${(state.sentinel.foodFaves||[]).length?`<div class="label" style="margin:12px 0 4px">⭐ Favorites — tap to log the usual</div><div class="chiprow">${(state.sentinel.foodFaves||[]).map(f=>`<button class="chiptog" data-act="favLog" data-id="${f.id}" title="${Math.round(f.kcal)} kcal · P${f.protein} · Fb${f.fiber}"><span>＋</span>${esc(f.name)}<span class="x" data-act="favDel" data-id="${f.id}" style="margin-left:3px">✕</span></button>`).join("")}</div>`:''}
    </section>`},
    {key:"logged",label:"Logged today",cols:5,html:`<section class="panel">
      <div class="card-head"><span class="label">🍽️ Logged today</span></div>
      ${list.length?list.slice().reverse().map(x=>`<div class="listrow"><span class="grow"><b style="font-size:13px">${esc(x.name)}</b> <span class="soft" style="font-size:11px">${x.serving?'· '+esc(x.serving):''}</span><div class="soft" style="font-size:11px">${Math.round(+x.kcal||0)} kcal · P ${Math.round(+x.protein||0)}g · Fb ${Math.round(+x.fiber||0)}g · C ${Math.round(+x.carbs||0)}g · F ${Math.round(+x.fat||0)}g</div></span><button class="x" data-act="favSave" data-id="${x.id}" title="save as a favorite">⭐</button><button class="x" data-act="foodDel" data-id="${x.id}">✕</button></div>`).join(""):`<p class="soft" style="font-size:12.5px">Nothing logged yet today. ❄️</p>`}
    </section>`},
    {key:"checkoffs",label:"Daily check-offs",cols:5,html:cardFoodCheckoffs()},
    {key:"foodweek",label:"This week",cols:10,html:cardFoodWeek()},
    {key:"kikofood",label:"Kiko & your food",cols:5,html:kikoFoodCard()},
    {key:"mealmem",label:"Meal memory",cols:5,html:mealMemoryCard()},
    {key:"lazyday",label:"Lazy-day meals",cols:5,html:lazyMealsCard()},
    {key:"targets",label:"Daily targets",cols:5,html:`<section class="panel"><div class="card-head"><span class="label">🎯 Daily targets</span></div>
      <p class="soft" style="font-size:11.5px;margin:0 0 8px">Tune these to whatever your care team suggests.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div class="field"><div class="label">Calories</div><input class="inp" type="number" id="ft_kcal" value="${T.kcal}"></div>
        <div class="field"><div class="label">Protein (g)</div><input class="inp" type="number" id="ft_protein" value="${T.protein}"></div>
        <div class="field"><div class="label">Fiber (g)</div><input class="inp" type="number" id="ft_fiber" value="${T.fiber}"></div>
      </div>
      <button class="btn btn-grad" data-act="saveFoodTargets" style="margin-top:8px">Save targets</button>
    </section>`},
  ];
  return `${modularGrid("food",items)}${DISCLAIMER}`;
}


/* ===================== CARE ===================== */
const FIRSTAID=[
  {e:"🖐️",t:"5-4-3-2-1 grounding",tint:"#e6ecfb",b:["Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.","It pulls you out of the spiral and back into right now.","Slow down on each one — no rushing."]},
  {e:"🟦",t:"Box breathing",tint:"#dcf3eb",b:["In 4 · hold 4 · out 4 · hold 4.","A few rounds steadies a racing heart.","The 🫧 bubble timer in the corner can pace you."]},
  {e:"🏷️",t:"Name it to tame it",tint:"#fde2f2",b:["Say the feeling out loud: \"this is anxiety.\"","Naming gives your thinking brain something to hold.","Feelings aren't facts — they can be huge and still not be true."]},
  {e:"❄️",t:"Cool water",tint:"#e2f0fb",b:["Cool water on your wrists or face nudges your nervous system toward calm.","A cold drink, a cool cloth — small resets count."]},
  {e:"🚪",t:"Step outside",tint:"#ece2fb",b:["Even 2 minutes of fresh air and a wider view can reset an overwhelm spike.","A change of room counts too."]},
  {e:"💬",t:"Text a friend",tint:"#fdeadb",b:["You don't have to carry it alone.","A small \"hey, rough moment\" is enough."]},
];

const REFRAMES=[
  {e:"🦋",t:"Feelings are visitors",tint:"#e6ecfb",b:["…not residents. This one is passing through, even if it knocked loudly."]},
  {e:"🌊",t:"This is a wave",tint:"#dcf3eb",b:["It will crest and pass. You've ridden every one so far.","Ride ~10 minutes; most urges soften if you don't feed them."]},
  {e:"🫂",t:"Talk to yourself like a friend",tint:"#fde2f2",b:["What would you say to someone you love feeling this? Say that to you."]},
  {e:"🌱",t:"Good enough is enough",tint:"#fdeadb",b:["You don't have to do it perfectly. Showing up softly counts.","A low-demand day is care, not falling behind."]},
];

// gentle daily journaling — feelings + the day's events. Used live (AI follows her) and as the offline arc.
const KIKO_JOURNAL_ARC=[
  "First, let's just arrive. How are you feeling right now, in this moment? ☁️",
  "What actually happened today — walk me through it, the big things and the tiny ones. 🗓️",
  "Out of everything today, which moment stirred up the most feeling — good or hard? 💗",
  "Can you name that feeling a little more? Where did you notice it? 🫧",
  "Was there a moment, however small, you'd want to keep? ✨",
  "Looking back on it all now, how are you feeling about today? 🌤️",
  "What do you need a little more of right now — rest, comfort, fun, softness? 🍵",
  "Last one: what's a kind word you'd leave for tomorrow-you? 🌙",
];

const KIKO_JOURNAL_ACKS=["mm, thank you for telling me 💗","I hear you ❄️","that makes sense 🦊","I'm glad you noticed that 🌸","ooh, that's worth holding onto ✨","sitting with that with you for a sec 🍵","noted with care 📓"];

// context Kiko has while journalling — her check-in + today's events
function journalContext(){
  const m=(state.today&&state.today.mind)||{};
  const ev=(state.sentinel.calendarEvents||[]).filter(e=> e.date<=TODAY && TODAY<=(e.endDate||e.date)).map(e=>e.title).slice(0,8);
  return { mood:m.mood, anxiety:m.anxiety, weather:m.weather, events:ev };
}

async function saveJournalEntry(J){
  const log=(J.log||[]).filter(x=>x&&x.text);
  if(!log.length) return;
  const entry={ id:"jr"+Date.now(), date:TODAY, ts:new Date().toISOString(), mode:J.mode||"ai", log };
  try{ await setSent(n=>({...n,journalEntries:[...(n.journalEntries||[]),entry]})); }catch(e){ console.error(e); }
  try{ memPush("journal", log.filter(x=>x.who==="Mifu").map(x=>x.text).join(" "), 6); }catch(e){}
}

// gather Mifu's real data so the write-up can ground itself (never invents numbers)
function journalWriteContext(){
  const sent=state.sentinel||{};
  const inj=(sent.injectionLog||[]).slice().sort(cmpDate);
  const mjStart=inj.length?inj[0].date:null; let mjDay=null,mjWeek=null;
  if(mjStart){ mjDay=Math.floor((new Date(TODAY+"T00:00")-new Date(mjStart+"T00:00"))/86400000)+1; mjWeek=Math.ceil(mjDay/7); }
  const wl=(sent.weightLog||[]).slice().sort(cmpDate);
  const latest=wl.length?wl[wl.length-1]:null, first=wl.length?wl[0]:null;
  const change=(latest&&first&&latest.date!==first.date)?Math.round((latest.w-first.w)*10)/10:null;
  const meas=(sent.measurements||[]).slice().sort(cmpDate);
  const m=(state.today&&state.today.mind)||{};
  const lastShot=inj.length?inj[inj.length-1]:null;
  const ev=(sent.calendarEvents||[]).filter(e=> e.date<=TODAY && TODAY<=(e.endDate||e.date)).map(e=>e.title).slice(0,8);
  const comp={}; try{ const wlb=withBMI(wl); ["bmi","fat","muscle","bone","water","visceral"].forEach(k=>{ const mm=bcLatest(wlb,k); if(mm) comp[k]={v:mm.v,d:mm.d}; }); }catch(e){}
  let food=null; try{ if(foodToday().length){ const ft=foodTotals(), tg=foodTargets(); food={kcal:Math.round(ft.kcal),protein:Math.round(ft.protein),fiber:Math.round(ft.fiber),targetProtein:tg.protein,targetFiber:tg.fiber}; } }catch(e){}
  return { food, dateLabel:new Date(TODAY+"T00:00").toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}),
    unit:CONFIG.weightUnit, mjDay, mjWeek,
    lastShot: lastShot?{date:fmtDate(lastShot.date),dose:lastShot.dose,site:lastShot.site}:null,
    weightToday: latest?latest.w:null, weightChange: change,
    measLatest: meas.length?meas[meas.length-1]:null, comp,
    mood:m.mood, anxiety:m.anxiety, weather:m.weather, events:ev };
}

function composeJournalFallback(log){
  const h=new Date().getHours(); const greet=(h<12?"Good morning":h<18?"Good afternoon":"Good evening")+"!! ♡";
  const answers=(log||[]).filter(x=>x.who==='Mifu'&&x.text).map(x=>x.text);
  return greet+"\n\n"+(answers.length?answers.join("\n\n"):"a quiet one today.")+"\n\nGoodnight!! 🌙💕";
}

// end the session: write today up as a diary entry in her voice, show it, and save it
async function finishJournal(J){
  J.active=false;
  let text="";
  if(!DEMO && SB){
    KIKO.log.push({role:"pet",text:"give me a moment to write today up for you… 📝❄️"}); KIKO.busy=true; paintKiko();
    try{ const d=await aiCall("journalWrite",{transcript:J.log, context:journalWriteContext()}); if(d&&!d.error&&d.entry) text=d.entry; }catch(e){}
    KIKO.busy=false;
  }
  if(!text) text=composeJournalFallback(J.log);
  KIKO.log.push({role:"pet",text:"here's today's journal, written up for you 💗"});
  KIKO.log.push({role:"pet",text:text}); paintKiko();
  const entry={ id:"jr"+Date.now(), date:TODAY, ts:new Date().toISOString(), mode:J.mode||"ai", text, log:(J.log||[]).filter(x=>x&&x.text) };
  try{ await setSent(n=>({...n,journalEntries:[...(n.journalEntries||[]),entry]})); }catch(e){ console.error(e); }
  if(state.tab==='care'){ try{ await render(); }catch(_){} }
}

function journalId(e){ return e&&(e.id||e.ts||e.date)||""; }

function renderJournalEntry(e){
  let html=""; const eid=journalId(e);
  if(e&&e.text){ html+=`<div style="white-space:pre-wrap;font-size:13px;line-height:1.65">${esc(e.text)}</div>
    <div style="margin-top:8px"><button class="btn" data-act="copyJournal" data-id="${esc(eid)}" style="padding:3px 10px">📋 copy entry</button></div>`; }
  if(e&&e.log&&e.log.length){ html+=`<details style="margin-top:10px"><summary class="label" style="cursor:pointer">the conversation</summary><div style="margin-top:6px">${e.log.map(x=>`<div style="margin:6px 0"><div class="label" style="color:${x.who==='Mifu'?'var(--sakura-deep)':'var(--peri-deep)'}">${x.who==='Mifu'?'Mifu':'Kiko 🦊'}</div><div style="font-size:13px">${esc(x.text)}</div></div>`).join("")}</div></details>`; }
  else if(e&&e.qa&&e.qa.length){ html+=e.qa.map(x=>`<div style="margin:6px 0"><div class="label">${esc(x.q)}</div><div style="font-size:13px">${esc(x.a)}</div></div>`).join(""); }
  return html||`<p class="soft" style="font-size:12px">(empty)</p>`;
}

function journalArchive(){
  const all=(state.sentinel.journalEntries||[]).slice().sort((a,b)=>((a.ts||a.date)<(b.ts||b.date)?1:-1));   // newest first
  if(!all.length) return `<section class="panel"><div class="label">📖 Your journals</div>
    <p class="soft" style="font-size:12.5px;margin-top:6px">No entries yet — every journal you do with Kiko will gather here, like pages in a little book. ❄️🦊</p></section>`;
  const snippet=e=>{ let t=e.text||""; if(!t&&e.log){ const f=e.log.find(x=>x.who==='Mifu'); t=f?f.text:""; } t=t.replace(/\s+/g," ").trim(); return esc(t.slice(0,72))+(t.length>72?"…":""); };
  const dlabel=e=>new Date((e.date)+"T00:00").toLocaleDateString(undefined,{weekday:'short',year:'numeric',month:'short',day:'numeric'});
  return `<section class="panel">
    <div class="card-head"><div class="label">📖 Your journals</div><span class="pill pill-gray">${all.length} ${all.length===1?'entry':'entries'}</span></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Tap any day to reread it whenever you'd like. 🫶</p>
    <div>${all.map(e=>`<details class="acc" style="margin-bottom:6px"><summary><b style="font-size:13px">${esc(dlabel(e))}</b> <span class="soft" style="font-size:11px">— ${snippet(e)}</span></summary><div class="acc-body">${renderJournalEntry(e)}<div style="margin-top:10px"><button class="x" data-act="delJournal" data-id="${esc(journalId(e))}" style="color:var(--sakura-deep);font-size:12px;background:none;border:none;cursor:pointer">🗑 delete this entry</button></div></div></details>`).join("")}</div>
  </section>`;
}

function flipCard(c){
  return `<div class="flip" data-act="flip"><div class="flip-inner">
    <div class="flip-face" style="background:${c.tint}">
      <div style="font-size:30px">${c.e}</div>
      <div style="font-family:var(--display);font-size:15px;margin-top:6px">${c.t}</div>
      <div class="label" style="margin-top:auto;padding-top:10px">tap to open →</div>
    </div>
    <div class="flip-face flip-back"><ul style="padding-left:16px;margin:2px 0">${c.b.map(x=>`<li>${x}</li>`).join("")}</ul></div>
  </div></div>`;
}

/* ============================================================================
   CARE — redesigned around comfort, memories & the bunnies (not clinical widgets; breathing/
   grounding live in the floating 🫧 button + Kiko). Leans on the media/memories foundation.
   ============================================================================ */
const BUNNIES=[{id:"kieran",name:"Kieran",sex:"♂ male",col:"🖤 black rabbit",born:"2021-01-03"},{id:"myla",name:"Myla",sex:"♀ female",col:"🩶 grey rabbit",born:"2021-12-28"}];

/* merge a patch into TODAY's log entry for a bunny (so status + appetite/poop/energy coexist); null clears a field */
function upsertBunnyDay(n,bunny,patch){ const log=(n.bunnyLog||[]).map(x=>({...x})); let e=log.find(x=>x.bunny===bunny&&x.date===TODAY); if(!e){ e={date:TODAY,bunny}; log.push(e); } Object.entries(patch).forEach(([k,v])=>{ if(v==null) delete e[k]; else e[k]=v; }); return {...n,bunnyLog:log.slice(-400)}; }

function bunnyAge(b){ try{ const bd=new Date(b+"T00:00"), now=new Date(); let y=now.getFullYear()-bd.getFullYear(), m=now.getMonth()-bd.getMonth(); if(now.getDate()<bd.getDate())m--; if(m<0){y--;m+=12;} return y+"y"+(m?" "+m+"m":""); }catch(e){ return ""; } }

function bunnyNextBday(b){ try{ const bd=new Date(b+"T00:00"), now=new Date(), t0=new Date(now.getFullYear(),now.getMonth(),now.getDate()); let nx=new Date(now.getFullYear(),bd.getMonth(),bd.getDate()); if(nx<t0)nx=new Date(now.getFullYear()+1,bd.getMonth(),bd.getDate()); return Math.round((nx-t0)/86400000); }catch(e){ return null; } }

function bunnyStatusToday(id){ try{ return (state.sentinel.bunnyLog||[]).filter(x=>x.bunny===id&&x.date===TODAY).slice(-1)[0]; }catch(e){ return null; } }

/* ===== Tab hubs — group related extras under one tab to keep the nav tidy.
   The hub reuses each feature's existing view function unchanged; it just adds a
   sub-nav and stitches them together (stripping the duplicate disclaimer). ===== */
function stripDisc(html){ return String(html).split(DISCLAIMER).join(""); }

const STUDIO_SUBS=[["wins","🏆 Wins"],["streamlore","📜 Lore"],["sponsors","🤝 Sponsors"],["ideas","💡 Ideas"]];

function subNav(subs,active,act){ return `<div class="chiprow" style="max-width:1100px;margin:0 auto 2px" role="tablist">${subs.map(([k,l])=>`<button class="chiptog ${active===k?'on':''}" role="tab" aria-selected="${active===k?'true':'false'}" data-act="${act}" data-sub="${k}">${l}</button>`).join("")}</div>`; }

function viewStudio(){ const map={wins:viewWins,streamlore:viewStreamLore,sponsors:viewSponsors,ideas:viewIdeas};
  const sub=map[state.studioSub]?state.studioSub:"wins";
  return subNav(STUDIO_SUBS,sub,"studioSub")+stripDisc(map[sub]())+DISCLAIMER; }

/* ===== Creator Wins (Idea #9) — evidence of progress, not vibes ===== */
const WIN_CATS=["Stream","Community","Sponsor","YouTube","Music","Merch","Project","Milestone","Personal"];

function winWeekEvidence(){
  const items=[["streamed","stream"],["ytVideo","YouTube video"],["ytShort","Short"],["madeArt","art day"],["coverSong","cover-song session"],["emails","email-reply day"],["sponsors","sponsor-work day"]];
  const out=[]; items.forEach(([k,l])=>{ let c=0; try{c=ciWeek(k);}catch(e){} if(c>0) out.push({l,c}); });
  return out;
}

function autoWins(){ try{ return buildMemoryIndex().filter(m=>(m.kind==="milestone"||m.kind==="event")&&!/🎂|birthday/i.test(m.title||"")&&daysBetween(m.date,TODAY)<=30).slice(0,6); }catch(e){ return []; } }

function viewWins(){
  const wins=(state.sentinel.wins||[]).slice().sort(cmpDate).reverse();
  const ev=winWeekEvidence(), evTotal=ev.reduce((a,x)=>a+x.c,0);
  const evCard=`<section class="panel"><div class="card-head"><h2 style="font-size:18px">🏆 Creator wins</h2></div>
    ${evTotal?`<div class="soft-card"><div class="label" style="margin-bottom:6px">This week — the evidence 📊</div>
      <p style="font-size:13px;margin:0 0 8px">Even if it didn't feel like enough, here's what actually happened:</p>
      <div class="chiprow">${ev.map(x=>`<span class="pill pill-peri">${x.c}× ${esc(x.l)}${x.c>1?"s":""}</span>`).join("")}</div>
      <p class="soft" style="font-size:11px;margin:8px 0 0">That's real. You showed up. 💗</p></div>`
     :`<p class="soft" style="font-size:12.5px;margin:0">Tap your daily check-ins on Home and Kiko will tally your week's evidence here — proof, not just vibes.</p>`}</section>`;
  const addCard=`<section class="panel"><div class="label" style="margin-bottom:6px">✨ Log a win</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><input class="inp" id="winTitle" placeholder="what went well? (e.g. ZZZ sponsor paid)" style="flex:1;min-width:160px">
    <select class="inp" id="winCat" style="max-width:130px">${WIN_CATS.map(c=>`<option value="${c}">${c}</option>`).join("")}</select></div>
    <input class="inp" id="winWhy" placeholder="why it mattered (optional)" style="margin-top:6px"><button class="btn btn-grad" data-act="winAdd" style="margin-top:6px">Add win 🏆</button></section>`;
  const auto=autoWins();
  const autoCard=auto.length?`<section class="panel"><div class="card-head"><span class="label">🦊 Kiko noticed</span></div>${auto.map(m=>`<div class="listrow"><span style="flex:0 0 auto" aria-hidden="true">${MEM_ICON[m.kind]||"✨"}</span><span class="grow" style="min-width:0"><b style="font-size:12.5px">${esc(m.title)}</b> <span class="soft" style="font-size:11px">· ${esc(fmtDate(m.date))}</span><div class="soft" style="font-size:11.5px">${esc(m.preview||"")}</div></span></div>`).join("")}</section>`:"";
  const listCard=`<section class="panel"><div class="card-head"><span class="label">📒 Your wins</span><span class="pill pill-gray">${wins.length}</span></div>
    ${wins.length?wins.map(w=>`<div class="listrow"><span style="flex:0 0 auto" aria-hidden="true">🏆</span><span class="grow" style="min-width:0"><b style="font-size:12.5px">${esc(w.title)}</b> <span class="soft" style="font-size:11px">· ${esc(fmtDate(w.date))}${w.cat?` · ${esc(w.cat)}`:""}</span>${w.why?`<div class="soft" style="font-size:11.5px">${esc(w.why)}</div>`:""}</span><button class="x" data-act="winDel" data-id="${esc(w.id)}" aria-label="delete">✕</button></div>`).join(""):UI.empty({emoji:"🏆",title:"No wins logged yet",msg:"Big or small — a finished video, a kind comment, a sponsor reply. They all count."})}</section>`;
  return `<div class="page">${evCard}${addCard}${autoCard}${listCard}</div>${DISCLAIMER}`;
}

/* ===== Stream Lore (Idea #6) ===== */
function viewStreamLore(){
  const lore=(state.sentinel.streamLore||[]).slice().sort(cmpDate).reverse();
  const add=`<section class="panel"><div class="card-head"><h2 style="font-size:18px">📜 Stream lore</h2></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">The moments worth remembering — hype trains, big pulls, chat going feral, the cries. Save them before they vanish into the VOD void. 💗</p>
    <input class="inp" id="loreTitle" placeholder="title (e.g. Level 12 Hype Train)"><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><input class="inp" id="loreGame" placeholder="game / category" style="flex:1;min-width:120px"><input class="inp" id="loreTags" placeholder="tags, comma separated" style="flex:1;min-width:120px"></div>
    <textarea class="inp" id="loreSummary" rows="2" placeholder="what happened?" style="margin-top:6px"></textarea>
    <input class="inp" id="loreWhy" placeholder="why it mattered (optional)" style="margin-top:6px"><button class="btn btn-grad" data-act="loreAdd" style="margin-top:6px">Save lore 📜</button></section>`;
  const list=`<section class="panel"><div class="card-head"><span class="label">📚 Saved moments</span><span class="pill pill-gray">${lore.length}</span></div>
    ${lore.length?lore.map(L=>`<div class="soft-card" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:13.5px">${esc(L.title)}</b><button class="x" data-act="loreDel" data-id="${esc(L.id)}" aria-label="delete">✕</button></div>
      <div class="soft" style="font-size:11px">${esc(fmtDate(L.date))}${L.game?` · ${esc(L.game)}`:""}</div>
      ${L.summary?`<div style="font-size:12.5px;margin-top:4px">${esc(L.summary)}</div>`:""}
      ${L.why?`<div class="soft" style="font-size:11.5px;margin-top:3px">💗 ${esc(L.why)}</div>`:""}
      ${(L.tags&&L.tags.length)?`<div class="chiprow" style="margin-top:6px">${L.tags.map(t=>`<span class="pill pill-lav">${esc(t)}</span>`).join("")}</div>`:""}</div>`).join(""):UI.empty({emoji:"📜",title:"No lore yet",msg:"Your first hype train, that legendary pull, the day chat made you cry-laugh — they belong here."})}</section>`;
  return `<div class="page">${add}${list}</div>${DISCLAIMER}`;
}

/* ===== Sponsor Relationship Tracker (Idea #7) ===== */
const SPONSOR_STATUS=["lead","waiting","negotiating","accepted","scheduled","completed","invoiced","paid","declined","ghosted"];

const IDEA_STATUS=["graveyard","maybe later","ready soon","active","done","dropped"];

/* ===== Relationship Garden (Idea #12) ===== */
function personNextBday(b){ if(!b)return null; try{ const bd=new Date(b+"T00:00"); if(isNaN(bd))return null; const now=new Date(TODAY+"T00:00"); let nx=new Date(now.getFullYear(),bd.getMonth(),bd.getDate()); if(nx<now)nx=new Date(now.getFullYear()+1,bd.getMonth(),bd.getDate()); return Math.round((nx-now)/86400000); }catch(e){ return null; } }

function viewCare(){
  const jar=state.sentinel.joyJar||[]; const journaledToday=(state.sentinel.journalEntries||[]).some(e=>e.date===TODAY);
  const plan=careGentlePlan(); const helps=careThingsThatHelp(); const pull=careMemoryPull(); const wins=careTinyWins();
  const comfort=state.sentinel.comfort||{}; const miles=(state.sentinel.bunnyMilestones||[]).slice().sort(cmpDate).reverse();
  const ST=[["great","😊 great"],["normal","🙂 normal"],["concern","⚠️ concern"],["vet","🏥 vet"]];
  const memRow=m=>`<div class="listrow"><span style="font-size:15px;flex:0 0 auto">${MEM_ICON[m.kind]||"✨"}</span><span class="grow" style="min-width:0"><b style="font-size:12.5px">${esc(m.title||"")}</b> <span class="soft" style="font-size:11px">· ${esc(fmtDate(m.date))}</span><div class="soft" style="font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.preview||"")}</div></span>${m.source?`<button class="btn" data-act="memOpen" data-page="${esc(m.source.page)}" data-ref="${esc(m.source.refId||"")}">open</button>`:""}</div>`;
  // bunny photos from the media library (lazy-loaded in the care post-hook)
  let bunPics=""; if(state.media&&state.media.length){ const pics=state.media.filter(memIsBunny).slice().reverse().slice(0,8);
    bunPics=pics.length?`<div class="md-grid">${pics.map(m=>`<div class="md-tile"><img src="${esc(m.url)}" alt="${esc(m.caption||'bunny')}" loading="lazy" data-act="mediaView" data-id="${esc(m.id)}"></div>`).join("")}</div>`:`<p class="soft" style="font-size:12.5px;margin:0">No bunny photos yet — upload some in ✨ Memories and tag them Myla / Kieran. 🐰</p>`; }
  return `<div class="page">
  <section class="panel"><div class="card-head"><h2 style="font-size:17px">🌿 Today's gentle plan</h2></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Small, kind, and made for you by Kiko — no pressure, just gentle nudges.</p>
    ${plan.map(p=>`<div class="kn-row"><span class="kn-dot"></span><span style="font-size:13px">${esc(p)}</span></div>`).join("")}
  </section>
  <section class="panel"><div class="card-head"><h2 style="font-size:17px">🐰 Bunny hub</h2><button class="btn" data-act="careGoMedia">📸 Add photos</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
      ${BUNNIES.map(b=>{ const st=bunnyStatusToday(b.id); const nb=bunnyNextBday(b.born);
        return `<div class="soft-card"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:15px;font-family:var(--display)">${b.name}</b><span class="soft" style="font-size:11px">${esc(b.sex)}</span></div>
        <div class="soft" style="font-size:12px">${esc(b.col)} · ${bunnyAge(b.born)} old</div>
        <div class="soft" style="font-size:11px;margin-top:2px">🎂 ${nb===0?"birthday today! 🎉":nb!=null?`birthday in ${nb} day${nb>1?"s":""}`:""}</div>
        <div class="label" style="margin:8px 0 4px">how is ${b.name} today?</div>
        <div class="chiprow">${ST.map(([v,l])=>`<button class="chiptog ${st&&st.status===v?'on':''}" data-act="bunnyStatus" data-bunny="${b.id}" data-status="${v}">${l}</button>`).join("")}</div>
        ${st?`<p class="soft" style="font-size:10.5px;margin:6px 0 0">logged ${esc((ST.find(s=>s[0]===st.status)||[])[1]||st.status)} today</p>`:""}</div>`; }).join("")}
    </div>
  </section>
  <section class="panel"><div class="card-head"><span class="label">📸 Recent bunny memories</span></div>
    ${state.media===undefined?`<p class="soft" style="font-size:12.5px;margin:0">${UI.spinner({label:"loading photos…"})}</p>`:bunPics}
  </section>
  <section class="panel"><div class="card-head"><span class="label">📖 A happy memory</span><button class="btn" data-act="carePull">🎲 another</button></div>
    ${pull?memRow(pull):`<p class="soft" style="font-size:12.5px;margin:0">As you journal and hit milestones, Kiko will resurface happy memories here. 💗</p>`}
  </section>
  <section class="panel"><div class="card-head"><span class="label">✨ Tiny wins jar</span></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 6px">The little victories Kiko's noticed — they count.</p>
    ${wins.length?wins.map(memRow).join(""):`<p class="soft" style="font-size:12.5px;margin:0">Your wins will gather here — a new lowest weight, a finished thing, a special day. 🌱</p>`}
  </section>
  <section class="panel"><div class="card-head"><span class="label">💗 Things that help you</span></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 6px">Drawn from your own journals — what tends to lift your days.</p>
    ${helps.length?`<div class="chiprow">${helps.map(h=>`<span class="pill pill-lav">${esc(h.l)}</span>`).join("")}</div>`:`<p class="soft" style="font-size:12.5px;margin:0">Journal a little and Kiko will start to notice what helps you most. ❄️</p>`}
  </section>
  <section class="panel" style="text-align:center"><div class="label">🫙 Joy jar</div>
    <p class="soft" style="font-size:12px;margin:4px 0 8px">Pull out a little joy when you need one.</p>
    <div class="joy-pick" id="joyPick" style="min-height:24px">tap below to draw a joy ✿</div>
    <button class="btn btn-grad" data-act="drawJoy" style="margin-top:8px">Pull a joy 🦊</button>
    <div style="display:flex;gap:8px;margin-top:10px"><input class="inp" id="joyInput" placeholder="add your own little joy…"><button class="btn" data-act="addJoy">Add</button></div>
    <p class="soft" style="font-size:11px;margin-top:6px">${jar.length} joys in the jar ❄️</p>
  </section>
  <section class="panel"><div class="card-head"><span class="label">🧸 Comfort collection</span></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Your go-to comforts, one tap away when you need them.</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><select class="inp" id="comfortCat" style="max-width:170px">${COMFORT_CATS.map(c=>`<option value="${c[0]}">${c[1]}</option>`).join("")}</select><input class="inp" id="comfortText" placeholder="add a comfort…" style="flex:1;min-width:140px"><button class="btn btn-grad" data-act="comfortAdd">add</button></div>
    ${COMFORT_CATS.map(([k,l])=>{ const arr=comfort[k]||[]; return arr.length?`<div style="margin-top:8px"><div class="label">${l}</div><div class="chiprow" style="margin-top:4px">${arr.map((t,i)=>`<span class="chiptog">${esc(t)}<span class="x" data-act="comfortDel" data-cat="${k}" data-i="${i}" style="margin-left:4px">✕</span></span>`).join("")}</div></div>`:""; }).join("")||`<p class="soft" style="font-size:12.5px;margin:0">Add your comfort music, ASMR, shows, games, foods &amp; reads above. 💗</p>`}
  </section>
  <section class="panel"><div class="card-head"><div class="label">📝 Daily journal with Kiko</div>${journaledToday?'<span class="pill pill-mint">done today ✓</span>':''}</div>
    <p class="soft" style="font-size:12.5px;margin:0 0 10px">A few playful questions, walked through with Kiko — light and cozy, never heavy. 🦊❄️</p>
    <button class="btn btn-grad" data-act="startKikoJournal">${journaledToday?'Journal again 🌸':'Start today’s journal 🦊'}</button>
  </section>
  <section class="panel"><div class="card-head"><span class="label">🎂 Bunny milestones</span></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><select class="inp" id="mileBunny" style="max-width:130px">${BUNNIES.map(b=>`<option value="${b.id}">${b.name}</option>`).join("")}<option value="both">Both 💕</option></select><input class="inp" id="mileText" placeholder="a bunny memory or milestone…" style="flex:1;min-width:150px"><button class="btn btn-grad" data-act="bunnyMilestone">add</button></div>
    ${miles.length?miles.slice(0,12).map(mi=>`<div class="listrow"><span style="font-size:14px;flex:0 0 auto">🐰</span><span class="grow"><b style="font-size:12px">${esc(({kieran:"Kieran",myla:"Myla",both:"Myla & Kieran"})[mi.bunny]||"")}</b> <span class="soft" style="font-size:11px">· ${esc(fmtDate(mi.date))}</span><div style="font-size:12.5px">${esc(mi.text)}</div></span><button class="x" data-act="bunnyMileDel" data-id="${esc(mi.id)}">✕</button></div>`).join(""):`<p class="soft" style="font-size:12.5px;margin:0">🖤 Kieran born 3 Jan 2021 · 🩶 Myla born 28 Dec 2021 — add your favourite moments with them here.</p>`}
  </section>
  ${DISCLAIMER}</div>`;
}


/* ===================== MONEY (Netherlands sole-proprietor content creator) ===================== */
const MONEY_IN=["Twitch","YouTube","Sponsorship","Donations/Tips","Merch","Affiliate","Other"];

const MONEY_OUT=["Equipment","Software & subs","Internet & phone","Home office","Travel","Games/content","Marketing","Accountant","Bank & fees","Other"];

const TAX_STEPS=[
  "Let's gather your year together 🦊 First — do you have your total earnings for each income source? Twitch payouts, YouTube/AdSense, sponsorships & brand deals (including anything paid in product), donations/tips, merch, and affiliate. 💰",
  "Now expenses — have you collected the receipts/invoices for your business costs? Gear, software & subscriptions, the business share of internet & phone, home-office, work travel, games bought as content, marketing, and bank & accountant fees. 🧾",
  "Do you have your business bank statements for the whole year (January–December)? 🏦",
  "Your BTW (VAT) returns — the quarterly aangiftes you filed and what you paid or got back. (If you're on the KOR small-business scheme, just note that instead.) 📑",
  "Your hours log — roughly how many hours you spent on the business this year (the ~1,225-hour urencriterium unlocks the self-employed deductions). ⏱️",
  "Any bigger equipment or assets you bought this year, with invoices — those affect investment deduction/depreciation. 🎥",
  "Last year's income-tax return (aangifte) and any provisional assessment (voorlopige aanslag) for this year, if you have them. 📂",
  "Your business details for the accountant: KVK number, business start date, BSN, and DigiD if you file yourself. 🪪",
  "Last one — anything unusual to flag this year? A big new sponsor, a move, new gear, a quiet stretch… anything worth a note. ✨",
];

function eur(n){ return "€"+(Math.round((+n||0)*100)/100).toFixed(2); }

function moneyYear(){ return state.moneyYear||String(new Date().getFullYear()); }

function moneyEntries(year){ return (state.sentinel.money||[]).filter(t=>String(t.date||"").slice(0,4)===year); }

function csvCell(s){ s=String(s==null?"":s); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }

function downloadFile(name,content,mime){ try{ const b=new Blob([content],{type:mime||"text/plain"}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),1500); }catch(e){ toast("couldn't export — try again"); } }

function moneySummaryText(year){
  const tx=moneyEntries(year); const inc=tx.filter(t=>t.dir==="in").reduce((a,t)=>a+(+t.amount||0),0); const exp=tx.filter(t=>t.dir==="out").reduce((a,t)=>a+(+t.amount||0),0);
  const catLines=(dir,cats)=>cats.map(c=>{ const s=tx.filter(t=>t.dir===dir&&t.cat===c).reduce((a,t)=>a+(+t.amount||0),0); return s>0?`   ${c}: ${eur(s)}`:""; }).filter(Boolean).join("\n");
  const q=[1,2,3,4].map(qi=>{ const inq=tx.filter(t=>{const mo=+String(t.date).slice(5,7);return Math.ceil(mo/3)===qi;}); const in_=inq.filter(t=>t.dir==="in").reduce((a,t)=>a+(+t.amount||0),0); const out_=inq.filter(t=>t.dir==="out").reduce((a,t)=>a+(+t.amount||0),0); return `   Q${qi}: income ${eur(in_)} · expenses ${eur(out_)}`; }).join("\n");
  const tp=(state.sentinel.taxPrep||{})[year];
  return `MIFUYU — TAX SUMMARY ${year}\n(eenmanszaak / sole proprietor · content creation · Netherlands)\n\n`
    +`TOTAL INCOME:   ${eur(inc)}\nTOTAL EXPENSES: ${eur(exp)}\nNET PROFIT:     ${eur(inc-exp)}\n\n`
    +`INCOME BY CATEGORY:\n${catLines("in",MONEY_IN)||"   (none)"}\n\nEXPENSES BY CATEGORY:\n${catLines("out",MONEY_OUT)||"   (none)"}\n\nPER QUARTER (for BTW):\n${q}\n\n`
    +(tp&&tp.items&&tp.items.length?`TAX-PREP CHECKLIST:\n${tp.items.map(x=>`• ${x.q}\n   → ${x.a}`).join("\n\n")}\n\n`:"")
    +`Note: figures from Mifuyu OS; please verify against bank/platform statements with your accountant.\n`;
}

async function saveTaxPrep(J){ const items=(J.items||[]).filter(x=>x&&x.a); await setSent(n=>{ const tp={...(n.taxPrep||{})}; tp[J.year]={ts:new Date().toISOString(), items}; return {...n,taxPrep:tp}; }); }


/* ===================== TRENDS ===================== */
function buildSeries(){
  const byDate={}; state.range.forEach(r=>byDate[r.date]=r.notes); byDate[TODAY]=state.today;
  const span=(state.trendDays===30?30:14);
  const days=[]; for(let i=span-1;i>=0;i--) days.push(dayAgo(-i));
  const pick=(d,path)=>{ let v=byDate[d]; if(!v)return null; for(const k of path){ v=v&&v[k]; } return v==null?null:v; };
  return { byDate, series:{
    mood:days.map(d=>pick(d,["mind","mood"])), anxiety:days.map(d=>pick(d,["mind","anxiety"])),
    energy:days.map(d=>pick(d,["mind","energy"])), nausea:days.map(d=>pick(d,["mounjaro","nausea"])),
    cravings:days.map(d=>pick(d,["mounjaro","foodnoise"])),  // consolidated from pcos.cravings → mj.foodnoise
    water:days.map(d=>pick(d,["mounjaro","water"])),
    sleep:days.map(d=>pick(d,["sleep"])) } };
}

function patternSpotter(byDate){
  const rows=Object.entries(byDate).filter(([d])=>d!==SENTINEL).map(([,n])=>n).filter(Boolean);
  if(rows.length<5) return `<p class="soft" style="font-size:12.5px">A few more tracked days (about 5) and gentle patterns will start to appear here. No rush — gaps are fine. ❄️</p>`;
  const obs=[];
  const split=(P,Y)=>{ let hi=[],lo=[]; rows.forEach(r=>{const p=P(r),y=Y(r); if(p==null||y==null)return; (p?hi:lo).push(y);});
    const a=z=>z.length?z.reduce((x,y)=>x+y,0)/z.length:null; return {hi:a(hi),lo:a(lo),nHi:hi.length,nLo:lo.length}; };
  // nausea: 0=rough(bad) 5=fine(good) — higher value = better, so "less nausea" = higher
  let s=split(r=>r.mounjaro&&r.mounjaro.water!=null?r.mounjaro.water>=6:null,r=>r.mounjaro?r.mounjaro.nausea:null);
  if(s.hi!=null&&s.lo!=null&&s.nHi>=2&&s.nLo>=2&&s.hi>s.lo+0.3)obs.push("🥤 On higher-water days you noted less nausea.");
  s=split(r=>r.mounjaro?(!!r.mounjaro.proteinMeals&&!!r.mounjaro.smallerMeals):null,r=>r.mounjaro?r.mounjaro.nausea:null);
  if(s.hi!=null&&s.lo!=null&&s.nHi>=2&&s.hi>s.lo+0.3)obs.push("🍳 Nausea ran gentler on days with protein + smaller meals.");
  s=split(r=>r.sleep!=null?r.sleep>=7:null,r=>r.mind?r.mind.mood:null);
  if(s.hi!=null&&s.lo!=null&&s.nHi>=2&&s.nLo>=2&&s.hi>s.lo+0.3)obs.push("😴 Mood tended to be gentler after longer sleep.");
  // anxiety: 0=stressed(bad) 5=calm(good) — low value = stressed
  s=split(r=>r.mind&&r.mind.anxiety!=null?r.mind.anxiety<=2:null,r=>r.mind?r.mind.mood:null);
  if(s.hi!=null&&s.lo!=null&&s.nHi>=2&&s.hi<s.lo-0.3)obs.push("🌧️ Mood tended to dip on higher-stress days — those deserve extra softness.");
  // foodnoise: 0=loud(bad) 5=quiet(good) — higher value = better
  s=split(r=>r.pcos?!!r.pcos.moved:null,r=>r.mounjaro?r.mounjaro.foodnoise:null);
  if(s.hi!=null&&s.lo!=null&&s.nHi>=2&&s.hi>s.lo+0.3)obs.push("🍩 Food noise was quieter on days you moved your body.");
  if(!obs.length)obs.push("Nothing jumping out yet — your logs look gently varied. That's perfectly okay. ❄️");
  return `<ul style="padding-left:18px;font-size:13px">${obs.map(o=>`<li style="margin:6px 0">${o}</li>`).join("")}</ul>
    <p class="soft" style="font-size:11px;margin-top:6px">Gentle observations from your own logs — patterns, not proof, and never a diagnosis. Worth a mention to your care team if something rings true. ❄️🦊</p>`;
}

/* ----- animated visual trends chart ----- */
const TREND_METRICS=[
  ["mood","🌤️","Mood",5,"up",["🌧️","🌞"]],
  ["anxiety","🫂","Anxiety",5,"up",["stressed","calm"]],   // 0=stressed(bad) 5=calm(good)
  ["energy","⚡","Energy",5,"up",["💤","⚡"]],
  ["nausea","🤢","Nausea",5,"up",["rough","fine"]],        // 0=rough(bad) 5=fine(good)
  ["cravings","🍩","Food noise",5,"up",["loud","quiet"]],  // 0=loud(bad) 5=quiet(good); reads mj.foodnoise
  ["water","🥤","Water",15,"up",["low","lots"]],
  ["sleep","🌙","Sleep",12,"up",["short","long"]],
];

// a fixed, distinct colour per metric so the legend + overlaid lines stay readable
const TREND_COLORS={ mood:"#ef9ccb", anxiety:"#9b8cf0", energy:"#f0b057", nausea:"#5fc59a", cravings:"#f0869b", water:"#5ba6e8", sleep:"#7d83e6" };

function trendRuns(vals){ const r=[]; let cur=null; vals.forEach((v,i)=>{ if(v==null){ if(cur){r.push(cur);cur=null;} } else { if(!cur)cur=[]; cur.push({i,v}); } }); if(cur)r.push(cur); return r; }

function buildChartSVG(metricKeys,type){
  const {series}=buildSeries();
  let keys=(Array.isArray(metricKeys)?metricKeys:[metricKeys]).filter(k=>TREND_METRICS.some(m=>m[0]===k));
  if(!keys.length) keys=["mood"];
  const single=keys.length===1;
  const W=600,H=220,padX=36,padT=18,padB=30, plotW=W-padX*2, plotH=H-padT-padB, base=padT+plotH;
  const n=(series[keys[0]]||[]).length;
  const xi=i=> padX + (n>1? i*(plotW/(n-1)) : plotW/2);
  let grid=""; for(let g=0;g<=2;g++){ const yy=padT+g*(plotH/2); grid+=`<line x1="${padX}" y1="${yy.toFixed(0)}" x2="${W-padX}" y2="${yy.toFixed(0)}" stroke="#e7e2f2" stroke-width="1"/>`; }
  const span=(state.trendDays===30?30:14);
  const days=[]; for(let i=span-1;i>=0;i--) days.push(dayAgo(-i));
  // y-axis labels: real numbers when one metric; low/high when several (mixed scales)
  let ylab="";
  if(single){ const max=TREND_METRICS.find(m=>m[0]===keys[0])[3];
    [[padT,max],[padT+plotH/2,Math.round(max/2)],[base,0]].forEach(([yy,val])=>{ ylab+=`<text x="${padX-8}" y="${(yy+4).toFixed(0)}" text-anchor="end" font-size="11" fill="#9b96b6">${val}</text>`; }); }
  else { ylab=`<text x="${padX-8}" y="${(padT+9).toFixed(0)}" text-anchor="end" font-size="10.5" fill="#9b96b6">high</text><text x="${padX-8}" y="${base.toFixed(0)}" text-anchor="end" font-size="10.5" fill="#9b96b6">low</text>`; }
  let ticks=""; [0,Math.floor(n/2),n-1].forEach(i=>{ ticks+=`<text x="${xi(i).toFixed(0)}" y="${H-8}" text-anchor="middle" font-size="11" fill="#9b96b6">${fmtDate(days[i])}</text>`; });
  let defs="", body="";
  keys.forEach((k,ki)=>{
    const meta=TREND_METRICS.find(m=>m[0]===k); const max=meta[3]; const col=TREND_COLORS[k]||"#9b8cf0";
    const vals=series[k]||[]; const yv=v=> padT + (1-(v/max))*plotH;
    if(single && type==="bars"){
      const gid="bg"+ki; defs+=`<linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col}"/><stop offset="1" stop-color="${col}" stop-opacity=".5"/></linearGradient>`;
      vals.forEach((v,i)=>{ if(v==null)return; const x=xi(i), h=Math.max(2,(v/max)*plotH), y=base-h, bw=Math.min(26,plotW/n*0.62);
        body+=`<rect x="${(x-bw/2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="url(#${gid})"/>`; });
    } else if(single && type==="dots"){
      vals.forEach((v,i)=>{ if(v==null)return; const x=xi(i), y=yv(v);
        body+=`<line x1="${x.toFixed(1)}" y1="${base}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${col}" stroke-width="2" opacity=".3"/>`;
        body+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.5" fill="${col}"/>`; });
    } else {
      const fid="fg"+ki;
      if(single) defs+=`<linearGradient id="${fid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".4"/><stop offset="1" stop-color="${col}" stop-opacity=".03"/></linearGradient>`;
      trendRuns(vals).forEach(run=>{
        const pts=run.map(p=>`${xi(p.i).toFixed(1)} ${yv(p.v).toFixed(1)}`);
        if(single) body+=`<path d="M${xi(run[0].i).toFixed(1)} ${base} L${pts.join(" L")} L${xi(run[run.length-1].i).toFixed(1)} ${base} Z" fill="url(#${fid})"/>`;
        body+=`<path d="M${pts.join(" L")}" fill="none" stroke="${col}" stroke-width="${single?3.5:2.6}" stroke-linecap="round" stroke-linejoin="round"/>`;
        run.forEach(p=>{ body+=`<circle cx="${xi(p.i).toFixed(1)}" cy="${yv(p.v).toFixed(1)}" r="${single?4:3.4}" fill="#fff" stroke="${col}" stroke-width="2.3"/>`; });
      });
    }
  });
  return `<svg class="trchart" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${grid}${ylab}${body}${ticks}</svg>`;
}

function trendStat(k){ const {series}=buildSeries(); const vals=(series[k]||[]).filter(v=>v!=null);
  if(!vals.length) return {n:0}; const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
  return {n:vals.length, avg:Math.round(avg*10)/10, min:Math.min(...vals), max:Math.max(...vals)}; }

function metricName(k){ const m=TREND_METRICS.find(x=>x[0]===k); return m?m[2]:k; }

function trendWord(metricKey){
  const {series}=buildSeries(); const vals=(series[metricKey]||[]).filter(v=>v!=null);
  const meta=TREND_METRICS.find(x=>x[0]===metricKey)||TREND_METRICS[0]; const name=meta[2];
  if(vals.length<4) return `A few more tracked days and I'll show ${name.toLowerCase()}'s direction. ❄️`;
  const half=Math.max(2,Math.floor(vals.length/2)); const early=vals.slice(0,half), late=vals.slice(-half);
  const avg=a=>a.reduce((p,c)=>p+c,0)/a.length; const d=avg(late)-avg(early);
  const rising=d>0.4, falling=d<-0.4;
  const W={
    mood:{up:"Your mood's been gently lifting 🌤️",down:"Mood's dipped a little — be extra soft with yourself today 💗",flat:"Mood's been pretty steady lately ❄️"},
    anxiety:{up:"Anxiety's run a bit higher — those days deserve extra care 🫂",down:"Anxiety's been easing off 🌿",flat:"Anxiety's held fairly steady ❄️"},
    energy:{up:"Energy's been climbing ⚡",down:"Energy's been lower — rest is allowed 🌙",flat:"Energy's been pretty even ❄️"},
    nausea:{up:"Nausea's been louder lately — water + smaller meals might help 🥤",down:"Nausea's been settling down 🌿",flat:"Nausea's been fairly steady ❄️"},
    cravings:{up:"Cravings have been louder lately 🍩",down:"Cravings have been quieter ✨",flat:"Cravings have been steady ❄️"},
    water:{up:"You've been drinking more water — lovely 🥤",down:"Water's dipped — a soft nudge to sip 💧",flat:"Water's been steady ❄️"},
    sleep:{up:"You've been sleeping a little longer 🌙",down:"Sleep's been shorter lately — gentle nights ahead 🌙",flat:"Sleep's been fairly steady ❄️"},
  };
  const m=W[metricKey]||W.mood; return rising?m.up:falling?m.down:m.flat;
}

function paintTrendChart(){
  const host=document.getElementById("trendChartHost"); if(!host)return;
  const keys=(state.trendMetrics&&state.trendMetrics.length)?state.trendMetrics:["mood"];
  const type=state.trendType||"area";
  host.innerHTML=buildChartSVG(keys,type);
  const title=document.getElementById("trendTitle");
  if(title) title.innerHTML = keys.length===1 ? `📊 <span>${esc(metricName(keys[0]))}</span>` : `📊 <span>${keys.length} metrics in tandem</span>`;
  const leg=document.getElementById("trendLegend");
  if(leg) leg.innerHTML = keys.length>1 ? keys.map(k=>{ const s=trendStat(k); return `<span class="tr-leg"><span class="dot" style="background:${TREND_COLORS[k]}"></span>${esc(metricName(k))}${s.n?` · ${s.avg}`:""}</span>`; }).join("") : "";
  const stat=document.getElementById("trendStat");
  if(stat){ if(keys.length===1){ const s=trendStat(keys[0]); stat.textContent = s.n ? `avg ${s.avg} · range ${s.min}–${s.max} · ${s.n} day${s.n>1?'s':''} logged` : "no days logged in this range yet ❄️"; }
    else { stat.textContent = "each line scaled to its own range, so you can compare shapes"; } }
  const w=document.getElementById("trendWord"); if(w) w.textContent = keys.length===1 ? trendWord(keys[0]) : "";
}


/* ===================== PLANNER ===================== */
const TASK_BUCKETS=[["personal","💜","Personal"],["health","💊","Health & appts"],["content","🎬","Content"],["hobbies","🎨","Hobbies"],["someday","🌙","Someday / maybe"]];

const TASK_ENERGY=[["low","🌙","Low"],["medium","🌤️","Medium"],["high","☀️","High"]];

const TASK_PRIORITY=[["low","⬇️","Low"],["medium","→","Medium"],["high","⬆️","High"],["urgent","🔥","Urgent"]];

function normEnergy(s){ return s==="some"?"medium":s==="full"?"high":(s||"medium"); }

function spoonMeta(s){ return energyMeta(s); }

/* ---- planner upgrades: status board, sorting lens, due dates, linked reminders ---- */
const TASK_STATUSES=[["todo","🌱 To do"],["doing","🔆 Doing"],["done","✅ Done"]];

function taskStatus(t){ return t.status||(t.done?"done":"todo"); }

function remByTask(){ const m={}; (state.sentinel.customReminders||[]).forEach(r=>{ if(r.taskId&&!r.done) m[r.taskId]=r; }); return m; }

function sortTasks(arr){
  const m=state.boardSort||"custom"; if(m==="custom")return arr;          // the lens never rearranges her saved order
  const bIdx=k=>{ const i=TASK_BUCKETS.findIndex(b=>b[0]===k); return i<0?99:i; };
  const sIdx={low:0,medium:1,some:1,high:2,full:2};                       // gentle wins float up on hard days
  return arr.slice().sort((a,b)=>{
    if(m==="bucket"){ const d=bIdx(a.bucket)-bIdx(b.bucket); if(d)return d; return String(a.due||"9999").localeCompare(String(b.due||"9999")); }
    if(m==="due") return String(a.due||"9999-99").localeCompare(String(b.due||"9999-99"));
    if(m==="energy"){ const d=((sIdx[normEnergy(a.energy||a.spoon)]??1)-(sIdx[normEnergy(b.energy||b.spoon)]??1)); if(d)return d; return String(a.due||"9999").localeCompare(String(b.due||"9999")); }
    return 0; });
}

function taskRow(t){
  const sm=spoonMeta(t.spoon); const subs=t.sub||[]; const R=remByTask()[t.id];
  return `<div style="border-top:1px solid var(--line);padding:9px 0">
    <div style="display:flex;align-items:flex-start;gap:9px">
      <button class="x" data-act="toggleTask" data-v="${t.id}" title="mark done" style="color:var(--mint);font-size:17px">○</button>
      <div class="grow"><span style="font-size:13px">${esc(t.text)}</span> <span class="pill pill-gray" title="spoons">${sm[1]}</span> ${duePill(t)} ${remBellBtn(t,R)} <button class="x" data-act="taskEdit" data-v="${t.id}" title="edit task" style="font-size:12px">✏️</button>
        ${subs.length?`<div style="margin-top:6px">${subs.map(s=>`<div style="display:flex;align-items:center;gap:7px;padding:2px 0"><button class="x" data-act="toggleSub" data-v="${t.id}" data-s="${s.id}" style="font-size:14px;color:${s.done?'var(--mint)':'var(--muted)'}">${s.done?'●':'○'}</button><span class="${s.done?'soft':''}" style="font-size:12px;${s.done?'text-decoration:line-through':''}">${esc(s.text)}</span></div>`).join("")}</div>`:''}
        <div style="margin-top:4px"><input class="inp" data-subfor="${t.id}" placeholder="+ subtask (Enter)" style="font-size:11.5px;padding:5px 9px;max-width:240px;display:inline-block;width:auto"></div>
      </div>
      <button class="x" data-act="delTask" data-v="${t.id}">✕</button>
    </div></div>`;
}

/* adaptive spoon-budget — reads today's logged energy and gently suggests how to pace the day */
function spoonBudgetBanner(){
  const e=(state.today&&state.today.mind&&state.today.mind.energy);
  if(e==null) return `<div class="soft-card" style="margin-bottom:10px;font-size:11.5px;padding:9px 11px">🥄 Log today's <b>energy</b> on the Health tab and I'll suggest how to pace your list. ❄️</div>`;
  const open=(state.sentinel.tasks||[]).filter(t=>!t.done);
  const cnt=s=>open.filter(t=>(t.spoon||"some")===s).length;
  let tier, msg, sug;
  if(e<=1){ tier="low"; msg="a low-spoon day — be so gentle with yourself"; sug="Maybe just one 🌙 low task (or none). Rest counts."; }
  else if(e<=3){ tier="med"; msg="a medium-spoon day"; sug="A couple of 🌙 low + one 🌤 some task is plenty."; }
  else { tier="full"; msg="a fuller-energy day"; sug="Good day to tackle a 🌞 full task if you want — ride the wave, but still pace it."; }
  const counts=`${cnt('low')} 🌙 · ${cnt('some')} 🌤 · ${cnt('full')} 🌞 open`;
  return `<div class="soft-card" style="margin-bottom:10px;font-size:12px;padding:10px 12px;background:rgba(201,184,240,.14)">
    🥄 Energy today is <b>${e}/5</b> — ${msg}. ${sug} <span class="soft" style="font-size:10.5px">(${counts})</span>
    ${tier!=='full'?`<button class="btn" data-act="plnFilter" data-v="${tier==='low'?'low':'some'}" style="margin-left:6px;padding:3px 9px;font-size:11px">show gentle ones</button>`:''}</div>`;
}

function taskCard(t){
  const sm=spoonMeta(t.spoon); const bm=TASK_BUCKETS.find(b=>b[0]===t.bucket)||TASK_BUCKETS[0]; const R=remByTask()[t.id];
  return `<div class="citem" draggable="true" data-drag-task="${t.id}">
    <div style="display:flex;gap:6px;align-items:flex-start">
      <button class="x" data-act="toggleTask" data-v="${t.id}" style="color:var(--mint);font-size:15px">${t.done?'●':'○'}</button>
      <span class="grow" style="font-size:12.5px;${t.done?'text-decoration:line-through;opacity:.6':''}">${esc(t.text)}</span>
      <button class="x" data-act="delTask" data-v="${t.id}">✕</button></div>
    <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-top:5px">
      <span class="pill pill-gray" title="${bm[2]}">${bm[1]}</span><span class="pill pill-gray" title="spoons">${sm[1]}</span>${duePill(t)}${remBellBtn(t,R)}<button class="x" data-act="taskEdit" data-v="${t.id}" title="edit task" style="font-size:11px">✏️</button>
      <span style="margin-left:auto;display:inline-flex;gap:2px">
        <button class="x" data-act="taskMove" data-v="${t.id}" data-d="-1" title="move left" style="font-size:12px">◀</button>
        <button class="x" data-act="taskMove" data-v="${t.id}" data-d="1" title="move right" style="font-size:12px">▶</button></span>
    </div></div>`;
}

function taskBoard(list){
  return `<div class="kanban">${TASK_STATUSES.map(([key,lbl])=>{
    const col=sortTasks(list.filter(t=>taskStatus(t)===key));
    return `<div class="kcol" data-kstatus="${key}">
      <div class="label" style="display:flex;justify-content:space-between;padding:2px 4px"><span>${lbl}</span><span>${col.length}</span></div>
      ${col.map(taskCard).join("")||`<div class="label" style="padding:8px 6px;opacity:.55">—</div>`}</div>`;
  }).join("")}</div>`;
}

/* keep the add-a-task form alive across filter/sort/view re-renders */
function capturePlnDraft(){ const g=id=>{const e=document.getElementById(id);return e?e.value:null;};
  const t=g("plnText"); if(t==null) return;
  state.plnDraft={text:t,bucket:g("plnBucket"),energy:g("plnEnergy"),priority:g("plnPriority"),emoji:g("plnEmoji"),due:g("plnDue")}; }

/* one move, everything follows: status + done flag + linked reminder, in a single save */
async function setTaskStatusById(id,st){
  if(!TASK_STATUSES.some(s=>s[0]===st))return;
  await setSent(n=>{ let c=(n.customReminders||[]).slice();
    const ts=(n.tasks||[]).map(t=>{ if(t.id!==id)return t; const done=st==="done";
      if(done) c=c.map(r=>r.taskId===id&&!r.done?{...r,done:true}:r);     // task done ⇒ its ping is done too
      return {...t,status:st,done}; });
    return {...n,tasks:ts,customReminders:c}; });
  render();
}

const oval=id=>{ const e=document.getElementById(id); return e?e.value.trim():""; };

async function kikoSimpleCall(agentInput){
  const sys=`You are Kiko, a warm and playful snow fox AI companion living inside ${CONFIG.creator.name}'s (${CONFIG.creator.fullName}) personal OS. You're cozy, caring, and a little mischievous. Today is ${TODAY}. Help her with streaming, gacha games, creative work, and daily life. Be concise but warm. Use soft emojis occasionally (🦊❄️🌸) but don't overdo it.
Current tab: ${agentInput.tab}. ${agentInput.userModel?`What you know about her: ${agentInput.userModel}`:""}

IMPORTANT — when doing any research or community pulse request:
- NEVER give vague or generic answers like "players are enjoying the latest banners" — that tells her nothing
- Always name the SPECIFIC character, event, patch, or drama by name (e.g. "Arlecchino's rerun", "the 5.6 patch notes", "HoYo's DMCA strike on Blank user")
- Always include the APPROXIMATE DATE of when this happened
- Always include at least one clickable source link (Reddit thread, YouTube video, tweet, news article) so she can verify and show chat
- If something is speculated or uncertain, say so clearly
- NEVER mix up games — always verify a character, event or update belongs to the game being asked about before including it. Lucilla is from Wuthering Waves, not Reverse: 1999. Double-check before every claim.
- Write as if you're briefing a content creator who needs to go live in an hour and needs real, verifiable, specific receipts`;
  const history=(agentInput.history||[]).map(m=>({role:m.role==="me"?"user":"assistant",content:m.text}));
  const messages=[{role:"system",content:sys},...history,{role:"user",content:agentInput.question||(agentInput.images&&agentInput.images.length?"(sent an image)":"...")}];
  const smart=!!agentInput.smart;
  const body=smart
    ?{model:"o3-mini",messages}
    :{model:"gpt-4o-search-preview",web_search_options:{},messages};
  const res=await fetch(`${CONFIG.url}/functions/v1/${CONFIG.kikoFn}`,{method:"POST",
    headers:{"Content-Type":"application/json","apikey":CONFIG.anonKey,"Authorization":"Bearer "+CONFIG.anonKey},
    body:JSON.stringify(body)});
  const data=await res.json();
  if(data.error) throw new Error(typeof data.error==="string"?data.error:JSON.stringify(data.error));
  return {reply:data.choices?.[0]?.message?.content||"hmm, my whiskers twitched — ask me again? 🦊"};
}

async function aiCall(mode,input,vidiq){
  if(!SB) throw new Error("This needs live mode — connect Supabase first.");
  const { data, error } = await SB.functions.invoke(CONFIG.aiFn, { body:{ mode, input:input||{}, userId:CONFIG.userId, vidiq:vidiq||null } });
  if(error) throw new Error(error.message||"AI helper error");
  if(data && data.error) throw new Error(data.error);
  return data;
}

/* streaming agent call — live status events ("🔎 searched the web…") while Kiko works, then the final payload */
async function aiCallAgentStream(input,onStatus){
  const res=await fetch(CONFIG.url+"/functions/v1/"+CONFIG.aiFn,{ method:"POST",
    headers:{ "Content-Type":"application/json", apikey:CONFIG.anonKey, Authorization:"Bearer "+CONFIG.anonKey },
    body:JSON.stringify({ mode:"agent", input:input||{}, userId:CONFIG.userId, stream:true }) });
  if(!res.ok||!res.body) throw new Error("stream unavailable");
  const rd=res.body.getReader(); const dec=new TextDecoder(); let buf="", payload=null;
  while(true){ const {done,value}=await rd.read(); if(done)break; buf+=dec.decode(value,{stream:true});
    let i; while((i=buf.indexOf("\n\n"))>=0){ const chunk=buf.slice(0,i); buf=buf.slice(i+2);
      const m=chunk.match(/^data:\s*(.+)$/m); if(!m)continue;
      try{ const ev=JSON.parse(m[1]);
        if(ev.t==="status"&&onStatus){ try{ onStatus(ev.text); }catch(_){} }
        else if(ev.t==="done") payload=ev.payload;
      }catch(_){} } }
  if(!payload) throw new Error("stream ended without a reply");
  if(payload.error) throw new Error(payload.error);
  return payload;
}

/* copy: pull text from OPT result by key (no huge strings in attributes) */
function optCopy(k){
  const v=OPT.video||{}, s=OPT.stream||{};
  const m={ vtitles:(v.titles||[]).join("\n"), vtags:(v.tags||[]).join(", "), vhash:(v.hashtags||[]).join(" "), vdesc:v.description||"",
    stitles:(s.titles||[]).join("\n"), stags:(s.tags||[]).join(", "), shash:(s.hashtags||[]).join(" "), sdesc:s.description||"",
    twitch:s.twitchTitle||"", twitter:s.twitterTitle||"" };
  return m[k]||"";
}

/* ===================== SCRIPT WRITER (voice-to-text → formatted script) ===================== */
let RECOG=null, scrRecOn=false;

function scrCapture(){ if(!state.script)state.script={kind:"short"}; const g=id=>{const el=document.getElementById(id);return el?el.value:undefined;}; const t=g("scrTitle"),r=g("scrRefs"),w=g("scrRaw"); if(t!=null)state.script.title=t; if(r!=null)state.script.references=r; if(w!=null)state.script.raw=w; }

function setRecBtn(on){ const b=document.getElementById("recBtn"); if(b){ b.textContent=on?"⏹ Stop":"🎙️ Record"; b.classList.toggle("on",on); } const h=document.getElementById("recHint"); if(h)h.textContent=on?"listening… speak naturally, tap Stop when you're done 🌸":""; }

function scrRecToggle(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ toast("Voice typing needs Chrome or Edge on desktop 🌸"); return; }
  if(!state.script)state.script={kind:"short",raw:""};
  if(scrRecOn){ scrRecOn=false; try{RECOG&&RECOG.stop();}catch(e){} scrCapture(); setRecBtn(false); return; }
  try{ RECOG=new SR(); }catch(e){ toast("Couldn't start the mic 🌸"); return; }
  RECOG.lang="en-US"; RECOG.continuous=true; RECOG.interimResults=true;
  RECOG.onresult=function(e){ let interim="",fin=""; for(let i=e.resultIndex;i<e.results.length;i++){ const tx=e.results[i][0].transcript; if(e.results[i].isFinal)fin+=tx; else interim+=tx; } if(fin){ state.script.raw=((state.script.raw||"").replace(/\s*$/,"")+" "+fin.trim()).trim(); } const ta=document.getElementById("scrRaw"); if(ta){ ta.value=state.script.raw+(interim?" "+interim:""); ta.scrollTop=ta.scrollHeight; } };
  RECOG.onerror=function(e){ if(e.error==="not-allowed"||e.error==="service-not-allowed"){ toast("Let the browser use your mic 🌸"); scrRecOn=false; setRecBtn(false); } };
  RECOG.onend=function(){ if(scrRecOn){ try{RECOG.start();}catch(e){} } };   // auto-continue after pauses until Stop
  try{ RECOG.start(); scrRecOn=true; setRecBtn(true); }catch(e){ toast("Mic busy — try again 🌸"); }
}

async function scrFormat(){
  scrCapture(); if(scrRecOn)scrRecToggle(); const out=document.getElementById("scrOut"); if(!out)return;
  if(DEMO||!SB){ out.innerHTML=`<div class="soft-card" style="font-size:12.5px;margin-top:10px">✨ Runs once the ai function is deployed and demo is off ❄️</div>`; return; }
  if(!(state.script.raw||"").trim() && !(state.script.references||"").trim()){ toast("Add some words or research first 🌸"); return; }
  const tw=state.script.kind==="twitter";
  out.innerHTML=`<div class="label" style="margin-top:10px">${tw?'writing your post… ❄️🦊':'shaping your script… ❄️🦊'}</div>`;
  try{ const r=await aiCall("script",{kind:state.script.kind,title:state.script.title,references:state.script.references,raw:state.script.raw,voice:voiceExamples(tw?"twitter":"script")}); if(r&&r.error){ out.innerHTML=`<div class="soft" style="color:var(--sakura-deep);font-size:12.5px;margin-top:10px">${esc(r.error)}</div>`; return; } state.script.out=r; render(); }
  catch(e){ out.innerHTML=`<div class="soft" style="color:var(--sakura-deep);font-size:12.5px;margin-top:10px">${esc(e.message||e)}</div>`; }
}

async function scrSaveDraft(){
  scrCapture(); const s=state.script; if(!(s.title||s.raw||s.references)){ toast("Nothing to save yet 🌸"); return; }
  await setSent(n=>{ const list=(n.scripts||[]).slice(); const rec={id:s.id||("sc"+uid().slice(0,8)),kind:s.kind,title:s.title||"",references:s.references||"",raw:s.raw||"",out:s.out||null,updated:new Date().toISOString()}; const i=list.findIndex(x=>x.id===rec.id); if(i>=0)list[i]=rec; else list.push(rec); s.id=rec.id; return {...n,scripts:list}; });
  toast("Saved 💗"); render();
}

async function scrLoadDraft(id){ const d=((state.sentinel||{}).scripts||[]).find(x=>x.id===id); if(d){ state.script={id:d.id,kind:d.kind||"short",title:d.title||"",references:d.references||"",raw:d.raw||"",out:d.out||null}; render(); } }

async function scrDelDraft(id){ await setSent(n=>({...n,scripts:(n.scripts||[]).filter(x=>x.id!==id)})); toast("Removed"); render(); }


/* ===== 🎓 Teach Kiko your voice — real writing samples that shape generated scripts ===== */
const VOICE_KINDS=[["any","Any"],["script","Scripts"],["twitter","Posts"],["title","Titles"]];

function voiceExamples(kind){ const all=(state.sentinel.eqVoice||[]); return all.filter(e=>e&&e.text&&(!e.kind||e.kind==="any"||e.kind===kind)); }

function teachModal(kind){
  const k=VOICE_KINDS.some(x=>x[0]===kind)?kind:"script";
  $("#modal").innerHTML=`<div class="modal-bg" data-act="closeModal"><div class="modal" data-act="noop" style="max-width:440px">
    <div class="card-head"><h3 style="font-size:16px">🎓 Teach Kiko your voice</h3><button class="btn" data-act="closeModal">✕</button></div>
    <p class="soft" style="font-size:12px;margin:0 0 10px">Paste a bit of your own real writing — a script, a tweet, a caption. Kiko studies the style (rhythm, words, quirks) and matches it when shaping your scripts, instead of sounding like generic AI. ❄️</p>
    <div class="field"><div class="label">What kind?</div>
      <select class="inp" id="tvKind">${VOICE_KINDS.map(([v,l])=>`<option value="${v}" ${v===k?'selected':''}>${l}</option>`).join("")}</select></div>
    <div class="field"><div class="label">Your writing sample</div><textarea class="inp" id="tvText" style="min-height:120px" placeholder="paste something you wrote, in your natural voice…"></textarea></div>
    <div class="field"><div class="label">Note · optional</div><input class="inp" id="tvNote" placeholder="e.g. 'my cozy long-form tone'"></div>
    <button class="btn btn-grad" data-act="teachSave" data-v="${k}">💾 save sample</button>
    ${(state.sentinel.eqVoice||[]).length?`<div class="label" style="margin:14px 0 6px">Saved samples (${(state.sentinel.eqVoice||[]).length})</div>${(state.sentinel.eqVoice||[]).slice().reverse().map(e=>`<div class="listrow"><span class="grow" style="font-size:12px"><span class="pill pill-gray" style="font-size:9px">${esc((VOICE_KINDS.find(x=>x[0]===e.kind)||['','any'])[1]||e.kind||'any')}</span> ${esc((e.note||e.text||"").slice(0,60))}${(e.note||e.text||"").length>60?'…':''}</span><button class="x" data-act="delVoice" data-v="${e.id}">✕</button></div>`).join("")}`:''}
  </div></div>`;
}


function sponsorBlock(){
  const sp=(state.sentinel.sponsors||[]).slice();
  const badge=s=>({active:'pill-mint',pending:'pill-lav',done:'pill-gray'})[s]||'pill-gray';
  const due=s=>{ if(!s.due||s.status==="done")return ""; const dd=daysBetween(TODAY,s.due);
    const col=dd<0?"background:#fde4e4;color:#c0566a":dd<=3?"background:#fdebd9;color:#b4764a":"";
    return ` <span class="pill ${col?'':'pill-gray'}" style="font-size:9px;${col}">⏳ ${dd<0?(-dd)+"d late":dd===0?"due today":dd===1?"due tomorrow":"due "+fmtDate(s.due)}</span>`; };
  const rows=sp.length?sp.map(s=>`<div class="listrow" style="align-items:flex-start">
      <span class="grow"><b style="font-size:13px">${esc(s.name)}</b> <span class="pill ${badge(s.status)}" style="font-size:10px">${esc(s.status||'pending')}</span>${due(s)}
        <div class="soft" style="font-size:11.5px">${s.code?'code '+esc(s.code)+' · ':''}${s.payout?esc(s.payout)+' · ':''}${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener" style="color:var(--peri-deep)">link</a>`:''}${s.note?' · '+esc(s.note):''}</div></span>
      <label class="x" style="cursor:pointer" title="deliverable due date">📅<input type="date" data-spdue="${s.id}" value="${s.due||''}" style="display:none"></label>
      <button class="x" data-act="spCycle" data-v="${s.id}" title="cycle status">↻</button>
      <button class="x" data-act="delSponsor" data-v="${s.id}">✕</button></div>`).join("")
    :`<p class="soft" style="font-size:12.5px">No sponsors yet — add brand deals, codes, and payouts to keep them all in one place. 💜</p>`;
  return `<section class="panel">
    <div class="card-head"><span class="label">💜 Sponsors &amp; deals</span><span class="pill pill-gray">${sp.filter(s=>s.status==='active').length} active</span></div>
    ${rows}
    <details class="acc" style="margin-top:10px"><summary>＋ add a sponsor</summary><div class="acc-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <input class="inp" id="sp_name" placeholder="brand (e.g. GamerSupps)">
        <input class="inp" id="sp_code" placeholder="code (e.g. MIFUYU)">
        <input class="inp" id="sp_payout" placeholder="deal / payout (e.g. €300 + 10%)">
        <input class="inp" id="sp_url" placeholder="link (https://…)">
      </div>
      <input class="inp" id="sp_note" placeholder="note (deliverables…)" style="margin-top:8px">
      <div class="field" style="margin-top:8px"><div class="label">Deliverable due date · optional</div><input class="inp" id="sp_due" type="date"></div>
      <button class="btn btn-grad" data-act="addSponsor" style="margin-top:8px">Add sponsor</button>
    </div></details>
  </section>`;
}

/* creator tools — draft streams from game events + a quick post-stream debrief */
function creatorTools(){
  const s=state.sentinel||{}; const wk=weekStartISO(0);
  const ge=(s.calendarEvents||[]).filter(gameSrc).filter(e=>{ const diff=daysBetween(wk,e.date); return diff>=0&&diff<7&&e.date>=TODAY; }).sort(cmpDate);
  const log=(s.streamLog||[]).slice().reverse();
  const draft=`<section class="panel">
    <div class="card-head"><span class="label">📅 Plan this week's streams</span></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Turn this week's tracked game beats into stream slots in one tap — then tweak times on Home → Stream schedule. ❄️</p>
    ${ge.length?`<div style="margin-bottom:8px">${ge.map(e=>`<div class="listrow"><span class="grow" style="font-size:12.5px">🎮 ${esc(e.title)} <span class="soft">· ${new Date(e.date+"T00:00").toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</span></span></div>`).join("")}</div>
      <button class="btn btn-grad" data-act="draftStreams">＋ draft ${ge.length} stream slot${ge.length>1?'s':''}</button>`
      :`<p class="soft" style="font-size:12px">No game beats on the calendar for this week yet — ask Kiko to "refresh my game calendar" and they'll appear here. 🦊</p>`}
  </section>`;
  const debrief=`<section class="panel">
    <div class="card-head"><span class="label">🎬 Post-stream debrief</span></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">A 20-second note after a stream — how it felt + an idea for next time. Kiko remembers these and can pull ideas from them. 💗</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <input class="inp" id="db_game" placeholder="what did you stream?" style="flex:2;min-width:140px">
      <select class="inp" id="db_vibe" style="max-width:130px"><option value="">how'd it feel?</option>${[["5","✨ great"],["4","🙂 good"],["3","😌 okay"],["2","😕 meh"],["1","🌧️ rough"]].map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select>
    </div>
    <textarea class="inp" id="db_note" rows="2" placeholder="highlights, what to try next time, ideas…" style="margin-top:8px"></textarea>
    <button class="btn btn-grad" data-act="saveDebrief" style="margin-top:8px">Save debrief 🎬</button>
    ${log.length?`<details class="acc" style="margin-top:10px"><summary>recent debriefs (${log.length})</summary><div style="margin-top:6px">${log.slice(0,6).map(d=>`<div class="listrow"><span class="grow" style="font-size:12px"><b>${esc(d.game||'stream')}</b> <span class="soft">· ${fmtDate(d.date)}${d.vibe?' · '+["","🌧️","😕","😌","🙂","✨"][d.vibe]:''}</span>${d.note?`<div class="soft" style="font-size:11px">${esc(d.note)}</div>`:''}</span><button class="x" data-act="delDebrief" data-id="${d.id}">✕</button></div>`).join("")}</div></details>`:''}
  </section>`;
  return draft+debrief;
}

/* her reusable YouTube description template — saved in the DB, auto-appended to every generated description */
function descTemplate(){ const t=state.sentinel&&state.sentinel.descTemplate; return (t!=null&&t!=="")?t:CONFIG.descFooter; }


/* ===================== CALENDAR (front-end only; events on sentinel row) ===================== */
const CAL_TZ_TARGET="Europe/Amsterdam";
   // Mifu is CET — everything is shown in this zone
const CAL_TZ_LABEL="CET";

const CAL_TZS=[["Europe/Amsterdam","CET · Europe (your time)"],["Europe/London","UK"],["UTC","UTC"],["America/New_York","ET · Eastern"],["America/Chicago","CT · Central"],["America/Denver","MT · Mountain"],["America/Los_Angeles","PT · Pacific"],["Asia/Tokyo","JP · Japan"]];

const CAL_TZ_SHORT={"Europe/Amsterdam":"CET","Europe/London":"UK","UTC":"UTC","America/New_York":"ET","America/Chicago":"CT","America/Denver":"MT","America/Los_Angeles":"PT","Asia/Tokyo":"JP"};

const CAL_COLORS=["#9fc7f0","#c9b8f0","#a9e0cb","#ff9ed8","#b8d4f0"];
    // game livestream days (light purple)
const DEFAULT_GAMES=["Wuthering Waves","Honkai Star Rail","Neverness to Everness","Arknights Endfield","Zenless Zone Zero","Genshin Impact"];

function gameSrc(ev){ return ev&&(ev.src==="game"||ev.src==="gameevent"||ev.src==="gamestream"); }

function gameSrcIcon(ev){ return ev.src==="gamestream"?"📺 " : ev.src==="gameevent"?"🎉 " : ev.src==="game"?"🎮 " : ""; }

let CAL_COLOR=CAL_COLORS[0];

function tzOffsetMs(tz,utcMs){ const p=new Intl.DateTimeFormat("en-US",{timeZone:tz,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}).formatToParts(new Date(utcMs)).reduce((a,x)=>(a[x.type]=x.value,a),{}); const asUTC=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second); return asUTC-utcMs; }

function wallToUtc(dateStr,timeStr,tz){ const [Y,M,D]=dateStr.split("-").map(Number); const [h,m]=(timeStr||"00:00").split(":").map(Number); const guess=Date.UTC(Y,M-1,D,h,m); let off=tzOffsetMs(tz,guess); off=tzOffsetMs(tz,guess-off); return guess-off; }

function toLocal(dateStr,timeStr,tz){ if(!timeStr)return null; const utc=wallToUtc(dateStr,timeStr,tz||CAL_TZ_TARGET); const p=new Intl.DateTimeFormat("en-US",{timeZone:CAL_TZ_TARGET,hour:"numeric",minute:"2-digit",hour12:true,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(utc)).reduce((a,x)=>(a[x.type]=x.value,a),{}); const lDate=`${p.year}-${p.month}-${p.day}`; return { tTime:`${p.hour}:${p.minute} ${p.dayPeriod}`, tDate:lDate, dayDiff:lDate!==dateStr }; }

function fmt12(timeStr){ if(!timeStr)return ""; const [h,m]=timeStr.split(":").map(Number); const ap=h<12?"AM":"PM"; const hh=h%12||12; return `${hh}:${String(m).padStart(2,"0")} ${ap}`; }

function calShift(iso,delta){ const d=new Date(iso+"T00:00"); d.setDate(d.getDate()+delta); return d.toLocaleDateString("en-CA"); }

async function gameTopicAdd(name){ await setSent(n=>{ let g=(n.gameTopics&&n.gameTopics.length)?n.gameTopics.slice():DEFAULT_GAMES.slice(); if(!g.some(x=>x.toLowerCase()===String(name).toLowerCase()))g.push(name); return {...n,gameTopics:g}; }); }

async function gameTopicRemove(name){ await setSent(n=>{ let g=(n.gameTopics&&n.gameTopics.length)?n.gameTopics.slice():DEFAULT_GAMES.slice(); g=g.filter(x=>x.toLowerCase()!==String(name).toLowerCase()); return {...n,gameTopics:g}; }); }


/* ----- Events & Birthdays agenda + reminder settings (under the calendar) ----- */
function nextBirthdayInfo(b){
  const today=new Date(TODAY+"T00:00"); const y=today.getFullYear();
  // clamp to the month's real length so Feb-29 birthdays land on Feb-28 in non-leap years (not Mar 1)
  const mk=yy=>{ const M=Number(b.month),D=Number(b.day),last=new Date(yy,M,0).getDate(); return new Date(yy,M-1,Math.min(D,last)); };
  let d=mk(y); if(d<today) d=mk(y+1);
  return { date:d.toLocaleDateString("en-CA"), days:Math.round((d-today)/86400000) };
}

function whenLabel(days){ return days===0?"<b>today</b>":days===1?"<b>tomorrow</b>":("in "+days+" days"); }


async function calEventModal(date,eid){
  const sent=await DB.daily(SENTINEL);
  const events=sent.calendarEvents||[];
  const ev=eid?events.find(e=>e.id===eid):null;
  CAL_COLOR=ev?(ev.color||CAL_COLORS[0]):CAL_COLORS[0];
  const theDate=ev?ev.date:date;
  const curTz=ev?(ev.tz||CAL_TZ_TARGET):CAL_TZ_TARGET;
  document.getElementById("modal").innerHTML=`<div class="modal-bg" data-act="closeModal"><div class="modal" data-act="noop" style="max-width:420px;width:100%;max-height:92vh;overflow:auto"><div class="card-head"><h3 style="font-size:16px">${ev?"✏️ Edit event":"➕ New event"}</h3><button class="btn" data-act="closeModal">✕</button></div>
    <input type="hidden" id="calEid" value="${ev?ev.id:""}" />
    ${ev&&ev.autoFetched&&(ev.note||ev.url)?`<div style="background:rgba(100,120,220,.08);border-radius:10px;padding:10px 12px;margin-bottom:12px">
      <div style="font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--lav-deep);margin-bottom:4px">🦊 KIKO FOUND</div>
      ${ev.note?`<p style="font-size:12.5px;line-height:1.5;margin:0 0 6px">${esc(ev.note)}</p>`:""}
      ${ev.url?`<a href="${esc(ev.url)}" target="_blank" rel="noopener" style="font-size:11.5px;color:var(--lav-deep);word-break:break-all">🔗 ${esc(ev.url)}</a>`:""}
    </div>`:""}
    <div class="label" style="margin-bottom:4px">What's happening?</div>
    <input class="inp" id="calTitle" value="${ev?esc(ev.title):""}" placeholder="e.g. Collab stream 🎀" />
    <div style="display:flex;gap:10px;margin-top:10px">
      <div style="flex:1"><div class="label" style="margin-bottom:4px">Date</div><input class="inp" id="calDate" type="date" value="${theDate}" /></div>
      <div style="flex:1"><div class="label" style="margin-bottom:4px">Ends (optional)</div><input class="inp" id="calEndDate" type="date" value="${ev&&ev.endDate?ev.endDate:""}" /></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap">
      <div style="flex:1;min-width:110px"><div class="label" style="margin-bottom:4px">Time</div><input class="inp" id="calTime" type="time" value="${ev&&ev.time?ev.time:""}" /></div>
      <div style="flex:2;min-width:150px"><div class="label" style="margin-bottom:4px">Happening in</div><select class="inp" id="calTz">${CAL_TZS.map(([v,l])=>`<option value="${v}" ${v===curTz?"selected":""}>${l}</option>`).join("")}</select></div>
    </div>
    <div id="calConv" class="soft-card" style="margin-top:10px;font-size:12.5px;display:none"></div>
    <div class="label" style="margin:12px 0 4px">Note</div>
    <textarea class="inp" id="calNote" rows="2" placeholder="anything to remember… 🌸">${ev&&ev.note?esc(ev.note):""}</textarea>
    <div class="label" style="margin:12px 0 4px">Link (optional)</div>
    <div style="display:flex;gap:8px"><input class="inp" id="calUrl" value="${ev&&ev.url?esc(ev.url):""}" placeholder="https://… update info" />${ev&&ev.url?`<a href="${esc(ev.url)}" target="_blank" rel="noopener" class="btn" title="open link">🔗</a>`:""}</div>
    <div class="label" style="margin:12px 0 4px">Colour</div>
    <div id="calColors" style="display:flex;gap:8px">${CAL_COLORS.map(c=>`<button class="cal-swatch" data-color="${c}" style="background:${c};border:2px solid ${c===CAL_COLOR?"var(--ink)":"transparent"}"></button>`).join("")}</div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-grad" data-act="saveCalEvent" style="flex:1">💾 save</button>
      ${ev?`<button class="btn" data-act="delCalEvent" data-eid="${ev.id}" style="color:var(--sakura-deep)">delete</button>`:""}
    </div></div></div>`;
  document.querySelectorAll("#calColors .cal-swatch").forEach(b=>b.addEventListener("click",()=>{
    CAL_COLOR=b.dataset.color;
    document.querySelectorAll("#calColors .cal-swatch").forEach(x=>x.style.borderColor="transparent");
    b.style.borderColor="var(--ink)";
  }));
  const conv=document.getElementById("calConv");
  function refreshConv(){
    const t=document.getElementById("calTime").value, tz=document.getElementById("calTz").value, dt=document.getElementById("calDate").value;
    if(!t){ conv.style.display="none"; return; }
    const et=toLocal(dt,t,tz);
    if(tz===CAL_TZ_TARGET){ conv.style.display="block"; conv.innerHTML=`🕒 <b>${et.tTime} ${CAL_TZ_LABEL}</b> — already in your time zone 💗`; return; }
    conv.style.display="block";
    conv.innerHTML=`🕒 ${fmt12(t)} ${CAL_TZ_SHORT[tz]||""} → <b>${et.tTime} ${CAL_TZ_LABEL}</b>${et.dayDiff?` <span class="muted">(${et.tDate})</span>`:""}`;
  }
  ["calTime","calTz","calDate"].forEach(idn=>document.getElementById(idn).addEventListener("input",refreshConv));
  refreshConv();
}


/* ===================== HANDLERS ===================== */
// Pull everything from the DB once and cache it in state. Called on boot, and again only
// when an external write (e.g. Kiko's agent) changes server data we don't already hold locally.
/* her saved details (Settings → Your details) — stored on the sentinel row, applied at boot */
function applyAppConfig(){ try{ const a=(state.sentinel&&state.sentinel.appConfig)||{};
  if(a.name)CONFIG.creator.name=a.name; if(a.greeting)CONFIG.creator.greeting=a.greeting;
  if(a.weightUnit)CONFIG.weightUnit=a.weightUnit; if(a.weightDisplay)CONFIG.weightDisplay=a.weightDisplay; }catch(e){} }

let WITHINGS_AUTOSYNC_DONE=false;

let WITHINGS_BUSY=false;
   // one Withings call at a time — concurrent calls race the single-use refresh token
async function loadData(){
  state.sentinel = await DB.daily(SENTINEL);
  applyAppConfig();
  state.today = await DB.daily(TODAY);
  state.range = await DB.range(63);   // 9 weeks: Trends 14d/30d toggle + gacha streaks & past-week grid
  state._loaded = true;
  try{ withingsAutoSync(); }catch(e){}   // pull new weigh-ins from the scale in the background
}

/* automatic Withings sync — so new weigh-ins arrive without tapping "Sync from scale".
   Runs once per session on load if connected and the last sync is over ~3h old. */
async function withingsAutoSync(){
  if(WITHINGS_AUTOSYNC_DONE || DEMO || !SB) return;
  const w=(state.sentinel&&state.sentinel.withings)||null;
  if(!w||!w.refresh_token) return;                         // not connected → nothing to do
  const last=(w.lastSync||0)*1000; if(last && (Date.now()-last) < 3*3600*1000) return;   // synced recently
  if(WITHINGS_BUSY) return;
  WITHINGS_BUSY=true;
  try{ const d=await aiCall("withingsSync",{});
    if(d&&!d.error){ WITHINGS_AUTOSYNC_DONE=true;   // only latch as done on a real success — a transient failure retries next load
      if(d.added||d.days){ await loadData(); render(); if(d.added) toast(`📲 synced ${d.added} new weigh-in${d.added>1?"s":""} from your scale`); } }
  }catch(e){}
  finally{ WITHINGS_BUSY=false; }
}

async function setToday(merge){ state.today=await DB.saveDaily(TODAY,n=>merge(n)); }

async function setSent(merge){ state.sentinel=await DB.saveDaily(SENTINEL,n=>merge(n)); }

// one weight-log entry per day — merge new fields into today's row (weight, body comp, etc.)
async function upsertWeightToday(fields){
  await setSent(n=>{ const wl=(n.weightLog||[]).slice(); const i=wl.findIndex(x=>x.date===TODAY);
    if(i>=0) wl[i]={...wl[i],...fields,date:TODAY}; else wl.push({date:TODAY,...fields});
    return {...n,weightLog:wl}; });
}


const H={
  tab(el){ setTab(el.dataset.tab); },
  settings(){ setTab("settings"); },
  modeToggle(){ OS_MODE=(OS_MODE==="health"?"creator":"health"); try{localStorage.setItem("mifu-mode",OS_MODE);}catch(e){}
    if(!modeTabs().includes(state.tab)) state.tab="home";
    modeSwapAnim(); toast(OS_MODE==="health"?"❄️ Health OS":"🎀 Creator OS"); render(); },
  sidebarToggle(){
    const sb=document.getElementById("sidebar"); if(!sb)return;
    const wasCollapsed=sb.classList.contains("sb-collapsed");
    sb.classList.toggle("sb-collapsed");
    sb.classList.toggle("sb-user-expanded",wasCollapsed);   // tablet: flag as user-expanded so CSS doesn't auto-collapse
    try{ localStorage.setItem("mifu-sb-col",sb.classList.contains("sb-collapsed")?"1":""); }catch(e){}
  },
  sbMode(el){
    const m=el.dataset.m; if(!m||m===OS_MODE)return;
    H.modeToggle();
  },
  // --- daily briefing + prep assistants ---
  async prepToggle(el){ const d=el.dataset; await prepWrite(d.kind,d.key,c=>({...c,items:c.items.map(i=>i.id===d.v?{...i,done:!i.done}:i)})); },
  async prepAdd(el){ const d=el.dataset; const inp=document.getElementById("prepInput_"+d.key); const t=((inp&&inp.value)||"").trim(); if(!t)return;
    await prepWrite(d.kind,d.key,c=>({...c,items:[...c.items,{id:"pp"+Date.now(),text:t,done:false}]})); },
  async prepAddChip(el){ const d=el.dataset; if(!d.t)return;
    await prepWrite(d.kind,d.key,c=>c.items.some(i=>i.text===d.t)?c:{...c,items:[...c.items,{id:"pp"+Date.now(),text:d.t,done:false}]}); },
  async prepDel(el){ const d=el.dataset; await prepWrite(d.kind,d.key,c=>({...c,items:c.items.filter(i=>i.id!==d.v)})); },
  async bdaySkip(el){ await prepWrite("bday",el.dataset.key,c=>({...c,skipped:true})); toast("skipped — no guilt, ever 💗"); },
  refreshAllCommunityPulse(){ refreshAllCommunityPulse(); },
  refreshCommunityPulse(el){ refreshCommunityPulse(el.dataset.id); },
  refreshGachaEvents(){ refreshGachaEvents(); },
  gachaWeekOffset(el){ state.gachaWeekOffset=Number(el.dataset.v); render(); },
  toggleEvChecked(el){ if(window._toggleEvChecked) window._toggleEvChecked(el.dataset.id); },
  exportBackup(){ exportBackup(); },
  restoreFromBackupInput(el){ restoreFromBackup(el); },
  kikoSeedAsk(el){ H.openKikoChatPanel(); const inp=kikoInputEl(); if(inp){ inp.value=el.dataset.seed||""; try{inp.focus();}catch(_){} } if(el.dataset.gameid) KIKO.pendingGameSave=el.dataset.gameid; },
  // --- 🏠 home check-ins + suggested focus ---
  async ciToggle(el){ const k=el.dataset.k; if(!k)return;
    const on=!(((state.today||{}).checkins||{})[k]);
    await setToday(n=>({...n,checkins:{...(n.checkins||{}),[k]:on}}));
    await setSent(n=>{ const log={...(n.checkinLog||{})}; let arr=(log[k]||[]).slice();
      if(on){ if(!arr.includes(TODAY))arr.push(TODAY); } else arr=arr.filter(d=>d!==TODAY);
      log[k]=arr.slice(-30); return {...n,checkinLog:log}; });
    if(k==="madeArt"&&on) await setSent(n=>{ const log=(n.artLog||[]).slice(); if(!log.some(x=>x.date===TODAY))log.push({date:TODAY,note:""}); return {...n,artLog:log.slice(-200)}; });
    if(k==="medsAM"||k==="medsPM"){ const part=k==="medsAM"?"am":"pm"; const ids=medsByPeriod(part).map(m=>m.id);
      await setToday(n=>{ const mt={...(n.medsTaken||{})}; ids.forEach(id=>mt[id]=on);   // tick/untick that period's meds
        return {...n,meds:{...(n.meds||{}),[part]:on},medsTaken:mt}; }); }
    if(k==="water"){ await setToday(n=>{ const mounjaro={...(n.mounjaro||{})};
        if(on) mounjaro.water=Math.max(mounjaro.water||0,CUPS_PER_40OZ);   // "drank water" = at least half her daily (1×40oz)
        const mt={...(n.medsTaken||{})};
        (state.sentinel.medsList||[]).forEach(m=>{ if(WATER_SUPP_NAMES.some(s=>String(m.name||"").toLowerCase().includes(s))) mt[m.id]=on; });   // her morning supplements ride with the first drink
        return {...n,mounjaro,medsTaken:mt}; }); }
    if(k==="sleep") await setToday(n=>({...n,sleep:on?8:0}));   // "slept well" = log 8h on the chart
    // celebrate when the off-stream work set is freshly completed
    if(on && OFFSTREAM_WORK.some(w=>w[0]===k) && offStreamAllDone()){ toast("off-stream prep done — amazing! 🎉"); popConfetti(el.closest('.panel')); }
    else if(on) toast("checked in ✨");
    render(); },
  async streamPrepToggle(el){ const k=el.dataset.k; if(!k)return;
    const on=!((state.today.streamPrep||{})[k]);
    await setToday(n=>({...n,streamPrep:{...(n.streamPrep||{}),[k]:on}}));
    if(on && streamPrepAllDone()){ toast("stream prep complete — go get 'em! 🎉"); popConfetti(el.closest('.panel')); setLayout(state.tab,L=>{ delete L.min["contentops"]; }); }
    render(); },
  // --- edit stream-prep + off-stream lists (add/remove, saved to the account) ---
  spEdit(){ state.spEdit=!state.spEdit; render(); },
  async addStreamPrep(){ const inp=$("#spInput"); const t=((inp&&inp.value)||"").trim(); if(!t)return; state.spDraft=null;
    await setSent(n=>{ const l=(Array.isArray(n.streamPrepList)&&n.streamPrepList.length)?n.streamPrepList.slice():STREAM_PREP_DEFAULT.slice(); l.push({id:"sp"+Date.now(),em:"📝",text:t}); return {...n,streamPrepList:l}; }); toast("prep step added 🎬"); render(); },
  async delStreamPrep(el){ const id=el.dataset.v; const inp=$("#spInput"); if(inp) state.spDraft=inp.value;
    await setSent(n=>{ let l=(Array.isArray(n.streamPrepList)&&n.streamPrepList.length)?n.streamPrepList.slice():STREAM_PREP_DEFAULT.slice(); l=l.filter(p=>p.id!==id); return {...n,streamPrepList:l}; }); render(); },
  async offStreamXToggle(el){ const id=el.dataset.k; if(!id)return; const on=!((state.today.offStreamX||{})[id]);
    await setToday(n=>({...n,offStreamX:{...(n.offStreamX||{}),[id]:on}}));
    if(on && offStreamAllDone()){ toast("off-stream prep done — amazing! 🎉"); popConfetti(el.closest('.panel')); } else if(on) toast("nice work 💜");
    render(); },
  async addOffStream(){ const inp=$("#osInput"); const t=((inp&&inp.value)||"").trim(); if(!t)return; state.osDraft=null;
    await setSent(n=>{ const l=Array.isArray(n.offStreamExtra)?n.offStreamExtra.slice():[]; l.push({id:"os"+Date.now(),text:t}); return {...n,offStreamExtra:l}; }); toast("task added 🌙"); render(); },
  async delOffStream(el){ const id=el.dataset.v; const inp=$("#osInput"); if(inp) state.osDraft=inp.value;
    await setSent(n=>{ const l=(Array.isArray(n.offStreamExtra)?n.offStreamExtra:[]).filter(e=>e.id!==id); return {...n,offStreamExtra:l}; }); render(); },
  memSearch(){ const el=$("#memSearchInput"); state.memQuery=el?String(el.value||"").trim():""; render(); },
  memSearchClear(){ state.memQuery=""; render(); },
  memBunny(){ state.memBunny=!state.memBunny; render(); },
  async memFav(el){ const id=el.dataset.id; if(!id)return;
    if(id.indexOf("md:")===0){ const mid=id.slice(3); await setMedia(arr=>arr.map(m=>m.id===mid?{...m,fav:!m.fav}:m)); render(); return; }   // photo favs live on the media item
    await setSent(n=>{ const set=new Set(n.memFav||[]); set.has(id)?set.delete(id):set.add(id); return {...n,memFav:[...set]}; }); render(); },
  async mediaFav(el){ const id=el.dataset.id; await setMedia(arr=>arr.map(m=>m.id===id?{...m,fav:!m.fav}:m)); render(); },
  async mediaDel(el){ const id=el.dataset.id; await setMedia(arr=>arr.filter(m=>m.id!==id)); toast("removed"); render(); },
  async mediaTag(el){ const id=el.dataset.id, p=el.dataset.p; await setMedia(arr=>arr.map(m=>{ if(m.id!==id)return m; const set=new Set(m.people||[]); set.has(p)?set.delete(p):set.add(p); return {...m,people:[...set]}; })); render(); },
  mediaView(el){ const id=el.dataset.id; const m=(state.media||[]).find(x=>x.id===id); if(!m)return;
    $("#modal").innerHTML=`<div class="modal-bg" data-act="closeModal"><div class="modal" data-act="noop" style="max-width:680px;width:100%;padding:10px"><img src="${esc(m.url)}" alt="${esc(m.caption||'photo')}" style="width:100%;border-radius:12px;display:block;max-height:78vh;object-fit:contain;background:#000">${m.caption?`<p class="soft" style="font-size:12.5px;margin:8px 4px 0">${esc(m.caption)}</p>`:""}<div style="text-align:right;margin-top:6px"><button class="btn" data-act="closeModal">close</button></div></div></div>`; },
  memOpen(el){ const page=el.dataset.page, ref=el.dataset.ref;
    if(page==="journal"&&ref&&/^\d{4}-\d{2}/.test(ref)){ try{ state.jrRef=new Date(ref.slice(0,7)+"-01T00:00"); }catch(_){} }
    const SUB={wins:"studio",streamlore:"studio",sponsors:"studio",ideas:"studio",people:"life",house:"life",mifulore:"life"};   // these moved into hubs
    if(SUB[page]){ if(SUB[page]==="studio")state.studioSub=page; else state.lifeSub=page; setTab(SUB[page]); return; }
    setTab(TABS.some(t2=>t2[0]===page)?page:"journal"); },
  focusGo(el){ const s=el.dataset.seed, t=el.dataset.tab, l=el.dataset.link, c=el.dataset.cat;
    if(c){ try{ setSent(n=>{ const fa={...(n.focusAffinity||{})}; const cur=fa[c]||{n:0}; fa[c]={n:(cur.n||0)+1,last:TODAY}; return {...n,focusAffinity:fa}; }); }catch(e){} }   // learn what she taps
    if(l){ window.open(l,"_blank","noopener"); return; }
    if(s){ H.kikoSeedAsk({dataset:{seed:s}}); return; }
    if(t){ setTab(t); } },
  // --- 🎨 art studio (full suite, ported from Eggie OS) ---
  async artLogToday(){ await setSent(n=>{ const log=(n.artLog||[]).slice(); if(!log.some(a=>a.date===TODAY)) log.push({date:TODAY,note:""}); return {...n,artLog:log.slice(-200)}; }); toast("logged — look at you, making things ✨"); render(); },
  async inspoAdd(){ const t=($("#inspoText")&&$("#inspoText").value||"").trim(); const u=($("#inspoUrl")&&$("#inspoUrl").value||"").trim();
    if(!t&&!u){ toast("give it a word or a link 🌸"); return; } state.inspoDraft=null;
    await setSent(n=>({...n,inspoVault:[...(n.inspoVault||[]),{id:"iv"+Date.now(),kind:u?"link":"idea",text:t,url:u,done:false}].slice(-60)})); toast("saved to the vault ✨"); render(); },
  async inspoDel(el){ const id=el.dataset.v; await setSent(n=>({...n,inspoVault:(n.inspoVault||[]).filter(v=>v.id!==id)})); render(); },
  async inspoDone(el){ const id=el.dataset.v; await setSent(n=>({...n,inspoVault:(n.inspoVault||[]).map(v=>v.id===id?{...v,done:!v.done}:v)})); render(); },
  inspoPick(){ const v=(state.sentinel.inspoVault||[]).filter(x=>!x.done); if(!v.length){ toast("the vault's all tried — go collect more sparks ✨"); return; }
    const pick=v[Math.floor(Math.random()*v.length)]; state.inspoPicked=pick.id; render();
    toast("🦊 this one: "+((pick.text||pick.url||"a reference image").slice(0,60))); },
  artReframe(){ if(!state.art)state.art={}; let r; do{ r=ART_REFRAMES[Math.floor(Math.random()*ART_REFRAMES.length)]; }while(r===state.art.reframe&&ART_REFRAMES.length>1); state.art.reframe=r; render(); },
  artStartNow(){ if(!state.art)state.art={}; if(!state.art.timer)state.art.timer={len:120,round:0,left:120}; state.art.focus=true; if(state.tab!=="art")state.tab="art"; toast("Yes! Go play. Future-you says thank you 💗"); artTimerStart(); },
  artFocusEnter(){ if(!state.art)state.art={}; state.art.focus=true; render(); },
  artFocusExit(){ if(state.art)state.art.focus=false; render(); },
  async artRoll(el){ const sc=el.dataset.scope; const txt=sc==="week"?artRand(ART_WEEKLY):artRand(ART_DAILY); const wk=artMonday(TODAY);
    await setSent(n=>{const c=Object.assign({},n.artChallenge||{}); if(sc==="week"){c.weekRollText=txt;c.weekRollWk=wk;c.weekDoneWk=null;}else{c.dayRollText=txt;c.dayRollDate=TODAY;c.dayDoneDate=null;} return {...n,artChallenge:c};}); render(); },
  async artChallengeDone(el){ const sc=el.dataset.scope; const wk=artMonday(TODAY);
    await setSent(n=>{const c=Object.assign({},n.artChallenge||{}); if(sc==="week")c.weekDoneWk=(c.weekDoneWk===wk)?null:wk; else c.dayDoneDate=(c.dayDoneDate===TODAY)?null:TODAY; return {...n,artChallenge:c};}); render(); },
  async artLogQuick(el){ const m=parseInt(el.dataset.m)||0; if(m)await setSent(n=>({...n,artLog:[...(n.artLog||[]),{date:TODAY,min:m}].slice(-200)})); if(state.art)state.art.pendingLog=null; toast("Logged "+m+" min of play 🎨 proud of you"); render(); },
  async artLogMin(){ const mi=$("#artMin"), ni=$("#artNote"); const m=parseInt(mi&&mi.value)||0; const note=(ni&&ni.value||"").trim(); if(!m){ toast("How many minutes? 🌸"); return; }
    await setSent(n=>({...n,artLog:[...(n.artLog||[]),{date:TODAY,min:m,note:note||undefined}].slice(-200)})); toast("Logged "+m+" min 🎨"); render(); },
  artLogDismiss(){ if(state.art)state.art.pendingLog=null; render(); },
  artPromptRoll(){ if(!state.art)state.art={}; const myIdeas=(state.sentinel.artIdeas||[]); /* ~1 in 3 rolls resurface one of HER parked ideas */
    if(myIdeas.length&&Math.random()<0.34){ const pick=myIdeas[Math.floor(Math.random()*myIdeas.length)]; state.art.prompt={subject:String(pick.text||"").slice(0,90),mood:artRand(ART_MOODS),constraint:artRand(ART_CONSTRAINTS),fromIdea:true}; }
    else state.art.prompt={subject:artRand(ART_SUBJECTS),mood:artRand(ART_MOODS),constraint:artRand(ART_CONSTRAINTS)};
    render(); },
  async artIdeaAdd(){ const i=$("#ideaText"); const t=(i&&i.value||"").trim(); if(!t){ toast("What's the idea? 🌸"); return; }
    await setSent(n=>({...n,artIdeas:[...(n.artIdeas||[]),{id:aid("i"),text:t,added:TODAY}]})); toast("Idea parked 💡"); render(); },
  async artIdeaDel(el){ const id=el.dataset.id; await setSent(n=>({...n,artIdeas:(n.artIdeas||[]).filter(x=>x.id!==id)})); render(); },
  async artIdeaToBoard(el){ const id=el.dataset.id; const idea=(state.sentinel.artIdeas||[]).find(x=>x.id===id); if(!idea)return;
    const ox=30+Math.floor(Math.random()*60), oy=30+Math.floor(Math.random()*50);
    await setSent(n=>({...n,artBoard:[...(n.artBoard||[]),{id:aid("b"),type:"note",text:idea.text,x:ox,y:oy,w:170,h:120}]})); toast("Pinned to the mood board 📌"); render(); },
  artEmotePick(){ const f=$("#emoteFile"); if(f)f.click(); },
  artEmoteClear(){ if(state.art)state.art.emote=null; render(); },
  artNotanPick(){ const f=$("#notanFile"); if(f)f.click(); },
  artNotanClear(){ if(state.art)state.art.notan=null; render(); },
  artNotanSteps(el){ if(!state.art)state.art={}; state.art.notanSteps=parseInt(el.dataset.v)||3; render(); setTimeout(artNotanPaint,80); },
  async artCountInc(){ const cur=(state.sentinel.artCount)||{label:"heads",n:0,goal:100}; const n2=(cur.n||0)+1;
    await setSent(nn=>({...nn,artCount:{...(nn.artCount||{label:"heads",goal:100}),n:((nn.artCount||{}).n||0)+1}}));
    if(n2===(cur.goal||100)) toast("💯 "+n2+" "+cur.label+"!! THE WHOLE CHALLENGE. absolute legend 🎉🦊"); else if(n2%25===0) toast("🎉 "+n2+" "+cur.label+" — that's a real pile of practice 💗"); else if(n2%10===0) toast("✨ "+n2+" down!");
    render(); },
  artCountEdit(){ if(!state.art)state.art={}; state.art.countEdit=!state.art.countEdit; render(); },
  async artCountSave(){ const lb=($("#cnt_label")&&$("#cnt_label").value||"heads").trim().slice(0,30)||"heads"; const gl=Math.max(5,Math.min(1000,parseInt($("#cnt_goal")&&$("#cnt_goal").value)||100));
    await setSent(nn=>({...nn,artCount:{...(nn.artCount||{n:0}),label:lb,goal:gl}})); if(state.art)state.art.countEdit=false; render(); },
  async artCountReset(){ await setSent(nn=>({...nn,artCount:{...(nn.artCount||{label:"heads",goal:100}),n:0}})); if(state.art)state.art.countEdit=false; toast("fresh page — the practice you did still happened 💗"); render(); },
  async l2dToggle(el){ const k=el.dataset.k; const nm=($("#l2dName")&&$("#l2dName").value||"").slice(0,80);
    await setSent(nn=>{ const c2=nn.live2dCheck||{name:"",items:{}}; const it={...(c2.items||{})}; it[k]=!it[k]; return {...nn,live2dCheck:{name:nm||c2.name||"",items:it}}; }); render(); },
  async l2dReset(){ await setSent(nn=>({...nn,live2dCheck:{name:"",items:{}}})); toast("🧩 fresh checklist for the next model"); render(); },
  async artResPack(){ await setSent(nn=>{ const cur=(nn.artResources&&nn.artResources.length)?nn.artResources.slice():DEFAULT_ART_RES.slice(); const add=ART_PACK.filter(p=>!cur.some(r=>r.url===p.url)).map(p=>({id:aid("r"),...p})); return {...nn,artResources:[...cur,...add]}; }); toast("🌟 research pack added — every link verified alive + free 💗"); render(); },
  async artResAdd(){ const ti=$("#artResTitle"), ui=$("#artResUrl"), tg=$("#artResTag"); const title=(ti&&ti.value||"").trim(), url=(ui&&ui.value||"").trim(); if(!title||!url){ toast("Need a title and a link 🌸"); return; }
    await setSent(n=>({...n,artResources:[...((n.artResources)||DEFAULT_ART_RES),{id:aid("r"),title,url,tag:(tg&&tg.value)||"other"}]})); render(); },
  async artResDel(el){ const id=el.dataset.id; await setSent(n=>({...n,artResources:((n.artResources)||DEFAULT_ART_RES).filter(x=>x.id!==id)})); render(); },
  artPaletteRoll(){ if(!state.art)state.art={}; state.art.pBase=randHex(); render(); },
  artPaletteScheme(el){ if(!state.art)state.art={}; state.art.pScheme=el.dataset.v; render(); },
  artLimited(){ if(!state.art)state.art={}; state.art.limited=[randHex(),randHex(),randHex()]; render(); },
  artTimerLen(el){ if(!state.art)state.art={}; const t=state.art.timer=state.art.timer||{round:0}; t.len=parseInt(el.dataset.v)||60; t.left=t.len; render(); },
  artTimerStart(){ artTimerStart(); },
  artTimerStop(){ artTimerStop(); },
  artTimerSkip(){ artTimerSkip(); },
  artGRatio(el){ if(!state.art)state.art={}; state.art.gRatio=el.dataset.v; render(); },
  artGOrient(){ if(!state.art)state.art={}; state.art.gOrient=((state.art.gOrient||0)+1)%4; render(); },
  artGridDownload(){ const s=document.getElementById("artGridSvg"); if(s){ const blob=new Blob([s.outerHTML],{type:"image/svg+xml"}); const u=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=u; a.download="guide-"+((state.art&&state.art.gType)||"thirds")+".svg"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),1000); toast("Guide saved 🎨"); } },
  async mbAddImage(){ const i=$("#mbImgUrl"); const u=(i&&i.value||"").trim(); if(!u){ toast("Paste an image URL 🌸"); return; } const ox=24+Math.floor(Math.random()*60), oy=24+Math.floor(Math.random()*50);
    await setSent(n=>({...n,artBoard:[...(n.artBoard||[]),{id:aid("b"),type:"img",url:u,x:ox,y:oy,w:180,h:180}]})); render(); },
  async mbAddNote(){ const ox=30+Math.floor(Math.random()*60), oy=30+Math.floor(Math.random()*50);
    await setSent(n=>({...n,artBoard:[...(n.artBoard||[]),{id:aid("b"),type:"note",text:"",x:ox,y:oy,w:170,h:120}]})); render(); },
  async mbAddColor(){ const col=(state.art&&state.art.pBase)||randHex(); const ox=40+Math.floor(Math.random()*60), oy=40+Math.floor(Math.random()*50);
    await setSent(n=>({...n,artBoard:[...(n.artBoard||[]),{id:aid("b"),type:"swatch",color:col,x:ox,y:oy,w:92,h:92}]})); render(); },
  async mbDel(el){ const id=el.dataset.id; await setSent(n=>({...n,artBoard:(n.artBoard||[]).filter(c=>c.id!==id)})); render(); },
  mbUpload(){ const f=$("#mbFile"); if(f){ f.value=""; f.click(); } },
  async mbExport(){ try{ await exportMoodBoardPNG(); }catch(e){ toast("Export hiccuped 🌸"); } },
  mbMax(){ if(!state.art)state.art={}; state.art.boardMax=!state.art.boardMax; render(); },
  copyHex(el){ const t=el.dataset.t||""; if(t&&navigator.clipboard)navigator.clipboard.writeText(t).catch(()=>{}); toast("copied "+t+" 📋"); },
  // --- 🧰 toolbox (capture-before-render, like the script tab) ---
  tbSpice(el){ tbCapture(); state.tb.spice=Number(el.dataset.v)||3; render(); },
  tbClear(){ tbCapture(); state.tb.steps=null; render(); },
  async tbBreak(){ tbCapture(); const t=(state.tb.task||"").trim(); if(!t){ toast("type the task first 🌶️"); return; }
    if(DEMO||!SB){ toast("needs live mode ❄️"); return; }
    state.tb.busy="break"; render();
    try{ const d=await aiCall("toolbox",{op:"breakdown",task:t,spice:state.tb.spice}); state.tb.steps=(d&&Array.isArray(d.steps))?d.steps:null; if(d&&d.error)toast(d.error); }
    catch(e){ toast("hiccup — try again 🌧️"); } state.tb.busy=""; render(); },
  async tbBreakStep(el){ tbCapture(); const i=Number(el.dataset.i); const s=(state.tb.steps||[])[i]; if(s==null)return;
    if(DEMO||!SB){ toast("needs live mode ❄️"); return; }
    state.tb.busy="break"; render();
    try{ const d=await aiCall("toolbox",{op:"breakdown",task:tbStepText(s),spice:Math.min(5,(state.tb.spice||3)+1),context:"a sub-step of: "+state.tb.task});
      if(d&&Array.isArray(d.steps)){ const st=state.tb.steps.slice(); st.splice(i,1,...d.steps); state.tb.steps=st; } }
    catch(e){ toast("hiccup 🌧️"); } state.tb.busy=""; render(); },
  async tbStepsToPlanner(){ const steps=(state.tb&&state.tb.steps)||[]; if(!steps.length)return;
    const main=(state.tb.task||"task").slice(0,80);
    await setSent(n=>({...n,tasks:[...(n.tasks||[]),{id:"t"+Date.now(),text:main,bucket:"personal",energy:"medium",priority:"medium",done:false,status:"todo",sub:steps.map((s,i)=>({id:"s"+Date.now()+i,text:tbStepText(s).slice(0,140),done:false}))}]}));
    toast("in the planner, broken down 🗒️✨"); render(); },
  async tbTone(){ tbCapture(); const t=(state.tb.tText||"").trim(); if(!t){ toast("paste the message first 🌸"); return; }
    if(DEMO||!SB){ toast("needs live mode ❄️"); return; }
    state.tb.busy="tone"; render();
    try{ const d=await aiCall("toolbox",{op:"tone",text:t}); state.tb.tOut=(d&&d.read)?d:null; if(d&&d.error)toast(d.error); }
    catch(e){ toast("hiccup 🌧️"); } state.tb.busy=""; render(); },
  async tbFormal(){ tbCapture(); const t=(state.tb.fText||"").trim(); if(!t){ toast("paste some words first 🪄"); return; }
    if(DEMO||!SB){ toast("needs live mode ❄️"); return; }
    state.tb.busy="formal"; render();
    try{ const d=await aiCall("toolbox",{op:"formalize",text:t,tone:state.tb.fTone}); state.tb.fOut=(d&&d.text)||""; if(d&&d.error)toast(d.error); }
    catch(e){ toast("hiccup 🌧️"); } state.tb.busy=""; render(); },
  tbCopyF(){ if(state.tb&&state.tb.fOut&&navigator.clipboard) navigator.clipboard.writeText(state.tb.fOut); toast("copied 📋"); },
  async tbEstimate(){ tbCapture(); const t=(state.tb.eTask||"").trim(); if(!t){ toast("name the task ⏱️"); return; }
    if(DEMO||!SB){ toast("needs live mode ❄️"); return; }
    state.tb.busy="est"; render();
    try{ const d=await aiCall("toolbox",{op:"estimate",task:t}); state.tb.eOut=(d&&(d.likely||d.estimate))?d:null; if(d&&d.error)toast(d.error); }
    catch(e){ toast("hiccup 🌧️"); } state.tb.busy=""; render(); },
  async tbCompile(){ tbCapture(); const t=(state.tb.cText||"").trim(); if(!t){ toast("pour the brain out first 🧠"); return; }
    if(DEMO||!SB){ toast("needs live mode ❄️"); return; }
    state.tb.busy="compile"; render();
    try{ const d=await aiCall("toolbox",{op:"compile",text:t}); state.tb.groups=(d&&d.groups)||null; if(d&&d.error)toast(d.error); }
    catch(e){ toast("hiccup 🌧️"); } state.tb.busy=""; render(); },
  async tbGroupToPlanner(el){ const g=((state.tb&&state.tb.groups)||[])[Number(el.dataset.i)]; if(!g||!(g.items||[]).length)return;
    await setSent(n=>({...n,tasks:[...(n.tasks||[]),...g.items.map((it,i)=>({id:"t"+Date.now()+i,text:String(it).slice(0,140),bucket:"personal",energy:"medium",priority:"medium",done:false,status:"todo",sub:[]}))]}));
    toast("“"+g.title+"” → planner 🗒️"); render(); },
  // --- 📓 journal page ---
  jrShift(el){ const d=Number(el.dataset.d)||0; state.jrRef=new Date(state.jrRef.getFullYear(),state.jrRef.getMonth()+d,1); render(); },
  jrToday(){ const t=new Date(); state.jrRef=new Date(t.getFullYear(),t.getMonth(),1); render(); },
  jrJump(el){ const ym=el.dataset.ym; state.jrRef=new Date(ym+"-01T00:00"); render(); window.scrollTo({top:0,behavior:"smooth"}); },
  async jrLoadAll(){ toast("gathering your archive… 📚"); await jrFetchAll(); render(); },
  async jrOpenDay(el){ const date=el.dataset.date||(el.closest("[data-date]")&&el.closest("[data-date]").dataset.date); if(!date)return; await jrEntryModal(date); },
  jrPick(el){ const date=el.dataset.date||(el.closest("[data-date]")&&el.closest("[data-date]").dataset.date); if(!date||date>TODAY)return;
    state.jrDay=date; const ym=date.slice(0,7); if(!state.jrRef||jrYM(state.jrRef)!==ym) state.jrRef=new Date(ym+"-01T00:00");
    try{ window.scrollTo({top:0,behavior:"smooth"}); }catch(e){} render(); },
  jrAssetMonthPick(el){ state.jrAssetMonth=el.value||null; render(); },
  async jrUploadAsset(el){
    const files=el.files; if(!files||!files.length) return;
    const type=el.dataset.type||'stickers';
    const listKey=type==='stickers'?'jrStickers':type==='washi'?'jrWashi':'jrPhotos';
    const ym=(state.jrRef?jrYM(state.jrRef):(TODAY.slice(0,7)));
    toast("Uploading… ✨"); let added=0;
    for(const file of files){
      try{
        const path=`jr-assets/${type}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
        const {data,error}=await SB.storage.from('mifu-assets').upload(path,file,{upsert:false});
        if(error) throw error;
        const {data:pub}=SB.storage.from('mifu-assets').getPublicUrl(path);
        const arr=state.sentinel[listKey]||[];
        arr.push({url:pub.publicUrl,name:file.name,month:ym,added:TODAY});
        state.sentinel[listKey]=arr; added++;
      }catch(e){ toast("Upload failed: "+e.message+" 🌧️"); }
    }
    if(added){ await saveSentinel(); toast(`${added} file${added>1?'s':''} added! 🌸`); render(); }
  },
  jrMic(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ toast("voice needs Chrome or Edge 🌸"); return; }
    const setBtn=t=>{ const b=document.querySelector('[data-act="jrMic"]'); if(b){ b.textContent=t; b.classList.toggle("btn-grad",state._jrMic); } };
    if(state._jrMic){ state._jrMic=false; try{state._jrRec&&state._jrRec.stop();}catch(e){} setBtn("🎤 Speak"); return; }
    const ta=$("#jrPageText"); if(!ta)return;
    let rec; try{ rec=new SR(); }catch(e){ toast("couldn't start the mic 🌸"); return; }
    state._jrRec=rec; rec.lang="en-US"; rec.continuous=true; rec.interimResults=true;
    const base=ta.value; let fin="";
    rec.onresult=e=>{ let interim=""; for(let i=e.resultIndex;i<e.results.length;i++){ const t=e.results[i][0].transcript; if(e.results[i].isFinal)fin+=t+" "; else interim+=t; }
      const t2=$("#jrPageText"); if(t2){ t2.value=(base+(base&&!/\s$/.test(base)?" ":"")+fin+interim).trim(); t2.dispatchEvent(new Event("input")); } };
    rec.onend=()=>{ state._jrMic=false; setBtn("🎤 Speak"); const t2=$("#jrPageText"); if(t2)t2.dispatchEvent(new Event("input")); };
    rec.onerror=()=>{ state._jrMic=false; setBtn("🎤 Speak"); };
    state._jrMic=true; setBtn("⏹ listening…"); try{ rec.start(); }catch(e){ state._jrMic=false; setBtn("🎤 Speak"); } },
  async jrSave(el){ const date=el.dataset.date;
    const sv=id=>{ const b=document.querySelector(`[data-jrscale="${id}"].on`); return b?Number(b.dataset.v):null; };
    const num=id=>{ const e2=$("#"+id); const v=e2&&e2.value!==""?parseFloat(e2.value):null; return (v==null||isNaN(v))?null:v; };
    const mood=sv("mood"),energy=sv("energy"),stress=sv("stress"),sleepQ=sv("sleepQ"),fn=sv("foodnoise"),cr=sv("cravings");
    const sleep=num("jrSleep"), w=num("jrWeight");
    const tags=(($("#jrTags")&&$("#jrTags").value)||"").split(",").map(t=>t.trim()).filter(Boolean).slice(0,8);
    const special=!!($("#jrSpecial")&&$("#jrSpecial").checked);
    const text=($("#jrText")&&$("#jrText").value)||"";
    await setDay(date,n=>{ const out={...n};
      const mind={...(n.mind||{})}; if(mood!=null)mind.mood=mood; if(energy!=null)mind.energy=energy; out.mind=mind;
      const mj={...(n.mounjaro||{})}; if(fn!=null)mj.foodnoise=fn; out.mounjaro=mj;
      const p2={...(n.pcos||{})}; if(cr!=null)p2.cravings=cr; out.pcos=p2;
      if(stress!=null)out.stress=stress; if(sleepQ!=null)out.sleepQ=sleepQ; if(sleep!=null)out.sleep=sleep;
      out.tags=tags; out.special=special; out.journal=text;
      return out; });
    if(w!=null){ await setSent(n=>{ const wl=(n.weightLog||[]).slice(); const i=wl.findIndex(x=>x.date===date);
      if(i>=0)wl[i]={...wl[i],w,date}; else wl.push({date,w}); wl.sort(cmpDate); return {...n,weightLog:wl}; }); }
    $("#modal").innerHTML=""; toast("day saved 📓💗"); render(); },
  async jrSearch(){ const q=(($("#jrQ")&&$("#jrQ").value)||"").toLowerCase().trim();
    const mood=($("#jrMood")&&$("#jrMood").value)||""; const stream=!!($("#jrStream")&&$("#jrStream").checked); const sym=!!($("#jrSym")&&$("#jrSym").checked);
    if(!q&&!mood&&!stream&&!sym){ state.jrSearch={results:null}; render(); return; }
    toast("searching… 🔎"); const all=await jrFetchAll();
    const results=Object.entries(all).map(([date,n])=>({date,n})).filter(({date,n})=>{
      if(q){ const hay=((n.journal||"")+" "+((n.tags||[]).join(" "))).toLowerCase(); if(!hay.includes(q))return false; }
      const mo=n.mind&&n.mind.mood;
      if(mood==="low"&&!(mo!=null&&mo<=2))return false;
      if(mood==="mid"&&mo!==3)return false;
      if(mood==="high"&&!(mo!=null&&mo>=4))return false;
      if(stream&&!jrStreamDay(date))return false;
      if(sym&&!jrSymptomFlag(n))return false;
      return true; })
      .sort((a,b)=>a.date<b.date?1:-1)
      .map(({date,n})=>({date,meta:`${n.mind&&n.mind.mood!=null?JR_MOODS[Math.max(0,Math.min(5,n.mind.mood))]+" ":""}${n.journal?"📝 ":""}${(n.tags||[]).slice(0,3).map(t=>"#"+esc(t)).join(" ")}`}));
    state.jrSearch={q,mood,stream,sym,results}; render(); },
  async jrCapsule(el){ const cym=el.dataset.ym; if(DEMO||!SB){ toast("capsules need live mode ❄️"); return; }
    toast("Kiko is folding that month into a capsule… 💊");
    const rows=await jrFetchMonth(new Date(cym+"-01T00:00"));
    const lines=Object.entries(rows).sort((a,b)=>a[0]<b[0]?-1:1).map(([d,n])=>{ const m=n.mind||{},mj=n.mounjaro||{},p2=n.pcos||{}; const parts=[];
      if(m.mood!=null)parts.push("mood "+m.mood); if(m.energy!=null)parts.push("energy "+m.energy); if(n.stress!=null)parts.push("stress "+n.stress);
      if(n.sleep!=null)parts.push("sleep "+n.sleep+"h"); if(mj.nausea!=null)parts.push("nausea "+mj.nausea); if(p2.cravings!=null)parts.push("cravings "+p2.cravings);
      if((n.tags||[]).length)parts.push("tags["+n.tags.join("/")+"]"); if(n.special)parts.push("special💜");
      return parts.length?d+": "+parts.join(", "):null; }).filter(Boolean).join("\n");
    const wm=jrWeightMap(); const ws=Object.keys(wm).filter(d=>d.startsWith(cym)).sort();
    const quotes=[Object.entries(rows).filter(([d,n])=>n.journal).slice(-10).map(([d,n])=>d+': "'+String(n.journal).replace(/\s+/g," ").slice(0,160)+'"').join("\n"),
      (state.sentinel.journalEntries||[]).filter(e=>e.date&&e.date.startsWith(cym)&&e.text).slice(-4).map(e=>e.date+': "'+String(e.text).replace(/\s+/g," ").slice(0,160)+'"').join("\n")].filter(Boolean).join("\n");
    const events=(state.sentinel.calendarEvents||[]).filter(e=>e.date&&e.date.startsWith(cym)).map(e=>e.date+" "+e.title).slice(0,20).join("; ");
    try{ const d=await aiCall("capsule",{ym:cym,lines:lines+(ws.length>1?`\nWEIGHT over month: ${wm[ws[0]]}→${wm[ws[ws.length-1]]}${CONFIG.weightUnit}`:""),quotes,events});
      if(d&&d.capsule){ await setSent(n=>({...n,memoryCapsules:{...(n.memoryCapsules||{}),[cym]:{text:d.capsule,builtAt:TODAY}}})); toast("capsule ready 💊✨"); render(); }
      else toast((d&&d.error)||"capsule hiccup 🌧️");
    }catch(e){ toast("capsule hiccup — try again 🌧️"); } },

  async energySet(el){ await setToday(n=>({...n,energy:Number(el.dataset.v)})); render(); },

  async mindSet(el){ const f=el.dataset.f,v=Number(el.dataset.v);
    await setToday(n=>{ const mind={...(n.mind||{})}; mind[f]=v; return {...n,mind}; }); toast("saved 💗"); render(); },
  async mindToggle(el){ const f=el.dataset.f;
    await setToday(n=>{ const mind={...(n.mind||{})}; mind[f]=!mind[f]; return {...n,mind}; }); render(); },

  async pcosSet(el){ const f=el.dataset.f,raw=el.dataset.v,v=isNaN(Number(raw))?raw:Number(raw);
    await setToday(n=>{ const pcos={...(n.pcos||{})}; pcos[f]=v; const ex={}; if(f==="flow")ex.flow=raw; return {...n,pcos,...ex}; }); toast("saved 💗"); render(); },
  async pcosToggle(el){ const f=el.dataset.f;
    await setToday(n=>{ const pcos={...(n.pcos||{})}; pcos[f]=!pcos[f]; return {...n,pcos}; }); render(); },

  /* --- daily habits + gacha dailies --- */
  async habitToggle(el){ const id=el.dataset.v;
    const hi=$("#habitInput"); if(hi) state.habitDraft={text:hi.value,energy:($("#habitEnergy")||{}).value||"med"};   // keep a half-typed new habit
    const willOn=!((state.today.habits||{})[id]);
    await setToday(n=>{ const habits={...(n.habits||{})}; const nv=!habits[id]; habits[id]=nv;
      const ex={}; if(id==="h_meds") ex.meds={am:nv,pm:nv};   // keep the Food AM/PM meds boxes in sync
      return {...n,habits,...ex}; });
    if(willOn){ const l=habitsList(), c=state.today.habits||{}; if(l.length&&l.every(h=>c[h.id])){ toast("all habits done — proud of you! 🎉"); popConfetti(el.closest('.panel')); } }
    render(); },
  habitEdit(){ state.habitEdit=!state.habitEdit; render(); },
  async addHabitUI(){ const inp=$("#habitInput"); const t=((inp&&inp.value)||"").trim(); if(!t)return;
    const en=($("#habitEnergy")&&$("#habitEnergy").value)||"med";
    state.habitDraft=null;
    await setSent(n=>{ const l=(Array.isArray(n.habitsList)&&n.habitsList.length)?n.habitsList.slice():HABITS_DEFAULT.slice();
      l.push({id:"h"+Date.now(),text:t,energy:en}); return {...n,habitsList:l}; }); toast("habit added 🌱"); render(); },
  async delHabit(el){ const id=el.dataset.v;
    const hi=$("#habitInput"); if(hi) state.habitDraft={text:hi.value,energy:($("#habitEnergy")||{}).value||"med"};
    await setSent(n=>{ let l=(Array.isArray(n.habitsList)&&n.habitsList.length)?n.habitsList.slice():HABITS_DEFAULT.slice();
      l=l.filter(h=>h.id!==id); return {...n,habitsList:l}; }); render(); },
  /* --- creator daily goals (separate list, same energy-tagged shape) --- */
  async cgoalToggle(el){ const id=el.dataset.v;
    const ci=$("#cgoalInput"); if(ci) state.cgoalDraft={text:ci.value,energy:($("#cgoalEnergy")||{}).value||"med"};
    const willOn=!((state.today.cgoals||{})[id]);
    await setToday(n=>({...n,cgoals:{...(n.cgoals||{}),[id]:!(n.cgoals||{})[id]}}));
    if(willOn){ const l=cgoalsList(), c=state.today.cgoals||{}; if(l.length&&l.every(h=>c[h.id])){ toast("all goals done — amazing! 🎉"); popConfetti(el.closest('.panel')); } }
    render(); },
  /* --- Creator growth checklist --- */
  async cgrowthToggle(el){ const id=el.dataset.v;
    const gi=$("#cgrowthInput"); if(gi) state.cgrowthDraft={text:gi.value,energy:($("#cgrowthEnergy")||{}).value||"med"};
    const willOn=!((state.today.cgrowth||{})[id]);
    await setToday(n=>({...n,cgrowth:{...(n.cgrowth||{}),[id]:!(n.cgrowth||{})[id]}}));
    if(willOn){ const l=cgrowthList(), c=state.today.cgrowth||{}; if(l.length&&l.every(h=>c[h.id])){ toast("you put yourself out there — proud of you! 🎉"); popConfetti(el.closest('.panel')); } }
    render(); },
  cgrowthEdit(){ state.cgrowthEdit=!state.cgrowthEdit; render(); },
  async addCgrowthUI(){ const inp=$("#cgrowthInput"); const t=((inp&&inp.value)||"").trim(); if(!t)return;
    const en=($("#cgrowthEnergy")&&$("#cgrowthEnergy").value)||"med"; state.cgrowthDraft=null;
    await setSent(n=>{ const l=(Array.isArray(n.cgrowthList)&&n.cgrowthList.length)?n.cgrowthList.slice():CGROWTH_DEFAULT.slice(); l.push({id:"cgr"+Date.now(),text:t,energy:en}); return {...n,cgrowthList:l}; }); toast("growth action added 🌱"); render(); },
  async delCgrowth(el){ const id=el.dataset.v; const gi=$("#cgrowthInput"); if(gi) state.cgrowthDraft={text:gi.value,energy:($("#cgrowthEnergy")||{}).value||"med"};
    await setSent(n=>{ let l=(Array.isArray(n.cgrowthList)&&n.cgrowthList.length)?n.cgrowthList.slice():CGROWTH_DEFAULT.slice(); l=l.filter(h=>h.id!==id); return {...n,cgrowthList:l}; }); render(); },
  /* --- Creator spark --- */
  sparkNext(){ state.sparkIdx=(state.sparkIdx||0)+1; render(); },
  async sparkSave(){ const ideas=sparkIdeas(); if(!ideas.length)return; const i=(((state.sparkIdx||0)%ideas.length)+ideas.length)%ideas.length; const idea=ideas[i].idea;
    await setSent(n=>{ const l=Array.isArray(n.sparkVault)?n.sparkVault.slice():[]; if(!l.some(x=>x.text===idea)) l.push({id:"sk"+Date.now(),text:idea,date:TODAY}); return {...n,sparkVault:l}; }); toast("saved to your idea vault ✨"); },
  async sparkToGoal(){ const ideas=sparkIdeas(); if(!ideas.length)return; const i=(((state.sparkIdx||0)%ideas.length)+ideas.length)%ideas.length; const idea=ideas[i].idea;
    await setSent(n=>{ const l=(Array.isArray(n.cgoalsList)&&n.cgoalsList.length)?n.cgoalsList.slice():CGOALS_DEFAULT.slice(); l.push({id:"cg"+Date.now(),text:idea.length>60?idea.slice(0,58).trim()+"…":idea,energy:"med"}); return {...n,cgoalsList:l}; }); toast("added to Daily goals 🎯"); render(); },
  cgoalEdit(){ state.cgoalEdit=!state.cgoalEdit; render(); },
  async addCgoalUI(){ const inp=$("#cgoalInput"); const t=((inp&&inp.value)||"").trim(); if(!t)return;
    const en=($("#cgoalEnergy")&&$("#cgoalEnergy").value)||"med"; state.cgoalDraft=null;
    await setSent(n=>{ const l=(Array.isArray(n.cgoalsList)&&n.cgoalsList.length)?n.cgoalsList.slice():CGOALS_DEFAULT.slice();
      l.push({id:"cg"+Date.now(),text:t,energy:en}); return {...n,cgoalsList:l}; }); toast("goal added 🎯"); render(); },
  async delCgoal(el){ const id=el.dataset.v;
    const ci=$("#cgoalInput"); if(ci) state.cgoalDraft={text:ci.value,energy:($("#cgoalEnergy")||{}).value||"med"};
    await setSent(n=>{ let l=(Array.isArray(n.cgoalsList)&&n.cgoalsList.length)?n.cgoalsList.slice():CGOALS_DEFAULT.slice();
      l=l.filter(h=>h.id!==id); return {...n,cgoalsList:l}; }); render(); },
  /* --- weekly habits (personal/home) + weekly goals (creator/work): done-this-week toggles --- */
  async habitWkToggle(el){ const id=el.dataset.v; const wi=$("#habitWkInput"); if(wi) state.habitWkDraft=wi.value;
    const mon=mondayOf(new Date(TODAY+"T00:00")).toLocaleDateString("en-CA");
    await setSent(n=>{ const wk={...(n.habitsWkDone||{})}; if(wk[id]===mon) delete wk[id]; else wk[id]=mon; return {...n,habitsWkDone:wk}; }); render(); },
  async addHabitWk(){ const inp=$("#habitWkInput"); const t=((inp&&inp.value)||"").trim(); if(!t)return; state.habitWkDraft=null;
    await setSent(n=>{ const l=Array.isArray(n.habitsWeekly)?n.habitsWeekly.slice():[]; l.push({id:"hw"+Date.now(),text:t}); return {...n,habitsWeekly:l}; }); toast("weekly added 🧹"); render(); },
  async delHabitWk(el){ const id=el.dataset.v; const wi=$("#habitWkInput"); if(wi) state.habitWkDraft=wi.value;
    await setSent(n=>{ const l=(Array.isArray(n.habitsWeekly)?n.habitsWeekly:[]).filter(h=>h.id!==id); return {...n,habitsWeekly:l}; }); render(); },
  async cgoalWkToggle(el){ const id=el.dataset.v; const wi=$("#cgoalWkInput"); if(wi) state.cgoalWkDraft=wi.value;
    const mon=mondayOf(new Date(TODAY+"T00:00")).toLocaleDateString("en-CA");
    await setSent(n=>{ const wk={...(n.cgoalsWkDone||{})}; if(wk[id]===mon) delete wk[id]; else wk[id]=mon; return {...n,cgoalsWkDone:wk}; }); render(); },
  async addCgoalWk(){ const inp=$("#cgoalWkInput"); const t=((inp&&inp.value)||"").trim(); if(!t)return; state.cgoalWkDraft=null;
    await setSent(n=>{ const l=Array.isArray(n.cgoalsWeekly)?n.cgoalsWeekly.slice():[]; l.push({id:"cw"+Date.now(),text:t}); return {...n,cgoalsWeekly:l}; }); toast("weekly added 🗂"); render(); },
  async delCgoalWk(el){ const id=el.dataset.v; const wi=$("#cgoalWkInput"); if(wi) state.cgoalWkDraft=wi.value;
    await setSent(n=>{ const l=(Array.isArray(n.cgoalsWeekly)?n.cgoalsWeekly:[]).filter(h=>h.id!==id); return {...n,cgoalsWeekly:l}; }); render(); },
  async gachaToggle(el){ const id=el.dataset.v;
    const gi=$("#gachaInput"); if(gi) state.gachaDraft=gi.value;   // keep a half-typed new game
    const willOn=!((state.today.gacha||{})[id]);
    await setToday(n=>{ const gacha={...(n.gacha||{})}; gacha[id]=!gacha[id]; return {...n,gacha}; });
    if(willOn){ const l=gachaList(), c=state.today.gacha||{}; if(l.length&&l.every(g=>c[g.id])){ toast("all dailies cleared — yippee! 🎉"); popConfetti(el.closest('.panel')); } }
    render(); },
  gachaEdit(){ state.gachaEdit=!state.gachaEdit; render(); },
  async addGachaUI(){ const inp=$("#gachaInput"); const t=((inp&&inp.value)||"").trim(); if(!t)return;
    state.gachaDraft=null;
    await setSent(n=>{ const l=(Array.isArray(n.gachaList)&&n.gachaList.length)?n.gachaList.slice():GACHA_DEFAULT.slice();
      l.push({id:"g"+Date.now(),name:t}); return {...n,gachaList:l}; }); toast("game added 🎮"); render(); },
  async delGacha(el){ const id=el.dataset.v;
    const gi=$("#gachaInput"); if(gi) state.gachaDraft=gi.value;
    await setSent(n=>{ let l=(Array.isArray(n.gachaList)&&n.gachaList.length)?n.gachaList.slice():GACHA_DEFAULT.slice();
      l=l.filter(g=>g.id!==id); return {...n,gachaList:l}; }); render(); },
  // --- gacha weeklies (toggle done-this-week) + past-week grid nav ---
  gachaCardMore(el){ const id=el.dataset.gid; if(!state.gachaExpanded)state.gachaExpanded={}; state.gachaExpanded[id]=!state.gachaExpanded[id]; try{layoutHome();}catch(_){} },
  togglePulseExpand(el){ const id=el.dataset.gid; if(!state.pulseExpanded)state.pulseExpanded={}; state.pulseExpanded[id]=!state.pulseExpanded[id]; render(); },
  async gachaWkToggle(el){ const id=el.dataset.v;
    const wi=$("#gachaWkInput"); if(wi) state.gachaWkDraft=wi.value;
    const mon=mondayOf(new Date(TODAY+"T00:00")).toLocaleDateString("en-CA");
    await setSent(n=>{ const wk={...(n.gachaWkDone||{})}; if(wk[id]===mon) delete wk[id]; else wk[id]=mon; return {...n,gachaWkDone:wk}; }); render(); },
  async addGachaWk(){ const inp=$("#gachaWkInput"); const t=((inp&&inp.value)||"").trim(); if(!t)return; state.gachaWkDraft=null;
    await setSent(n=>{ const l=Array.isArray(n.gachaWeeklies)?n.gachaWeeklies.slice():[]; l.push({id:"gw"+Date.now(),name:t}); return {...n,gachaWeeklies:l}; }); toast("weekly added 📅"); render(); },
  async delGachaWk(el){ const id=el.dataset.v;
    const wi=$("#gachaWkInput"); if(wi) state.gachaWkDraft=wi.value;
    await setSent(n=>{ const l=(Array.isArray(n.gachaWeeklies)?n.gachaWeeklies:[]).filter(g=>g.id!==id); return {...n,gachaWeeklies:l}; }); render(); },
  gachaWeek(el){ const d=Number(el.dataset.d)||0; let off=(state.gachaWeek||0)+d; if(off>0)off=0; if(off<-8)off=-8; state.gachaWeek=off; render(); },

  async mjSet(el){ const f=el.dataset.f,v=Number(el.dataset.v);
    await setToday(n=>{ const mounjaro={...(n.mounjaro||{})}; mounjaro[f]=v; return {...n,mounjaro}; }); toast("saved 💗"); render(); },
  async mjToggle(el){ const f=el.dataset.f;
    await setToday(n=>{ const mounjaro={...(n.mounjaro||{})}; mounjaro[f]=!mounjaro[f]; return {...n,mounjaro}; }); render(); },
  async waterCup(el){ const d=Number(el.dataset.v)*CUPS_PER_40OZ;   // ±1 full 40oz cup = ±5 internal cups
    await setToday(n=>{ const mounjaro={...(n.mounjaro||{})}; mounjaro.water=Math.max(0,(mounjaro.water||0)+d); return {...n,mounjaro}; }); render(); },
  async sleepStep(el){ const d=Number(el.dataset.v);
    await setToday(n=>({...n,sleep:Math.max(0,Math.min(14,(n.sleep||0)+d))})); render(); },
  async medToggle(el){ const part=el.dataset.v;   // 'am' | 'pm' — ticks/unticks that period's meds in the list too
    const on=!(((state.today||{}).meds||{})[part]); const ids=medsByPeriod(part).map(m=>m.id);
    await setToday(n=>{ const meds={...(n.meds||{}),[part]:on}; const mt={...(n.medsTaken||{})}; ids.forEach(id=>mt[id]=on);
      const habits={...(n.habits||{}),h_meds:!!(meds.am&&meds.pm)}; return {...n,meds,medsTaken:mt,habits}; }); render(); },
  async medTake(el){ const id=el.dataset.v;   // per-medication daily check-off — keeps Home AM/PM in sync both ways
    const meds=(state.sentinel.medsList||[]), am=medsByPeriod("am"), pm=medsByPeriod("pm");
    await setToday(n=>{ const mt={...(n.medsTaken||{}),[id]:!(n.medsTaken||{})[id]};
      const amDone=am.length>0&&am.every(m=>mt[m.id]); const pmDone=pm.length>0&&pm.every(m=>mt[m.id]);
      const habits={...(n.habits||{}),h_meds:!!(meds.length&&meds.every(m=>mt[m.id]))};
      return {...n,medsTaken:mt,meds:{...(n.meds||{}),am:amDone,pm:pmDone},habits}; }); render(); },

  async saveHelps(){ const t=$("#helpsNote").value; await setSent(n=>({...n,helps:t})); toast("saved 💗"); },

  async cycleStart(){ await setSent(n=>{ const cycle={...(n.cycle||{}),lastStart:TODAY}; cycle.history=[...(cycle.history||[]),{start:TODAY,end:null,flow:(state.today||{}).flow||"med"}]; return {...n,cycle}; }); toast("logged ❄️"); render(); },
  async cycleEnd(){ const c=state.sentinel.cycle; if(!c||!c.history||!c.history.length){ toast("log a start first"); return; }
    await setSent(n=>{ const cycle={...n.cycle}; cycle.history=cycle.history.map((h,i)=>i===cycle.history.length-1?{...h,end:TODAY}:h); return {...n,cycle}; }); toast("logged ❄️"); render(); },
  async delPeriod(el){ const start=el.dataset.start, end=el.dataset.end||"";
    await setSent(n=>{ const c={...(n.cycle||{})}; let h=(c.history||[]).slice(); const i=h.findIndex(x=>x.start===start && (x.end||"")===end); if(i>=0)h.splice(i,1);
      c.history=h; const starts=h.map(x=>x.start).filter(Boolean).sort(); c.lastStart=starts.length?starts[starts.length-1]:null; return {...n,cycle:c}; });
    toast("removed ❄️ (Ctrl+Z to undo)"); render(); },

  pickSite(el){ document.querySelectorAll('#siteRow .sitebtn').forEach(b=>b.classList.remove('on')); el.classList.add('on'); $("#shotSite").value=el.dataset.v; },
  mjAfter(el){ document.querySelectorAll('#afterField .scale button').forEach(b=>b.classList.remove('on')); el.classList.add('on'); },
  async logShot(){ const site=$("#shotSite").value; if(!site){ toast("pick a site first 🦊"); return; }
    const afterEl=document.querySelector('#afterField .scale button.on');
    const shot={ id:"i"+Date.now(), date:$("#shotDate").value||TODAY, time:$("#shotTime").value, dose:Number($("#shotDose").value),
      site, after:afterEl?Number(afterEl.dataset.v):null, note:$("#shotNote").value };
    await setSent(n=>{ const log=[...(n.injectionLog||[]),shot].sort((a,b)=>(a.date+a.time)<(b.date+b.time)?-1:1);
      let dh=n.doseHistory||[]; const cur=dh.slice().sort((a,b)=>a.started<b.started?-1:1).slice(-1)[0];
      if(!cur||cur.dose!==shot.dose) dh=[...dh,{dose:shot.dose,started:shot.date}];
      return {...n,injectionLog:log,doseHistory:dh}; });
    toast("shot logged ❄️"); render(); },
  async delShot(el){ await setSent(n=>({...n,injectionLog:(n.injectionLog||[]).filter(s=>s.id!==el.dataset.v)})); render(); },

  async logWeight(){ const v=parseFloat($("#wInput").value); if(isNaN(v)){ toast("enter a number"); return; }
    state.wDraft=null; await upsertWeightToday({w:v}); toast("logged — trend is the story ❄️"); render(); },
  async setBodyComp(){ const fields={}; let any=false;
    BODYCOMP.forEach(([k])=>{ if(k==="bmi")return; const el=$("#bc_"+k); const v=el?parseFloat(el.value):NaN; if(!isNaN(v)){ fields[k]=v; any=true; } });
    const h=$("#bc_height"); const hv=h?parseFloat(h.value):NaN;
    if(isNaN(hv)&&!any){ toast("enter at least one value"); return; }
    await setSent(n=>{ const out={...n}; if(!isNaN(hv)) out.heightCm=hv;
      const wl=(n.weightLog||[]).slice(); const i=wl.findIndex(x=>x.date===TODAY);
      if(i>=0) wl[i]={...wl[i],...fields,date:TODAY}; else if(Object.keys(fields).length) wl.push({date:TODAY,...fields});
      out.weightLog=wl; return out; });
    toast("saved ❄️"); render(); },
  async withingsConnect(){
    if(DEMO||!SB){ toast("connect to the server first ❄️"); return; }
    try{ const d=await aiCall("withingsAuthUrl",{}); if(d&&d.url){ window.open(d.url,"_blank","noopener"); toast("opening Withings to link your scale… 🔗"); }
      else toast(d&&d.error?d.error:"couldn't start the link — is the server set up?"); }
    catch(e){ toast("couldn't reach the server 🌧️"); } },
  async withingsSync(){
    if(DEMO||!SB){ toast("connect to the server first ❄️"); return; }
    if(WITHINGS_BUSY){ toast("already talking to your scale — one sec ❄️"); return; }
    WITHINGS_BUSY=true; toast("syncing from your scale… ↻");
    try{ const d=await aiCall("withingsSync",{}); if(d&&d.error){ toast(d.error); return; }
      await loadData(); render(); toast(`synced ${d&&d.days||0} day(s) ❄️`); }
    catch(e){ toast("sync hiccup — try again 🌧️"); }
    finally{ WITHINGS_BUSY=false; } },
  async withingsDebug(){
    if(DEMO||!SB){ toast("connect to the server first ❄️"); return; }
    if(WITHINGS_BUSY){ toast("a sync is running — give it a few seconds, then try Diagnose ❄️"); return; }
    const host=$("#withingsDiag"); if(host) host.innerHTML=`<div class="soft-card" style="font-size:12px">${UI.spinner({label:"running diagnostics… ❄️"})}</div>`;
    WITHINGS_BUSY=true;
    try{ const d=await aiCall("withingsDebug",{});
      const steps=(d&&d.steps)||["(no response)"];
      const env=d&&d.env?`<div class="soft" style="font-size:10.5px;margin-top:6px">callback URL the server expects:<br><code style="font-size:10px;word-break:break-all">${esc(d.env.redirectUri||"")}</code><br>this must EXACTLY match the callback URL in your Withings developer app.</div>`:"";
      if(host) host.innerHTML=`<div class="soft-card" style="font-size:12px;line-height:1.6"><b>🔍 Withings diagnostic</b><div style="margin-top:6px">${steps.map(s=>`<div>${esc(s)}</div>`).join("")}</div>${env}</div>`;
    }catch(e){ if(host) host.innerHTML=`<div class="soft-card" style="font-size:12px;color:var(--sakura-deep)">couldn't reach the diagnostic — is the <b>ai</b> function deployed with the latest update? (run update-ai.ps1)</div>`; }
    finally{ WITHINGS_BUSY=false; } },
  // --- weight chart options (keep a half-typed weigh-in across re-renders) ---
  wtMetric(el){ const wi=$("#wInput"); if(wi) state.wDraft=wi.value;
    const k=el.dataset.v; let arr=(state.wtMetrics||["w"]).slice(); if(arr.includes(k)){ if(arr.length>1)arr=arr.filter(x=>x!==k); } else arr.push(k); state.wtMetrics=arr; render(); },
  wtType(el){ const wi=$("#wInput"); if(wi) state.wDraft=wi.value;
    state.wtType=el.dataset.v; try{localStorage.setItem("mifu-wt-type",state.wtType);}catch(e){} render(); },
  wtRange(el){ const wi=$("#wInput"); if(wi) state.wDraft=wi.value;
    state.wtRange=el.dataset.v; render(); },
  // --- food tracking ---
  async foodAnalyze(){ const d=state.foodDraft||(state.foodDraft={image:null,desc:"",est:null});
    const ta=$("#foodDesc"); if(ta)d.desc=ta.value;
    if(!d.image && !(d.desc||"").trim()){ toast("add a photo or description 🍱"); return; }
    if(DEMO||!SB){ toast("connect the ai function first ❄️"); return; }
    state.foodBusy=true; render();
    try{ const r=await aiCall("food",{image:d.image,description:d.desc}); if(r&&r.error){ toast(r.error); } else { d.est=r; } }
    catch(e){ toast("estimate hiccup — try again 🌧️"); }
    state.foodBusy=false; render(); },
  foodClear(){ state.foodDraft={image:null,desc:"",est:null}; render(); },
  async foodLog(){ const g=id=>{const el=$("#"+id);return el?el.value:"";}; const num=v=>{const n=parseFloat(v);return isNaN(n)?0:Math.round(n*10)/10;};
    const item={id:"fd"+Date.now(), name:(g("fe_name")||"food").trim(), serving:g("fe_serving").trim(),
      kcal:Math.round(num(g("fe_kcal"))), protein:num(g("fe_protein")), carbs:num(g("fe_carbs")), fiber:num(g("fe_fiber")), fat:num(g("fe_fat")), time:new Date().toISOString()};
    await setToday(n=>({...n,food:[...(n.food||[]),item]})); state.foodDraft={image:null,desc:"",est:null}; toast("logged 🍽️"); render(); },
  async foodDel(el){ const id=el.dataset.id; await setToday(n=>({...n,food:(n.food||[]).filter(x=>x.id!==id)})); render(); },
  async favSave(el){ const id=el.dataset.id; const x=((state.today||{}).food||[]).find(f=>f.id===id); if(!x){ toast("hmm, couldn't find it"); return; }
    await setSent(n=>{ const faves=(n.foodFaves||[]).slice(); if(faves.some(f=>f.name.toLowerCase()===x.name.toLowerCase())){ return n; }
      faves.push({id:"fav"+Date.now(),name:x.name,serving:x.serving||"",kcal:x.kcal||0,protein:x.protein||0,carbs:x.carbs||0,fiber:x.fiber||0,fat:x.fat||0}); return {...n,foodFaves:faves.slice(-24)}; });
    toast("saved to favorites ⭐"); render(); },
  async favLog(el){ if(el.target&&el.target!==el&&el.target.dataset&&el.target.dataset.act==="favDel")return; const id=el.dataset.id;
    const f=(state.sentinel.foodFaves||[]).find(x=>x.id===id); if(!f)return;
    const item={id:"fd"+Date.now(),name:f.name,serving:f.serving||"",kcal:f.kcal||0,protein:f.protein||0,carbs:f.carbs||0,fiber:f.fiber||0,fat:f.fat||0,time:new Date().toISOString()};
    await setToday(n=>({...n,food:[...(n.food||[]),item]})); toast("logged "+f.name+" 🍽️"); render(); },
  async favDel(el){ const id=el.dataset.id; await setSent(n=>({...n,foodFaves:(n.foodFaves||[]).filter(f=>f.id!==id)})); render(); },
  async foodRelog(el){ const d=el.dataset; const item={id:"fd"+Date.now(),name:d.name||"food",serving:d.serving||"",kcal:Math.round(+d.kcal||0),protein:+d.protein||0,carbs:+d.carbs||0,fiber:+d.fiber||0,fat:+d.fat||0,time:new Date().toISOString()};
    await setToday(n=>({...n,food:[...(n.food||[]),item]})); toast("logged "+item.name+" 🍽️"); render(); },
  async saveFoodTargets(){ const num=id=>{const el=$("#"+id);const n=el?parseFloat(el.value):NaN;return isNaN(n)?null:n;};
    await setSent(n=>({...n,foodTargets:{kcal:num("ft_kcal")||1500,protein:num("ft_protein")||110,fiber:num("ft_fiber")||28}})); toast("targets saved 🎯"); render(); },
  revealNum(){ const wl=(state.sentinel.weightLog||[]).slice().sort(cmpDate); const avg=rollingAvg(wl);
    const slot=$("#numSlot"); if(slot) slot.innerHTML=`<div class="label">Rolling weekly avg</div><div class="bignum">${avg!=null?avg.toFixed(1):'—'} <span class="soft" style="font-size:12px;font-family:var(--sans)">${CONFIG.weightUnit}</span></div>`; },
  async addNSV(){ const t=$("#nsvInput").value.trim(); if(!t)return; await setSent(n=>({...n,nsv:[...(n.nsv||[]),{id:"n"+Date.now(),t,date:TODAY}]})); toast("yay! 🌟"); render(); },
  async delNSV(el){ await setSent(n=>({...n,nsv:(n.nsv||[]).filter(x=>x.id!==el.dataset.v)})); render(); },
  async setMeasure(){ const entry={date:TODAY}; let any=false;
    ["bust","waist","hips","thighs","arms"].forEach(k=>{ const el=$("#meas_"+k); const v=el?parseFloat(el.value):NaN; if(!isNaN(v)){ entry[k]=v; any=true; } });
    if(!any){ toast("enter at least one measurement"); return; }
    await setSent(n=>({...n,measurements:[...(n.measurements||[]),entry]})); toast("saved ❄️"); render(); },

  async breath(){ state.breathOn=!state.breathOn; await render(); if(state.breathOn) startBreath(); else stopBreath(); },
  async bunnyStatus(el){ const bunny=el.dataset.bunny, status=el.dataset.status; if(!bunny||!status)return;
    await setSent(n=>upsertBunnyDay(n,bunny,{status})); render(); },
  async bunnyFlag(el){ const bunny=el.dataset.bunny, field=el.dataset.field, val=el.dataset.val; if(!bunny||!field)return;
    await setSent(n=>{ const cur=(n.bunnyLog||[]).find(x=>x.bunny===bunny&&x.date===TODAY); const off=cur&&cur[field]===val; return upsertBunnyDay(n,bunny,{[field]:off?null:val}); }); render(); },
  async bunnyMilestone(){ const b=$("#mileBunny"), t=$("#mileText"); const text=t?String(t.value||"").trim():""; if(!text)return;
    await setSent(n=>({...n,bunnyMilestones:[...(n.bunnyMilestones||[]),{id:"bm"+Date.now(),date:TODAY,bunny:(b&&b.value)||"both",text:text.slice(0,200)}].slice(-200)})); toast("saved 🐰💗"); render(); },
  async bunnyMileDel(el){ const id=el.dataset.id; await setSent(n=>({...n,bunnyMilestones:(n.bunnyMilestones||[]).filter(x=>x.id!==id)})); render(); },
  async winAdd(){ const t=$("#winTitle"), c=$("#winCat"), w=$("#winWhy"); const title=t?String(t.value||"").trim():""; if(!title)return;
    await setSent(n=>({...n,wins:[...(n.wins||[]),{id:"win"+Date.now(),date:TODAY,title:title.slice(0,140),cat:(c&&c.value)||"",why:w?String(w.value||"").trim().slice(0,200):""}].slice(-300)})); toast("logged — that counts 🏆"); render(); },
  async winDel(el){ const id=el.dataset.id; await setSent(n=>({...n,wins:(n.wins||[]).filter(x=>x.id!==id)})); render(); },
  async loreAdd(){ const t=$("#loreTitle"); const title=t?String(t.value||"").trim():""; if(!title)return; const g=$("#loreGame"),s=$("#loreSummary"),w=$("#loreWhy"),tg=$("#loreTags");
    const tags=tg?String(tg.value||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,8):[];
    await setSent(n=>({...n,streamLore:[...(n.streamLore||[]),{id:"lore"+Date.now(),date:TODAY,title:title.slice(0,140),game:g?g.value.trim().slice(0,60):"",summary:s?s.value.trim().slice(0,400):"",why:w?w.value.trim().slice(0,200):"",tags}].slice(-300)})); toast("saved to lore 📜"); render(); },
  async loreDel(el){ const id=el.dataset.id; await setSent(n=>({...n,streamLore:(n.streamLore||[]).filter(x=>x.id!==id)})); render(); },
  async sponsorAdd(){ const t=$("#spName"); const name=t?String(t.value||"").trim():""; if(!name)return; const g=$("#spGame"),r=$("#spRate"),d=$("#spDeadline"),nt=$("#spNote");
    await setSent(n=>({...n,sponsors:[...(n.sponsors||[]),{id:"sp"+Date.now(),date:TODAY,lastContact:TODAY,name:name.slice(0,80),game:g?g.value.trim().slice(0,60):"",rate:r?r.value.trim().slice(0,40):"",deadline:d?d.value:"",notes:nt?nt.value.trim().slice(0,200):"",status:"lead"}].slice(-200)})); toast("added 🤝"); render(); },
  async sponsorStatus(el){ const id=el.dataset.id; await setSent(n=>({...n,sponsors:(n.sponsors||[]).map(s=>{ if(s.id!==id)return s; const i=SPONSOR_STATUS.indexOf(s.status||"lead"); return {...s,status:SPONSOR_STATUS[(i+1)%SPONSOR_STATUS.length],lastContact:TODAY}; })})); render(); },
  async sponsorDel(el){ const id=el.dataset.id; await setSent(n=>({...n,sponsors:(n.sponsors||[]).filter(x=>x.id!==id)})); render(); },
  async ideaAdd(){ const t=$("#ideaTitle"); const title=t?String(t.value||"").trim():""; if(!title)return; const c=$("#ideaCat");
    await setSent(n=>({...n,ideas:[...(n.ideas||[]),{id:"idea"+Date.now(),date:TODAY,title:title.slice(0,140),cat:(c&&c.value)||"",status:"graveyard"}].slice(-400)})); toast("resting safely 🌱"); render(); },
  async ideaStatus(el){ const id=el.dataset.id; await setSent(n=>({...n,ideas:(n.ideas||[]).map(x=>{ if(x.id!==id)return x; const i=IDEA_STATUS.indexOf(x.status||"graveyard"); return {...x,status:IDEA_STATUS[(i+1)%IDEA_STATUS.length]}; })})); render(); },
  async ideaDel(el){ const id=el.dataset.id; await setSent(n=>({...n,ideas:(n.ideas||[]).filter(x=>x.id!==id)})); render(); },
  async personAdd(){ const t=$("#pName"); const name=t?String(t.value||"").trim():""; if(!name)return; const r=$("#pRel"),b=$("#pBday");
    await setSent(n=>({...n,people:[...(n.people||[]),{id:"ppl"+Date.now(),name:name.slice(0,60),rel:r?r.value.trim().slice(0,60):"",birthday:b?b.value:"",gifts:""}].slice(-200)})); toast("planted 🌱"); render(); },
  async personGift(el){ const id=el.dataset.id; const inp=document.getElementById("giftFor_"+id); const v=inp?String(inp.value||"").trim():""; if(!v)return;
    await setSent(n=>({...n,people:(n.people||[]).map(p=>p.id===id?{...p,gifts:((p.gifts?p.gifts+" · ":"")+v).slice(0,200)}:p)})); toast("gift idea saved 🎁"); render(); },
  async personDel(el){ const id=el.dataset.id; await setSent(n=>({...n,people:(n.people||[]).filter(x=>x.id!==id)})); render(); },
  async mifuLoreAdd(){ const t=$("#mlTitle"); const title=t?String(t.value||"").trim():""; if(!title)return; const c=$("#mlCat");
    await setSent(n=>({...n,mifuLore:[...(n.mifuLore||[]),{id:"ml"+Date.now(),date:TODAY,title:title.slice(0,200),cat:(c&&c.value)||"Other"}].slice(-400)})); toast("noted 📔"); render(); },
  async mifuLoreDel(el){ const id=el.dataset.id; await setSent(n=>({...n,mifuLore:(n.mifuLore||[]).filter(x=>x.id!==id)})); render(); },
  async houseAdd(){ const t=$("#hsPlace"); const place=t?String(t.value||"").trim():""; const s=$("#hsSummary"); const summary=s?String(s.value||"").trim():""; if(!place&&!summary)return; const ty=$("#hsType");
    await setSent(n=>({...n,houseLog:[...(n.houseLog||[]),{id:"hs"+Date.now(),date:TODAY,place:place.slice(0,80),type:(ty&&ty.value)||"memory",summary:summary.slice(0,400)}].slice(-300)})); toast("added to the journey 🏡"); render(); },
  async houseDel(el){ const id=el.dataset.id; await setSent(n=>({...n,houseLog:(n.houseLog||[]).filter(x=>x.id!==id)})); render(); },
  studioSub(el){ state.studioSub=el.dataset.sub; render(); },
  lifeSub(el){ state.lifeSub=el.dataset.sub; render(); },
  creatorSub(el){ state.creatorSub=el.dataset.sub; render(); },
  async comfortAdd(){ const c=$("#comfortCat"), t=$("#comfortText"); const cat=(c&&c.value)||"music", text=t?String(t.value||"").trim():""; if(!text)return;
    await setSent(n=>{ const cm={...(n.comfort||{})}; cm[cat]=[...(cm[cat]||[]),text.slice(0,80)].slice(-30); return {...n,comfort:cm}; }); render(); },
  async comfortDel(el){ const cat=el.dataset.cat, i=+el.dataset.i; await setSent(n=>{ const cm={...(n.comfort||{})}; cm[cat]=(cm[cat]||[]).filter((_,j)=>j!==i); return {...n,comfort:cm}; }); render(); },
  carePull(){ state._carePull=(state._carePull||0)+1; render(); },
  otdAnother(){ state._otdIdx=(state._otdIdx||0)+1; render(); },
  careGoMedia(){ state.memBunny=true; setTab("memories"); },
  flip(el){ el.closest('.flip').classList.toggle('open'); },
  drawJoy(){ const jar=state.sentinel.joyJar||[]; const el=$("#joyPick"); if(!jar.length){ el.textContent="add a joy first ✿"; return; }
    el.textContent="✿ "+jar[Math.floor(Math.random()*jar.length)]+" ✿"; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); },
  async addJoy(){ const t=$("#joyInput").value.trim(); if(!t)return; await setSent(n=>({...n,joyJar:[...(n.joyJar||[]),t]})); toast("added to the jar 🫙"); render(); },

  pref(el){ const f=el.dataset.f; const cur=localStorage.getItem("mifu-"+f)==="1"; localStorage.setItem("mifu-"+f,cur?"0":"1"); applyPrefs(); render(); },
  setTextSize(el){ let v=parseInt(el.value,10); if(isNaN(v))v=TEXT_DEFAULT; v=Math.max(TEXT_MIN,Math.min(TEXT_MAX,v));
    try{ localStorage.setItem("mifu-textsize",String(v)); }catch(_){}
    applyTextZoom(v); PREF.textSize=v;
    const lbl=$("#textSizeVal"); if(lbl)lbl.textContent=v+"px"; },
  async addMed(){ const name=$("#medName").value.trim(); if(!name){ toast("name needed"); return; }
    await setSent(n=>({...n,medsList:[...(n.medsList||[]),{id:"m"+Date.now(),name,dose:$("#medDose").value.trim(),time:$("#medTime").value.trim()}]})); toast("added 💊"); render(); },
  async delMed(el){ await setSent(n=>({...n,medsList:(n.medsList||[]).filter(m=>m.id!==el.dataset.v)})); render(); },
  async saveCfg(){ const name=$("#cfgName").value||CONFIG.creator.name, greeting=$("#cfgGreet").value||CONFIG.creator.greeting,
      weightUnit=$("#cfgUnit").value, weightDisplay=$("#cfgWdisp").value;
    CONFIG.creator.name=name; CONFIG.creator.greeting=greeting; CONFIG.weightUnit=weightUnit; CONFIG.weightDisplay=weightDisplay;
    await setSent(n=>({...n,appConfig:{...(n.appConfig||{}),name,greeting,weightUnit,weightDisplay}}));   // really saved — survives reloads
    toast("details saved ✿"); render(); },
  async export(){ const rows=await DB.exportAll(); const blob=new Blob([JSON.stringify(rows,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="mifuyu-health-backup-"+TODAY+".json"; a.click(); toast("backup downloaded 💾"); },
  async logout(){ if(!confirm("Log out of your journal?"))return; try{ if(SB) await SB.auth.signOut(); }catch(e){} location.reload(); },
  // --- 💌 wishlist for Eggie ---
  async delEggieReq(el){ await setSent(n=>({...n,eggieRequests:(n.eggieRequests||[]).filter(r=>r.id!==el.dataset.v)})); toast("removed 💌"); render(); },
  async clearEggieReqs(){ if(!confirm("Clear all notes for Eggie? (they've been actioned — this starts the list fresh)"))return; await setSent(n=>({...n,eggieRequests:[]})); toast("Eggie notes cleared — fresh start ✨"); render(); },
  copyEggieReqs(){ const rs=(state.sentinel.eggieRequests||[]); if(!rs.length)return;
    const t="MIFU'S WISHLIST FOR EGGIE — exported "+TODAY+"\n\n"+rs.map(r=>`• [${r.status||"new"}] ${r.date}${r.tab?" ("+r.tab+")":""}: ${r.text}`).join("\n");
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t); toast("copied — paste it to Eggie 💌"); },

  async addSticky(){ await addSticky(""); },
  toggleRest(){ toggleTimer(); },

  // --- Universal Voice Capture (#5) — low-friction thought catcher, wrist-kind ---
  voiceOpen(){ voiceOpenModal(); },
  voiceMic(){ voiceToggleMic(); },
  async voiceSave(){
    const ta=$("#voiceText"); if(!ta){return;}
    const text=(ta.value||"").trim();
    if(!text){ toast("nothing to save yet 🌱"); ta.focus(); return; }
    const cat=($("#voiceCat")&&$("#voiceCat").value)||"random";
    voiceStopMic();
    const entry={id:"v"+Date.now(),ts:Date.now(),date:TODAY,cat,text};
    let bank=[]; try{bank=JSON.parse(localStorage.getItem("mifu-context-bank")||"[]");}catch(_){}
    bank.unshift(entry);
    try{localStorage.setItem("mifu-context-bank",JSON.stringify(bank.slice(0,500)));}catch(_){}
    await setSent(n=>({...n,captures:[{id:entry.id,text,date:TODAY,cat},...(n.captures||[])]}));
    $("#modal").innerHTML="";
    render();
    const lbl=(VOICE_CATS.find(c=>c[0]===cat)||["","💭","note"]);
    toast(`${lbl[1]} saved to ${lbl[2]} 💗`);
    try{ popConfetti($("#voiceFab")); }catch(_){}
  },

  // --- Planner ---
  setEnergy(el){ state.energyLevel=el.dataset.v; renderGlobalHeader(); render(); },
  plnMoreToggle(){ capturePlnDraft(); state.plnMoreOpen=!state.plnMoreOpen; render(); },
  plnToggleAll(){ capturePlnDraft(); state.plnShowAll=!state.plnShowAll; render(); },
  plnFilter(el){ capturePlnDraft(); state.plannerEnergy=el.dataset.v; render(); },
  async addTask(){ const text=($("#plnText").value||"").trim(); if(!text){ toast("type a task"); return; }
    const bucket=($("#plnBucket")&&$("#plnBucket").value)||"personal";
    const energy=($("#plnEnergy")&&$("#plnEnergy").value)||"medium";
    const priority=($("#plnPriority")&&$("#plnPriority").value)||"medium";
    const emoji=($("#plnEmoji")&&$("#plnEmoji").value)||"";
    const due=($("#plnDue")&&$("#plnDue").value)||"";
    state.plnDraft=null;
    await setSent(n=>({...n,tasks:[...(n.tasks||[]),{id:"t"+Date.now(),text,bucket,energy,priority,...(emoji?{emoji}:{}),done:false,sub:[],status:"todo",...(due?{due}:{})}]})); toast("added 🗒️"); render(); },
  async toggleTask(el){ const id=el.dataset.v;
    await setSent(n=>{ let c=(n.customReminders||[]).slice();
      const ts=(n.tasks||[]).map(t=>{ if(t.id!==id)return t; const done=!t.done;
        if(done) c=c.map(r=>r.taskId===id&&!r.done?{...r,done:true}:r);     // one thing, one ping — but unchecking never resurrects the ping
        return {...t,done,status:done?"done":"todo",...(done?{completedAt:TODAY}:{})}; });
      return {...n,tasks:ts,customReminders:c}; });
    render(); },
  plnView(el){ capturePlnDraft(); state.plannerView=el.dataset.v; try{localStorage.setItem("mifu-planner-view",state.plannerView);}catch(e){} render(); },
  plnSort(el){ capturePlnDraft(); state.boardSort=el.dataset.v; try{localStorage.setItem("mifu-board-sort",state.boardSort);}catch(e){} render(); },
  async taskMove(el){ const id=el.dataset.v, d=Number(el.dataset.d)||0;
    const t=(state.sentinel.tasks||[]).find(x=>x.id===id); if(!t)return;
    const i=TASK_STATUSES.findIndex(s=>s[0]===taskStatus(t)); const ni=Math.max(0,Math.min(TASK_STATUSES.length-1,i+d));
    if(ni!==i) await setTaskStatusById(id,TASK_STATUSES[ni][0]); },
  taskEdit(el){ const id=el.dataset.v; const t=(state.sentinel.tasks||[]).find(x=>x.id===id); if(!t)return;
    $("#modal").innerHTML=`<div class="modal-bg" data-act="closeModal"><div class="modal" data-act="noop" style="max-width:380px">
      <div class="card-head"><h3 style="font-size:16px">✏️ Edit task</h3><button class="btn" data-act="closeModal">✕</button></div>
      <div class="field"><div class="label">Task</div><input class="inp" id="teText" value="${esc(t.text)}"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <select class="inp" id="teBucket" style="max-width:175px">${TASK_BUCKETS.map(([v,e,l])=>`<option value="${v}" ${t.bucket===v?'selected':''}>${e} ${l}</option>`).join("")}</select>
        <select class="inp" id="teEnergy" style="max-width:115px">${TASK_ENERGY.map(([v,e,l])=>`<option value="${v}" ${normEnergy(t.energy||t.spoon||'medium')===v?'selected':''}>${e} ${l}</option>`).join("")}</select>
        <select class="inp" id="tePriority" style="max-width:115px">${TASK_PRIORITY.map(([v,e,l])=>`<option value="${v}" ${(t.priority||'medium')===v?'selected':''}>${e} ${l}</option>`).join("")}</select>
        <span style="display:inline-flex;flex-direction:column;gap:2px;flex:1 1 140px;min-width:0"><span class="soft" style="font-size:10px">due · optional</span><input class="inp" id="teDue" type="date" value="${t.due||""}"></span>
      </div>
      <p class="soft" style="font-size:11px;margin:8px 0 12px">renaming also renames its linked reminder, so they stay one thing 💗</p>
      <button class="btn btn-grad" data-act="taskEditSave" data-v="${id}">💾 save</button>
    </div></div>`; },
  async taskEditSave(el){ const id=el.dataset.v; const g=i=>{const e2=$("#"+i);return e2?e2.value:"";};
    const text=(g("teText")||"").trim(); if(!text){ toast("the task needs some words 🌱"); return; }
    const bucket=g("teBucket")||"personal", energy=g("teEnergy")||"medium", priority=g("tePriority")||"medium", due=g("teDue")||"";
    await setSent(n=>{ const ts=(n.tasks||[]).map(t=>t.id===id?{...t,text,bucket,energy,priority,due:due||undefined}:t);
      const c=(n.customReminders||[]).map(r=>r.taskId===id&&!r.done?{...r,text}:r);   // linked ping keeps the new wording
      return {...n,tasks:ts,customReminders:c}; });
    $("#modal").innerHTML=""; toast("saved ✏️"); render(); },
  taskRem(el){ const id=el.dataset.v; const t=(state.sentinel.tasks||[]).find(x=>x.id===id); if(!t)return;
    const R=remByTask()[id];
    $("#modal").innerHTML=`<div class="modal-bg" data-act="closeModal"><div class="modal" data-act="noop" style="max-width:380px">
      <div class="card-head"><h3 style="font-size:16px">📅 Date &amp; reminder</h3><button class="btn" data-act="closeModal">✕</button></div>
      <p style="font-size:13px;margin:0 0 10px">${esc(t.text)}</p>
      <div class="field"><div class="label">Due date · optional</div><input class="inp" id="trDue" type="date" value="${t.due||""}"></div>
      <label style="display:flex;gap:8px;align-items:center;margin:12px 0 6px;font-size:13px;cursor:pointer"><input type="checkbox" id="trOn" ${R?"checked":""}> ⏰ remind me</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span style="display:inline-flex;flex-direction:column;gap:2px;flex:1 1 140px;min-width:0"><span class="soft" style="font-size:10px">day</span><input class="inp" id="trDate" type="date" value="${R?(R.date||TODAY):(t.due||TODAY)}"></span>
        <span style="display:inline-flex;flex-direction:column;gap:2px;flex:1 1 110px;min-width:0"><span class="soft" style="font-size:10px">time · optional</span><input class="inp" id="trTime" type="time" value="${R?(R.time||""):""}"></span>
      </div>
      <p class="soft" style="font-size:11px;margin:8px 0 12px">one thing, one ping — finishing the task finishes the reminder, and ticking the reminder completes the task 💗</p>
      <button class="btn btn-grad" data-act="taskRemSave" data-v="${id}">💾 save</button>
    </div></div>`; },
  async taskRemSave(el){ const id=el.dataset.v; const g=i=>{const e2=$("#"+i);return e2?e2.value:"";};
    const on=!!($("#trOn")&&$("#trOn").checked); const due=g("trDue")||""; const rd=g("trDate")||TODAY, rt=g("trTime")||"";
    await setSent(n=>{ const ts=(n.tasks||[]).map(t=>t.id===id?{...t,due:due||undefined}:t);
      let c=(n.customReminders||[]).slice(); const t=ts.find(x=>x.id===id); const i=c.findIndex(r=>r.taskId===id&&!r.done);
      if(on){ if(i>=0) c[i]={...c[i],text:(t&&t.text)||c[i].text,date:rd,time:rt};
        else c.push({id:"cr"+Date.now(),text:(t&&t.text)||"task",date:rd,time:rt,repeat:"none",done:false,taskId:id}); }
      else if(i>=0) c.splice(i,1);
      return {...n,tasks:ts,customReminders:c}; });
    $("#modal").innerHTML=""; toast("saved ⏰"); render(); },
  async delTask(el){ const id=el.dataset.v; await setSent(n=>({...n,tasks:(n.tasks||[]).filter(t=>t.id!==id)})); render(); },
  async toggleSub(el){ const id=el.dataset.v, sid=el.dataset.s;
    await setSent(n=>({...n,tasks:(n.tasks||[]).map(t=>t.id===id?{...t,sub:(t.sub||[]).map(s=>s.id===sid?{...s,done:!s.done}:s)}:t)})); render(); },

  // --- Home: Goals / Journal / Schedule / Brain-dump ---
  async addGoal(el){ const p=el.dataset.p, key=p==='week'?'goalsWeek':'goalsMonth'; const inp=$(p==='week'?'#goalWeek':'#goalMonth'); const t=(inp.value||'').trim(); if(!t)return;
    const gw=$("#goalWeek"),gm=$("#goalMonth"); state.goalDraft={week:gw?gw.value:"",month:gm?gm.value:""}; state.goalDraft[p==='week'?'week':'month']="";   // keep the other box's half-typed goal
    await setSent(n=>({...n,[key]:[...(n[key]||[]),{id:'g'+Date.now(),text:t,done:false}]})); render(); },
  async toggleGoal(el){ const key=el.dataset.p==='week'?'goalsWeek':'goalsMonth', id=el.dataset.v;
    const gw=$("#goalWeek"),gm=$("#goalMonth"); state.goalDraft={week:gw?gw.value:"",month:gm?gm.value:""};
    await setSent(n=>({...n,[key]:(n[key]||[]).map(g=>g.id===id?{...g,done:!g.done}:g)})); render(); },
  async delGoal(el){ const key=el.dataset.p==='week'?'goalsWeek':'goalsMonth', id=el.dataset.v;
    const gw=$("#goalWeek"),gm=$("#goalMonth"); state.goalDraft={week:gw?gw.value:"",month:gm?gm.value:""};
    await setSent(n=>({...n,[key]:(n[key]||[]).filter(g=>g.id!==id)})); render(); },
  async saveJournal(){ const t=$("#journalInput").value; await setToday(n=>({...n,journal:t})); memPush("journal",t,6); toast("saved 🌙"); },
  schedEdit(){ if(state.schedEdit){ const wk=weekStartISO(state.schedWeekOff||0); const rows=[...document.querySelectorAll(".sched-ed-row")].map(row=>{ const day=row.dataset.day; const show=(row.querySelector(".sched-show")?.value||"").trim(); const time=(row.querySelector(".sched-time")?.value||"").trim(); return show?{id:"sc"+day,day,show,time:time||STREAM_TIME_DEFAULT}:null; }).filter(Boolean); setWeekSlots(wk,()=>rows); } state.schedEdit=!state.schedEdit; render(); },
  async addSched(){ const wk=weekStartISO(state.schedWeekOff||0); await setWeekSlots(wk,arr=>[...arr,{id:'sc'+Date.now(),day:'Mon',show:'',time:STREAM_TIME_DEFAULT}]); render(); },
  async delSched(el){ const id=el.dataset.v, wk=weekStartISO(state.schedWeekOff||0); await setWeekSlots(wk,arr=>arr.filter(r=>r.id!==id)); render(); },
  async addSchedSug(el){ const day=el.dataset.day||'Mon', show=el.dataset.show||'', wk=weekStartISO(state.schedWeekOff||0);
    await setWeekSlots(wk,arr=>[...arr,{id:'sc'+Date.now(),day,show,time:STREAM_TIME_DEFAULT}]); toast("added 🗓️"); render(); },
  schedWeek(el){ state.schedWeekOff=(state.schedWeekOff||0)+(Number(el.dataset.d)||0); render(); },
  schedWeekToday(){ state.schedWeekOff=0; render(); },
  async capAdd(){ const inp=$("#capInput"); const t=(inp.value||'').trim(); if(!t)return;
    await setSent(n=>({...n,captures:[...(n.captures||[]),{id:'cap'+Date.now(),text:t,date:TODAY}]})); toast("parked 🧠"); render(); },
  async capDel(el){ const id=el.dataset.v; await setSent(n=>({...n,captures:(n.captures||[]).filter(c=>c.id!==id)})); render(); },
  async capPin(el){ const c=(state.sentinel.captures||[]).find(x=>x.id===el.dataset.v); if(!c)return; await addSticky(c.text); toast("pinned to a sticky 📌"); },

  // --- Calendar ---
  calPrev(){ const v=state.calView||"week"; const r=state.calRef instanceof Date?new Date(state.calRef):new Date(); if(v==="week"){ r.setDate(r.getDate()-7); state.calRef=r; } else { state.calRef=new Date(r.getFullYear(),r.getMonth()-1,1); } render(); },
  calNext(){ const v=state.calView||"week"; const r=state.calRef instanceof Date?new Date(state.calRef):new Date(); if(v==="week"){ r.setDate(r.getDate()+7); state.calRef=r; } else { state.calRef=new Date(r.getFullYear(),r.getMonth()+1,1); } render(); },
  calToday(){ const v=state.calView||"week"; const t=new Date(); state.calRef=v==="month"?new Date(t.getFullYear(),t.getMonth(),1):t; render(); },
  calViewWeek(){ state.calView="week"; if(!(state.calRef instanceof Date)) state.calRef=new Date(); render(); },
  calViewMonth(){ state.calView="month"; const r=state.calRef instanceof Date?state.calRef:new Date(); state.calRef=new Date(r.getFullYear(),r.getMonth(),1); render(); },
  calAdd(el){ calEventModal(el.dataset.date); },
  calEvent(el){ calEventModal(null,el.dataset.eid); },
  calLink(el){ const u=el.dataset.url; if(u) window.open(u,"_blank","noopener"); },
  closeModal(){ try{voiceStopMic();}catch(_){} $("#modal").innerHTML=""; },
  noop(){},
  // --- modular layout ---
  toggleLock(){ const v=localStorage.getItem("layout-locked")==="0"?"1":"0"; localStorage.setItem("layout-locked",v); applyPrefs(); render(); toast(v==="0"?"Layout unlocked 🔓 — drag tabs to reorder":"Layout locked 🔒"); },
  resetNavOrder(){ try{ localStorage.removeItem("tab-order"); localStorage.removeItem("nav-groups-health"); localStorage.removeItem("nav-groups-creator"); }catch(_){} toast("Nav order reset ↺"); render(); },
  async homeMin(el){ const k=el.dataset.w, tab=el.dataset.tab||state.tab; await setLayout(tab,L=>{ L.min={...L.min,[k]:!L.min[k]}; }); render(); },
  async homeHide(el){ const k=el.dataset.w, tab=el.dataset.tab||state.tab; await setLayout(tab,L=>{ L.hidden={...L.hidden,[k]:true}; }); toast("card hidden — restore it from ＋ cards 🌸"); render(); },
  manageCards(el){ manageCardsModal(el.dataset.tab||state.tab); },
  async cardToggle(el){ const k=el.dataset.w, tab=el.dataset.tab||state.tab; await setLayout(tab,L=>{ L.hidden={...L.hidden,[k]:!L.hidden[k]}; if(!L.hidden[k]&&!L.order.includes(k))L.order.push(k); }); manageCardsModal(tab); render(); },
  async resetLayout(el){ const tab=el.dataset.tab||state.tab; await setSent(n=>{ const layout={...(n.layout||{})}; delete layout[tab]; return {...n,layout}; }); $("#modal").innerHTML=""; toast("layout reset 🌸"); render(); },
  editSchedule(){ $("#modal").innerHTML=""; state.tab="home"; state.schedEdit=true; render(); },
  async saveCalEvent(){
    const title=($("#calTitle").value||"").trim(), date=$("#calDate").value, eid=$("#calEid").value;
    const endRaw=$("#calEndDate").value||null, time=$("#calTime").value, tz=$("#calTz").value, note=($("#calNote").value||"").trim(), url=($("#calUrl").value||"").trim();
    if(!title){ toast("give it a name 🌸"); return; }
    const endDate=(endRaw&&endRaw>date)?endRaw:null;
    state.sentinel=await DB.saveDaily(SENTINEL,n=>{ const evs=(n.calendarEvents||[]).slice();
      if(eid){ const t=evs.find(x=>x.id===eid); if(t){ t.title=title;t.date=date;t.endDate=endDate;t.color=CAL_COLOR;t.time=time;t.tz=tz;t.note=note;t.url=url; } }
      else { evs.push({id:uid(),title,date,endDate,color:CAL_COLOR,time,tz,note,url}); }
      return {...n,calendarEvents:evs}; });
    $("#modal").innerHTML=""; toast("saved 💗"); render();
  },
  async delCalEvent(el){ const eid=el.dataset.eid; state.sentinel=await DB.saveDaily(SENTINEL,n=>({...n,calendarEvents:(n.calendarEvents||[]).filter(x=>x.id!==eid)})); $("#modal").innerHTML=""; toast("removed"); render(); },
  async setGameColor(el){ await setSent(n=>({...n,gameColor:el.dataset.v})); toast("colour set 🎮"); render(); },
  calToggleStreams(){ state.calShowStreams = !(state.calShowStreams!==false); render(); },
  calToggleGames(){ state.calShowGames = !(state.calShowGames!==false); render(); },
  calToggleEvents(){ state.calShowEvents = !(state.calShowEvents!==false); render(); },
  calToggleBdays(){ state.calShowBdays = !(state.calShowBdays!==false); render(); },
  async addGameTopic(){ const el=$("#gameTopicInput"); const name=(el?el.value:"").trim(); if(!name)return; await gameTopicAdd(name); toast("tracking "+name+" 🎮"); render(); },
  async delGameTopic(el){ const name=el.dataset.v; await gameTopicRemove(name); toast("stopped tracking "+name); render(); },
  // --- script writer ---
  scriptKind(el){ scrCapture(); if(!state.script)state.script={}; state.script.kind=el.dataset.v; state.script.out=null; render(); },
  recToggle(){ scrRecToggle(); },
  scrClearRaw(){ if(!state.script)state.script={}; state.script.raw=""; const ta=document.getElementById("scrRaw"); if(ta)ta.value=""; },
  formatScript(){ scrFormat(); },
  saveScript(){ scrSaveDraft(); },
  loadScript(el){ scrLoadDraft(el.dataset.id); },
  delScript(el){ scrDelDraft(el.dataset.id); },
  teachVoice(el){ teachModal(el.dataset.v||"script"); },
  async teachSave(el){ const g=i=>{const e2=$("#"+i);return e2?e2.value:"";}; const text=(g("tvText")||"").trim(); if(!text){ toast("paste a sample first 🌸"); return; }
    const kind=g("tvKind")||el.dataset.v||"any", note=(g("tvNote")||"").trim();
    await setSent(n=>({...n,eqVoice:[...(n.eqVoice||[]),{id:"vx"+Date.now(),kind,text:text.slice(0,4000),note:note.slice(0,160)}]}));
    toast("Kiko learned your voice 🎓💗"); teachModal(kind); },
  async delVoice(el){ const id=el.dataset.v; await setSent(n=>({...n,eqVoice:(n.eqVoice||[]).filter(e=>e.id!==id)})); teachModal("script"); },
  scrCopyHook(el){ const t=el.dataset.t||""; if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t); toast("copied 💗"); },
  scrCopyScript(){ const el2=document.getElementById("scrScript"); if(el2&&navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(el2.innerText); toast("copied 💗"); },
  // --- birthdays + reminders ---
  scrollAgenda(){ setTab("events"); },
  evBdayMonth(el){ state.evBdayMonth=Number(el.dataset.v); render(); },
  async addBirthday(){ const name=($("#bdayName").value||"").trim(); const dv=$("#bdayDate").value;
    if(!name||!dv){ toast("name + date please 🎂"); return; } const [,M,D]=dv.split("-").map(Number);
    await setSent(n=>({...n,birthdays:[...(n.birthdays||[]),{id:"bd"+Date.now(),name,month:M,day:D}]})); toast("added 🎂"); render(); },
  async delBirthday(el){ const id=el.dataset.v; await setSent(n=>({...n,birthdays:(n.birthdays||[]).filter(b=>b.id!==id)})); render(); },
  async remOffset(el){ const v=Number(el.dataset.v); const rem={...(state.sentinel.reminders||{})}; let offs=(rem.offsets||[0,1]).slice();
    if(offs.includes(v)) offs=offs.filter(x=>x!==v); else offs.push(v); rem.offsets=offs.sort((a,b)=>a-b);
    await setSent(n=>({...n,reminders:rem})); render(); },
  async remBrowser(){
    if(typeof Notification==="undefined"){ toast("this browser can't do pop-ups — use 📱 Phone push instead (on iPhone/iPad, add the app to your Home Screen first) 🍎"); return; }
    const rem={...(state.sentinel.reminders||{})};
    if(!rem.browser){ if(typeof Notification!=="undefined" && Notification.permission!=="granted"){ try{ const p=await Notification.requestPermission(); if(p!=="granted") toast("Your browser blocked notifications — allow them in site settings to use this"); }catch(e){} } rem.browser=true; }
    else rem.browser=false;
    await setSent(n=>({...n,reminders:rem})); render(); if(rem.browser) setTimeout(checkReminders,400); },
  async remEmail(){ const rem={...(state.sentinel.reminders||{})}; rem.email=!rem.email; await setSent(n=>({...n,reminders:rem})); render(); },
  async remPush(){
    const rem={...(state.sentinel.reminders||{})};
    if(rem.push){   // turn off on this device
      try{ const reg=await navigator.serviceWorker.ready; const sub=await reg.pushManager.getSubscription();
        if(sub){ const ep=sub.endpoint; await sub.unsubscribe(); await setSent(n=>{ const subs=(n.pushSubs||[]).filter(s=>s.endpoint!==ep); return {...n,pushSubs:subs,reminders:{...(n.reminders||{}),push:subs.length>0}}; }); }
        else await setSent(n=>({...n,reminders:{...(n.reminders||{}),push:false}}));
      }catch(e){ await setSent(n=>({...n,reminders:{...(n.reminders||{}),push:false}})); }
      toast("phone push off on this device"); render(); return; }
    if(DEMO||!SB){ toast("connect to the server first ❄️"); return; }
    if(!("serviceWorker" in navigator)||!("PushManager" in window)){ toast("this browser can't do push — on iPhone, add the app to your Home Screen first 🍎"); return; }
    try{
      const p=await Notification.requestPermission(); if(p!=="granted"){ toast("notifications are blocked for this site"); return; }
      const reg=await navigator.serviceWorker.ready;
      const info=await aiCall("pushInfo",{}); if(!info||!info.key){ toast((info&&info.error)||"push isn't set up on the server yet (VAPID keys — see the setup doc)"); return; }
      const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlB64ToUint8(info.key)});
      const j=sub.toJSON();
      await setSent(n=>{ const subs=(n.pushSubs||[]).filter(s=>s.endpoint!==j.endpoint); subs.push(j); return {...n,pushSubs:subs,reminders:{...(n.reminders||{}),push:true}}; });
      toast("phone push is on for this device 📱❄️"); render();
    }catch(e){ console.error(e); toast("couldn't subscribe — "+(e.message||"try again")); } },
  async addReminderCR(){ const g=id=>{const el=$("#"+id);return el?el.value:"";}; const text=(g("crText")||"").trim(); if(!text){ toast("what should I remind you of? ⏰"); return; }
    const r={id:"cr"+Date.now(),text,date:g("crDate")||TODAY,time:g("crTime")||"",repeat:g("crRepeat")||"none",done:false};
    await setSent(n=>({...n,customReminders:[...(n.customReminders||[]),r]})); toast("reminder set ⏰"); render(); },
  async delReminderCR(el){ const id=el.dataset.v; await setSent(n=>({...n,customReminders:(n.customReminders||[]).filter(r=>r.id!==id)})); render(); },
  async doneReminderCR(el){ const id=el.dataset.v;
    await setSent(n=>{ const c=(n.customReminders||[]).slice(); const i=c.findIndex(r=>r.id===id); if(i<0)return n; let tasks=n.tasks;
      if(c[i].repeat&&c[i].repeat!=="none"){ const d=new Date(nextReminderDate(c[i])+"T00:00"); if(c[i].repeat==="daily")d.setDate(d.getDate()+1); else if(c[i].repeat==="weekly")d.setDate(d.getDate()+7); else d.setMonth(d.getMonth()+1); c[i]={...c[i],date:d.toLocaleDateString("en-CA")}; }
      else { c[i]={...c[i],done:true};
        if(c[i].taskId) tasks=(n.tasks||[]).map(t=>t.id===c[i].taskId?{...t,done:true,status:"done"}:t); }   // ticking the ping completes the thing
      return {...n,customReminders:c,...(tasks!==n.tasks?{tasks}:{})}; });
    toast("done ✓"); render(); },
  async saveRemEmail(){ const v=($("#remEmailAddr").value||"").trim(); const rem={...(state.sentinel.reminders||{})}; rem.emailAddr=v; await setSent(n=>({...n,reminders:rem})); toast("email saved ✉️"); render(); },
  trendMetric(el){ const k=el.dataset.v; let arr=(state.trendMetrics||[]).slice();
    if(arr.includes(k)){ if(arr.length>1) arr=arr.filter(x=>x!==k); }   // keep at least one selected
    else arr.push(k);
    state.trendMetrics=arr; render(); },
  trendType(el){ state.trendType=el.dataset.v; try{localStorage.setItem("mifu-trend-type",state.trendType);}catch(e){} render(); },
  trendDays(el){ state.trendDays=Number(el.dataset.v)||14; render(); },
  kikoToggle(){ if(state.tab==="kiko"){ const i=kikoInputEl(); if(i)try{i.focus();}catch(_){}; return; }   // already in his home base
    KIKO.open=!KIKO.open;
    if(KIKO.open){ $("#kikoBubble").classList.add("hidden"); kikoState="sit"; kikoStateT=0; $("#kikoChat").classList.remove("hidden"); paintKiko(); positionKikoUI(); }
    else { $("#kikoChat").classList.add("hidden"); kikoState="walk"; kikoStateT=0; } },
  // --- guided daily feelings journal (Kiko walks her through it, in his chat) ---
  openKikoChatPanel(){ KIKO.open=true; const b=$("#kikoBubble"); if(b)b.classList.add("hidden"); kikoState="sit"; kikoStateT=0;
    const c=$("#kikoChat"); if(c)c.classList.remove("hidden"); paintKiko(); positionKikoUI(); },
  copyJournal(el){ const id=el&&el.dataset.id; const list=state.sentinel.journalEntries||[];
    const e=(id?list.find(x=>journalId(x)===id):null)||list.slice().reverse()[0];
    const t=e&&(e.text||"")||""; if(t&&navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t); toast("copied 💗"); },
  async delJournal(el){ const id=el.dataset.id; await setSent(n=>({...n,journalEntries:(n.journalEntries||[]).filter(x=>journalId(x)!==id)})); toast("removed"); render(); },
  async startKikoJournal(){
    const live = !DEMO && !!SB;
    KIKO.journal={active:true, mode: live?"ai":"script", msgs:[], step:0, log:[]};
    if(state.tab!=="kiko") H.openKikoChatPanel();
    if(!live){
      const intro="Konfuyu~ let's sit together a moment 🦊 A gentle journal about today and how you're feeling. One question at a time, and you can say \"stop\" whenever. 💗";
      KIKO.log.push({role:"pet",text:intro}); KIKO.log.push({role:"pet",text:KIKO_JOURNAL_ARC[0]});
      KIKO.journal.log.push({who:"Kiko",text:KIKO_JOURNAL_ARC[0]}); paintKiko(); return;
    }
    // AI-guided: let Kiko open
    KIKO.busy=true; paintKiko();
    try{ const d=await aiCall("journal",{messages:[], context:journalContext()});
      if(d&&d.error) throw new Error(d.error);
      const reply=(d&&d.reply)||"Konfuyu~ let's sit together a moment 🦊 How are you arriving here right now — what's the weather inside today?";
      KIKO.journal.msgs.push({role:"pet",content:reply}); KIKO.journal.log.push({who:"Kiko",text:reply});
      KIKO.log.push({role:"pet",text:reply});
    }catch(e){ KIKO.journal.mode="script"; KIKO.log.push({role:"pet",text:KIKO_JOURNAL_ARC[0]}); KIKO.journal.log.push({who:"Kiko",text:KIKO_JOURNAL_ARC[0]}); }
    KIKO.busy=false; paintKiko(); },
  // router for a journal answer (called from kikoSend; the user line is already in the log)
  async kikoJournalReply(answer){
    const J=KIKO.journal; if(!J)return;
    J.log.push({who:"Mifu",text:answer});
    if(/^(stop|cancel|nvm|never ?mind|quit|exit|done)\.?$/i.test(answer)){
      J.active=false; KIKO.log.push({role:"pet",text:"okay, we can pick it up another time — no pressure at all 💗❄️"}); paintKiko();
      if(J.log.length>1) await saveJournalEntry(J); return; }
    if(J.mode==="script") return H.kikoJournalScriptStep(answer);
    // AI-guided turn
    J.msgs.push({role:"me",content:answer}); J.step++;
    KIKO.busy=true; paintKiko();
    try{
      const d=await aiCall("journal",{messages:J.msgs, context:journalContext()});
      if(d&&d.error) throw new Error(d.error);
      let reply=(d&&d.reply)||"mm, I'm right here with you 💗"; let done=!!(d&&d.done) || J.step>=9;
      J.msgs.push({role:"pet",content:reply}); J.log.push({who:"Kiko",text:reply});
      KIKO.log.push({role:"pet",text:reply}); KIKO.busy=false; paintKiko();
      if(done){ await finishJournal(J); }
    }catch(e){ // fall back to the gentle scripted arc if the journal endpoint isn't available
      J.mode="script"; KIKO.busy=false;
      const next=KIKO_JOURNAL_ARC[Math.min(J.step,KIKO_JOURNAL_ARC.length-1)];
      KIKO.log.push({role:"pet",text:next}); J.log.push({who:"Kiko",text:next}); paintKiko(); }
  },
  async kikoJournalScriptStep(answer){
    const J=KIKO.journal; J.step++;
    if(J.step<KIKO_JOURNAL_ARC.length){
      KIKO.log.push({role:"pet",text:KIKO_JOURNAL_ACKS[Math.floor(Math.random()*KIKO_JOURNAL_ACKS.length)]});
      KIKO.log.push({role:"pet",text:KIKO_JOURNAL_ARC[J.step]}); J.log.push({who:"Kiko",text:KIKO_JOURNAL_ARC[J.step]}); paintKiko(); return;
    }
    KIKO.log.push({role:"pet",text:"and that's our journal for today 🌸 you showed up for yourself, and that counts. ❄️🦊"});
    paintKiko(); await finishJournal(J); },
  async kikoReadJournal(el){
    const date=el.dataset.date||TODAY;
    const ym=date.slice(0,7);
    if(!(state.jrCache||{})[ym]) await jrFetchMonth(new Date(date+"T00:00"));
    const dayData=(date===TODAY?state.today:null)||(state.jrCache||{})[ym]?.[date]||{};
    const text=(dayData.journal||'').trim();
    if(!text){ toast("Write something in your journal first! 📓"); return; }
    const btn=el; btn.disabled=true; btn.textContent="🦊 reading…";
    try{
      const prompt=`Read this personal journal entry and extract the following. Reply ONLY with a valid JSON object, no extra text:\n{\n  "mood": 1-5 (1=rough, 5=lovely),\n  "energy": 1-5,\n  "stress": 1-5 (1=low stress, 5=very stressed),\n  "sleep": hours as a number or null,\n  "symptoms": ["list","of","symptoms"] or [],\n  "topics": ["list","of","main","topics"] (e.g. stream, food, health, friends, gaming, family),\n  "special": true or false (was this a notably special or memorable day?),\n  "dayColor": "lovely" | "okay" | "rough",\n  "summary": "one warm sentence summarising the day in Kiko's voice"\n}\n\nJournal entry:\n${text}`;
      const d=await kikoSimpleCall({question:prompt,history:[],tab:'journal',userModel:'',smart:false});
      const raw=(d.reply||'').replace(/```json|```/g,'').trim();
      const det=JSON.parse(raw);
      if(!state.kikoDetected) state.kikoDetected={};
      state.kikoDetected[date]=det;
      // sync detected values back into health data for today
      if(date===TODAY){
        const upd={}; if(det.mood!=null) upd.mood=det.mood; if(det.energy!=null) upd.energy=det.energy;
        if(det.stress!=null) upd.stress=det.stress; if(det.sleep!=null) upd.sleep=det.sleep;
        if(Object.keys(upd).length) await setDay(date,n=>({...n,...upd,mind:{...(n.mind||{}),...upd}}));
      }
      toast("Kiko read your entry ✨"); render();
    }catch(e){ toast("Couldn't parse — try again 🌧️"); btn.disabled=false; btn.textContent="🦊 Kiko, read this"; }
  },
  async kikoSend(){ const inp=kikoInputEl(); const q=(inp?inp.value:"").trim(); const imgs=(KIKO.pendingImages||[]).slice(0,6);
    if((!q && !imgs.length)||KIKO.busy)return;
    KIKO.log.push({role:"me",text:q,...(imgs.length?{imgs}:{})});   // images show right in the chat
    KIKO.pendingImages=[];
    if(KIKO.journal && KIKO.journal.active){ paintKiko(); return H.kikoJournalReply(q||"(sent a photo)"); }
    if(KIKO.tax && KIKO.tax.active){ paintKiko(); return H.kikoTaxReply(q||"(noted)"); }
    KIKO.busy=true; paintKiko();
    let ans, didActions=false;
    try{
      if(DEMO||!SB){ ans="I'm a sleepy demo kiko right now 💤 — connect me to the server and I can chat and actually run things for you! ❄️"; }
      else {
        const upcoming=(state.sentinel.calendarEvents||[]).filter(e=>(e.endDate||e.date)>=TODAY).sort((a,b)=>(a.date<b.date?-1:1)).slice(0,20).map(e=>({date:e.date,endDate:e.endDate,title:e.title}))
          .concat(activeReminders().map(r=>({date:nextReminderDate(r),title:"⏰ "+r.text+(r.time?" ("+fmt12(r.time)+")":"")+(r.repeat&&r.repeat!=="none"?" · "+r.repeat:"")})).slice(0,10));
        const agentInput={question:q, today:TODAY, tz:CAL_TZ_TARGET, tab:state.tab,
          schedule:weekSlots(weekStartISO(0)), events:upcoming,
          games:(state.sentinel.gameTopics&&state.sentinel.gameTopics.length?state.sentinel.gameTopics:DEFAULT_GAMES),
          memory:(state.sentinel.kikoMemory||[]).slice(-30).map(m=>({text:m.text})),
          userModel:(state.sentinel.kikoUserModel||""),
          recentActions:(state.sentinel.kikoActions||[]).slice(-12),
          history:KIKO.log.slice(0,-1).slice(-8).map(m=>({role:m.role,text:String(m.text||"").slice(0,300)+(m.imgs&&m.imgs.length?" [she attached "+m.imgs.length+" image"+(m.imgs.length>1?"s":"")+" here]":"")})),
          images:imgs,   // he sees what you sent — designs, DMs, screenshots, food, anything
          priorImages:KIKO.log.slice(0,-1).slice(-8).filter(m=>m.role==="me"&&m.imgs&&m.imgs.length).flatMap(m=>m.imgs).slice(-3),   // and remembers what you sent a few messages ago
          smart:localStorage.getItem("kiko-smart")==="1",
          summary:kikoDataSummary()};
        let d;
        try{ d=await kikoSimpleCall(agentInput); }
        catch(_se){ d=await kikoSimpleCall(agentInput); }
        KIKO.status=null;
        if(d&&d.error) throw new Error(d.error);
        ans=(d&&(d.reply||d.answer))||"hmm, my whiskers twitched — ask me again? 🦊";
        const acts=(d&&Array.isArray(d.actions))?d.actions:[];
        const done=[], failed=[];
        for(const a of acts){ const r=await execAgentAction(a); if(r) done.push(r); else if(a&&a.type) failed.push(a.type); }
        if(done.length){ didActions=true; ans+="\n\n"+done.map(x=>"✓ "+x).join("\n"); logKikoActions(done); }   // queued in the background — never on the hot path
        if(failed.length){ ans+="\n\n(heads up — I couldn't apply "+failed.length+" thing"+(failed.length>1?"s":"")+": "+failed.join(", ")+". Mind rephrasing, or check the name matches? 🌧️)"; }
        KIKO.sinceReflect=(KIKO.sinceReflect||0)+1; if(KIKO.sinceReflect>=10){ KIKO.sinceReflect=0; setTimeout(()=>{ try{ kikoReflect(); }catch(_){} },1200); }
    if(KIKO.pendingGameSave){ const gid=KIKO.pendingGameSave; KIKO.pendingGameSave=null; try{ await setSent(n=>{ const v=(n.sparkVault||[]).filter(x=>x.gid!==gid); return {...n,sparkVault:[...v,{id:'spark'+Date.now(),gid,text:ans,date:TODAY}]}; }); }catch(_){} }
      }
    }catch(e){ ans="aw, I couldn't reach the server — "+(e.message||"try again")+" 🌧️"; }
    KIKO.status=null;
    KIKO.log.push({role:"pet",text:ans}); KIKO.busy=false;
    if(didActions){ try{ await loadData(); await render(); }catch(_){} }   // re-pull so agent's writes show
    paintKiko(); },
  kikoClearImg(el){ const i=el&&el.dataset.i!=null?Number(el.dataset.i):-1; if(i>=0) KIKO.pendingImages.splice(i,1); else KIKO.pendingImages=[]; paintKiko(); },
  kikoMic(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ toast("voice needs Chrome or Edge on desktop 🌸"); return; }
    if(KIKO.mic){ KIKO.mic=false; try{KIKO._rec&&KIKO._rec.stop();}catch(e){} paintKiko(); return; }
    let rec; try{ rec=new SR(); }catch(e){ toast("couldn't start the mic 🌸"); return; }
    KIKO._rec=rec; rec.lang="en-US"; rec.continuous=false; rec.interimResults=true;
    let fin="";
    rec.onresult=e=>{ let interim=""; for(let i=e.resultIndex;i<e.results.length;i++){ const t=e.results[i][0].transcript; if(e.results[i].isFinal)fin+=t; else interim+=t; } const inp=kikoInputEl(); if(inp)inp.value=(fin+" "+interim).trim(); };
    rec.onend=()=>{ KIKO.mic=false; const inp=kikoInputEl(); if(inp&&inp.value.trim()){ H.kikoSend(); } else paintKiko(); };
    rec.onerror=()=>{ KIKO.mic=false; paintKiko(); };
    KIKO.mic=true; paintKiko(); try{ rec.start(); }catch(e){ KIKO.mic=false; paintKiko(); } },
  kikoVoiceToggle(){ const v=localStorage.getItem("kiko-voice")==="1"?"0":"1"; localStorage.setItem("kiko-voice",v); if(v!=="1"){ try{speechSynthesis.cancel();}catch(e){} } toast(v==="1"?"Kiko will speak 🔊":"quiet mode 🤫"); render(); },
  kikoProLevel(el){ const v=el.dataset.v||"gentle"; localStorage.setItem("kiko-prolevel",v); localStorage.setItem("kiko-proactive",v==="quiet"?"0":"1");
    toast(v==="quiet"?"Kiko will wait to be asked 🤫":v==="active"?"Kiko will keep a closer eye out ✨":"Kiko will check in gently 🌸"); render(); },
  kikoClearChat(){ try{ kikoReflect(); }catch(_){}   // learn from the chat before clearing it
    KIKO.log=[]; KIKO._spoken=-1; KIKO.sinceReflect=0; saveKikoLog(); paintKiko(); toast("fresh page ❄️"); },
  async delMemory(el){ const id=el.dataset.v; await setSent(n=>({...n,kikoMemory:(n.kikoMemory||[]).filter(m=>m.id!==id)})); toast("forgotten 🧠"); render(); },
  async clearUserModel(){ await setSent(n=>({...n,kikoUserModel:""})); toast("Kiko will get to know you fresh 🦊"); render(); },
  healthReport(){ showHealthReport(); },
  copyHealthReport(){ const el=$("#hrText"); const t=el?el.innerText:buildHealthReport(); if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t); toast("copied 📋"); },
  printHealthReport(){ const t=$("#hrText")?$("#hrText").innerText:buildHealthReport(); const w=window.open("","_blank"); if(!w){ toast("allow pop-ups to print 🌸"); return; }
    w.document.write(`<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;font-size:13px;line-height:1.55;padding:24px">${esc(t)}</pre>`); w.document.close(); setTimeout(()=>{ try{w.print();}catch(e){} },300); },
  kikoMaximize(){ state.kikoReturn=(state.tab==="kiko")?(state.kikoReturn||"home"):state.tab; KIKO.open=false; const c=$("#kikoChat"); if(c)c.classList.add("hidden"); kikoState="walk"; setTab("kiko"); },
  kikoMinimize(){ setTab(state.kikoReturn||"home"); },
  kikoSkill(el){ const inp=kikoInputEl(); if(!inp)return; if(el.dataset.send!=null){ inp.value=el.dataset.send; H.kikoSend(); } else { inp.value=el.dataset.seed||""; try{inp.focus();}catch(_){} } },
  /* image understanding now lives in the main agent — Kiko sees designs, DMs, screenshots, food, anything,
     and logs food himself via logFood actions when that's what you want */
  kikoSmartToggle(){ const v=localStorage.getItem("kiko-smart")==="1"?"0":"1"; localStorage.setItem("kiko-smart",v);
    toast(v==="1"?"big brain on for this conversation 💪":"back to auto brains ❄️"); render(); },

  // --- Optimize ---
  // --- sponsors ---
  async addSponsor(){ const g=id=>{const e=$("#"+id);return e?e.value.trim():"";}; const name=g("sp_name"); if(!name){toast("name please 💜");return;}
    await setSent(n=>({...n,sponsors:[...(n.sponsors||[]),{id:"sp"+Date.now(),name,code:g("sp_code"),payout:g("sp_payout"),url:g("sp_url"),note:g("sp_note"),due:g("sp_due")||undefined,status:"pending"}]})); toast("added 💜"); render(); },
  async delSponsor(el){ const id=el.dataset.v; await setSent(n=>({...n,sponsors:(n.sponsors||[]).filter(s=>s.id!==id)})); render(); },
  async draftStreams(){ const wk=weekStartISO(0);
    const ge=(state.sentinel.calendarEvents||[]).filter(gameSrc).filter(e=>{ const diff=daysBetween(wk,e.date); return diff>=0&&diff<7&&e.date>=TODAY; });
    if(!ge.length){ toast("no game beats this week 🌸"); return; }
    await setWeekSlots(wk,arr=>{ const out=arr.slice();
      ge.forEach(e=>{ const wd=DOW_ORDER[(new Date(e.date+"T00:00").getDay()+6)%7]; if(out.some(r=>r.day===wd&&(r.show||"")===e.title))return;   // already drafted — never duplicate
        out.push({id:"sc"+Date.now()+Math.floor(Math.random()*1000),day:wd,show:e.title,time:STREAM_TIME_DEFAULT}); }); return out; });
    toast("drafted streams 📅"); state.tab="home"; state.schedEdit=true; render(); },
  async saveDebrief(){ const g=id=>{const e=$("#"+id);return e?e.value.trim():"";}; const game=g("db_game"), note=g("db_note"), vibe=Number(g("db_vibe"))||null;
    if(!game&&!note){ toast("add a word or two first 🌸"); return; }
    await setSent(n=>({...n,streamLog:[...(n.streamLog||[]),{id:"sl"+Date.now(),date:TODAY,game,vibe,note}].slice(-40)})); toast("debrief saved 🎬"); render(); },
  async delDebrief(el){ const id=el.dataset.id; await setSent(n=>({...n,streamLog:(n.streamLog||[]).filter(d=>d.id!==id)})); render(); },
  async spCycle(el){ const id=el.dataset.v, order=["pending","active","done"]; await setSent(n=>({...n,sponsors:(n.sponsors||[]).map(s=>s.id===id?{...s,status:order[(order.indexOf(s.status||"pending")+1)%3]}:s)})); render(); },
  // --- money ---
  moneyDir(el){ const g=id=>{const e=$("#"+id);return e?e.value:"";};
    state.moneyDraft={date:g("mn_date")||TODAY,amount:g("mn_amount"),desc:g("mn_desc")};   // the toggle must never eat what she typed
    state.moneyDir=el.dataset.v; render(); },
  async addMoney(){ const g=id=>{const e=$("#"+id);return e?e.value:"";}; const amt=parseFloat(g("mn_amount")); if(isNaN(amt)||amt<=0){ toast("enter an amount 💶"); return; }
    const item={id:"mny"+Date.now(), date:g("mn_date")||TODAY, dir:(state.moneyDir||"in"), cat:g("mn_cat")||"Other", amount:Math.round(amt*100)/100, desc:g("mn_desc").trim()};
    state.moneyDraft=null;
    await setSent(n=>({...n,money:[...(n.money||[]),item]})); state.moneyYear=String(item.date).slice(0,4); toast("logged 💶"); render(); },
  async delMoney(el){ const id=el.dataset.v; await setSent(n=>({...n,money:(n.money||[]).filter(t=>t.id!==id)})); render(); },
  exportMoneyCSV(){ const y=moneyYear(); const tx=moneyEntries(y).slice().sort(cmpDate);
    const rows=[["date","direction","category","amount_eur","description"]].concat(tx.map(t=>[t.date,t.dir==="in"?"income":"expense",t.cat||"",(+t.amount||0).toFixed(2),t.desc||""]));
    downloadFile(`mifuyu-money-${y}.csv`, rows.map(r=>r.map(csvCell).join(",")).join("\n"), "text/csv"); toast("exported 💜"); },
  exportMoneySummary(){ const y=moneyYear(); downloadFile(`mifuyu-tax-summary-${y}.txt`, moneySummaryText(y), "text/plain"); toast("exported 💜"); },
  exportTaxPrep(){ const y=moneyYear(); const tp=(state.sentinel.taxPrep||{})[y]; if(!tp||!tp.items){ toast("nothing to export yet"); return; }
    const txt=`MIFUYU — TAX-PREP CHECKLIST ${y}\n\n`+tp.items.map(x=>`• ${x.q}\n   → ${x.a}`).join("\n\n")+"\n"; downloadFile(`mifuyu-taxprep-${y}.txt`, txt, "text/plain"); toast("exported 💜"); },
  // tax-prep wizard (Kiko walks her through what to gather)
  startTaxPrep(){ const year=moneyYear(); KIKO.tax={active:true, step:0, year, log:[]};
    if(state.tab!=="kiko") H.openKikoChatPanel();
    KIKO.log.push({role:"pet",text:`Tax season for ${year}! 🧾 I'll walk you through everything to gather for your accountant — just tell me what you've got (or jot a note) after each one, and say "stop" anytime. ❄️🦊`});
    KIKO.log.push({role:"pet",text:TAX_STEPS[0]}); KIKO.tax.log.push({who:"Kiko",text:TAX_STEPS[0]}); paintKiko(); },
  async kikoTaxReply(answer){
    const J=KIKO.tax; if(!J)return; J.log.push({who:"Mifu",text:answer});
    if(/^(stop|cancel|nvm|never ?mind|quit|exit|done)\.?$/i.test(answer)){ J.active=false; KIKO.log.push({role:"pet",text:"okay, we can pick this up whenever — your progress is safe 💗"}); paintKiko(); if(J.items&&J.items.length)await saveTaxPrep(J); return; }
    J.items=J.items||[]; J.items.push({q:TAX_STEPS[J.step], a:answer}); J.step++;
    if(J.step<TAX_STEPS.length){ KIKO.log.push({role:"pet",text:["got it ✓","noted ❄️","perfect 💜","saved ✓"][Math.floor(Math.random()*4)]}); KIKO.log.push({role:"pet",text:TAX_STEPS[J.step]}); J.log.push({who:"Kiko",text:TAX_STEPS[J.step]}); paintKiko(); return; }
    J.active=false;
    KIKO.log.push({role:"pet",text:`That's everything for ${J.year}! 🎉 Hand these to your accountant, and pop over to the Money tab to tap "Accountant summary" — I'll export your income, expenses and this checklist in one file. You've got this. 💗🦊`}); paintKiko();
    await saveTaxPrep(J);
    if(state.tab==="money"){ try{ await render(); }catch(_){} } },
  optMode(el){ OPT.mode=el.dataset.v; OPT.err=""; render(); },
  optDrops(){ OPT.drops=!OPT.drops; render(); },
  async optChannel(){ OPT.busy="channel"; OPT.err=""; render(); try{ const d=await aiCall("channelSnapshot",{handle:CONFIG.youtube.handle,channelId:CONFIG.youtube.channelId}); OPT.channel=d.snapshot||d; }catch(e){ OPT.err=e.message; } OPT.busy=""; render(); },
  async optVideo(){ const title=oval("ovTitle"),topic=oval("ovAbout"),format=oval("ovFormat"),platform=oval("ovPlatform"),vidiq=oval("optVidiq");
    if(!title&&!topic){ toast("add a title or topic first"); return; }
    OPT.busy="video"; OPT.err=""; render();
    try{ OPT.video=await aiCall("optimize",{kind:"video",title,format,platform,topic,footer:descTemplate()}, vidiq||null); }catch(e){ OPT.err=e.message; } OPT.busy=""; render(); },
  async optStream(){ const game=oval("osGame"),special=oval("osSpecial"),vidiq=oval("optVidiq"); if(!game){ toast("name the game/focus first"); return; }
    const topic=(OPT.drops?"DROPS ARE ACTIVE. ":"")+special;
    OPT.busy="stream"; OPT.err=""; render();
    try{ OPT.stream=await aiCall("optimize",{kind:"livestream",title:game,topic,footer:descTemplate()}, vidiq||null); }catch(e){ OPT.err=e.message; } OPT.busy=""; render(); },
  async saveDescTemplate(){ const el=$("#descTmpl"); const t=el?el.value:""; await setSent(n=>({...n,descTemplate:t})); toast("description template saved 📋✨"); render(); },
  async resetDescTemplate(){ await setSent(n=>({...n,descTemplate:""})); toast("back to the default template ↺"); render(); },
  async thumbCheck(){ if(!OPT.thumbData){ toast("upload a thumbnail first"); return; }
    const title=oval("ovTitle")||oval("osGame");
    OPT.busy="thumb"; OPT.err=""; render(); try{ OPT.thumb=await aiCall("thumbnail",{image:OPT.thumbData,title}); }catch(e){ OPT.err=e.message; } OPT.busy=""; render(); },
  copyText(el){ const t=optCopy(el.dataset.k); const ok=()=>toast("copied 📋");
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(ok,()=>ok()); } else { ok(); } },
};

async function addSub(taskId,text){ text=(text||"").trim(); if(!text) return;
  await setSent(n=>({...n,tasks:(n.tasks||[]).map(t=>t.id===taskId?{...t,sub:[...(t.sub||[]),{id:"s"+Date.now(),text,done:false}]}:t)})); render(); }

document.addEventListener("keydown",async e=>{
  if(e.key!=="Enter") return; const t=e.target;
  // Kiko chat: Enter sends, Shift+Enter drops to a new line (so she can write longer messages)
  if(t.id==="kikoInput"||t.id==="kikoTabInput"){ if(e.shiftKey) return; e.preventDefault(); H.kikoSend(); return; }
  if(e.shiftKey) return;
  if(t.id==="plnText"){ e.preventDefault(); H.addTask(); }
  else if(t.dataset && t.dataset.subfor){ e.preventDefault(); const id=t.dataset.subfor, v=t.value; t.value=""; await addSub(id,v); }
  else if(t.id==="capInput"){ e.preventDefault(); H.capAdd(); }
  else if(t.id==="goalWeek"){ e.preventDefault(); H.addGoal({dataset:{p:'week'}}); }
  else if(t.id==="goalMonth"){ e.preventDefault(); H.addGoal({dataset:{p:'month'}}); }
});

document.addEventListener("change",e=>{
  const t=e.target; if(!t) return;
  if(t.id==="thumbFile"){
    const f=t.files&&t.files[0]; if(!f) return;
    if(f.size>4*1024*1024){ toast("image a bit big — try under 4MB"); return; }
    const r=new FileReader(); r.onload=()=>{ OPT.thumbData=r.result; OPT.thumb=null; render(); }; r.readAsDataURL(f);
  } else if(t.id==="foodFile"){
    const f=t.files&&t.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{
      const max=1024; let w=img.width,h=img.height; const sc=Math.min(1,max/Math.max(w,h)); w=Math.round(w*sc); h=Math.round(h*sc);
      const c=document.createElement("canvas"); c.width=w; c.height=h; c.getContext("2d").drawImage(img,0,0,w,h);
      if(!state.foodDraft)state.foodDraft={image:null,desc:"",est:null};
      const ta=$("#foodDesc"); if(ta)state.foodDraft.desc=ta.value;   // keep any typed note
      try{ state.foodDraft.image=c.toDataURL("image/jpeg",0.82); }catch(e){ state.foodDraft.image=r.result; }
      render();
    }; img.onerror=()=>{ if(!state.foodDraft)state.foodDraft={image:null,desc:"",est:null}; state.foodDraft.image=r.result; render(); }; img.src=r.result; };
    r.readAsDataURL(f);
  } else if(t.id==="kikoFile"||t.id==="kikoTabFile"){
    const files=t.files?[...t.files]:[]; if(!files.length) return;
    const ta=kikoInputEl(); const keep=ta?ta.value:"";   // don't lose a typed note on re-paint
    files.slice(0,8).forEach(f=>{ const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{
      const max=1024; let w=img.width,h=img.height; const sc=Math.min(1,max/Math.max(w,h)); w=Math.round(w*sc); h=Math.round(h*sc);
      const c=document.createElement("canvas"); c.width=w; c.height=h; c.getContext("2d").drawImage(img,0,0,w,h);
      try{ KIKO.pendingImages.push(c.toDataURL("image/jpeg",0.82)); }catch(e){ KIKO.pendingImages.push(r.result); }
      paintKiko(); const ni=kikoInputEl(); if(ni&&keep){ ni.value=keep; }
    }; img.onerror=()=>{ KIKO.pendingImages.push(r.result); paintKiko(); const ni=kikoInputEl(); if(ni&&keep){ni.value=keep;} }; img.src=r.result; }; r.readAsDataURL(f); });
    t.value="";   // allow re-selecting the same file later
  } else if(t.id==="artFile"){
    const f=t.files&&t.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=async()=>{
      const max=768; let w=img.width,h=img.height; const sc=Math.min(1,max/Math.max(w,h)); w=Math.round(w*sc); h=Math.round(h*sc);
      const c=document.createElement("canvas"); c.width=w; c.height=h; c.getContext("2d").drawImage(img,0,0,w,h);
      let data; try{ data=c.toDataURL("image/jpeg",0.8); }catch(e){ data=r.result; }
      const txt=($("#inspoText")&&$("#inspoText").value||"").trim();
      await setSent(n=>({...n,inspoVault:[...(n.inspoVault||[]),{id:"iv"+Date.now(),kind:"img",text:txt,img:data}].slice(-40)}));
      state.inspoDraft=null; toast("reference parked 🖼️"); render();
    }; img.src=r.result; }; r.readAsDataURL(f); t.value="";
  } else if(t.id==="emoteFile"){
    const f=t.files&&t.files[0]; if(!f) return; t.value="";
    const r=new FileReader(); r.onload=()=>{ if(!state.art)state.art={}; state.art.emote={data:r.result,size:f.size,name:f.name}; render(); }; r.readAsDataURL(f);
  } else if(t.id==="notanFile"){
    const f=t.files&&t.files[0]; if(!f) return; t.value="";
    const r=new FileReader(); r.onload=()=>{ if(!state.art)state.art={}; state.art.notan={data:r.result}; render(); setTimeout(artNotanPaint,80); }; r.readAsDataURL(f);
  } else if(t.id==="mbFile"){
    const files=t.files?[...t.files]:[]; if(!files.length) return;
    (async()=>{ let added=0;
      for(const f of files){ try{ const {url,ar}=await mbFileToDataURL(f); const w=180, h=Math.max(100,Math.min(260,Math.round(180/ar)));
        const ox=24+Math.floor(Math.random()*70), oy=24+Math.floor(Math.random()*60);
        await setSent(n=>({...n,artBoard:[...(n.artBoard||[]),{id:aid("b"),type:"img",url,x:ox,y:oy,w,h}]})); added++;
      }catch(e){} }
      t.value=""; if(added)toast(added+" image"+(added>1?"s":"")+" on the board 🖼️"); render();
    })();
  } else if(t.id==="artGType"){ if(!state.art)state.art={}; state.art.gType=t.value; render();
  } else if(t.id==="artSpokes"){ if(!state.art)state.art={}; state.art.gSpokes=parseInt(t.value)||12; render();
  } else if(t.id==="artBase"){ if(!state.art)state.art={}; state.art.pBase=t.value; render();
  } else if(t.dataset && t.dataset.mbnote){ const idn=t.dataset.mbnote;
    setSent(n=>({...n,artBoard:(n.artBoard||[]).map(c=>c.id===idn?{...c,text:t.value}:c)})).catch(()=>{});
  } else if(t.id==="moneyYear"){ const g=id=>{const e=$("#"+id);return e?e.value:"";};
    state.moneyDraft={date:g("mn_date")||TODAY,amount:g("mn_amount"),desc:g("mn_desc")};
    state.moneyYear=t.value; render();
  } else if(t.dataset && t.dataset.sched){ const id=t.dataset.sched, k=t.dataset.k, v=t.value, wk=weekStartISO(state.schedWeekOff||0);
    setWeekSlots(wk,arr=>arr.map(r=>r.id===id?{...r,[k]:v}:r)); // fire-and-forget; writes to the active week (override or usual)
  } else if(t.dataset && t.dataset.medrefill){ const id=t.dataset.medrefill, v=t.value;
    setSent(n=>({...n,medsList:(n.medsList||[]).map(m=>m.id===id?{...m,refill:v||undefined}:m)})).then(()=>render());
  } else if(t.dataset && t.dataset.spdue){ const id=t.dataset.spdue, v=t.value;
    setSent(n=>({...n,sponsors:(n.sponsors||[]).map(sp=>sp.id===id?{...sp,due:v||undefined}:sp)})).then(()=>render());
  } else if(t.dataset && t.dataset.act==="jrUploadAsset"){
    H.jrUploadAsset(t).catch(e=>toast("Upload error: "+e.message));
    t.value="";
  }
});

window._lastPtr="mouse";
 document.addEventListener("pointerdown",e=>{ window._lastPtr=e.pointerType||"mouse"; },true);
   // pen/touch must not trigger native HTML5 drags
/* ===================== UNIVERSAL VOICE CAPTURE (#5) ===================== */
const VOICE_CATS=[
  ["stream","🔴","Stream Idea"],
  ["content","🎬","Content Idea"],
  ["task","✅","Task"],
  ["journal","📓","Journal Thought"],
  ["personal","🌸","Personal Note"],
  ["random","💭","Random"],
];

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);

let voiceRec=null, voiceBaseText="";

function voiceOpenModal(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canSpeak = !IS_IOS && !!SR;
  const cats=VOICE_CATS.map(([v,e,l])=>`<option value="${v}">${e} ${l}</option>`).join("");
  const hint = IS_IOS
    ? `iOS voice input works best through your Apple keyboard — tap the 🎤 mic on your keyboard and start talking. 💗`
    : (canSpeak
        ? `Tap 🎙️ Start talking and I'll write it down — or just type. You can always fix the words after.`
        : `Your browser can't do live voice here, so just type or use your keyboard's mic. Still totally low-friction. 💗`);
  $("#modal").innerHTML=`<div class="modal-bg" data-act="closeModal"><div class="modal" data-act="noop" style="max-width:480px">
    <div class="card-head"><h3 style="font-size:16px">🎙️ Capture a thought</h3><button class="btn" data-act="closeModal">✕</button></div>
    <p class="soft" style="font-size:12px;margin:0 0 10px;line-height:1.5">${hint}</p>
    <textarea id="voiceText" class="inp" rows="5" placeholder="What's on your mind?" style="width:100%;resize:vertical;font-size:15px;line-height:1.55"></textarea>
    ${canSpeak?`<button class="btn" id="voiceMicBtn" data-act="voiceMic" style="margin-top:8px">🎙️ Start talking</button>`:""}
    <div class="field" style="margin-top:12px"><div class="label">Save as</div>
      <select class="inp" id="voiceCat">${cats}</select></div>
    <button class="btn btn-grad" data-act="voiceSave" style="width:100%;margin-top:12px">💾 Save to Kiko's Context Bank</button>
    <p class="soft" style="font-size:10.5px;margin:10px 0 0">Stays right here on your device — feeds Kiko's context, no outside services. 🫧</p>
  </div></div>`;
  const ta=$("#voiceText"); if(ta){ setTimeout(()=>{ ta.focus(); if(canSpeak) voiceToggleMic(); },60); }
}

function voiceToggleMic(){
  if(voiceRec){ voiceStopMic(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if(!SR){ toast("voice isn't available — type away 🌱"); return; }
  const ta=$("#voiceText"); if(!ta)return;
  voiceBaseText = ta.value ? ta.value.replace(/\s*$/,"")+" " : "";
  try{
    voiceRec=new SR(); voiceRec.lang="en-US"; voiceRec.interimResults=true; voiceRec.continuous=true;
    voiceRec.onresult=ev=>{ let txt=""; for(let i=0;i<ev.results.length;i++){ txt+=ev.results[i][0].transcript; } ta.value=voiceBaseText+txt; };
    voiceRec.onerror=()=>{ toast("mic hiccup — keep typing 🌸"); voiceStopMic(); };
    voiceRec.onend=()=>{ voiceStopMic(); };
    voiceRec.start();
    const b=$("#voiceMicBtn"); if(b){ b.textContent="⏹ Stop"; } const f=$("#voiceFab"); if(f)f.classList.add("listening");
  }catch(_){ toast("couldn't start the mic — type away 🌱"); voiceRec=null; }
}

function voiceStopMic(){ if(voiceRec){ try{voiceRec.stop();}catch(_){} voiceRec=null; } const b=$("#voiceMicBtn"); if(b){ b.textContent="🎙️ Start talking"; } const f=$("#voiceFab"); if(f)f.classList.remove("listening"); }


/* shortcut: Alt+R or Ctrl+Space — never while typing in a field */
document.addEventListener("keydown",e=>{
  const t=e.target, typing = t && (t.tagName==="INPUT"||t.tagName==="TEXTAREA"||t.isContentEditable);
  if(typing) return;
  if((e.altKey && (e.key==="r"||e.key==="R")) || (e.ctrlKey && e.code==="Space")){
    e.preventDefault(); voiceOpenModal();
  }
});


document.addEventListener("click",async e=>{ const el=e.target.closest("[data-act]"); if(!el)return; const fn=H[el.dataset.act];
  if(fn){ try{ await fn(el); }catch(err){ console.error(err); toast("hmm, try again"); } } });

// same delegation for elements whose handler fires on input/change rather than click (sliders, file pickers)
document.addEventListener("input",e=>{ const el=e.target.closest("[data-act-input]"); if(!el)return; const fn=H[el.dataset.actInput]; if(fn) fn(el); });

document.addEventListener("change",async e=>{ const el=e.target.closest("[data-act-change]"); if(!el)return; const fn=H[el.dataset.actChange]; if(fn){ try{ await fn(el); }catch(err){ console.error(err); toast("hmm, try again"); } } });

// CSP-safe replacement for inline onerror= attributes on <img> tags
document.addEventListener("error",e=>{
  const img=e.target; if(!img||img.tagName!=="IMG")return;
  if(img.dataset.fallback&&img.src!==img.dataset.fallback){ img.src=img.dataset.fallback; return; }
  if(img.dataset.hideOnError!=null) img.style.display="none";
},true);

/* ===== 🎨 mood-board: freeform drag + resize of cards (Milanote-style) ===== */
(function(){
  let mbDrag=null, mbRz=null;
  document.addEventListener("pointerdown",e=>{
    const rzh=e.target.closest("[data-mbrz]");
    if(rzh){ const card=rzh.closest(".mb-card"); if(!card)return; mbRz={id:rzh.getAttribute("data-mbrz"),card,sx:e.clientX,sy:e.clientY,w:card.offsetWidth,h:card.offsetHeight}; try{rzh.setPointerCapture(e.pointerId);}catch(_){} e.preventDefault(); e.stopPropagation(); return; }
    if(e.target.closest("textarea,button,.mb-hex"))return;
    const card=e.target.closest(".mb-card"); if(!card)return;
    const board=document.getElementById("moodBoard"); if(!board)return; const br=board.getBoundingClientRect(), cr=card.getBoundingClientRect();
    mbDrag={id:card.getAttribute("data-mb"),card,br,ox:e.clientX-cr.left,oy:e.clientY-cr.top};
    card.style.zIndex=60; try{card.setPointerCapture(e.pointerId);}catch(_){} e.preventDefault();
  },true);
  document.addEventListener("pointermove",e=>{
    if(mbRz){ const w=Math.max(56,mbRz.w+(e.clientX-mbRz.sx)), h=Math.max(44,mbRz.h+(e.clientY-mbRz.sy)); mbRz.card.style.width=w+"px"; mbRz.card.style.height=h+"px"; return; }
    if(!mbDrag)return; let x=e.clientX-mbDrag.br.left-mbDrag.ox, y=e.clientY-mbDrag.br.top-mbDrag.oy; x=Math.max(0,Math.min(x,mbDrag.br.width-28)); y=Math.max(0,Math.min(y,mbDrag.br.height-18)); mbDrag.card.style.left=x+"px"; mbDrag.card.style.top=y+"px";
  },true);
  document.addEventListener("pointerup",async()=>{
    if(mbRz){ const id=mbRz.id,w=parseInt(mbRz.card.style.width)||mbRz.card.offsetWidth,h=parseInt(mbRz.card.style.height)||mbRz.card.offsetHeight; mbRz=null; try{await mbUpdate(id,{w,h});}catch(_){} render(); return; }
    if(!mbDrag)return; const id=mbDrag.id,x=parseInt(mbDrag.card.style.left)||0,y=parseInt(mbDrag.card.style.top)||0; mbDrag=null; try{await mbUpdate(id,{x,y});}catch(_){} render(); return;
  },true);
  document.addEventListener("pointercancel",()=>{ if(!mbDrag&&!mbRz)return; mbDrag=null; mbRz=null; try{render();}catch(_){} },true);
})();

/* ===== 📚 tools & tutorials: drag rows to reorder ===== */
(function(){
  let rr=null;
  document.addEventListener("pointerdown",e=>{
    const g=e.target.closest("[data-resgrip]"); if(!g)return;
    const row=g.closest("[data-resid]"), list=document.getElementById("artResList"); if(!row||!list)return;
    rr={row,list}; row.style.opacity=".55"; row.style.boxShadow="0 6px 18px rgba(90,100,150,.25)"; try{g.setPointerCapture(e.pointerId);}catch(_){} e.preventDefault();
  },true);
  document.addEventListener("pointermove",e=>{
    if(!rr)return; const rows=[...rr.list.querySelectorAll("[data-resid]")];
    const after=rows.find(r=>{ if(r===rr.row)return false; const b=r.getBoundingClientRect(); return e.clientY < b.top+b.height/2; });
    if(after){ if(after!==rr.row.nextSibling) rr.list.insertBefore(rr.row,after); } else rr.list.appendChild(rr.row);
  },true);
  document.addEventListener("pointerup",async()=>{
    if(!rr)return; const order=[...rr.list.querySelectorAll("[data-resid]")].map(r=>r.getAttribute("data-resid"));
    rr.row.style.opacity=""; rr.row.style.boxShadow=""; rr=null;
    try{ await setSent(n=>{ const cur=(n.artResources&&n.artResources.length)?n.artResources:DEFAULT_ART_RES; const by={}; cur.forEach(x=>by[x.id]=x);
      const next=order.map(id=>by[id]).filter(Boolean); cur.forEach(x=>{ if(!next.includes(x))next.push(x); }); return {...n,artResources:next}; }); }catch(_){}
    render();
  },true);
  document.addEventListener("pointercancel",()=>{ if(rr){ rr.row.style.opacity=""; rr.row.style.boxShadow=""; rr=null; } },true);
})();

/* ===== 🕐 hero clock — keeps the big 24h clock honest without re-rendering the page ===== */
setInterval(()=>{ try{
  const gc=document.getElementById("ghClock"); if(gc) gc.textContent=nowHM();
}catch(e){} },15000);

// global undo — Ctrl+Z / ⌘Z rolls back the last data change, unless you're typing in a field (native undo wins there)
document.addEventListener("keydown",e=>{
  if((e.key==="z"||e.key==="Z") && (e.ctrlKey||e.metaKey) && !e.shiftKey && !e.altKey){
    const t=e.target, tag=t&&t.tagName;
    if(tag==="INPUT"||tag==="TEXTAREA"||(t&&t.isContentEditable)) return;   // let the textbox handle its own undo
    e.preventDefault(); undoLast();
  }
});


/* ===================== BREATHING (JS paced) ===================== */
let breathRAF=null;

function startBreath(){
  const bub=$("#bubble"), lab=$("#breathLabel"); if(!bub)return;
  if(breathRAF){ cancelAnimationFrame(breathRAF); clearInterval(breathRAF); breathRAF=null; } // idempotent — never stack loops
  if(PREF.calm){
    let phase=0; const words=["breathe in… (4)","hold… (2)","breathe out… (6)"];
    lab.textContent=words[0];
    breathRAF=setInterval(()=>{ phase=(phase+1)%3; lab.textContent=words[phase]; },4000); return;
  }
  const IN=4000,HOLD=2000,OUT=6000,CYCLE=IN+HOLD+OUT, MIN=.62,MAX=1.18;
  const t0=performance.now();
  function frame(now){
    const t=(now-t0)%CYCLE; let scale,word;
    if(t<IN){ scale=MIN+(MAX-MIN)*(t/IN); word="breathe in…"; }
    else if(t<IN+HOLD){ scale=MAX; word="hold…"; }
    else { const o=(t-IN-HOLD)/OUT; scale=MAX-(MAX-MIN)*o; word="breathe out…"; }
    bub.style.transform="scale("+scale.toFixed(3)+")"; lab.textContent=word;
    breathRAF=requestAnimationFrame(frame);
  }
  breathRAF=requestAnimationFrame(frame);
}

function stopBreath(){ if(breathRAF){ cancelAnimationFrame(breathRAF); clearInterval(breathRAF); breathRAF=null; }
  const bub=$("#bubble"),lab=$("#breathLabel"); if(bub)bub.style.transform="scale(.72)"; if(lab)lab.textContent="ready"; }


/* ===================== STICKY NOTES (rich text + resizable) ===================== */
const STICKY_COLORS=["#fde2f2","#e6ecfb","#dcf3eb","#e2f0fb","#ece2fb","#fdeadb"];

const STICKY_W=200, STICKY_H=150;

const STICKY_TOOLS=[["bold","B","font-weight:800"],["italic","i","font-style:italic"],["underline","U","text-decoration:underline"],
  ["strikeThrough","S","text-decoration:line-through"],["small","A-",""],["big","A+",""],["head","H","font-weight:800"]];

function stickyHTML(s){ return (s.html!=null) ? s.html : esc(s.text||""); }

async function persistStickies(list){ state.sentinel.stickies=list; await DB.saveDaily(SENTINEL,n=>({...n,stickies:list})); }

async function addSticky(text){
  const note={ id:"sk"+Date.now(), html:text?esc(text):"", color:STICKY_COLORS[Math.floor(Math.random()*STICKY_COLORS.length)],
    x:0.30+Math.random()*0.4, y:0.30+Math.random()*0.3, w:STICKY_W, h:STICKY_H };
  await persistStickies([...(state.sentinel.stickies||[]),note]); renderStickies();
}

function renderStickies(){
  const layer=$("#stickyLayer"); if(!layer)return;
  const list=state.sentinel.stickies||[];
  layer.innerHTML=list.map(s=>{ const w=Math.min(s.w||STICKY_W,Math.max(140,window.innerWidth-16)), h=Math.min(s.h||STICKY_H,Math.max(110,window.innerHeight-16));
    const sx=Math.max(0,Math.min(1,s.x==null?0.5:s.x)), sy=Math.max(0,Math.min(1,s.y==null?0.4:s.y));   // clamp so a too-wide note / bad value can't strand it off-screen
    const left=Math.round(sx*Math.max(0,window.innerWidth-w));
    const top=Math.round(sy*Math.max(0,window.innerHeight-h));
    return `<div class="sticky" data-id="${s.id}" style="left:${left}px;top:${top}px;width:${w}px;height:${h}px;background:${s.color}">
      <div class="sticky-head" data-drag="${s.id}">
        <div class="sticky-tools">${STICKY_TOOLS.map(([cmd,lab,st])=>`<button data-fmt="${cmd}" data-sid="${s.id}" title="${cmd}" style="${st}">${lab}</button>`).join("")}</div>
        <button class="sticky-color" data-stcolor="${s.id}" title="colour">🎨</button>
        <button class="sticky-x" data-stx="${s.id}" title="delete">✕</button>
      </div>
      <div class="sticky-swatches hidden" data-swatch="${s.id}">${STICKY_COLORS.map(c=>`<button data-setcolor="${s.id}" data-c="${c}" style="background:${c}" title="${c}"></button>`).join("")}</div>
      <div class="sticky-body" contenteditable="true" data-sthtml="${s.id}" data-ph="write something…">${stickyHTML(s)}</div>
      <div class="sticky-resize" data-resize="${s.id}"></div>
    </div>`; }).join("");
  layer.querySelectorAll('[data-stx]').forEach(b=>b.onclick=async()=>{ await persistStickies((state.sentinel.stickies||[]).filter(x=>x.id!==b.dataset.stx)); renderStickies(); });
  layer.querySelectorAll('[data-sthtml]').forEach(el=>{ el.onblur=async()=>{ const id=el.dataset.sthtml, html=el.innerHTML;
    await persistStickies((state.sentinel.stickies||[]).map(x=>x.id===id?{...x,html,text:undefined}:x)); }; });
  layer.querySelectorAll('[data-fmt]').forEach(b=>b.addEventListener('pointerdown',ev=>{ ev.preventDefault(); ev.stopPropagation();
    const body=layer.querySelector('[data-sthtml="'+b.dataset.sid+'"]'); if(body) body.focus(); fmtCmd(b.dataset.fmt); }));
  // colour: tap 🎨 to open the swatch popover, tap a swatch to recolour the note
  layer.querySelectorAll('[data-stcolor]').forEach(b=>b.addEventListener('pointerdown',ev=>{ ev.preventDefault(); ev.stopPropagation();
    const pop=layer.querySelector('[data-swatch="'+b.dataset.stcolor+'"]');
    layer.querySelectorAll('.sticky-swatches').forEach(p=>{ if(p!==pop) p.classList.add('hidden'); });
    if(pop) pop.classList.toggle('hidden'); }));
  layer.querySelectorAll('[data-setcolor]').forEach(b=>b.addEventListener('pointerdown',async ev=>{ ev.preventDefault(); ev.stopPropagation();
    const id=b.dataset.setcolor, c=b.dataset.c;
    await persistStickies((state.sentinel.stickies||[]).map(x=>x.id===id?{...x,color:c}:x)); renderStickies(); }));
  layer.querySelectorAll('[data-drag]').forEach(h=>{ h.onpointerdown=ev=>{ if(ev.target.closest('[data-fmt],[data-stx],[data-stcolor]')) return; startDrag(ev,h.dataset.drag); }; });
  layer.querySelectorAll('[data-resize]').forEach(h=>{ h.onpointerdown=ev=>startResize(ev,h.dataset.resize); });
}

function fmtCmd(cmd){
  if(cmd==="big") document.execCommand('fontSize',false,'5');
  else if(cmd==="small") document.execCommand('fontSize',false,'2');
  else if(cmd==="head"){ document.execCommand('fontSize',false,'6'); document.execCommand('bold',false,null); }
  else document.execCommand(cmd,false,null);
}

let dragInfo=null;

function startDrag(ev,id){ ev.preventDefault(); const el=ev.target.closest('.sticky');
  dragInfo={ id, el, dx:ev.clientX-el.offsetLeft, dy:ev.clientY-el.offsetTop };
  window.addEventListener('pointermove',onDrag); window.addEventListener('pointerup',endDrag,{once:true}); window.addEventListener('pointercancel',endDrag,{once:true}); }
   /* palm rejection cancels constantly with the Pencil */
function onDrag(ev){ if(!dragInfo)return; const el=dragInfo.el;
  let x=Math.max(0,Math.min(ev.clientX-dragInfo.dx,window.innerWidth-el.offsetWidth));
  let y=Math.max(0,Math.min(ev.clientY-dragInfo.dy,window.innerHeight-el.offsetHeight));
  el.style.left=x+"px"; el.style.top=y+"px"; }

async function endDrag(){ window.removeEventListener('pointermove',onDrag); if(!dragInfo)return;
  const el=dragInfo.el, id=dragInfo.id; const x=Math.max(0,Math.min(1,el.offsetLeft/Math.max(1,window.innerWidth-el.offsetWidth))), y=Math.max(0,Math.min(1,el.offsetTop/Math.max(1,window.innerHeight-el.offsetHeight)));
  await persistStickies((state.sentinel.stickies||[]).map(s=>s.id===id?{...s,x,y}:s)); dragInfo=null; }

let resizeInfo=null;

function startResize(ev,id){ ev.preventDefault(); ev.stopPropagation(); const el=ev.target.closest('.sticky');
  resizeInfo={ id, el, sx:ev.clientX, sy:ev.clientY, sw:el.offsetWidth, sh:el.offsetHeight };
  window.addEventListener('pointermove',onResize); window.addEventListener('pointerup',endResize,{once:true}); window.addEventListener('pointercancel',endResize,{once:true}); }

function onResize(ev){ if(!resizeInfo)return; const el=resizeInfo.el;
  el.style.width=Math.max(140,resizeInfo.sw+(ev.clientX-resizeInfo.sx))+"px";
  el.style.height=Math.max(110,resizeInfo.sh+(ev.clientY-resizeInfo.sy))+"px"; }

async function endResize(){ window.removeEventListener('pointermove',onResize); if(!resizeInfo)return;
  const el=resizeInfo.el, id=resizeInfo.id, w=el.offsetWidth, h=el.offsetHeight;
  await persistStickies((state.sentinel.stickies||[]).map(s=>s.id===id?{...s,w,h}:s)); resizeInfo=null; }

window.addEventListener('resize',()=>{ if(!dragInfo&&!resizeInfo) renderStickies(); });
   // don't rebuild (detach) a sticky that's mid drag/resize
window.addEventListener('resize',()=>{ try{ const c=$("#kikoChat"); if(c&&!c.classList.contains("hidden")){ applyKikoChatSize(c); positionKikoUI(); } }catch(e){} });
   // keep the free-resized chat within the viewport on rotate/resize

/* ===================== FLOATING TIMER (rest + pomodoro focus, pop-out) ===================== */
const TIMER={ open:false, mode:"focus", running:false, iv:null, secs:1500, total:1500,
  phase:"focus", workMin:25, breakMin:5, cycles:0 };

let pipWin=null;

function toggleTimer(){
  if(pipWin){ try{ pipWin.close(); }catch(_){} pipWin=null; }
  TIMER.open=!TIMER.open;
  $("#restWidget").classList.toggle("hidden", !TIMER.open);
  if(TIMER.open) paintTimer();
}

function timerTarget(){ return pipWin ? pipWin.document.getElementById("timerHost") : $("#restWidget"); }

function timerMarkup(){
  const mm=String(Math.floor(TIMER.secs/60)).padStart(2,'0'), ss=String(TIMER.secs%60).padStart(2,'0');
  const pct=Math.max(0,Math.min(1,TIMER.total?(1-TIMER.secs/TIMER.total):0)); const R=42,C=2*Math.PI*R;
  const onBreak=TIMER.phase==="break";
  const ring=onBreak?"#7ed0b0":"url(#rg)";
  const presets=[[15,3],[25,5],[50,10]].map(([w,b])=>`<button data-tpreset="${w}-${b}" class="${TIMER.workMin===w&&TIMER.breakMin===b?'on':''}">${w}/${b}</button>`).join("");
  return `<div style="display:flex;justify-content:space-between;align-items:center">
      <div style="font-family:var(--display);font-size:14px">🍅 Pomodoro</div>
      <div style="display:flex"><button class="timer-ic" data-tact="pop" title="Pop out (stay on top)">⧉</button><button class="timer-ic" data-tact="close" title="close">✕</button></div></div>
    <div style="text-align:center;font-family:var(--display);font-size:13px;color:${onBreak?'#3a9d83':'var(--sakura-deep)'};margin-top:4px">${onBreak?'Break':'Focus'} · round ${TIMER.cycles+1}</div>
    <svg width="110" height="110" viewBox="0 0 110 110" style="display:block;margin:2px auto 0">
      <circle cx="55" cy="55" r="${R}" fill="none" stroke="#eee5f3" stroke-width="8"/>
      <circle cx="55" cy="55" r="${R}" fill="none" stroke="${ring}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${(C*(1-pct)).toFixed(1)}" transform="rotate(-90 55 55)"/>
      <defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="#758ac6"/><stop offset="1" stop-color="#ff9ed8"/></linearGradient></defs></svg>
    <div class="ring-time">${mm}:${ss}</div>
    <div class="seg" style="margin:8px auto 6px;justify-content:center;display:flex">${presets}</div>
    <div style="display:flex;gap:6px;justify-content:center"><button class="btn btn-grad" data-tact="toggle">${TIMER.running?'Pause':'Start'}</button><button class="btn" data-tact="reset">Reset</button></div>
    <p class="soft" style="font-size:10.5px;text-align:center;margin:8px 0 0">Focus, then a kind little break. 🍅</p>`;
}

function paintTimer(){ const t=timerTarget(); if(!t) return; t.innerHTML=timerMarkup();
  t.querySelectorAll('[data-tmode]').forEach(b=>b.onclick=()=>setTimerMode(b.dataset.tmode));
  t.querySelectorAll('[data-tpreset]').forEach(b=>b.onclick=()=>setTimerPreset(b.dataset.tpreset));
  t.querySelectorAll('[data-tact]').forEach(b=>b.onclick=()=>{ const a=b.dataset.tact;
    if(a==="toggle") timerToggle(); else if(a==="reset") timerReset(); else if(a==="close") toggleTimer(); else if(a==="pop") popOutTimer(); });
}

function timerStop(){ if(TIMER.iv){ clearInterval(TIMER.iv); TIMER.iv=null; } }

function setTimerMode(m){ TIMER.mode="focus"; TIMER.running=false; timerStop();
  TIMER.phase="focus"; TIMER.cycles=0; TIMER.total=TIMER.workMin*60;
  TIMER.secs=TIMER.total; paintTimer(); }

function setTimerPreset(v){ TIMER.running=false; timerStop();
  const [w,b]=v.split("-").map(Number); TIMER.workMin=w; TIMER.breakMin=b; TIMER.phase="focus"; TIMER.cycles=0; TIMER.total=w*60;
  TIMER.secs=TIMER.total; paintTimer(); }

function timerToggle(){ TIMER.running=!TIMER.running; timerStop(); if(TIMER.running) TIMER.iv=setInterval(timerTick,1000); paintTimer(); }

function timerReset(){ TIMER.running=false; timerStop(); TIMER.phase="focus"; TIMER.cycles=0; TIMER.total=TIMER.workMin*60; TIMER.secs=TIMER.total; paintTimer(); }

function timerTick(){
  TIMER.secs=Math.max(0,TIMER.secs-1);
  if(TIMER.secs===0){
    if(TIMER.phase==="focus"){ TIMER.phase="break"; TIMER.total=TIMER.breakMin*60; TIMER.secs=TIMER.total; toast("focus done — little break 🍵");
      if(KIKO.focus){ const g=KIKO.focus.goal; KIKO.focus=null; KIKO.log.push({role:"pet",text:"⏰ timer's up! how did “"+g+"” go? even a little counts — want another round, or a proper break? 💗"}); try{ H.openKikoChatPanel(); }catch(_){}}}
    else { TIMER.phase="focus"; TIMER.cycles++; TIMER.total=TIMER.workMin*60; TIMER.secs=TIMER.total; toast("break over — back to it ✨"); }
  }
  paintTimer();
}

async function popOutTimer(){
  if(pipWin){ pipWin.focus(); return; }
  if(!('documentPictureInPicture' in window)){ toast("Pop-out needs Chrome or Edge 🦊"); return; }
  try{
    pipWin=await window.documentPictureInPicture.requestWindow({ width:240, height:344 });
    document.querySelectorAll('style').forEach(s=>pipWin.document.head.appendChild(s.cloneNode(true)));
    pipWin.document.body.style.margin="0"; pipWin.document.body.style.background="#fff";
    const host=pipWin.document.createElement('div'); host.id="timerHost"; host.style.padding="12px"; pipWin.document.body.appendChild(host);
    pipWin.addEventListener('pagehide',()=>{ pipWin=null; $("#restWidget").classList.toggle("hidden",!TIMER.open); paintTimer(); });
    $("#restWidget").classList.add("hidden"); paintTimer();
  }catch(e){ console.error(e); pipWin=null; toast("couldn't pop out"); }
}


/* ===================== BOOT ===================== */
window.addEventListener('error',ev=>{ const v=document.getElementById('view');
  if(v && !v.innerHTML.trim()){ v.innerHTML='<div class="panel" style="margin:18px"><h3>aw, a hiccup ❄️</h3><p class="soft">'+esc(ev.message||'unknown error')+'</p></div>'; } });


/* ===================== KIKO — AI snowfox pet ===================== */
const KIKO={ open:false, busy:false, status:null, log:[], journal:null, tax:null, pendingImages:[], mic:false, _spoken:-1 };

try{ loadKikoLog(); }catch(e){}

const KIKO_GREETS=["Konfuyu~! Need anything? ❄️","Pspsps… ask me something! 🦊","I'm right here if you need me 💗","Hi Mifu~ ✿","Wanna brainstorm? 🌸"];

/* sprite walk engine + desktop-pet physics — frames measured from fox.png (164x210). Row 2 = 4-frame walk cycle. */
const KIKO_SHEET={url:"fox.png",W:164,H:210};

const KIKO_WALK=[{x:6,y:52,w:35,h:32},{x:44,y:53,w:38,h:31},{x:88,y:52,w:35,h:32},{x:130,y:53,w:34,h:31}];

const KIKO_SIT={x:6,y:10,w:35,h:32};

const KIKO_SCALE=2.1, KSPRW=Math.round(38*2.1), KSPRH=Math.round(32*2.1);
  // ~80 x ~67
const KIKO_FACES="right";
         // art faces right by default; flip when moving left
let KIKO_RAF=null, kikoX=null, kikoY=0, kikoVX=0, kikoVY=0, kikoDir=1, kikoFrameI=0, kikoFrameT=0, kikoState="walk", kikoStateT=0, kikoLast=0;

function setKikoFrame(f){ const el=$("#kikoSprite"); if(!el)return; const s=KIKO_SCALE;
  el.style.backgroundImage=`url(${KIKO_SHEET.url})`; el.style.backgroundRepeat="no-repeat";
  el.style.width=(f.w*s)+"px"; el.style.height=(f.h*s)+"px";
  el.style.backgroundSize=`${KIKO_SHEET.W*s}px ${KIKO_SHEET.H*s}px`;
  el.style.backgroundPosition=`-${(f.x*s).toFixed(1)}px -${(f.y*s).toFixed(1)}px`;
}

function kikoFacing(){ const flip=(KIKO_FACES==="right")?(kikoDir<0):(kikoDir>0); return flip?"scaleX(-1)":"scaleX(1)"; }

// pace only between the sticky button (left ~62px) and timer button (right) — clear of both
function kikoBounds(){ return { min:72, max:Math.max(90, window.innerWidth-72-KSPRW) }; }

function positionKikoUI(){
  const k=$("#kiko"); if(k){ k.style.left=Math.round(kikoX)+"px"; k.style.bottom=Math.round(14+kikoY)+"px"; }
  const topY=Math.round(14+kikoY+KSPRH+8);
  const chat=$("#kikoChat");
  if(chat && !chat.classList.contains("hidden")){ const cw=(window.innerWidth>640&&chat.offsetWidth)?chat.offsetWidth:Math.min(Math.max(240,Number(localStorage.getItem("kiko-chat-w"))||310),window.innerWidth-16);   // desktop: actual free-resized width; mobile: original
    let cl=Math.round(kikoX-cw/2+KSPRW/2); cl=Math.max(8,Math.min(cl,window.innerWidth-cw-8));
    chat.style.left=cl+"px"; chat.style.right="auto"; chat.style.bottom=topY+"px"; }
  const bub=$("#kikoBubble");
  if(bub && !bub.classList.contains("hidden")){ let bl=Math.round(kikoX-8); bl=Math.max(8,Math.min(bl,window.innerWidth-210));
    bub.style.left=bl+"px"; bub.style.right="auto"; bub.style.bottom=topY+"px"; }
}

function kikoStep(now){
  const sp=$("#kikoSprite"); if(!sp){ KIKO_RAF=requestAnimationFrame(kikoStep); return; }
  const dt=Math.min(60, now-(kikoLast||now)); kikoLast=now;
  if(kikoX==null){ const _sb=document.getElementById("sidebar"); kikoX=(_sb&&window.innerWidth>640)?_sb.offsetWidth+60:100; }
  if(kikoState==="held" || KIKO.open){ setKikoFrame(KIKO_SIT); sp.style.transform=kikoFacing(); positionKikoUI(); KIKO_RAF=requestAnimationFrame(kikoStep); return; }
  if(kikoState==="thrown"){
    kikoVY-=2400*dt/1000; kikoY+=kikoVY*dt/1000; kikoX+=kikoVX*dt/1000;
    const maxX=window.innerWidth-KSPRW;
    const _sbw=(()=>{ const s=document.getElementById("sidebar"); return (s&&window.innerWidth>640)?s.offsetWidth:0; })();
    if(kikoX<_sbw){ kikoX=_sbw; kikoVX=-kikoVX*0.55; } else if(kikoX>maxX){ kikoX=maxX; kikoVX=-kikoVX*0.55; }
    const topMax=window.innerHeight-KSPRH-20; if(kikoY>topMax){ kikoY=topMax; kikoVY=-kikoVY*0.4; }
    if(kikoY<=0){ kikoY=0;
      if(Math.abs(kikoVY)<150){ kikoVY=0; kikoVX*=0.55; if(Math.abs(kikoVX)<30){ const b=kikoBounds(); kikoX=Math.max(b.min,Math.min(kikoX,b.max)); kikoState="walk"; kikoStateT=0; } }
      else { kikoVY=-kikoVY*0.5; kikoVX*=0.8; } }
    setKikoFrame(KIKO_SIT); sp.style.transform=(kikoVX<0?"scaleX(-1)":"scaleX(1)"); positionKikoUI(); KIKO_RAF=requestAnimationFrame(kikoStep); return;
  }
  if(PREF.calm){ setKikoFrame(KIKO_SIT); sp.style.transform=kikoFacing(); positionKikoUI(); KIKO_RAF=requestAnimationFrame(kikoStep); return; }
  const b=kikoBounds(); kikoStateT+=dt;
  if(kikoState==="walk"){
    kikoX += kikoDir*44*dt/1000;
    if(kikoX<=b.min){ kikoX=b.min; kikoDir=1; } else if(kikoX>=b.max){ kikoX=b.max; kikoDir=-1; }
    kikoFrameT+=dt; if(kikoFrameT>=150){ kikoFrameT=0; kikoFrameI=(kikoFrameI+1)%KIKO_WALK.length; }
    setKikoFrame(KIKO_WALK[kikoFrameI]); sp.style.transform=kikoFacing();
    if(kikoStateT>4500+Math.random()*4000){ kikoState="sit"; kikoStateT=0; }
  } else {
    setKikoFrame(KIKO_SIT); sp.style.transform=kikoFacing();
    if(kikoStateT>1800+Math.random()*2200){ kikoState="walk"; kikoStateT=0; }
  }
  positionKikoUI(); KIKO_RAF=requestAnimationFrame(kikoStep);
}

function kikoStart(){ if(KIKO_RAF)return; kikoLast=performance.now(); kikoSetupDrag(); KIKO_RAF=requestAnimationFrame(kikoStep); }

function kikoSetupDrag(){
  const k=$("#kiko"); if(!k||k._wired) return; k._wired=true;
  let down=false, moved=false, sx=0, sy=0, gox=0, goy=0, samp=[];
  k.addEventListener('pointerdown',e=>{ down=true; moved=false; sx=e.clientX; sy=e.clientY; samp=[{x:e.clientX,y:e.clientY,t:performance.now()}];
    if(kikoX==null)kikoX=100; const topScreen=window.innerHeight-(14+kikoY)-KSPRH; gox=e.clientX-kikoX; goy=e.clientY-topScreen;
    kikoState="held"; try{k.setPointerCapture(e.pointerId);}catch(_){}; e.preventDefault(); });
  k.addEventListener('pointermove',e=>{ if(!down)return; if(Math.abs(e.clientX-sx)>4||Math.abs(e.clientY-sy)>4)moved=true;
    kikoX=Math.max(0,Math.min(e.clientX-gox, window.innerWidth-KSPRW));
    kikoY=Math.max(0, window.innerHeight-(e.clientY-goy)-KSPRH-14);
    samp.push({x:e.clientX,y:e.clientY,t:performance.now()}); if(samp.length>5)samp.shift(); positionKikoUI(); });
  function end(e){ if(!down)return; down=false; try{k.releasePointerCapture(e.pointerId);}catch(_){}
    if(!moved){ kikoState="sit"; H.kikoToggle(); return; }
    const a=samp[0], z=samp[samp.length-1], d=Math.max(16,z.t-a.t);
    kikoVX=(z.x-a.x)/d*1000; kikoVY=-(z.y-a.y)/d*1000; kikoState="thrown"; }
  k.addEventListener('pointerup',end); k.addEventListener('pointercancel',end);
  // safety: if pointer capture is lost without a proper up/cancel (mobile can steal it), don't wedge in "held" forever
  k.addEventListener('lostpointercapture',()=>{ if(down){ down=false; if(kikoState==="held"){ kikoState="walk"; kikoStateT=0; } } });
}

function kikoInputEl(){ return document.getElementById("kikoTabInput")||document.getElementById("kikoInput"); }

// compact, real numbers for the agent's DATA SNAPSHOT — lets Kiko answer "how's my…" accurately
/* background sentinel writes (episodic log, reflection) flow through ONE queue — two read-merge-write
   saves racing each other were clobbering data (the v3.0 learning bug). Serial = safe. */
let KIKO_WQ=Promise.resolve();

function queueSent(fn){ KIKO_WQ=KIKO_WQ.then(()=>setSent(fn)).catch(()=>{}); return KIKO_WQ; }

/* episodic memory — a rolling log of what Kiko actually did, so it can answer "what did you change?" and learn */
async function logKikoActions(summaries){
  try{ if(!summaries||!summaries.length)return;
    const stamp=new Date().toLocaleDateString("en-CA");
    const entries=summaries.map(t=>({date:stamp,text:String(t).replace(/^[^\w]+/,"").slice(0,140)}));
    await queueSent(n=>({...n,kikoActions:[...(n.kikoActions||[]),...entries].slice(-60)}));
  }catch(e){}
}

/* reflection — Kiko quietly learns Mifu's durable preferences from the conversation (no retraining).
   He's shown what he ALREADY remembers so he never re-learns it; auto-facts are fuzzy-deduped and capped. */
/* Tier 1A: push a piece of text into Kiko's semantic memory (best-effort, off the hot path).
   Inert unless the server has OPENAI_API_KEY + the pgvector migration. */
async function memPush(kind,text,importance){ try{ if(DEMO||!SB) return; const t=String(text||"").trim(); if(t.length<6) return; aiCall("memWrite",{kind:kind||"note",text:t.slice(0,2000),importance:importance||5}).catch(()=>{}); }catch(e){} }
   // .catch: fire-and-forget can't be caught by try
async function kikoReflect(){
  try{ if(DEMO||!SB) return; const hist=KIKO.log.slice(-24).map(m=>({role:m.role,text:String(m.text||"").slice(0,400)}));
    if(hist.filter(h=>h.role==="me").length<2) return;   // need a little to learn from
    const known=(state.sentinel.kikoMemory||[]).slice(-40).map(m=>String(m.text||""));
    let engagement="";   // what she actually taps on her dashboard — behaviour, not words (Tier 1B)
    try{ const fa=state.sentinel.focusAffinity||{}; engagement=Object.entries(fa).map(([cat,a])=>({cat,n:(a&&a.n)||0,last:a&&a.last})).filter(e=>e.n>0).sort((x,y)=>y.n-x.n).slice(0,6).map(e=>`${e.cat} ×${e.n}${e.last&&daysBetween(e.last,TODAY)<=7?" (recent)":""}`).join(", "); }catch(_){}
    const d=await aiCall("reflect",{history:hist, userModel:(state.sentinel.kikoUserModel||""), known, engagement});
    if(!d||d.error) return;
    const norm=t=>String(t||"").toLowerCase().replace(/[^\w\s]/g,"").replace(/\s+/g," ").trim();
    await queueSent(n=>{ const upd={...n};
      if(d.changed && typeof d.userModel==="string" && d.userModel.trim()) upd.kikoUserModel=d.userModel.trim().slice(0,2400);
      if(Array.isArray(d.remember) && d.remember.length){
        const have=(n.kikoMemory||[]).map(m=>norm(m.text));
        const add=d.remember.filter(t=>{ const q=norm(t); return q && !have.some(h=>h.includes(q)||q.includes(h)); })   // near-duplicates don't get re-learned
          .map(t=>({id:"km"+Date.now()+Math.floor(Math.random()*1000),text:String(t).slice(0,200),date:TODAY,auto:true}));
        if(add.length){ let mem=[...(n.kikoMemory||[]),...add];
          const autos=mem.filter(m=>m.auto);
          if(autos.length>25){ const drop=new Set(autos.slice(0,autos.length-25).map(m=>m.id)); mem=mem.filter(m=>!drop.has(m.id)); }   // cap HIS facts; hers are never pruned
          upd.kikoMemory=mem; } }
      return upd; });
  }catch(e){}
}

/* FULL data snapshot for Kiko — every part of the OS, so it can answer about and correlate ANYTHING.
   Organised into labelled lines; the agent prompt tells Kiko to treat this as the live truth. */
function kikoDataSummary(){
  try{
    const s=state.sentinel||{}, t=state.today||{}; const u=CONFIG.weightUnit||"kg"; const L=[];
    const num=v=>v==null?"–":v;
    const avg=a=>a.length?(a.reduce((x,y)=>x+y,0)/a.length):null;
    // ---- day rows for history/correlation (last ~30 cached) ----
    const byDate={}; (state.range||[]).forEach(r=>byDate[r.date]=r.notes); byDate[TODAY]=t;
    const span=state.trendDays===30?30:14; const days=[]; for(let i=span-1;i>=0;i--)days.push(dayAgo(-i));
    const pick=(d,path)=>{ let v=byDate[d]; for(const k of path){ v=v&&v[k]; } return v==null?null:v; };
    // ===== GOALS KIKO IS TRACKING across sessions (3A) =====
    try{ const kg=(s.kikoGoals||[]).filter(g=>g&&g.status!=="done"); if(kg.length) L.push("GOALS KIKO IS TRACKING (follow through across sessions — gently check in when relevant, celebrate progress, never nag): "+kg.map(g=>`"${g.text}"${g.note?" — "+g.note:""} (since ${g.created})`).join(" · ")); }catch(e){}

    // ===== WEIGHT & FULL BODY COMPOSITION (Withings Body Smart + manual) =====
    const wl=withBMI((s.weightLog||[]).filter(x=>x).slice().sort(cmpDate));
    const bc=k=>{ const e=wl.filter(x=>x[k]!=null); if(!e.length)return null; const last=e[e.length-1],first=e[0],prev=e.length>1?e[e.length-2]:null;
      return { v:last[k], date:last.date, n:e.length, dPrev:prev?Math.round((last[k]-prev[k])*10)/10:null, dAll:e.length>1?Math.round((last[k]-first[k])*10)/10:null, from:first.date }; };
    const bcLines=[];
    BODYCOMP.forEach(([k,l,unit])=>{ const m=bc(k); if(!m)return;
      bcLines.push(`${l} ${m.v}${unit||''}${m.dPrev!=null&&m.dPrev!==0?` (last Δ${m.dPrev>0?'+':''}${m.dPrev})`:''}${m.dAll!=null&&m.dAll!==0?`, ${m.dAll>0?'+':''}${m.dAll} since ${fmtDate(m.from)}`:''} [${m.n} readings]`); });
    const wcon=!!(s.withings && s.withings.refresh_token);
    if(bcLines.length) L.push(`BODY${wcon?" (Withings linked)":""}: ${bcLines.join("; ")}`);
    else L.push("BODY: no weight/body-comp logged yet"+(wcon?" though Withings is linked":""));

    // ===== MOUNJARO =====
    const inj=(s.injectionLog||[]).slice().sort(cmpDate);
    const cur=currentDose();
    const wlw=wl.filter(x=>x.w!=null);
    if(inj.length){ const li=inj[inj.length-1]; const nd=new Date(li.date+"T00:00"); nd.setDate(nd.getDate()+7);
      const start=inj[0].date; const weeks=Math.floor(daysBetween(start,TODAY)/7);
      const loss=wlw.length>1?Math.round((wlw[wlw.length-1].w-wlw[0].w)*10)/10:null;
      L.push(`MOUNJARO: ${cur?cur.dose+"mg":(li.dose+"mg")} current, ~${weeks}w on the journey, ${inj.length} shots; last ${fmtDate(li.date)} (${li.dose}mg${li.site?", "+li.site:""}), next ~${fmtDate(nd.toLocaleDateString("en-CA"))}${loss!=null?`; total weight change ${loss>0?'+':''}${loss}${u}`:''}`); }
    else L.push("MOUNJARO: no shots logged yet");
    const mj=t.mounjaro||{}; const se=["nausea","constipation","diarrhea","reflux","belly","fatigue","foodnoise"].filter(k=>mj[k]!=null).map(k=>`${k} ${mj[k]}/5`);
    if(se.length) L.push("MOUNJARO side-effects today: "+se.join(", "));
    const mjh=["proteinMeals","smallerMeals","fiber","gentleMove"].filter(k=>mj[k]); if(mjh.length) L.push("MJ supportive habits today: "+mjh.join(", "));

    // ===== TODAY CHECK-IN + WATER + SLEEP =====
    const m=t.mind||{}; const ci=[];
    if(m.mood!=null)ci.push(`mood ${m.mood}/5`); if(m.anxiety!=null)ci.push(`anxiety ${m.anxiety}/5`); if(m.energy!=null)ci.push(`energy ${m.energy}/5`); if(m.weather!=null)ci.push(`weather-inside ${m.weather}/5`);
    if(t.stress!=null)ci.push(`stress ${t.stress}/5`); if((t.tags||[]).length)ci.push("tags: "+t.tags.join("/"));
    if(ci.length) L.push("TODAY check-in: "+ci.join(", "));
    const wCups=(mj.water||0); L.push(`WATER today: ${(wCups/CUPS_PER_40OZ).toFixed(1)} × 40oz cups (${wCups} internal cups)`);
    if(t.sleep!=null) L.push(`SLEEP last night: ${t.sleep}h`);

    // ===== TREND DIRECTIONS (correlate-able) =====
    const trendDir=TREND_METRICS.map(([k,e,l,max])=>{ const vals=days.map(d=>{
        if(k==="sleep")return pick(d,["sleep"]); if(k==="water")return pick(d,["mounjaro","water"]);
        if(k==="nausea")return pick(d,["mounjaro","nausea"]); if(k==="cravings")return pick(d,["pcos","cravings"]);
        return pick(d,["mind",k]); }).filter(v=>v!=null);
      if(!vals.length)return null; const a=avg(vals).toFixed(1); const h=Math.floor(vals.length/2)||1;
      const d=avg(vals.slice(-h))-avg(vals.slice(0,h)); const dir=d>0.4?"↑rising":d<-0.4?"↓falling":"→steady";
      return `${l} avg ${a} ${dir} (${vals.length}d)`; }).filter(Boolean);
    if(trendDir.length) L.push(`TRENDS last ${span}d: `+trendDir.join("; "));

    // ===== PCOS =====
    const p=t.pcos||{}; const sym=["fatigue","bloating","cravings","acne","shedding","hirsutism"].filter(k=>p[k]!=null).map(k=>`${k} ${p[k]}/5`);
    if(sym.length) L.push("PCOS symptoms today: "+sym.join(", "));
    const ph=["moved","balanced","protein","lowsugar"].filter(k=>p[k]); if(ph.length) L.push("PCOS helpers today: "+ph.join(", "));
    const cyc=s.cycle||{}; if(cyc.lastStart){ const dx=daysBetween(cyc.lastStart,TODAY); L.push(`CYCLE: day ${dx} since last period (${fmtDate(cyc.lastStart)})${dx>=45?" — long gap, common with PCOS":""}`); }

    // ===== FOOD =====
    if(foodToday().length){ const ft=foodTotals(), tg=foodTargets();
      L.push(`FOOD today: ${Math.round(ft.kcal)}kcal, protein ${Math.round(ft.protein)}/${tg.protein}g, fibre ${Math.round(ft.fiber)}/${tg.fiber}g, carbs ${Math.round(ft.carbs)}g, fat ${Math.round(ft.fat)}g (${foodToday().length} items: ${foodToday().map(x=>x.name).slice(0,8).join(", ")})`); }
    else L.push("FOOD today: nothing logged yet");
    const fh=foodHistory(7).filter(h=>h.meals.length); if(fh.length){ const ap=avg(fh.map(h=>h.protein)), af=avg(fh.map(h=>h.fiber)); L.push(`FOOD 7-day avg (logged days): protein ${Math.round(ap)}g, fibre ${Math.round(af)}g`); }

    // ===== MEASUREMENTS & NSV =====
    const meas=(s.measurements||[]).slice().sort(cmpDate);
    if(meas.length){ const last=meas[meas.length-1]; const mm=["bust","waist","hips","thighs","arms"].filter(k=>last[k]!=null).map(k=>`${k} ${last[k]}cm`); if(mm.length) L.push(`MEASUREMENTS (latest ${fmtDate(last.date)}): ${mm.join(", ")}`); }
    const nsv=(s.nsv||[]); if(nsv.length) L.push(`NON-SCALE WINS (${nsv.length}): `+nsv.slice(-4).map(v=>v.t).join("; "));

    // ===== MONEY =====
    const y=String(new Date().getFullYear()); const tx=(s.money||[]).filter(x=>String(x.date||"").slice(0,4)===y);
    if(tx.length){ const inc=tx.filter(x=>x.dir==="in").reduce((a,x)=>a+(+x.amount||0),0), exp=tx.filter(x=>x.dir==="out").reduce((a,x)=>a+(+x.amount||0),0);
      const cat={}; tx.forEach(x=>{ cat[x.cat]=(cat[x.cat]||0)+(x.dir==="in"?1:-1)*(+x.amount||0); });
      const top=Object.entries(cat).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,4).map(([c,v])=>`${c} ${v>=0?'+':''}€${Math.round(v)}`);
      L.push(`MONEY ${y}: in €${Math.round(inc)}, out €${Math.round(exp)}, net €${Math.round(inc-exp)} (${tx.length} entries; ${top.join(", ")})`); }
    const sp=(s.sponsors||[]); if(sp.length) L.push(`SPONSORS (${sp.length}): `+sp.map(x=>`${x.name} [${x.status||'pending'}]${x.payout?" "+x.payout:""}${x.due?" due "+x.due:""}`).join("; "));
    const sl=(s.streamLog||[]); if(sl.length) L.push(`STREAM DEBRIEFS (recent): `+sl.slice(-4).map(d=>`${d.game||'stream'} (${fmtDate(d.date)}${d.vibe?", vibe "+d.vibe+"/5":""})${d.note?": "+String(d.note).slice(0,80):""}`).join("; "));
    const ff=(s.foodFaves||[]); if(ff.length) L.push(`FAVORITE MEALS: `+ff.map(f=>f.name).join(", "));
    if(s.descTemplate&&String(s.descTemplate).trim()) L.push("YOUTUBE DESCRIPTION TEMPLATE: saved (auto-appended to optimizer descriptions) — starts: "+String(s.descTemplate).replace(/\s+/g," ").slice(0,80)+"…");

    // ===== TASKS / GOALS / HABITS / GACHA =====
    const tasks=(s.tasks||[]); const open=tasks.filter(x=>!x.done);
    if(tasks.length){ const due=open.filter(x=>x.due).sort((a,b)=>a.due<b.due?-1:1).map(x=>`${x.text} (due ${x.due})`);
      L.push(`TASKS: ${open.length} open / ${tasks.length} total${due.length?"; due: "+due.slice(0,8).join(", "):""}`); }
    const gw=(s.goalsWeek||[]).filter(g=>!g.done), gm=(s.goalsMonth||[]).filter(g=>!g.done);
    if(gw.length||gm.length) L.push(`GOALS open — week: ${gw.map(g=>g.text).join(", ")||"none"}; month: ${gm.map(g=>g.text).join(", ")||"none"}`);
    const hl=habitsList(), hc=t.habits||{}; const hLeft=hl.filter(h=>!hc[h.id]).map(h=>h.text);
    L.push(`HABITS today ${hl.length-hLeft.length}/${hl.length}${hLeft.length?` (left: ${hLeft.join(", ")})`:" — all done ✓"}`);
    const cgl=cgoalsList(), cgc=t.cgoals||{}; const cgLeft=cgl.filter(g=>!cgc[g.id]).map(g=>g.text);
    L.push(`CREATOR DAILY GOALS today ${cgl.length-cgLeft.length}/${cgl.length}${cgLeft.length?` (left: ${cgLeft.join(", ")})`:" — all done ✓"}`);
    const gl=gachaList(), gc=t.gacha||{}; const gLeft=gl.filter(g=>!gc[g.id]).map(g=>g.name);
    L.push(`GACHA DAILIES today ${gl.length-gLeft.length}/${gl.length}${gLeft.length?` (left: ${gLeft.join(", ")})`:" — all done ✓"}`);

    // ===== STREAM SCHEDULE (this week) / GAMES / MEDS / REMINDERS / JOURNAL =====
    const thisWk=weekSlots(weekStartISO(0)); if(thisWk.length) L.push("STREAM SCHEDULE this week: "+thisWk.map(r=>`${r.day} ${r.show||'Stream'}${r.time?" @"+r.time:""}`).join(", "));
    const nextWk=weekSlots(weekStartISO(1)); if(nextWk.length) L.push("STREAM SCHEDULE next week: "+nextWk.map(r=>`${r.day} ${r.show||'Stream'}${r.time?" @"+r.time:""}`).join(", "));
    const games=(s.gameTopics&&s.gameTopics.length)?s.gameTopics:DEFAULT_GAMES; L.push("GAMES tracked: "+games.join(", "));
    const meds=(s.medsList||[]); if(meds.length) L.push("MEDS: "+meds.map(x=>`${x.name}${x.dose?" "+x.dose:""}${x.time?" ("+x.time+")":""}`).join(", "));
    const med2=t.meds||{}; if(med2.am!=null||med2.pm!=null) L.push(`MEDS today: AM ${med2.am?"✓":"✗"}, PM ${med2.pm?"✓":"✗"}`);
    const mt=t.medsTaken||{}; if(meds.length&&Object.keys(mt).length) L.push("MEDS BY NAME today: "+meds.map(x=>`${x.name} ${mt[x.id]?"✓":"✗"}`).join(", "));
    const rem=activeReminders(); if(rem.length) L.push(`REMINDERS active (${rem.length}): `+rem.slice(0,8).map(r=>`${r.text}${r.time?" @"+fmt12(r.time):""}${r.repeat&&r.repeat!=="none"?" ("+r.repeat+")":""}`).join("; "));
    // JOURNAL — combine the journaling-TAB entries (stored on each day row as notes.journal) with Kiko's guided diary (journalEntries)
    const jrDays={}; (state.range||[]).forEach(r=>{ if(r&&r.notes&&r.notes.journal&&String(r.notes.journal).trim()) jrDays[r.date]=String(r.notes.journal); });
    if(t.journal&&String(t.journal).trim()) jrDays[TODAY]=String(t.journal);
    const je=(s.journalEntries||[]);
    const jrDates=new Set([...Object.keys(jrDays), ...je.filter(e=>e.text&&e.date).map(e=>e.date)]);
    const journaledToday=!!jrDays[TODAY]||je.some(e=>e.date===TODAY);
    L.push(`JOURNAL: ${jrDates.size} day(s) with entries${journaledToday?", journaled today ✓":", not yet today"}`);
    let jLatest=null; Object.keys(jrDays).forEach(d=>{ if(!jLatest||d>jLatest.date) jLatest={date:d,text:jrDays[d]}; });
    const jeLast=je.filter(e=>e.text&&e.date).slice(-1)[0]; if(jeLast&&(!jLatest||jeLast.date>=jLatest.date)) jLatest={date:jeLast.date,text:jeLast.text};
    if(jLatest&&jLatest.text) L.push("LATEST JOURNAL ("+fmtDate(jLatest.date)+"): "+String(jLatest.text).replace(/\s+/g," ").slice(0,200)+(String(jLatest.text).length>200?"…":""));

    // ===== EVERYTHING ELSE — so Kiko truly knows the whole hub =====
    const bd=(s.birthdays||[]); if(bd.length) L.push("BIRTHDAYS: "+bd.map(b=>`${b.name} (${String(b.month).padStart(2,"0")}-${String(b.day).padStart(2,"0")})`).join(", "));
    const wl5=wl.filter(x=>x.w!=null).slice(-5); if(wl5.length) L.push("RECENT WEIGH-INS: "+wl5.map(x=>`${fmtDate(x.date)} ${x.w}${u}`).join(" · "));
    const dh=(s.doseHistory||[]); if(dh.length) L.push("DOSE HISTORY: "+dh.map(d=>`${d.dose}mg from ${fmtDate(d.started)}`).join(" → "));
    const cyh=((s.cycle||{}).history||[]).slice(-3); if(cyh.length) L.push("PERIODS (last "+cyh.length+"): "+cyh.map(h=>fmtDate(h.start)+(h.end?"–"+fmtDate(h.end):" (open)")).join(", "));
    const caps=(s.captures||[]); if(caps.length) L.push("BRAIN-DUMP ("+caps.length+"): "+caps.slice(-6).map(c=>c.text).join("; "));
    const stk=(s.stickies||[]); if(stk.length) L.push("STICKIES ("+stk.length+"): "+stk.slice(-5).map(x=>String(x.html||x.text||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,40)).join("; "));
    const joys=(s.joyJar||[]); if(joys.length) L.push("JOY JAR ("+joys.length+"): "+joys.slice(-8).join("; "));
    const scr=(s.scripts||[]); if(scr.length) L.push("SCRIPT DRAFTS ("+scr.length+"): "+scr.slice(-5).map(x=>`${x.kind==="long"?"LF":"SF"} ${x.title||"(untitled)"}`).join("; "));
    const vx=(s.eqVoice||[]); if(vx.length) L.push("VOICE SAMPLES taught: "+vx.length);
    const mny5=(s.money||[]).slice(-5); if(mny5.length) L.push("RECENT MONEY ENTRIES: "+mny5.map(t2=>`${t2.dir==="in"?"+":"−"}€${t2.amount} ${t2.cat||""}${t2.desc?" ("+String(t2.desc).slice(0,24)+")":""} ${fmtDate(t2.date)}`).join("; "));
    const erq=(s.eggieRequests||[]).filter(r=>r.status!=="done"); if(erq.length) L.push("EGGIE WISHLIST open ("+erq.length+"): "+erq.slice(-6).map(r=>r.text).join("; "));
    try{ const epL=Object.entries(s.eventPrep||{}).map(([id,p])=>{ const ev=(s.calendarEvents||[]).find(e=>e.id===id); const open=((p&&p.items)||[]).filter(i=>!i.done); return (ev&&open.length)?`${ev.title}: ${open.map(i=>i.text).join(", ")}`:null; }).filter(Boolean);
      if(epL.length) L.push("EVENT PREP still open — "+epL.join(" | ")); }catch(_){}
    try{ const bpL=Object.entries(s.bdayPrep||{}).map(([k,p])=>{ if(p&&p.skipped)return null; const open=((p&&p.items)||[]).filter(i=>!i.done); const b=(s.birthdays||[]).find(x=>k.startsWith(x.id+"-")); return (b&&open.length)?`${b.name}: ${open.map(i=>i.text).join(", ")}`:null; }).filter(Boolean);
      if(bpL.length) L.push("BIRTHDAY PREP still open — "+bpL.join(" | ")); }catch(_){}
    try{ const cl=s.checkinLog||{}; const ciToday=Object.entries((state.today||{}).checkins||{}).filter(([,v])=>v).map(([k])=>k);
      const ciKeys=["streamed","ytVideo","ytShort","madeArt","coverSong","emails","sponsors","journaled","gym","walk","water","sleep","weighed"];
      const since=ciKeys.map(k=>{ const arr=cl[k]||[]; const last=arr[arr.length-1]; return last?k+" last "+last:null; }).filter(Boolean);
      L.push("CHECK-INS (self-reported daily buttons; the ONLY source of truth for streamed/uploads/emails/sponsors/cover song/gym/walks): today ["+(ciToday.join(", ")||"none yet")+"]"+(since.length?"; history — "+since.join("; "):"; no history yet"));
    }catch(e){}
    try{ const wk2=artMonday(TODAY); const alog=(s.artLog||[]); const la2=alog.slice(-1)[0];
      const wkMin=alog.filter(e=>e.date>=wk2).reduce((a2,e)=>a2+Number(e.min||0),0);
      const ch2=artChallengeState(s); const cnt2=s.artCount||{label:"heads",n:0,goal:100};
      L.push("ART STUDIO: "+(la2?("last made "+fmtDate(la2.date)+" ("+daysBetween(la2.date,TODAY)+"d ago)"):"nothing logged yet")+"; "+wkMin+" min this week; vault "+((s.inspoVault||[]).length)+" sparks ("+((s.inspoVault||[]).filter(v=>!v.done).length)+" untried)"+((s.inspoVault||[]).length?" — e.g. "+(s.inspoVault||[]).slice(-4).map(v=>v.text||v.url||"a reference image").join("; "):"")+"; ideas dump "+((s.artIdeas||[]).length)+"; mood board "+((s.artBoard||[]).length)+" cards; 100-challenge "+(cnt2.n||0)+"/"+(cnt2.goal||100)+" "+cnt2.label+"; today's challenge \""+ch2.dayText+"\""+(ch2.dayDone?" (done ✓)":"")+"; week's \""+ch2.weekText+"\""+(ch2.weekDone?" (done ✓)":""));
    }catch(e){}
    try{ const ppl=(s.people||[]); if(ppl.length) L.push("PEOPLE (relationship garden — the people she loves): "+ppl.map(p=>{ const nb=personNextBday(p.birthday); return `${p.name}${p.rel?" ("+p.rel+")":""}${nb!=null?", 🎂 in "+nb+"d":""}${p.gifts?", gift ideas: "+p.gifts:""}`; }).join(" · ")); }catch(e){}
    try{ const ml=(s.mifuLore||[]); if(ml.length) L.push("ABOUT MIFU (her own encyclopedia — use it to feel like you truly know her; weave in naturally, never recite): "+ml.slice(-30).map(x=>`${x.title}${x.cat?" ["+x.cat+"]":""}`).join("; ")); }catch(e){}
    try{ const wns=(s.wins||[]); if(wns.length) L.push("CREATOR WINS logged ("+wns.length+"): "+wns.slice(-6).map(w=>w.title).join("; ")); }catch(e){}
    try{ const lore=(s.streamLore||[]); if(lore.length) L.push("STREAM LORE saved ("+lore.length+"): "+lore.slice(-6).map(l=>l.title).join("; ")); }catch(e){}
    try{ const hl=(s.houseLog||[]); if(hl.length) L.push("HOME JOURNEY ("+hl.length+" entries): "+hl.slice(-5).map(h=>h.place||h.summary||"a step").join("; ")); }catch(e){}
    try{ const idg=(s.ideas||[]).filter(i=>i&&i.status!=="dropped"&&i.status!=="done"); if(idg.length) L.push("IDEA GRAVEYARD ("+idg.length+" resting): "+idg.slice(-8).map(i=>i.title).join("; ")); }catch(e){}
    try{ const spn=(s.sponsors||[]); if(spn.length) L.push("SPONSORS ("+spn.length+"): "+spn.slice(-8).map(sp=>`${sp.name||sp.brand||"?"}${sp.status?" ["+sp.status+"]":""}${(sp.deadline||sp.due)?", due "+fmtDate(sp.deadline||sp.due):""}${sp.rate?", "+sp.rate:""}`).join(" · ")); }catch(e){}
    L.push("PREFS: calm "+(PREF.calm?"on":"off")+", focus "+(PREF.focus?"on":"off")+", larger-text "+(PREF.text?"on":"off")+", layout "+((function(){try{return localStorage.getItem("layout-locked")==="1"}catch(e){return false}})()?"locked":"unlocked")+", weight unit "+u+", weight display "+(CONFIG.weightDisplay||"soft"));
    const nb=s.kikoNotes||{}; const nbk=Object.keys(nb); if(nbk.length) L.push("YOUR NOTEBOOK notes: "+nbk.map(k=>`${k} (${String(nb[k]).length}ch)`).join(", ")+" — read with manage_memory");
    const tpAll=s.taxPrep||{}; const tpy=Object.keys(tpAll); if(tpy.length) L.push("TAX-PREP saved: "+tpy.map(y2=>`${y2} (${(tpAll[y2].items||[]).length} answers)`).join(", "));

    return L.join("\n");
  }catch(e){ return ""; }
}

// persistent conversation (survives reloads) + spoken replies
function saveKikoLog(){ try{ localStorage.setItem("kiko-chat", JSON.stringify(KIKO.log.slice(-60).map(m=>({role:m.role,text:m.text,...(m.imgs?{hadImgs:m.imgs.length}:{})})))); }catch(e){} }
   // images stay in-session only (localStorage is tiny)
function loadKikoLog(){ try{ const s=localStorage.getItem("kiko-chat"); if(s){ const a=JSON.parse(s); if(Array.isArray(a)) KIKO.log=a; KIKO._spoken=KIKO.log.length-1; } }catch(e){} }

function speakKiko(text){ try{ if(localStorage.getItem("kiko-voice")!=="1") return; if(!window.speechSynthesis) return;
  speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(String(text).slice(0,400)); u.rate=1.04; u.pitch=1.25; speechSynthesis.speak(u); }catch(e){} }

function kikoLogHTML(){
  const imgRow=m=> m.imgs&&m.imgs.length ? `<div class="kimg-row">${m.imgs.map(im=>`<img class="kimg" src="${im}" alt="attached">`).join("")}</div>`
    : (m.hadImgs ? `<div class="soft" style="font-size:10.5px">📷 ${m.hadImgs} image${m.hadImgs>1?"s":""} (from an earlier session)</div>` : "");
  return KIKO.log.length
    ? KIKO.log.map(m=>`<div class="kiko-msg ${m.role}">${imgRow(m)}${esc(m.role==='pet'?stripMd(m.text):(m.text||""))}</div>`).join("")
    : `<div class="kiko-msg pet">Hey Mifu! ${greeting()} — how are you? I'm here to help! ❄️</div>`;
}

// shared chat body (log + photo preview + input bar) — used by the floating bubble AND the Ask-Kiko tab
function kikoChatInner(inputId, fileId, logId){
  return `<div class="kiko-log" id="${logId}">${kikoLogHTML()}${KIKO.busy?`<div class="kiko-msg pet">…${esc(KIKO.status||"thinking")} ❄️</div>`:""}</div>
    ${KIKO.pendingImages.length?`<div style="padding:8px 10px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center">${KIKO.pendingImages.map((im,i)=>`<span style="position:relative;display:inline-block"><img src="${im}" alt="attached" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:1px solid var(--line)"><button class="x" data-act="kikoClearImg" data-i="${i}" title="remove" style="position:absolute;top:-7px;right:-7px;background:#fff;border:1px solid var(--line);border-radius:50%;width:19px;height:19px;font-size:11px;line-height:1;padding:0">✕</button></span>`).join("")}<span class="soft" style="font-size:11px">${KIKO.pendingImages.length} image${KIKO.pendingImages.length>1?'s':''} ready — tell Kiko what you'd like; he'll see exactly what they are ✨ (📷 adds more)</span></div>`:""}
    <div class="kiko-input">
      <button class="btn" data-act="kikoMic" title="talk to Kiko" style="padding:0 9px;font-size:15px;${KIKO.mic?'background:#fde2f2;border-color:var(--sakura);':''}" ${KIKO.busy?"disabled":""}>${KIKO.mic?'⏹':'🎙️'}</button>
      <label class="btn" style="cursor:pointer;padding:0 9px;display:flex;align-items:center;font-size:16px" title="attach images — designs, DMs, screenshots, food, anything">📷<input type="file" id="${fileId}" accept="image/*" multiple style="display:none" ${KIKO.busy?"disabled":""}></label>
      <textarea class="inp" id="${inputId}" rows="2" style="resize:vertical;min-height:48px;max-height:170px;line-height:1.4" placeholder="${KIKO.mic?'listening… ❄️':KIKO.pendingImages.length?'what are they? (optional)':'tell Kiko to do something…  (Enter sends · Shift+Enter = new line)'}" ${KIKO.busy?"disabled":""}></textarea>
      <button class="btn btn-grad" data-act="kikoSend" ${KIKO.busy?"disabled":""}>send</button>
    </div>`;
}

function paintKiko(){
  saveKikoLog();
  if(KIKO.log.length){ const li=KIKO.log.length-1, last=KIKO.log[li];
    if(last.role==="pet" && KIKO._spoken!==li){ KIKO._spoken=li; speakKiko(stripMd(last.text)); } }
  const c=$("#kikoChat");
  if(c){ c.innerHTML=`<div class="kchat-grip" data-kresize="1" title="drag to resize" aria-label="Resize chat" role="separator"></div><div class="kiko-head"><div class="kiko-av"></div><div style="flex:1;padding-left:14px"><div style="font-family:var(--display);font-size:14px">Kiko ❄️</div><div class="label">your snowfox helper</div></div><button class="x" data-act="kikoMaximize" title="open Ask Kiko">⤢</button><button class="x" data-act="kikoToggle" title="close">✕</button></div>
    ${kikoChatInner("kikoInput","kikoFile","kikoLog")}`;
    applyKikoChatSize(c);
    wireKikoChatResize(c); }
  const tc=$("#kikoTabChat"); if(tc){ tc.innerHTML=kikoChatInner("kikoTabInput","kikoTabFile","kikoTabLog"); }
  const log=$("#kikoLog"); if(log) log.scrollTop=log.scrollHeight;
  const tlog=$("#kikoTabLog"); if(tlog) tlog.scrollTop=tlog.scrollHeight;
  const inp=kikoInputEl(); if(inp&&!KIKO.busy&&window.matchMedia&&matchMedia("(pointer:fine)").matches) try{ inp.focus(); }catch(_){}   // don't pop the phone keyboard on every repaint
}

/* drag the ⤡ on the floating chat to resize it — size remembered per device */
/* apply the remembered free size to the chat window (desktop/iPad only — mobile is a fixed bottom sheet) */
function applyKikoChatSize(c){
  c=c||$("#kikoChat"); if(!c) return;
  if(window.innerWidth<=640){ c.style.width=""; c.style.height=""; return; }   // bottom sheet keeps its CSS size
  const w=Math.min(Math.max(260,Number(localStorage.getItem("kiko-chat-w"))||320),Math.round(window.innerWidth*0.94));
  const h=Math.min(Math.max(300,Number(localStorage.getItem("kiko-chat-h2"))||440),Math.round(window.innerHeight*0.86));   // -h2: new key — the old "kiko-chat-h" stored LOG height, not window height
  c.style.width=w+"px"; c.style.height=h+"px";
}

/* sticky-note-style free corner resize (top-left grip; the window is bottom-anchored above Kiko, so it grows up & out) */
function wireKikoChatResize(c){
  if(window.innerWidth<=640) return;                       // mobile bottom sheet → no free resize
  const g=c.querySelector("[data-kresize]"); if(!g||g._wired) return; g._wired=true;
  g.addEventListener("pointerdown",e=>{
    e.preventDefault(); e.stopPropagation();
    const sx=e.clientX, sy=e.clientY, sw=c.offsetWidth, sh=c.offsetHeight;
    try{ g.setPointerCapture(e.pointerId); }catch(_){}
    const move=ev=>{
      const w=Math.min(Math.max(260, sw+(sx-ev.clientX)), Math.round(window.innerWidth*0.94));   // drag left → wider
      const h=Math.min(Math.max(300, sh+(sy-ev.clientY)), Math.round(window.innerHeight*0.86));   // drag up → taller
      c.style.width=w+"px"; c.style.height=h+"px";
      localStorage.setItem("kiko-chat-w",String(Math.round(w))); localStorage.setItem("kiko-chat-h2",String(Math.round(h)));
      positionKikoUI();
    };
    const up=()=>{ try{ g.releasePointerCapture(e.pointerId); }catch(_){} g.removeEventListener("pointermove",move); g.removeEventListener("pointerup",up); g.removeEventListener("pointercancel",up); };
    g.addEventListener("pointermove",move); g.addEventListener("pointerup",up); g.addEventListener("pointercancel",up);
  });
}

function kikoGreet(){
  if(KIKO.open) return;
  if(PREF.calm) return;                                          // calm mode = no chatter
  if(localStorage.getItem("kiko-proactive")==="0") return;       // same switch as his check-ins
  const b=$("#kikoBubble"); if(!b)return;
  b.textContent=KIKO_GREETS[Math.floor(Math.random()*KIKO_GREETS.length)];
  b.style.left=Math.max(10,Math.round((kikoX||100)-18))+"px"; b.style.right="auto";
  b.classList.remove("hidden");
  clearTimeout(b._h); b._h=setTimeout(()=>b.classList.add("hidden"),5500);
}


/* Kiko agent — execute an AI action against the app's data/state */
async function execAgentAction(a){
  if(!a||!a.type) return null; const T=a.type;
  try{
    if(T==="navigate"){ if(TABS.some(t=>t[0]===a.tab)) state.tab=a.tab; return "opened "+a.tab; }
    if(T==="setProactivity"){ const v=["quiet","gentle","active"].includes(a.level)?a.level:"gentle"; localStorage.setItem("kiko-prolevel",v); localStorage.setItem("kiko-proactive",v==="quiet"?"0":"1"); return "🌅 proactivity set to "+v; }
    if(T==="setDescTemplate"){ if(a.text==null)return null; await setSent(n=>({...n,descTemplate:String(a.text)})); return "📋 saved your YouTube description template — I'll paste it on every description"; }
    if(T==="healthReport"){ state.tab="health"; setTimeout(()=>{ try{showHealthReport();}catch(e){} },60); return "📋 opened your doctor-ready health report"; }
    if(T==="setCheckin"){ const k=String(a.key||""); const valid=[...CI_DEFS.creator,...CI_DEFS.health].some(d2=>d2[0]===k); if(!valid)return null; const on=a.on!=null?!!a.on:true;
      await setToday(n=>({...n,checkins:{...(n.checkins||{}),[k]:on}}));
      await setSent(n=>{ const log={...(n.checkinLog||{})}; let arr=(log[k]||[]).slice(); if(on){ if(!arr.includes(TODAY))arr.push(TODAY); } else arr=arr.filter(d=>d!==TODAY); log[k]=arr.slice(-30); return {...n,checkinLog:log}; });
      if(k==="madeArt"&&on) await setSent(n=>{ const log=(n.artLog||[]).slice(); if(!log.some(x=>x.date===TODAY))log.push({date:TODAY,note:""}); return {...n,artLog:log.slice(-200)}; });
      if(k==="medsAM"||k==="medsPM") await setToday(n=>({...n,meds:{...(n.meds||{}),[k==="medsAM"?"am":"pm"]:on}}));
      return (on?"✅ ":"◻️ ")+k+" check-in "+(on?"marked":"cleared")+" for today"; }
    /* 3A: ongoing goals Kiko tracks and follows through on across sessions (distinct from weekly goalsWeek) */
    if(T==="trackGoal"){ const txt=String(a.text||a.goal||"").trim(); if(!txt)return null;
      await setSent(n=>{ const g=(n.kikoGoals||[]).slice(); if(g.some(x=>x.status!=="done"&&String(x.text||"").toLowerCase()===txt.toLowerCase()))return n;
        g.push({id:"kg"+Date.now(),text:txt.slice(0,160),created:TODAY,touched:TODAY,status:"open",note:String(a.note||"")}); return {...n,kikoGoals:g.slice(-40)}; });
      return "🎯 I'll keep an eye on this with you: "+txt; }
    if(T==="progressGoal"){ const gs=(state.sentinel.kikoGoals||[]).filter(g=>g&&g.status!=="done"); const i=findByText(gs,a.name||a.text,"text"); if(i<0)return null;
      await setSent(n=>({...n,kikoGoals:(n.kikoGoals||[]).map(g=>g.id===gs[i].id?{...g,touched:TODAY,note:String(a.note||g.note||"")}:g)})); return "📝 noted where that stands: "+gs[i].text; }
    if(T==="finishGoal"){ const gs=(state.sentinel.kikoGoals||[]).filter(g=>g&&g.status!=="done"); const i=findByText(gs,a.name||a.text,"text"); if(i<0)return null;
      await setSent(n=>({...n,kikoGoals:(n.kikoGoals||[]).map(g=>g.id===gs[i].id?{...g,status:"done",touched:TODAY}:g)})); return "🌟 that's done — so proud of you: "+gs[i].text; }
    if(T==="dropGoal"){ const gs=(state.sentinel.kikoGoals||[]).filter(g=>g&&g.status!=="done"); const i=findByText(gs,a.name||a.text,"text"); if(i<0)return null;
      await setSent(n=>({...n,kikoGoals:(n.kikoGoals||[]).filter(g=>g.id!==gs[i].id)})); return "🌱 let that one go, no guilt: "+gs[i].text; }
    if(T==="markMed"){ const meds=(state.sentinel.medsList||[]); const i=findByText(meds,a.name,"name"); if(i<0)return null; const on=a.on!=null?!!a.on:true;
      await setToday(n=>{ const mt={...(n.medsTaken||{}),[meds[i].id]:on}; const ex={};
        if(on&&meds.length&&meds.every(m=>mt[m.id])){ ex.habits={...(n.habits||{}),h_meds:true}; ex.meds={am:true,pm:true}; }   // all ticked → the Home habit + AM/PM follow
        return {...n,medsTaken:mt,...ex}; }); return (on?"💊 took ":"↩️ unmarked ")+meds[i].name; }
    if(T==="setMedRefill"){ const meds=(state.sentinel.medsList||[]); const i=findByText(meds,a.name,"name"); if(i<0||!/^\d{4}-\d{2}-\d{2}$/.test(a.date||""))return null;
      await setSent(n=>({...n,medsList:(n.medsList||[]).map(m=>m.id===meds[i].id?{...m,refill:a.date}:m)})); return "💊 "+meds[i].name+" refill by "+fmtDate(a.date); }
    if(T==="logDebrief"){ if(!a.game&&!a.note)return null;
      await setSent(n=>({...n,streamLog:[...(n.streamLog||[]),{id:"sl"+Date.now(),date:TODAY,game:a.game||"",vibe:(a.vibe>=1&&a.vibe<=5)?a.vibe:null,note:a.note||""}].slice(-40)})); return "🎬 stream debrief saved"+(a.game?": "+a.game:""); }
    if(T==="setSponsorDue"){ const sps=(state.sentinel.sponsors||[]); const i=findByText(sps,a.name,"name"); if(i<0||!/^\d{4}-\d{2}-\d{2}$/.test(a.date||""))return null;
      await setSent(n=>({...n,sponsors:(n.sponsors||[]).map(x=>x.id===sps[i].id?{...x,due:a.date}:x)})); return "💜 "+sps[i].name+" deliverable due "+fmtDate(a.date); }
    /* ===== memory & life capture (Ideas #6-#12) — all SAFE/additive ===== */
    if(T==="logWin"){ const title=String(a.title||a.text||"").trim(); if(!title)return null;
      await setSent(n=>({...n,wins:[...(n.wins||[]),{id:"win"+Date.now(),date:TODAY,title:title.slice(0,140),cat:String(a.cat||a.category||""),why:String(a.why||"").slice(0,200)}].slice(-300)})); return "🏆 logged a win: "+title; }
    if(T==="saveLore"||T==="addLore"){ const title=String(a.title||"").trim(); if(!title)return null;
      const tags=Array.isArray(a.tags)?a.tags.map(x=>String(x).trim()).filter(Boolean).slice(0,8):(a.tags?String(a.tags).split(",").map(x=>x.trim()).filter(Boolean):[]);
      await setSent(n=>({...n,streamLore:[...(n.streamLore||[]),{id:"lore"+Date.now(),date:TODAY,title:title.slice(0,140),game:String(a.game||"").slice(0,60),summary:String(a.summary||"").slice(0,400),why:String(a.why||"").slice(0,200),tags}].slice(-300)})); return "📜 saved to stream lore: "+title; }
    if(T==="addIdea"){ const title=String(a.title||a.text||"").trim(); if(!title)return null;
      await setSent(n=>({...n,ideas:[...(n.ideas||[]),{id:"idea"+Date.now(),date:TODAY,title:title.slice(0,140),cat:String(a.cat||a.category||""),status:"graveyard"}].slice(-400)})); return "💡 tucked into your idea graveyard: "+title; }
    if(T==="addPerson"){ const name=String(a.name||"").trim(); if(!name)return null;
      await setSent(n=>{ const ppl=(n.people||[]).slice(); const i=ppl.findIndex(p=>String(p.name||"").toLowerCase()===name.toLowerCase());
        if(i>=0) ppl[i]={...ppl[i], rel:a.rel||a.relationship||ppl[i].rel, birthday:(/^\d{4}-\d{2}-\d{2}$/.test(a.birthday||a.date||"")?(a.birthday||a.date):ppl[i].birthday), gifts:a.gift?((ppl[i].gifts?ppl[i].gifts+" · ":"")+String(a.gift)).slice(0,200):ppl[i].gifts};
        else ppl.push({id:"ppl"+Date.now(),name:name.slice(0,60),rel:String(a.rel||a.relationship||"").slice(0,60),birthday:(/^\d{4}-\d{2}-\d{2}$/.test(a.birthday||a.date||"")?(a.birthday||a.date):""),gifts:String(a.gift||"").slice(0,200)});
        return {...n,people:ppl.slice(-200)}; }); return "💗 added to your relationship garden: "+name; }
    if(T==="addMifuFact"){ const title=String(a.title||a.text||"").trim(); if(!title)return null;
      await setSent(n=>({...n,mifuLore:[...(n.mifuLore||[]),{id:"ml"+Date.now(),date:TODAY,title:title.slice(0,200),cat:String(a.cat||a.category||"Other")}].slice(-400)})); return "📔 noted in About Me: "+title; }
    if(T==="addHouse"){ const place=String(a.place||"").trim(), summary=String(a.summary||a.text||"").trim(); if(!place&&!summary)return null;
      await setSent(n=>({...n,houseLog:[...(n.houseLog||[]),{id:"hs"+Date.now(),date:(/^\d{4}-\d{2}-\d{2}$/.test(a.date||"")?a.date:TODAY),place:place.slice(0,80),type:String(a.kind||a.eventType||"memory"),summary:summary.slice(0,400)}].slice(-300)})); return "🏡 added to your home journey"+(place?": "+place:""); }
    if(T==="draftStreamWeek"){ const wk=weekStartISO(0);
      const ge=(state.sentinel.calendarEvents||[]).filter(gameSrc).filter(e=>{ const diff=daysBetween(wk,e.date); return diff>=0&&diff<7&&e.date>=TODAY; });
      if(!ge.length)return "no game beats on the calendar this week to draft from";
      let added=0;
      await setWeekSlots(wk,arr=>{ const out=arr.slice(); ge.forEach(e=>{ const wd=DOW_ORDER[(new Date(e.date+"T00:00").getDay()+6)%7]; if(out.some(r=>r.day===wd&&(r.show||"")===e.title))return; added++;
        out.push({id:"sc"+Date.now()+Math.floor(Math.random()*1000),day:wd,show:e.title,time:STREAM_TIME_DEFAULT}); }); return out; });
      return added?("📅 drafted "+added+" stream slot"+(added>1?"s":"")+" from this week's game beats"):"📅 this week's game beats are already on your schedule"; }
    if(T==="saveFavorite"){ const foods=((state.today||{}).food||[]); const i=findByText(foods,a.name,"name"); if(i<0)return null; const x=foods[i];
      await setSent(n=>{ const faves=(n.foodFaves||[]).slice(); if(faves.some(f=>f.name.toLowerCase()===x.name.toLowerCase()))return n;
        faves.push({id:"fav"+Date.now(),name:x.name,serving:x.serving||"",kcal:x.kcal||0,protein:x.protein||0,carbs:x.carbs||0,fiber:x.fiber||0,fat:x.fat||0}); return {...n,foodFaves:faves.slice(-24)}; });
      return "⭐ saved as a favorite: "+x.name; }
    if(T==="logFavorite"){ const faves=(state.sentinel.foodFaves||[]); const i=findByText(faves,a.name,"name"); if(i<0)return null; const f=faves[i];
      const item={id:"fd"+Date.now(),name:f.name,serving:f.serving||"",kcal:f.kcal||0,protein:f.protein||0,carbs:f.carbs||0,fiber:f.fiber||0,fat:f.fat||0,time:new Date().toISOString()};
      await setToday(n=>({...n,food:[...(n.food||[]),item]})); return "🍽️ logged your usual: "+f.name; }
    if(T==="addEvent"){ const src=["game","gameevent","gamestream"].includes(a.src)?a.src:null;
      const ev={id:uid(),title:a.title||"event",date:a.date||TODAY,endDate:(!src&&a.endDate&&a.endDate>(a.date||TODAY))?a.endDate:null,time:a.time||"",tz:a.tz||"Europe/Amsterdam",note:a.note||"",url:a.url||"",
        ...(src?{src}:{color:(typeof CAL_COLORS!=="undefined"&&CAL_COLORS[1])||"#c9b8f0"})};
      await DB.saveDaily(SENTINEL,n=>({...n,calendarEvents:[...(n.calendarEvents||[]),ev]})); return (src?gameSrcIcon(ev):"📅 ")+"added “"+ev.title+"” ("+fmtDate(ev.date)+")"; }
    if(T==="addReminder"){ if(!a.text)return null;
      const r={id:"cr"+Date.now(),text:a.text,date:(a.date&&/^\d{4}-\d{2}-\d{2}$/.test(a.date))?a.date:TODAY,time:(a.time&&/^\d{2}:\d{2}$/.test(a.time))?a.time:"",repeat:["daily","weekly","monthly"].includes(a.repeat)?a.repeat:"none",done:false};
      await setSent(n=>({...n,customReminders:[...(n.customReminders||[]),r]}));
      return "⏰ reminder: "+r.text+" — "+(r.repeat!=="none"?r.repeat+", from ":"")+fmtDate(r.date)+(r.time?" at "+fmt12(r.time):""); }
    if(T==="completeReminder"){ let hit=null;
      await setSent(n=>{ const c=(n.customReminders||[]).slice(); const i=findByText(c,a.text,"text"); if(i<0)return n; hit=c[i].text; let tasks=n.tasks;
        if(c[i].repeat&&c[i].repeat!=="none"){ const d=new Date(nextReminderDate(c[i])+"T00:00"); if(c[i].repeat==="daily")d.setDate(d.getDate()+1); else if(c[i].repeat==="weekly")d.setDate(d.getDate()+7); else d.setMonth(d.getMonth()+1); c[i]={...c[i],date:d.toLocaleDateString("en-CA")}; }
        else { c[i]={...c[i],done:true};
          if(c[i].taskId) tasks=(n.tasks||[]).map(t=>t.id===c[i].taskId?{...t,done:true,status:"done"}:t); }
        return {...n,customReminders:c,...(tasks!==n.tasks?{tasks}:{})}; });
      return hit?"✅ reminder done: "+hit:null; }
    if(T==="removeReminder"){ let hit=null; await setSent(n=>{ const c=(n.customReminders||[]).slice(); const i=findByText(c,a.text,"text"); if(i<0)return n; hit=c[i].text; c.splice(i,1); return {...n,customReminders:c}; }); return hit?"🗑️ removed reminder: "+hit:null; }
    if(T==="rememberFact"){ if(!a.text)return null; await setSent(n=>({...n,kikoMemory:[...(n.kikoMemory||[]),{id:"km"+Date.now(),text:a.text,date:TODAY}]})); return "🧠 I'll remember: "+a.text; }
    if(T==="forgetFact"){ let hit=null; await setSent(n=>{ const m=(n.kikoMemory||[]).slice(); const i=findByText(m,a.text,"text"); if(i<0)return n; hit=m[i].text; m.splice(i,1); return {...n,kikoMemory:m}; }); return hit?"🧠 forgot: "+hit:null; }
    if(T==="checkHabit"){ const l=habitsList(); const i=findByText(l,a.text,"text"); if(i<0)return null; const on=a.on!=null?!!a.on:true;
      await setToday(n=>({...n,habits:{...(n.habits||{}),[l[i].id]:on}})); return (on?"✅ ":"↩️ unchecked: ")+l[i].text; }
    if(T==="checkGacha"){ const l=gachaList(); const i=findByText(l,a.name,"name"); if(i<0)return null; const on=a.on!=null?!!a.on:true;
      await setToday(n=>({...n,gacha:{...(n.gacha||{}),[l[i].id]:on}})); return (on?"🎮 dailies done: ":"↩️ unchecked: ")+l[i].name; }
    if(T==="addHabit"){ if(!a.text)return null;
      await setSent(n=>{ const l=(Array.isArray(n.habitsList)&&n.habitsList.length)?n.habitsList.slice():HABITS_DEFAULT.slice();
        l.push({id:"h"+Date.now(),text:a.text,energy:["low","med","high"].includes(a.energy)?a.energy:"med"}); return {...n,habitsList:l}; });
      return "🌱 new habit: "+a.text; }
    if(T==="removeHabit"){ let hit=null;
      await setSent(n=>{ const l=(Array.isArray(n.habitsList)&&n.habitsList.length)?n.habitsList.slice():HABITS_DEFAULT.slice();
        const i=findByText(l,a.text,"text"); if(i<0)return n; hit=l[i].text; const c=l.slice(); c.splice(i,1); return {...n,habitsList:c}; });
      return hit?"🗑️ habit removed: "+hit:null; }
    if(T==="addGachaGame"){ if(!a.name)return null;
      await setSent(n=>{ const l=(Array.isArray(n.gachaList)&&n.gachaList.length)?n.gachaList.slice():GACHA_DEFAULT.slice();
        l.push({id:"g"+Date.now(),name:a.name}); return {...n,gachaList:l}; });
      return "🎮 added to gacha dailies: "+a.name; }
    if(T==="removeGachaGame"){ let hit=null;
      await setSent(n=>{ const l=(Array.isArray(n.gachaList)&&n.gachaList.length)?n.gachaList.slice():GACHA_DEFAULT.slice();
        const i=findByText(l,a.name,"name"); if(i<0)return n; hit=l[i].name; const c=l.slice(); c.splice(i,1); return {...n,gachaList:c}; });
      return hit?"🗑️ removed from gacha dailies: "+hit:null; }
    if(T==="updateEvent"){ let hit=null;
      await setSent(n=>{ const evs=(n.calendarEvents||[]).slice(); let i=-1;
        if(a.date) i=evs.findIndex(e=>e.date===a.date&&String(e.title||"").toLowerCase().includes(String(a.title||"").toLowerCase()));
        if(i<0) i=findByText(evs,a.title,"title"); if(i<0)return n; const e={...evs[i]};
        if(a.newTitle)e.title=a.newTitle;
        if(a.newDate&&/^\d{4}-\d{2}-\d{2}$/.test(a.newDate)){ if(e.endDate&&e.endDate>e.date){ const delta=daysBetween(e.date,a.newDate); e.endDate=calShift(e.endDate,delta); } e.date=a.newDate; }
        if(a.newTime!=null)e.time=a.newTime;
        hit=e.title+" → "+fmtDate(e.date)+(e.time?" "+fmt12(e.time):""); evs[i]=e; return {...n,calendarEvents:evs}; });
      return hit?"✏️ "+hit:null; }
    if(T==="editTask"){ let hit=null; await setSent(n=>{ const ts=(n.tasks||[]).slice(); const i=findByText(ts,a.text,"text"); if(i<0||!a.newText)return n; hit=a.newText; ts[i]={...ts[i],text:a.newText};
      const c=(n.customReminders||[]).map(r=>r.taskId===ts[i].id&&!r.done?{...r,text:a.newText}:r);   // linked ping keeps the new wording
      return {...n,tasks:ts,customReminders:c}; }); return hit?"✏️ task → "+hit:null; }
    if(T==="undoLast"){ setTimeout(()=>{ try{ undoLast(); }catch(e){} },350); return "↩️ undoing your last change"; }
    if(T==="addTask"){ const due=(a.due&&/^\d{4}-\d{2}-\d{2}$/.test(a.due))?a.due:null;
      const bucket=TASK_BUCKETS.some(b=>b[0]===a.bucket)?a.bucket:"personal";   // unknown buckets would vanish from the list view
      await setSent(n=>({...n,tasks:[...(n.tasks||[]),{id:"t"+Date.now(),text:a.text,bucket,energy:normEnergy(a.energy||a.spoon||"medium"),priority:a.priority||"medium",done:false,sub:[],status:"todo",...(due?{due}:{})}]}));
      return "🗒️ task: "+a.text+(due?" (due "+fmtDate(due)+")":""); }
    if(T==="setTaskDue"){ let hit=null;
      await setSent(n=>{ const ts=(n.tasks||[]).slice(); const i=findByText(ts,a.text,"text"); if(i<0)return n;
        const due=(a.due&&/^\d{4}-\d{2}-\d{2}$/.test(a.due))?a.due:undefined; ts[i]={...ts[i],due}; hit=ts[i].text+(due?" → due "+fmtDate(due):" → no due date");
        let c=(n.customReminders||[]).slice();
        if(a.remindTime&&due){ const j=c.findIndex(r=>r.taskId===ts[i].id&&!r.done);
          const time=/^\d{2}:\d{2}$/.test(a.remindTime)?a.remindTime:"";
          if(j>=0) c[j]={...c[j],date:due,time}; else c.push({id:"cr"+Date.now(),text:ts[i].text,date:due,time,repeat:"none",done:false,taskId:ts[i].id}); }
        return {...n,tasks:ts,customReminders:c}; });
      return hit?"📅 "+hit:null; }
    if(T==="addGoal"){ const key=a.period==="month"?"goalsMonth":"goalsWeek"; await setSent(n=>({...n,[key]:[...(n[key]||[]),{id:"g"+Date.now(),text:a.text,done:false}]})); return "🌷 "+(a.period==="month"?"monthly":"weekly")+" goal: "+a.text; }
    if(T==="logMind"){ await setToday(n=>{ const mind={...(n.mind||{})}; ["mood","anxiety","energy","weather"].forEach(k=>{ if(a[k]!=null) mind[k]=Math.max(0,Math.min(5,Number(a[k]))); }); if(a.kind!=null) mind.kind=!!a.kind; return {...n,mind}; }); return "💗 check-in logged"; }
    if(T==="logWeight"){ const v=Number(a.value); if(isNaN(v))return null; await upsertWeightToday({w:v}); return "⚖️ "+v+" "+CONFIG.weightUnit+" logged"; }   // merge into today's row — no duplicate same-day entries
    if(T==="addNSV"){ await setSent(n=>({...n,nsv:[...(n.nsv||[]),{id:"n"+Date.now(),t:a.text,date:TODAY}]})); return "🌟 "+a.text; }
    if(T==="addMeasurement"){ const e={date:TODAY}; let any=false; ["bust","waist","hips","thighs","arms"].forEach(k=>{ const v=Number(a[k]); if(a[k]!=null&&!isNaN(v)){ e[k]=v; any=true; } }); if(!any)return null; await setSent(n=>({...n,measurements:[...(n.measurements||[]),e]})); return "📏 measurements saved"; }
    if(T==="logShot"){ const date=(!a.date||a.date==="today")?TODAY:a.date; const dose=Number(a.dose); if(isNaN(dose)||dose<=0)return null;
      await setSent(n=>{ const log=[...(n.injectionLog||[]),{id:"i"+Date.now(),date,time:a.time||"",dose,site:a.site||"",after:null,note:a.note||""}].sort((x,y)=>(x.date+(x.time||""))<(y.date+(y.time||""))?-1:1);
        let dh=n.doseHistory||[]; const cur=dh.slice().sort((p,q)=>p.started<q.started?-1:1).slice(-1)[0]; if(!cur||cur.dose!==dose) dh=[...dh,{dose,started:date}]; return {...n,injectionLog:log,doseHistory:dh}; }); return "💉 "+dose+"mg shot logged"; }
    if(T==="logWater"){ const c=Number(a.cups); if(isNaN(c)||c<0)return null;
      const cups=Math.round(c*CUPS_PER_40OZ*10)/10;   // Kiko speaks in her 40oz cups; storage stays in 8oz cups
      await setToday(n=>{ const mj={...(n.mounjaro||{})}; mj.water=Math.max(0,cups); return {...n,mounjaro:mj}; }); return "🥤 water: "+c+" × 40oz cup"+(c===1?"":"s"); }
    if(T==="addCapture"){ await setSent(n=>({...n,captures:[...(n.captures||[]),{id:"cap"+Date.now(),text:a.text,date:TODAY}]})); return "🧠 "+a.text; }
    if(T==="addSticky"){ await addSticky(a.text); return "🗒️ sticky added"; }
    if(T==="cycleStart"){ await setSent(n=>{ const cycle={...(n.cycle||{}),lastStart:TODAY}; cycle.history=[...(cycle.history||[]),{start:TODAY,end:null,flow:"med"}]; return {...n,cycle}; }); return "🌙 period start logged"; }
    if(T==="cycleEnd"){ await setSent(n=>{ const c=n.cycle; if(!c||!c.history||!c.history.length)return n; const cycle={...c}; cycle.history=cycle.history.map((h,i)=>i===cycle.history.length-1?{...h,end:TODAY}:h); return {...n,cycle}; }); return "🌙 period end logged"; }
    if(T==="logPcos"){ await setToday(n=>{ const pcos={...(n.pcos||{})}; pcos[a.field]=Math.max(0,Math.min(5,Number(a.value))); return {...n,pcos}; }); return "❄️ "+a.field+" logged"; }
    if(T==="logFood"){ const num=v=>{const n=Number(v);return isNaN(n)?0:Math.round(n*10)/10;};
      const item={id:"fd"+Date.now(),name:a.name||"food",serving:a.serving||"",kcal:Math.round(Number(a.kcal)||0),protein:num(a.protein),carbs:num(a.carbs),fiber:num(a.fiber),fat:num(a.fat),time:new Date().toISOString()};
      await setToday(n=>({...n,food:[...(n.food||[]),item]})); return "🍽️ "+item.name+" — "+item.kcal+" kcal · "+item.protein+"g protein · "+item.fiber+"g fibre"; }
    if(T==="completeTask"||T==="deleteTask"){ let hit=null;
      await setSent(n=>{ const ts=(n.tasks||[]).slice(); const i=findByText(ts,a.text,"text"); if(i<0)return n; hit=ts[i].text;
        let c=(n.customReminders||[]).slice(); const tid=ts[i].id;
        if(T==="deleteTask"){ ts.splice(i,1); c=c.filter(r=>!(r.taskId===tid&&!r.done)); }                  // deleting the thing removes its open ping
        else { ts[i]={...ts[i],done:true,status:"done"}; c=c.map(r=>r.taskId===tid&&!r.done?{...r,done:true}:r); }
        return {...n,tasks:ts,customReminders:c}; });
      return hit?(T==="deleteTask"?"🗑️ removed task: ":"✅ done: ")+hit:null; }
    if(T==="completeGoal"||T==="deleteGoal"){ let hit=null;
      await setSent(n=>{ const keys=a.period==="month"?["goalsMonth"]:a.period==="week"?["goalsWeek"]:["goalsWeek","goalsMonth"];
        for(const key of keys){ const g=(n[key]||[]).slice(); const i=findByText(g,a.text,"text");
          if(i>=0){ hit=g[i].text; if(T==="deleteGoal")g.splice(i,1); else g[i]={...g[i],done:true}; return {...n,[key]:g}; } }
        return n; });
      return hit?(T==="deleteGoal"?"🗑️ removed goal: ":"🌷 goal done: ")+hit:null; }
    if(T==="deleteEvent"){ let hit=null;
      await setSent(n=>{ const evs=(n.calendarEvents||[]).slice(); let i=-1;
        if(a.date) i=evs.findIndex(e=>e.date===a.date && String(e.title||"").toLowerCase().includes(String(a.title||"").toLowerCase()));
        if(i<0) i=findByText(evs,a.title,"title"); if(i<0)return n; hit=evs[i].title; evs.splice(i,1); return {...n,calendarEvents:evs}; });
      return hit?"🗑️ removed event: "+hit:null; }
    if(T==="removeBirthday"){ let hit=null; await setSent(n=>{ const b=(n.birthdays||[]).slice(); const i=findByText(b,a.name,"name"); if(i<0)return n; hit=b[i].name; b.splice(i,1); return {...n,birthdays:b}; }); return hit?"🗑️ removed "+hit+"'s birthday":null; }
    if(T==="addMed"){ if(!a.name)return null; await setSent(n=>({...n,medsList:[...(n.medsList||[]),{id:"m"+Date.now(),name:a.name,dose:a.dose||"",time:a.time||""}]})); return "💊 added "+a.name; }
    if(T==="removeMed"){ let hit=null; await setSent(n=>{ const m=(n.medsList||[]).slice(); const i=findByText(m,a.name,"name"); if(i<0)return n; hit=m[i].name; m.splice(i,1); return {...n,medsList:m}; }); return hit?"💊 removed "+hit:null; }
    if(T==="addJoy"){ if(!a.text)return null; await setSent(n=>({...n,joyJar:[...(n.joyJar||[]),a.text]})); return "🫙 joy added: "+a.text; }
    if(T==="logSleep"){ const v=Number(a.hours); if(isNaN(v))return null; await setToday(n=>({...n,sleep:Math.max(0,Math.min(24,v))})); return "🌙 sleep: "+v+"h"; }
    if(T==="logMj"){ const F=["nausea","constipation","diarrhea","reflux","belly","fatigue","foodnoise"]; if(!F.includes(a.field))return null;
      await setToday(n=>{ const mj={...(n.mounjaro||{})}; mj[a.field]=Math.max(0,Math.min(5,Number(a.value)||0)); return {...n,mounjaro:mj}; }); return "💉 "+a.field+" logged"; }
    if(T==="mjToggle"){ const F=["proteinMeals","smallerMeals","fiber","gentleMove"]; if(!F.includes(a.field))return null;
      await setToday(n=>{ const mj={...(n.mounjaro||{})}; mj[a.field]=(a.on!=null?!!a.on:!mj[a.field]); return {...n,mounjaro:mj}; }); return "💉 "+a.field+(a.on===false?" off":" ✓"); }
    if(T==="pcosToggle"){ const F=["moved","balanced","protein","lowsugar"]; if(!F.includes(a.field))return null;
      await setToday(n=>{ const p={...(n.pcos||{})}; p[a.field]=(a.on!=null?!!a.on:!p[a.field]); return {...n,pcos:p}; }); return "❄️ "+a.field+(a.on===false?" off":" ✓"); }
    if(T==="setFlow"){ const v=["light","med","heavy"].includes(a.value)?a.value:null; if(!v)return null;
      await setToday(n=>{ const p={...(n.pcos||{})}; p.flow=v; return {...n,pcos:p,flow:v}; }); return "🌙 flow: "+v; }
    if(T==="addMoney"){ const amt=Number(a.amount); if(isNaN(amt)||amt<=0)return null;
      const item={id:"mny"+Date.now(),date:(a.date&&/^\d{4}-\d{2}-\d{2}$/.test(a.date))?a.date:TODAY,dir:(a.dir==="out"?"out":"in"),cat:a.cat||"Other",amount:Math.round(amt*100)/100,desc:a.desc||""};
      await setSent(n=>({...n,money:[...(n.money||[]),item]})); return "💶 "+(item.dir==="in"?"+":"−")+"€"+item.amount.toFixed(2)+" · "+item.cat; }
    if(T==="addSponsor"){ if(!a.name)return null; await setSent(n=>({...n,sponsors:[...(n.sponsors||[]),{id:"sp"+Date.now(),name:a.name,code:a.code||"",payout:a.payout||"",url:a.url||"",note:a.note||"",status:(["pending","active","done"].includes(a.status)?a.status:"pending")}]})); return "💜 sponsor added: "+a.name; }
    if(T==="sponsorStatus"){ const st=["pending","active","done"].includes(a.status)?a.status:null; if(!st)return null; let hit=null;
      await setSent(n=>{ const s=(n.sponsors||[]).slice(); const i=findByText(s,a.name,"name"); if(i<0)return n; hit=s[i].name; s[i]={...s[i],status:st}; return {...n,sponsors:s}; }); return hit?"💜 "+hit+" → "+st:null; }
    if(T==="removeSponsor"){ let hit=null; await setSent(n=>{ const s=(n.sponsors||[]).slice(); const i=findByText(s,a.name,"name"); if(i<0)return n; hit=s[i].name; s.splice(i,1); return {...n,sponsors:s}; }); return hit?"🗑️ removed sponsor "+hit:null; }
    if(T==="logBodyComp"){ const f={}; let any=false; const num=v=>{const n=Number(v);return isNaN(n)?null:Math.round(n*10)/10;};
      [["weight","w"],["fat","fat"],["muscle","muscle"],["bone","bone"],["water","water"],["visceral","visceral"],["hr","hr"]].forEach(([s2,d2])=>{ const v=num(a[s2]); if(v!=null){ f[d2]=v; any=true; } });
      if(!any)return null; await upsertWeightToday(f); return "📊 body metrics logged"; }
    if(T==="setFoodTargets"){ const num=v=>{const n2=Number(v);return isNaN(n2)?null:n2;};
      await setSent(n=>{ const t={...(n.foodTargets||{kcal:1500,protein:110,fiber:28})}; if(num(a.kcal))t.kcal=num(a.kcal); if(num(a.protein))t.protein=num(a.protein); if(num(a.fiber))t.fiber=num(a.fiber); return {...n,foodTargets:t}; }); return "🎯 food targets updated"; }
    if(T==="removeFood"){ let hit=null; await setToday(n=>{ const f=(n.food||[]).slice(); const i=findByText(f,a.name,"name"); if(i<0)return n; hit=f[i].name; f.splice(i,1); return {...n,food:f}; }); return hit?"🗑️ removed "+hit+" from today's food":null; }
    if(T==="removeShot"){ let hit=null; await setSent(n=>{ const log=(n.injectionLog||[]).slice(); let i=(a.date&&a.date!=="last")?log.findIndex(s2=>s2.date===a.date):log.length-1;
        if(i<0||!log[i])return n; hit=log[i].date; log.splice(i,1); return {...n,injectionLog:log}; });
      return hit?"🗑️ removed the shot from "+fmtDate(hit):null; }
    if(T==="removePeriod"){ let hit=null; await setSent(n=>{ const c={...(n.cycle||{})}; let h=(c.history||[]).slice();
        let i=(a.date&&a.date!=="last")?h.findIndex(x=>x.start===a.date):h.length-1; if(i<0||!h[i])return n; hit=h[i].start; h.splice(i,1);
        c.history=h; const starts=h.map(x=>x.start).filter(Boolean).sort(); c.lastStart=starts.length?starts[starts.length-1]:null; return {...n,cycle:c}; });
      return hit?"🗑️ removed the period log from "+fmtDate(hit):null; }
    if(T==="setJournalNote"){ if(!a.text)return null; await setToday(n=>({...n,journal:a.text})); return "🌙 journal note saved"; }
    if(T==="setEnergyToday"){ const v=Number(a.value); if(![1,3,5].includes(v))return null; await setToday(n=>({...n,energy:v})); return "🥄 energy set to "+(v===1?"low":v===3?"med":"high"); }
    if(T==="removeSticky"){ let hit=null; const plain=x=>String(x.html||x.text||"").replace(/<[^>]*>/g,"");
      await setSent(n=>{ const s=(n.stickies||[]).slice(); const q=String(a.text||"").toLowerCase().trim(); if(!q)return n;
        const i=s.findIndex(x=>plain(x).toLowerCase().includes(q)); if(i<0)return n; hit=plain(s[i]).slice(0,30); s.splice(i,1); return {...n,stickies:s}; });
      if(hit){ try{ renderStickies(); }catch(e){} } return hit?"🗑️ removed sticky “"+hit+"”":null; }
    if(T==="removeCapture"){ let hit=null; await setSent(n=>{ const c=(n.captures||[]).slice(); const i=findByText(c,a.text,"text"); if(i<0)return n; hit=c[i].text; c.splice(i,1); return {...n,captures:c}; }); return hit?"🗑️ removed: "+hit:null; }
    if(T==="startJournal"){ setTimeout(()=>{ try{ H.startKikoJournal(); }catch(e){} },250); return "📓 starting your journal"; }
    if(T==="startTaxPrep"){ setTimeout(()=>{ try{ H.startTaxPrep(); }catch(e){} },250); return "🧾 starting tax prep"; }
    if(T==="addBirthday"){ let M,D; if(a.date&&/^\d{4}-\d{2}-\d{2}$/.test(a.date)){ M=+a.date.slice(5,7); D=+a.date.slice(8,10); } else { M=Number(a.month); D=Number(a.day); }
      if(!M||!D)return null; await setSent(n=>({...n,birthdays:[...(n.birthdays||[]),{id:"bd"+Date.now(),name:a.name||"friend",month:M,day:D}]}));
      return "🎂 "+(a.name||"friend")+"'s birthday — "+fmtDate(new Date().getFullYear()+"-"+String(M).padStart(2,"0")+"-"+String(D).padStart(2,"0")); }
    if(T==="addGameTopic"){ if(!a.name)return null; await gameTopicAdd(a.name); return "🎮 now tracking "+a.name; }
    if(T==="removeGameTopic"){ if(!a.name)return null; await gameTopicRemove(a.name); return "🎮 stopped tracking "+a.name; }
    if(T==="startScript"){ const sk=["long","twitter"].includes(a.kind)?a.kind:"short"; state.script={kind:sk,title:a.title||"",references:a.references||"",raw:a.raw||"",out:null}; state.tab="script";
      if(a.format && (state.script.raw||state.script.references)){ setTimeout(()=>{ try{scrFormat();}catch(e){} },150); }
      return "📝 started a "+(sk==="long"?"long-form":sk==="twitter"?"X post":"short")+(sk==="twitter"?"":" script")+(a.title?" — “"+a.title+"”":""); }
    /* stream schedule — the UI shows per-week plans (schedWeeks); the old flat `schedule` only acts as the
       default for an un-edited current week. Write BOTH so what Kiko says matches what she sees:
       the week on screen updates now, and the "usual week" default carries it into future weeks. */
    if(T==="addStreamDay"){ const day=normDay(a.day); if(!day)return null;
      const upd=arr=>{ const i=arr.findIndex(r=>r.day===day);
        if(i>=0){ const c=arr.slice(); c[i]={...c[i], show:(a.show!=null?a.show:c[i].show), time:(a.time!=null?a.time:c[i].time)}; return c; }
        return [...arr,{id:"sc"+Date.now()+Math.floor(Math.random()*99),day,show:a.show||"Stream",time:a.time||STREAM_TIME_DEFAULT}]; };
      await setWeekSlots(weekStartISO(0),upd);
      await setSent(n=>({...n,schedule:upd((n.schedule||[]).slice())}));
      return "🔴 "+day+(a.time?" "+a.time:"")+(a.show?" · "+a.show:"")+" — this week + your usual schedule updated"; }
    if(T==="removeStreamDay"){ const day=normDay(a.day); if(!day)return null;
      await setWeekSlots(weekStartISO(0),arr=>arr.filter(r=>r.day!==day));
      await setSent(n=>({...n,schedule:(n.schedule||[]).filter(r=>r.day!==day)}));
      return "🔴 removed "+day+" from this week & your usual schedule"; }
    if(T==="clearStreamSchedule"){
      await setWeekSlots(weekStartISO(0),()=>[]);
      await setSent(n=>({...n,schedule:[]}));
      return "🔴 cleared this week's streams and your usual-week schedule"; }
    /* ===== 💌 wishlist for Eggie — feature requests / change notes, stored for Eggie to read & build ===== */
    if(T==="noteForEggie"){ if(!a.text)return null;
      await setSent(n=>({...n,eggieRequests:[...(n.eggieRequests||[]),{id:"er"+Date.now(),date:TODAY,text:String(a.text).slice(0,500),tab:state.tab,status:"new"}]}));
      return "💌 noted for Eggie: "+a.text; }
    /* ===== app & comfort controls — Kiko can drive the whole hub ===== */
    if(T==="setPref"){
      if(a.pref==="text"){ try{ localStorage.setItem("mifu-textsize",String(a.on?18:TEXT_DEFAULT)); }catch(e){} applyPrefs(); render();
        return a.on?"🔠 text bumped up — fine-tune it with the slider in Settings":"🔠 text back to normal"; }
      const map={calm:"mifu-calm",focus:"mifu-focus"}; const k=map[a.pref]; if(!k)return null;
      try{ localStorage.setItem(k,a.on?"1":"0"); }catch(e){} applyPrefs();
      return ({calm:"❄️ calm mode ",focus:"🌙 focus mode "})[a.pref]+(a.on?"on":"off"); }
    if(T==="lockLayout"){ try{ localStorage.setItem("layout-locked",a.on?"1":"0"); }catch(e){} applyPrefs(); return a.on?"🔒 layout locked":"🔓 layout unlocked"; }
    if(T==="hideCard"||T==="showCard"){ const tab=["home","care","food"].includes(a.tab)?a.tab:"home";
      try{ if(!MODULAR_LABELS[tab]||!Object.keys(MODULAR_LABELS[tab]).length){ ({home:viewHome,care:viewCare,food:viewFood})[tab](); } }catch(e){}
      const labels=MODULAR_LABELS[tab]||{}; const entries=Object.entries(labels).map(([k,l])=>({k,l})); if(!entries.length)return null;
      const i=findByText(entries,a.card,"l"); if(i<0)return null; const key=entries[i].k;
      await setLayout(tab,L=>{ L.hidden={...L.hidden,[key]:T==="hideCard"}; if(T==="showCard"&&!L.order.includes(key))L.order.push(key); });
      return (T==="hideCard"?"🙈 hid “":"👀 showing “")+entries[i].l+"” on "+tab; }
    if(T==="startTimer"){ const mode=a.mode==="rest"?"rest":"focus";
      if(!TIMER.open) toggleTimer();
      setTimerMode(mode);
      if(mode==="focus"){ const w=Number(a.work)||25, b2=Number(a.break)||5; TIMER.workMin=w; TIMER.breakMin=b2; TIMER.phase="focus"; TIMER.cycles=0; TIMER.total=w*60; TIMER.secs=TIMER.total; }
      else { const r=Number(a.minutes)||TIMER.restMin||5; TIMER.restMin=r; TIMER.total=r*60; TIMER.secs=TIMER.total; }
      if(!TIMER.running) timerToggle(); else paintTimer();
      return mode==="focus"?("🍅 focus timer on — "+TIMER.workMin+"/"+TIMER.breakMin):("🫧 rest timer on — "+TIMER.restMin+" min"); }
    if(T==="stopTimer"){ if(TIMER.running) timerToggle(); if(TIMER.open) toggleTimer(); return "⏹ timer closed"; }
    if(T==="setAppConfig"){ const out={};
      if(a.name)out.name=String(a.name).slice(0,60); if(a.greeting)out.greeting=String(a.greeting).slice(0,60);
      if(["kg","lb"].includes(a.weightUnit))out.weightUnit=a.weightUnit;
      if(["soft","numbers","hidden"].includes(a.weightDisplay))out.weightDisplay=a.weightDisplay;
      if(!Object.keys(out).length)return null;
      await setSent(n=>({...n,appConfig:{...(n.appConfig||{}),...out}})); applyAppConfig();
      return "📝 details updated"; }
    if(T==="exportBackup"){ setTimeout(()=>{ try{ H.export(); }catch(e){} },300); return "💾 downloading your backup"; }
    /* ===== tidy-up controls for the remaining lists ===== */
    if(T==="removeMoney"){ let hit=null; await setSent(n=>{ const m=(n.money||[]).slice(); const i=findByText(m,a.desc,"desc"); if(i<0)return n; hit=m[i]; m.splice(i,1); return {...n,money:m}; });
      return hit?("🗑️ removed "+(hit.dir==="in"?"+":"−")+"€"+hit.amount+" · "+(hit.desc||hit.cat||"entry")):null; }
    if(T==="removeNSV"){ let hit=null; await setSent(n=>{ const v=(n.nsv||[]).slice(); const i=findByText(v,a.text,"t"); if(i<0)return n; hit=v[i].t; v.splice(i,1); return {...n,nsv:v}; }); return hit?"🗑️ removed: "+hit:null; }
    if(T==="removeJoy"){ let hit=null; const q=String(a.text||"").toLowerCase().trim(); if(!q)return null;
      await setSent(n=>{ const j=(n.joyJar||[]).slice(); const i=j.findIndex(x=>String(x).toLowerCase().includes(q)); if(i<0)return n; hit=j[i]; j.splice(i,1); return {...n,joyJar:j}; });
      return hit?"🗑️ removed joy: "+hit:null; }
    if(T==="removeMeasurement"){ let hit=null; await setSent(n=>{ const m=(n.measurements||[]).slice(); let i=(a.date&&a.date!=="last")?m.findIndex(x=>x.date===a.date):m.length-1; if(i<0||!m[i])return n; hit=m[i].date; m.splice(i,1); return {...n,measurements:m}; });
      return hit?"🗑️ removed measurements from "+fmtDate(hit):null; }
    if(T==="editGoal"){ let hit=null; if(!a.newText)return null;
      await setSent(n=>{ const keys=a.period==="month"?["goalsMonth"]:a.period==="week"?["goalsWeek"]:["goalsWeek","goalsMonth"];
        for(const key of keys){ const g=(n[key]||[]).slice(); const i=findByText(g,a.text,"text");
          if(i>=0){ hit=a.newText; g[i]={...g[i],text:a.newText}; return {...n,[key]:g}; } }
        return n; });
      return hit?"✏️ goal → "+hit:null; }
    /* ===== v4: focus sessions · art · prep checklists ===== */
    if(T==="startFocusSession"){ const goal=String(a.goal||"this").slice(0,80); const mins=Math.max(5,Math.min(90,Number(a.minutes)||25));
      KIKO.focus={goal}; if(!TIMER.open) toggleTimer(); setTimerMode("focus");
      TIMER.workMin=mins; TIMER.breakMin=Math.max(3,Math.round(mins/5)); TIMER.phase="focus"; TIMER.cycles=0; TIMER.total=mins*60; TIMER.secs=TIMER.total;
      if(!TIMER.running) timerToggle(); else paintTimer();
      return "🍅 "+mins+" min together on “"+goal+"” — I'm right here, timer's running"; }
    if(T==="addInspo"){ if(!a.text&&!a.url)return null;
      await setSent(n=>({...n,inspoVault:[...(n.inspoVault||[]),{id:"iv"+Date.now(),kind:a.url?"link":"idea",text:String(a.text||"").slice(0,200),url:String(a.url||"").slice(0,300),done:false}].slice(-60)}));
      return "💡 parked in your inspiration vault"; }
    if(T==="pickInspo"){ const all=(state.sentinel.inspoVault||[]); const v=all.filter(x=>!x.done).length?all.filter(x=>!x.done):all; if(!v.length)return "💡 the vault's empty — park a few ideas first";
      const pick=v[Math.floor(Math.random()*v.length)]; state.inspoPicked=pick.id;
      return "🦊 picked for you: “"+((pick.text||pick.url||"a saved reference").slice(0,80))+"” — it's glowing on your Art page"; }
    if(T==="logArt"){ const mn=Math.max(0,Math.min(720,Number(a.min)||0));
      await setSent(n=>{ const log=(n.artLog||[]).slice(); if(mn) log.push({date:TODAY,min:mn,note:String(a.note||"").slice(0,120)||undefined}); else if(!log.some(x=>x.date===TODAY)) log.push({date:TODAY,note:String(a.note||"").slice(0,120)}); return {...n,artLog:log.slice(-200)}; });
      return "🎨 "+(mn?mn+" min of art logged":"art day logged")+" — look at you ✨"; }
    if(T==="addArtIdea"){ if(!a.text)return null;
      await setSent(n=>({...n,artIdeas:[...(n.artIdeas||[]),{id:aid("i"),text:String(a.text).slice(0,200),added:TODAY}]}));
      return "💡 parked in the ideas dump: "+String(a.text).slice(0,60); }
    if(T==="logStress"){ const v=Number(a.value); if(isNaN(v))return null; await setToday(n=>({...n,stress:Math.max(0,Math.min(5,v))})); return "🫨 stress "+Math.max(0,Math.min(5,v))+"/5 logged"; }
    if(T==="tagDay"){ const tg=(Array.isArray(a.tags)?a.tags:[]).map(t=>String(t).trim().slice(0,24)).filter(Boolean).slice(0,6); if(!tg.length)return null;
      await setToday(n=>({...n,tags:[...new Set([...(n.tags||[]),...tg])]})); return "🏷️ tagged today: "+tg.join(", "); }
    if(T==="prepCheck"){ const on=a.on!=null?!!a.on:true; let hit=null;
      if(a.list==="birthday"){ const bd=(state.sentinel.birthdays||[]).map(b=>({...b,...nextBirthdayInfo(b)})); const i=findByText(bd,a.name,"name"); if(i<0)return null;
        const key=bd[i].id+"-"+bd[i].date.slice(0,4);
        await setSent(n=>{ const all={...(n.bdayPrep||{})}; const cur={items:[],...(all[key]||{})}; const items=(cur.items||[]).slice();
          const j=findByText(items,a.text,"text"); if(j<0){ items.push({id:"pp"+Date.now(),text:String(a.text||"").slice(0,120),done:on}); hit=a.text; } else { items[j]={...items[j],done:on}; hit=items[j].text; }
          all[key]={...cur,items}; return {...n,bdayPrep:all}; });
        return hit?((on?"☑ ":"☐ ")+hit+" — "+bd[i].name+"'s birthday list"):null; }
      const evs=(state.sentinel.calendarEvents||[]).filter(e=>!gameSrc(e)); const i=findByText(evs,a.name,"title"); if(i<0)return null;
      await setSent(n=>{ const all={...(n.eventPrep||{})}; const cur={items:[],...(all[evs[i].id]||{})}; const items=(cur.items||[]).slice();
        const j=findByText(items,a.text,"text"); if(j<0){ items.push({id:"pp"+Date.now(),text:String(a.text||"").slice(0,120),done:on}); hit=a.text; } else { items[j]={...items[j],done:on}; hit=items[j].text; }
        all[evs[i].id]={...cur,items}; return {...n,eventPrep:all}; });
      return hit?((on?"☑ ":"☐ ")+hit+" — "+evs[i].title+" prep"):null; }
  }catch(e){ console.error("action failed",T,e); return null; }
  return null;
}

/* fuzzy item matcher for agent delete/complete: exact → startsWith → contains */
function findByText(list,text,key){ const q=String(text||"").toLowerCase().trim(); if(!q)return -1;
  let i=list.findIndex(x=>String(x[key]||"").toLowerCase()===q);
  if(i<0) i=list.findIndex(x=>String(x[key]||"").toLowerCase().startsWith(q));
  if(i<0) i=list.findIndex(x=>String(x[key]||"").toLowerCase().includes(q));
  return i; }

/* normalize any weekday phrasing → the 3-letter form the schedule uses (Mon..Sun) */
function normDay(d){ if(!d)return null; const m={sun:"Sun",sunday:"Sun",mon:"Mon",monday:"Mon",tue:"Tue",tues:"Tue",tuesday:"Tue",wed:"Wed",weds:"Wed",wednesday:"Wed",thu:"Thu",thur:"Thu",thurs:"Thu",thursday:"Thu",fri:"Fri",friday:"Fri",sat:"Sat",saturday:"Sat"}; return m[String(d).trim().toLowerCase()]||null; }


function start(){
  applyPrefs();
  // restore sidebar collapsed state from last visit
  try{ const sb=document.getElementById("sidebar"); if(sb&&localStorage.getItem("mifu-sb-col")==="1") sb.classList.add("sb-collapsed"); }catch(e){}
  try{ kikoStart(); setTimeout(kikoGreet,3500); setInterval(kikoGreet,10*60*1000); }catch(e){ console.error(e); }
  setTimeout(autoResearchGames, 8000);
  // auto-refresh gacha events every Sunday (or if never run before)
  const isSunday=new Date().getDay()===0;
  const lastGachaRefresh=localStorage.getItem("gachaEvLastRefresh")||"";
  if(isSunday&&lastGachaRefresh!==TODAY) setTimeout(refreshGachaEvents, 12000);   // one hello, then at most every 10 min (was 45s — way too chatty)
  if(DEMO){ render(); return; }                 // demo: data is instant — one render
  // live: gentle loader while Supabase connects, then check login
  const v=$("#view");
  if(v) v.innerHTML='<div class="panel" style="max-width:380px;margin:48px auto;text-align:center"><div style="font-size:28px">❄️🦊</div><p class="soft" style="margin:8px 0 0">Konfuyu~ getting your cozy space ready…</p></div>';
  const sc=document.createElement('script');
  sc.src="vendor/supabase.min.js";   // vendored, not CDN-loaded — see vendor/README.md
  sc.onload=async()=>{
    try{ SB=window.supabase.createClient(CONFIG.url,CONFIG.anonKey); }catch(e){ console.error(e); render(); return; }
    // handle magic link callback (URL has #access_token after clicking the email link)
    if(location.hash.includes("access_token")){
      const {data:{session},error}=await SB.auth.getSession();
      if(session&&session.user){ UID=session.user.id; history.replaceState(null,"",location.pathname); render(); return; }
    }
    const {data:{session}}=await SB.auth.getSession();
    if(!session||!session.user){ location.href="login.html"; return; }   // not signed in — bounce to the login page, never render the app
    UID=session.user.id;
    // one-time migration: merge any sentinel data saved under "mifuyu" into the real UUID row
    try{
      const legacyId="mifuyu";
      if(UID!==legacyId){
        const {data:legRow}=await SB.from("daily_logs").select("notes").eq("user_id",legacyId).eq("date",SENTINEL).maybeSingle();
        const legData=legRow&&legRow.notes&&Object.keys(legRow.notes).length>3?legRow.notes:null;
        if(legData){
          const {data:realRow}=await SB.from("daily_logs").select("notes").eq("user_id",UID).eq("date",SENTINEL).maybeSingle();
          const realData=(realRow&&realRow.notes)||{};
          const merged={...legData,...realData}; // real data wins on conflict
          await SB.from("daily_logs").upsert({user_id:UID,date:SENTINEL,notes:merged},{onConflict:"user_id,date"});
          // also migrate legacy daily rows that aren't already under UUID
          const {data:legDays}=await SB.from("daily_logs").select("date,notes").eq("user_id",legacyId).neq("date",SENTINEL);
          if(legDays&&legDays.length){
            const {data:realDays}=await SB.from("daily_logs").select("date").eq("user_id",UID).neq("date",SENTINEL);
            const realDates=new Set((realDays||[]).map(r=>r.date));
            const toMigrate=legDays.filter(r=>!realDates.has(r.date));
            if(toMigrate.length) await SB.from("daily_logs").upsert(toMigrate.map(r=>({user_id:UID,date:r.date,notes:r.notes})),{onConflict:"user_id,date"});
          }
          console.log("✅ migrated legacy mifuyu data to UUID account");
        }
      }
    }catch(migErr){ console.warn("migration skipped:",migErr); }
    render();
  };
  sc.onerror=()=>{ render(); };
  document.head.appendChild(sc);
}

function gameEventPrompt(gameName){
  const sources={
    "Infinity Nikki":"https://infinitynikki.infoldgames.com/en/news AND https://game8.co/games/Infinity-Nikki AND r/InfinityNikki. Nikki runs MANY small simultaneous events — find ALL of them ending within 14 days. Look for: gathering/exploration events, limited claimable rewards, styling contests, resonance events, story events, Starlit Crystal activities, Wishing Well events. Include EVERY one with an exact end date, not just the most obvious banner.",
    "Honkai: Star Rail":"https://game8.co/games/Honkai-Star-Rail/archives/408749 AND https://honkai-star-rail.fandom.com/wiki/Events for the full event list. Include: Aptitude Showcase, story events, challenge events, SU/Simulated Universe events, login rewards with deadlines. Do NOT include character or light cone warps (e.g. Gift of Tempered Blade, Bygone Reminiscence).",
    "Genshin Impact":"https://game8.co/games/Genshin-Impact/archives/301599 AND https://genshin-impact.fandom.com/wiki/Events. Genshin runs many simultaneous events per patch — find ALL of them ending within 14 days. Do NOT include Phase 1/2 banner entries or character wishes.",
    "Zenless Zone Zero":"https://game8.co/games/Zenless-Zone-Zero/archives/457176 AND https://zzz.rng.moe/en/timeline. Include ALL active events AND the EXACT end date/time for the current Hollow Zero cycle, Shiyu Defense cycle, and Deadly Assault cycle.",
    "Wuthering Waves":"https://game8.co/games/Wuthering-Waves/archives/453473 AND https://wuwa.uk/event-calendar. Find ALL active events with end dates — currently includes Instant Flashlight, Night City Roaming, Gifts of Dreamchasers, Matrix Reform. Also include Tower of Adversity reset date.",
    "Arknights":"https://arknights.wiki.gg/wiki/Event/Upcoming AND https://arknights.wiki.gg/wiki/Event. Include CC (Contingency Contract), IS (Integrated Strategies) season end dates, and any active limited story events.",
    "Reverse: 1999":"https://dotgg.gg/reverse-1999/events/ AND https://reverse1999.fandom.com/wiki/Events. Find ALL active events — currently includes Turquoise Serpent Club (ends ~Jun 29) and Where Spirits Rest (ends ~Jul 1). Verify exact dates and find any additional events.",
    "NTE":"https://gamewith.net/nte/74811 AND https://www.pockettactics.com/neverness-to-everness/events. NTE is a newer game — find all active in-game events including the Porsche collab, story events, Underground Circuit racing, What's Baking event, and anything else with an end date."
  };
  const src=Object.entries(sources).find(([k])=>gameName.toLowerCase().includes(k.toLowerCase())||k.toLowerCase().includes(gameName.toLowerCase()));
  const sourceHint=src?`\nWhere to look: ${src[1]}`:"";
  return `Today is ${TODAY}. Search the web RIGHT NOW for ALL currently active in-game events, endgame resets, and limited-time content for ${gameName} only.${sourceHint}

Return ONLY a valid JSON array — no markdown, no explanation, just the array. Each item:
{"title":"${gameName} — [exact event name]","game":"${gameName}","date":"YYYY-MM-DD","endDate":"YYYY-MM-DD or null","type":"event|reset|livestream|update","url":"source URL or empty string","note":"one plain sentence about what this is and why it matters"}

Rules:
- Find EVERY active limited-time event — not just the biggest one. There may be 5-10 running at once.
- Include endgame rotation resets with EXACT current cycle end dates (not generic dates)
- DO NOT include gacha pull banners, character warps, weapon banners, or any pulling mechanic
- DO include patch updates, story chapters, challenge events, reward collection deadlines
- date = when it started (or today if already running), endDate = exact end date
- No unescaped quotes or special characters inside string values
- Only include things with confirmed real dates from official sources or wikis
- One entry per event — no duplicates`;
}

async function refreshGachaEvents(){
  const btn=document.getElementById("gachaRefreshBtn");
  const body=document.getElementById("gachaFocusBody");
  if(btn){ btn.disabled=true; btn.textContent="🦊 researching…"; }
  const list=gachaList();
  let allFresh=[];
  for(let i=0;i<list.length;i++){
    const g=list[i];
    if(body) body.innerHTML=`<p class="soft" style="font-size:12px;margin:8px 0">Kiko is checking ${esc(g.name)}… (${i+1}/${list.length}) ❄️</p>`;
    try{
      const d=await kikoSimpleCall({question:gameEventPrompt(g.name),history:[],tab:"gachas",userModel:"",smart:false});
      let raw=(d.reply||"").replace(/```json|```/g,"").trim();
      const arrMatch=raw.match(/\[[\s\S]*\]/); if(arrMatch) raw=arrMatch[0];
      let events; try{ events=JSON.parse(raw); }catch(_){
        const cleaned=raw.replace(/"(?:[^"\\]|\\.)*"/g,m=>m.replace(/[\n\r\t]/g," ").replace(/(?<!\\)\\(?!["\\/bfnrtu])/g,"\\\\"));
        try{ events=JSON.parse(cleaned); }catch(_2){ events=[]; }
      }
      if(Array.isArray(events)) allFresh.push(...events);
    }catch(_){}
    if(i<list.length-1) await new Promise(r=>setTimeout(r,1500));
  }
  try{
    await DB.saveDaily(SENTINEL,n=>{
      const kept=(n.calendarEvents||[]).filter(e=>!e.autoFetched);
      const fresh=allFresh.map(e=>({
        id:"auto"+Date.now()+Math.random().toString(36).slice(2),
        title:e.title||"",
        date:e.date||TODAY,
        endDate:e.endDate||null,
        color:"#9fc7f0",
        src:"game",
        autoFetched:true,
        tz:"Europe/Amsterdam",
        time:"",
        note:e.note||"",
        url:e.url||""
      }));
      return {...n,calendarEvents:[...kept,...fresh]};
    });
    localStorage.setItem("gachaEvLastRefresh",TODAY);
    render();
  }catch(e){
    if(body) body.innerHTML=`<p class="soft" style="font-size:12px;color:#c87080;margin:4px 0">Couldn't save events: ${esc(e.message)} 🌧️</p>`;
    if(btn){ btn.disabled=false; btn.textContent="🔄 Refresh events"; }
  }
}


async function exportBackup(){
  const btn=document.getElementById("exportBtn"), msg=document.getElementById("backupMsg");
  if(btn)btn.disabled=true; if(msg)msg.textContent="Exporting…";
  try{
    const {data}=await SB.from("daily_logs").select("*").eq("user_id",UID);
    const json=JSON.stringify(data||[], null, 2);
    const blob=new Blob([json],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`mifuyu-health-backup-${TODAY}.json`; a.click();
    URL.revokeObjectURL(a.href);
    if(msg)msg.textContent="Downloaded ✓ — keep it somewhere safe! 💗";
  }catch(e){ if(msg)msg.textContent="Export failed: "+e.message+" 🌧️"; }
  if(btn)btn.disabled=false;
}


async function restoreFromBackup(input){
  const msg=document.getElementById("restoreMsg"); if(!input.files||!input.files[0])return;
  if(msg)msg.textContent="Reading file…";
  try{
    const text=await input.files[0].text();
    const rows=JSON.parse(text);
    if(!Array.isArray(rows)) throw new Error("Invalid backup format — expected an array of rows");
    const sentinel=rows.find(r=>r.date===SENTINEL);
    if(!sentinel||!sentinel.notes) throw new Error("No sentinel row (2000-01-01) found in this file");
    if(msg)msg.textContent="Restoring sentinel data…";
    // fetch current sentinel fresh from DB and deep-merge: backup fills gaps, existing data wins on conflict
    const {data:cur}=await SB.from("daily_logs").select("notes").eq("user_id",UID).eq("date",SENTINEL).maybeSingle();
    const curNotes=cur&&cur.notes||{};
    const merged={...sentinel.notes,...curNotes}; // current DB wins on conflict — don't overwrite newer writes
    await SB.from("daily_logs").upsert({user_id:UID,date:SENTINEL,notes:merged},{onConflict:"user_id,date"});
    // also restore daily rows that are missing from the DB
    const dailyRows=rows.filter(r=>r.date!==SENTINEL);
    if(dailyRows.length){
      const {data:existing}=await SB.from("daily_logs").select("date").eq("user_id",UID).neq("date",SENTINEL);
      const existingDates=new Set((existing||[]).map(r=>r.date));
      const missing=dailyRows.filter(r=>!existingDates.has(r.date));
      if(missing.length) await SB.from("daily_logs").upsert(missing.map(r=>({user_id:UID,date:r.date,notes:r.notes})),{onConflict:"user_id,date"});
    }
    state.sentinel=merged;
    if(msg)msg.textContent=`✅ Restored! Sentinel data + ${dailyRows.length} daily rows processed. Reloading…`;
    setTimeout(()=>location.reload(),1500);
  }catch(e){ if(msg)msg.textContent="Restore failed: "+e.message+" 🌧️"; }
}

start();


/* ===== modular layout engine: drag-reorder (cards + tabs) · freeform resize · masonry · iPad/Pencil-ready ===== */
(function(){
  let d=null, sc=false, rafL=0;
  const gridEl=()=>document.querySelector(".grid-modular");
  function maxCols(){ const g=gridEl(); if(!g)return 2; const cc=g.querySelectorAll(".grid-col").length; return cc>0?cc:2; }
  function relayoutSoon(){ if(rafL)return; rafL=requestAnimationFrame(()=>{ rafL=0; try{layoutHome();}catch(_){} }); }
  function commitTabs(order){ try{ localStorage.setItem("tab-order",JSON.stringify(order)); }catch(e){} }
  function findDropSlot(cx,cy,grid){ const cols=[...grid.querySelectorAll(".grid-col")]; let col=cols[0],best=Infinity; cols.forEach(c=>{ const r=c.getBoundingClientRect(),mid=(r.left+r.right)/2,dist=Math.abs(cx-mid); if(dist<best){best=dist;col=c;} }); const widgets=[...col.querySelectorAll(".home-widget:not(.dragsrc):not(.drag-placeholder)")]; let ref=null,swapTarget=null; for(const w of widgets){ const r=w.getBoundingClientRect(),pct=(cy-r.top)/r.height; if(pct>=0&&pct<=1){ if(pct<0.28){ref=w;}else if(pct>0.72){ref=w.nextSibling;}else{swapTarget=w;} break; }else if(cy<r.top){ref=w;break;} } return{col,ref,swapTarget}; }
  function flipReorder(c, mutate){
    const kids=[...c.children], firsts=kids.map(k=>k.getBoundingClientRect());
    mutate(); try{layoutHome();}catch(_){}
    kids.forEach((k,i)=>{ if(k===(d&&d.item))return; const a=firsts[i], b=k.getBoundingClientRect(), dx=a.left-b.left, dy=a.top-b.top; if(!dx&&!dy)return; k.style.transition="none"; k.style.transform="translate("+dx+"px,"+dy+"px)"; requestAnimationFrame(()=>{ k.style.transition=""; k.style.transform=""; }); });
  }
  document.addEventListener("pointerdown",e=>{
    if(document.body.classList.contains("locked"))return;
    const rez=e.target.closest(".home-resize");
    if(rez){ const item=rez.closest(".home-widget"); if(item){ const r=item.getBoundingClientRect(), cur=item.classList.contains("span2")?2:1, panel=item.querySelector(".panel,section"), startH=panel?panel.getBoundingClientRect().height:160;
      d={mode:"resize",item,panel,key:item.getAttribute("data-w"),tab:item.getAttribute("data-tab"),startW:r.width,startCols:cur,cols:cur,startH,h:startH,sx:e.clientX,sy:e.clientY,moved:false,cap:rez,pid:e.pointerId}; try{rez.setPointerCapture(e.pointerId);}catch(_){} e.preventDefault(); } return; }
    const grip=e.target.closest(".home-grip");
    if(grip){ const item=grip.closest(".home-widget"), c=item&&(item.closest(".grid-modular")||item.parentElement); if(item&&c){ d={mode:"order",item,c,itemSel:".home-widget",key:"data-w",horiz:false,sx:e.clientX,sy:e.clientY,moved:false,cap:grip,pid:e.pointerId}; try{grip.setPointerCapture(e.pointerId);}catch(_){} e.preventDefault(); } return; }
    const tab=e.target.closest("#nav .tab");
    if(tab){ const c=tab.parentElement; d={mode:"order",item:tab,c,itemSel:".tab",key:"data-tab",isTab:true,horiz:true,sx:e.clientX,sy:e.clientY,moved:false,cap:tab,pid:e.pointerId}; try{tab.setPointerCapture(e.pointerId);}catch(_){} }
  },true);
  document.addEventListener("pointermove",e=>{
    if(!d)return;
    if(!d.moved){ if(Math.abs(e.clientX-d.sx)+Math.abs(e.clientY-d.sy)<6)return; d.moved=true;
      if(d.mode==="resize"){ d.item.classList.add("resizing"); }
      else { const r=d.item.getBoundingClientRect(); d.phH=r.height;
        const tab=d.item.getAttribute("data-tab"), key=d.item.getAttribute("data-w");
        const label=(MODULAR_LABELS[tab]&&MODULAR_LABELS[tab][key])||key||"card";
        const thumb=document.createElement("div"); thumb.className="drag-thumb"; thumb.textContent=label;
        document.body.appendChild(thumb); d.thumb=thumb;
        const ph=document.createElement("div"); ph.className="drag-placeholder"; ph.style.minHeight=d.phH+"px";
        d.item.parentElement.insertBefore(ph,d.item); d.ph=ph;
        d.item.classList.add("dragsrc"); }
    }
    e.preventDefault();
    if(d.mode==="resize"){ const unit=d.startW/d.startCols||d.startW; let nc=Math.round((d.startW+(e.clientX-d.sx))/unit); nc=Math.max(1,Math.min(2,nc)); if(nc!==d.cols){ d.cols=nc; d.item.classList.toggle("span2", nc>=2); d.item.dataset.c=cForSpan(nc); } const nh=Math.max(120,Math.round(d.startH+(e.clientY-d.sy))); d.h=nh; if(d.panel)d.panel.style.minHeight=nh+"px"; d.item.dataset.h=nh; relayoutSoon(); return; }
    if(d.thumb) d.thumb.style.transform="translate("+(e.clientX-60)+"px,"+(e.clientY-60)+"px)";
    if(d.isTab){ const el=document.elementFromPoint(e.clientX,e.clientY), over=el&&el.closest(d.itemSel); if(over&&over!==d.item&&over.parentElement===d.c){ const r=over.getBoundingClientRect(), before=e.clientX<r.left+r.width/2, ref=before?over:over.nextSibling; if(ref!==d.item) flipReorder(d.c,()=>d.c.insertBefore(d.item,ref)); } }
    else if(d.ph){ const grid=d.c.closest(".grid-modular")||d.c; const{col,ref,swapTarget}=findDropSlot(e.clientX,e.clientY,grid);
      if(swapTarget){
        // true swap: save both positions BEFORE touching the DOM, handle adjacent case
        const aP=d.ph.parentElement,aN=d.ph.nextSibling,bP=swapTarget.parentElement,bN=swapTarget.nextSibling;
        if(bN===d.ph){ bP.insertBefore(d.ph,swapTarget); } // swapTarget immediately before ph
        else if(aN===swapTarget){ aP.insertBefore(swapTarget,d.ph); } // ph immediately before swapTarget
        else{ aP.insertBefore(swapTarget,aN); bP.insertBefore(d.ph,bN); }
      } else if(d.ph.parentElement!==col||d.ph.nextSibling!==ref){ col.insertBefore(d.ph,ref); }
    }
  },true);
  document.addEventListener("pointerup",()=>{
    if(!d)return; const x=d; d=null; try{x.cap.releasePointerCapture(x.pid);}catch(_){}
    if(x.mode==="resize"){ x.item.classList.remove("resizing"); if(x.moved){ sc=true; setTimeout(()=>sc=false,350);
      // optimistic state update so layoutHome() reads correct size immediately
      const newSize={c:cForSpan(x.cols),h:Math.round(x.h)};
      if(!state.sentinel.layout)state.sentinel.layout={};
      if(!state.sentinel.layout[x.tab])state.sentinel.layout[x.tab]={order:[],size:{},min:{},hidden:{}};
      state.sentinel.layout[x.tab].size={...state.sentinel.layout[x.tab].size,[x.key]:newSize};
      try{layoutHome();}catch(_){}
      setLayout(x.tab,L=>{ L.size={...L.size,[x.key]:newSize}; });
    } return; }
    if(!x.moved)return;
    sc=true; setTimeout(()=>sc=false,350);
    if(x.thumb) x.thumb.remove();
    if(!x.isTab && x.ph){ const col=x.ph.parentElement; col.insertBefore(x.item,x.ph); x.ph.remove(); }
    x.item.classList.remove("dragsrc");
    if(x.isTab){ const order=[...x.c.querySelectorAll(x.itemSel)].map(it=>it.getAttribute(x.key)); commitTabs(order); }
    else {
      const grid=x.c.closest(".grid-modular")||x.c;
      const tab=grid.getAttribute("data-tab")||x.c.getAttribute("data-tab");
      // walk grid children: span2 items are direct children, span1 items are in .grid-col pairs
      // read explicit left/right column contents from the DOM — no interleaving
      const cols=[...grid.querySelectorAll(".grid-col")];
      const leftKeys=cols[0]?[...cols[0].querySelectorAll(".home-widget")].map(w=>w.getAttribute("data-w")).filter(Boolean):[];
      const rightKeys=cols[1]?[...cols[1].querySelectorAll(".home-widget")].map(w=>w.getAttribute("data-w")).filter(Boolean):[];
      const order=[...leftKeys,...rightKeys]; // flat list for compat
      // optimistic update
      if(!state.sentinel.layout)state.sentinel.layout={};
      if(!state.sentinel.layout[tab])state.sentinel.layout[tab]={order:[],size:{},min:{},hidden:{}};
      state.sentinel.layout[tab].order=order;
      state.sentinel.layout[tab].left=leftKeys;
      state.sentinel.layout[tab].right=rightKeys;
      setLayout(tab,L=>{ L.order=order; L.left=leftKeys; L.right=rightKeys; });
    }
  },true);
  document.addEventListener("pointercancel",()=>{ if(!d)return; if(d.thumb)d.thumb.remove(); if(d.ph){ d.ph.parentElement&&d.ph.parentElement.insertBefore(d.item,d.ph); d.ph.remove(); } if(d.item)d.item.classList.remove("dragsrc","resizing","reordering"); d=null; },true);
  document.addEventListener("click",e=>{ if(sc){ e.stopPropagation(); e.preventDefault(); sc=false; } },true);
  document.addEventListener("toggle",(e)=>{ if(e.target&&e.target.id==="foodMedsDetails"){ state.foodMedsOpen=e.target.open; }   // keep the meds list open while she ticks
    if(MODULAR_TABS.includes(state.tab)){ try{layoutHome();}catch(_){} } },true);
  window.addEventListener("resize",()=>{ clearTimeout(window._lhT); window._lhT=setTimeout(()=>{
    if(MODULAR_TABS.includes(state.tab)){ try{layoutHome();}catch(e){} }
    try{renderStickies();}catch(e){}        /* stickies keep their fractional spot on rotate */
    try{positionKikoUI();}catch(e){}        /* pet + chat bubble stay on-screen on rotate */
  },150); });
  window.addEventListener("orientationchange",()=>{ setTimeout(()=>{ try{window.dispatchEvent(new Event("resize"));}catch(e){} },350); });
  /* iPadOS (especially installed as an app) sometimes settles its size only via visualViewport */
  if(window.visualViewport){ let vw=visualViewport.width; visualViewport.addEventListener("resize",()=>{ if(Math.abs(visualViewport.width-vw)<2)return; vw=visualViewport.width; try{window.dispatchEvent(new Event("resize"));}catch(e){} }); }
})();


/* ===== PWA + phone push plumbing ===== */
if("serviceWorker" in navigator){ try{ navigator.serviceWorker.register("sw.js"); }catch(e){} }

function urlB64ToUint8(s){ const pad="=".repeat((4-s.length%4)%4); const b=(s+pad).replace(/-/g,"+").replace(/_/g,"/"); const raw=atob(b); const arr=new Uint8Array(raw.length); for(let i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i); return arr; }


/* ===== custom reminders: "remind me to … at …", once or repeating ===== */
function nextReminderDate(r){   // the next occurrence (for repeats whose stored date is in the past)
  if(!r||!r.date)return TODAY;
  if(!r.repeat||r.repeat==="none")return r.date;
  let d=new Date(r.date+"T00:00"); const today=new Date(TODAY+"T00:00");
  if(d>=today)return r.date;
  if(r.repeat==="daily")return TODAY;
  if(r.repeat==="weekly"){ while(d<today)d.setDate(d.getDate()+7); return d.toLocaleDateString("en-CA"); }
  if(r.repeat==="monthly"){ while(d<today)d.setMonth(d.getMonth()+1); return d.toLocaleDateString("en-CA"); }
  return r.date;
}

function activeReminders(){ return (state.sentinel.customReminders||[]).filter(r=>!r.done); }

/* timed pop-ups while the app is open — checks every minute */
function checkTimedReminders(){
  try{
    const rem=state.sentinel.reminders||{}; if(!rem.browser)return;
    if(typeof Notification==="undefined"||Notification.permission!=="granted")return;
    if(document.body.classList.contains("calm"))return;
    const now=new Date(); const hm=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
    activeReminders().forEach(r=>{
      if(nextReminderDate(r)!==TODAY)return;
      if((r.time||"09:00")>hm)return;
      const key="mifu-cr-"+r.id+"-"+TODAY; if(localStorage.getItem(key))return;
      try{ new Notification("⏰ "+r.text,{body:(r.time?"it's time · "+fmt12(r.time):"today")+" ❄️",icon:"sakura.png"}); localStorage.setItem(key,"1"); }catch(e){}
    });
  }catch(e){}
}

setTimeout(checkTimedReminders,7000);

setInterval(checkTimedReminders,60*1000);


/* ===== pre-stream transition bridge — time-blindness aid: a soft heads-up at T-60 and T-15 ===== */
function parseSlotTime(t){ if(!t)return null; const m=String(t).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i); if(!m)return null;
  let h=Number(m[1]); const min=Number(m[2]||0); const ap=(m[3]||"").toLowerCase();
  if(ap==="pm"&&h<12)h+=12; if(ap==="am"&&h===12)h=0; if(!ap&&h>=1&&h<=8)h+=12;   // "3PM" style; bare small hours mean afternoon here
  return h*60+min; }

function streamBridge(){
  try{
    const lvl=localStorage.getItem("kiko-prolevel")||(localStorage.getItem("kiko-proactive")==="0"?"quiet":"gentle");
    if(lvl==="quiet"||document.body.classList.contains("calm")||!state._loaded) return;
    const dowB=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
    const slots=weekSlots(weekStartISO(0)).filter(s=>s.day===dowB); if(!slots.length) return;
    const now=new Date().getHours()*60+new Date().getMinutes();
    for(const s of slots){ const t=parseSlotTime(s.time||STREAM_TIME_DEFAULT); if(t==null)continue; const dt=t-now;
      const win=(dt<=60&&dt>55)?"60":((dt<=15&&dt>10)?"15":null); if(!win)continue;
      const key="kiko-bridge-"+TODAY+"-"+s.id+"-"+win; if(localStorage.getItem(key))continue;
      const b=$("#kikoBubble"); if(!b)continue;
      b.textContent=win==="60"
        ? "🔴 stream in about an hour — "+(s.show||"today's stream")+". water, snack, wrap up what you're in 💗"
        : "🔴 stream in ~15! save your place, OBS on, one breath — you've got this ❄️";
      b.style.left=Math.max(10,Math.round((kikoX||100)-18))+"px"; b.style.right="auto"; b.classList.remove("hidden");
      clearTimeout(b._h); b._h=setTimeout(()=>b.classList.add("hidden"),14000);
      localStorage.setItem(key,"1"); break; }
  }catch(e){}
}

setTimeout(streamBridge,8000);

setInterval(streamBridge,60*1000);


/* ===== in-browser event / birthday reminders (fires while the app is open) ===== */
function checkReminders(){
  try{
    const sent=state.sentinel||{}; const rem=sent.reminders||{};
    if(!rem.browser) return;
    if(typeof Notification==="undefined" || Notification.permission!=="granted") return;
    if(document.body.classList.contains("calm")) return;
    const offs=rem.offsets||[0,1]; const BDAY_OFFS=[30,7,1,0]; const today=new Date(TODAY+"T00:00");
    const items=[];
    (sent.calendarEvents||[]).forEach(ev=>{ const days=Math.round((new Date(ev.date+"T00:00")-today)/86400000); items.push({id:ev.id,title:ev.title,date:ev.date,days,offs}); });
    // birthdays always get a one-month-ahead nudge (gift time!) plus 1 week, 1 day, day-of
    (sent.birthdays||[]).forEach(b=>{ const ni=nextBirthdayInfo(b); items.push({id:b.id,title:"🎂 "+b.name+"'s birthday",date:ni.date,days:ni.days,offs:BDAY_OFFS}); });
    items.forEach(it=>{ if(!(it.offs||offs).includes(it.days))return; const key="mifu-notif-"+it.id+"-"+it.date+"-"+it.days;
      if(localStorage.getItem(key))return;
      const when=it.days===0?" — today!":it.days===1?" — tomorrow":it.days>=28?" — in about a month":" — in "+it.days+" days";
      try{ new Notification("❄️ Mifuyu reminder", {body: it.title+when, icon:"sakura.png"}); localStorage.setItem(key,"1"); }catch(e){}
    });
  }catch(e){ console.error(e); }
}

setTimeout(checkReminders, 6000);

setInterval(checkReminders, 30*60*1000);


/* ===== proactive Kiko: a morning briefing + an evening journal nudge (once a day, via his bubble) ===== */
/* the "noticing" engine — scans her real data for the single most worth-raising thing right now */
function kikoNotice(){
  try{
    const s=state.sentinel||{};
    const byDate={}; (state.range||[]).forEach(r=>byDate[r.date]=r.notes); byDate[TODAY]=state.today;
    const lastN=(path,n)=>{ const out=[]; for(let i=0;i<n;i++){ const d=dayAgo(-i); let v=byDate[d]; for(const k of path){ v=v&&v[k]; } if(v!=null)out.push(v); } return out; };
    const ins=[];
    const inj=(s.injectionLog||[]).slice().sort(cmpDate);
    if(inj.length){ const nd=new Date(inj[inj.length-1].date+"T00:00"); nd.setDate(nd.getDate()+7); const di=daysBetween(TODAY,nd.toLocaleDateString("en-CA"));
      if(di===0) ins.push({key:"doseday",pri:9,text:"💉 today's your Mounjaro day — want me to set a reminder for tonight?"});
      else if(di===1) ins.push({key:"dosesoon",pri:6,text:"💉 your shot's tomorrow — rotate to a fresh site, and I can remind you ❄️"}); }
    if([0,1,2].every(i=>{ const hb=(byDate[dayAgo(-i)]&&byDate[dayAgo(-i)].habits)||{}; return !hb.h_meds; }))
      ins.push({key:"meds",pri:8,text:"💊 meds haven't been ticked in a few days — want a daily reminder to make it easier?"});
    (s.medsList||[]).forEach(m=>{ if(m.refill){ const dd=daysBetween(TODAY,m.refill); if(dd>=0&&dd<=5) ins.push({key:"refill-"+m.id,pri:7,text:"💊 your "+m.name+" refill is "+(dd===0?"today":dd===1?"tomorrow":"in "+dd+" days")+" — worth sorting before you run low ❄️"}); } });
    // new-dose titration watch — the step-up weeks deserve a softer eye
    const dh2=(s.doseHistory||[]).slice().sort((a,b)=>a.started<b.started?-1:1);
    if(dh2.length>=2){ const curD=dh2[dh2.length-1], prevD=dh2[dh2.length-2]; const ddh=daysBetween(curD.started,TODAY);
      if(curD.dose>prevD.dose&&ddh>=2&&ddh<=21) ins.push({key:"titrate-"+curD.started,pri:6,text:"💉 week "+(Math.floor(ddh/7)+1)+" on the "+curD.dose+"mg step-up — I'm keeping a softer eye on side-effects. tell me how it's feeling 💗"}); }
    // muscle guardrail — muscle drifting down while protein runs under target
    try{ const mus=(s.weightLog||[]).filter(x=>x.muscle!=null).slice(-3);
      if(mus.length>=2&&mus[mus.length-1].muscle<mus[0].muscle-0.3){ const fh2=foodHistory(7).filter(h2=>h2.meals.length);
        if(fh2.length>=3&&(fh2.reduce((a,h2)=>a+h2.protein,0)/fh2.length)<foodTargets().protein*0.8)
          ins.push({key:"muscle",pri:7,text:"💪 your muscle reading drifted down while protein's been under target — extra protein this week is the one thing that protects it 💗"}); } }catch(_){}
    // food noise returning — a known wave, not a failure
    try{ const fn5=lastN(["mounjaro","foodnoise"],5); const fnPrev=[]; for(let i=5;i<10;i++){ const d2=dayAgo(-i); let v2=byDate[d2]; v2=v2&&v2.mounjaro&&v2.mounjaro.foodnoise; if(v2!=null)fnPrev.push(v2); }
      if(fn5.length>=3&&fnPrev.length>=3){ const a1=fn5.reduce((a,b)=>a+b,0)/fn5.length, a0=fnPrev.reduce((a,b)=>a+b,0)/fnPrev.length;
        if(a1>=a0+1) ins.push({key:"foodnoise",pri:5,text:"🍩 food noise has been a little louder this week than last — that's a known wave, not you failing. want it noted for your doctor summary?"}); } }catch(_){}
    const water=lastN(["mounjaro","water"],5), naus=lastN(["mounjaro","nausea"],5);
    if(water.length>=3&&naus.length>=3){ const aw=water.reduce((a,b)=>a+b,0)/water.length, an=naus.reduce((a,b)=>a+b,0)/naus.length;
      if(aw<CUPS_PER_40OZ*1.5 && an>=2) ins.push({key:"waternausea",pri:7,text:"🥤 your water's been low and nausea a bit higher lately — they often go together. a couple of 40oz today might help 💗"}); }
    try{ const {series}=buildSeries(); const en=(series.energy||[]).filter(v=>v!=null);
      if(en.length>=6){ const h=Math.floor(en.length/2); const d=en.slice(-h).reduce((a,b)=>a+b,0)/h-en.slice(0,h).reduce((a,b)=>a+b,0)/h; if(d<-0.6) ins.push({key:"energy",pri:5,text:"⚡ your energy's trended down this stretch — be gentle today; want me to keep your plan light?"}); } }catch(_){}
    (s.sponsors||[]).forEach(sp=>{ if(sp.due&&sp.status!=="done"){ const dd=daysBetween(TODAY,sp.due); if(dd>=0&&dd<=3) ins.push({key:"sponsor-"+sp.id,pri:7,text:"💜 your "+sp.name+" deliverable is "+(dd===0?"due today":dd===1?"due tomorrow":"due in "+dd+" days")+" — want a reminder or to block stream time?"}); else if(dd<0) ins.push({key:"sponsorlate-"+sp.id,pri:8,text:"💜 the "+sp.name+" deliverable was due "+(-dd)+"d ago — want to sort it or push the date?"}); } });
    const wk=weekStartISO(0); const ge=(s.calendarEvents||[]).filter(gameSrc).filter(e=>{ const diff=daysBetween(wk,e.date); return diff>=0&&diff<7&&e.date>=TODAY; });
    if(ge.length) ins.push({key:"game-"+ge[0].date,pri:4,text:"🎮 "+ge[0].title+" lands this week — could be a fun stream! want it on your schedule?"});
    const jrAllDates=[...(s.journalEntries||[]).filter(e=>e.date).map(e=>e.date), ...(state.range||[]).filter(r=>r&&r.notes&&r.notes.journal&&String(r.notes.journal).trim()).map(r=>r.date)];
    if(state.today&&state.today.journal&&String(state.today.journal).trim()) jrAllDates.push(TODAY);
    const lastJ=jrAllDates.length?jrAllDates.sort()[jrAllDates.length-1]:null;
    if(!lastJ||daysBetween(lastJ,TODAY)>=5) ins.push({key:"journal",pri:3,text:"📓 it's been a little while since we journaled — want to do a soft one together?"});
    const wl=(s.weightLog||[]).filter(x=>x.w!=null).sort(cmpDate);
    if(wl.length>=4){ const r4=wl.slice(-4).map(x=>x.w); if(Math.max(...r4)-Math.min(...r4)<0.4) ins.push({key:"plateau",pri:2,text:"⚖️ the scale's been steady a few weeks — totally normal. want to do a little stall audit together? (your muscle, sleep & protein often tell the real story 🌱)"}); }
    ins.sort((a,b)=>b.pri-a.pri);
    for(const x of ins){ if(!localStorage.getItem("kiko-noticed-"+x.key+"-"+TODAY)) return x; }
    return null;
  }catch(e){ return null; }
}

function kikoProactive(){
  try{
    const lvl=localStorage.getItem("kiko-prolevel")|| (localStorage.getItem("kiko-proactive")==="0"?"quiet":"gentle");
    if(lvl==="quiet") return;
    if(document.body.classList.contains("calm")) return;
    if(!state._loaded || KIKO.open) return;
    const b=$("#kikoBubble"); if(!b) return;
    const show=msg=>{ b.textContent=msg; b.style.left=Math.max(10,Math.round((kikoX||100)-18))+"px"; b.style.right="auto"; b.classList.remove("hidden");
      clearTimeout(b._h); b._h=setTimeout(()=>b.classList.add("hidden"),13000); };
    const h=new Date().getHours();
    if(h>=5&&h<12 && !localStorage.getItem("kiko-brief-"+TODAY)){
      const notice=kikoNotice();
      if(notice){ show("🌅 "+notice.text); localStorage.setItem("kiko-noticed-"+notice.key+"-"+TODAY,"1"); }
      else{
        const evs=(state.sentinel.calendarEvents||[]).filter(e=>e.date===TODAY&&!gameSrc(e)).map(e=>e.title)
          .concat(activeReminders().filter(r=>nextReminderDate(r)===TODAY).map(r=>"⏰ "+r.text)).slice(0,3);
        show("🌅 morning! "+(evs.length?("today: "+evs.join(" · ")):"a soft, open day")+" — tap me for more ❄️");
      }
      localStorage.setItem("kiko-brief-"+TODAY,"1");
    } else if(lvl==="active" && h>=12 && h<18 && !localStorage.getItem("kiko-mid-"+TODAY)){
      const notice=kikoNotice();   // active mode: one fresh midday observation if something's genuinely up
      if(notice){ show(notice.text); localStorage.setItem("kiko-noticed-"+notice.key+"-"+TODAY,"1"); localStorage.setItem("kiko-mid-"+TODAY,"1"); }
    } else if(h>=18 && !localStorage.getItem("kiko-shoteve-"+TODAY) && (function(){
        const inj2=(state.sentinel.injectionLog||[]).slice().sort(cmpDate); if(!inj2.length)return false;
        const nd=new Date(inj2[inj2.length-1].date+"T00:00"); nd.setDate(nd.getDate()+7);
        return daysBetween(TODAY,nd.toLocaleDateString("en-CA"))===1; })()){
      // evening-before shot forecast, from HER OWN last few shot days
      const inj2=(state.sentinel.injectionLog||[]).slice().sort(cmpDate);
      const byD={}; (state.range||[]).forEach(r=>byD[r.date]=r.notes);
      const after=inj2.slice(-4).map(s2=>{ const n2=byD[s2.date]; return n2&&n2.mounjaro&&n2.mounjaro.nausea; }).filter(v=>v!=null);
      const avgN=after.length?after.reduce((a,b)=>a+b,0)/after.length:null;
      show("💉 shot day tomorrow — "+(avgN!=null&&avgN>=2?"your last few ran a bit queasy by evening, so maybe plan tomorrow a touch lighter 💗":"rotate to a fresh site, and I can set a reminder ❄️"));
      localStorage.setItem("kiko-shoteve-"+TODAY,"1");
    } else if(h>=19 && !localStorage.getItem("kiko-nudge-"+TODAY) && !localStorage.getItem("kiko-noticed-journal-"+TODAY) && !(state.sentinel.journalEntries||[]).some(e=>e.date===TODAY)){   // one journal nudge per day, not two
      show("🌙 cozy hour… want to journal today together? tap me 📓");
      localStorage.setItem("kiko-nudge-"+TODAY,"1");
    }
  }catch(e){}
}

setTimeout(kikoProactive, 9000);

setInterval(kikoProactive, 20*60*1000);


/* returning from the Withings OAuth link → tidy the URL, then pull her latest measurements */
(function(){
  try{
    const p=new URLSearchParams(location.search); const w=p.get("withings");
    if(!w) return;
    history.replaceState(null,"",location.pathname);
    if(w==="ok"){ setTimeout(async()=>{ try{ toast("Withings linked ❄️ pulling your measurements…"); const d=await aiCall("withingsSync",{}); if(d&&!d.error){ await loadData(); render(); toast(`synced ${d.days||0} day(s) 💗`); } else if(d&&d.error){ toast(d.error); } }catch(e){} }, 3500); }
    else if(w==="err"){ const reason=p.get("reason"); setTimeout(()=>toast("Withings link didn't complete"+(reason?" — "+reason:"")+" 🌧️ (try the 🔍 Diagnose button on the Body page)"),3000); }
  }catch(e){}
})();


/* ===== glowing petal cursor trail (icy snowfox) ===== */
(function(){
  const reduce=()=>{ try{ return document.body.classList.contains("calm")||matchMedia("(prefers-reduced-motion:reduce)").matches; }catch(e){ return false; } };
  let last=0, count=0; const MAX=42;
  function spawn(x,y){
    if(reduce()||count>=MAX)return;
    const p=document.createElement("div"); p.className="petal";
    const size=(9+Math.random()*9).toFixed(0);
    const c1=Math.random()<0.5?"#ffffff":"#ffd9ee", c2=Math.random()<0.5?"#ff9ed8":"#ffc2e3";   // sakura pink + white
    p.style.width=p.style.height=size+"px";
    p.style.left=(x-size/2)+"px"; p.style.top=(y-size/2)+"px";
    p.style.background=`radial-gradient(circle at 34% 28%, ${c1}, ${c2})`;
    p.style.boxShadow=`0 0 ${(6+Math.random()*9).toFixed(0)}px ${(1+Math.random()*2).toFixed(0)}px rgba(255,160,214,.55)`;   // pink glow
    p.style.setProperty("--dx",(Math.random()*64-32).toFixed(0)+"px");
    p.style.setProperty("--dy",(40+Math.random()*64).toFixed(0)+"px");
    p.style.setProperty("--dr",(Math.random()*340-120).toFixed(0)+"deg");
    p.style.setProperty("--o",(0.45+Math.random()*0.35).toFixed(2));
    p.style.animation=`petalFloat ${(1.6+Math.random()*1.5).toFixed(2)}s ease-out forwards`;
    document.body.appendChild(p); count++;
    p.addEventListener("animationend",()=>{ p.remove(); count--; });
  }
  window.addEventListener("pointermove",e=>{ if(e.pointerType!=="mouse")return; const now=performance.now(); if(now-last<55)return; last=now; spawn(e.clientX,e.clientY); },{passive:true});   /* mouse only — Apple Pencil hover must not spray petals */
})();


/* ===== cute falling snow: 5 pretty snowflake designs drifting gently down ===== */
(function(){
  if(document.getElementById("snowCanvas")) return;
  const reduce=()=>{ try{ return document.body.classList.contains("calm")||matchMedia("(prefers-reduced-motion:reduce)").matches; }catch(e){ return false; } };
  const cv=document.createElement("canvas"); cv.id="snowCanvas";
  document.body.insertBefore(cv, document.body.firstChild);
  const ctx=cv.getContext("2d");
  let W=0,H=0; const DPR=Math.min(2,window.devicePixelRatio||1);
  function resize(){ W=window.innerWidth; H=window.innerHeight; cv.width=W*DPR; cv.height=H*DPR; cv.style.width=W+"px"; cv.style.height=H+"px"; ctx.setTransform(DPR,0,0,DPR,0,0); }
  resize(); window.addEventListener("resize",resize);

  /* pre-render 5 snowflake designs onto little white sprites (drawn once, reused every frame) */
  const SP=48, C=SP/2;
  function sprite(draw){ const s=document.createElement("canvas"); s.width=SP*DPR; s.height=SP*DPR;
    const c=s.getContext("2d"); c.setTransform(DPR,0,0,DPR,0,0); c.translate(C,C);
    c.strokeStyle="#fff"; c.fillStyle="#fff"; c.lineCap="round"; c.lineJoin="round"; draw(c); return s; }
  function arms(c,n,fn){ for(let i=0;i<n;i++){ c.save(); c.rotate(i*Math.PI*2/n); fn(c); c.restore(); } }
  const designs=[
    sprite(c=>{ c.lineWidth=1.8; arms(c,6,c=>{ c.beginPath(); c.moveTo(0,0); c.lineTo(0,-18); c.stroke();
      [-11,-6].forEach(y=>{ c.beginPath(); c.moveTo(0,y); c.lineTo(5,y-5); c.moveTo(0,y); c.lineTo(-5,y-5); c.stroke(); }); }); }),   // 1 classic 6-arm
    sprite(c=>{ c.lineWidth=1.8; arms(c,6,c=>{ c.beginPath(); c.moveTo(0,0); c.lineTo(0,-17); c.stroke(); c.beginPath(); c.arc(0,-18,2.4,0,6.29); c.fill(); }); }),   // 2 arms w/ dot tips
    sprite(c=>{ arms(c,6,c=>{ c.beginPath(); c.ellipse(0,-11,3.6,8,0,0,6.29); c.fill(); }); c.beginPath(); c.arc(0,0,3,0,6.29); c.fill(); }),   // 3 soft 6-petal flower
    sprite(c=>{ c.beginPath(); arms(c,4,c=>{ c.moveTo(0,0); c.quadraticCurveTo(2.5,-7,0,-18); c.quadraticCurveTo(-2.5,-7,0,0); }); c.fill(); c.beginPath(); c.arc(0,0,2.2,0,6.29); c.fill(); }),   // 4 four-point sparkle
    sprite(c=>{ arms(c,6,c=>{ c.beginPath(); c.arc(0,-14,2.6,0,6.29); c.fill(); }); c.beginPath(); c.arc(0,0,3,0,6.29); c.fill(); }),   // 5 dotted hexagon ring
  ];

  const N=W<641 ? Math.max(26,Math.min(55,Math.round(W*H/26000)))    // phones: gentler on the battery
                : Math.max(60,Math.min(130,Math.round(W*H/15000)));
  function reset(f,top){ f.x=Math.random()*W; f.y=top?-32:Math.random()*H; f.size=18+Math.random()*22;   // bigger so they read well on a tablet
    f.fall=0.35+Math.random()*0.85; f.sway=0.4+Math.random()*0.9; f.ph=Math.random()*6.28; f.phs=0.006+Math.random()*0.014;
    f.rot=Math.random()*6.28; f.rs=(Math.random()-0.5)*0.02; f.o=0.6+Math.random()*0.35;   // less transparent → easier to see
    f.d=designs[(Math.random()*designs.length)|0]; f.vx=0; f.vy=0; }
  const flakes=[]; for(let i=0;i<N;i++){ const f={}; reset(f,false); flakes.push(f); }

  let mx=-9999,my=-9999;
  window.addEventListener("pointermove",e=>{ if(e.pointerType!=="mouse")return; mx=e.clientX; my=e.clientY; },{passive:true});   // gentle cursor nudge (mouse only)
  window.addEventListener("pointerout",()=>{ mx=-9999; my=-9999; });
  const R=90;

  function frame(){
    requestAnimationFrame(frame);
    if(reduce()){ ctx.clearRect(0,0,W,H); return; }
    ctx.clearRect(0,0,W,H);
    for(const f of flakes){
      f.ph+=f.phs; const baseVx=Math.sin(f.ph)*f.sway;
      const dx=f.x-mx, dy=f.y-my, d2=dx*dx+dy*dy;
      if(d2<R*R){ const d=Math.sqrt(d2)||1; const force=(R-d)/R*2.2; f.vx+=(dx/d)*force; f.vy+=(dy/d)*force; }
      f.vx=f.vx*0.92+baseVx*0.08; f.vy=f.vy*0.92+f.fall*0.08;
      f.x+=f.vx; f.y+=f.vy; f.rot+=f.rs;
      if(f.x<-30) f.x=W+30; else if(f.x>W+30) f.x=-30;
      if(f.y>H+30) reset(f,true);
      ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,f.o)); ctx.translate(f.x,f.y); ctx.rotate(f.rot);
      ctx.drawImage(f.d,-f.size/2,-f.size/2,f.size,f.size); ctx.restore();
    }
  }
  requestAnimationFrame(frame);
})();
