function sponsorInsights(s){
  const out=[];
  if(s.lastContact){ const d=daysBetween(s.lastContact,TODAY); if(d>=5&&["waiting","negotiating","lead"].includes(s.status)) out.push(`No reply in ${d} days`); }
  const dl=s.deadline||s.due; if(dl&&!["completed","paid","declined","ghosted","done"].includes(s.status)){ const d=daysBetween(TODAY,dl); if(d<0) out.push("Deadline passed"); else if(d<=3) out.push(`Deadline in ${d} day${d===1?"":"s"}`); }
  if(["completed","invoiced"].includes(s.status)) out.push("Awaiting payment");
  return out;
}

function viewSponsors(){
  const sp=(state.sentinel.sponsors||[]).slice().sort((a,b)=>String(b.lastContact||b.date||"").localeCompare(String(a.lastContact||a.date||"")));
  const add=`<section class="panel"><div class="card-head"><h2 style="font-size:18px">🤝 Sponsors</h2></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Track brand conversations, deadlines, rates and how each one felt — so nothing slips and you never undercharge.</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><input class="inp" id="spName" placeholder="company / brand" style="flex:1;min-width:140px"><input class="inp" id="spGame" placeholder="game / product" style="flex:1;min-width:120px"></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><input class="inp" id="spRate" placeholder="rate (e.g. €800)" style="flex:1;min-width:100px"><input class="inp" id="spDeadline" type="date" style="flex:1;min-width:120px"></div>
    <input class="inp" id="spNote" placeholder="contact / note (optional)" style="margin-top:6px"><button class="btn btn-grad" data-act="sponsorAdd" style="margin-top:6px">Add sponsor 🤝</button></section>`;
  const list=`<section class="panel"><div class="card-head"><span class="label">📇 Pipeline</span><span class="pill pill-gray">${sp.length}</span></div>
    ${sp.length?sp.map(s=>{ const ins=sponsorInsights(s);
      return `<div class="soft-card" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b style="font-size:13.5px">${esc(s.name)}</b><button class="x" data-act="sponsorDel" data-id="${esc(s.id)}" aria-label="delete">✕</button></div>
      <div class="soft" style="font-size:11px">${s.game?esc(s.game)+" · ":""}${s.rate?esc(s.rate)+" · ":""}${(s.deadline||s.due)?"due "+esc(fmtDate(s.deadline||s.due)):""}</div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap"><button class="chiptog on" data-act="sponsorStatus" data-id="${esc(s.id)}" title="tap to advance status">${esc(s.status||"lead")} ▸</button>${ins.map(i=>`<span class="pill ${/passed|payment|No reply/.test(i)?'pill-sak':'pill-peri'}">${esc(i)}</span>`).join("")}</div>
      ${s.notes?`<div class="soft" style="font-size:11.5px;margin-top:6px">${esc(s.notes)}</div>`:""}</div>`; }).join(""):UI.empty({emoji:"🤝",title:"No sponsors yet",msg:"Add a brand when the first email lands — then Kiko watches deadlines and unpaid invoices for you."})}</section>`;
  return `<div class="page">${add}${list}</div>${DISCLAIMER}`;
}

/* ===== Content Graveyard (Idea #8) ===== */
const IDEA_CATS=["Stream","Video","Short","Song","Cover","Merch","Outfit","Model","Art","Collab","Event","Other"];

function viewIdeas(){
  const ideas=(state.sentinel.ideas||[]).slice().reverse();
  const add=`<section class="panel"><div class="card-head"><h2 style="font-size:18px">💡 Idea graveyard</h2></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">A calm place for "ooh, someday" ideas — <i>not</i> a to-do list. They rest here until they're useful, so none ever turn into pressure. 🌱</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><input class="inp" id="ideaTitle" placeholder="the idea…" style="flex:1;min-width:160px"><select class="inp" id="ideaCat" style="max-width:120px">${IDEA_CATS.map(c=>`<option>${c}</option>`).join("")}</select></div>
    <button class="btn btn-grad" data-act="ideaAdd" style="margin-top:6px">Bury it gently 🌱</button></section>`;
  const list=`<section class="panel"><div class="card-head"><span class="label">🪦 Resting ideas</span><span class="pill pill-gray">${ideas.length}</span></div>
    ${ideas.length?ideas.map(i=>`<div class="listrow"><span style="flex:0 0 auto" aria-hidden="true">💡</span><span class="grow" style="min-width:0"><b style="font-size:12.5px">${esc(i.title)}</b> ${i.cat?`<span class="soft" style="font-size:11px">· ${esc(i.cat)}</span>`:""}</span><button class="chiptog on" data-act="ideaStatus" data-id="${esc(i.id)}" title="tap to change">${esc(i.status||"graveyard")}</button><button class="x" data-act="ideaDel" data-id="${esc(i.id)}" aria-label="delete">✕</button></div>`).join(""):UI.empty({emoji:"💡",title:"No ideas resting yet",msg:"Every cool thought you can't act on right now — drop it here so it's safe."})}</section>`;
  return `<div class="page">${add}${list}</div>${DISCLAIMER}`;
}


/* ===================== OPTIMIZE (calls the "ai" Edge Function brain) ===================== */
const OPT_FORMATS=[["long","Long form"],["short","Short form"]];
   /* X/Twitter posts moved to the 📝 Script tab */
const OPT_PLATFORMS=[["youtube","YouTube"],["tiktok","TikTok"],["instagram","Instagram"],["twitter","X"],["twitch","Twitch"]];

function scoreColor(s){ return s>=75?'#3a9d83':s>=50?'var(--peri-deep)':'var(--sakura-deep)'; }

function copyBtn(k,label){ return `<button class="btn" data-act="copyText" data-k="${k}" style="margin-top:6px">📋 ${label||'Copy'}</button>`; }

function hashChips(hs){ const arr=Array.isArray(hs)?hs:[]; return `<div class="chiprow">${arr.map((h,i)=>`<span class="pill ${i===0?'pill-mint':i<3?'pill-lav':'pill-sak'}">${esc(h)}</span>`).join("")}</div>`; }

function optVideoForm(){
  return `<p class="soft" style="font-size:12px;margin:6px 0 10px">Title score, stronger titles, tags, 1S/2M/2L hashtags, and a full description — in your voice. ✨</p>
  <div class="field"><div class="label">Title / working title</div><input class="inp" id="ovTitle" placeholder="e.g. I tried VTubing on a $0 budget"></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div class="field"><div class="label">Format</div><select class="inp" id="ovFormat">${OPT_FORMATS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></div>
    <div class="field"><div class="label">Platform</div><select class="inp" id="ovPlatform">${OPT_PLATFORMS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></div>
  </div>
  <div class="field"><div class="label">What's it about? (topic, hook, key points)</div><textarea class="inp" id="ovAbout" placeholder="the angle, what happens, who it's for…"></textarea></div>
  <button class="btn btn-grad" data-act="optVideo" ${OPT.busy==='video'?'disabled':''}>${OPT.busy==='video'?'optimizing…':'✨ optimize'}</button>`;
}

function optStreamForm(){
  return `<p class="soft" style="font-size:12px;margin:6px 0 10px">Stream titles (your style + the game), a ready-to-paste description with your links, YouTube + Twitch + X titles, tags & hashtags. ✨</p>
  <div class="field"><div class="label">Game / stream focus</div><input class="inp" id="osGame" placeholder="e.g. Elden Ring DLC — first deathless attempt"></div>
  <div class="field"><div class="label">Drops?</div><div class="chiprow"><button class="chiptog ${OPT.drops?'on':''}" data-act="optDrops"><span>${OPT.drops?'✓':'＋'}</span>Drops active</button></div></div>
  <div class="field"><div class="label">Anything special this stream? (vibe, goal, milestone)</div><textarea class="inp" id="osSpecial" placeholder="subathon, first playthrough, chill vibes, charity goal…"></textarea></div>
  <button class="btn btn-grad" data-act="optStream" ${OPT.busy==='stream'?'disabled':''}>${OPT.busy==='stream'?'optimizing…':'✨ optimize'}</button>`;
}

function titleList(arr){ return `<ul style="padding-left:18px;font-size:13px;margin:4px 0">${(arr||[]).map(t=>`<li style="margin:5px 0">${esc(t)}</li>`).join("")}</ul>`; }

function optVideoResult(r){
  return `<section class="panel">
    <div class="card-head"><span class="label">✨ Optimized</span>${r.titleScore!=null?`<span class="pill" style="background:#eef0fa;color:${scoreColor(r.titleScore)};font-size:13px">Title score ${r.titleScore}/100</span>`:''}</div>
    ${r.titleWhy?`<p class="soft" style="font-size:12px;margin:0 0 8px">${esc(r.titleWhy)}</p>`:''}
    <div class="label" style="margin:6px 0 2px">Stronger titles ${copyBtn('vtitles','copy')}</div>${titleList(r.titles)}
    <div class="label" style="margin:12px 0 2px">YouTube tags ${copyBtn('vtags','copy')}</div><div class="soft" style="font-size:12px">${(r.tags||[]).map(esc).join(", ")}</div>
    <div class="label" style="margin:12px 0 4px">Hashtags ${copyBtn('vhash','copy')}</div>${hashChips(r.hashtags)}
    <div class="label" style="margin:12px 0 4px">Description ${copyBtn('vdesc','copy')}</div>
    <div class="soft-card" style="font-size:12px;white-space:pre-wrap">${esc(r.description||"")}</div>
  </section>`;
}

function optStreamResult(r){
  return `<section class="panel">
    <div class="label" style="margin-bottom:2px">✨ YouTube stream titles ${copyBtn('stitles','copy')}</div>${titleList(r.titles)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
      <div class="soft-card"><div class="label">Twitch title ${copyBtn('twitch','copy')}</div><div style="font-size:12.5px;margin-top:4px">${esc(r.twitchTitle||"")}</div></div>
      <div class="soft-card"><div class="label">X / Twitter title ${copyBtn('twitter','copy')}</div><div style="font-size:12.5px;margin-top:4px">${esc(r.twitterTitle||"")}</div></div>
    </div>
    <div class="label" style="margin:12px 0 4px">Hashtags ${copyBtn('shash','copy')}</div>${hashChips(r.hashtags)}
    <div class="label" style="margin:12px 0 2px">Tags ${copyBtn('stags','copy')}</div><div class="soft" style="font-size:12px">${(r.tags||[]).map(esc).join(", ")}</div>
    ${(r.tips||[]).length?`<div class="label" style="margin:12px 0 4px">Tips 🦊</div><ul style="padding-left:18px;font-size:12.5px">${(r.tips||[]).map(t=>`<li style="margin:4px 0">${esc(t)}</li>`).join("")}</ul>`:''}
    <div class="label" style="margin:12px 0 4px">Description ${copyBtn('sdesc','copy')}</div>
    <div class="soft-card" style="font-size:12px;white-space:pre-wrap">${esc(r.description||"")}</div>
  </section>`;
}

function channelBlock(sn){
  return `<div class="soft-card" style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px">
      <div><div class="label">Subscribers</div><div class="bignum">${Number(sn.subscribers||0).toLocaleString()}</div></div>
      <div><div class="label">Total views</div><div class="bignum">${Number(sn.views||0).toLocaleString()}</div></div>
      <div><div class="label">Videos</div><div class="bignum">${Number(sn.videos||0).toLocaleString()}</div></div></div>
    ${(sn.recent||[]).length?`<div style="margin-top:10px">${sn.recent.map(r=>`<div class="listrow"><span class="grow" style="font-size:12.5px">${esc(r.title)}</span><span class="soft" style="font-size:11px">${r.views!=null?Number(r.views).toLocaleString()+' views':''}</span></div>`).join("")}</div>`:''}`;
}

function thumbCard(){
  const d=OPT.thumbData, t=OPT.thumb;
  return `<section class="panel">
    <div class="card-head"><span class="label">🖼️ Thumbnail check</span>${t&&t.score!=null?`<span class="pill" style="background:#eef0fa;color:${scoreColor(t.score)};font-size:13px">${t.score}/100</span>`:''}</div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Upload your thumbnail — see it at real feed sizes and get a vidIQ-style click read.</p>
    <input class="inp" type="file" id="thumbFile" accept="image/*">
    ${d?`<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;margin-top:12px">
        <div><img src="${d}" style="width:246px;height:138px;object-fit:cover;border-radius:10px;border:1px solid var(--line)"><div class="label" style="text-align:center;margin-top:3px">grid 246×138</div></div>
        <div><img src="${d}" style="width:168px;height:94px;object-fit:cover;border-radius:8px;border:1px solid var(--line)"><div class="label" style="text-align:center;margin-top:3px">sidebar 168×94</div></div>
        <div><img src="${d}" style="width:120px;height:68px;object-fit:cover;border-radius:7px;border:1px solid var(--line)"><div class="label" style="text-align:center;margin-top:3px">mobile 120×68</div></div>
      </div>
      <button class="btn btn-grad" data-act="thumbCheck" style="margin-top:10px" ${OPT.busy==='thumb'?'disabled':''}>${OPT.busy==='thumb'?'reading…':'📈 check thumbnail'}</button>`:''}
    ${t?`<div class="soft-card" style="margin-top:10px;font-size:12.5px">
        ${t.verdict?`<p style="margin:0 0 6px">${esc(t.verdict)}</p>`:''}
        ${(t.strengths||[]).length?`<div class="label" style="color:#3a9d83">Working</div><ul style="padding-left:16px;margin:2px 0 8px">${t.strengths.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:''}
        ${(t.improvements||[]).length?`<div class="label" style="color:var(--sakura-deep)">Tweak</div><ul style="padding-left:16px;margin:2px 0">${t.improvements.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:''}
      </div>`:''}
  </section>`;
}

const CREATOR_SUBS=[["tools","✍️ Tools"],["sponsors","🤝 Sponsors"],["ideas","💡 Ideas"]];

function viewCreator(){
  const sub=["tools","sponsors","ideas"].includes(state.creatorSub)?state.creatorSub:"tools";
  if(sub==="sponsors") return subNav(CREATOR_SUBS,sub,"creatorSub")+stripDisc(viewSponsors())+DISCLAIMER;
  if(sub==="ideas") return subNav(CREATOR_SUBS,sub,"creatorSub")+stripDisc(viewIdeas())+DISCLAIMER;
  return subNav(CREATOR_SUBS,sub,"creatorSub")+stripDisc(viewOptimize())+stripDisc(viewFormalizer())+stripDisc(viewScript())+DISCLAIMER;
}

function viewFormalizer(){
  const tb=state.tb||(state.tb={spice:3,steps:null,task:"",fText:"",fTone:"professional",fOut:"",eTask:"",eOut:null,cText:"",groups:null,tText:"",tOut:null,busy:""});
  return `<div class="page">
  <section class="panel">
    <div class="card-head"><h2 style="font-size:18px">🪄 Formalizer</h2><span class="pill pill-gray">reword anything</span></div>
    <p class="soft" style="font-size:12px;margin:0">Paste what you want to say, pick a tone — comes back polished. Great for emails, DMs, captions, anything that needs a second pass. ${DEMO?"<b>(needs live mode)</b>":""}</p>
  </section>
  <section class="panel">
    <div class="label" style="margin-bottom:6px">🪄 Formalizer</div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Paste what you want to say; pick how it should sound.</p>
    <textarea class="inp" id="tbFText" rows="3" placeholder="the raw words…">${esc(tb.fText||'')}</textarea>
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      <select class="inp" id="tbFTone" style="max-width:200px">${["professional","friendly","sociable","more formal","shorter","softer / kinder","more assertive","easier to read"].map(t=>`<option ${tb.fTone===t?'selected':''}>${t}</option>`).join("")}</select>
      <button class="btn btn-grad" data-act="tbFormal" ${tb.busy==='formal'?'disabled':''}>${tb.busy==='formal'?'…':'rewrite'}</button>
    </div>
    ${tb.fOut?`<div class="soft-card" style="margin-top:8px;font-size:12.5px;white-space:pre-wrap">${esc(tb.fOut)}</div><button class="btn" data-act="tbCopyF" style="margin-top:6px">📋 copy</button>`:""}
  </section>
  </div>`;
}

function viewScript(){
  const sent=state.sentinel||{}; const saved=sent.scripts||[];
  if(!state.script) state.script={kind:"short",title:"",references:"",raw:"",out:null};
  const s=state.script, kind=s.kind||"short"; const tw=kind==="twitter";
  const kindWord=tw?"X post":kind==="long"?"long-form":"short";
  const bodyLabel=tw?"post":"script";
  const seg=`<div class="seg">${[["short","📲 Short"],["long","🎬 Long-form"],["twitter","🐦 X / Twitter"]].map(([k,l])=>`<button data-act="scriptKind" data-v="${k}" class="${kind===k?'on':''}">${l}</button>`).join("")}</div>`;
  const out=s.out;
  const chars=tw&&out&&out.script?String(out.script).length:0;
  const outHtml = out ? `<div class="soft-card" style="margin-top:10px">
      ${(out.hooks&&out.hooks.length)?`<div class="label">${tw?'opening-line options':'hook options'}</div>${out.hooks.map(h=>`<div style="display:flex;gap:8px;align-items:flex-start;margin:4px 0"><span class="grow" style="font-size:12.5px">${esc(h)}</span><button class="btn" data-act="scrCopyHook" data-t="${esc(h)}" style="padding:2px 8px">copy</button></div>`).join("")}`:""}
      <div class="label" style="margin-top:10px">${bodyLabel}${out.title?` · <span class="soft">${esc(out.title)}</span>`:""}${tw?` <span class="soft" style="font-weight:500">· ${chars} char${chars===1?'':'s'}${chars>280?' (thread)':''}</span>`:""} <button class="btn" data-act="scrCopyScript" style="padding:2px 8px;margin-left:6px">copy ${bodyLabel}</button></div>
      <div id="scrScript" style="white-space:pre-wrap;font-size:13px;line-height:1.6;border:1px solid var(--line);border-radius:10px;padding:12px;margin-top:4px;background:#fff">${esc(out.script||"")}</div>
      ${out.cta?`<div class="label" style="margin-top:8px">${tw?'closing line':'CTA'}</div><div class="soft" style="font-size:12.5px">${esc(out.cta)}</div>`:""}
    </div>` : "";
  const kpill=k=>k==='long'?['pill-lav','LF']:k==='twitter'?['pill-ice','X']:['pill-sak','SF'];
  const savedHtml = saved.length?`<section class="panel"><div class="card-head"><span class="label">📁 saved drafts</span></div>${saved.slice().reverse().map(d=>{const kp=kpill(d.kind);return `<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)"><span class="pill ${kp[0]}">${kp[1]}</span><span class="grow" style="font-size:12.5px">${esc(d.title||"(untitled)")}</span><button class="btn" data-act="loadScript" data-id="${d.id}">open</button><button class="x" data-act="delScript" data-id="${d.id}" title="remove">✕</button></div>`;}).join("")}</section>`:"";
  return `<div class="page">
    <section class="panel">
      <div class="card-head"><h2 style="font-size:18px">📝 Script writer</h2>${seg}</div>
      <p class="soft" style="font-size:12.5px;margin:0 0 12px">${tw?"Talk out your idea (or paste notes) — I'll shape it into an X/Twitter post in your voice, with a few opening-line options. ❄️🦊":`Drop in your research, then just talk it out — I'll shape your own words into your ${kindWord} format, in your voice. ❄️🦊`}${DEMO?` <b>(Deploy the ai function &amp; turn demo off to format.)</b>`:""}</p>
      <div class="label">Working title <span class="soft">· optional</span></div>
      <input class="inp" id="scrTitle" value="${esc(s.title||"")}" placeholder="${tw?'e.g. one year of being a little snowfox 🦊':'e.g. I tried cozy gaming on a $0 setup'}" />
      <div class="label" style="margin-top:10px">Research / references <span class="soft">· paste facts, links, notes</span></div>
      <textarea class="inp" id="scrRefs" rows="4" placeholder="paste your sources, bullet points, key facts…">${esc(s.references||"")}</textarea>
      <div class="card-head" style="margin-top:12px"><div class="label">🎙️ Your words <span class="soft">· talk, it types for you</span></div>
        <div style="display:flex;gap:6px"><button class="btn" id="recBtn" data-act="recToggle">🎙️ Record</button><button class="btn" data-act="scrClearRaw">clear</button></div></div>
      <textarea class="inp" id="scrRaw" rows="7" placeholder="${tw?'what do you want to post about? talk or type — I’ll tidy it. ❄️':'hit Record and just talk — or type. Don’t worry about being tidy, I’ll clean it up. ❄️'}">${esc(s.raw||"")}</textarea>
      <div id="recHint" class="soft" style="font-size:11.5px;margin-top:4px"></div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-grad" data-act="formatScript">✨ ${tw?'write the X post':'format into a '+kindWord+' script'}</button><button class="btn" data-act="saveScript">💾 save draft</button><button class="btn" data-act="teachVoice" data-v="${tw?'twitter':'script'}" title="paste your own writing so it sounds like you">🎓 teach my voice${voiceExamples(tw?'twitter':'script').length?` · ${voiceExamples(tw?'twitter':'script').length}`:""}</button></div>
      <div id="scrOut">${outHtml}</div>
    </section>
    ${savedHtml}
  </div>`;
}

function descTemplateCard(){
  const t=descTemplate(); const custom=!!(state.sentinel&&state.sentinel.descTemplate);
  return `<section class="panel">
    <div class="card-head"><span class="label">📋 Description template</span>${custom?'<span class="pill pill-mint">saved ✓</span>':'<span class="pill pill-gray">default</span>'}</div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Your standing block for long-form YouTube — dividers, your GamerSupps code, all your links. Kiko pastes this onto the end of every description it writes, exactly as typed. ✨</p>
    <textarea class="inp" id="descTmpl" rows="9" style="font-size:12px;line-height:1.5" placeholder="━━━━━━━━━━━━━━━\n💜 GamerSupps — code MIFUYU for 10% off: …\n\n🔗 my links:\n▸ Twitch: …">${esc(t)}</textarea>
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
      <button class="btn btn-grad" data-act="saveDescTemplate">💾 save template</button>
      ${custom?`<button class="btn" data-act="resetDescTemplate" title="go back to the built-in default">↺ reset to default</button>`:''}
    </div>
  </section>`;
}

function viewOptimize(){
  const m=OPT.mode;
  return `<div class="page">
  <section class="panel">
    <div class="card-head"><h2 style="font-size:18px">🔴 ${m==='video'?'Video':'Stream'} optimization</h2>
      <div class="seg">
        <button data-act="optMode" data-v="video" class="${m==='video'?'on':''}">📹 Video</button>
        <button data-act="optMode" data-v="stream" class="${m==='stream'?'on':''}">🔴 Livestream</button>
      </div></div>
    ${m==='video'?optVideoForm():optStreamForm()}
    <details class="acc" style="margin-top:10px"><summary>➕ Paste VidIQ data (optional)</summary><div class="acc-body">
      <p class="soft" style="font-size:11px;margin:0 0 6px">VidIQ has no public API, so the engine bakes vidIQ-style judgment into the prompt. If you looked something up in VidIQ, paste it here and it'll be folded in.</p>
      <textarea class="inp" id="optVidiq" placeholder="paste VidIQ keyword/score data… (optional)"></textarea></div></details>
    ${DEMO?`<div class="disc" style="margin-top:10px">${CONFIG.creator.snow}<span>The AI helper runs in <b>live</b> mode once the <b>ai</b> Edge Function is deployed (deploy-ai.ps1). ❄️</span></div>`:''}
  </section>
  ${OPT.err&&!DEMO?`<div class="disc">⚠️<span>${esc(OPT.err)}</span></div>`:''}
  ${m==='video'?(OPT.video?optVideoResult(OPT.video):''):(OPT.stream?optStreamResult(OPT.stream):'')}
  ${thumbCard()}
  ${descTemplateCard()}
  <details class="acc" style="margin-top:14px"><summary>📺 Channel snapshot</summary><div class="acc-body">
    <button class="btn btn-grad" data-act="optChannel" ${OPT.busy==='channel'?'disabled':''}>${OPT.busy==='channel'?'…':'Pull '+esc(CONFIG.youtube.handle)}</button>
    ${OPT.channel?channelBlock(OPT.channel):''}
  </div></details>
  ${DISCLAIMER}</div>`;
}
