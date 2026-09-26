// LESSON RUNTIME
// Handles access gating and live admin-edited lesson overrides.
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app = getApps().length ? getApps()[0] : initializeApp(window.FIREBASE_CONFIG);
const db = getDatabase(app);
const body = document.body;
const href = body.dataset.weekHref || "";
const weekKey = href.replace(/[.\/]/g, "_");
const metaTag = document.querySelector('meta[name="week-data"]');
let meta = {};
try { meta = metaTag ? JSON.parse(metaTag.content) : {}; } catch {}
window.LESSON_META = meta;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function showMessage(kind, title, text) {
  let box = document.getElementById("lessonAccessBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "lessonAccessBox";
    const host = document.getElementById("lessonOverrideHost") || document.querySelector("header") || body.firstElementChild;
    host.insertAdjacentElement("afterend", box);
  }
  box.className = "lesson-access-box " + kind;
  box.innerHTML = "<strong>" + esc(title) + "</strong><p>" + esc(text) + "</p>";
}

function applyHtml(html, sourceLabel) {
  const host = document.getElementById("lessonOverrideHost");
  const original = document.getElementById("lessonOriginalContent");
  if (!host) return;

  if (html) {
    host.innerHTML =
      '<div class="lesson-live-edit-banner"><span>Admin-updated lesson</span><small>' + esc(sourceLabel || "Updated content") + '</small></div>' +
      '<div class="lesson-admin-content" data-readable>' + html + '</div>';
    host.hidden = false;
    if (original) original.hidden = true;
  } else {
    host.innerHTML = "";
    host.hidden = true;
    if (original) original.hidden = false;
  }
}

function loadOverride(student) {
  const overrideRef = ref(db, "lessonOverrides/" + weekKey);
  onValue(overrideRef, snap => {
    const override = snap.val();
    const unlocked = !!(student && student.unlocked && student.unlocked[weekKey]);

    if (override && override.enabled !== false && (meta.status === "live" || override.status === "live" || unlocked)) {
      applyHtml(override.html || "", override.updatedAt ? new Date(override.updatedAt).toLocaleString() : "Admin update");
      document.body.dataset.lessonStatus = "live";
      return;
    }

    // A pending lesson is visible as a topic page, but its actual lesson content is locked.
    if (meta.status === "pending" && !unlocked) {
      const original = document.getElementById("lessonOriginalContent");
      if (original) original.hidden = true;
      const host = document.getElementById("lessonOverrideHost");
      if (host) host.hidden = true;
      const requestRoot = document.getElementById("requestAccessRoot");
      if (requestRoot) {
        requestRoot.closest("section")?.removeAttribute("hidden");
      }
      showMessage("locked", "Lesson locked", "This lesson is not available to you yet. Use the access request below. Your admin will see the request and can unlock this lesson for your account.");
    } else {
      const box = document.getElementById("lessonAccessBox");
      if (box) box.remove();
      applyHtml("", "");
    }
  }, { onlyOnce: false });
}

function init(student) {
  window.lessonWeekKey = weekKey;
  window.lessonActivity = window.lessonActivity || {};
  if (window.AuthAPI && student) {
    const journeyRef = ref(db, "students/" + student.id + "/journey/" + weekKey);
    get(journeyRef).then(snap => {
      const old = snap.val() || {};
      return update(journeyRef, {
          studentId: student.id,
          studentName: student.name || "",
          weekHref: href,
          weekTitle: meta.title || document.title,
          firstOpenedAt: old.firstOpenedAt || Date.now(),
          lastOpenedAt: Date.now()
        });
    }).catch(() => {});
  }
  loadOverride(student);
  if (window.lessonHeartbeat) window.lessonHeartbeat();
}

document.addEventListener("student-ready", e => init(e.detail));
document.addEventListener("unlocks-changed", e => {
  if (window.currentStudent) loadOverride(window.currentStudent);
});
