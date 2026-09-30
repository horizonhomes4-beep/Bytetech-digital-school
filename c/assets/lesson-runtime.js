// LESSON RUNTIME — Firebase-controlled access, live lesson content and deletion state
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app=getApps().length?getApps()[0]:initializeApp(window.FIREBASE_CONFIG);
const db=getDatabase(app),body=document.body,href=body.dataset.weekHref||"";
const weekKey=href.replace(/[.\/]/g,"_");
const weekNum=Number((href.match(/week(\d+)/)||[])[1]||0);
const metaTag=document.querySelector('meta[name="week-data"]');
let meta={};try{meta=metaTag?JSON.parse(metaTag.content):{};}catch{}
window.LESSON_META=meta;

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function showMessage(kind,title,text){
 let box=document.getElementById("lessonAccessBox");
 if(!box){box=document.createElement("div");box.id="lessonAccessBox";const host=document.getElementById("lessonOverrideHost")||document.querySelector("header")||body.firstElementChild;host?.insertAdjacentElement("afterend",box);}
 box.className="lesson-access-box "+kind;box.innerHTML=`<strong>${esc(title)}</strong><p>${esc(text)}</p>`;
}
function applyHtml(html,label,externalUrl=""){
 const host=document.getElementById("lessonOverrideHost"),original=document.getElementById("lessonOriginalContent");if(!host)return;
 if(externalUrl){
   const safeUrl=esc(externalUrl);
   host.innerHTML=`<div class="lesson-live-edit-banner"><span>Admin-updated lesson</span><small>${esc(label||"External lesson")}</small></div><div class="external-lesson-view"><iframe src="${safeUrl}" title="Updated lesson" loading="lazy" referrerpolicy="no-referrer"></iframe><div class="external-lesson-actions"><a class="btn btn-primary btn-sm" href="${safeUrl}" target="_blank" rel="noopener noreferrer">Open lesson in new tab ↗</a></div></div>`;
   host.hidden=false;if(original)original.hidden=true;return;
 }
 if(html){host.innerHTML=`<div class="lesson-live-edit-banner"><span>Admin-updated lesson</span><small>${esc(label||"Updated content")}</small></div><div class="lesson-admin-content" data-readable>${html}</div>`;host.hidden=false;if(original)original.hidden=true;}
 else{host.innerHTML="";host.hidden=true;if(original)original.hidden=false;}
}
function weekIsOpen(setting,student){
 if(weekNum===1||Number(meta.week)===1)return true;
 if(setting?.deleted)return false;
 // Weeks 2–12 are never globally opened. Access is granted per student only.
 return !!(student?.unlocked&&student.unlocked[weekKey]);
}
function renderDeleted(){
 const host=document.getElementById("lessonOverrideHost"),original=document.getElementById("lessonOriginalContent");
 if(original)original.hidden=true;if(host){host.hidden=false;host.innerHTML='<div class="lesson-access-box locked"><strong>Lesson unavailable</strong><p>This lesson has been removed from the student course view by the administrator.</p></div>';}
 const req=document.getElementById("requestAccessRoot");if(req)req.closest("section")?.setAttribute("hidden","");
}
// State kept in one place so listeners are created ONCE (never stacked up on every event).
const S={student:null,setting:null,override:null,gotSetting:false,gotOverride:false,started:false,studentReady:false,journeyDone:false};
function evaluate(){
 if(!S.gotSetting||!S.gotOverride)return;
 const setting=S.setting||{},o=S.override,student=S.student;
 if(setting.deleted){renderDeleted();return;}
 const accessible=weekIsOpen(setting,student);
 // Locked weeks: wait until we know who the student is, so an unlocked student never sees a "locked" flash.
 if(!accessible&&!S.studentReady&&weekNum!==1)return;
 if(o&&o.enabled!==false&&accessible&&(o.html||o.externalUrl)){applyHtml(o.html,o.updatedAt?new Date(o.updatedAt).toLocaleString():"Admin update",o.externalUrl||"");document.body.dataset.lessonStatus="live";return;}
 if(!accessible){
  const original=document.getElementById("lessonOriginalContent");if(original)original.hidden=true;
  const requestRoot=document.getElementById("requestAccessRoot");if(requestRoot)requestRoot.closest("section")?.removeAttribute("hidden");
  showMessage("locked","Lesson locked","This lesson is locked for your account. Request the next lesson below; your teacher/administrator will review your previous lesson before granting access.");
 }else{
  const box=document.getElementById("lessonAccessBox");if(box)box.remove();
  const original=document.getElementById("lessonOriginalContent");
  if(o&&o.enabled!==false&&(o.html||o.externalUrl))return;
  applyHtml("","");if(original)original.hidden=false;
 }
}
function startListeners(){
 if(S.started)return;S.started=true;
 window.lessonWeekKey=weekKey;window.lessonActivity=window.lessonActivity||{};
 onValue(ref(db,`lessonSettings/${weekKey}`),snap=>{S.setting=snap.val()||{};S.gotSetting=true;evaluate();},()=>{S.gotSetting=true;evaluate();});
 onValue(ref(db,"lessonOverrides/"+weekKey),snap=>{S.override=snap.val();S.gotOverride=true;evaluate();},()=>{S.gotOverride=true;evaluate();});
}
function writeJourney(student){
 if(S.journeyDone||!student||!window.AuthAPI)return;S.journeyDone=true;
 const journeyRef=ref(db,`students/${student.id}/journey/${weekKey}`);
 get(journeyRef).then(s=>{const old=s.val()||{};return update(journeyRef,{studentId:student.id,studentName:student.name||"",weekHref:href,weekTitle:meta.title||document.title,firstOpenedAt:old.firstOpenedAt||Date.now(),lastOpenedAt:Date.now()});}).catch(()=>{});
}
function setStudent(student){
 if(student)S.student=student;
 S.studentReady=true;
 writeJourney(S.student);
 evaluate();
 window.lessonHeartbeat?.();
}
startListeners();
document.addEventListener("student-ready",e=>setStudent(e.detail));
document.addEventListener("unlocks-changed",e=>{S.student=e.detail||window.currentStudent||S.student;evaluate();});
if(window.currentStudent)setStudent(window.currentStudent);
// Safety net: if login verification is very slow, stop waiting after 8s and evaluate anyway.
setTimeout(()=>{if(!S.studentReady){S.studentReady=true;evaluate();}},8000);
