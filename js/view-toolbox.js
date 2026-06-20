function viewToolbox(){
  const tb=state.tb||(state.tb={spice:3,steps:null,task:"",fText:"",fTone:"professional",fOut:"",eTask:"",eOut:null,cText:"",groups:null,tText:"",tOut:null,busy:""});
  const chili=n=>`<span class="spice">${[1,2,3,4,5].map(i=>`<button data-act="tbSpice" data-v="${i}" class="${i<=n?'on':''}" title="${i}/5 — higher = tinier steps">🌶️</button>`).join("")}</span>`;
  const totalMin=(tb.steps||[]).reduce((a,s)=>a+(typeof s==="object"?Number(s.min||0):0),0);
  return `<div class="page">
  <section class="panel"><div class="card-head"><h2 style="font-size:18px">🧠 Brain Tools</h2><span class="pill pill-gray">focus helpers</span></div>
    <p class="soft" style="font-size:12px;margin:0">ADHD helpers for the hard parts — break it down, estimate honestly, read the room, sort your brain. ${DEMO?"<b>(needs live mode)</b>":""}</p></section>
  <div class="tb-grid">
  <section class="panel">
    <div class="card-head"><span class="label">✨ Magic breakdown</span>${chili(tb.spice)}</div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Type the scary task; get tiny steps. More 🌶️ = smaller pieces.</p>
    <div style="display:flex;gap:6px"><input class="inp" id="tbTask" placeholder="the task that won't start itself…" value="${esc(tb.task||'')}"><button class="btn btn-grad" data-act="tbBreak" ${tb.busy==='break'?'disabled':''}>${tb.busy==='break'?'…':'break it down'}</button></div>
    ${tb.steps?`<div class="tb-steps" style="margin-top:10px">${totalMin?`<div class="label" style="margin-bottom:4px">~${totalMin} min total</div>`:""}${tb.steps.map((s,i)=>`<div class="listrow"><span class="soft" style="min-width:20px;font-size:11px">${i+1}.</span><span class="grow" style="font-size:12.5px">${esc(tbStepText(s))}</span>${typeof s==="object"&&s.min?`<span class="label num">~${Number(s.min)}m</span>`:""}<button class="x" data-act="tbBreakStep" data-i="${i}" title="break this smaller">🪓</button></div>`).join("")}
      <div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-grad" data-act="tbStepsToPlanner">🗒️ add to planner</button><button class="btn" data-act="tbClear">clear</button></div></div>`:""}
  </section>
  <section class="panel">
    <div class="label" style="margin-bottom:6px">⏱️ Time estimator</div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Honest ranges — includes setup, transitions, and decision pauses.</p>
    <div style="display:flex;gap:6px"><input class="inp" id="tbETask" placeholder="how long will … actually take?" value="${esc(tb.eTask||'')}"><button class="btn btn-grad" data-act="tbEstimate" ${tb.busy==='est'?'disabled':''}>${tb.busy==='est'?'…':'estimate'}</button></div>
    ${tb.eOut?(tb.eOut.likely?`<div class="soft-card" style="margin-top:8px;font-size:12.5px">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:baseline"><span><b style="font-size:15px">${esc(tb.eOut.likely)}</b> <span class="label">realistic</span></span>${tb.eOut.bestCase?`<span class="soft">${esc(tb.eOut.bestCase)} <span class="label">if everything cooperates</span></span>`:""}</div>
        ${tb.eOut.why?`<div class="soft" style="margin-top:6px;line-height:1.5">${esc(tb.eOut.why)}</div>`:""}
        ${(tb.eOut.parts||[]).length?`<div style="margin-top:8px">${tb.eOut.parts.map(p2=>`<div style="display:flex;gap:8px;padding:2px 0;font-size:12px"><span class="grow">• ${esc(p2.text)}</span><span class="label num">~${Number(p2.min)||"?"}m</span></div>`).join("")}</div>`:""}
      </div>`:`<div class="soft-card" style="margin-top:8px;font-size:12.5px"><b>${esc(tb.eOut.estimate||"")}</b> · <span class="soft">${esc(tb.eOut.note||"")}</span></div>`):""}
  </section>
  <section class="panel">
    <div class="label" style="margin-bottom:6px">⚖️ Tone judge <span class="muted">· how does it actually read?</span></div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Paste a message you're spiralling about — RSD first-aid. 💗</p>
    <textarea class="inp" id="tbTText" rows="2" placeholder="paste the message here…">${esc(tb.tText||'')}</textarea>
    <button class="btn btn-grad" data-act="tbTone" style="margin-top:8px" ${tb.busy==='tone'?'disabled':''}>${tb.busy==='tone'?'reading the room…':'⚖️ read it for me'}</button>
    ${tb.tOut?`<div class="soft-card" style="margin-top:10px">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${(tb.tOut.vibe||[]).map(v=>`<span class="pill pill-lav">${esc(v)}</span>`).join("")}</div>
      <div style="font-size:13px;line-height:1.6">${esc(tb.tOut.read||"")}</div>
      ${tb.tOut.notSaying?`<div style="margin-top:8px;font-size:12.5px;line-height:1.55"><b class="sak">what it's NOT saying:</b> ${esc(tb.tOut.notSaying)}</div>`:""}
      ${tb.tOut.respond?`<div class="label" style="margin-top:8px">easiest healthy reply</div><div class="soft" style="font-size:12.5px">${esc(tb.tOut.respond)}</div>`:""}
    </div>`:""}
  </section>
  <section class="panel">
    <div class="label" style="margin-bottom:6px">🧠 Brain-dump compiler</div>
    <p class="soft" style="font-size:11.5px;margin:0 0 8px">Pour everything out unsorted — comes back as tidy groups.</p>
    <textarea class="inp" id="tbCText" rows="2" placeholder="everything in your head, in any order…">${esc(tb.cText||'')}</textarea>
    <button class="btn btn-grad" data-act="tbCompile" style="margin-top:8px" ${tb.busy==='compile'?'disabled':''}>${tb.busy==='compile'?'…':'sort my brain'}</button>
    ${tb.groups?`<div style="margin-top:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">${tb.groups.map((g,gi)=>`<div class="soft-card"><div class="card-head" style="margin-bottom:6px"><span class="label">${esc(g.title)}</span><button class="btn" data-act="tbGroupToPlanner" data-i="${gi}" style="padding:3px 9px;font-size:11px">🗒️ → planner</button></div>${(g.items||[]).map(it=>`<div style="font-size:12.5px;padding:2px 0">• ${esc(it)}</div>`).join("")}</div>`).join("")}</div>`:""}
  </section>
  </div>
  </div>`;
}
