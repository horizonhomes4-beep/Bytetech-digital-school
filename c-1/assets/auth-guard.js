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
  let lastBeat=0,pending=null;
  const send=()=>{
    lastBeat=Date.now();
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
  // Throttled: scrolling / ticking tasks can never flood Firebase (max one write per 5s).
  const beat=()=>{
    const wait=5000-(Date.now()-lastBeat);
    if(wait<=0){send();return;}
    if(!pending)pending=setTimeout(()=>{pending=null;send();},wait+50);
  };
  window.lessonHeartbeat=beat;
  beat();
  const timer=setInterval(beat,30000);
  window.addEventListener("beforeunload",()=>{clearInterval(timer);if(pending)clearTimeout(pending);});
  try{onDisconnect(ref(db,`students/${id}/activity/at`)).set(0)}catch{}
}
function kickOut(){
  try{sessionStorage.removeItem(SESSION_KEY);}catch{}
  location.href=siteRoot()+"index.html?reason="+encodeURIComponent("Your account has been suspended or deactivated.");
}
function watchStudent(id){
  // IMPORTANT: never listen to the whole students/<id> node. Our own writes (activity heartbeat,
  // lesson journey, progress) live under it and used to re-trigger this listener forever,
  // which froze the page. We listen only to the three fields that matter.
  const base=`students/${id}`;
  onValue(ref(db,base+"/active"),snap=>{ if(snap.val()===false) kickOut(); });
  onValue(ref(db,base+"/suspended"),snap=>{ if(snap.val()===true) kickOut(); });
  onValue(ref(db,base+"/unlocked"),snap=>{
    const next=snap.val()||{};
    const cur=window.currentStudent||{};
    if(JSON.stringify(next)===JSON.stringify(cur.unlocked||{})) return; // nothing changed -> do nothing
    window.currentStudent={...cur,unlocked:next};
    try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(window.currentStudent));}catch{}
    document.dispatchEvent(new CustomEvent("student-record-changed",{detail:window.currentStudent}));
    document.dispatchEvent(new CustomEvent("unlocks-changed",{detail:window.currentStudent}));
  });
}
function startStudentInbox(id){
  if(document.getElementById("studentInbox"))return;
  const seenKey="computerSkillsInboxSeen:"+id;
  const getSeen=()=>{try{return Number(localStorage.getItem(seenKey)||0);}catch{return 0;}};
  const setSeen=t=>{try{localStorage.setItem(seenKey,String(t));}catch{}};
  const $=x=>document.getElementById(x);

  // 1) Floating bell + panel (works on every page)
  const box=document.createElement("div");
  box.id="studentInbox";
  box.innerHTML=`<button id="studentInboxBell" class="inbox-bell" type="button" aria-label="Open notifications and assignments" title="Notifications">🔔<span id="studentInboxCount" hidden>0</span></button><div id="studentInboxPanel" class="inbox-panel" hidden><div class="inbox-head"><strong>Student centre</strong><span><button id="studentInboxRead" type="button" style="font-size:.75rem;font-weight:700;cursor:pointer;margin-right:8px;">Mark all read</button><button id="studentInboxClose" type="button" aria-label="Close">×</button></span></div><div id="studentInboxItems"></div></div>`;
  document.body.appendChild(box);

  // 2) A clearly labelled "Notifications" button inside the top navigation bar
  const tag=$("authTag");
  if(tag&&!$("studentNavBell")){
    const nb=document.createElement("button");
    nb.type="button";nb.id="studentNavBell";nb.className="btn btn-ghost btn-sm";
    nb.style.cssText="padding:6px 12px;position:relative;white-space:nowrap;";
    nb.innerHTML='🔔 Notifications <span id="studentNavCount" hidden style="display:inline-block;min-width:18px;padding:0 5px;margin-left:4px;border-radius:99px;background:#c0392b;color:#fff;font-size:.7rem;font-weight:800;text-align:center;">0</span>';
    tag.insertBefore(nb,$("authLogoutBtn"));
  }

  let notices={},assignments={},known=null,latest=0;
  const items=()=>{
    const list=[];
    const assignedReq=new Set();
    Object.entries(assignments).forEach(([k,a])=>{
      if(a?.published!==false&&a?.requestId&&a.recipients?.[id]){list.push({id:"a_"+k,type:"assignment",...a});assignedReq.add(a.requestId+"|"+a.title);}
    });
    Object.entries(notices).forEach(([k,n])=>{
      // The admin also sends a short notice whenever an assignment is created; show the assignment only.
      if(n&&n.title==="Assignment / assessment"&&assignedReq.has(n.requestId+"|"+n.body))return;
      list.push({id:"n_"+k,type:"notice",...n});
    });
    return list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  };
  const linkFor=h=>h?siteRoot()+String(h).replace(/^\/+/,""):"";
  const toast=(title,body)=>{
    const t=document.createElement("div");t.className="student-toast";
    t.innerHTML=`<strong>${safe(title)}</strong><span>${safe(body)}</span>`;
    document.body.appendChild(t);
    requestAnimationFrame(()=>t.classList.add("show"));
    setTimeout(()=>{t.classList.remove("show");setTimeout(()=>t.remove(),400);},6000);
    t.onclick=()=>{t.remove();$("studentInboxPanel").hidden=false;markRead();};
  };
  const setBadges=n=>{
    ["studentInboxCount","studentNavCount"].forEach(x=>{const el=$(x);if(!el)return;el.textContent=n>99?"99+":String(n);el.hidden=n===0;});
  };
  function markRead(){
    latest=Math.max(latest,...items().map(x=>x.createdAt||0),0);
    setSeen(Math.max(latest,Date.now()));
    setBadges(0);
  }
  const render=()=>{
    const list=items();
    const seen=getSeen();
    const unread=list.filter(x=>(x.createdAt||0)>seen).length;
    $("studentInboxItems").innerHTML=list.slice(0,40).map(x=>`<article class="inbox-item ${x.type}"><div class="inbox-item-top"><span class="inbox-type">${x.type==="assignment"?"ASSIGNMENT":"NOTICE"}</span><small>${x.createdAt?new Date(x.createdAt).toLocaleString():""}</small></div><strong>${safe(x.title)}</strong><p>${safe(x.body)}</p>${x.dueAt?`<div class="inbox-due">Due: ${new Date(x.dueAt).toLocaleString()}</div>`:""}${x.lessonHref?`<a class="btn btn-primary btn-sm" href="${safe(linkFor(x.lessonHref))}">Open lesson</a>`:""}</article>`).join("")||'<p class="empty-note" style="padding:16px;">No notifications or assignments yet.</p>';
    if($("studentInboxPanel").hidden) setBadges(unread); else markRead();
    // toast for items that arrive while the page is open
    const ids=list.map(x=>x.id);
    if(known===null){known=new Set(ids);}
    else{
      const fresh=list.filter(x=>!known.has(x.id));
      ids.forEach(i=>known.add(i));
      if(fresh.length&&$("studentInboxPanel").hidden)toast(fresh[0].type==="assignment"?"New assignment":"New notification",fresh[0].title||"");
    }
  };
  const toggle=()=>{const p=$("studentInboxPanel");p.hidden=!p.hidden;if(!p.hidden){loadAssignments();markRead();}};
  $("studentInboxBell").onclick=toggle;
  $("studentNavBell")&&($("studentNavBell").onclick=toggle);
  $("studentInboxClose").onclick=()=>{$("studentInboxPanel").hidden=true;};
  $("studentInboxRead").onclick=markRead;

  onValue(ref(db,`notifications/${id}`),s=>{notices=s.val()||{};render();});
  // Assignments: one read on load, re-read when the panel opens and once a minute (no heavy live listener).
  function loadAssignments(){return get(ref(db,"assignments")).then(s=>{assignments=s.val()||{};render();}).catch(()=>{});}
  loadAssignments();
  setInterval(loadAssignments,60000);
}
boot();
