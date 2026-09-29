// ===== 1. PASTE YOUR FIREBASE WEB CONFIG HERE (Firebase Console > Project settings > Your apps) =====
const firebaseConfig = {
  apiKey: "AIzaSyB78-XIa4cPsOAQMWefhzGYkMGAlwNtJx8",
  authDomain: "set-3-6e04d.firebaseapp.com",
  databaseURL: "https://set-3-6e04d-default-rtdb.firebaseio.com",
  projectId: "set-3-6e04d",
  storageBucket: "set-3-6e04d.firebasestorage.app",
  messagingSenderId: "906900598918",
  appId: "1:906900598918:web:bf83e8df4f13147fe02107"
};
let dbRoot, studentsRef, certRequestsRef, CONFIG_ERROR = "";

if (Object.values(firebaseConfig).some(v => String(v).includes("YOUR_"))) {
  CONFIG_ERROR = "Firebase config in config.js still has placeholder values (YOUR_API_KEY etc). Paste your real config from Firebase Console → Project settings → your web app.";
} else {
  try {
    firebase.initializeApp(firebaseConfig);
    dbRoot = firebase.database();
    studentsRef = dbRoot.ref("students");
    certRequestsRef = dbRoot.ref("certRequests");
  } catch (e) {
    CONFIG_ERROR = "Firebase failed to start: " + e.message;
  }
}

function showConfigError(msg) {
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99;background:#ff6b7d;color:#fff;padding:12px 16px;font:14px system-ui;text-align:center";
  d.textContent = "⚠ " + msg;
  document.body.prepend(d);
}
if (CONFIG_ERROR) document.addEventListener("DOMContentLoaded", () => showConfigError(CONFIG_ERROR));

const money = n => "₦" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = d => { const x = new Date(d + "T00:00:00"); return isNaN(x) ? "-" : x.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }); };
const durMonths = (s, e) => { const d = (new Date(e) - new Date(s)) / 864e5 + 1; return d > 0 ? Math.round(d / 30.4375 * 10) / 10 : 0; };
const balanceOf = s => Math.max(0, Number(s.fee || 0) - Number(s.paid || 0));
const totals = list => list.reduce((a, s) => { a.paid += +s.paid || 0; a.bal += balanceOf(s); return a; }, { paid: 0, bal: 0 });

// Countdown to end of the end date, using the device's own clock
function countdownHTML(end) {
  const ms = new Date(end + "T23:59:59") - new Date();
  if (isNaN(ms)) return '<span class="cd-end">—</span>';
  if (ms <= 0) return '<span class="cd-end">Course ended</span>';
  const s = Math.floor(ms / 1000), p = n => String(n).padStart(2, "0");
  const u = [[Math.floor(s / 86400), "Days"], [p(Math.floor(s % 86400 / 3600)), "Hrs"], [p(Math.floor(s % 3600 / 60)), "Min"], [p(s % 60), "Sec"]];
  return u.map(x => `<div class="cd"><b>${x[0]}</b><small>${x[1]}</small></div>`).join("");
}

function watchConnection(el) {
  dbRoot.ref(".info/connected").on("value", sn => {
    el.className = "conn " + (sn.val() ? "on" : "off");
    el.textContent = sn.val() ? "Live" : "Offline";
  });
}

// Certificate status for a student record
function certStatus(s) {
  if (!s.certEligible) return { label: "Not applicable", cls: "b-mu" };
  if (s.certCollected) return { label: "Collected", cls: "b-ok" };
  if (s.certRequested) return { label: "Requested — pending", cls: "b-due" };
  return { label: "Not yet collected", cls: "b-due" };
}
function certBadgeHTML(s) { const c = certStatus(s); return `<span class="badge ${c.cls}">${c.label}</span>`; }

function studentLinkFor(id) { return new URL("student.html?id=" + encodeURIComponent(id), location.href).href; }

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) { window.prompt("Copy this link:", text); return false; }
}
