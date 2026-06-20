function foodEstCard(e){
  return `<div class="soft-card" style="margin-top:12px">
    <div class="label">estimate${e.confidence?` <span class="soft">· ${esc(e.confidence)} confidence</span>`:''}</div>
    <div style="display:flex;gap:8px;margin:6px 0;flex-wrap:wrap"><input class="inp" id="fe_name" value="${esc(e.name||'')}" style="flex:1;min-width:120px"><input class="inp" id="fe_serving" value="${esc(e.serving||'')}" placeholder="serving" style="flex:1;min-width:120px"></div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">
      ${[["kcal","kcal",e.kcal],["protein","protein",e.protein],["carbs","carbs",e.carbs],["fiber","fiber",e.fiber],["fat","fat",e.fat]].map(([k,l,v])=>`<div class="field" style="margin:0"><div class="label" style="font-size:10px">${l}</div><input class="inp" type="number" step="0.1" id="fe_${k}" value="${v}"></div>`).join("")}
    </div>
    ${e.note?`<p class="soft" style="font-size:11.5px;margin:8px 0 0">${esc(e.note)}</p>`:''}
    <div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-grad" data-act="foodLog">🍽️ Log it</button><button class="btn" data-act="foodClear">discard</button></div>
  </div>`;
}

function cardFoodCheckoffs(){
  const meds=(state.today&&state.today.meds)||{}; const w40=water40();
  const medBtn=(part,lbl)=>`<button class="chiptog ${meds[part]?'on':''}" data-act="medToggle" data-v="${part}"><span>${meds[part]?'✓':'＋'}</span>${lbl}</button>`;
  const list=(state.sentinel.medsList||[]); const taken=(state.today&&state.today.medsTaken)||{};
  const perMed=list.length?`<details id="foodMedsDetails" class="acc" style="margin:0 0 10px" ${state.foodMedsOpen?'open':''}><summary style="font-size:12px">by medication (${list.filter(m=>taken[m.id]).length}/${list.length} taken)</summary><div style="margin-top:6px">${list.map(m=>{ const refillSoon=m.refill&&daysBetween(TODAY,m.refill)<=7&&daysBetween(TODAY,m.refill)>=0;
      return `<div class="listrow"><button class="x" data-act="medTake" data-v="${m.id}" style="font-size:16px;color:${taken[m.id]?'var(--mint,#2f9d79)':'var(--muted)'}">${taken[m.id]?'●':'○'}</button><span class="grow" style="font-size:12.5px;${taken[m.id]?'text-decoration:line-through;opacity:.6':''}">${esc(m.name)} <span class="soft" style="font-size:11px">${esc(m.dose||'')}${m.time?' · '+esc(m.time):''}</span></span>${refillSoon?`<span class="pill" style="background:#fdebd9;color:#b4764a;font-size:9px">refill ${fmtDate(m.refill)}</span>`:''}</div>`; }).join("")}</div></details>`:'';
  return `<section class="panel">
    <div class="card-head"><span class="label">✅ Daily check-offs</span></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Meds links with your Home daily habits — both AM &amp; PM ticked marks meds done there too. 💗</p>
    <div class="label" style="margin-bottom:4px">💊 Meds</div>
    <div class="chiprow" style="margin-bottom:10px">${medBtn("am","Meds AM")}${medBtn("pm","Meds PM")}</div>
    ${perMed}
    <div class="field" style="margin:0"><div class="label">💧 Water today <span class="soft" style="text-transform:none;letter-spacing:0;font-weight:500">· goal 2–3 × 40oz</span></div>
      <div class="hcount"><button class="step" data-act="waterCup" data-v="-1">−</button><span>${w40%1?w40.toFixed(1):w40}</span><button class="step" data-act="waterCup" data-v="1">＋</button><span class="soft" style="font-size:12px;font-family:var(--sans)">× 40oz 🥤</span></div></div>
  </section>`;
}

function cardFoodWeek(){
  const hist=foodHistory(7), T=foodTargets();
  const maxP=Math.max(T.protein,...hist.map(h=>h.protein),1), maxF=Math.max(T.fiber,...hist.map(h=>h.fiber),1);
  const dayName=iso=>new Date(iso+"T00:00").toLocaleDateString(undefined,{weekday:"short"});
  const rows=hist.map(h=>{ const isToday=h.date===TODAY;
    return `<div style="margin:7px 0">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px"><span class="${isToday?'':'soft'}">${dayName(h.date)}${isToday?' · today':''}</span><span class="soft">P ${Math.round(h.protein)}g · Fb ${Math.round(h.fiber)}g${h.meals.length?` · ${h.meals.length} meal${h.meals.length>1?'s':''}`:''}</span></div>
      <div style="display:flex;gap:4px;align-items:center"><div class="bar" style="flex:1"><span style="width:${Math.round(h.protein/maxP*100)}%;background:linear-gradient(90deg,var(--peri),var(--sakura))"></span></div></div>
      <div style="display:flex;gap:4px;align-items:center;margin-top:2px"><div class="bar" style="flex:1"><span style="width:${Math.round(h.fiber/maxF*100)}%;background:linear-gradient(90deg,#7fc8a9,#9fc7f0)"></span></div></div>
      ${h.meals.length?`<details style="border:none;background:transparent;padding:0;box-shadow:none;margin-top:3px"><summary style="font-size:10.5px;color:var(--muted)">see meals</summary><div style="margin-top:3px">${h.meals.map(x=>`<div class="soft" style="font-size:11px;padding:1px 0">${esc(x.name)}${x.serving?` · ${esc(x.serving)}`:''} <span style="opacity:.7">(${Math.round(x.kcal)}kcal · P${x.protein} · Fb${x.fiber})</span></div>`).join("")}</div></details>`:''}
    </div>`; }).join("");
  const wkP=hist.reduce((a,h)=>a+h.protein,0), wkF=hist.reduce((a,h)=>a+h.fiber,0), nd=hist.filter(h=>h.meals.length).length||1;
  return `<section class="panel">
    <div class="card-head"><span class="label">📅 This week's meals &amp; nutrition</span></div>
    <p class="soft" style="font-size:11px;margin:0 0 6px"><span style="color:var(--sakura-deep)">▮</span> protein · <span style="color:#7fc8a9">▮</span> fibre — daily, vs your targets (P ${T.protein}g · Fb ${T.fiber}g). Avg/logged-day: <b>${Math.round(wkP/nd)}g</b> protein · <b>${Math.round(wkF/nd)}g</b> fibre.</p>
    ${rows}
  </section>`;
}

/* ============================================================================
   KIKO FOOD ASSISTANT (slice 1) — learns Mifu's habits from her own logs, reduces mental
   load. Deterministic, no extra server calls. Meal memory + one-tap re-log, an actionable
   "Kiko says", food↔health insights, a food profile, and lazy-day ideas. (Photo/voice
   logging already exists above; smart-pantry inference + fridge-mode "what can I make" +
   auto shopping list = staged for slice 2, where fridge-mode reuses the food agent.)
   ============================================================================ */
function foodAllItems(days){ try{ const out=[]; foodHistory(days||120).forEach(h=>{ (h.meals||[]).forEach(it=>{ if(it&&it.name) out.push({...it,date:h.date}); }); }); return out; }catch(e){ return []; } }

function foodMealMemory(){
  const items=foodAllItems(120), norm=s=>String(s||"").toLowerCase().trim();
  const bucketOf=it=>{ try{ const h=it.time?new Date(it.time).getHours():13; return h<11?"breakfast":h<16?"lunch":h<21?"dinner":"snack"; }catch(e){ return "lunch"; } };
  const B={breakfast:{},lunch:{},dinner:{},snack:{}};
  items.forEach(it=>{ const b=bucketOf(it), k=norm(it.name); if(!k)return; const e=B[b][k]||(B[b][k]={name:it.name,n:0,kcal:0,protein:0,fiber:0,carbs:0,fat:0,serving:it.serving||""});
    e.n++; e.kcal=it.kcal||e.kcal; e.protein=it.protein||e.protein; e.fiber=it.fiber||e.fiber; e.carbs=it.carbs||e.carbs; e.fat=it.fat||e.fat; });
  const top=o=>Object.values(o).filter(e=>e.n>=2).sort((a,b)=>b.n-a.n).slice(0,4);
  return { breakfast:top(B.breakfast), lunch:top(B.lunch), dinner:top(B.dinner), snack:top(B.snack) };
}

function foodKikoSays(){ const T=foodTargets(), tot=foodTotals(), bits=[];
  if(!foodToday().length) return "Nothing logged yet — when you eat, snap a photo or tap a usual and Kiko handles the macros.";
  bits.push(tot.protein>=T.protein?`Protein goal hit (${Math.round(tot.protein)}/${T.protein}g) — lovely. 💪`:`Protein's at ${Math.round(tot.protein)}/${T.protein}g — about ${Math.round(T.protein-tot.protein)}g to go. A shake or yogurt would close it.`);
  if(tot.fiber<T.fiber) bits.push(`Fibre's a little behind (${Math.round(tot.fiber)}/${T.fiber}g) — fruit or veg with dinner would likely finish it.`);
  return bits.join(" "); }

function foodInsights(){
  const out=[], fh=foodHistory(14).filter(h=>h.meals&&h.meals.length), T=foodTargets();
  let streak=0; for(let i=0;i<fh.length;i++){ const h=fh[fh.length-1-i]; if(h&&h.protein>=T.protein)streak++; else break; }
  if(streak>=3) out.push(`You've hit your protein goal ${streak} days running — strong week.`);
  try{ const items=foodAllItems(30), hiDays=new Set(fh.filter(h=>h.protein>=T.protein).map(h=>h.date)), eggDays=new Set(items.filter(it=>/egg|yogurt|yoghurt|protein/i.test(it.name)).map(it=>it.date));
    const overlap=[...hiDays].filter(d=>eggDays.has(d)).length; if(hiDays.size>=3&&overlap>=Math.ceil(hiDays.size*0.6)) out.push(`Your highest-protein days almost always include eggs or yogurt.`); }catch(e){}
  try{ if(foodAllItems(7).filter(it=>/kiwi|apple|berr|strawberr|banana|fruit|orange|grape|mango|melon/i.test(it.name)).length===0 && fh.length>=2) out.push(`Not much fruit logged this week compared to usual — a kiwi or apple is an easy fibre win.`); }catch(e){}
  return out;
}

function foodProfile(){
  const items=foodAllItems(120); if(items.length<4) return null; const norm=s=>String(s||"").toLowerCase().trim(); const freq={};
  items.forEach(it=>{ const k=norm(it.name); if(!k)return; (freq[k]=freq[k]||{name:it.name,n:0}).n++; });
  const top=Object.values(freq).sort((a,b)=>b.n-a.n), find=re=>{ const m=top.find(t=>re.test(t.name)); return m?m.name:null; };
  return { mostEaten:top[0]&&top[0].name, fruit:find(/kiwi|apple|berr|strawberr|banana|orange|grape|mango|melon/i), protein:find(/chicken|egg|protein|steak|fish|salmon|tofu|beef|yogurt/i), snack:find(/yogurt|yoghurt|pudding|bar|crisp|chip|chocolate|cookie|nut/i) };
}

function kikoFoodCard(){
  const ins=foodInsights(), prof=foodProfile();
  return `<section class="panel"><div class="card-head"><h2 style="font-size:17px">💗 Kiko &amp; your food</h2></div>
    <div class="soft-card" style="font-size:12.5px;line-height:1.55"><b class="peri">Kiko says</b><br>${esc(foodKikoSays())}</div>
    ${ins.length?`<div style="margin-top:10px">${ins.map(t=>`<div class="kn-row"><span class="kn-dot"></span><span style="font-size:12px">${esc(t)}</span></div>`).join("")}</div>`:""}
    ${prof?`<div class="sec-label" style="margin-top:12px">🍱 Your food profile</div><div class="chiprow">${[["Most eaten",prof.mostEaten],["Fruit",prof.fruit],["Protein",prof.protein],["Snack",prof.snack]].filter(x=>x[1]).map(x=>`<span class="pill pill-gray">${x[0]}: ${esc(x[1])}</span>`).join("")}</div>`:""}
  </section>`;
}

function mealMemoryCard(){
  const mm=foodMealMemory();
  if(!(mm.breakfast.length||mm.lunch.length||mm.dinner.length||mm.snack.length))
    return `<section class="panel"><div class="card-head"><span class="label">🍽️ Kiko's meal memory</span></div><p class="soft" style="font-size:12.5px;margin:0">As you log meals, Kiko learns your go-tos here for one-tap re-logging. ❄️</p></section>`;
  const reBtn=e=>`<button class="chiptog" data-act="foodRelog" data-name="${esc(e.name)}" data-serving="${esc(e.serving||'')}" data-kcal="${Math.round(e.kcal||0)}" data-protein="${e.protein||0}" data-fiber="${e.fiber||0}" data-carbs="${e.carbs||0}" data-fat="${e.fat||0}" title="${e.n}× · ${Math.round(e.kcal||0)} kcal · P${Math.round(e.protein||0)}"><span>＋</span>${esc(e.name)} <span class="soft" style="font-size:10px">${e.n}×</span></button>`;
  const sec=(emoji,label,arr)=>arr.length?`<div style="margin-top:10px"><div class="label">${emoji} ${label}</div><div class="chiprow" style="margin-top:4px">${arr.map(reBtn).join("")}</div></div>`:"";
  return `<section class="panel"><div class="card-head"><span class="label">🍽️ Kiko's meal memory</span><span class="soft" style="font-size:11px">tap to log the usual</span></div>
    <p class="soft" style="font-size:12px;margin:0">Your go-to meals, learned from what you log.</p>
    ${sec("🥣","Breakfasts",mm.breakfast)}${sec("🥗","Lunches",mm.lunch)}${sec("🍲","Dinners",mm.dinner)}${sec("🍓","Snacks",mm.snack)}
  </section>`;
}

function lazyMealsCard(){
  const T=foodTargets(), tot=foodTotals(), lowP=tot.protein<T.protein, lowF=tot.fiber<T.fiber;
  return `<section class="panel"><div class="card-head"><span class="label">😌 Lazy-day meals</span></div>
    <p class="soft" style="font-size:12px;margin:0 0 6px">When cooking feels like too much — quick wins for what you need today.</p>
    ${lowP?`<div class="label">💪 Need protein</div><div class="chiprow" style="margin:4px 0 8px"><span class="pill pill-peri">🥤 Protein shake ~25g</span><span class="pill pill-peri">🥚 4 eggs ~24g</span><span class="pill pill-peri">🥛 Protein yogurt ~20g</span><span class="pill pill-peri">🥣 Protein cereal ~22g</span></div>`:""}
    ${lowF?`<div class="label">🌿 Need fibre</div><div class="chiprow" style="margin:4px 0 8px"><span class="pill pill-mint">🥝 Kiwi</span><span class="pill pill-mint">🍎 Apple</span><span class="pill pill-mint">🥣 Oats</span><span class="pill pill-mint">🥦 Broccoli</span></div>`:""}
    <div class="label">⚡ Just something easy</div><div class="chiprow" style="margin-top:4px"><span class="pill pill-lav">🥤 Shake</span><span class="pill pill-lav">🥛 Yogurt</span><span class="pill pill-lav">🥣 Cereal</span><span class="pill pill-lav">🍳 Eggs</span></div>
  </section>`;
}
