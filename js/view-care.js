const COMFORT_CATS=[["music","🎵 Comfort music"],["asmr","🎧 Favourite ASMR"],["videos","📺 Favourite videos"],["games","🎮 Comfort games"],["foods","🍜 Comfort foods"],["reads","📖 Comfort reads"]];

function careGentlePlan(){ const out=[]; try{ const sl=Number((state.today||{}).sleep); if(sl&&sl<7)out.push("Go gently — last night was short 🌙"); }catch(e){}
  out.push("Drink some water 💧"); try{ const tot=foodTotals(),T=foodTargets(); if(foodToday().length&&tot.protein<T.protein)out.push("A little protein when you can 🍳"); }catch(e){}
  out.push("Spend a little time with Myla & Kieran 🐰"); out.push("Step outside for a moment 🌿"); out.push("Do one thing you enjoy ✨"); out.push("Be kind to yourself today 💗");
  return out.slice(0,6); }

function careThingsThatHelp(){ const text=[];
  try{ (state.sentinel.journalEntries||[]).forEach(e=>{ text.push(e.text||(Array.isArray(e.log)?e.log.filter(x=>x&&x.who==="Mifu").map(x=>x.text).join(" "):"")); }); }catch(e){}
  try{ (state.range||[]).forEach(r=>{ if(r&&r.notes&&r.notes.journal)text.push(r.notes.journal); }); if(state.today&&state.today.journal)text.push(state.today.journal); }catch(e){}
  const blob=" "+text.join(" ").toLowerCase()+" ";
  const cands=[["🎨 Drawing","draw|art|sketch|paint"],["🐰 Bunny time","myla|kieran|bunny|bunnies|rabbit"],["🎵 Music","music|song|playlist"],["💗 Talking with Manfu","manfu"],["🎮 Cozy games","gaming|cozy game|videogame|playing a game"],["☕ Tea","\\btea\\b"],["✨ Streaming","stream"],["📖 Journaling","journal"],["🚶 Walks","walk|fresh air|outside"]];
  return cands.map(([l,re])=>({l,n:(blob.match(new RegExp(re,"g"))||[]).length})).filter(x=>x.n>0).sort((a,b)=>b.n-a.n).slice(0,6); }

function careMemoryPull(){ try{ const idx=buildMemoryIndex().filter(m=>["milestone","quote","event"].includes(m.kind)||m.fav||(m.kind==="journal"&&(m.preview||"").length>20)); if(!idx.length)return null; return idx[(state._carePull||0)%idx.length]; }catch(e){ return null; } }

function careTinyWins(){ try{ return buildMemoryIndex().filter(m=>["milestone","event"].includes(m.kind)||m.fav).slice(0,8); }catch(e){ return []; } }
