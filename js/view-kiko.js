/* ===================== ASK KIKO (home base) ===================== */
function viewKiko(){
  const creator=OS_MODE==="creator";
  const creatorSkills=[
    ["💌","Note for Eggie","seed","note for Eggie: "],
    ["📅","Add event","seed","add an event: "],
    ["🗒️","Add task","seed","add a task: "],
    ["🌷","Add goal","seed","add a goal: "],
    ["⏰","Remind me","seed","remind me to "],
    ["🎰","Gacha dailies","seed","did my dailies for "],
    ["🎯","Title ideas","seed","give me stream title ideas for "],
    ["🎮","Refresh games","send","refresh my game calendar now"],
    ["🧠","Remember this","seed","remember that "],
    ["📥","Park a thought","seed","park this: "],
    ["📓","Daily journal","act","startKikoJournal"],
    ["🍅","Work with me","seed","work with me on "],
    ["🔎","What's coming up","send","what's on my schedule and calendar coming up?"],
    ["🌐","Search the web","seed","search the web for "],
    ["↩️","Undo last","send","undo that"],
  ];
  const healthSkills=[
    ["⚖️","Log weight","seed","log my weight "],
    ["🍱","Log food","seed","I ate "],
    ["📅","Add event","seed","add an event: "],
    ["🗒️","Add task","seed","add a task: "],
    ["🌷","Add goal","seed","add a goal: "],
    ["⏰","Remind me","seed","remind me to "],
    ["🧠","Remember this","seed","remember that "],
    ["📥","Park a thought","seed","park this: "],
    ["📓","Daily journal","act","startKikoJournal"],
    ["🍅","Work with me","seed","work with me on "],
    ["🔎","What's coming up","send","what's on my schedule and calendar coming up?"],
    ["🌐","Search the web","seed","search the web for "],
    ["↩️","Undo last","send","undo that"],
  ];
  const skills=creator?creatorSkills:healthSkills;
  const chip=(e,l,kind,val)=> kind==="act"
    ? `<button class="kiko-skill" data-act="${val}">${e} ${l}</button>`
    : `<button class="kiko-skill" data-act="kikoSkill" data-${kind}="${esc(val)}">${e} ${l}</button>`;
  return `<div class="page">
    <div class="card-head"><h2 style="font-size:19px">🦊 Ask Kiko</h2><button class="btn" data-act="kikoMinimize" title="back to what you were doing">－ minimize</button></div>
    <section class="panel" style="padding:8px 10px;margin-bottom:10px">
      <div class="label" style="margin-bottom:6px">✨ Quick skills — tap one</div>
      <div class="kiko-skills">${skills.map(s=>chip(s[0],s[1],s[2],s[3])).join("")}</div>
    </section>
    ${creator?`<section class="panel" style="padding:8px 10px;margin-bottom:10px">
      <div class="label" style="margin-bottom:6px">🎮 Community pulse — research a game</div>
      <div class="kiko-skills">${gachaList().map(g=>`<button class="kiko-skill" data-act="kikoSeedAsk" data-gameid="${esc(g.id)}" data-seed="${esc(`Search Reddit (r/${g.name.replace(/\s/g,'')}, r/gachagaming), Twitter/X, and YouTube comments RIGHT NOW for what the ${g.name} community is actually saying this week. Be SPECIFIC — name real things, real dates, real people. Reply in EXACTLY this format — no intro, no extra text:
HYPE: [one sentence naming the SPECIFIC character/event/update people are excited about RIGHT NOW — include their name/title + a source link]
DRAMA: [one sentence on the REAL frustration or controversy in the community RIGHT NOW — dig into marketing decisions, communication failures, content droughts, gacha rates, broken promises, dev behaviour, anything — NEVER say "no drama", there is ALWAYS something people are unhappy about, even if it's small — include a source link]
IDEA: [one punchy stream or video title reacting to the REAL current mood — short, catchy, YouTube-title style]
DETAIL: [your full breakdown: what exactly happened, when, community reaction with receipts, sources, why it matters for a streamer covering this game]`)}">${g.emoji||'🎮'} ${esc(g.name)}</button>`).join("")}
      <button class="kiko-skill" data-act="kikoSkill" data-send="${esc(`I'm a VTuber and gacha content creator. Please search the internet (Reddit, YouTube, Twitter/X) and find what each of these game communities is currently buzzing about right now. For each game tell me: 1) what positive topics/moments are trending this week, 2) any drama, controversy, frustration or discontent in the community right now, and 3) one specific actionable stream or video idea I could make this week that taps into the current community mood. Games: ${gachaList().map(g=>g.name).join(", ")}. Keep each point short and punchy — one sentence max.`)}">🦊 Research all games</button>
    </section>`:""}
    <section class="panel" style="padding:6px"><div id="kikoTabChat" class="kiko-tabchat"></div></section>
    <section class="panel" style="margin-top:14px">
      <div class="label" style="margin-bottom:8px">⚙️ Kiko settings</div>
      <div class="chiprow">
        <button class="chiptog ${localStorage.getItem('kiko-voice')==='1'?'on':''}" data-act="kikoVoiceToggle"><span>${localStorage.getItem('kiko-voice')==='1'?'✓':''}</span>🔊 Speak replies</button>
        <button class="chiptog ${localStorage.getItem('kiko-smart')==='1'?'on':''}" data-act="kikoSmartToggle" title="use the big Opus brain for every reply in this conversation"><span>${localStorage.getItem('kiko-smart')==='1'?'✓':''}</span>💪 Smart brain for this convo</button>
        <button class="chiptog" data-act="kikoClearChat"><span>🧹</span>New conversation</button>
      </div>
      ${(function(){ const lvl=localStorage.getItem('kiko-prolevel')||(localStorage.getItem('kiko-proactive')==='0'?'quiet':'gentle');
        return `<div class="label" style="margin:12px 0 4px">🌅 How proactive should Kiko be?</div>
        <div class="seg">${[["quiet","🤫 Quiet"],["gentle","🌸 Gentle"],["active","✨ Active"]].map(([v,l])=>`<button data-act="kikoProLevel" data-v="${v}" class="${lvl===v?'on':''}">${l}</button>`).join("")}</div>
        <p class="soft" style="font-size:10.5px;margin:4px 0 0">Quiet = only when you ask · Gentle = a morning greeting + the occasional gentle nudge · Active = also notices things midday (correlations, streaks, dose days). Kiko also <b>learns your preferences as you chat</b> and acts on safe things itself, telling you after — deletes always ask first.</p>`; })()}
      <p class="soft" style="font-size:11px;margin:8px 0 0">Tip: say "use your smart brain" for the big model on hard questions, or "quick:" for snappy ones — Kiko picks automatically otherwise. He can read your <b>whole history</b> ("how was my sleep in March?") and find links between things ("does my water affect my nausea?"). 🎙️ in the chat bar lets you talk instead of type.</p>
      <details class="acc" style="margin-top:10px"><summary>🧠 Kiko's memory (${(state.sentinel.kikoMemory||[]).length})</summary><div class="acc-body">
        <p class="soft" style="font-size:11.5px;margin:0 0 6px">Say "remember that…" in chat and it lands here — he weaves these into everything he does for you. ✨ = he picked it up on his own.</p>
        ${(state.sentinel.kikoMemory||[]).length?(state.sentinel.kikoMemory||[]).slice().reverse().map(m=>`<div class="listrow"><span class="grow" style="font-size:12.5px">${m.auto?'✨ ':''}${esc(m.text)}</span><button class="x" data-act="delMemory" data-v="${m.id}">✕</button></div>`).join(""):'<p class="soft" style="font-size:12px">Nothing yet — tell him something worth keeping. 💗</p>'}
      </div></details>
      <details class="acc" style="margin-top:8px"><summary>🦊 What Kiko's learned about you</summary><div class="acc-body">
        <p class="soft" style="font-size:11.5px;margin:0 0 6px">Kiko quietly builds this picture of your rhythms &amp; preferences from your chats, so you never have to repeat yourself. Edit-free — just have a look, or wipe it to start fresh.</p>
        ${(state.sentinel.kikoUserModel||"").trim()
          ? `<div class="soft-card" style="font-size:12px;white-space:pre-wrap;line-height:1.5">${esc(state.sentinel.kikoUserModel)}</div><div style="margin-top:8px"><button class="btn" data-act="clearUserModel">↺ start fresh</button></div>`
          : '<p class="soft" style="font-size:12px">Nothing yet — chat with him a bit and he\'ll start to get you. 💗</p>'}
      </div></details>
    </section>
    <details class="acc" style="margin-top:14px"><summary>💬 Everything Kiko can do — the full guide</summary><div class="acc-body" style="font-size:12.5px;line-height:1.7">
      <div class="label" style="margin-top:4px">📅 Calendar, events &amp; reminders</div>
      <p style="margin:2px 0 8px">Add events ("add a collab stream on the 20th at 7pm"), <b>reschedule or rename</b> them ("move the collab to the 22nd"), delete them, and add multi-day ones. Add friends' <b>birthdays</b> ("add Eggie's birthday, March 3") — give him a public creator's handle and he'll look the date up. Birthdays auto-remind a month ahead. Set <b>reminders</b> for anything — "remind me to take my meds at 9pm every day", "remind me Thursday to email the accountant" — once or repeating, delivered as browser pop-ups, 📱 phone push, and the daily email. Mark them done or remove them by chat too. Ask "what's coming up?" anytime.</p>
      <div class="label">🔴 Stream life</div>
      <p style="margin:2px 0 8px">Manage your weekly <b>stream schedule</b> ("I stream Warframe on Saturdays at 5pm", "I'm not streaming Thursdays anymore"). Track <b>games</b> for the calendar ("track Genshin", "stop tracking Arknights") and say "refresh my game calendar now" for fresh update/event/livestream dates. Manage <b>sponsors</b> ("add a sponsor: GamerSupps, code MIFUYU", "mark GamerSupps active"). Brainstorm <b>stream titles</b> and start <b>scripts</b> ("help me script a short about…"). On the Script writer, tap <b>🎓 teach my voice</b> and paste a sample of your own writing — Kiko studies your style so the scripts it shapes sound like you, not generic AI.</p>
      <div class="label">💗 Health</div>
      <p style="margin:2px 0 8px">Log your <b>check-in</b> ("log my mood as 4, anxiety 2"), <b>energy/spoons</b>, <b>sleep</b> ("I slept 7 hours"), <b>PCOS</b> symptoms &amp; helpers ("fatigue is a 3", "I moved my body today"), <b>period</b> start/end and flow — and <b>remove a mistaken period or shot log</b>. Log <b>Mounjaro</b> shots ("log my shot, 7.5 in left thigh"), side-effects ("nausea is a 2"), daily helpers, and <b>water</b>. Log <b>weight</b>, full <b>body-comp</b> from the scale ("body fat 38, muscle 46"), <b>measurements</b>, and non-scale victories. Manage <b>meds</b> ("add Metformin 500mg with dinner").</p>
      <div class="label">🍱 Food</div>
      <p style="margin:2px 0 8px">Say what you ate ("log lunch: chicken, rice and kimchi") and he estimates calories, protein &amp; fibre — or tap <b>📷</b> and send one or several photos and he logs each dish. Remove a mislogged item ("remove the ramen"), or change your daily <b>targets</b> ("set my protein target to 120").</p>
      <div class="label">💶 Money</div>
      <p style="margin:2px 0 8px">Log business income &amp; expenses ("log €240 Twitch payout", "I spent €89 on a mic"). At tax time, say "start tax prep" and he walks you through exactly what to gather for your accountant, step by step.</p>
      <div class="label">📓 Reflect &amp; remember</div>
      <p style="margin:2px 0 8px">Say "let's journal" for the gentle <b>daily journal</b> he walks you through and writes up in your voice. Quick-set today's one-line journal note. Park thoughts in the <b>brain-dump</b>, make <b>stickies</b>, add joys to the <b>joy jar</b>, and manage <b>tasks &amp; goals</b> — add, complete ("done with the clinic call"), rename, delete, give them <b>due dates</b> ("I need to email the accountant by Friday"), and attach a <b>linked reminder</b> ("remind me about the PT exercises tomorrow at 9") — finishing the task finishes its reminder and vice-versa, so one thing only ever pings once. Tell him <b>"remember that…"</b> and he keeps it forever (see Kiko's memory above). Tick off <b>daily habits</b> ("I did my steps and the dishes") and <b>gacha dailies</b> ("did my WUWA and HSR dailies") — he can also add or remove habits and games from the lists, and tell you what's still left today. And when you wish your OS <b>itself</b> did something new or different — say <b>"note for Eggie: I'd love a sleep chart"</b> — Kiko files it on the 💌 wishlist (Settings) for Eggie to pick up and build. No screenshots, no forgetting.</p>
      <div class="label">🧩 Your space</div>
      <p style="margin:2px 0 8px">Kiko can also drive the hub itself: <b>"turn on calm mode"</b> / focus mode / larger text, <b>"lock my layout"</b>, <b>"hide the goals card"</b> / "show the journal card" (Home, Care or Food), <b>"start a 25/5 focus timer"</b> or a rest timer, change your name/greeting/weight unit, tidy mistaken logs (money entries, non-scale wins, joys, measurements, goals), and <b>"download my backup"</b>.</p>
      <div class="label">✨ And the clever stuff</div>
      <p style="margin:2px 0 8px">He <b>searches the web</b> when useful (game dates, facts, nutrition, prices). He reads your <b>entire hub</b> — every weigh-in and full Withings body composition (fat, muscle, body water, visceral, BMI, heart rate), your mood/energy/anxiety/nausea/cravings/sleep/water trends, PCOS &amp; Mounjaro symptoms, food, money, tasks, schedule — so ask him anything ("how's my protein today?", "what's my weight trend?", "is my muscle going up?") and even ask him to <b>find links between things</b> ("does my hydration affect my nausea?", "do I feel lower energy on low-water days?", "how's my mood the week after a dose increase?"). He remembers the <b>conversation</b>, so "actually make it 8pm" just works. Say <b>"undo that"</b> to roll back his last change (Ctrl+Z works too). He picks a fast brain for quick commands and a deeper one for hard questions — say <b>"use your smart brain"</b> or <b>"quick:"</b> to choose yourself. Talk instead of type with <b>🎙️</b>, hear him with <b>🔊 Speak replies</b>, and he'll greet you with a <b>morning briefing</b> and a soft evening journal nudge (toggleable above). He can also hop you to any tab — "take me to the calendar".</p>
      <p class="soft" style="font-size:11.5px;margin-top:6px">Every single thing he does is undoable — Ctrl+Z, or just tell him. 💗❄️</p>
    </div></details>
  </div>`;
}
