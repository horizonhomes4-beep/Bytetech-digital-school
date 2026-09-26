// STUDENT SESSION, ACCESS WATCHER, LIVE PRESENCE + NOTIFICATIONS
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, update, onValue, onDisconnect, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app = getApps().length ? getApps()[0] : initializeApp(window.FIREBASE_CONFIG);
const db = getDatabase(app);
let raw=null; try{raw=sessionStorage.getItem("lessonDeskStudent");}catch{}

if(raw){
 try{
  const local=JSON.parse(raw);
  if(local&&local.id){
   get(ref(db,"students/"+local.id)).then(snap=>{
    const rec=snap.val();
    window.currentStudent={id:local.id,name:rec?.name||local.name||"Student",classId:rec?.classId||local.classId||"",unlocked:rec?.unlocked||{}};
    window.AuthAPI={db,ref,get,set,update,onValue,studentId:local.id};
    renderAuthTag(window.currentStudent); startPresence(local.id); watchUnlocks(local.id); startStudentInbox(local.id);
    document.dispatchEvent(new CustomEvent("student-ready",{detail:window.currentStudent}));
   }).catch(()=>{
    window.currentStudent=local;window.AuthAPI={db,ref,get,set,update,onValue,studentId:local.id};
    renderAuthTag(local);startStudentInbox(local.id);document.dispatchEvent(new CustomEvent("student-ready",{detail:local}));
   });
  }
 }catch{}
}

function startPresence(studentId){
 const activityRef=ref(db,"students/"+studentId+"/activity");
 const beat=()=>{const x=window.lessonActivity||{};update(activityRef,{page:document.title,href:location.pathname.replace(/^\//,""),section:x.section||"",task:x.task||"",progress:Number.isFinite(x.progress)?x.progress:null,at:Date.now()}).catch(()=>{});};
 window.lessonHeartbeat=beat;beat();const interval=setInterval(beat,12000);window.addEventListener("beforeunload",()=>clearInterval(interval));
 try{onDisconnect(ref(db,"students/"+studentId+"/activity/at")).set(0);}catch{}
}
function watchUnlocks(studentId){
 onValue(ref(db,"students/"+studentId+"/unlocked"),snap=>{if(!window.currentStudent)return;window.currentStudent.unlocked=snap.val()||{};document.dispatchEvent(new CustomEvent("unlocks-changed",{detail:window.currentStudent.unlocked}));});
}
function renderAuthTag(student){
 const nav=document.querySelector(".site-nav .wrap");if(!nav||document.getElementById("authTag"))return;
 const tag=document.createElement("div");tag.id="authTag";tag.style.cssText="display:flex;align-items:center;gap:8px;margin-left:8px;";
 const safe=String(student.name||"Student").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 tag.innerHTML=`<span style="font-size:.82rem;font-weight:700;color:var(--ink-soft);white-space:nowrap;">${safe}</span><button type="button" id="authLogoutBtn" class="btn btn-ghost btn-sm" style="padding:6px 12px;">Log out</button>`;
 nav.appendChild(tag);document.getElementById("authLogoutBtn").onclick=()=>{try{sessionStorage.removeItem("lessonDeskStudent");sessionStorage.removeItem("lessonDeskReturnTo");}catch{}location.reload();};
}

function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function showStudentToast(title,body){
 const old=document.getElementById("studentToast");old?.remove();
 const t=document.createElement("div");t.id="studentToast";t.className="student-toast";t.innerHTML=`<strong>${safe(title)}</strong><span>${safe(body)}</span>`;document.body.appendChild(t);
 setTimeout(()=>t.classList.add("show"),20);setTimeout(()=>t.classList.remove("show"),5500);setTimeout(()=>t.remove(),6000);
}
function startStudentInbox(studentId){
 if(document.getElementById("studentInbox"))return;
 const box=document.createElement("div");box.id="studentInbox";
 box.innerHTML=`<button id="studentInboxBell" class="inbox-bell" aria-label="Notifications and assignments">🔔<span id="studentInboxCount">0</span></button>
 <div id="studentInboxPanel" class="inbox-panel" hidden><div class="inbox-head"><strong>Student centre</strong><button id="studentInboxClose">×</button></div><div id="studentInboxItems"></div></div>`;
 document.body.appendChild(box);
 document.getElementById("studentInboxBell").onclick=()=>document.getElementById("studentInboxPanel").hidden=!document.getElementById("studentInboxPanel").hidden;
 document.getElementById("studentInboxClose").onclick=()=>document.getElementById("studentInboxPanel").hidden=true;

 let notices={},assignments={};
 const render=()=>{
  const items=[];
  Object.entries(notices).forEach(([id,n])=>items.push({id,type:"notice",...n}));
  Object.entries(assignments).forEach(([id,a])=>{if(a?.published!==false&&a?.requestId&&a.recipients?.[studentId])items.push({id,type:"assignment",...a});});
  items.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const unread=items.filter(x=>x.type==="notice"&&!x.read).length;
  document.getElementById("studentInboxCount").textContent=unread+items.filter(x=>x.type==="assignment"&&(!localStorage.getItem("assignmentSeen:"+x.id))).length||"";
  const root=document.getElementById("studentInboxItems");
  root.innerHTML=items.slice(0,30).map(x=>`<article class="inbox-item ${x.type}" data-inbox-type="${safe(x.type)}" data-inbox-id="${safe(x.id)}"><div class="inbox-item-top"><span class="inbox-type">${x.type==="assignment"?"ASSIGNMENT":"NOTICE"}</span><small>${x.createdAt?new Date(x.createdAt).toLocaleString():""}</small></div><strong>${safe(x.title)}</strong><p>${safe(x.body)}</p>${x.dueAt?`<div class="inbox-due">Due: ${new Date(x.dueAt).toLocaleString()}</div>`:""}${x.lessonHref?`<a class="btn btn-primary btn-sm" href="${safe(x.lessonHref)}">Open lesson</a>`:""}</article>`).join("")||'<p class="empty-note">No notifications or assignments yet.</p>';
  root.querySelectorAll(".inbox-item.notice").forEach(item=>item.onclick=()=>{const id=item.dataset.inboxId;if(id)update(ref(db,`notifications/${studentId}/${id}`),{read:true}).catch(()=>{});});
 };
 let firstNoticeLoad=true, previousNoticeIds=new Set();
 onValue(ref(db,`notifications/${studentId}`),snap=>{const next=snap.val()||{};const newIds=Object.keys(next).filter(id=>!previousNoticeIds.has(id));notices=next;render();if(!firstNoticeLoad&&newIds.length){const n=next[newIds[newIds.length-1]];showStudentToast(n.title||"New notification",n.body||"");}previousNoticeIds=new Set(Object.keys(next));firstNoticeLoad=false;});
 onValue(ref(db,"assignments"),snap=>{assignments=snap.val()||{};render();});
}
