"use strict";
const CONFIG = {
  url: "https://hdkhoijkawwyfnjvsmdi.supabase.co",
  anonKey: "sb_publishable_DovTvekKojWHLpSNHfZLjQ_C9Gn_LFs",
};
const SB = window.supabase.createClient(CONFIG.url, CONFIG.anonKey);

const email = document.getElementById("lgEmail");
const pass = document.getElementById("lgPass");
const btn = document.getElementById("lgBtn");
const msg = document.getElementById("msg");
const forgot = document.getElementById("lgForgot");

function setMsg(text, ok){ msg.textContent = text||""; msg.className = ok ? "ok" : ""; }

// already signed in? skip straight to the app
SB.auth.getSession().then(({data:{session}})=>{
  if(session && session.user) location.href = "index.html";
});

async function doLogin(){
  const em=(email.value||"").trim(), pw=pass.value||"";
  if(!em||!pw){ setMsg("Enter your email and password first 🥺"); return; }
  btn.disabled=true; setMsg("logging in…");
  const {data,error} = await SB.auth.signInWithPassword({email:em,password:pw});
  btn.disabled=false;
  if(error){ setMsg("Login failed — check your email & password and try again 🥺"); return; }
  if(data&&data.session){ setMsg("Welcome back! ✨",true); location.href="index.html"; }
}

btn.onclick = doLogin;
pass.addEventListener("keydown", e=>{ if(e.key==="Enter") doLogin(); });
email.addEventListener("keydown", e=>{ if(e.key==="Enter") doLogin(); });

forgot.onclick = async (e)=>{
  e.preventDefault();
  const em=(email.value||"").trim();
  if(!em){ setMsg("Type your email above first, then tap forgot 🌸"); return; }
  const {error} = await SB.auth.resetPasswordForEmail(em, {redirectTo:location.origin+location.pathname.replace(/login\.html$/,"login.html")});
  setMsg(error ? "Couldn't send a reset link — try again 🌧️" : "If that email has an account, a reset link is on its way 💌", !error);
};
