const LIFE_SUBS=[["people","💗 People"],["house","🏡 Home"],["mifulore","📔 About Me"]];

function viewLife(){ const map={people:viewPeople,house:viewHouse,mifulore:viewMifuLore};
  const sub=map[state.lifeSub]?state.lifeSub:"people";
  return subNav(LIFE_SUBS,sub,"lifeSub")+stripDisc(map[sub]())+DISCLAIMER; }

function viewPeople(){
  const ppl=(state.sentinel.people||[]).slice();
  const add=`<section class="panel"><div class="card-head"><h2 style="font-size:18px">💗 Relationship garden</h2></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">The people who matter — birthdays, gift ideas, the moments you treasure. Kiko keeps the dates so you don't have to. 🌷</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><input class="inp" id="pName" placeholder="name" style="flex:1;min-width:120px"><input class="inp" id="pRel" placeholder="who they are" style="flex:1;min-width:120px"><input class="inp" id="pBday" type="date" style="flex:1;min-width:120px"></div>
    <button class="btn btn-grad" data-act="personAdd" style="margin-top:6px">Plant 🌱</button></section>`;
  const cards=ppl.length?`<section class="panel"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px">${ppl.map(p=>{ const nb=personNextBday(p.birthday);
    return `<div class="soft-card"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:15px;font-family:var(--display)">${esc(p.name)}</b><button class="x" data-act="personDel" data-id="${esc(p.id)}" aria-label="delete">✕</button></div>
    ${p.rel?`<div class="soft" style="font-size:12px">${esc(p.rel)}</div>`:""}
    ${nb!=null?`<div class="soft" style="font-size:11px;margin-top:3px">🎂 ${nb===0?"birthday today! 🎉":`in ${nb} day${nb===1?"":"s"}`}</div>`:""}
    ${p.gifts?`<div style="font-size:11.5px;margin-top:6px">🎁 ${esc(p.gifts)}</div>`:""}
    <div style="display:flex;gap:6px;margin-top:8px"><input class="inp" id="giftFor_${esc(p.id)}" placeholder="gift idea…" style="font-size:12px"><button class="btn" data-act="personGift" data-id="${esc(p.id)}" aria-label="add gift idea">＋</button></div></div>`; }).join("")}</div></section>`:`<section class="panel">${UI.empty({emoji:"💗",title:"Your garden is empty",msg:"Add Horia, Eggie, your mods and friends — birthdays, gift ideas, and the memories you want to keep."})}</section>`;
  return `<div class="page">${add}${cards}</div>${DISCLAIMER}`;
}

/* ===== Mifu Lore Database (Idea #11) ===== */
const MIFU_LORE_CATS=["Favorite","Dislike","Personality","Comfort","Aesthetic","Other"];

function viewMifuLore(){
  const lore=(state.sentinel.mifuLore||[]).slice().reverse();
  const add=`<section class="panel"><div class="card-head"><h2 style="font-size:18px">📔 About Me</h2></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">A little encyclopedia of you — favorites, dislikes, the patterns that make you <i>you</i>. The more Kiko knows, the less generic she feels. 💗</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><input class="inp" id="mlTitle" placeholder="something true about you…" style="flex:1;min-width:160px"><select class="inp" id="mlCat" style="max-width:120px">${MIFU_LORE_CATS.map(c=>`<option>${c}</option>`).join("")}</select></div>
    <button class="btn btn-grad" data-act="mifuLoreAdd" style="margin-top:6px">Add 📔</button></section>`;
  const byCat={}; lore.forEach(l=>{ (byCat[l.cat||"Other"]=byCat[l.cat||"Other"]||[]).push(l); });
  const body=lore.length?Object.entries(byCat).map(([c,arr])=>`<div style="margin-bottom:10px"><div class="label" style="margin-bottom:4px">${esc(c)}</div>${arr.map(l=>`<div class="listrow"><span style="flex:0 0 auto" aria-hidden="true">📔</span><span class="grow">${esc(l.title)}</span><button class="x" data-act="mifuLoreDel" data-id="${esc(l.id)}" aria-label="delete">✕</button></div>`).join("")}</div>`).join(""):UI.empty({emoji:"📔",title:"Nothing here yet",msg:"Add the small things — your comfort game, your ick, your hydrangea-and-stationery soul."});
  return `<div class="page">${add}<section class="panel">${body}</section></div>${DISCLAIMER}`;
}

/* ===== House Journey Timeline (Idea #10) ===== */
const HOUSE_TYPES=["viewing","application","rejection","acceptance","moving","decorating","bunny setup","memory"];

function viewHouse(){
  const log=(state.sentinel.houseLog||[]).slice().sort(cmpDate).reverse();
  const add=`<section class="panel"><div class="card-head"><h2 style="font-size:18px">🏡 Home journey</h2></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Viewings, applications, the move, first bunny zoomies in the new place — the story of building a home with Horia. 🏡</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><input class="inp" id="hsPlace" placeholder="place / nickname" style="flex:1;min-width:130px"><select class="inp" id="hsType" style="max-width:130px">${HOUSE_TYPES.map(t=>`<option>${t}</option>`).join("")}</select></div>
    <textarea class="inp" id="hsSummary" rows="2" placeholder="what happened / how it felt…" style="margin-top:6px"></textarea>
    <button class="btn btn-grad" data-act="houseAdd" style="margin-top:6px">Add to the journey 🏡</button></section>`;
  const list=`<section class="panel"><div class="card-head"><span class="label">🗺️ The journey</span><span class="pill pill-gray">${log.length}</span></div>
    ${log.length?log.map(h=>`<div class="listrow"><span style="flex:0 0 auto" aria-hidden="true">🏡</span><span class="grow" style="min-width:0"><b style="font-size:12.5px">${esc(h.place||"Home")}</b> <span class="soft" style="font-size:11px">· ${esc(fmtDate(h.date))}${h.type?` · ${esc(h.type)}`:""}</span>${h.summary?`<div style="font-size:12px">${esc(h.summary)}</div>`:""}</span><button class="x" data-act="houseDel" data-id="${esc(h.id)}" aria-label="delete">✕</button></div>`).join(""):UI.empty({emoji:"🏡",title:"The journey starts here",msg:"Save viewings, the dream house, the day you got the keys — the whole story of home."})}</section>`;
  return `<div class="page">${add}${list}</div>${DISCLAIMER}`;
}
