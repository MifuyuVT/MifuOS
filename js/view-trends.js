const WT_COLORS={w:"#ef9ccb",bmi:"#9b8cf0",fat:"#f0869b",muscle:"#5fc59a",bone:"#c8a8ca",water:"#5ba6e8",visceral:"#f0b057"};

function wtYRange(vs){ if(!vs.length)return null; let mn=Math.min(...vs),mx=Math.max(...vs); if(mn===mx){mn-=1;mx+=1;} const p=(mx-mn)*0.12||1; return {mn:mn-p,mx:mx+p}; }

function buildWeightChartSVG(keys,type){
  let wl=withBMI((state.sentinel.weightLog||[]).slice().sort(cmpDate));
  const r=state.wtRange||"all";
  if(r!=="all"){ const days=r==="30d"?30:r==="90d"?90:365; const cut=dayAgo(-days); wl=wl.filter(x=>x.date>=cut); }
  keys=(keys||["w"]).filter(k=>BODYCOMP.some(b=>b[0]===k)); if(!keys.length)keys=["w"];
  const single=keys.length===1;
  const W=600,H=230,padX=42,padT=18,padB=32,plotW=W-padX*2,plotH=H-padT-padB,base=padT+plotH;
  const ts=wl.map(x=>Date.parse(x.date+"T00:00")); const t0=ts.length?Math.min(...ts):0,t1=ts.length?Math.max(...ts):1; const tspan=Math.max(1,t1-t0);
  const xi=iso=> padX + (ts.length>1 ? (Date.parse(iso+"T00:00")-t0)/tspan*plotW : plotW/2);
  let grid=""; for(let g=0;g<=2;g++){ const yy=padT+g*(plotH/2); grid+=`<line x1="${padX}" y1="${yy.toFixed(0)}" x2="${W-padX}" y2="${yy.toFixed(0)}" stroke="#e7e2f2" stroke-width="1"/>`; }
  // y-axis labels: real numbers when one metric, low/high when several
  let ylab="", r0=null;
  if(single){ r0=wtYRange(wl.filter(x=>x[keys[0]]!=null).map(x=>x[keys[0]]));
    if(r0){ [[padT,r0.mx],[padT+plotH/2,(r0.mn+r0.mx)/2],[base,r0.mn]].forEach(([yy,val])=>{ ylab+=`<text x="${padX-8}" y="${(yy+4).toFixed(0)}" text-anchor="end" font-size="11" fill="#9b96b6">${Math.round(val*10)/10}</text>`; }); } }
  else { ylab=`<text x="${padX-8}" y="${(padT+9).toFixed(0)}" text-anchor="end" font-size="10.5" fill="#9b96b6">high</text><text x="${padX-8}" y="${base.toFixed(0)}" text-anchor="end" font-size="10.5" fill="#9b96b6">low</text>`; }
  let ticks=""; if(wl.length){ [...new Set([0,Math.floor(wl.length/2),wl.length-1])].forEach(i=>{ ticks+=`<text x="${xi(wl[i].date).toFixed(0)}" y="${H-8}" text-anchor="middle" font-size="11" fill="#9b96b6">${fmtDate(wl[i].date)}</text>`; }); }
  let defs="", body="";
  keys.forEach((k,ki)=>{
    const col=WT_COLORS[k]||"#9b8cf0"; const raw=wl.filter(x=>x[k]!=null); if(!raw.length)return;
    const rng = single ? r0 : wtYRange(raw.map(x=>x[k])); if(!rng)return;
    const yv=v=> padT + (1-((v-rng.mn)/(rng.mx-rng.mn)))*plotH;
    const pts=raw.map(x=>({x:xi(x.date),y:yv(x[k])}));
    if(single && type==="bars"){ const gid="wbg"+ki; defs+=`<linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col}"/><stop offset="1" stop-color="${col}" stop-opacity=".5"/></linearGradient>`;
      const bw=Math.min(22,plotW/Math.max(1,pts.length)*0.6);
      pts.forEach(p=>{ const h=Math.max(2,base-p.y); body+=`<rect x="${(p.x-bw/2).toFixed(1)}" y="${p.y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="5" fill="url(#${gid})"/>`; });
    } else if(single && type==="dots"){
      pts.forEach(p=>{ body+=`<line x1="${p.x.toFixed(1)}" y1="${base}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${col}" stroke-width="2" opacity=".3"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5" fill="${col}"/>`; });
    } else {
      const fid="wfg"+ki; if(single)defs+=`<linearGradient id="${fid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".4"/><stop offset="1" stop-color="${col}" stop-opacity=".03"/></linearGradient>`;
      const path=pts.map(p=>`${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L");
      if(single && pts.length) body+=`<path d="M${pts[0].x.toFixed(1)} ${base} L${path} L${pts[pts.length-1].x.toFixed(1)} ${base} Z" fill="url(#${fid})"/>`;
      if(pts.length>1) body+=`<path d="M${path}" fill="none" stroke="${col}" stroke-width="${single?3:2.4}" stroke-linecap="round" stroke-linejoin="round"/>`;
      pts.forEach(p=>{ body+=`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${single?3.5:3}" fill="#fff" stroke="${col}" stroke-width="2.2"/>`; });
    }
  });
  if(!wl.length) body=`<text x="${W/2}" y="${(base-plotH/2).toFixed(0)}" text-anchor="middle" font-size="12" fill="#b9b3cf">no entries in this range yet ❄️</text>`;
  return `<svg class="trchart" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${grid}${ylab}${body}${ticks}</svg>`;
}

function viewWeight(){
  const wl=(state.sentinel.weightLog||[]).slice().sort(cmpDate);
  const vals=wl.map(x=>x.w), avg=rollingAvg(wl);
  const last=wl.slice(-1)[0], dueWeekly=!last||daysBetween(last.date,TODAY)>=7;
  const disp=CONFIG.weightDisplay, showNum=disp!=="hidden";
  const nsv=(state.sentinel.nsv||[]).slice().reverse();
  const meas=(state.sentinel.measurements||[]).slice().sort(cmpDate);
  const wtKeys=(state.wtMetrics&&state.wtMetrics.length)?state.wtMetrics:["w"];
  const wtType=state.wtType||"area";
  const availKeys=BODYCOMP.filter(([k])=> k==="w" || (k==="bmi"&&state.sentinel.heightCm) || (state.sentinel.weightLog||[]).some(x=>x[k]!=null));
  return `
  <section class="panel">
    <div class="card-head"><h2 style="font-size:18px">⚖️ The gentle journey</h2><span class="pill pill-gray">trend-first</span></div>
    <p class="soft" style="font-size:12px;margin:0 0 10px">The <b>trend</b> is the story — bodies fluctuate day to day, especially with PCOS and a GLP-1. We lean on the weekly average, not any single morning.</p>
    <div class="soft-card">
      ${showNum?`<div class="label">Rolling weekly avg</div><div class="bignum" id="numSlot">${avg!=null?avg.toFixed(1):'—'} <span class="soft" style="font-size:12px;font-family:var(--sans)">${CONFIG.weightUnit}</span></div>`
        :`<div id="numSlot"><button class="btn" data-act="revealNum">Tap to peek at the number</button></div>`}
      <p class="soft" style="font-size:11.5px;text-align:center;margin:6px 0 0">A calm line over time — no good days or bad days here. ❄️</p>
    </div>
    <div class="tr-frame" style="margin-top:10px">
      <div class="chiprow" style="margin-bottom:10px">
        ${availKeys.map(([k,l,u,e])=>`<button class="chiptog ${wtKeys.includes(k)?'on':''}" data-act="wtMetric" data-v="${k}"><span>${wtKeys.includes(k)?'✓':e}</span>${l}</button>`).join("")}
      </div>
      <div id="wtChart">${buildWeightChartSVG(wtKeys,wtType)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;flex-wrap:wrap">
        <span class="tr-range">${[["30d","30d"],["90d","90d"],["all","all"]].map(([v,l])=>`<button class="${(state.wtRange||'all')===v?'on':''}" data-act="wtRange" data-v="${v}">${l}</button>`).join("")}</span>
        <span style="display:flex;gap:6px">${["area","bars","dots"].map(t=>`<button class="btn ${wtType===t?'btn-grad':''}" data-act="wtType" data-v="${t}" style="padding:5px 11px;font-size:14px" title="${({area:'soft line',bars:'bars',dots:'dots'})[t]}">${({area:'∿',bars:'▮',dots:'•'})[t]}</button>`).join("")}</span>
      </div>
      ${wtKeys.length>1?'<p class="soft" style="font-size:10.5px;text-align:center;margin-top:8px">Comparing several — each line is scaled to its own range.</p>':''}
    </div>
    <div class="field"><div class="label" style="margin-bottom:6px">${dueWeekly?'🗓️ Time for a gentle weekly weigh-in':'✅ Weighed in recently — no rush'}</div>
      <div style="display:flex;gap:8px"><input class="inp" type="number" step="0.1" id="wInput" placeholder="${CONFIG.weightUnit}" style="max-width:140px" value="${esc(state.wDraft||'')}"><button class="btn btn-grad" data-act="logWeight">Log it</button></div>
      <p class="soft" style="font-size:11px;margin-top:6px">Tip: same day &amp; time each week makes the trend cleaner — but a missed week is totally fine.</p></div>
  </section>

  ${(function(){
    const wlb=withBMI(wl);
    const wcon=!!(state.sentinel.withings && state.sentinel.withings.refresh_token);
    const lastSync=state.sentinel.withings && state.sentinel.withings.lastSync;
    const tiles=BODYCOMP.map(([k,l,u,e])=>{ const m=bcLatest(wlb,k); if(!m)return "";
      const ds=m.d!=null&&m.d!==0?` <span class="soft" style="font-size:10.5px">(${m.d>0?'+':''}${m.d})</span>`:'';
      return `<div class="soft-card" style="padding:10px 12px"><div class="label">${e} ${l}</div><div style="font-size:18px;font-weight:700">${m.v}${u?`<span class="soft" style="font-size:11px;font-weight:500"> ${u}</span>`:''}${ds}</div></div>`;
    }).filter(Boolean).join("");
    return `<section class="panel">
      <div class="card-head"><h2 style="font-size:17px">📊 Body Smart metrics</h2>${wcon?'<span class="pill pill-mint">Withings linked ❄️</span>':''}</div>
      <p class="soft" style="font-size:12px;margin:0 0 10px">Everything your Withings Body Smart tracks. Sync straight from the scale, or pop any value in by hand.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        ${wcon?`<button class="btn btn-grad" data-act="withingsSync">↻ Sync from scale</button>${lastSync?`<span class="soft" style="font-size:11px">last sync ${esc(new Date(lastSync*1000).toLocaleDateString())}</span>`:''}<button class="btn" data-act="withingsConnect" title="re-link your scale if syncing stopped working">🔗 Reconnect</button>`
          :`<button class="btn btn-grad" data-act="withingsConnect">🔗 Connect Withings</button><span class="soft" style="font-size:11px">links your scale so weigh-ins sync automatically</span>`}
        <button class="btn" data-act="withingsDebug" title="check exactly where syncing is breaking">🔍 Diagnose</button>
      </div>
      <div id="withingsDiag"></div>
      ${tiles?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">${tiles}</div>`:'<p class="soft" style="font-size:12.5px">No body-comp data yet — connect your scale or log some below. ❄️</p>'}
      <details class="acc" style="margin-top:12px"><summary>📝 Log metrics by hand</summary><div class="acc-body">
        <p class="soft" style="font-size:11.5px;margin:0 0 8px">Fill in any you like and save — they update today's entry, no need to fill them all.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${BODYCOMP.filter(([k])=>k!=="bmi").map(([k,l,u])=>`<div class="field" style="margin:4px 0"><div class="label">${l}${u?` (${u})`:''}</div><input class="inp" type="number" step="0.1" id="bc_${k}" placeholder="${u||'value'}"></div>`).join("")}
          <div class="field" style="margin:4px 0"><div class="label">Height (cm) · for BMI</div><input class="inp" type="number" step="0.1" id="bc_height" value="${state.sentinel.heightCm||''}" placeholder="cm"></div>
        </div>
        <button class="btn btn-grad" data-act="setBodyComp" style="margin-top:6px">Save metrics</button>
      </div></details>
    </section>`;
  })()}

  <section class="panel">
    <div class="card-head"><span class="label">🌟 Non-scale victories</span></div>
    <p class="soft" style="font-size:12px;margin:0 0 8px">The wins the scale can't see. Celebrate these <b>loudly</b>. ❄️</p>
    ${nsv.length?nsv.map(v=>`<div class="listrow"><span class="grow">${esc(v.t)} <span class="soft" style="font-size:11px">· ${fmtDate(v.date)}</span></span><button class="x" data-act="delNSV" data-v="${v.id}">✕</button></div>`).join("")
      :`<p class="soft" style="font-size:12.5px">Add one whenever you notice it — "clothes fit better", "more energy", "cravings quieter"…</p>`}
    <div style="display:flex;gap:8px;margin-top:10px"><input class="inp" id="nsvInput" placeholder="a little win…"><button class="btn btn-grad" data-act="addNSV">Add 🌸</button></div>
  </section>

  <details class="acc"><summary>📏 Optional measurements</summary><div class="acc-body">
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Fill in any you like (cm) and save — they don't all need a value.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${[["bust","Bust"],["waist","Waist"],["hips","Hips"],["thighs","Thighs"],["arms","Arms"]].map(([k,l])=>`<div class="field" style="margin:4px 0"><div class="label">${l}</div><input class="inp" type="number" step="0.1" id="meas_${k}" placeholder="cm"></div>`).join("")}
    </div>
    <button class="btn btn-grad" data-act="setMeasure">Save measurements</button>
    ${(function(){
      const keys=[["bust","Bust"],["waist","Waist"],["hips","Hips"],["thighs","Thighs"],["arms","Arms"]];
      const rows=keys.map(([k,l])=>{ const ent=meas.filter(m=>m[k]!=null); if(!ent.length) return "";
        const last=ent[ent.length-1], prev=ent.length>1?ent[ent.length-2]:null;
        const d=prev?(last[k]-prev[k]):null; const ds=d!=null?` <span class="soft" style="font-size:11px">(${d>0?'+':''}${d.toFixed(1)})</span>`:'';
        return `<div class="listrow"><span class="grow" style="font-size:12.5px">${l} <span class="soft" style="font-size:10.5px">· ${fmtDate(last.date)}</span></span><span style="font-weight:700">${last[k]} cm${ds}</span></div>`; }).join("");
      return rows?`<div style="margin-top:12px">${rows}</div>`:'';
    })()}
  </div></details>
  ${DISCLAIMER}`;
}

const TREND_TYPES=["area","bars","dots"];

/* ============================================================================
   KIKO INTELLIGENCE LAYER (deterministic, grounded — no server call, no hallucination).
   #1 Health Interpreter: per-metric trend reads with a likely cause + one action.
   #2 Insights: the client correlation engine (kikoCorrelations) already shipped.
   #3 Perspective: an occasional reframe from real counts. Rendered on the Trends page.
   ============================================================================ */
function kikoTrendReads(){
  const s=state.sentinel||{}, u=CONFIG.weightUnit||"kg", reads=[];
  const add=(emoji,label,value,kiko)=>{ if(kiko) reads.push({emoji,label,value,kiko}); };
  try{ const wl=(s.weightLog||[]).filter(x=>x&&x.w!=null).slice().sort(cmpDate);
    if(wl.length>=3){ const last=wl[wl.length-1].w, ref=wl[Math.max(0,wl.length-5)].w, d=Math.round((last-ref)*10)/10;
      add("⚖️","Weight",(d<0?"↓ ":d>0?"↑ ":"→ ")+(d===0?"steady":Math.abs(d)+" "+u),
        d<=-0.2?`Trending down about ${Math.abs(d)} ${u} over your last ${Math.min(5,wl.length)} weigh-ins. Day-to-day wobble is normal — the bigger trend is what counts, and it's heading the right way.`
        : d>=0.4?`Up ${d} ${u} recently. A short rise is usually water or eating patterns rather than fat — worth leaning into protein + veg for a few days and watching it settle.`
        : `Holding steady. If muscle is up or fat is down underneath, that's still real progress even when the scale is quiet.`); } }catch(e){}
  try{ const mu=(s.weightLog||[]).filter(x=>x&&x.muscle!=null).slice().sort(cmpDate);
    if(mu.length>=2){ const d=Math.round((mu[mu.length-1].muscle-mu[0].muscle)*10)/10;
      add("💪","Muscle",(d>0?"+":"")+d+"%",
        d>=0.3?`Up ${d}% since ${fmtDate(mu[0].date)}. Whatever you're doing — protein + training — is working; keep it steady.`
        : d<=-0.3?`Down ${Math.abs(d)}% since ${fmtDate(mu[0].date)}. Protein is the main lever; aim to hit your protein goal consistently this week.`
        : `Roughly holding — keeping muscle while losing weight is exactly the goal.`); } }catch(e){}
  try{ const fa=(s.weightLog||[]).filter(x=>x&&x.fat!=null).slice().sort(cmpDate);
    if(fa.length>=2){ const d=Math.round((fa[fa.length-1].fat-fa[0].fat)*10)/10;
      add("🫧","Body fat",(d>0?"+":"")+d+"%",
        d<=-0.3?`Down ${Math.abs(d)}% since ${fmtDate(fa[0].date)} — the work is showing.`
        : d>=0.4?`Up ${d}% lately. This can ride on water retention or a few higher days; prioritise protein + vegetables for a few days and see if it reverses.`
        : `Fairly flat — normal week to week.`); } }catch(e){}
  try{ const fh=foodHistory(7).filter(h=>h.meals&&h.meals.length), tg=foodTargets().protein;
    if(fh.length>=3){ const avg=Math.round(fh.reduce((a,h)=>a+h.protein,0)/fh.length), hit=fh.filter(h=>h.protein>=tg).length;
      add("🍳","Protein",`~${avg}g avg`,
        hit>=Math.ceil(fh.length*0.6)?`You hit your protein goal on ${hit} of ${fh.length} logged days — strong, and it protects muscle while you lose.`
        : `Averaging ~${avg}g/day vs your ${tg}g goal (hit on ${hit}/${fh.length} days). Easy win: a shake or yogurt on the days you fall short.`); } }catch(e){}
  try{ const avg=waterWeekAvg(); if(avg!=null){ const goal=CUPS_PER_40OZ*2, L=c=>(c*0.2366).toFixed(1);
    add("💧","Water",`~${L(avg)}L/day`,
      avg<goal*0.7?`A little under your usual hydration. Water often tracks with how you feel — nausea and energy both tend to do better on well-hydrated days.`
      : `Hydration's solid lately — that quietly helps energy and nausea.`); } }catch(e){}
  try{ const vals=[]; for(let i=1;i<=7;i++){ const d=rangeRow(dayAgo(-i)); const sl=d&&Number(d.sleep); if(sl)vals.push(sl); }
    if(vals.length>=3){ const avg=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10;
      add("😴","Sleep",`~${avg}h avg`,
        avg<7?`Averaging ~${avg}h over your last ${vals.length} nights — under 7h tends to show up as lower recovery and higher fatigue. An earlier wind-down a couple of nights could help.`
        : `Averaging ~${avg}h — a recovery-friendly range. 🌙`); } }catch(e){}
  return reads;
}

function kikoPerspective(){
  const creator=OS_MODE!=="health", s=state.sentinel||{};
  try{
    if(creator){ const mStart=TODAY.slice(0,7)+"-01", cnt=k=>((s.checkinLog||{})[k]||[]).filter(d=>d>=mStart&&d<=TODAY).length;
      const streams=cnt("streamed"), yt=cnt("ytVideo")+cnt("ytShort"), art=cnt("madeArt"); const bits=[];
      if(streams)bits.push(`streamed ${streams} day${streams>1?"s":""}`); if(yt)bits.push(`${yt} upload${yt>1?"s":""}`); if(art)bits.push(`made art ${art} day${art>1?"s":""}`);
      if(bits.length>=2) return `Even on a week that felt quiet, this month you've ${bits.join(", ")}. That's real, steady output — be fair to yourself about it.`;
    } else {
      const wlw=(s.weightLog||[]).filter(x=>x&&x.w!=null).slice().sort(cmpDate), mu=(s.weightLog||[]).filter(x=>x&&x.muscle!=null).slice().sort(cmpDate);
      if(wlw.length>=3&&mu.length>=2){ const dW=wlw[wlw.length-1].w-wlw[0].w, dM=mu[mu.length-1].muscle-mu[0].muscle;
        if(dW<=-0.3&&dM>=-0.1) return `Worth zooming out: you've lost weight while keeping (or building) muscle. That's the healthy, sustainable kind of progress — not just a smaller number.`; }
      const byd={}; (state.range||[]).forEach(r=>{ if(r&&r.date)byd[r.date]=r.notes||{}; });
      let streak=0; for(let i=0;i<30;i++){ const n=i===0?(state.today||{}):byd[dayAgo(-i)]; const h=n&&n.habits; if(h&&h.h_meds)streak++; else if(i>0)break; }
      if(streak>=14) return `You've stayed on your meds ${streak} days running — that kind of consistency is one of the biggest quiet contributors to long-term results.`;
    }
  }catch(e){}
  return "";
}

function kikoDataReadCard(){
  const reads=kikoTrendReads(); let corr=[]; try{ corr=kikoCorrelations("health"); }catch(e){} const persp=kikoPerspective();
  if(!reads.length&&!corr.length&&!persp) return "";
  return `<section class="panel">
    <div class="card-head"><h2 style="font-size:17px">💗 Kiko reads your data</h2></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 10px">Not just numbers — what the trends actually mean, grounded in your own logs.</p>
    ${reads.map(r=>`<div class="listrow"><span style="font-size:16px;flex:0 0 auto">${r.emoji}</span><span class="grow" style="min-width:0"><b style="font-size:12.5px">${esc(r.label)}</b> <span class="soft num" style="font-size:12px">${esc(r.value)}</span><div class="soft" style="font-size:12px;line-height:1.5">${esc(r.kiko)}</div></span></div>`).join("")}
    ${corr.length?`<div class="sec-label" style="margin-top:12px">🔗 Connections Kiko spotted</div>${corr.map(c=>`<div class="kn-row"><span class="kn-dot"></span><span style="font-size:12px">${esc(c.t)}</span></div>`).join("")}`:""}
    ${persp?`<div class="soft-card" style="margin-top:12px;font-size:12.5px;line-height:1.55"><b class="peri">💭 Perspective</b><br>${esc(persp)}</div>`:""}
  </section>`;
}

function viewTrends(){
  const {byDate}=buildSeries();
  const sel=(state.trendMetrics&&state.trendMetrics.length)?state.trendMetrics:["mood"];
  const days=state.trendDays===30?30:14;
  return `<div class="page">
  <section class="panel">
    <div class="card-head"><h2 style="font-size:18px">📈 Your last ${days} days</h2>
      <span class="tr-range">
        <button class="${days===14?'on':''}" data-act="trendDays" data-v="14">14d</button>
        <button class="${days===30?'on':''}" data-act="trendDays" data-v="30">30d</button>
      </span></div>
    <div class="chiprow" style="margin-bottom:12px">
      ${TREND_METRICS.map(([k,e,l])=>`<button class="chiptog ${sel.includes(k)?'on':''}" data-act="trendMetric" data-v="${k}"><span>${e}</span>${l}</button>`).join("")}
    </div>
    <div class="tr-frame">
      <div class="tr-frame-head">
        <span class="tr-title" id="trendTitle"></span>
        <span class="tr-legend" id="trendLegend"></span>
      </div>
      <div id="trendChartHost"></div>
      <div class="tr-stat" id="trendStat"></div>
    </div>
    <p id="trendWord" style="text-align:center;font-family:var(--display);font-size:15px;color:var(--ink);margin:10px 0 0"></p>
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;flex-wrap:wrap">
      <span class="label">view:</span>
      ${TREND_TYPES.map(t=>`<button class="btn ${(state.trendType||'area')===t?'btn-grad':''}" data-act="trendType" data-v="${t}" style="padding:5px 11px;font-size:14px" title="${({area:'soft line',bars:'bars',dots:'dots'})[t]} ${sel.length>1?'(applies when one metric is shown)':''}">${({area:'∿',bars:'▮',dots:'•'})[t]}</button>`).join("")}
    </div>
    <p class="soft" style="font-size:11px;text-align:center;margin-top:8px">Tap chips to layer metrics and watch them in tandem. Gaps just mean a rest day — that's allowed. 💗</p>
  </section>
  ${kikoDataReadCard()}
  <section class="panel">
    <div class="label" style="margin-bottom:6px">🔎 Gentle pattern-spotter</div>
    ${patternSpotter(byDate)}
  </section>
  <div style="text-align:center;margin:18px 0 4px"><span class="label" style="letter-spacing:.08em">⚖️ &nbsp;weight &amp; body&nbsp;⚖️</span></div>
  ${viewWeight().split(DISCLAIMER)[0]}
  ${DISCLAIMER}</div>`;
}
