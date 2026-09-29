// Practical Computer Skills student session guard.
// No external school login is used.
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, update, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const SESSION_KEY = "computerSkillsStudent";
const RETURN_KEY = "computerSkillsReturnTo";
const app = getApps().length ? getApps()[0] : initializeApp(window.FIREBASE_CONFIG);
const db = getDatabase(app);
const body = document.body;

function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function readSession(){
  try {
    const x=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");
    return x && x.id ? x : null;
  } catch { return null; }
}
function siteRoot(){
  const marker="/computer skills only/";
  const path=decodeURIComponent(location.pathname);
  if(path.includes(marker)) return path.split(marker)[0]+marker;
  for(const part of ["/phase1/","/phase2/","/phase3/"]){
    if(path.includes(part)) return path.split(part)[0]+"/";
  }
  return path.replace(/[^/]*$/,"");
}
function courseRoot(){
  const marker="/computer skills only/";
  const path=decodeURIComponent(location.pathname);
  const rel=path.includes(marker)?path.split(marker)[1]:"index.html";
  return siteRoot()+"index.html?returnTo="+encodeURIComponent(rel);
}
function goLogin(message){
  try {
    const marker="/computer skills only/";
    const path=decodeURIComponent(location.pathname);
    const rel=path.includes(marker)?path.split(marker)[1]:"index.html";
    sessionStorage.setItem(RETURN_KEY,rel);
  } catch {}
  location.replace(courseRoot()+(message? "&reason="+encodeURIComponent(message):""));
}
async function verifyPasscodeHash(passcode){
  const bytes=new TextEncoder().encode(String(passcode));
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function normalizeStudent(rec,id){
  return {
    id,
    name:rec.name||"Student",
    classId:rec.classId||"",
    className:rec.className||"",
    course:rec.course||"Practical Computer Skills",
    active:rec.active!==false,
    suspended:rec.suspended===true,
    unlocked:rec.unlocked||{},
    progress:rec.progress||{}
  };
}
let resolveStudentReady;
window.studentReadyPromise=new Promise(resolve=>{resolveStudentReady=resolve;});

async function boot(){
  const local=readSession();
  if(!local){goLogin("Please enter your student ID and passcode.");return;}
  try{
    const snap=await get(ref(db,"students/"+local.id));
    const rec=snap.val();
    if(!rec || rec.active===false || rec.suspended===true){
      sessionStorage.removeItem(SESSION_KEY);
      goLogin("This student account is inactive or suspended.");
      return;
    }
    const student=normalizeStudent(rec,local.id);
    sessionStorage.setItem(SESSION_KEY,JSON.stringify(student));
    window.currentStudent=student;
    window.AuthAPI={
      db,ref,get,set,update,onValue,
      studentId:student.id
    };
    renderAuthTag(student);
    renderStudentGreeting(student);
    startPresence(student.id);
    watchStudent(student.id);
    startStudentInbox(student.id);
    resolveStudentReady(student);
    document.dispatchEvent(new CustomEvent("student-ready",{detail:student}));
  }catch(e){
    console.error(e);
    resolveStudentReady(null);
    goLogin("Could not verify your student account. Check your connection.");
  }
}
function renderAuthTag(s){
  const nav=document.querySelector(".site-nav .wrap");
  if(!nav||document.getElementById("authTag"))return;
  const t=document.createElement("div");
  t.id="authTag";
  t.style.cssText="display:flex;align-items:center;gap:8px;margin-left:auto;";
  t.innerHTML=`<span style="font-size:.82rem;font-weight:700;white-space:nowrap;">${safe(s.name)}</span><button type="button" id="authLogoutBtn" class="btn btn-ghost btn-sm" style="padding:6px 12px;">Log out</button>`;
  nav.appendChild(t);
  document.getElementById("authLogoutBtn").onclick=()=>{
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    location.href=siteRoot()+"index.html";
  };
}
function renderStudentGreeting(s){
  const host=document.querySelector(".site-nav");
  if(!host||document.getElementById("studentGreeting"))return;
  const box=document.createElement("div");
  box.id="studentGreeting";
  box.style.cssText="max-width:1200px;margin:12px auto 0;padding:12px 18px;border-radius:12px;background:#eaf4ec;color:#183d28;font-weight:700;font-size:1rem;";
  box.innerHTML=`Welcome, ${safe(s.name)}! <span style="font-weight:400">Continue your Practical Computer Skills learning journey.</span>`;
  host.insertAdjacentElement("afterend",box);
}
function startPresence(id){
  const ar=ref(db,`students/${id}/activity`);
  const beat=()=>{
    const x=window.lessonActivity||{};
    update(ar,{
      page:document.title,
      href:location.pathname.replace(/^\//,""),
      section:x.section||"",
      task:x.task||"",
      progress:Number.isFinite(x.progress)?x.progress:null,
      at:Date.now()
    }).catch(()=>{});
  };
  window.lessonHeartbeat=beat;
  beat();
  // Presence is useful for admin monitoring, but never let it block first paint.
  const initialPresenceTimer=setTimeout(beat,3000);
  const timer=setInterval(beat,30000);
  window.addEventListener("beforeunload",()=>{clearTimeout(initialPresenceTimer);clearInterval(timer);});
  try{onDisconnect(ref(db,`students/${id}/activity/at`)).set(0)}catch{}
}
function watchStudent(id){
  onValue(ref(db,`students/${id}`),snap=>{
    const rec=snap.val();
    if(!rec || rec.active===false || rec.suspended===true){
      sessionStorage.removeItem(SESSION_KEY);
      location.href=siteRoot()+"index.html?reason="+encodeURIComponent("Your account has been suspended or deactivated.");
      return;
    }
    window.currentStudent={...window.currentStudent,...normalizeStudent(rec,id)};
    try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(window.currentStudent));}catch{}
    document.dispatchEvent(new CustomEvent("student-record-changed",{detail:window.currentStudent}));
    document.dispatchEvent(new CustomEvent("unlocks-changed",{detail:window.currentStudent}));
  });
}
function startStudentInbox(id){
  if(document.getElementById("studentInbox"))return;
  const box=document.createElement("div");
  box.id="studentInbox";
  box.innerHTML=`<button id="studentInboxBell" class="inbox-bell" aria-label="Notifications and assignments">🔔<span id="studentInboxCount">0</span></button><div id="studentInboxPanel" class="inbox-panel" hidden><div class="inbox-head"><strong>Student centre</strong><button id="studentInboxClose">×</button></div><div id="studentInboxItems"></div></div>`;
  document.body.appendChild(box);
  const $=id=>document.getElementById(id);
  $("studentInboxBell").onclick=()=>$("studentInboxPanel").hidden=!$("studentInboxPanel").hidden;
  $("studentInboxClose").onclick=()=>$("studentInboxPanel").hidden=true;
  let notices={},assignments={},first=false;
  const render=()=>{
    const items=[];
    Object.entries(notices).forEach(([k,n])=>items.push({id:k,type:"notice",...n}));
    Object.entries(assignments).forEach(([k,a])=>{
      if(a?.published!==false&&a?.requestId&&a.recipients?.[id])items.push({id:k,type:"assignment",...a});
    });
    items.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    const root=$("studentInboxItems");
    root.innerHTML=items.slice(0,40).map(x=>`<article class="inbox-item ${x.type}"><div class="inbox-item-top"><span class="inbox-type">${x.type==="assignment"?"ASSIGNMENT":"NOTICE"}</span><small>${x.createdAt?new Date(x.createdAt).toLocaleString():""}</small></div><strong>${safe(x.title)}</strong><p>${safe(x.body)}</p>${x.dueAt?`<div class="inbox-due">Due: ${new Date(x.dueAt).toLocaleString()}</div>`:""}${x.lessonHref?`<a class="btn btn-primary btn-sm" href="${safe(x.lessonHref)}">Open lesson</a>`:""}</article>`).join("")||'<p class="empty-note">No notifications or assignments yet.</p>';
    $("studentInboxCount").textContent=items.length>99?"99+":String(items.length);
  };
  onValue(ref(db,`notifications/${id}`),s=>{notices=s.val()||{};render();if(first) $("studentInboxPanel").hidden=false;});
  // Do not keep a live listener on the entire assignments collection.
  // Large assignment collections can make Firebase repeatedly download a lot of data.
  // A one-time read keeps the inbox responsive; refresh when the page is reopened.
  get(ref(db,"assignments")).then(s=>{assignments=s.val()||{};render();if(first) $("studentInboxPanel").hidden=false;first=true;}).catch(()=>{first=true;});
}
boot();
