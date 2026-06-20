/* sparkline from array with possible nulls; max scales the bars */
function spark(vals,max){
  const mx=max||Math.max(1,...vals.filter(v=>v!=null));
  return `<div class="spark">${vals.map(v=> v==null?`<span class="gap" style="height:8%"></span>`
    :`<span style="height:${Math.max(6,Math.round(v/mx*100))}%"></span>`).join("")}</div>`;
}

/* Live2D cut-prep rules, from Live2D's official docs (one part = one layer etc.) */
const LIVE2D_ITEMS=[
  ["onepart","one part = one layer (no merged bits)"],["nomask","no layer masks — bake them in"],["srgb","sRGB · 8-bit · PSD"],
  ["hair","hair split: bangs / sides / back"],["eyes","eyes split: lash / iris / white-as-mask"],["mouth","mouth split: upper lip / lower lip / inside"],
  ["overdraw","overdraw hidden skin under hair & clothes"],["neck","neck drawn up to mouth height"],["sway","swayable bits (ribbons, tails) on own layers"],["names","every layer uniquely named"],
];

/* spec cheat sheet (verified against official docs 2026-06-10) */
const ART_SPECS=[
  ["Twitch emote","PNG transparent · 28/56/112px · ≤1MB (animated: GIF 112px ≤60 frames)"],
  ["Twitch sub badge","18/36/72px · ≤25KB each"],
  ["Twitch panel","320px wide"],
  ["Discord emoji","≤256KB · renders 22px inline (48px on hover)"],
  ["Discord sticker","exactly 320×320 APNG · ≤512KB"],
  ["Discord banner","960×540 or larger (Boost L2)"],
  ["YouTube thumbnail","3840×2160 official rec (16:9) · ≤50MB — must read at 160×90; avoid bottom-right (duration badge) + bottom 15%"],
];

/* colour maths — no libraries */
function hex2hsl(hex){ hex=(hex||"#ff9ed8").replace("#",""); if(hex.length===3)hex=hex.split("").map(c=>c+c).join(""); const r=parseInt(hex.slice(0,2),16)/255,g=parseInt(hex.slice(2,4),16)/255,b=parseInt(hex.slice(4,6),16)/255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b); let h,s,l=(mx+mn)/2; if(mx===mn){h=s=0;}else{const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn); switch(mx){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;} h/=6;} return {h:h*360,s:s*100,l:l*100}; }

function genPalette(base,scheme){ const {h,s,l}=hex2hsl(base); const mk=(dh,dl,ds)=>hsl2hex(h+dh,s+(ds||0),Math.max(10,Math.min(94,l+(dl||0))));
  switch(scheme){
    case "complementary": return [mk(0,20),mk(0,4),mk(0,-12),mk(180,8),mk(180,-12)];
    case "triadic": return [mk(0,0),mk(120,6),mk(240,6),mk(120,-18),mk(0,20)];
    case "split": return [mk(0,4),mk(0,20),mk(150,2),mk(210,2),mk(180,-14)];
    case "tetradic": return [mk(0,2),mk(90,4),mk(180,2),mk(270,4),mk(0,22)];
    case "mono": return [mk(0,30),mk(0,15),mk(0,0),mk(0,-15),mk(0,-30)];
    default: return [mk(-60,6),mk(-30,3),mk(0,0),mk(30,3),mk(60,6)]; // analogous
  }
}

/* value ramp + cel-shade pair from a base colour (pure HSL math) */
function genRamp(hex){ const {h,s}=hex2hsl(hex); const out=[]; for(let i=0;i<7;i++){ const li=88-i*11; out.push(hsl2hex(h,Math.min(95,s+(i>3?6:0)),Math.max(10,li))); } return out; }

function celPair(hex){ const {h,s,l}=hex2hsl(hex); return [hsl2hex(h,s,l), hsl2hex((h+330)%360,Math.min(95,s+12),Math.max(8,l-22))]; }

/* notan/value checker: grayscale + posterize the uploaded image onto the canvas */
function artNotanPaint(){
  const A=state.art||{}; const n=A.notan; const cv=document.getElementById("notanCv"); if(!n||!cv)return;
  const steps=Math.max(2,Math.min(6,A.notanSteps||3));
  const im=new Image();
  im.onload=()=>{ try{
    const k=Math.min(1,560/Math.max(im.width||1,im.height||1)); cv.width=Math.max(1,Math.round(im.width*k)); cv.height=Math.max(1,Math.round(im.height*k));
    const ctx=cv.getContext("2d"); ctx.drawImage(im,0,0,cv.width,cv.height);
    const d=ctx.getImageData(0,0,cv.width,cv.height), p=d.data;
    for(let i=0;i<p.length;i+=4){ const g=0.2126*p[i]+0.7152*p[i+1]+0.0722*p[i+2]; const q=Math.round(Math.round((g/255)*(steps-1))/(steps-1)*255); p[i]=p[i+1]=p[i+2]=q; }
    ctx.putImageData(d,0,0);
  }catch(e){} };
  im.src=n.data;
}

/* clip an infinite line (point + direction) to the WxH box → two edge points */
function clipSeg(px,py,vx,vy,W,H){ const ts=[]; const E=0.001;
  if(Math.abs(vx)>E){ let t=(0-px)/vx,y=py+t*vy; if(y>=-E&&y<=H+E)ts.push([0,y]); t=(W-px)/vx; y=py+t*vy; if(y>=-E&&y<=H+E)ts.push([W,y]); }
  if(Math.abs(vy)>E){ let t=(0-py)/vy,x=px+t*vx; if(x>=-E&&x<=W+E)ts.push([x,0]); t=(H-py)/vy; x=px+t*vx; if(x>=-E&&x<=W+E)ts.push([x,H]); }
  return ts.slice(0,2);
}

function goldenSpiralPath(w,h){
  const k=Math.log(1.6180339887)/(Math.PI/2); const thetaMax=4*Math.PI/2, steps=260, pts=[];
  for(let i=0;i<=steps;i++){ const th=(i/steps)*thetaMax; const r=Math.exp(k*th); pts.push([r*Math.cos(th), r*Math.sin(th)]); }
  let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9; pts.forEach(p=>{mnx=Math.min(mnx,p[0]);mny=Math.min(mny,p[1]);mxx=Math.max(mxx,p[0]);mxy=Math.max(mxy,p[1]);});
  const sw=mxx-mnx, sh=mxy-mny, sc=Math.min(w/sw,h/sh)*0.98, ox=(w-sw*sc)/2-mnx*sc, oy=(h-sh*sc)/2-mny*sc;
  return "M "+pts.map(p=>(p[0]*sc+ox).toFixed(1)+" "+(p[1]*sc+oy).toFixed(1)).join(" L ");
}

/* unified drawing-guide / composition-overlay SVG. type: thirds, phi, spiral, armature, radial, iso, persp1/2/3 */
function artGuideSVG(type,W,H,opt){
  opt=opt||{}; const sk='stroke="#a9b4d8" stroke-width="1.1"', sk2='stroke="#d5dbee" stroke-width="1"', accent='stroke="#ec74bf" stroke-width="1.6"'; let L="";
  const phi1=0.381966, phi2=0.618034;
  if(type==="thirds"){ [W/3,2*W/3].forEach(x=>L+=`<line x1="${x}" y1="0" x2="${x}" y2="${H}" ${sk}/>`); [H/3,2*H/3].forEach(y=>L+=`<line x1="0" y1="${y}" x2="${W}" y2="${y}" ${sk}/>`); }
  else if(type==="phi"){ [phi1*W,phi2*W].forEach(x=>L+=`<line x1="${x}" y1="0" x2="${x}" y2="${H}" ${sk}/>`); [phi1*H,phi2*H].forEach(y=>L+=`<line x1="0" y1="${y}" x2="${W}" y2="${y}" ${sk}/>`); }
  else if(type==="spiral"){ const o=opt.orient||0, fx=(o===1||o===3)?-1:1, fy=(o===2||o===3)?-1:1; const tx=fx<0?W:0, ty=fy<0?H:0; L+=`<rect x="0" y="0" width="${W}" height="${H}" fill="none" ${sk2}/><g transform="translate(${tx} ${ty}) scale(${fx} ${fy})"><path d="${goldenSpiralPath(W,H)}" fill="none" ${accent}/></g>`; [phi1*W,phi2*W].forEach(x=>L+=`<line x1="${x}" y1="0" x2="${x}" y2="${H}" ${sk2}/>`); [phi1*H,phi2*H].forEach(y=>L+=`<line x1="0" y1="${y}" x2="${W}" y2="${y}" ${sk2}/>`); }
  else if(type==="armature"){ L+=`<line x1="0" y1="0" x2="${W}" y2="${H}" ${sk}/><line x1="${W}" y1="0" x2="0" y2="${H}" ${sk}/>`;
    const recip=(qx,qy,dx,dy)=>{ const v=[dy,-dx]; const s=clipSeg(qx,qy,v[0],v[1],W,H); if(s.length===2)L+=`<line x1="${s[0][0].toFixed(1)}" y1="${s[0][1].toFixed(1)}" x2="${s[1][0].toFixed(1)}" y2="${s[1][1].toFixed(1)}" ${sk2}/>`; };
    recip(W,0,W,H); recip(0,H,W,H); recip(0,0,-W,H); recip(W,H,-W,H);
    L+=`<line x1="${W/2}" y1="0" x2="${W/2}" y2="${H}" ${sk2}/><line x1="0" y1="${H/2}" x2="${W}" y2="${H/2}" ${sk2}/>`; }
  else if(type==="radial"){ const n=Math.max(4,Math.min(24,opt.spokes||12)), cx=W/2, cy=H/2; for(let i=0;i<n;i++){ const a=(i/n)*Math.PI*2, s=clipSeg(cx,cy,Math.cos(a),Math.sin(a),W,H); if(s.length===2)L+=`<line x1="${s[0][0].toFixed(1)}" y1="${s[0][1].toFixed(1)}" x2="${s[1][0].toFixed(1)}" y2="${s[1][1].toFixed(1)}" ${i%((n/4)|0||1)===0?sk:sk2}/>`; } const rr=Math.min(W,H)/2; for(let j=1;j<=3;j++)L+=`<circle cx="${cx}" cy="${cy}" r="${(rr/3)*j}" fill="none" ${sk2}/>`; L+=`<line x1="${cx}" y1="0" x2="${cx}" y2="${H}" ${accent}/><line x1="0" y1="${cy}" x2="${W}" y2="${cy}" ${accent}/>`; }
  else if(type==="iso"){ const g=opt.gap||38, dx=H/Math.tan(Math.PI/6);
    for(let x=-Math.ceil(dx/g)*g;x<=W+dx;x+=g){ L+=`<line x1="${x}" y1="0" x2="${x+dx}" y2="${H}" ${sk2}/>`; L+=`<line x1="${x+dx}" y1="0" x2="${x}" y2="${H}" ${sk2}/>`; }
    for(let x=0;x<=W;x+=g)L+=`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#e3e8f5" stroke-width="1"/>`; }
  else if(type==="persp1"||type==="persp2"||type==="persp3"){ const hy=H*0.5,vx=W/2;
    if(type==="persp1"){ for(let i=0;i<=24;i++){ const x=(W/24)*i; L+=`<line x1="${x}" y1="0" x2="${vx}" y2="${hy}" ${sk2}/><line x1="${x}" y1="${H}" x2="${vx}" y2="${hy}" ${sk2}/>`; } }
    else if(type==="persp2"){ const v1=-W*0.45,v2=W*1.45; for(let i=-8;i<=32;i++){ const y=(H/24)*i; L+=`<line x1="${v1}" y1="${hy}" x2="${W}" y2="${y}" ${sk2}/><line x1="${v2}" y1="${hy}" x2="0" y2="${y}" ${sk2}/>`; } for(let i=2;i<=22;i+=2){ const x=(W/24)*i; L+=`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#e3e8f5" stroke-width="1"/>`; } }
    else { const v1=-W*0.35,v2=W*1.35,v3y=H*1.7; for(let i=-6;i<=28;i++){ const y=(H/22)*i; L+=`<line x1="${v1}" y1="${hy}" x2="${W}" y2="${y}" ${sk2}/><line x1="${v2}" y1="${hy}" x2="0" y2="${y}" ${sk2}/>`; } for(let i=0;i<=24;i++){ const x=(W/24)*i; L+=`<line x1="${x}" y1="0" x2="${vx}" y2="${v3y}" ${sk2}/>`; } }
    L+=`<line x1="0" y1="${hy}" x2="${W}" y2="${hy}" ${accent} stroke-dasharray="7 5"/>`; }
  return `<svg id="artGridSvg" viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="display:block;background:#fff;max-height:420px;margin:0 auto">${L}<rect x="0.5" y="0.5" width="${W-1}" height="${H-1}" fill="none" stroke="#cdd5ea" stroke-width="1"/></svg>`;
}

/* mood-board cards */
function mbCardHTML(c){
  const pos=`left:${c.x||0}px;top:${c.y||0}px;width:${c.w||160}px;height:${c.h||160}px`;
  if(c.type==="img") return `<div class="mb-card img" data-mb="${c.id}" style="${pos};background-image:url('${esc(c.url)}')"><button class="mb-x" data-act="mbDel" data-id="${c.id}">×</button><span class="mb-rz" data-mbrz="${c.id}">◢</span></div>`;
  if(c.type==="note") return `<div class="mb-card note" data-mb="${c.id}" style="${pos}"><button class="mb-x" data-act="mbDel" data-id="${c.id}">×</button><textarea data-mbnote="${c.id}" placeholder="jot a note…">${esc(c.text||"")}</textarea><span class="mb-rz" data-mbrz="${c.id}">◢</span></div>`;
  return `<div class="mb-card swatch" data-mb="${c.id}" style="${pos};background:${esc(c.color||"#ff9ed8")}"><button class="mb-x" data-act="mbDel" data-id="${c.id}">×</button><span class="mb-hex" data-act="copyHex" data-t="${esc(c.color||"")}">${esc(c.color||"")}</span><span class="mb-rz" data-mbrz="${c.id}">◢</span></div>`;
}

function viewArt(){
  const sent=state.sentinel||{};
  if(!state.art)state.art={};
  const A=state.art;
  const log=sent.artLog||[];
  const wk=artMonday(TODAY);
  const ch=artChallengeState(sent);
  // minutes this week + sparkline (old entries without min still count as a made-art day)
  const weekMin=log.filter(e=>e.date>=wk).reduce((a,e)=>a+Number(e.min||0),0);
  const weekDays=new Set(log.filter(e=>e.date>=wk&&(e.min==null||Number(e.min)>0)).map(e=>e.date)).size;
  const days14=[]; for(let i=13;i>=0;i--){ const d=new Date(TODAY+"T00:00"); d.setDate(d.getDate()-i); const ds=d.toLocaleDateString("en-CA"); days14.push(log.filter(e=>e.date===ds).reduce((a,e)=>a+Number(e.min||0),0)); }
  const maxd=Math.max(30,...days14);
  const spark=`<div style="display:flex;align-items:flex-end;gap:3px;height:34px">${days14.map(v=>`<span style="flex:1;border-radius:3px;background:linear-gradient(180deg,var(--sakura),var(--peri));height:${v?Math.max(3,(v/maxd)*32):2}px;opacity:${v?1:.3}" title="${v} min"></span>`).join("")}</div>`;
  const reframe=A.reframe||seedPick(ART_REFRAMES,TODAY);
  const P=A.prompt||(A.prompt={subject:artRand(ART_SUBJECTS),mood:artRand(ART_MOODS),constraint:artRand(ART_CONSTRAINTS)});
  const pBase=A.pBase||"#ff9ed8", pScheme=A.pScheme||"analogous", pal=genPalette(pBase,pScheme);
  const SCHEMES=[["analogous","Analogous"],["complementary","Complement"],["triadic","Triadic"],["split","Split"],["tetradic","Tetradic"],["mono","Monochrome"]];
  const sw=arr=>`<div class="art-sw">${arr.map(c=>`<button style="background:${c}" data-act="copyHex" data-t="${c}">${c}</button>`).join("")}</div>`;
  const t=A.timer||{len:60,round:0,left:60}; const tLen=t.len||60;
  const lenSeg=[[30,"30s"],[60,"1m"],[120,"2m"],[300,"5m"]].map(([v,l])=>`<button data-act="artTimerLen" data-v="${v}" class="${tLen===v?'on':''}" ${t.on?'disabled':''}>${l}</button>`).join("");
  const GUIDES=[["thirds","Rule of thirds"],["phi","Phi grid · golden"],["spiral","Golden spiral 🐚"],["armature","Dynamic symmetry"],["radial","Radial / mirror"],["iso","Isometric"],["persp1","1-pt perspective"],["persp2","2-pt perspective"],["persp3","3-pt perspective"]];
  const GHINT={thirds:"subject on the lines, interest at the crossings",phi:"like thirds but at the golden ratio — gentler, more natural",spiral:"lead the eye along the curl; the tightest curl is your focal point 🐚",armature:"classical 'sacred geometry' — place subjects on the diagonals & their crossings",radial:"for mandalas & symmetry — pink lines are your mirror axes",iso:"true isometric grid for pixel art, rooms & objects",persp1:"one vanishing point — hallways, roads, head-on rooms",persp2:"two vanishing points — corners of buildings & objects",persp3:"three points — dramatic up/down hero shots"};
  const RATIOS=[["3:2",900,600],["1:1",720,720],["4:5",600,750],["16:9",960,540],["9:16",506,900]];
  const gType=A.gType||"thirds", gRatio=A.gRatio||"3:2", rd=RATIOS.find(r=>r[0]===gRatio)||RATIOS[0], GW=rd[1], GH=rd[2], gOrient=A.gOrient||0, gSpokes=A.gSpokes||12;
  const board=sent.artBoard||[], boardMax=!!A.boardMax;
  const boardCtrls=`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
      <input class="inp" id="mbImgUrl" placeholder="paste an image URL…" style="flex:1;min-width:140px"/>
      <button class="btn btn-grad" data-act="mbAddImage">🖼️ image</button>
      <input type="file" id="mbFile" accept="image/*" multiple style="display:none"/>
      <button class="btn" data-act="mbUpload">⤒ upload</button>
      <button class="btn" data-act="mbAddNote">📝 note</button>
      <button class="btn" data-act="mbAddColor">🎨 colour</button>
      <button class="btn" data-act="mbExport">⤓ PNG</button>
      <button class="btn" data-act="mbMax">${boardMax?'⤡ minimize':'⤢ expand'}</button></div>`;
  const boardInner=`<div class="mb-board ${boardMax?'max':''}" id="moodBoard">${board.length?board.map(mbCardHTML).join(""):`<div class="label" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;opacity:.65;width:80%">your canvas is empty ❄️<br>add an image, note, or colour below — then drag things anywhere</div>`}</div>`;
  const res=sent.artResources||DEFAULT_ART_RES;
  const resTags={reference:"🧍",colour:"🎨",perspective:"📐",learn:"📚",other:"🔗"};
  const pendingChip=A.pendingLog?`<div style="margin-top:10px;text-align:center"><button class="btn btn-grad" data-act="artLogQuick" data-m="${A.pendingLog}">🎨 log those ${A.pendingLog} min — they count!</button> <button class="ft-ic" data-act="artLogDismiss" title="skip logging">✕</button></div>`:"";
  /* art focus mode — enter play, see ONLY play (timer + prompt + log). Everything else waits. */
  if(A.focus){
    return `<div style="max-width:560px;margin:4vh auto;display:flex;flex-direction:column;gap:14px;text-align:center">
      <div class="label">🎨 art focus · just you and the page</div>
      <div class="panel" style="background:linear-gradient(135deg,#fdf0fb,#eef2fb)"><div class="art-prompt" style="background:none;border:none;padding:0;font-size:15px">${esc(reframe)}</div></div>
      <div class="panel"><div class="art-prompt">Draw <b>${esc(P.subject)}</b><br><span style="font-size:14px;color:var(--lav-deep)">${esc(P.mood)} · ${esc(P.constraint)}</span></div>
        <button class="btn" data-act="artPromptRoll" style="margin-top:10px">🎲 different prompt</button></div>
      <div class="panel">
        <div id="artStage" style="border-radius:14px;padding:16px;transition:background .6s">
          <div class="art-tim" id="artTimerDisp">${fmtClock(t.left??tLen)}</div>
          <div style="font-family:var(--display);font-size:16px;color:var(--sakura-deep);min-height:22px" id="artTimerSub">${t.on?esc(t.subject||""):"press start to begin"}</div>
          <div class="label" id="artTimerRound">${t.on?("round "+t.round):"&nbsp;"}</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;justify-content:center;margin-top:10px;flex-wrap:wrap">
          <div class="seg">${lenSeg}</div>
          ${t.on?`<button class="btn btn-grad" data-act="artTimerStop">⏹ stop</button><button class="btn" data-act="artTimerSkip">⏭ next pose</button>`:`<button class="btn btn-grad" data-act="artTimerStart">▶ start</button>`}
        </div>
        ${pendingChip}
      </div>
      <div><button class="btn" data-act="artFocusExit">← back to the full studio</button></div>
    </div>`;
  }
  /* expanded mood board keeps its own full-screen stage */
  if(boardMax) return `<div class="mb-full"><div style="display:flex;align-items:center;gap:8px"><h2 style="font-size:17px;font-family:var(--display);flex:1">🖼️ Mood board</h2></div>${boardCtrls}<div style="flex:1;min-height:0;display:flex">${boardInner}</div></div>`;
  /* === the 16 cards === */
  const heroCard=`<section class="panel art-span2" style="background:linear-gradient(135deg,#fdf0fb,#eef2fb)">
      <div class="art-prompt" style="background:none;border:none;padding:0">${esc(reframe)}</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:14px;flex-wrap:wrap">
        <button class="btn btn-grad" data-act="artStartNow">🎨 I'm making art now</button>
        <button class="btn" data-act="artReframe">↻ another reminder</button>
        <button class="btn" data-act="inspoPick" title="decision paralysis? let the fox choose">🦊 pick something for me</button>
      </div>
      <p class="soft" style="font-size:11px;text-align:center;margin:8px 0 0">the 50% rule: half your practice time can be pure play — that IS the curriculum 💗</p>
    </section>`;
  const challengesCard=`<section class="panel"><div class="card-head"><h2 style="font-size:17px">🌱 Challenges</h2><span class="label">tiny + weekly</span></div>
      <div class="card-head" style="margin:4px 0 2px"><span class="label">🌱 today's tiny challenge</span><button class="btn" data-act="artRoll" data-scope="day" style="padding:2px 8px">↻</button></div>
      <button class="hbtn ${ch.dayDone?'done':''}" data-act="artChallengeDone" data-scope="day" style="display:flex;gap:9px;align-items:center;width:100%;text-align:left"><span class="check ${ch.dayDone?'on':''}"></span><span style="font-size:13.5px">${esc(ch.dayText)}</span></button>
      <div class="card-head" style="margin:12px 0 2px"><span class="label">🌷 this week's challenge</span><button class="btn" data-act="artRoll" data-scope="week" style="padding:2px 8px">↻</button></div>
      <button class="hbtn ${ch.weekDone?'done':''}" data-act="artChallengeDone" data-scope="week" style="display:flex;gap:9px;align-items:center;width:100%;text-align:left"><span class="check ${ch.weekDone?'on':''}"></span><span style="font-size:13.5px">${esc(ch.weekText)}</span></button>
    </section>`;
  const promptCard=`<section class="panel"><div class="card-head"><h2 style="font-size:17px">🎲 Draw-this prompt</h2><button class="btn btn-grad" data-act="artPromptRoll">↻ roll a new one</button></div>
      <div class="art-prompt">Draw <b>${esc(P.subject)}</b><br><span style="font-size:14px;color:var(--lav-deep)">${esc(P.mood)} · ${esc(P.constraint)}</span></div>
      ${P.fromIdea?`<div class="label" style="text-align:center;margin-top:6px">💡 from your own ideas dump — past-you had taste</div>`:""}
    </section>`;
  const minutesCard=`<section class="panel"><div class="card-head"><h2 style="font-size:17px">⏱️ Art minutes</h2><span class="label">every minute counts — even 5</span></div>
      <div style="display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap">
        <div><div class="num" style="font-size:30px;font-family:var(--display);color:var(--sakura-deep)">${weekMin}<span style="font-size:14px"> min</span></div><div class="label">💗 this week · ${weekDays} day${weekDays===1?'':'s'} of play</div></div>
        <div class="grow" style="min-width:180px">${spark}<div class="label" style="margin-top:2px">last 14 days</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center">
        <span class="label">log</span>
        <button class="btn" data-act="artLogQuick" data-m="15">+15</button>
        <button class="btn" data-act="artLogQuick" data-m="30">+30</button>
        <button class="btn" data-act="artLogQuick" data-m="60">+60</button>
        <input class="inp" id="artMin" type="number" placeholder="min" style="width:80px"/>
        <input class="inp" id="artNote" placeholder="what did you make? (optional)" style="flex:1;min-width:140px"/>
        <button class="btn btn-grad" data-act="artLogMin">＋ log</button>
      </div>
      ${log.length?`<details class="acc" style="margin-top:8px"><summary>📜 art rhythm (${log.length} entries)</summary><div class="acc-body">${log.slice(-20).reverse().map(a=>`<div class="listrow"><span class="grow" style="font-size:12px">${fmtDate(a.date)}${a.min?` · ${a.min} min`:""}${a.note?" · "+esc(a.note):""}</span></div>`).join("")}</div></details>`:""}
    </section>`;
  const timerCard=`<section class="panel"><div class="card-head"><h2 style="font-size:17px">⏲️ Practice timer</h2><div style="display:flex;gap:8px;align-items:center"><button class="btn" data-act="artFocusEnter" title="hide everything except play">⛶ focus</button><span class="label">gesture / warm-ups</span></div></div>
      <div id="artStage" style="border-radius:14px;padding:16px;text-align:center;transition:background .6s">
        <div class="art-tim" id="artTimerDisp">${fmtClock(t.left??tLen)}</div>
        <div style="font-family:var(--display);font-size:16px;color:var(--sakura-deep);min-height:22px" id="artTimerSub">${t.on?esc(t.subject||""):"press start to begin"}</div>
        <div class="label" id="artTimerRound">${t.on?("round "+t.round):"&nbsp;"}</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;justify-content:center;margin-top:10px;flex-wrap:wrap">
        <div class="seg">${lenSeg}</div>
        ${t.on?`<button class="btn btn-grad" data-act="artTimerStop">⏹ stop</button><button class="btn" data-act="artTimerSkip">⏭ next pose</button>`:`<button class="btn btn-grad" data-act="artTimerStart">▶ start</button>`}
      </div>
      ${pendingChip}
    </section>`;
  const cnt=sent.artCount||{label:"heads",n:0,goal:100};
  const cPct=Math.min(1,(cnt.n||0)/(cnt.goal||100)), cDash=(cPct*213.6).toFixed(1);
  const headsCard=`<section class="panel"><div class="card-head"><h2 style="font-size:17px">💯 100 ${esc(cnt.label)}</h2><button class="btn" data-act="artCountEdit" style="padding:2px 9px">✎</button></div>
      ${A.countEdit?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><input class="inp" id="cnt_label" value="${esc(cnt.label)}" placeholder="heads / hands / eyes…" style="flex:1;min-width:100px"/><input class="inp num" id="cnt_goal" type="number" value="${cnt.goal||100}" style="width:80px"/><button class="btn btn-grad" data-act="artCountSave">💾</button><button class="btn" data-act="artCountReset" style="color:var(--sakura-deep)">↺ restart at 0</button></div>`:""}
      <div style="display:flex;gap:16px;align-items:center;justify-content:center;flex-wrap:wrap">
        <svg width="86" height="86" viewBox="0 0 86 86"><circle cx="43" cy="43" r="34" fill="none" stroke="#eef0fa" stroke-width="9"/><circle cx="43" cy="43" r="34" fill="none" stroke="url(#artCntG)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${cDash} 213.6" transform="rotate(-90 43 43)"/><defs><linearGradient id="artCntG"><stop offset="0%" stop-color="#758ac6"/><stop offset="100%" stop-color="#ff9ed8"/></linearGradient></defs><text x="43" y="40" text-anchor="middle" style="font-size:17px;font-weight:700;fill:var(--ink)">${cnt.n||0}</text><text x="43" y="56" text-anchor="middle" style="font-size:10px;fill:#9b96b6">of ${cnt.goal||100}</text></svg>
        <button class="btn btn-grad" data-act="artCountInc" style="font-size:15px;padding:10px 18px">＋1 ${esc(cnt.label.replace(/s$/,""))}</button>
      </div>
      <p class="soft" style="font-size:10.5px;text-align:center;margin:7px 0 0">5–10 min each, no deadline — the pile grows when it grows 💗</p>
    </section>`;
  const ideasCard=`<section class="panel"><div class="card-head"><h2 style="font-size:17px">💡 Ideas dump</h2><span class="pill pill-lav">${(sent.artIdeas||[]).length} idea${(sent.artIdeas||[]).length===1?"":"s"}</span></div>
      <div style="display:flex;gap:8px;margin-bottom:12px"><input class="inp" id="ideaText" placeholder="that piece I suddenly want to draw…"/><button class="btn btn-grad" data-act="artIdeaAdd">＋ park it</button></div>
      ${(sent.artIdeas||[]).length?`<div class="idea-grid">${(sent.artIdeas||[]).slice().reverse().map((i,ix)=>{const cols2=["#fff3c9","#ffe1ee","#e7defb","#dcf4ea","#ffe7d6"];return `<div class="idea-card" style="background:${cols2[ix%5]};transform:rotate(${ix%2?0.8:-0.8}deg)">${esc(i.text)}<div class="ic-tools"><button class="ft-ic" data-act="artIdeaToBoard" data-id="${i.id}" title="pin to mood board">📌</button><button class="ft-ic" data-act="artIdeaDel" data-id="${i.id}" style="color:var(--sakura-deep)">🗑</button></div></div>`;}).join("")}</div>`:`<p class="soft" style="font-size:12px;margin:0">Every "ooh I should draw that" lands here as a sticky — no more losing them. 📌 pins one to the mood board. 🌸</p>`}
    </section>`;
  const vault=(sent.inspoVault||[]); const picked=state.inspoPicked;
  const inspoCard=`<section class="panel art-span2"><div class="card-head"><h2 style="font-size:17px">✨ Inspiration vault</h2><div style="display:flex;gap:8px;align-items:center"><span class="pill pill-sak">${vault.filter(s2=>!s2.done).length} to try · ${vault.filter(s2=>s2.done).length} done</span></div></div>
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <input class="inp" id="inspoText" placeholder="an idea, a vibe, why it sparked you…" style="flex:2;min-width:150px" value="${esc((state.inspoDraft||{}).text||'')}"/>
        <input class="inp" id="inspoUrl" placeholder="link (tweet, trend, artwork…)" style="flex:2;min-width:140px" value="${esc((state.inspoDraft||{}).url||'')}"/>
        <label class="btn" style="cursor:pointer" title="add a reference image">🖼️<input type="file" id="artFile" accept="image/*" style="display:none"></label>
        <button class="btn btn-grad" data-act="inspoAdd">＋ save</button>
      </div>
      ${vault.length?`<div class="inspo-grid">${vault.slice().reverse().map(s2=>{let host="link";try{host=new URL(s2.url).hostname.replace("www.","");}catch(e){} const isImg=s2.img||/\.(png|jpe?g|gif|webp)(\?|$)/i.test(s2.url||"");
        const thumb=s2.img?`style="background-image:url('${esc(s2.img)}')"`:(isImg&&s2.url?`style="background-image:url('${esc(s2.url)}')"`:"");
        return `<div class="inspo-card ${s2.done?'done':''}" ${picked===s2.id?'style="outline:2.5px solid var(--sakura);outline-offset:2px;border-radius:14px"':""}>
          ${s2.url?`<a href="${esc(s2.url)}" target="_blank" rel="noopener"><div class="inspo-thumb" ${thumb}>${isImg?"":`<img src="https://www.google.com/s2/favicons?domain=${esc(host)}&sz=64" style="width:34px;height:34px;border-radius:9px" data-hide-on-error/>`}</div></a>`:`<div class="inspo-thumb" ${thumb}>${isImg?"":"💡"}</div>`}
          <div class="inspo-body">
            ${s2.url?`<a href="${esc(s2.url)}" target="_blank" rel="noopener" style="font-size:12px;font-weight:700;color:var(--lav-deep);text-decoration:none">${esc(host)} ↗</a>`:""}
            ${s2.text?`<div class="soft" style="font-size:11.5px;${s2.done?'text-decoration:line-through':''}">${esc(s2.text)}</div>`:""}
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto"><button class="chiptog ${s2.done?'on':''}" data-act="inspoDone" data-v="${s2.id}" style="font-size:10.5px;padding:3px 9px">${s2.done?'✓ tried it!':'mark tried'}</button><button class="ft-ic" data-act="inspoDel" data-v="${s2.id}" style="color:var(--sakura-deep)">🗑</button></div>
          </div>
        </div>`;}).join("")}</div>`:`<p class="soft" style="font-size:12px;margin:0">Drop a link or idea — cards with images show the picture. Stops things living in 47 open tabs. 💗</p>`}
    </section>`;
  const em=A.emote;
  const chk=`background:repeating-conic-gradient(#e9e6f4 0 25%,#ffffff 0 50%);background-size:14px 14px`;
  const emRow=(bg,fg,label,sizes,inline)=>`<div style="background:${bg};border-radius:10px;padding:9px 11px;margin-top:6px">
        <div style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;color:${fg}88;margin-bottom:5px">${label}</div>
        ${inline?`<div style="font-size:13px;color:${fg};display:flex;align-items:center;gap:5px;flex-wrap:wrap"><b style="color:#a970ff">mifu</b>: omg <img src="${em?em.data:""}" style="width:${inline}px;height:${inline}px;object-fit:contain"/> so cute!!</div>`:""}
        <div style="display:flex;gap:12px;align-items:flex-end;margin-top:7px">${sizes.map(s2=>`<div style="text-align:center"><img src="${em?em.data:""}" style="width:${s2}px;height:${s2}px;object-fit:contain"/><div style="font-size:9.5px;color:${fg}88;margin-top:2px">${s2}px</div></div>`).join("")}</div>
      </div>`;
  const kb=em?Math.max(1,Math.round(em.size/1024)):0;
  const sizePill=(lim,name)=>em?`<span class="pill ${kb<=lim?'pill-mint':''}" ${kb>lim?'style="background:#fde4e4;color:#c0566a"':''}>${name}: ${kb<=lim?"✓":"✗"} ${kb}KB / ${lim>=1024?(lim/1024)+"MB":lim+"KB"}</span>`:"";
  const emoteCard=`<section class="panel"><div class="card-head"><h2 style="font-size:17px">🟣 Emote previewer</h2>${em?`<button class="btn" data-act="artEmoteClear">✕ clear</button>`:`<span class="label">chat-size reality check</span>`}</div>
      <input type="file" id="emoteFile" accept="image/png,image/gif,image/webp" style="display:none"/>
      ${em?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">${sizePill(1024,"Twitch emote")}${sizePill(256,"Discord emoji")}${sizePill(25,"sub badge")}</div>
        ${emRow("#18181b","#efeff1","Twitch · dark",[112,56,28],28)}
        ${emRow("#313338","#dbdee1","Discord · dark",[48,22],22)}
        ${emRow("#ffffff;border:1px solid var(--line)","#1f1633","light mode",[56,28],28)}
        <div style="${chk};border-radius:10px;padding:9px 11px;margin-top:6px"><div style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;color:#9b96b6;margin-bottom:5px">transparency check</div><img src="${em.data}" style="width:72px;height:72px;object-fit:contain"/></div>`
      :`<p class="soft" style="font-size:11.5px;margin:0 0 8px">Upload a PNG → see it at real chat sizes (Twitch, Discord, light) with size-limit checks. 💗</p>
        <button class="btn btn-grad" data-act="artEmotePick">🖼 choose a PNG</button>`}
    </section>`;
  const nSteps=Math.max(2,Math.min(6,A.notanSteps||3));
  const valueCard=`<section class="panel"><div class="card-head"><h2 style="font-size:17px">◐ Value checker</h2>${A.notan?`<button class="btn" data-act="artNotanClear">✕ clear</button>`:`<span class="label">squint, but scientific</span>`}</div>
      <input type="file" id="notanFile" accept="image/*" style="display:none"/>
      <p class="soft" style="font-size:11.5px;margin:0 0 8px">Drop your WIP in → collapses to ${A.notan?nSteps:"2–6"} values. If it reads here, it reads anywhere. 🌗</p>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn ${A.notan?'':'btn-grad'}" data-act="artNotanPick">🖼 ${A.notan?"different image":"choose your WIP"}</button>
        <span class="label">values</span><div class="seg">${[2,3,4,5,6].map(v=>`<button data-act="artNotanSteps" data-v="${v}" class="${nSteps===v?'on':''}">${v}</button>`).join("")}</div>
      </div>
      ${A.notan?`<canvas id="notanCv" style="max-width:100%;border-radius:10px;margin-top:10px;border:1px solid var(--line)"></canvas>`:""}
    </section>`;
  const paletteCard=`<section class="panel art-span2"><div class="card-head"><h2 style="font-size:17px">🎨 Palette & ramps</h2></div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
        <label class="art-chip">base <input type="color" id="artBase" value="${pBase}" style="width:34px;height:24px;border:none;background:none;padding:0;cursor:pointer"/></label>
        <button class="btn" data-act="artPaletteRoll">🎲 random base</button>
        <div class="seg" style="flex-wrap:wrap">${SCHEMES.map(([v,l])=>`<button data-act="artPaletteScheme" data-v="${v}" class="${pScheme===v?'on':''}">${l}</button>`).join("")}</div>
      </div>
      ${sw(pal)}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px"><span class="label">🃏 limited-palette challenge — draw with only these</span><button class="btn btn-grad" data-act="artLimited">🎲 roll 3</button></div>
      ${A.limited?sw(A.limited):`<p class="soft" style="font-size:11.5px;margin:6px 0 0">Draw with only these three — great for learning colour mixing.</p>`}
      <div class="label" style="margin:10px 0 4px">🪜 value ramp <span class="muted">· light → dark</span></div>
      ${sw(genRamp(pBase))}
      <div class="label" style="margin:8px 0 4px">⛅ cel pair <span class="muted">· base + hue-shifted shadow</span></div>
      ${sw(celPair(pBase))}
      <p class="soft" style="font-size:11px;margin:7px 0 0">Tap any swatch to copy its hex 💗</p>
    </section>`;
  const specsCard=`<section class="panel"><div class="card-head"><h2 style="font-size:17px">📏 Platform specs</h2><span class="label">verified 2026-06-10</span></div>
      ${ART_SPECS.map(([n2,s2])=>`<div style="padding:6px 0;border-bottom:1px solid var(--line)"><div style="font-size:12.5px;font-weight:700">${n2}</div><div class="soft" style="font-size:11.5px;margin-top:1px">${s2}</div></div>`).join("")}
      <p class="soft" style="font-size:11px;margin:8px 0 0">the blogs are stale — these came from the official docs 🌸</p>
    </section>`;
  const l2=sent.live2dCheck||{name:"",items:{}};
  const l2n=LIVE2D_ITEMS.filter(([k])=>l2.items&&l2.items[k]).length;
  const live2dCard=`<section class="panel"><div class="card-head"><h2 style="font-size:17px">🧩 Live2D cut prep</h2><div style="display:flex;gap:8px;align-items:center"><span class="pill ${l2n===LIVE2D_ITEMS.length?'pill-mint':'pill-lav'}">${l2n}/${LIVE2D_ITEMS.length}</span><button class="btn" data-act="l2dReset" title="new model — clear all ticks">↺</button></div></div>
      <input class="inp" id="l2dName" value="${esc(l2.name||"")}" placeholder="model / outfit name (optional)…" style="margin-bottom:8px"/>
      ${LIVE2D_ITEMS.map(([k,l])=>`<button class="hbtn ${l2.items&&l2.items[k]?'done':''}" data-act="l2dToggle" data-k="${k}" style="display:flex;gap:9px;align-items:center;width:100%;margin-top:5px;text-align:left"><span class="check ${l2.items&&l2.items[k]?'on':''}"></span><span style="font-size:12.5px">${l}</span></button>`).join("")}
    </section>`;
  const guidesCard=`<section class="panel art-span2"><div class="card-head"><h2 style="font-size:17px">📐 Drawing guides & overlays</h2></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
        <select class="inp" id="artGType" style="width:auto">${GUIDES.map(([v,l])=>`<option value="${v}" ${gType===v?'selected':''}>${l}</option>`).join("")}</select>
        <span class="label">canvas</span><div class="seg">${RATIOS.map(r=>`<button data-act="artGRatio" data-v="${r[0]}" class="${gRatio===r[0]?'on':''}">${r[0]}</button>`).join("")}</div>
        ${gType==="spiral"?`<button class="btn" data-act="artGOrient">↻ flip</button>`:""}
        ${gType==="radial"?`<label class="art-chip">spokes <input type="range" id="artSpokes" min="4" max="24" value="${gSpokes}" style="width:84px"></label>`:""}
      </div>
      <div class="art-grid-wrap">${artGuideSVG(gType,GW,GH,{orient:gOrient,spokes:gSpokes})}</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn" data-act="artGridDownload">⤓ download SVG</button><span class="soft" style="font-size:11.5px;align-self:center">${GHINT[gType]||"drop it under your canvas as a guide layer"}</span></div>
    </section>`;
  const boardCard=`<section class="panel art-span2"><div class="card-head"><h2 style="font-size:17px">🖼️ Mood board</h2><span class="label">drag anything anywhere · auto-saves</span></div>
      ${boardCtrls}
      ${boardInner}
      <p class="soft" style="font-size:11.5px;margin:10px 0 0">Paste links, notes, colour chips — drag into layout, grab ◢ to resize. ❄️</p>
    </section>`;
  const packNew=ART_PACK.filter(p=>!res.some(r=>r.url===p.url)).length;
  const libraryCard=`<section class="panel art-span2"><div class="card-head"><h2 style="font-size:17px">📚 Tools & tutorials</h2>${packNew?`<button class="btn btn-grad" data-act="artResPack" title="adds the research-verified pose/anatomy/colour links — all free, all checked alive">🌟 add research pack (${packNew})</button>`:`<span class="label">your own library</span>`}</div>
      <div id="artResList" style="display:flex;flex-direction:column;gap:6px">${res.map(r=>`<div data-resid="${r.id}" style="display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid var(--line);background:#fff;border-radius:8px"><span class="res-grip" data-resgrip title="drag to reorder">⠿</span><span>${resTags[r.tag]||"🔗"}</span><a href="${esc(r.url)}" target="_blank" rel="noopener" class="grow" style="font-size:13px;color:var(--lav-deep);text-decoration:none">${esc(r.title)} ↗</a><button class="ft-ic" data-act="artResDel" data-id="${r.id}" style="color:var(--sakura-deep)">🗑</button></div>`).join("")}</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <input class="inp" id="artResTitle" placeholder="title" style="flex:1;min-width:120px"/>
        <input class="inp" id="artResUrl" placeholder="https://…" style="flex:1;min-width:140px"/>
        <select class="inp" id="artResTag" style="width:auto">${Object.keys(resTags).map(k=>`<option value="${k}">${resTags[k]} ${k}</option>`).join("")}</select>
        <button class="btn btn-grad" data-act="artResAdd">＋ save</button>
      </div>
    </section>`;
  return `<div class="page" style="max-width:1100px">
    <div style="display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <h2 style="font-size:22px;font-family:var(--display)">🎨 Art studio</h2>
      <span class="label">🌸 just for you · play is allowed</span>
    </div>
    <div class="art-cols">${heroCard}${challengesCard}${promptCard}${minutesCard}${timerCard}${headsCard}${ideasCard}${inspoCard}${emoteCard}${valueCard}${paletteCard}${specsCard}${live2dCard}${guidesCard}${boardCard}${libraryCard}</div>
  </div>`;
}
