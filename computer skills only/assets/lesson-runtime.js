// LESSON RUNTIME — Firebase-controlled access, live lesson content and deletion state
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app=getApps().length?getApps()[0]:initializeApp(window.FIREBASE_CONFIG);
const db=getDatabase(app),body=document.body,href=body.dataset.weekHref||"";
const weekKey=href.replace(/[.\/]/g,"_");
const metaTag=document.querySelector('meta[name="week-data"]');
let meta={};try{meta=metaTag?JSON.parse(metaTag.content):{};}catch{}
window.LESSON_META=meta;

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function showMessage(kind,title,text){
 let box=document.getElementById("lessonAccessBox");
 if(!box){box=document.createElement("div");box.id="lessonAccessBox";const host=document.getElementById("lessonOverrideHost")||document.querySelector("header")||body.firstElementChild;host?.insertAdjacentElement("afterend",box);}
 box.className="lesson-access-box "+kind;box.innerHTML=`<strong>${esc(title)}</strong><p>${esc(text)}</p>`;
}
function applyHtml(html,label){
 const host=document.getElementById("lessonOverrideHost"),original=document.getElementById("lessonOriginalContent");if(!host)return;
 if(html){host.innerHTML=`<div class="lesson-live-edit-banner"><span>Admin-updated lesson</span><small>${esc(label||"Updated content")}</small></div><div class="lesson-admin-content" data-readable>${html}</div>`;host.hidden=false;if(original)original.hidden=true;}
 else{host.innerHTML="";host.hidden=true;if(original)original.hidden=false;}
}
function weekIsOpen(setting,student){
 if(Number(meta.week)===1)return true;
 if(setting?.deleted)return false;
 // Weeks 2–12 are never globally opened. Access is granted per student only.
 return !!(student?.unlocked&&student.unlocked[weekKey]);
}
function renderDeleted(){
 const host=document.getElementById("lessonOverrideHost"),original=document.getElementById("lessonOriginalContent");
 if(original)original.hidden=true;if(host){host.hidden=false;host.innerHTML='<div class="lesson-access-box locked"><strong>Lesson unavailable</strong><p>This lesson has been removed from the student course view by the administrator.</p></div>';}
 const req=document.getElementById("requestAccessRoot");if(req)req.closest("section")?.setAttribute("hidden","");
}
function loadOverride(student,setting){
 const overrideRef=ref(db,"lessonOverrides/"+weekKey);
 onValue(overrideRef,snap=>{
  const o=snap.val();
  if(setting?.deleted){renderDeleted();return;}
  const accessible=weekIsOpen(setting,student);
  if(o&&o.enabled!==false&&accessible){applyHtml(o.html,o.updatedAt?new Date(o.updatedAt).toLocaleString():"Admin update");document.body.dataset.lessonStatus="live";return;}
  if(!accessible){
   const original=document.getElementById("lessonOriginalContent");if(original)original.hidden=true;
   const requestRoot=document.getElementById("requestAccessRoot");if(requestRoot)requestRoot.closest("section")?.removeAttribute("hidden");
   showMessage("locked","Lesson locked","This lesson is locked for your account. Request the next lesson below; your teacher/administrator will review your previous lesson before granting access.");
  }else{const box=document.getElementById("lessonAccessBox");if(box)box.remove();applyHtml("","");}
 });
}
function init(student){
 window.lessonWeekKey=weekKey;window.lessonActivity=window.lessonActivity||{};
 if(window.AuthAPI&&student){const journeyRef=ref(db,`students/${student.id}/journey/${weekKey}`);get(journeyRef).then(s=>{const old=s.val()||{};return update(journeyRef,{studentId:student.id,studentName:student.name||"",weekHref:href,weekTitle:meta.title||document.title,firstOpenedAt:old.firstOpenedAt||Date.now(),lastOpenedAt:Date.now()});}).catch(()=>{});}
 onValue(ref(db,`lessonSettings/${weekKey}`),snap=>{loadOverride(student,snap.val()||{});});
 if(window.lessonHeartbeat)window.lessonHeartbeat();
}
document.addEventListener("student-ready",e=>init(e.detail));
document.addEventListener("unlocks-changed",()=>{if(window.currentStudent)init(window.currentStudent);});
setTimeout(()=>{ if(window.currentStudent) init(window.currentStudent); else init(null); },150);
