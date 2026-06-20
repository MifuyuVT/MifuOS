function jrSpecial(date,n){ if(n&&n.special)return true; return (state.sentinel.calendarEvents||[]).some(e=>!gameSrc(e)&&e.date===date); }

function jrDayColor(n,special){ if(special)return "#ece2fb"; const mo=n&&n.mind&&n.mind.mood;
  if(mo==null)return "#eef3fa"; return mo>=4?"#e0f5ea":mo===3?"#fdf3da":"#fde6e9"; }

function jrStats(rows){
  const ds=Object.entries(rows||{}).map(([date,n])=>({date,n})).sort(cmpDate);
  const pick=(f)=>ds.map(d=>f(d.n)).filter(v=>v!=null);
  const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length*10)/10:null;
  const moods=pick(n=>n.mind&&n.mind.mood), en=pick(n=>n.mind&&n.mind.energy), sl=pick(n=>n.sleep), fn=pick(n=>n.mounjaro&&n.mounjaro.foodnoise);
  const wm=jrWeightMap(); const wIn=ds.map(d=>wm[d.date]).filter(v=>v!=null);
  const scored=ds.filter(d=>d.n.mind&&d.n.mind.mood!=null).map(d=>({date:d.date,score:d.n.mind.mood+(d.n.mind.energy||0)/2-(d.n.stress||0)/2}));
  const best=scored.slice().sort((a,b)=>b.score-a.score)[0], hard=scored.slice().sort((a,b)=>a.score-b.score)[0];
  const sym={}; ds.forEach(d=>{ const p=d.n.pcos||{},mj=d.n.mounjaro||{}; [["fatigue",p],["bloating",p],["cravings",p],["nausea",mj],["reflux",mj],["belly",mj]].forEach(([k,o])=>{ if((o[k]||0)>=3) sym[k]=(sym[k]||0)+1; }); });
  const topSym=Object.entries(sym).sort((a,b)=>b[1]-a[1])[0];
  return { logged:ds.filter(d=>d.n.mind&&d.n.mind.mood!=null).length, avgMood:avg(moods), avgEnergy:avg(en), avgSleep:avg(sl),
    wDelta:wIn.length>1?Math.round((wIn[wIn.length-1]-wIn[0])*10)/10:null,
    fnTrend:fn.length>=4?(avg(fn.slice(-Math.ceil(fn.length/2)))-avg(fn.slice(0,Math.floor(fn.length/2)))):null,
    best, hard, topSym };
}

/* ============================================================================
   DIGITAL HOBONICHI JOURNAL (slice 1) — the daily page is the hero: month colour theme,
   Kiko's Day-at-a-Glance, lined paper, voice-or-type, constant auto-save. The proven data
   layer (setDay / jrFetchMonth / jrCache) is reused untouched. Heavy freeform canvas +
   scrapbook drawers + font controls + templates come in the next journal slice.
   ============================================================================ */
const JR_THEME={ "01":["#D85C2E","#B03E18"],"02":["#A8785A","#855840"],
  "03":["#A87898","#846078"],"04":["#D87880","#B05860"],
  "05":["#A89828","#847810"],"06":["#789870","#587850"],
  "07":["#4878A8","#305888"],"08":["#8878B8","#685898"],
  "09":["#B87858","#985840"],"10":["#9878A8","#785888"],
  "11":["#387870","#185850"],"12":["#C83828","#A01810"] };

const JR_COLOR_NAMES={"01":"Tangerine Red","02":"Caramel Brown","03":"Dusty Mauve","04":"Rose Pink","05":"Olive Moss","06":"Hydrangea Blue","07":"Cornflower","08":"Wisteria","09":"Terracotta","10":"Lavender","11":"Forest Teal","12":"Crimson"};

function jrTheme(date){ return JR_THEME[(date||TODAY).slice(5,7)]||JR_THEME["06"]; }

function jrColorName(ym){ return JR_COLOR_NAMES[(ym||TODAY).slice(5,7)]||""; }

function dayShift(date,n){ const d=new Date(date+"T00:00"); d.setDate(d.getDate()+n); return d.toLocaleDateString("en-CA"); }

function jrWeekNum(date){ const d=new Date(date+"T00:00"); const dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const day=dt.getUTCDay()||7; dt.setUTCDate(dt.getUTCDate()+4-day); const ys=new Date(Date.UTC(dt.getUTCFullYear(),0,1)); return Math.ceil((((dt-ys)/86400000)+1)/7); }

function jrGlance(date,n){ n=n||{}; const out=[]; const m=n.mind||{};
  try{ const wm=jrWeightMap(); if(wm[date]!=null) out.push(`Weighed in: ${wm[date]} ${CONFIG.weightUnit||"kg"}`); }catch(e){}
  if(m.energy!=null) out.push(`Energy ${m.energy>=4?"was higher than usual":m.energy<=1?"ran low":"was steady"}`);
  if(m.mood!=null) out.push(`Mood ${m.mood>=4?"was lovely":m.mood<=1?"was tough":"was okay"}`);
  if(n.sleep!=null) out.push(`Slept ${n.sleep}h`);
  try{ const ci=n.checkins||{}; const lbl={streamed:"streamed",ytVideo:"uploaded a video",ytShort:"posted a Short",madeArt:"made art",gym:"hit the gym",walk:"went for a walk",water:"hydrated well",journaled:"journaled"};
    const named=Object.keys(ci).filter(k=>ci[k]&&lbl[k]).map(k=>lbl[k]).slice(0,3); if(named.length) out.push(named.join(", ")); }catch(e){}
  if(n.special) out.push("💜 A special day");
  if(jrStreamDay(date)) out.push("🔴 Stream day");
  return out;
}

function jrDailyPage(date){
  date=date||TODAY; if(date>TODAY) date=TODAY;
  const ym=date.slice(0,7);
  const n=(date===TODAY?(state.today||{}):(((state.jrCache||{})[ym]||{})[date]||{}));
  const d=new Date(date+"T00:00"), isToday=date===TODAY;
  const wd=d.toLocaleDateString("en-US",{weekday:"long"}), dnum=d.getDate(), mon=d.toLocaleDateString("en-US",{month:"long"}), wk=jrWeekNum(date);
  const [accent,ink]=jrTheme(date); const glance=jrGlance(date,n);
  return `<section class="panel jr-page" style="--jr-accent:${accent};--jr-ink:${ink}">
    <div class="jr-page-head">
      <div><div class="jr-page-wd">${esc(wd)}</div><div class="jr-page-date"><span class="jr-page-day">${dnum}</span> ${esc(mon)}</div><div class="jr-page-wk">Week ${wk}${isToday?" · today":""}</div></div>
      <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
        <button class="btn" data-act="jrPick" data-date="${dayShift(date,-1)}" title="previous day">‹</button>
        ${isToday?"":`<button class="btn" data-act="jrPick" data-date="${TODAY}">today</button>`}
        <button class="btn" data-act="jrPick" data-date="${dayShift(date,1)}" ${date>=TODAY?'disabled style="opacity:.4;pointer-events:none"':''} title="next day">›</button>
        <button class="btn" data-act="jrOpenDay" data-date="${date}" title="mood, sleep, tags & details">✏️ details</button>
      </div>
    </div>
    ${glance.length?`<div class="jr-glance"><div class="jr-glance-h">🦊 Kiko's day at a glance</div><ul>${glance.map(g=>`<li>${esc(g)}</li>`).join("")}</ul></div>`:`<div class="jr-glance jr-glance-empty">🦊 Write below — Kiko fills in your day-at-a-glance from what you log.</div>`}
    <div class="jr-paper">
      <div id="jrPageText" class="jr-pagetext" contenteditable="true" data-date="${date}" data-placeholder="${isToday?'talk or type — today, in your own words…  ♡':'this day, in your words…'}">${n.journalHtml||nl2br(esc(n.journal||''))}</div>
    </div>
    <div class="jr-toolbar" id="jrToolbar">
      <select class="jr-tb-select" id="jrFont" title="Font family">
        <option value="">Default</option>
        <option value="'Georgia',serif">Georgia</option>
        <option value="'Palatino Linotype',serif">Palatino</option>
        <option value="'Courier New',monospace">Courier New</option>
        <option value="'Comic Sans MS',cursive">Comic Sans</option>
        ${(state.sentinel.jrFonts||[]).map(f=>`<option value="'${esc(f.name)}',sans-serif">${esc(f.name)}</option>`).join('')}
        <option value="__add__">✚ add a font…</option>
      </select>
      <select class="jr-tb-select jr-tb-size" id="jrSize" title="Font size">
        ${[10,11,12,13,14,16,18,20,24,28,32,40].map(s=>`<option value="${s}" ${s===14?'selected':''}>${s}</option>`).join('')}
      </select>
      <span class="jr-tb-div"></span>
      <div class="jr-color-swatches" id="jrSwatches">
        ${(state.jrRecentColors&&state.jrRecentColors.length?state.jrRecentColors:['#9b8ec4','#c87080','#5a8a70']).slice(0,3).map(c=>`<button class="jr-swatch" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}
        <label class="jr-swatch jr-swatch-pick" title="Pick any color" style="background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);cursor:pointer">
          <input type="color" id="jrColorPick" style="opacity:0;position:absolute;width:0;height:0">
        </label>
      </div>
      <span class="jr-tb-div"></span>
      <button class="jr-tb-btn" data-cmd="bold" title="Bold"><b>B</b></button>
      <button class="jr-tb-btn" data-cmd="italic" title="Italic"><i>I</i></button>
      <button class="jr-tb-btn" data-cmd="underline" title="Underline"><u>U</u></button>
      <span class="jr-tb-div"></span>
      <button class="jr-tb-btn" data-cmd="insertUnorderedList" title="Bullet list" style="font-size:15px">•≡</button>
      <button class="jr-tb-btn" data-cmd="insertOrderedList" title="Numbered list" style="font-size:13px">1.≡</button>
      <button class="jr-tb-btn" data-cmd="removeFormat" title="Remove all formatting from selection" style="font-size:11px">clear fmt</button>
    </div>
    <div class="jr-page-foot">
      <button class="btn ${state._jrMic?'btn-grad':''}" data-act="jrMic" title="speak your entry (Chrome/Edge)">${state._jrMic?"⏹ listening…":"🎤 Speak"}</button>
      <span class="soft" id="jrSaveState" style="font-size:11px">auto-saves as you write ✨</span>
      <button class="btn btn-grad" data-act="kikoReadJournal" data-date="${date}" style="margin-left:auto" title="Kiko reads your entry and detects mood, energy, symptoms and more">🦊 Kiko, read this</button>
    </div>
  </section>
  ${kikoDetectedPanel(date, n)}`;
}

function kikoDetectedPanel(date, n){
  const det=(state.kikoDetected||{})[date];
  const theme=jrTheme(date); const col=theme[0];
  if(!det&&!(n&&n.journal&&n.journal.trim())) return '';
  if(!det) return `<section class="panel" style="border-left:3px solid ${col}">
    <div class="card-head"><span class="label">🦊 Kiko Detected</span><span class="soft" style="font-size:11px">auto-detected from your entry</span></div>
    <p class="soft" style="font-size:12.5px;margin:0">Tap <b>"🦊 Kiko, read this"</b> above and Kiko will extract your mood, energy, sleep, symptoms and more from your words. ✨</p>
  </section>`;
  const row=(icon,label,val)=>val!=null?`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:0.5px solid var(--line)">
    <span style="font-size:15px;width:22px;text-align:center">${icon}</span>
    <span style="font-size:12px;color:var(--muted);width:72px;flex-shrink:0">${label}</span>
    <span style="font-size:13px;font-weight:500;flex:1">${esc(String(val))}</span>
  </div>`:'';
  const moodEmoji=['😶','😢','😔','😐','🙂','😊'][Math.max(0,Math.min(5,det.mood||0))];
  return `<section class="panel" style="border-left:3px solid ${col}">
    <div class="card-head"><span class="label">🦊 Kiko Detected</span><span class="soft" style="font-size:11px">auto-detected from your entry</span></div>
    <div>
      ${row('😊','Mood',det.mood!=null?`${moodEmoji} ${['—','Rough','Low','Okay','Good','Lovely'][det.mood]||det.mood}`:null)}
      ${row('⚡','Energy',det.energy!=null?det.energy+'/5':null)}
      ${row('🫨','Stress',det.stress!=null?det.stress+'/5':null)}
      ${row('🌙','Sleep',det.sleep!=null?det.sleep+'h':null)}
      ${row('🩹','Symptoms',det.symptoms&&det.symptoms.length?det.symptoms.join(', '):(det.symptoms||null))}
      ${row('💬','Topics',det.topics&&det.topics.length?det.topics.join(', '):(det.topics||null))}
      ${row('💜','Special day',det.special?'Yes ✨':null)}
      ${row('🌈','Day colour',det.dayColor||null)}
    </div>
    ${det.summary?`<p style="font-size:12px;color:var(--ink-soft);margin:8px 0 0;line-height:1.5;font-style:italic">"${esc(det.summary)}"</p>`:''}
    <button class="btn" data-act="kikoReadJournal" data-date="${date}" style="margin-top:10px;font-size:11px">↺ re-read entry</button>
  </section>`;
}

function nl2br(s){ return (s||'').replace(/\n/g,'<br>'); }

function wireJrPage(){
  const el=$("#jrPageText"); if(!el||el._wired)return; el._wired=true; const date=el.dataset.date||TODAY;
  // auto-save on input
  el.addEventListener("input",()=>{
    const ss=$("#jrSaveState"); if(ss)ss.textContent="saving…"; clearTimeout(_jrSaveT);
    _jrSaveT=setTimeout(async()=>{
      try{
        const html=el.innerHTML.replace(/​/g,'');
        const plain=el.innerText.replace(/​/g,'');
        await setDay(date,n=>({...n,journal:plain,journalHtml:html}));
        const s2=$("#jrSaveState"); if(s2)s2.textContent="saved ✓";
      }catch(e){ const s2=$("#jrSaveState"); if(s2)s2.textContent="couldn't save 🌧️"; }
    },1100);
  });
  // toolbar wiring
  const tb=$("#jrToolbar"); if(!tb) return;
  // format buttons
  tb.querySelectorAll("[data-cmd]").forEach(btn=>{
    btn.addEventListener("mousedown",e=>{
      e.preventDefault(); // keep focus in editor
      document.execCommand(btn.dataset.cmd,false,null);
      btn.classList.toggle("active", document.queryCommandState(btn.dataset.cmd));
    });
  });
  // color swatches
  tb.querySelectorAll(".jr-swatch[data-color]").forEach(sw=>{
    sw.addEventListener("mousedown",e=>{ e.preventDefault(); applyJrColor(sw.dataset.color); });
  });
  // color picker (rainbow circle)
  const colorPick=$("#jrColorPick");
  if(colorPick){
    colorPick.parentElement.addEventListener("mousedown",e=>{ e.preventDefault(); colorPick.click(); });
    colorPick.addEventListener("input",()=>applyJrColor(colorPick.value));
  }
  function applyJrColor(hex){
    const sel=window.getSelection();
    if(sel&&sel.rangeCount){
      const range=sel.getRangeAt(0);
      if(range.collapsed){
        // Insert a color-anchor span so typing continues in that color
        const span=document.createElement("span");
        span.style.color=hex;
        span.innerHTML="&#8203;"; // zero-width space placeholder
        range.insertNode(span);
        const r2=document.createRange();
        r2.setStart(span.firstChild,1); r2.collapse(true);
        sel.removeAllRanges(); sel.addRange(r2);
      } else {
        document.execCommand("styleWithCSS",false,true);
        document.execCommand("foreColor",false,hex);
      }
    }
    // update recents
    const DEFAULTS=["#9b8ec4","#c87080","#5a8a70"];
    const recents=(state.jrRecentColors&&state.jrRecentColors.length===3?state.jrRecentColors:DEFAULTS.slice());
    state.jrRecentColors=[hex,...recents.filter(c=>c!==hex)].slice(0,3);
    // repaint swatch row live without full render
    const swRow=$("#jrSwatches"); if(!swRow) return;
    swRow.querySelectorAll(".jr-swatch[data-color]").forEach((el,i)=>{
      const c=state.jrRecentColors[i]||'#ccc';
      el.dataset.color=c; el.style.background=c; el.title=c;
    });
  }
  // font family
  const fontSel=$("#jrFont");
  if(fontSel) fontSel.addEventListener("change",()=>{
    if(fontSel.value==="__add__"){
      const name=prompt("Font name (e.g. 'Pacifico'):");
      if(!name){fontSel.value="";return;}
      const url=prompt("Google Fonts URL (paste the @import link, or leave blank to use system font):");
      if(url&&url.trim()){
        const link=document.createElement("link"); link.rel="stylesheet"; link.href=url.trim(); document.head.appendChild(link);
      }
      const fonts=state.sentinel.jrFonts||[];
      fonts.push({name:name.trim(),url:url||""});
      state.sentinel.jrFonts=fonts;
      saveSentinel().catch(()=>{});
      // add to select and apply
      const opt=document.createElement("option"); opt.value=`'${name}',sans-serif`; opt.textContent=name;
      fontSel.insertBefore(opt, fontSel.querySelector("option[value='__add__']"));
      fontSel.value=opt.value;
      document.execCommand("fontName",false,opt.value);
      return;
    }
    if(fontSel.value) document.execCommand("fontName",false,fontSel.value);
  });
  // font size (execCommand uses 1-7, we map px sizes)
  const sizeSel=$("#jrSize");
  if(sizeSel) sizeSel.addEventListener("change",()=>{
    const px=parseInt(sizeSel.value);
    // insert a span with the size instead, execCommand fontSize is too coarse
    const sel=window.getSelection(); if(!sel.rangeCount) return;
    const range=sel.getRangeAt(0);
    if(range.collapsed) return;
    const span=document.createElement("span");
    span.style.fontSize=px+"px";
    range.surroundContents(span);
    sel.removeAllRanges();
  });
  // update active states on selection change
  el.addEventListener("keyup", updateToolbarState);
  el.addEventListener("mouseup", updateToolbarState);
  function updateToolbarState(){
    tb.querySelectorAll("[data-cmd]").forEach(btn=>{
      try{ btn.classList.toggle("active", document.queryCommandState(btn.dataset.cmd)); }catch(_){}
    });
  }
}

function viewJournal(){
  if(!state.jrRef){ const t=new Date(); state.jrRef=new Date(t.getFullYear(),t.getMonth(),1); }
  const ref=state.jrRef, ym=jrYM(ref);
  const rows=(state.jrCache||{})[ym];
  if(!rows){ setTimeout(async()=>{ try{ await jrFetchMonth(state.jrRef); if(state.tab==="journal") render(); }catch(_){} },10); }
  const R=rows||{};
  const st=jrStats(R); const wm=jrWeightMap();
  const monthName=ref.toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const startDow=new Date(ref.getFullYear(),ref.getMonth(),1).getDay();
  const daysIn=new Date(ref.getFullYear(),ref.getMonth()+1,0).getDate();
  let cells="";
  for(let i=0;i<startDow;i++) cells+=`<div></div>`;
  for(let d=1;d<=daysIn;d++){
    const ds=ym+"-"+String(d).padStart(2,"0"); const n=R[ds]; const sp=jrSpecial(ds,n);
    const mo=n&&n.mind&&n.mind.mood; const future=ds>TODAY;
    cells+=`<div class="jr-cell ${ds===TODAY?'today':''} ${ds===(state.jrDay||TODAY)?'jr-sel':''}" style="background:${future?'#fff':jrDayColor(n,sp)};${future?'opacity:.45;':''}cursor:${future?'default':'pointer'}" ${future?'':`data-act="jrPick" data-date="${ds}"`}>
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="cal-daynum">${d}</span>${mo!=null?`<span style="font-size:13px">${JR_MOODS[Math.max(0,Math.min(5,mo))]}</span>`:""}</div>
      ${n||wm[ds]?`<div class="jr-meta">${wm[ds]!=null?`⚖️${wm[ds]}`:""} ${n&&n.mind&&n.mind.energy!=null?`⚡${n.mind.energy}`:""} ${n&&n.sleep!=null?`🌙${n.sleep}h`:""}</div>
      <div class="jr-meta">${n&&n.stress!=null?`🫨${n.stress}`:""} ${jrSymptomFlag(n)?"🩹":""} ${n&&n.journal?"📝":""} ${jrStreamDay(ds)?"🔴":""} ${sp?"💜":""}</div>`:""}
    </div>`;
  }
  const caps=state.sentinel.memoryCapsules||{};
  const capYMs=(function(){ const out=[]; const t=new Date(); for(let i=1;i<=6;i++){ const d=new Date(t.getFullYear(),t.getMonth()-i,1); out.push(jrYM(d)); } return out; })();
  const srch=state.jrSearch||{};
  const theme=jrTheme(state.jrDay||TODAY); const col=theme[0];
  const monthLabel=ref.toLocaleDateString("en-US",{month:"long"});
  const stickers=(state.sentinel.jrStickers||[]).filter(s=>!s.month||s.month===ym);
  const washi=(state.sentinel.jrWashi||[]).filter(w=>!w.month||w.month===ym);
  const photos=(state.sentinel.jrPhotos||[]).filter(p=>!p.month||p.month===ym);
  return `<div class="page"><div class="jr-layout">
  <div class="page-main">
  ${jrDailyPage(state.jrDay||TODAY)}
  <section class="panel">
    <div class="card-head"><h2 style="font-size:18px">📓 ${monthName} <span class="soft" style="font-size:12px;font-weight:500">· month overview</span></h2>
      <div style="display:flex;gap:6px"><button class="btn" data-act="jrShift" data-d="-1">‹</button><button class="btn" data-act="jrToday">today</button><button class="btn" data-act="jrShift" data-d="1">›</button><button class="btn btn-grad" data-act="jrPick" data-date="${TODAY}">📝 today's page</button></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:12px">
      ${[["🌤️ avg mood",st.avgMood!=null?st.avgMood+"/5":"—"],["⚡ avg energy",st.avgEnergy!=null?st.avgEnergy+"/5":"—"],["🌙 avg sleep",st.avgSleep!=null?st.avgSleep+"h":"—"],["⚖️ this month",st.wDelta!=null?(st.wDelta>0?"+":"")+st.wDelta+CONFIG.weightUnit:"—"],["✨ best day",st.best?fmtDate(st.best.date):"—"],["🌧️ hardest",st.hard?fmtDate(st.hard.date):"—"]].map(([l,v])=>`<div class="soft-card" style="padding:8px 10px;text-align:center"><div class="label" style="font-size:9px">${l}</div><div style="font-weight:700;font-size:14px">${v}</div></div>`).join("")}
    </div>
    <div class="cal-grid" style="margin-bottom:4px">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>`<div class="cal-dow">${d}</div>`).join("")}</div>
    <div class="cal-grid">${cells}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:10px;color:var(--muted);margin-top:8px">
      <span><span class="jr-dot" style="background:#e0f5ea"></span> lovely</span><span><span class="jr-dot" style="background:#fdf3da"></span> okay</span><span><span class="jr-dot" style="background:#fde6e9"></span> rough</span><span><span class="jr-dot" style="background:#eef3fa"></span> unlogged</span><span><span class="jr-dot" style="background:#ece2fb"></span> special 💜</span><span>· 📝 has words · 🩹 symptoms · 🔴 stream day</span>
    </div>
    <p class="soft" style="font-size:10.5px;margin-top:6px">Your written words never show here — open a day to read them. 🔒💗</p>
  </section>
  <section class="panel">
    <div class="label" style="margin-bottom:6px">🔎 Find a day</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <input class="inp" id="jrQ" placeholder="search your words &amp; tags…" style="flex:2;min-width:150px" value="${esc(srch.q||'')}">
      <select class="inp" id="jrMood" style="max-width:150px">${[["","any mood"],["low","rough days (≤2)"],["mid","okay days (3)"],["high","lovely days (≥4)"]].map(([v,l])=>`<option value="${v}" ${srch.mood===v?'selected':''}>${l}</option>`).join("")}</select>
      <label class="chiptog ${srch.stream?'on':''}" style="cursor:pointer"><input type="checkbox" id="jrStream" ${srch.stream?'checked':''} style="display:none"><span>${srch.stream?'✓':''}</span>🔴 stream days</label>
      <label class="chiptog ${srch.sym?'on':''}" style="cursor:pointer"><input type="checkbox" id="jrSym" ${srch.sym?'checked':''} style="display:none"><span>${srch.sym?'✓':''}</span>🩹 symptom days</label>
      <button class="btn btn-grad" data-act="jrSearch">search</button>
    </div>
    ${srch.results?`<div style="margin-top:10px">${srch.results.length?srch.results.slice(0,40).map(r=>`<div class="listrow" data-act="jrPick" data-date="${r.date}" style="cursor:pointer"><span class="grow" style="font-size:12.5px"><b>${fmtDate(r.date)}</b> <span class="soft" style="font-size:11px">${r.meta}</span></span><span class="soft" style="font-size:11px">open →</span></div>`).join(""):'<p class="soft" style="font-size:12px">nothing matched — try fewer filters 🌸</p>'}${srch.results.length>40?`<p class="soft" style="font-size:10.5px">showing 40 of ${srch.results.length}</p>`:""}</div>`:""}
  </section>
  <section class="panel">
    <div class="card-head"><span class="label">💊 Monthly memory capsules</span><span class="pill pill-gray">a keepsake per month</span></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Kiko folds a whole month into a tiny keepsake — best day, hardest day, wins, and a line of yours worth keeping. 💗</p>
    ${capYMs.map(cym=>{ const c=caps[cym]; const label=new Date(cym+"-01T00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"});
      return c?`<details class="acc" style="margin-bottom:6px"><summary>💊 ${label}</summary><div class="acc-body"><div style="white-space:pre-wrap;font-size:12.5px;line-height:1.65">${esc(c.text)}</div><button class="btn" data-act="jrCapsule" data-ym="${cym}" style="margin-top:8px">↻ rebuild</button></div></details>`
        :`<div class="listrow"><span class="grow" style="font-size:12.5px">${label}</span><button class="btn" data-act="jrCapsule" data-ym="${cym}">✨ build capsule</button></div>`; }).join("")}
  </section>
  ${DISCLAIMER}
  </div><!-- /page-main --><aside class="jr-asset-panel">
    ${(()=>{
    const ph=(n,icon)=>Array.from({length:n},(_,i)=>`<div class="jr-asset-placeholder">${i===0?icon:''}</div>`).join('');
    const allMonths=[...new Set([...(state.sentinel.jrStickers||[]),...(state.sentinel.jrWashi||[]),...(state.sentinel.jrPhotos||[])].map(x=>x.month).filter(Boolean))].sort().reverse();
    const monthOpts=allMonths.map(m=>`<option value="${m}" ${m===ym?'selected':''}>${new Date(m+'-01T00:00').toLocaleDateString('en-US',{month:'long'})} · ${jrColorName(m)}</option>`).join('');
    const selMonth=state.jrAssetMonth||ym;
    const stk=(state.sentinel.jrStickers||[]).filter(s=>!s.month||s.month===selMonth).slice(0,6);
    const wsh=(state.sentinel.jrWashi||[]).filter(w=>!w.month||w.month===selMonth).slice(0,4);
    const pht=(state.sentinel.jrPhotos||[]).filter(p=>!p.month||p.month===selMonth).slice(0,6);
    const thumb=(s,type)=>`<img class="jr-asset-thumb" src="${esc(s.url)}" title="${esc(s.name||'')}" draggable="true" data-act="jrInsertAsset" data-url="${esc(s.url)}" data-type="${type}">`;
    const strip=(w)=>`<img class="jr-asset-strip" src="${esc(w.url)}" title="${esc(w.name||'')}" draggable="true" data-act="jrInsertAsset" data-url="${esc(w.url)}" data-type="washi">`;
    return `
    <div class="jr-asset-card">
      <div class="jr-asset-card-head"><span class="jr-asset-card-title">Stickers</span><span class="jr-asset-card-see">see all</span></div>
      <select class="jr-asset-month" data-act="jrAssetMonthPick"><option value="">all months</option>${monthOpts}</select>
      <div class="jr-asset-grid">${stk.map(s=>thumb(s,'sticker')).join('')}${ph(Math.max(0,6-stk.length),'🌸')}</div>
      <label class="jr-add-btn" style="display:block;text-align:center;cursor:pointer">+ add stickers to database<input type="file" accept="image/*" multiple style="display:none" data-act="jrUploadAsset" data-type="stickers"></label>
    </div>
    <div class="jr-asset-card">
      <div class="jr-asset-card-head"><span class="jr-asset-card-title">Washi</span><span class="jr-asset-card-see">see all</span></div>
      <select class="jr-asset-month" data-act="jrAssetMonthPick"><option value="">all months</option>${monthOpts}</select>
      ${wsh.map(w=>strip(w)).join('')}${Array.from({length:Math.max(0,4-wsh.length)},(_,i)=>`<div class="jr-asset-strip-ph">${i===0?'🎀':''}</div>`).join('')}
      <label class="jr-add-btn" style="display:block;text-align:center;cursor:pointer;margin-top:4px">+ add washi to database<input type="file" accept="image/*" multiple style="display:none" data-act="jrUploadAsset" data-type="washi"></label>
    </div>
    <div class="jr-asset-card">
      <div class="jr-asset-card-head"><span class="jr-asset-card-title">Photos</span><span class="jr-asset-card-see">see all</span></div>
      <div class="jr-asset-grid">${pht.map(p=>thumb(p,'photo')).join('')}${ph(Math.max(0,6-pht.length),'📷')}</div>
      <label class="jr-add-btn" style="display:block;text-align:center;cursor:pointer">+ add photos to database<input type="file" accept="image/*" multiple style="display:none" data-act="jrUploadAsset" data-type="photos"></label>
    </div>`;
  })()}
  </aside></div></div>`;
}
