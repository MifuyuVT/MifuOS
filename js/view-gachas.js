function parsePulse(text){
  const t=stripMd(text||"");
  const clean=(s)=>s.replace(/\(https?:\/\/[^)]+\)/g,'').replace(/https?:\/\/\S+/g,'').replace(/\([^)]{2,60}\.[a-z]{2,6}[^)]*\)/gi,'').replace(/\s{2,}/g,' ').trim();
  const line=(key)=>{ const m=t.match(new RegExp('^'+key+':\\s*(.+)','im')); return m?clean(m[1]).slice(0,400):null; };
  return { hype:line('HYPE'), drama:line('DRAMA'), idea:line('IDEA'), detail:(t.match(/^DETAIL:\s*([\s\S]+)/im)||[])[1]||null };
}

function renderMd(t){
  return String(t==null?"":t)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener" style="color:var(--lav-deep);word-break:break-all">$1</a>')
    .replace(/\*\*\*(.+?)\*\*\*/g,"<b><em>$1</em></b>")
    .replace(/\*\*(.+?)\*\*/g,"<b>$1</b>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/\n/g,"<br>");
}

/* gacha history helpers */
function gachaByDate(){ const m={}; (state.range||[]).forEach(r=>{ if(r&&r.date) m[r.date]=r.notes||{}; }); m[TODAY]=state.today||{}; return m; }

function gachaCheckedOn(map,gid,d){ const n=map[d]; return !!(n&&n.gacha&&n.gacha[gid]); }

function gachaStreak(gid){ const map=gachaByDate(); let s=0; const start=gachaCheckedOn(map,gid,TODAY)?0:1;
  for(let i=start;i<200;i++){ if(gachaCheckedOn(map,gid,dayAgo(-i))) s++; else break; } return s; }

function gachaWeekMonday(off){ const m=mondayOf(new Date(TODAY+"T00:00")); m.setDate(m.getDate()+(off||0)*7); return m; }

function gachaWkDoneThisWeek(gid){ const wk=state.sentinel.gachaWkDone||{}; const mon=mondayOf(new Date(TODAY+"T00:00")).toLocaleDateString("en-CA"); return wk[gid]===mon; }

function cardGacha(){
  const list=gachaList(), checks=state.today.gacha||{}, ed=!!state.gachaEdit;
  const weeklies=gachaWeeklies();
  const done=list.filter(g=>checks[g.id]).length, goal=list.length;
  // TODAY — compact chips
  const todayRows=list.length?`<div class="chiprow gt-today">${list.map(g=>`<button class="chiptog ${checks[g.id]?'on':''}" data-act="gachaToggle" data-v="${g.id}"><span>${checks[g.id]?'✓':'•'}</span>${esc(g.name)}${ed?`<span class="x" data-act="delGacha" data-v="${g.id}" style="margin-left:2px">✕</span>`:''}</button>`).join("")}</div>`:'<p class="soft" style="font-size:11.5px;margin:2px 0">No games yet — tap edit to add one.</p>';
  // STREAKS — compact inline chips (name + 🔥count), not full-width rows
  const streaks=list.map(g=>({name:g.name,s:gachaStreak(g.id)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);
  const streakRows=streaks.length?`<div class="gt-streaks">${streaks.map(x=>`<span class="gt-schip">${esc(x.name)} <b>🔥${x.s}</b></span>`).join("")}</div>`:'<p class="soft" style="font-size:11.5px;margin:2px 0">Check a game two days in a row to start a streak 🔥</p>';
  // WEEKLIES (simple toggles, not part of the streak)
  const wkRows=weeklies.length?`<div class="chiprow gt-wk">${weeklies.map(g=>`<button class="chiptog ${gachaWkDoneThisWeek(g.id)?'on':''}" data-act="gachaWkToggle" data-v="${g.id}"><span>${gachaWkDoneThisWeek(g.id)?'✓':'•'}</span>${esc(g.name)}${ed?`<span class="x" data-act="delGachaWk" data-v="${g.id}" style="margin-left:2px">✕</span>`:''}</button>`).join("")}</div>`:`<p class="soft" style="font-size:11.5px;margin:2px 0">No weeklies yet${ed?' — add one below':''}.</p>`;
  // LAST 7 DAYS grid (dailies only)
  const off=state.gachaWeek||0, mon=gachaWeekMonday(off); const map=gachaByDate();
  const days=[]; for(let i=0;i<7;i++){ const d=new Date(mon); d.setDate(d.getDate()+i); days.push(d.toLocaleDateString("en-CA")); }
  const dowH=["M","T","W","T","F","S","S"];
  const gridHead=`<div class="gt-grow gt-ghead"><span class="gt-glabel"></span>${dowH.map((x,i)=>{ const isToday=days[i]===TODAY; return `<span class="gt-cell${isToday?' gt-today-col':''}">${isToday?`<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:var(--sakura);color:#fff;font-size:10px;font-weight:700;line-height:1">${x}</span>`:x}</span>`; }).join("")}</div>`;
  const gridBody=list.map(g=>`<div class="gt-grow"><span class="gt-glabel">${esc(g.name)}</span>${days.map(d=>{ const ok=gachaCheckedOn(map,g.id,d); const past=d<TODAY;
    // checked → green ✓ · genuinely missed PAST day → red ✗ · today-not-yet or future → neutral gray ○
    const cls=ok?'ok':(past?'no':'pend'), ch=ok?'✓':(past?'✗':'○');
    return `<span class="gt-cell ${cls}">${ch}</span>`; }).join("")}</div>`).join("");
  const wkLabel=off===0?"This week":off===-1?"Last week":`${fmtDate(days[0])} – ${fmtDate(days[6])}`;
  return `<section class="panel">
    <div class="card-head"><span class="label">🎮 Gacha tracker</span><span style="display:flex;gap:6px;align-items:center"><span class="pill ${done===goal&&goal?'pill-mint':'pill-gray'}">${done}/${goal}${done===goal&&goal?' ✦':''}</span><button class="btn" data-act="gachaEdit">${ed?'done':'edit'}</button></span></div>
    <div class="gt-sec">Today</div>
    <div class="gt-list">${todayRows}</div>
    <div class="gt-complete">${done} / ${goal} complete</div>
    ${ed?`<div class="gt-add"><input class="inp" id="gachaInput" placeholder="add a daily game…" value="${esc(state.gachaDraft||'')}"><button class="btn btn-grad" data-act="addGachaUI">add</button></div>`:''}
    <div class="gt-div"></div>
    <div class="gt-sec">🔥 Streaks</div>
    <div>${streakRows}</div>
    <div class="gt-div"></div>
    <div class="gt-grid-top"><span class="gt-sec" style="margin:0">Last 7 days</span><span class="gt-nav"><button class="btn" data-act="gachaWeek" data-d="-1" title="previous week">‹</button><span class="gt-wklabel">${wkLabel}</span><button class="btn" data-act="gachaWeek" data-d="1" title="next week"${off>=0?' disabled':''}>›</button></span></div>
    <div class="gt-grid">${gridHead}${gridBody}</div>
  </section>`;
}

/* ===================== 🎮 GACHAS PAGE ===================== */
function gachaKeywords(g){
  const n=(g.name||'').toLowerCase().replace(/\W+/g,'');
  const MAP={nikki:['nikki','infinity','infinitynikki'],r1999:['r1999','reverse1999','reverse','1999'],arknights:['arknights','endfield'],zzz:['zzz','zenless'],nte:['nte','neverness'],wuwa:['wuwa','wuthering'],genshin:['genshin'],hsr:['hsr','starrail','honkai']};
  for(const [k,kws] of Object.entries(MAP)) if(n.includes(k)||kws.some(w=>n.includes(w))) return kws;
  return [n.slice(0,6)||g.id];
}

function gachaEventsForGame(g,allEvs){
  const kws=gachaKeywords(g);
  return allEvs.filter(e=>{ const t=(e.title||'').toLowerCase().replace(/\W+/g,''); return kws.some(kw=>t.includes(kw)); }).sort((a,b)=>a.days-b.days);
}

function gachaEventType(e){
  if(e.src==='gamestream'||/livestream|showcase|preview|reveal|special program/i.test(e.title||'')) return 'Livestream';
  if(/banner|rerun|\bwarp\b|light cone|\bphase\s*[12]\b|\([^)]+\/[^)]+\)|\bwish\b|\bconvene\b|\bresonator\b|w-engine|signal search|\bheadhunting\b|wishing well|stylist.?s choice|invitation of fates|resonance vision|\bglimpse\b|\bpull\b|\bsummon\b|\bgacha\b|tempered blade|bygone reminiscence/i.test(e.title||'')) return 'Banner';
  if(/\breset\b/i.test(e.title||'')) return 'Reset';
  if(/\bupdate\b|\bversion\b|\bpatch\b/i.test(e.title||'')) return 'Update';
  return 'Event';
}

function evDaysChip(days, dateStr){
  // always show "In X days" for future events instead of vague "This Month"
  let label, cls;
  if(days<=0){ label="Today"; cls="tier-today"; }
  else if(days===1){ label="Tomorrow"; cls="tier-tmrw"; }
  else{ label=`In ${days} day${days===1?'':'s'}`; cls=days<=7?"tier-week":"tier-month"; }
  return `<span class="pill ${cls}" style="flex:none;white-space:nowrap">${label}${dateStr?" • "+dateStr:""}</span>`;
}

const EV_TYPE_ICONS={"Livestream":"📺","Banner":"✦","Update":"🔄","Event":"🎉","Reset":"🔁"};

function evTypeLabel(e){
  const t=gachaEventType(e);
  const icon=EV_TYPE_ICONS[t]||"🎮";
  return `<span style="font-size:9px;font-weight:800;letter-spacing:.05em;color:var(--muted);margin-right:3px">${icon} ${t.toUpperCase()}</span>`;
}

function gachaGameCard(g,checks,weeklies,allEvs){
  const done=!!checks[g.id], streak=gachaStreak(g.id);
  const evs=gachaEventsForGame(g,allEvs);
  const isEnding=e=>/\bend\b|\bends\b|\bclos|\breset\b/i.test(e.title||'');
  const ending=evs.filter(e=>e.days>=0&&e.days<=14&&isEnding(e)).slice(0,3);
  const coming=evs.filter(e=>e.days>=0&&!isEnding(e)).slice(0,3);
  const wkDone=gachaWkDoneThisWeek(g.id);
  const evRow=(e,orange)=>`<div class="kn-row" style="font-size:11.5px;align-items:flex-start;gap:6px">
    <span class="kn-dot" style="margin-top:4px;flex:none${orange?';background:#e07030':''}"></span>
    <span class="grow" style="line-height:1.4">${evTypeLabel(e)}${esc(e.title)}</span>
    ${evDaysChip(e.days,fmtDate(orange?(e.endDate||e.date):e.date))}
  </div>`;
  return `<div class="gg-card ${done?'gg-done':''}">
    <div class="gg-head">
      <span class="gg-name">${esc(g.name)}</span>
      <div style="display:flex;gap:5px;align-items:center">
        ${streak>0?`<span class="gg-streak">🔥${streak}</span>`:''}
        ${done?`<span class="pill pill-mint" style="font-size:10px;padding:2px 7px">done</span>`:''}
      </div>
    </div>
    <button class="chiptog ${wkDone?'on':''}" data-act="gachaWkToggle" data-v="${g.id}" style="width:100%;justify-content:center;margin-bottom:8px"><span>${wkDone?'✓':'◦'}</span>${wkDone?'Weekly done':'Mark weekly done'}</button>
    ${ending.length?`<div class="sec-label" style="margin:8px 0 4px;font-size:9px;color:#e07030">⏳ Ending soon</div>${ending.map(e=>evRow(e,true)).join('')}`:''}
    ${coming.length?`<div class="sec-label" style="margin:8px 0 4px;font-size:9px">🌟 Coming up</div>${evRow(coming[0],false)}${coming.length>1?`<button class="soft" data-act="gachaCardMore" data-gid="${g.id}" style="font-size:11px;background:none;border:none;cursor:pointer;padding:3px 0;display:block;color:var(--muted)">${(state.gachaExpanded||{})[g.id]?'▾':'▸'} ${coming.length-1} more future update${coming.length-1===1?'':'s'}</button>${(state.gachaExpanded||{})[g.id]?coming.slice(1).map(e=>evRow(e,false)).join(''):''}`:''}`:''}
  </div>`;
}

function cardGachaCommunityPulse(){
  const list=gachaList();
  const vault=(state.sentinel.sparkVault||[]).slice().reverse();
  const gameIdeas=list.map(g=>{
    const match=vault.find(v=>v.gid===g.id);
    return{g,idea:match};
  });
  return `<section class="panel" style="margin-top:16px">
    <div class="card-head"><span class="label">🦊 Community Pulse</span><button id="pulseAllBtn" class="btn btn-grad" data-act="refreshAllCommunityPulse">🔄 refresh all</button></div>
    <div style="background:rgba(180,150,220,.09);border-radius:10px;padding:10px 12px;margin-bottom:14px;display:flex;gap:10px;align-items:flex-start">
      <span style="font-size:18px;flex:none">🦊</span>
      <p style="font-size:12px;line-height:1.5;margin:0">Kiko searches Reddit, YouTube &amp; Twitter live to find real community buzz — hype, drama, and a content idea per game. Hit research to refresh any game instantly, no chat needed!</p>
    </div>
    ${gameIdeas.map(({g,idea})=>`<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:0.5px solid var(--line)">
      <div style="width:34px;height:34px;border-radius:50%;background:#EEEDFE;color:#534AB7;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1.2">${esc(g.name.slice(0,5))}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;margin-bottom:4px">${esc(g.name)}</div>
        ${idea?(()=>{
          const expanded=(state.pulseExpanded||{})[g.id];
          const p=parsePulse(idea.text);
          const collapsed=`<div style="font-size:12px;line-height:1.7;margin:0 0 4px">
            ${p.hype?`<div><span style="font-weight:700;color:var(--peri-deep)">Hype:</span> ${esc(p.hype)}</div>`:""}
            ${p.drama?`<div><span style="font-weight:700;color:var(--sakura-deep)">Drama:</span> ${esc(p.drama)}</div>`:""}
            ${p.idea?`<div><span style="font-weight:700;color:var(--mint)">Idea:</span> ${esc(p.idea)}</div>`:""}
          </div>`;
          const expandedView=`<div style="display:flex;flex-direction:column;gap:8px;margin:0 0 6px">
            ${p.hype?`<div style="background:rgba(100,120,220,.10);border-left:3px solid var(--peri-deep);border-radius:0 8px 8px 0;padding:8px 10px">
              <div style="font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--peri-deep);margin-bottom:3px">✨ HYPE</div>
              <div style="font-size:12.5px;line-height:1.6">${renderMd(p.hype)}</div>
            </div>`:""}
            ${p.drama?(()=>{ const quiet=/no significant|nothing significant|no major|no notable|no drama|no controversy|no backlash|no frustration/i.test(p.drama); return `<div style="background:${quiet?'rgba(150,150,150,.05)':'rgba(220,100,130,.10)'};border-left:3px solid ${quiet?'rgba(150,150,150,.2)':'var(--sakura-deep)'};border-radius:0 8px 8px 0;padding:8px 10px">
              <div style="font-size:10px;font-weight:800;letter-spacing:.06em;color:${quiet?'var(--muted)':'var(--sakura-deep)'};margin-bottom:3px">🔥 DRAMA</div>
              <div style="font-size:12px;line-height:1.6;color:${quiet?'var(--muted)':''}">${quiet?'No significant drama in the past 14 days.':renderMd(p.drama)}</div>
            </div>`; })():""}
            ${p.idea?`<div style="background:rgba(100,200,160,.10);border-left:3px solid var(--mint);border-radius:0 8px 8px 0;padding:8px 10px">
              <div style="font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--mint);margin-bottom:3px">💡 STREAM IDEA</div>
              <div style="font-size:12.5px;line-height:1.6">${renderMd(p.idea)}</div>
            </div>`:""}
            ${p.detail?`<div style="background:rgba(150,150,150,.07);border-radius:8px;padding:8px 10px">
              <div style="font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--muted);margin-bottom:4px">📋 FULL BREAKDOWN</div>
              <div style="font-size:12px;line-height:1.7;color:var(--text)">${renderMd(p.detail)}</div>
            </div>`:""}
          </div>`;
          return `${expanded?expandedView:collapsed}
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span style="font-size:10px;color:var(--muted)">Saved ${fmtDate(idea.date)}</span>
            <button class="x" style="font-size:11px;color:var(--lav-deep)" data-act="togglePulseExpand" data-gid="${esc(g.id)}">${expanded?"▲ collapse":"▼ read more"}</button>
          </div>`;
        })():`<p style="font-size:12px;color:var(--muted);margin:0">No data yet — hit research! 🦊</p>`}
      </div>
      <button id="pulse-btn-${esc(g.id)}" class="btn" style="font-size:11px;flex-shrink:0" data-act="refreshCommunityPulse" data-id="${esc(g.id)}">research</button>
    </div>`).join('')}
    <p style="font-size:10.5px;color:var(--muted);text-align:center;margin-top:12px;line-height:1.4">Kiko connects to the internet live — results are always fresh, never pre-programmed. 🌐</p>
  </section>`;
}
