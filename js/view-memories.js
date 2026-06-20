const MEM_STOP=new Set("the a an i my me you we us to of in on at and or for with about was were is are be been did do does day find show me when where what our this that it i'm".split(" "));

function searchMemories(q, idx){
  q=String(q||"").toLowerCase().trim(); if(!q)return [];
  const terms=q.split(/[^a-z0-9]+/).filter(t=>t&&!MEM_STOP.has(t)); if(!terms.length)return [];
  const res=[];
  (idx||buildMemoryIndex()).forEach(m=>{ const hay=((m.title||"")+" "+(m.preview||"")+" "+(m.tags||[]).join(" ")+" "+(m.people||[]).join(" ")).toLowerCase();
    const hits=terms.filter(t=>hay.includes(t)); if(hits.length) res.push({...m, _score:hits.length, reason:"mentions "+hits.join(", ")}); });
  res.sort((a,b)=> b._score-a._score || (a.date<b.date?1:-1));
  return res.slice(0,40);
}

function mediaGallerySection(){
  if(state.media===undefined){ return `<section class="panel"><div class="card-head"><span class="label">📸 Media library</span></div><p class="soft" style="font-size:12.5px;margin:0">${UI.spinner({label:"loading your photos…"})}</p></section>`; }
  const PEOPLE=["myla","kieran","together","manfu"];
  let lib=(state.media||[]); if(state.memBunny) lib=lib.filter(memIsBunny);
  const tile=m=>`<div class="md-tile">
    <img src="${esc(m.url)}" alt="${esc(m.caption||'photo')}" loading="lazy" data-act="mediaView" data-id="${esc(m.id)}">
    <div class="md-tools"><button class="x" data-act="mediaFav" data-id="${esc(m.id)}" title="favourite" aria-label="favourite">${m.fav?"⭐":"☆"}</button><button class="x" data-act="mediaDel" data-id="${esc(m.id)}" title="delete" aria-label="delete">✕</button></div>
    <input class="md-cap" data-act="noop" data-id="${esc(m.id)}" value="${esc(m.caption||'')}" placeholder="caption…" maxlength="160">
    <div class="md-people">${PEOPLE.map(p=>`<button class="md-pchip ${(m.people||[]).includes(p)?'on':''}" data-act="mediaTag" data-id="${esc(m.id)}" data-p="${p}">${p}</button>`).join("")}</div>
  </div>`;
  return `<section class="panel">
    <div class="card-head"><span class="label">📸 Media library</span><span class="soft" style="font-size:11px">${(state.media||[]).length}/${MEDIA_CAP}</span></div>
    <p class="soft" style="font-size:12px;margin:0 0 10px">Upload once, use everywhere — photos here flow into Search, your Timeline, and (soon) Journal &amp; Care. Tag who's in each one. 🐰</p>
    <div style="margin-bottom:10px"><label class="btn btn-grad" for="mediaFile" style="cursor:pointer">⬆️ Upload photos</label><input type="file" id="mediaFile" accept="image/*" multiple style="display:none"></div>
    ${lib.length?`<div class="md-grid">${lib.slice().reverse().map(tile).join("")}</div>`:`<p class="soft" style="font-size:12.5px;margin:0">${state.memBunny?"No bunny photos yet — tag some with Myla or Kieran.":"No photos yet — upload your first memory. ❄️"}</p>`}
  </section>`;
}

function viewMemories(){
  const idx=buildMemoryIndex();
  const q=state.memQuery||"", bunny=!!state.memBunny;
  let list=bunny?idx.filter(memIsBunny):idx;
  const favs=list.filter(m=>m.fav);
  const results=q?(bunny?searchMemories(q,list):searchMemories(q,idx)):null;
  const tl=list.filter(m=>m.fav||["milestone","event","quote","memcard"].includes(m.kind));
  const groups={}; tl.forEach(m=>{ const ym=(m.date||"").slice(0,7); (groups[ym]=groups[ym]||[]).push(m); });
  const ymKeys=Object.keys(groups).sort().reverse();
  const row=m=>`<div class="listrow"><span style="font-size:15px;flex:0 0 auto">${MEM_ICON[m.kind]||"✨"}</span><span class="grow" style="min-width:0"><b style="font-size:12.5px">${esc(m.title||"")}</b> <span class="soft" style="font-size:11px">· ${esc(fmtDate(m.date))}</span><div class="soft" style="font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.preview||"")}</div>${m.reason?`<div class="soft" style="font-size:10px">${esc(m.reason)}</div>`:""}</span><button class="x" data-act="memFav" data-id="${esc(m.id)}" aria-label="favourite" title="favourite">${m.fav?"⭐":"☆"}</button>${m.kind==="photo"?`<button class="btn" data-act="mediaView" data-id="${esc(m.mediaId||"")}">view</button>`:(m.source?`<button class="btn" data-act="memOpen" data-page="${esc(m.source.page)}" data-ref="${esc(m.source.refId||"")}">open</button>`:"")}</div>`;
  return `<div class="page"><section class="panel">
    <div class="card-head"><h2 style="font-size:17px">✨ Memories</h2><span class="soft" style="font-size:11px">${idx.length} remembered</span></div>
    <p class="soft" style="font-size:12px;margin:0 0 10px">Everything worth keeping in one place — search it, pin it, and walk your timeline. Photos &amp; a full media library come in the next update. ❄️</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px">
      <input class="inp" id="memSearchInput" placeholder="search your memories… (house approval, Myla, nausea)" style="flex:1;min-width:200px" value="${esc(q)}">
      <button class="btn btn-grad" data-act="memSearch">🔎 Search</button>
      ${q?`<button class="btn" data-act="memSearchClear">clear</button>`:""}
      <button class="btn ${bunny?'btn-grad':''}" data-act="memBunny" aria-pressed="${bunny}">🐰 Bunny</button>
    </div>
    <p class="soft" style="font-size:11px;margin:0">For fuzzy, feeling-based searches (“days I felt less nauseous”), ask Kiko — he searches by meaning.</p>
  </section>
  ${results?`<section class="panel"><div class="sec-label">🔎 Results for “${esc(q)}”</div>${results.length?results.map(row).join(""):`<p class="soft" style="font-size:12.5px;margin:0">No matches — try fewer words, or ask Kiko to search by meaning.</p>`}</section>`:""}
  ${mediaGallerySection()}
  ${favs.length?`<section class="panel"><div class="sec-label">⭐ Favourites</div>${favs.slice(0,30).map(row).join("")}</section>`:""}
  <section class="panel"><div class="sec-label">🕒 ${bunny?"Bunny timeline":"Life timeline"}</div>
    ${ymKeys.length?ymKeys.map(ym=>`<div style="margin-top:10px"><div class="label">${esc(memMonthLabel(ym))}</div>${groups[ym].map(row).join("")}</div>`).join(""):`<p class="soft" style="font-size:12.5px;margin:0">Your timeline fills in as you journal, log weigh-ins, and mark special days. ❄️</p>`}
  </section></div>`;
}
