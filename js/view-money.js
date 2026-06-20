function viewMoney(){
  const year=moneyYear(); const dir=state.moneyDir||"in";
  const all=(state.sentinel.money||[]); const years=[...new Set(all.map(t=>String(t.date||"").slice(0,4)).filter(Boolean))]; const curY=String(new Date().getFullYear()); if(!years.includes(curY))years.push(curY); years.sort().reverse();
  const tx=moneyEntries(year).slice().sort((a,b)=>a.date<b.date?1:-1);
  const inc=tx.filter(t=>t.dir==="in").reduce((a,t)=>a+(+t.amount||0),0), exp=tx.filter(t=>t.dir==="out").reduce((a,t)=>a+(+t.amount||0),0);
  const tp=(state.sentinel.taxPrep||{})[year];
  return `<div class="page">
    <div class="card-head"><h2 style="font-size:19px">💶 Money</h2>
      <select class="inp" id="moneyYear" style="max-width:110px">${years.map(y=>`<option ${y===year?'selected':''}>${y}</option>`).join("")}</select></div>
    <p class="soft" style="font-size:12px;margin:0 0 12px">Your business books — for a sole-proprietor (eenmanszaak) creator in the Netherlands. 🇳🇱❄️</p>

    <section class="panel">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;text-align:center">
        <div class="soft-card"><div class="label">Income</div><div class="bignum" style="color:#3a9d83;font-size:22px">${eur(inc)}</div></div>
        <div class="soft-card"><div class="label">Expenses</div><div class="bignum" style="color:var(--sakura-deep);font-size:22px">${eur(exp)}</div></div>
        <div class="soft-card"><div class="label">Net profit</div><div class="bignum" style="font-size:22px">${eur(inc-exp)}</div></div>
      </div>
      <p class="soft" style="font-size:11px;text-align:center;margin-top:8px">A common rule of thumb is to set aside roughly a third of profit for income tax + Zvw — confirm the real number with your accountant. 💗</p>
    </section>

    <section class="panel">
      <div class="label" style="margin-bottom:6px">➕ Add a transaction</div>
      <div class="seg" style="margin-bottom:8px"><button data-act="moneyDir" data-v="in" class="${dir==='in'?'on':''}">＋ Income</button><button data-act="moneyDir" data-v="out" class="${dir==='out'?'on':''}">－ Expense</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="field"><div class="label">Date</div><input class="inp" type="date" id="mn_date" value="${esc((state.moneyDraft||{}).date||TODAY)}"></div>
        <div class="field"><div class="label">Amount (€)</div><input class="inp" type="number" step="0.01" id="mn_amount" placeholder="0.00" value="${esc((state.moneyDraft||{}).amount||'')}"></div>
      </div>
      <div class="field" style="margin-top:8px"><div class="label">Category</div><select class="inp" id="mn_cat">${(dir==='in'?MONEY_IN:MONEY_OUT).map(c=>`<option>${c}</option>`).join("")}</select></div>
      <input class="inp" id="mn_desc" placeholder="description (e.g. Twitch payout July · new microphone)" style="margin-top:8px" value="${esc((state.moneyDraft||{}).desc||'')}">
      <button class="btn btn-grad" data-act="addMoney" style="margin-top:8px">Add</button>
    </section>

    <section class="panel">
      <div class="card-head"><span class="label">${year} transactions</span><span class="pill pill-gray">${tx.length}</span></div>
      ${tx.length?tx.map(t=>`<div class="listrow"><span class="grow"><b style="font-size:13px;color:${t.dir==='in'?'#3a9d83':'var(--sakura-deep)'}">${t.dir==='in'?'+':'−'}${eur(t.amount).slice(1)}</b> <span class="soft" style="font-size:11.5px">${esc(t.cat||'')} · ${fmtDate(t.date)}${t.desc?' · '+esc(t.desc):''}</span></span><button class="x" data-act="delMoney" data-v="${t.id}">✕</button></div>`).join(""):`<p class="soft" style="font-size:12.5px">No transactions yet for ${year}. Add your payouts and expenses above. ❄️</p>`}
      ${tx.length?`<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn" data-act="exportMoneyCSV">⬇ Transactions (CSV)</button><button class="btn" data-act="exportMoneySummary">⬇ Accountant summary</button></div>`:''}
    </section>

    <section class="panel">
      <div class="card-head"><span class="label">🧾 Tax season</span></div>
      <p class="soft" style="font-size:12.5px;margin:0 0 8px">When it's time to file, Kiko walks you through exactly what to gather for your accountant — then you export it. You don't file yourself; you just hand this over.</p>
      <button class="btn btn-grad" data-act="startTaxPrep">Start tax-prep with Kiko 🦊</button>
      ${tp&&tp.items&&tp.items.length?`<details class="acc" style="margin-top:12px"><summary>📋 ${year} prep checklist (saved)</summary><div class="acc-body">${tp.items.map(x=>`<div style="margin:6px 0"><div class="label">${esc(x.q)}</div><div style="font-size:13px">${esc(x.a)}</div></div>`).join("")}<button class="btn" data-act="exportTaxPrep" style="margin-top:8px">⬇ Export checklist</button></div></details>`:''}
    </section>

    <details class="acc"><summary>📖 Netherlands tax guide — sole-proprietor creator</summary><div class="acc-body">
      <p style="font-size:13px;line-height:1.65">You run an <b>eenmanszaak</b> (sole proprietorship), so your business profit is taxed as your personal income in <b>Box 1</b> (inkomstenbelasting). Nothing is withheld for you, so put money aside through the year.</p>
      <p style="font-size:13px;line-height:1.65"><b>BTW (VAT):</b> the standard rate is 21%, and you normally file a BTW return <b>each quarter</b>. If your turnover stays under the KOR threshold (around €20,000/yr) you can join the <b>kleineondernemersregeling</b> and stop charging/filing VAT — your accountant can say which is better for you.</p>
      <p style="font-size:13px;line-height:1.65"><b>Self-employed deductions:</b> if you spend about <b>1,225 hours</b>/year on the business (the urencriterium), you may qualify for the <b>zelfstandigenaftrek</b>, plus the <b>startersaftrek</b> in your first years; the <b>MKB-winstvrijstelling</b> then exempts a slice of the remaining profit. Keep an hours log to prove it.</p>
      <p style="font-size:13px;line-height:1.65"><b>Costs you can usually deduct:</b> gear, software & subscriptions, a business share of internet/phone, marketing, work travel, games/props bought specifically as content, and bank/accountant fees. Personal use isn't deductible — split mixed use. Bigger purchases may qualify for the investment deduction (KIA) or are depreciated over several years.</p>
      <p style="font-size:13px;line-height:1.65"><b>Also budget for</b> the income-dependent <b>Zvw</b> health contribution on top of income tax.</p>
      <p style="font-size:13px;line-height:1.65"><b>Records:</b> keep your full administration — invoices, receipts, bank statements — for <b>7 years</b>.</p>
      <p class="soft" style="font-size:11.5px">Amounts and rules change every year and depend on your situation — treat this as a friendly overview and let your accountant and the Belastingdienst be the authority. 💗</p>
    </div></details>
    <details class="acc"><summary>🗂️ What to collect for tax season</summary><div class="acc-body">
      <ol style="padding-left:18px;font-size:13px;line-height:1.7">${TAX_STEPS.map(s=>`<li style="margin:5px 0">${s}</li>`).join("")}</ol>
    </div></details>
    <div class="disc" style="margin-top:14px">🧾<span>General information for a Dutch eenmanszaak — not tax or financial advice. Rules and amounts change yearly and depend on your situation; your accountant and the Belastingdienst are the final word. ❄️</span></div>
  </div>`;
}
