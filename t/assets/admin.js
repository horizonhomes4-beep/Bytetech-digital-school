import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app = getApps().length ? getApps()[0] : initializeApp(window.FIREBASE_CONFIG);
const db = getDatabase(app);
const TIMEOUT = window.PRESENCE_TIMEOUT_MS || 45000;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

let students = {}, requests = {}, lessons = [], selectedWeek = "";

$("presenceTimeoutLabel").textContent = Math.round(TIMEOUT / 1000);

function enter() {
  onValue(ref(db, "students"), snap => {
    students = snap.val() || {};
    renderStudents();
  });
  onValue(ref(db, "accessRequests"), snap => {
    requests = snap.val() || {};
    renderRequests();
  });

  loadLessonIndex();
  setInterval(renderStudents, 4000);
}

enter();

function online(s) {
  return !!(s.activity?.at && Date.now() - Number(s.activity.at) < TIMEOUT);
}
function timeAgo(ts) {
  if (!ts) return "never";
  const seconds = Math.max(0, Math.round((Date.now() - Number(ts))/1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return seconds + "s ago";
  if (seconds < 3600) return Math.round(seconds/60) + "m ago";
  return Math.round(seconds/3600) + "h ago";
}

$("studentSearch").addEventListener("input", renderStudents);
$("studentFilter").addEventListener("change", renderStudents);

function renderStudents() {
  const q = $("studentSearch").value.trim().toLowerCase();
  const filter = $("studentFilter").value;
  const ids = Object.keys(students).filter(id => {
    const s = students[id], isOn = online(s);
    const hay = `${id} ${s.name||""} ${s.email||""} ${s.classId||""}`.toLowerCase();
    return (!q || hay.includes(q)) && (filter === "all" || (filter === "online" ? isOn : !isOn));
  });

  if (!ids.length) {
    $("studentList").innerHTML = '<p class="empty-note">No matching students.</p>';
    return;
  }

  $("studentList").innerHTML = ids.sort((a,b) => {
    const ao=online(students[a]), bo=online(students[b]);
    return Number(bo)-Number(ao) || String(students[a].name||"").localeCompare(String(students[b].name||""));
  }).map(id => {
    const s=students[id], a=s.activity||{}, isOn=online(s);
    const progress = Number.isFinite(Number(a.progress)) ? Number(a.progress) : null;
    const page = a.page || "No page reported";
    const section = a.section || "No section reported";
    const task = a.task || "";
    const pageProgress = Object.entries(s.progress||{}).map(([key,p]) =>
      `<span class="admin-progress-chip">${esc(key)}: ${Number(p.completed||0)}/${Number(p.total||0)} (${Number(p.total)?Math.round(Number(p.completed||0)/Number(p.total)*100):0}%)</span>`
    ).join(" ");
    return `<details class="student-live-row" ${isOn ? "open":""}>
      <summary>
        <span class="student-online-dot ${isOn?"online":""}"></span>
        <span class="student-name">${esc(s.name||"Unnamed")}</span>
        <span class="student-id">${esc(id)}</span>
        <span class="student-page">${esc(page)}</span>
        <span class="student-seen">${timeAgo(a.at)}</span>
      </summary>
      <div class="student-live-detail">
        <div class="live-grid">
          <div><b>Status</b><span>${isOn?"Online now":"Offline"}</span></div>
          <div><b>Class</b><span>${esc(s.classId||"—")}</span></div>
          <div><b>Current page</b><span>${esc(page)}</span></div>
          <div><b>Progress</b><span>${progress === null ? "—" : progress+"%"}</span></div>
          <div><b>Current section</b><span>${esc(section)}</span></div>
          <div><b>Current task</b><span>${esc(task || "—")}</span></div>
          <div><b>Last seen</b><span>${timeAgo(a.at)}</span></div>
        </div>
        <div style="margin-top:12px;"><b>Saved lesson progress</b><div class="admin-progress-list">${pageProgress || '<span class="small">No saved checklist progress yet.</span>'}</div></div>
      </div>
    </details>`;
  }).join("");
}

function renderRequests() {
  const ids=Object.keys(requests);
  if (!ids.length) { $("requestList").innerHTML='<p class="empty-note">No pending access requests.</p>'; return; }
  $("requestList").innerHTML=ids.sort((a,b)=>(requests[a].requestedAt||0)-(requests[b].requestedAt||0)).map(id=>{
    const r=requests[id], student=students[r.studentId]||{};
    return `<div class="request-row">
      <div class="request-meta">
        <span class="who">${esc(student.name||r.studentName||"Student")}</span>
        <div class="small">ID: ${esc(r.studentId)} · ${esc(student.classId||r.classId||"")}</div>
        <strong>${esc(r.weekTitle||r.weekHref)}</strong>
        <div>requested ${timeAgo(r.requestedAt)}</div>
      </div>
      <div class="request-actions">
        <button class="btn btn-primary btn-sm" data-grant="${esc(id)}">Grant</button>
        <button class="btn btn-danger btn-sm" data-delete-request="${esc(id)}">Delete</button>
      </div>
    </div>`;
  }).join("");

  document.querySelectorAll("[data-grant]").forEach(b=>b.onclick=()=>grant(b.dataset.grant));
  document.querySelectorAll("[data-delete-request]").forEach(b=>b.onclick=()=>removeRequest(b.dataset.deleteRequest));
}

async function grant(id) {
  const r=requests[id]; if(!r) return;
  const key=(r.weekHref||"").replace(/[.\/]/g,"_");
  try {
    await update(ref(db, `students/${r.studentId}/unlocked`), {[key]:true});
    await remove(ref(db, `students/${r.studentId}/requests/${key}`));
    await remove(ref(db, `accessRequests/${id}`));
  } catch(e) { alert("Couldn't grant access: "+e.message); }
}
async function removeRequest(id) {
  const r=requests[id]; if(!r) return;
  const key=(r.weekHref||"").replace(/[.\/]/g,"_");
  try {
    await remove(ref(db, `students/${r.studentId}/requests/${key}`));
    await remove(ref(db, `accessRequests/${id}`));
  } catch(e) { alert("Couldn't delete request: "+e.message); }
}

// ---------------- lesson editor ----------------
const weekUrls=Array.from({length:12},(_,i)=>`phase${Math.ceil((i+1)/4)}/week${i+1}.html`);
async function readMeta(url) {
  try {
    const res=await fetch(url,{cache:"no-store"}), html=await res.text();
    const doc=new DOMParser().parseFromString(html,"text/html");
    const tag=doc.querySelector('meta[name="week-data"]');
    if(!tag) return null;
    return {...JSON.parse(tag.content),href:url};
  } catch { return null; }
}
async function loadLessonIndex() {
  lessons=(await Promise.all(weekUrls.map(readMeta))).filter(Boolean);
  $("lessonSelect").innerHTML=lessons.map(w=>`<option value="${esc(w.href)}">Week ${w.week} — ${esc(w.title)}</option>`).join("");
  selectedWeek=lessons[0]?.href||"";
  $("lessonSelect").value=selectedWeek;
  updateEditorMeta();
  await loadOverride();
}
$("lessonSelect").addEventListener("change",async e=>{selectedWeek=e.target.value;updateEditorMeta();await loadOverride();});
$("loadCurrentBtn").addEventListener("click",loadOverride);
$("lessonFile").addEventListener("change", async e=>{
  const file=e.target.files?.[0]; if(!file) return;
  $("lessonHtml").value=await file.text();
  $("editorMsg").textContent=`Loaded ${file.name}. Review it, then save.`;
});
$("saveLessonBtn").addEventListener("click",saveOverride);
$("deleteOverrideBtn").addEventListener("click",deleteOverride);

function weekKey(url){return url.replace(/[.\/]/g,"_");}
function updateEditorMeta(){
  const w=lessons.find(x=>x.href===selectedWeek);
  $("editorMeta").textContent=w?`Phase ${w.phase} · ${w.status} · ${w.skills}`:"";
}
function normalizeHtml(source){
  const parser=new DOMParser();
  const doc=parser.parseFromString(source,"text/html");
  let html=source;
  if(/<html[\s>]|<!doctype/i.test(source)) {
    const styles=[...doc.head.querySelectorAll("style")].map(n=>n.outerHTML).join("\n");
    html=styles+(doc.body?.innerHTML||"");
  }
  // Prevent pasted lesson code from executing scripts in the student page.
  const holder=document.createElement("div"); holder.innerHTML=html;
  holder.querySelectorAll("script").forEach(n=>n.remove());
  holder.querySelectorAll("*").forEach(el=>[...el.attributes].forEach(a=>{if(/^on/i.test(a.name))el.removeAttribute(a.name);}));
  return holder.innerHTML.trim();
}
async function loadOverride(){
  if(!selectedWeek) return;
  const snap=await get(ref(db,`lessonOverrides/${weekKey(selectedWeek)}`));
  const data=snap.val();
  $("lessonHtml").value=data?.html||"";
  $("editorMsg").textContent=data ? `Existing override saved ${data.updatedAt ? new Date(data.updatedAt).toLocaleString():""}.` : "No Firebase override for this lesson; the original file is still active.";
}
async function saveOverride(){
  if(!selectedWeek) return;
  const html=normalizeHtml($("lessonHtml").value);
  if(!html) return $("editorMsg").textContent="Enter or upload lesson HTML first.";
  const meta=lessons.find(x=>x.href===selectedWeek)||{};
  try{
    await set(ref(db,`lessonOverrides/${weekKey(selectedWeek)}`),{
      html, weekHref:selectedWeek, weekTitle:meta.title||selectedWeek,
      updatedAt:Date.now(), updatedBy:"Admin", enabled:true
    });
    $("editorMsg").textContent="Lesson saved. Students already on the page will receive the update automatically.";
  }catch(e){$("editorMsg").textContent="Save failed: "+e.message;}
}
async function deleteOverride(){
  if(!selectedWeek) return;
  if(!confirm("Remove the Firebase override and return this lesson to its original HTML file?")) return;
  try{
    await remove(ref(db,`lessonOverrides/${weekKey(selectedWeek)}`));
    $("lessonHtml").value="";
    $("editorMsg").textContent="Override removed. The original lesson file is active again.";
  }catch(e){$("editorMsg").textContent="Delete failed: "+e.message;}
}
