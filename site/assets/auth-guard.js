// STUDENT AUTH + LIVE PRESENCE
// Carries the existing lessonDeskStudent session from the previous login page.
// The previous page only needs to keep writing:
// sessionStorage.lessonDeskStudent = { id, name, classId }
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, update, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app = getApps().length ? getApps()[0] : initializeApp(window.FIREBASE_CONFIG);
const db = getDatabase(app);
const LOGIN_URL = window.LOGIN_URL || "/login.html";

function redirectToLogin() {
  const returnTo = location.pathname + location.search + location.hash;
  sessionStorage.setItem("lessonDeskReturnTo", returnTo);
  const q = "?next=" + encodeURIComponent(returnTo);
  sessionStorage.removeItem("lessonDeskStudent");
  location.href = LOGIN_URL + q;
}

let raw = sessionStorage.getItem("lessonDeskStudent");
if (!raw) {
  redirectToLogin();
} else {
  try {
    const local = JSON.parse(raw);
    get(ref(db, "students/" + local.id)).then(snap => {
      const rec = snap.val();
      if (!rec || rec.suspended === true || rec.active === false) {
        redirectToLogin();
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
      // A short network failure does not destroy an already validated session.
      window.currentStudent = local;
      window.AuthAPI = { db, ref, get, set, update, onValue, studentId: local.id };
      document.dispatchEvent(new CustomEvent("student-ready", { detail: local }));
    });
  } catch {
    redirectToLogin();
  }
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
  const safeName = String(student.name || "Student").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  tag.innerHTML =
    '<span style="font-size:.82rem;font-weight:700;color:var(--ink-soft);white-space:nowrap;">' + safeName + '</span>' +
    '<button type="button" id="authLogoutBtn" class="btn btn-ghost btn-sm" style="padding:6px 12px;">Log out</button>';
  nav.appendChild(tag);
  document.getElementById("authLogoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("lessonDeskStudent");
    sessionStorage.removeItem("lessonDeskReturnTo");
    location.href = LOGIN_URL;
  });
}
