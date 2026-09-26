// OPTIONAL STUDENT SESSION + LIVE PRESENCE
// The Practical PC Skills pages do NOT have their own login page.
// They reuse the existing login session already stored by the main school login:
// sessionStorage.lessonDeskStudent = { id, name, classId }
// If no session exists, the public course pages remain open.
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, update, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app = getApps().length ? getApps()[0] : initializeApp(window.FIREBASE_CONFIG);
const db = getDatabase(app);

let raw = null;
try { raw = sessionStorage.getItem("lessonDeskStudent"); } catch {}

// No login redirect here. The existing browser login is the only login.
// This site simply uses it when it is present.
if (raw) {
  try {
    const local = JSON.parse(raw);
    if (local && local.id) {
      get(ref(db, "students/" + local.id)).then(snap => {
        const rec = snap.val();

        // If Firebase cannot validate the saved student, leave the public page open.
        // Do not redirect to a nonexistent /login.html page.
        if (!rec || rec.suspended === true || rec.active === false) {
          window.currentStudent = local;
          window.AuthAPI = { db, ref, get, set, update, onValue, studentId: local.id };
          document.dispatchEvent(new CustomEvent("student-ready", { detail: local }));
          return;
        }

        window.currentStudent = {
          id: local.id,
          name: rec.name || local.name || "Student",
          classId: rec.classId || local.classId || "",
          unlocked: rec.unlocked || {}
        };

        window.AuthAPI = {
          db, ref, get, set, update, onValue,
          studentId: local.id
        };

        renderAuthTag(window.currentStudent);
        startPresence(local.id);
        watchUnlocks(local.id);
        document.dispatchEvent(new CustomEvent("student-ready", { detail: window.currentStudent }));
      }).catch(() => {
        // Keep the existing browser session usable during a temporary Firebase failure.
        window.currentStudent = local;
        window.AuthAPI = { db, ref, get, set, update, onValue, studentId: local.id };
        document.dispatchEvent(new CustomEvent("student-ready", { detail: local }));
      });
    }
  } catch {}
}

function startPresence(studentId) {
  const activityRef = ref(db, "students/" + studentId + "/activity");
  const beat = () => {
    const extra = window.lessonActivity || {};
    update(activityRef, {
      page: document.title,
      href: location.pathname.replace(/^\//, ""),
      section: extra.section || "",
      task: extra.task || "",
      progress: Number.isFinite(extra.progress) ? extra.progress : null,
      at: Date.now()
    }).catch(() => {});
  };

  window.lessonHeartbeat = beat;
  beat();
  const interval = setInterval(beat, 12000);
  window.addEventListener("beforeunload", () => clearInterval(interval));
  try { onDisconnect(ref(db, "students/" + studentId + "/activity/at")).set(0); } catch {}
}

function watchUnlocks(studentId) {
  onValue(ref(db, "students/" + studentId + "/unlocked"), snap => {
    if (!window.currentStudent) return;
    window.currentStudent.unlocked = snap.val() || {};
    document.dispatchEvent(new CustomEvent("unlocks-changed", { detail: window.currentStudent.unlocked }));
  });
}

function renderAuthTag(student) {
  const nav = document.querySelector(".site-nav .wrap");
  if (!nav || document.getElementById("authTag")) return;
  const tag = document.createElement("div");
  tag.id = "authTag";
  tag.style.cssText = "display:flex;align-items:center;gap:8px;margin-left:8px;";
  const safeName = String(student.name || "Student").replace(/[&<>\"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  tag.innerHTML =
    '<span style="font-size:.82rem;font-weight:700;color:var(--ink-soft);white-space:nowrap;">' + safeName + '</span>' +
    '<button type="button" id="authLogoutBtn" class="btn btn-ghost btn-sm" style="padding:6px 12px;">Log out</button>';
  nav.appendChild(tag);
  document.getElementById("authLogoutBtn").addEventListener("click", () => {
    try { sessionStorage.removeItem("lessonDeskStudent"); } catch {}
    try { sessionStorage.removeItem("lessonDeskReturnTo"); } catch {}
    location.reload();
  });
}
