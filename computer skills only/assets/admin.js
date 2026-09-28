import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, update, remove, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app = getApps().length ? getApps()[0] : initializeApp(window.FIREBASE_CONFIG);
const db = getDatabase(app);
const TIMEOUT = window.PRESENCE_TIMEOUT_MS || 45000;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

let students = {}, requests = {}, assignments = {}, settings = {}, lessons = [], selectedWeek = "";

$("presenceTimeoutLabel")?.remove();

document.querySelectorAll(".admin-tab").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".admin-tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".admin-tab-panel").forEach(x=>x.hidden=true);
  btn.classList.add("active");
  $("tab-"+btn.dataset.tab).hidden=false;
}));

onValue(ref(db,"students"), snap => {
  students=snap.val()||{}; renderStudents(); renderRequests(); populateRequestCommunications();
});
onValue(ref(db,"accessRequests"), snap => { requests=snap.val()||{}; renderRequests(); });
onValue(ref(db,"lessonSettings"), snap => { settings=snap.val()||{}; renderLessonManagement(); updateEditorMeta(); });
onValue(ref(db,"assignments"), snap => { assignments=snap.val()||{}; renderAssignments(); });

$("studentSearch")?.addEventListener("input",renderStudents);
$("studentFilter")?.addEventListener("change",renderStudents);
$("refreshLessonsBtn")?.addEventListener("click",loadLessonIndex);
$("lessonSelect")?.addEventListener("change",async e=>{selectedWeek=e.target.value; updateEditorMeta(); await loadOverride();});
$("loadCurrentBtn")?.addEventListener("click",loadOverride);
$("lessonFile")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(f){$("lessonHtml").value=await f.text();$("editorMsg").textContent=`Loaded ${f.name}. Review it, then save.`;}});
$("saveLessonBtn")?.addEventListener("click",saveLesson);
$("deleteContentBtn")?.addEventListener("click",deleteLessonContent);
$("sendNoticeBtn")?.addEventListener("click",sendNotification);
$("createAssignmentBtn")?.addEventListener("click",createAssignment);
$("requestCommunicationSelect")?.addEventListener("change",renderRequestCommunicationContext);

function online(s){return !!(s.activity?.at && Date.now()-Number(s.activity.at)<TIMEOUT);}
function timeAgo(ts){if(!ts)return"never";const n=Math.max(0,Math.round((Date.now()-Number(ts))/1000));if(n<5)return"just now";if(n<60)return n+"s ago";if(n<3600)return Math.round(n/60)+"m ago";return Math.round(n/3600)+"h ago";}

function renderStudents(){
  const root=$("studentList"); if(!root)return;
  const q=$("studentSearch")?.value.trim().toLowerCase()||"", filter=$("studentFilter")?.value||"all";
  const ids=Object.keys(students).filter(id=>{const s=students[id]||{},on=online(s),hay=`${id} ${s.name||""} ${s.email||""} ${s.classId||""}`.toLowerCase();return(!q||hay.includes(q))&&(filter==="all"||(filter==="online"?on:!on));});
  if(!ids.length){root.innerHTML='<p class="empty-note">No matching students.</p>';return;}
  root.innerHTML=ids.sort((a,b)=>Number(online(students[b]))-Number(online(students[a]))||String(students[a].name||"").localeCompare(String(students[b].name||""))).map(id=>{
    const s=students[id]||{},a=s.activity||{}, on=online(s);
    const progress=Number.isFinite(Number(a.progress))?Number(a.progress):null;
    const chips=Object.entries(s.progress||{}).map(([k,p])=>`<span class="admin-progress-chip">${esc(k)}: ${Number(p.completed||0)}/${Number(p.total||0)}</span>`).join(" ");
    return `<details class="student-live-row" ${on?"open":""}><summary><span class="student-online-dot ${on?"online":""}"></span><span class="student-name">${esc(s.name||"Unnamed")}</span><span class="student-id">${esc(id)}</span><span class="student-page">${esc(a.page||"No page reported")}</span><span class="student-seen">${timeAgo(a.at)}</span></summary>
    <div class="student-live-detail"><div class="live-grid">
      <div><b>Status</b><span>${on?"Online now":"Offline"}</span></div><div><b>Class</b><span>${esc(s.classId||"—")}</span></div>
      <div><b>Current page</b><span>${esc(a.page||"—")}</span></div><div><b>Progress</b><span>${progress===null?"—":progress+"%"}</span></div>
      <div><b>Section</b><span>${esc(a.section||"—")}</span></div><div><b>Last seen</b><span>${timeAgo(a.at)}</span></div>
    </div><div style="margin-top:12px"><b>Saved progress</b><div class="admin-progress-list">${chips||'<span class="small">No saved progress yet.</span>'}</div></div></div></details>`;
  }).join("");
}
setInterval(renderStudents,4000);

function previousLessonForRequest(r){
 const week=Number(r?.week||0);
 if(week<=1)return null;
 const prev=week-1,phase=Math.ceil(prev/4);
 const href=`phase${phase}/week${prev}.html`;
 const key=href.replace(/[.\/]/g,"_");
 return {week:prev,href,key,title:`Week ${prev}`,progress:students[r.studentId]?.progress?.[key]||r.previousProgress||null};
}
function progressText(progress){
 if(!progress)return "No saved checklist progress";
 const done=Number(progress.completed||0),total=Number(progress.total||0);
 return total?`${done}/${total} tasks (${Math.round(done/total*100)}%)`:"Progress not recorded";
}
function requestOptions(){
 return Object.entries(requests)
   .filter(([,r])=>r?.status==="pending" || !r?.status)
   .sort((a,b)=>(a[1].requestedAt||0)-(b[1].requestedAt||0));
}
function populateRequestCommunications(){
 const sel=$("requestCommunicationSelect");if(!sel)return;
 const current=sel.value;
 const opts=requestOptions().map(([id,r])=>{
   const s=students[r.studentId]||{};
   return `<option value="${esc(id)}">${esc(s.name||r.studentName||"Student")} — Week ${esc(r.week||"")} · ${esc(r.weekTitle||r.weekHref||"")}</option>`;
 }).join("");
 sel.innerHTML='<option value="">Select a pending request…</option>'+opts;
 if(current && requests[current] && (requests[current].status==="pending" || !requests[current].status))sel.value=current;
 renderRequestCommunicationContext();
}
function renderRequestCommunicationContext(){
 const box=$("requestCommunicationMeta"),id=$("requestCommunicationSelect")?.value;
 if(!box)return;
 const r=id?requests[id]:null;
 if(!r){box.hidden=true;box.innerHTML="";return;}
 const s=students[r.studentId]||{},prev=previousLessonForRequest(r);
 box.hidden=false;
 box.innerHTML=`<strong>${esc(s.name||r.studentName||"Student")}</strong>
   <span>Student ID: ${esc(r.studentId)}</span>
   <span>Requested: <strong>Week ${esc(r.week||"")} — ${esc(r.weekTitle||"")}</strong></span>
   <span>Previous lesson: <strong>Week ${esc(prev?.week||"")} · ${esc(prev?.href||"")}</strong> · Saved progress: <strong>${esc(progressText(prev?.progress))}</strong></span>
   <span class="request-context-note">Use this area to check understanding. You can send a practical project/assessment before granting access.</span>`;
}
function renderRequests(){
 const root=$("requestList");if(!root)return;
 const entries=Object.entries(requests).filter(([,r])=>r?.status==="pending" || !r?.status);
 $("requestCount").textContent=entries.length;
 if(!entries.length){root.innerHTML='<p class="empty-note">No pending next-lesson requests.</p>';populateRequestCommunications();return;}
 root.innerHTML=entries.sort((a,b)=>(a[1].requestedAt||0)-(b[1].requestedAt||0)).map(([id,r])=>{
   const s=students[r.studentId]||{},prev=previousLessonForRequest(r);
   return `<div class="request-row">
     <div class="request-meta">
       <span class="who">${esc(s.name||r.studentName||"Student")}</span>
       <div class="small">ID: ${esc(r.studentId)} · ${esc(s.classId||r.classId||"")}</div>
       <strong>Next lesson: Week ${esc(r.week||"")} — ${esc(r.weekTitle||r.weekHref||"")}</strong>
       <div>Previous lesson: Week ${esc(prev?.week||"")} · Progress: <strong>${esc(progressText(prev?.progress))}</strong></div>
       <div>Requested ${timeAgo(r.requestedAt)}</div>
     </div>
     <div class="request-actions">
       <button class="btn btn-ghost btn-sm" data-communicate-request="${esc(id)}">Message / Project</button>
       <button class="btn btn-primary btn-sm" data-grant="${esc(id)}">Grant access</button>
       <button class="btn btn-danger btn-sm" data-delete-request="${esc(id)}">Delete</button>
     </div>
   </div>`;
 }).join("");
 document.querySelectorAll("[data-grant]").forEach(b=>b.onclick=()=>grant(b.dataset.grant));
 document.querySelectorAll("[data-delete-request]").forEach(b=>b.onclick=()=>removeRequest(b.dataset.deleteRequest));
 document.querySelectorAll("[data-communicate-request]").forEach(b=>b.onclick=()=>{
   const sel=$("requestCommunicationSelect");
   if(sel){sel.value=b.dataset.communicateRequest;renderRequestCommunicationContext();}
   document.querySelector('[data-tab="messages"]')?.click();
   $("requestCommunicationSelect")?.focus();
 });
 populateRequestCommunications();
}
async function grant(id){
 const r=requests[id];if(!r)return;
 const key=weekKey(r.weekHref||"");
 if(!key){alert("This request does not contain a valid lesson path.");return;}
 try{
   await update(ref(db,`students/${r.studentId}/unlocked`),{[key]:true});
   await remove(ref(db,`students/${r.studentId}/requests/${key}`));
   await remove(ref(db,`accessRequests/${id}`));
   await createPersonalNotification(
     r.studentId,
     "Next lesson access granted",
     `Your request for Week ${r.week||""}: ${r.weekTitle||"the requested lesson"} has been approved. Continue carefully and understand this lesson before requesting the next one.`,
     r.weekHref||"",
     id
   );
 }catch(e){alert("Couldn't grant access: "+e.message);}
}
async function removeRequest(id){
 const r=requests[id];if(!r)return;
 const key=weekKey(r.weekHref||"");
 try{
   if(key)await remove(ref(db,`students/${r.studentId}/requests/${key}`));
   await remove(ref(db,`accessRequests/${id}`));
 }catch(e){alert("Couldn't delete request: "+e.message);}
}

const weekUrls=Array.from({length:12},(_,i)=>`phase${Math.ceil((i+1)/4)}/week${i+1}.html`);
async function readMeta(url){
 try{const res=await fetch(url,{cache:"no-store"});const html=await res.text();const doc=new DOMParser().parseFromString(html,"text/html");const tag=doc.querySelector('meta[name="week-data"]');if(!tag)return null;return {...JSON.parse(tag.content),href:url};}catch{return null;}
}
async function loadLessonIndex(){
 lessons=(await Promise.all(weekUrls.map(readMeta))).filter(Boolean).sort((a,b)=>a.week-b.week);
 renderLessonManagement(); populateLessonSelects();
}
loadLessonIndex();

function weekKey(url){return String(url||"").replace(/[.\/]/g,"_");}
function isOpen(w){return Number(w.week)===1;}
function isDeleted(w){return settings[weekKey(w.href)]?.deleted===true;}

function renderLessonManagement(){
 const root=$("lessonManagementList");if(!root||!lessons.length)return;
 const phases={}; lessons.forEach(w=>(phases[w.phase]??=[]).push(w));
 root.innerHTML=Object.entries(phases).map(([phase,ws])=>{
  const phaseTitle=ws[0].phaseTitle||`Phase ${phase}`;
  return `<div class="admin-phase-block"><div class="admin-phase-heading"><span>Phase ${esc(phase)}</span><strong>${esc(phaseTitle)}</strong></div>`+
  ws.map(w=>{
   const k=weekKey(w.href),st=settings[k]||{},open=isOpen(w),del=isDeleted(w);
   return `<div class="admin-lesson-row"><div><div class="admin-lesson-title">Week ${w.week} — ${esc(w.title)}</div><div class="small">Phase ${w.phase} · ${esc(w.skills||"")}</div></div>
   <div class="admin-lesson-controls"><span class="lesson-state ${del?"deleted":open?"open":"request"}">${del?"Deleted":open?"Open to students":"Request required"}</span>
   <button class="btn btn-ghost btn-sm" data-edit-week="${esc(w.href)}">Edit</button>
   ${Number(w.week)===1?'<span class="small">Always open</span>':`<span class="small lesson-request-only">Individual request required</span>
   <button class="btn ${del?"btn-primary":"btn-danger"} btn-sm" data-delete-week="${esc(w.href)}">${del?"Restore":"Delete"}</button>`}
   </div></div>`;
  }).join("")+"</div>";
 });
 document.querySelectorAll("[data-edit-week]").forEach(b=>b.onclick=()=>{selectedWeek=b.dataset.editWeek;$("lessonSelect").value=selectedWeek;updateEditorMeta();loadOverride();});
 document.querySelectorAll("[data-delete-week]").forEach(b=>b.onclick=()=>toggleDelete(b.dataset.deleteWeek));
}
async function toggleDelete(url){
 const w=lessons.find(x=>x.href===url);if(!w)return;
 const k=weekKey(url),del=isDeleted(w);
 if(!del&&!confirm(`Delete Week ${w.week} lesson from the student view? You can restore it later.`))return;
 try{await update(ref(db,`lessonSettings/${k}`),{deleted:!del,weekHref:url,weekTitle:w.title,updatedAt:Date.now(),updatedBy:"Admin"});}
 catch(e){alert("Lesson change failed: "+e.message);}
}
function populateLessonSelects(){
 const options=lessons.map(w=>`<option value="${esc(w.href)}">Phase ${w.phase} — Week ${w.week} — ${esc(w.title)}</option>`).join("");
 $("lessonSelect").innerHTML=options; $("noticeLesson").innerHTML='<option value="">No lesson</option>'+options; $("assignmentLesson").innerHTML='<option value="">No lesson</option>'+options;
 if(!selectedWeek)selectedWeek=lessons[0]?.href||""; $("lessonSelect").value=selectedWeek; updateEditorMeta(); loadOverride();
}
function updateEditorMeta(){
 const w=lessons.find(x=>x.href===selectedWeek);if(!w)return;
 const st=settings[weekKey(selectedWeek)]||{};
 $("editorMeta").textContent=`Phase ${w.phase} · Week ${w.week} · ${isDeleted(w)?"Deleted":"Active"} · ${isOpen(w)?"Week 1 is open":"Individual request required"} · ${st.updatedAt?"Setting updated "+new Date(st.updatedAt).toLocaleString():""}`;
}
function normalizeHtml(source){
 const doc=new DOMParser().parseFromString(source,"text/html");
 let html=/<!doctype|<html[\s>]/i.test(source)?[...doc.head.querySelectorAll("style")].map(n=>n.outerHTML).join("\n")+(doc.body?.innerHTML||""):source;
 const holder=document.createElement("div");holder.innerHTML=html;
 holder.querySelectorAll("script,iframe,object,embed").forEach(n=>n.remove());
 holder.querySelectorAll("*").forEach(el=>[...el.attributes].forEach(a=>{if(/^on/i.test(a.name)||a.name==="srcdoc")el.removeAttribute(a.name);}));
 return holder.innerHTML.trim();
}
async function loadOverride(){
 if(!selectedWeek)return; const snap=await get(ref(db,`lessonOverrides/${weekKey(selectedWeek)}`));const d=snap.val();
 $("lessonHtml").value=d?.html||"";$("editorMsg").textContent=d?`Saved ${d.updatedAt?new Date(d.updatedAt).toLocaleString():""} by ${d.updatedBy||"Admin"}.`:"No Firebase lesson content saved yet. The original lesson file will be used.";
}
async function saveLesson(){
 if(!selectedWeek)return;const html=normalizeHtml($("lessonHtml").value);if(!html){$("editorMsg").textContent="Enter or upload lesson HTML first.";return;}
 const w=lessons.find(x=>x.href===selectedWeek)||{};
 try{await set(ref(db,`lessonOverrides/${weekKey(selectedWeek)}`),{html,weekHref:selectedWeek,weekTitle:w.title||selectedWeek,updatedAt:Date.now(),updatedBy:"Admin",enabled:true});
 await update(ref(db,`lessonSettings/${weekKey(selectedWeek)}`),{deleted:false,weekHref:selectedWeek,weekTitle:w.title||selectedWeek,updatedAt:Date.now()});
 $("editorMsg").textContent="Lesson saved successfully. Students receive it live from Firebase.";
 }catch(e){$("editorMsg").textContent="Save failed: "+e.message;}
}
async function deleteLessonContent(){
 if(!selectedWeek)return;if(!confirm("Delete the Firebase lesson content for this week? The original HTML will remain as the fallback unless the week is also marked Deleted."))return;
 try{await remove(ref(db,`lessonOverrides/${weekKey(selectedWeek)}`));await update(ref(db,`lessonSettings/${weekKey(selectedWeek)}`),{deleted:true,updatedAt:Date.now(),updatedBy:"Admin"});$("lessonHtml").value="";$("editorMsg").textContent="Lesson content deleted and the week is hidden from students."; }catch(e){$("editorMsg").textContent="Delete failed: "+e.message;}
}

function selectedCommunicationRequest(){
 const id=$("requestCommunicationSelect")?.value||"";
 const r=id?requests[id]:null;
 if(!r || (r.status && r.status!=="pending"))return null;
 return {id,r,student:students[r.studentId]||{}};
}
async function createPersonalNotification(studentId,title,body,lessonHref="",requestId=""){
 const n=push(ref(db,`notifications/${studentId}`));
 await set(n,{title,body,type:"notice",lessonHref,requestId:requestId||"",createdAt:Date.now(),read:false});
}
async function sendNotification(){
 const selected=selectedCommunicationRequest();
 const title=$("noticeTitle").value.trim(),body=$("noticeBody").value.trim();
 if(!selected){$("noticeMsg").textContent="Select a pending next-lesson request first.";return;}
 if(!title||!body){$("noticeMsg").textContent="Enter a title and message.";return;}
 const {id,r}=selected;
 try{
   await createPersonalNotification(r.studentId,title,body,r.weekHref||"",id);
   $("noticeTitle").value="";$("noticeBody").value="";
   $("noticeMsg").textContent=`Notification sent to ${r.studentName||students[r.studentId]?.name||"the requester"} only.`;
 }catch(e){$("noticeMsg").textContent="Send failed: "+e.message;}
}
async function createAssignment(){
 const selected=selectedCommunicationRequest();
 const title=$("assignmentTitle").value.trim(),body=$("assignmentBody").value.trim(),due=$("assignmentDue").value;
 if(!selected){$("assignmentMsg").textContent="Select a pending next-lesson request first.";return;}
 if(!title||!body){$("assignmentMsg").textContent="Enter a project title and instructions.";return;}
 const {id,r}=selected;
 try{
  const assignmentId=push(ref(db,"assignments")).key;
  const a={
    title,body,
    lessonHref:r.weekHref||"",
    requestedLesson:r.weekTitle||"",
    requestId:id,
    requestWeek:Number(r.week||0),
    previousWeek:Number(r.previousWeek||0),
    dueAt:due?new Date(due).getTime():0,
    createdAt:Date.now(),createdBy:"Admin",published:true,
    recipients:{[r.studentId]:true}
  };
  await set(ref(db,`assignments/${assignmentId}`),a);
  await createPersonalNotification(r.studentId,"Project / assessment for your next-lesson request",title,r.weekHref||"",id);
  $("assignmentTitle").value="";$("assignmentBody").value="";$("assignmentDue").value="";
  $("assignmentMsg").textContent="Project sent to the requesting student only. Review it before granting access.";
 }catch(e){$("assignmentMsg").textContent="Publish failed: "+e.message;}
}
function renderAssignments(){
 const root=$("assignmentList");if(!root)return;
 const arr=Object.entries(assignments)
   .filter(([,a])=>a?.requestId)
   .sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
 if(!arr.length){root.innerHTML='<p class="empty-note">No request-specific projects yet.</p>';return;}
 root.innerHTML=arr.slice(0,30).map(([id,a])=>{
   const recipient=Object.keys(a.recipients||{})[0]||"";
   const student=students[recipient]||{};
   return `<div class="request-row"><div class="request-meta">
     <span class="who">${esc(a.title)}</span>
     <div>${esc(a.body)}</div>
     <div class="small">${esc(student.name||recipient)} · Request ${esc(a.requestId)} · Week ${esc(a.requestWeek||"")}${a.dueAt?` · Due ${new Date(a.dueAt).toLocaleString()}`:""}</div>
   </div><div class="request-actions"><button class="btn btn-danger btn-sm" data-delete-assignment="${esc(id)}">Delete</button></div></div>`;
 }).join("");
 document.querySelectorAll("[data-delete-assignment]").forEach(b=>b.onclick=async()=>{
   if(confirm("Delete this request-specific project?"))await remove(ref(db,`assignments/${b.dataset.deleteAssignment}`));
 });
}
