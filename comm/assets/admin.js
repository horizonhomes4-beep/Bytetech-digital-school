// OPEN ADMIN CONTROL CENTRE
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, update, remove, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app=getApps().length?getApps()[0]:initializeApp(window.FIREBASE_CONFIG);
const db=getDatabase(app);
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const weekKey=url=>String(url||"").replace(/[.\/]/g,"_");
const TIMEOUT=45000;
let students={},requests={},assignments={},settings={},lessons=[],selectedWeek="";

document.querySelectorAll(".admin-tab").forEach(btn=>btn.addEventListener("click",()=>{
 document.querySelectorAll(".admin-tab").forEach(x=>x.classList.remove("active"));
 document.querySelectorAll(".admin-tab-panel").forEach(x=>x.hidden=true);
 btn.classList.add("active");$("tab-"+btn.dataset.tab).hidden=false;
}));

// ---------- STUDENTS ----------
async function sha256(value){
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value)));
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function online(s){return !!(s.activity?.at&&Date.now()-Number(s.activity.at)<TIMEOUT);}
function timeAgo(ts){if(!ts)return"never";const n=Math.max(0,Math.round((Date.now()-Number(ts))/1000));if(n<5)return"just now";if(n<60)return n+"s ago";if(n<3600)return Math.round(n/60)+"m ago";return Math.round(n/3600)+"h ago";}
function randomPasscode(){
 const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
 const a=new Uint32Array(8);crypto.getRandomValues(a);
 return [...a].map(x=>chars[x%chars.length]).join("");
}
$("generatePasscode")?.addEventListener("click",()=>{$("newStudentPasscode").value=randomPasscode();$("newStudentPasscode").focus();});
$("studentForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 const id=$("newStudentId").value.trim().replace(/[.#$\/\[\]]/g,"_");
 const name=$("newStudentName").value.trim(),pass=$("newStudentPasscode").value,classId=$("newStudentClass").value.trim(),status=$("newStudentStatus").value,notes=$("newStudentNotes").value.trim();
 const msg=$("studentCreateMsg");
 if(!id||!name||!pass){msg.textContent="Student ID, name and passcode are required.";return;}
 try{
   const existing=await get(ref(db,"students/"+id));
   if(existing.exists()){msg.textContent="That Student ID already exists. Use another ID.";return;}
   const now=Date.now(),hash=await sha256(pass);
   await set(ref(db,"students/"+id),{
     name,classId,active:status==="active",suspended:status==="suspended",
     passcodeHash:hash,createdAt:now,updatedAt:now,notes,
     unlocked:{},requests:{},progress:{},activity:{}
   });
   $("studentCreateMsg").textContent="Student account created successfully.";
   $("createdCredentials").hidden=false;
   $("createdCredentials").innerHTML=`<strong>Student created</strong><span>ID: <b>${esc(id)}</b></span><span>Passcode: <b>${esc(pass)}</b></span><button type="button" class="btn btn-ghost btn-sm" id="copyCredentials">Copy credentials</button><small>Give this passcode to the student now. For security, it is not displayed again after this message.</small>`;
   $("copyCredentials").onclick=async()=>{try{await navigator.clipboard.writeText(`Student ID: ${id}\nPasscode: ${pass}`);$("copyCredentials").textContent="Copied";}catch{}};
   e.target.reset();
 }catch(err){msg.textContent="Create failed: "+err.message;}
});
$("studentSearch")?.addEventListener("input",renderStudents);
$("studentFilter")?.addEventListener("change",renderStudents);

function renderStudents(){
 const root=$("studentList");if(!root)return;
 const q=($("studentSearch")?.value||"").trim().toLowerCase(),filter=$("studentFilter")?.value||"all";
 let ids=Object.keys(students).filter(id=>{
  const s=students[id]||{},hay=`${id} ${s.name||""} ${s.classId||""}`.toLowerCase();
  const active=s.active!==false&&!s.suspended;
  return (!q||hay.includes(q)) &&
    (filter==="all"||filter==="active"?(filter==="all"||active):filter==="suspended"?!!s.suspended:filter==="online"?online(s):true);
 });
 $("studentCount").textContent=ids.length;
 if(!ids.length){root.innerHTML='<p class="empty-note">No students match this filter.</p>';return;}
 ids.sort((a,b)=>String(students[a]?.name||"").localeCompare(String(students[b]?.name||"")));
 root.innerHTML=ids.map(id=>{
  const s=students[id]||{},on=online(s),unlocked=Object.keys(s.unlocked||{}).filter(k=>s.unlocked[k]);
  return `<details class="student-live-row"><summary><span class="student-online-dot ${on?"online":""}"></span><span class="student-name">${esc(s.name||"Unnamed")}</span><span class="student-id">${esc(id)}</span><span class="student-page">${esc(s.classId||"No class")}</span><span class="student-seen">${s.suspended?"Suspended":on?"Online":"Offline"}</span></summary>
  <div class="student-live-detail">
   <div class="live-grid"><div><b>Name</b><span>${esc(s.name)}</span></div><div><b>Class</b><span>${esc(s.classId||"—")}</span></div><div><b>Last page</b><span>${esc(s.activity?.page||"—")}</span></div><div><b>Last seen</b><span>${timeAgo(s.activity?.at)}</span></div></div>
   <div class="admin-action-row">
    <button class="btn btn-ghost btn-sm" data-reset="${esc(id)}">Reset passcode</button>
    <button class="btn btn-ghost btn-sm" data-toggle="${esc(id)}">${s.suspended?"Activate":"Suspend"}</button>
    <button class="btn btn-danger btn-sm" data-delete-student="${esc(id)}">Delete student</button>
   </div>
   <div class="student-access-box"><strong>Unlocked lessons:</strong> ${unlocked.length?unlocked.map(esc).join(", "):"Week 1 only"}<div class="small">Use the request queue to unlock the next lesson after review.</div></div>
  </div></details>`;
 }).join("");
 document.querySelectorAll("[data-reset]").forEach(b=>b.onclick=()=>resetPasscode(b.dataset.reset));
 document.querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>toggleStudent(b.dataset.toggle));
 document.querySelectorAll("[data-delete-student]").forEach(b=>b.onclick=()=>deleteStudent(b.dataset.deleteStudent));
}
async function resetPasscode(id){
 const pass=randomPasscode();
 if(!confirm(`Reset the passcode for ${students[id]?.name||id}?\n\nNew passcode: ${pass}`))return;
 try{await update(ref(db,"students/"+id),{passcodeHash:await sha256(pass),updatedAt:Date.now()});alert(`New passcode for ${id}: ${pass}`);}
 catch(e){alert("Reset failed: "+e.message);}
}
async function toggleStudent(id){
 const s=students[id]||{},suspended=!s.suspended;
 if(!confirm(`${suspended?"Activate":"Suspend"} ${s.name||id}?`))return;
 try{await update(ref(db,"students/"+id),{suspended,active:!suspended,updatedAt:Date.now()});}catch(e){alert("Update failed: "+e.message);}
}
async function deleteStudent(id){
 if(!confirm(`Permanently delete ${students[id]?.name||id} and their course record?`))return;
 try{await remove(ref(db,"students/"+id));}catch(e){alert("Delete failed: "+e.message);}
}
onValue(ref(db,"students"),snap=>{students=snap.val()||{};renderStudents();renderRequests();populateRequestCommunications();});

// ---------- REQUESTS ----------
function previousLessonForRequest(r){
 const week=Number(r?.week||0);if(week<=1)return null;
 const prev=week-1,phase=Math.ceil(prev/4),href=`phase${phase}/week${prev}.html`,key=weekKey(href);
 return {week:prev,href,key,progress:students[r.studentId]?.progress?.[key]||r.previousProgress||null};
}
function progressText(p){if(!p)return"No saved checklist progress";const done=Number(p.completed||0),total=Number(p.total||0);return total?`${done}/${total} tasks (${Math.round(done/total*100)}%)`:"Progress not recorded";}
function requestOptions(){return Object.entries(requests).filter(([,r])=>r&&(r.status==="pending"||!r.status)).sort((a,b)=>(a[1].requestedAt||0)-(b[1].requestedAt||0));}
function populateRequestCommunications(){
 const sel=$("requestCommunicationSelect");if(!sel)return;const current=sel.value;
 sel.innerHTML='<option value="">Select a pending request…</option>'+requestOptions().map(([id,r])=>`<option value="${esc(id)}">${esc(students[r.studentId]?.name||r.studentName||"Student")} — Week ${esc(r.week)} · ${esc(r.weekTitle||"")}</option>`).join("");
 if(current&&requests[current])sel.value=current;renderRequestCommunicationContext();
}
function renderRequestCommunicationContext(){
 const box=$("requestCommunicationMeta"),id=$("requestCommunicationSelect")?.value,r=id?requests[id]:null;
 if(!r){box.hidden=true;box.innerHTML="";return;}
 const prev=previousLessonForRequest(r);
 box.hidden=false;box.innerHTML=`<strong>${esc(students[r.studentId]?.name||r.studentName||"Student")}</strong><span>ID: ${esc(r.studentId)}</span><span>Requested Week ${esc(r.week)} — ${esc(r.weekTitle||"")}</span><span>Previous lesson: Week ${esc(prev?.week||"")} · ${esc(progressText(prev?.progress))}</span>`;
}
function renderRequests(){
 const root=$("requestList");if(!root)return;
 const entries=Object.entries(requests).filter(([,r])=>r&&(r.status==="pending"||!r.status));
 $("requestCount").textContent=entries.length;
 if(!entries.length){root.innerHTML='<p class="empty-note">No pending requests.</p>';populateRequestCommunications();return;}
 root.innerHTML=entries.sort((a,b)=>(a[1].requestedAt||0)-(b[1].requestedAt||0)).map(([id,r])=>{
  const prev=previousLessonForRequest(r),s=students[r.studentId]||{};
  return `<div class="request-row"><div class="request-meta"><span class="who">${esc(s.name||r.studentName||"Student")}</span><div>ID: ${esc(r.studentId)} · ${esc(s.classId||r.classId||"")}</div><strong>Request: Week ${esc(r.week)} — ${esc(r.weekTitle||r.weekHref||"")}</strong><div>Previous: Week ${esc(prev?.week||"")} · ${esc(progressText(prev?.progress))}</div><div>Requested ${timeAgo(r.requestedAt)}</div></div><div class="request-actions"><button class="btn btn-ghost btn-sm" data-communicate="${esc(id)}">Message / Assignment</button><button class="btn btn-primary btn-sm" data-grant="${esc(id)}">Grant access</button><button class="btn btn-danger btn-sm" data-delete-request="${esc(id)}">Delete</button></div></div>`;
 }).join("");
 document.querySelectorAll("[data-grant]").forEach(b=>b.onclick=()=>grant(b.dataset.grant));
 document.querySelectorAll("[data-delete-request]").forEach(b=>b.onclick=()=>removeRequest(b.dataset.deleteRequest));
 document.querySelectorAll("[data-communicate]").forEach(b=>b.onclick=()=>{const sel=$("requestCommunicationSelect");sel.value=b.dataset.communicate;renderRequestCommunicationContext();document.querySelector('[data-tab="messages"]').click();});
 populateRequestCommunications();
}
async function createPersonalNotification(studentId,title,body,lessonHref="",requestId=""){
 const n=push(ref(db,`notifications/${studentId}`));
 await set(n,{title,body,type:"notice",lessonHref,requestId,createdAt:Date.now(),read:false});
}
async function grant(id){
 const r=requests[id];if(!r)return;
 const key=weekKey(r.weekHref);
 if(!key)return;
 if(!confirm(`Grant Week ${r.week} to ${students[r.studentId]?.name||r.studentName||"this student"}?`))return;
 try{
  await update(ref(db,`students/${r.studentId}/unlocked`),{[key]:true});
  await remove(ref(db,`students/${r.studentId}/requests/${key}`));
  await remove(ref(db,`accessRequests/${id}`));
  await createPersonalNotification(r.studentId,"Next lesson unlocked",`Week ${r.week}: ${r.weekTitle||"your next lesson"} is now unlocked. You can open it from your lesson page.`,r.weekHref,id);
 }catch(e){alert("Grant failed: "+e.message);}
}
async function removeRequest(id){
 const r=requests[id];if(!r)return;
 if(!confirm("Delete this pending request?"))return;
 try{const key=weekKey(r.weekHref);if(key)await remove(ref(db,`students/${r.studentId}/requests/${key}`));await remove(ref(db,"accessRequests/"+id));}catch(e){alert("Delete failed: "+e.message);}
}
onValue(ref(db,"accessRequests"),snap=>{requests=snap.val()||{};renderRequests();});

// ---------- LESSONS ----------
const weekUrls=Array.from({length:12},(_,i)=>`phase${Math.ceil((i+1)/4)}/week${i+1}.html`);
async function readMeta(url){
 try{const res=await fetch(url,{cache:"no-store"});if(!res.ok)return null;const html=await res.text(),doc=new DOMParser().parseFromString(html,"text/html"),tag=doc.querySelector('meta[name="week-data"]');return tag?{...JSON.parse(tag.content),href:url}:null;}catch{return null;}
}
async function loadLessonIndex(){
 lessons=(await Promise.all(weekUrls.map(readMeta))).filter(Boolean).sort((a,b)=>a.week-b.week);
 renderLessonManagement();populateLessonSelects();
}
function isDeleted(w){return settings[weekKey(w.href)]?.deleted===true;}
function renderLessonManagement(){
 const root=$("lessonManagementList");if(!root||!lessons.length)return;
 const phases={};lessons.forEach(w=>(phases[w.phase]??=[]).push(w));
 root.innerHTML=Object.entries(phases).map(([phase,ws])=>`<div class="admin-phase-block"><div class="admin-phase-heading"><span>Phase ${esc(phase)}</span><strong>${esc(ws[0].phaseTitle||`Phase ${phase}`)}</strong></div>`+
 ws.map(w=>{const st=settings[weekKey(w.href)]||{},del=st.deleted===true;return `<div class="admin-lesson-row"><div><div class="admin-lesson-title">Week ${w.week} — ${esc(w.title)}</div><div class="small">${esc(w.skills||"")}</div></div><div class="admin-lesson-controls"><span class="lesson-state ${del?"deleted":Number(w.week)===1?"open":"request"}">${del?"Deleted":Number(w.week)===1?"Open":"Request required"}</span><button class="btn btn-ghost btn-sm" data-edit-week="${esc(w.href)}">Edit</button>${Number(w.week)>1?`<button class="btn ${del?"btn-primary":"btn-danger"} btn-sm" data-delete-week="${esc(w.href)}">${del?"Restore":"Delete"}</button>`:""}</div></div>`}).join("")+"</div>").join("");
 document.querySelectorAll("[data-edit-week]").forEach(b=>b.onclick=()=>{selectedWeek=b.dataset.editWeek;$("lessonSelect").value=selectedWeek;loadOverride();});
 document.querySelectorAll("[data-delete-week]").forEach(b=>b.onclick=()=>toggleDelete(b.dataset.deleteWeek));
}
function populateLessonSelects(){
 if(!$("lessonSelect"))return;
 const options=lessons.map(w=>`<option value="${esc(w.href)}">Phase ${w.phase} — Week ${w.week} — ${esc(w.title)}</option>`).join("");
 $("lessonSelect").innerHTML=options;
 if(!selectedWeek)selectedWeek=lessons[0]?.href||"";
 $("lessonSelect").value=selectedWeek;updateEditorMeta();loadOverride();
}
$("refreshLessonsBtn")?.addEventListener("click",loadLessonIndex);
$("lessonSelect")?.addEventListener("change",e=>{selectedWeek=e.target.value;updateEditorMeta();loadOverride();});
function updateEditorMeta(){
 const w=lessons.find(x=>x.href===selectedWeek);if(!w)return;
 const st=settings[weekKey(selectedWeek)]||{};
 $("editorMeta").textContent=`Phase ${w.phase} · Week ${w.week} · ${st.deleted?"Deleted":"Active"} · ${Number(w.week)===1?"Always open":"Individual student unlock"}${st.updatedAt?" · Updated "+new Date(st.updatedAt).toLocaleString():""}`;
}
function normalizeHtml(source){
 const doc=new DOMParser().parseFromString(source,"text/html");
 let html=/<!doctype|<html[\s>]/i.test(source)?[...doc.head.querySelectorAll("style")].map(n=>n.outerHTML).join("\n")+(doc.body?.innerHTML||""):source;
 const holder=document.createElement("div");holder.innerHTML=html;
 holder.querySelectorAll("script,object,embed,iframe").forEach(n=>n.remove());
 holder.querySelectorAll("*").forEach(el=>[...el.attributes].forEach(a=>{if(/^on/i.test(a.name)||a.name==="srcdoc")el.removeAttribute(a.name);}));
 return holder.innerHTML.trim();
}
async function loadOverride(){
 if(!selectedWeek)return;
 const snap=await get(ref(db,"lessonOverrides/"+weekKey(selectedWeek))),d=snap.val();
 $("lessonHtml").value=d?.html||"";$("lessonUrl").value=d?.externalUrl||"";
 $("editorMsg").textContent=d?`Saved ${d.updatedAt?new Date(d.updatedAt).toLocaleString():""} by ${d.updatedBy||"Admin"}.`:"No Firebase override saved; original lesson file is used.";
}
$("lessonFile")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(f){$("lessonHtml").value=await f.text();$("lessonUrl").value="";$("editorMsg").textContent=`Loaded ${f.name}. Click Save HTML.`;}});
$("loadCurrentBtn")?.addEventListener("click",loadOverride);
$("saveLessonBtn")?.addEventListener("click",async()=>{
 const html=normalizeHtml($("lessonHtml").value);if(!html){$("editorMsg").textContent="Enter or upload HTML first.";return;}
 const w=lessons.find(x=>x.href===selectedWeek)||{};
 try{
  await set(ref(db,"lessonOverrides/"+weekKey(selectedWeek)),{html,externalUrl:"",weekHref:selectedWeek,weekTitle:w.title||selectedWeek,updatedAt:Date.now(),updatedBy:"Admin",enabled:true});
  await update(ref(db,"lessonSettings/"+weekKey(selectedWeek)),{deleted:false,weekHref:selectedWeek,weekTitle:w.title||selectedWeek,updatedAt:Date.now()});
  $("editorMsg").textContent="HTML lesson saved. Students receive the updated content live.";
 }catch(e){$("editorMsg").textContent="Save failed: "+e.message;}
});
$("loadLessonUrlBtn")?.addEventListener("click",async()=>{
 const url=$("lessonUrl").value.trim();if(!/^https?:\/\//i.test(url)){alert("Enter a valid http:// or https:// URL.");return;}
 const w=lessons.find(x=>x.href===selectedWeek)||{};
 try{
  await set(ref(db,"lessonOverrides/"+weekKey(selectedWeek)),{html:"",externalUrl:url,weekHref:selectedWeek,weekTitle:w.title||selectedWeek,updatedAt:Date.now(),updatedBy:"Admin",enabled:true});
  await update(ref(db,"lessonSettings/"+weekKey(selectedWeek)),{deleted:false,weekHref:selectedWeek,weekTitle:w.title||selectedWeek,updatedAt:Date.now()});
  $("lessonHtml").value="";$("editorMsg").textContent="External lesson URL saved. Students will see it embedded when permitted.";
 }catch(e){$("editorMsg").textContent="URL save failed: "+e.message;}
});
$("deleteContentBtn")?.addEventListener("click",async()=>{
 if(!selectedWeek||!confirm("Remove the Firebase override for this week?"))return;
 try{await remove(ref(db,"lessonOverrides/"+weekKey(selectedWeek)));$("lessonHtml").value="";$("lessonUrl").value="";$("editorMsg").textContent="Override removed. The original lesson file is restored.";await update(ref(db,"lessonSettings/"+weekKey(selectedWeek)),{deleted:false,updatedAt:Date.now(),updatedBy:"Admin"});}catch(e){$("editorMsg").textContent="Delete failed: "+e.message;}
});
async function toggleDelete(url){
 const w=lessons.find(x=>x.href===url);if(!w)return;
 const k=weekKey(url),del=isDeleted(w);if(!del&&!confirm(`Hide Week ${w.week} from students?`))return;
 try{await update(ref(db,"lessonSettings/"+k),{deleted:!del,weekHref:url,weekTitle:w.title,updatedAt:Date.now(),updatedBy:"Admin"});}catch(e){alert("Lesson state change failed: "+e.message);}
}
onValue(ref(db,"lessonSettings"),snap=>{settings=snap.val()||{};renderLessonManagement();updateEditorMeta();});
loadLessonIndex();

// ---------- NOTIFICATIONS / ASSIGNMENTS ----------
$("requestCommunicationSelect")?.addEventListener("change",renderRequestCommunicationContext);
function selectedCommunicationRequest(){const id=$("requestCommunicationSelect")?.value||"",r=id?requests[id]:null;if(!r||(r.status&&r.status!=="pending"))return null;return{id,r};}
$("sendNoticeBtn")?.addEventListener("click",async()=>{
 const x=selectedCommunicationRequest(),title=$("noticeTitle").value.trim(),body=$("noticeBody").value.trim();
 if(!x){$("noticeMsg").textContent="Select a pending request first.";return;}if(!title||!body){$("noticeMsg").textContent="Enter a title and message.";return;}
 try{await createPersonalNotification(x.r.studentId,title,body,x.r.weekHref,x.id);$("noticeTitle").value="";$("noticeBody").value="";$("noticeMsg").textContent="Notification sent to the requesting student.";}catch(e){$("noticeMsg").textContent="Send failed: "+e.message;}
});
$("createAssignmentBtn")?.addEventListener("click",async()=>{
 const x=selectedCommunicationRequest(),title=$("assignmentTitle").value.trim(),body=$("assignmentBody").value.trim(),due=$("assignmentDue").value;
 if(!x){$("assignmentMsg").textContent="Select a pending request first.";return;}if(!title||!body){$("assignmentMsg").textContent="Enter title and instructions.";return;}
 try{
  const id=push(ref(db,"assignments")).key;
  await set(ref(db,"assignments/"+id),{title,body,lessonHref:x.r.weekHref||"",requestedLesson:x.r.weekTitle||"",requestId:x.id,requestWeek:Number(x.r.week||0),previousWeek:Number(x.r.previousWeek||0),dueAt:due?new Date(due).getTime():0,createdAt:Date.now(),createdBy:"Admin",published:true,recipients:{[x.r.studentId]:true}});
  await createPersonalNotification(x.r.studentId,"Assignment / assessment",title,x.r.weekHref||"",x.id);
  $("assignmentTitle").value="";$("assignmentBody").value="";$("assignmentDue").value="";$("assignmentMsg").textContent="Assignment sent to the requesting student.";
 }catch(e){$("assignmentMsg").textContent="Assignment failed: "+e.message;}
});
function renderAssignments(){
 const root=$("assignmentList");if(!root)return;
 const arr=Object.entries(assignments).filter(([,a])=>a?.requestId).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
 root.innerHTML=arr.length?arr.slice(0,50).map(([id,a])=>`<div class="request-row"><div class="request-meta"><span class="who">${esc(a.title)}</span><div>${esc(a.body)}</div><div class="small">${esc(Object.keys(a.recipients||{})[0]||"")} · Week ${esc(a.requestWeek||"")}${a.dueAt?" · Due "+new Date(a.dueAt).toLocaleString():""}</div></div><div class="request-actions"><button class="btn btn-danger btn-sm" data-delete-assignment="${esc(id)}">Delete</button></div></div>`).join(""):'<p class="empty-note">No request assignments yet.</p>';
 document.querySelectorAll("[data-delete-assignment]").forEach(b=>b.onclick=async()=>{if(confirm("Delete this assignment?"))await remove(ref(db,"assignments/"+b.dataset.deleteAssignment));});
}
onValue(ref(db,"assignments"),snap=>{assignments=snap.val()||{};renderAssignments();});
