// ===== Firebase configuration =====
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
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    dbRoot = firebase.database();
    studentsRef = dbRoot.ref("students");
    certRequestsRef = dbRoot.ref("certRequests");
  } catch (e) {
    CONFIG_ERROR = "Firebase failed to start: " + e.message;
  }
}

function showConfigError(msg) {
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#ff526b;color:#fff;padding:12px 16px;font:14px system-ui;text-align:center;box-shadow:0 4px 20px #0003";
  d.textContent = "⚠ " + msg;
  document.body.prepend(d);
}
if (CONFIG_ERROR) document.addEventListener("DOMContentLoaded", () => showConfigError(CONFIG_ERROR));

const money = n => "₦" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = d => {
  const x = new Date(d + "T00:00:00");
  return isNaN(x) ? "-" : x.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};
const durMonths = (s, e) => {
  const d = (new Date(e) - new Date(s)) / 864e5 + 1;
  return d > 0 ? Math.round(d / 30.4375 * 10) / 10 : 0;
};
const balanceOf = s => Math.max(0, Number(s.fee || 0) - Number(s.paid || 0));
const totals = list => list.reduce((a, s) => {
  a.paid += +s.paid || 0;
  a.bal += balanceOf(s);
  return a;
}, { paid: 0, bal: 0 });

// ---------------- Payment / duration sensitivity ----------------
// The course fee is distributed across the registered course duration.
// Example: ₦60,000 over 3 months = ₦20,000 required per completed month.
// A student is considered overdue when the amount paid is below the amount
// required for the completed course months. The next-month reminder is shown
// when the current completed month is covered but more of the fee remains.
function dateOnly(value) {
  const d = new Date(String(value || "") + "T00:00:00");
  return isNaN(d) ? null : d;
}

function paymentInfo(s, now = new Date()) {
  const fee = Math.max(0, Number(s.fee || 0));
  const paid = Math.max(0, Number(s.paid || 0));
  const start = dateOnly(s.start);
  const end = dateOnly(s.end);
  const totalMonths = durMonths(s.start, s.end);
  const totalDays = start && end ? Math.max(1, Math.floor((end - start) / 864e5) + 1) : 0;

  if (!start || !end || !totalMonths || !totalDays || fee <= 0) {
    return {
      valid: false, fee, paid, balance: Math.max(0, fee - paid), totalMonths: totalMonths || 0,
      totalDays, elapsedMonths: 0, completedMonths: 0,
      coveredMonths: fee ? Math.min(totalMonths, paid / fee * totalMonths) : 0,
      coverageRemainingMonths: 0, enforcementStartMonths: 0,
      requiredPaid: 0, shortage: 0, nextRequired: 0, nextShortage: 0,
      status: "unknown", statusLabel: "Payment schedule unavailable", severity: "neutral",
      accessAllowed: true, courseEnded: false, coverageExhausted: false,
      message: "The payment schedule could not be calculated from the course dates and fee."
    };
  }

  const today = new Date(now);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endInclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  // Calculate payment coverage continuously across the registered duration.
  // This deliberately does NOT wait for a whole calendar month to finish.
  const elapsedDays = Math.max(
    0,
    Math.min(totalDays, Math.floor((todayStart - start) / 864e5) + (todayStart >= start ? 1 : 0))
  );
  const elapsedMonths = Math.min(
    totalMonths,
    Math.max(0, (elapsedDays / totalDays) * totalMonths)
  );
  const completedMonths = Math.min(
    Math.floor(totalMonths),
    Math.floor(elapsedMonths + 1e-9)
  );

  // Payment coverage:
  // N20,000 / N60,000 over 3 months = 1.00 month.
  // N50,000 / N120,000 over 3 months = 1.25 months.
  const coveredMonths = Math.min(
    totalMonths,
    fee ? (paid / fee) * totalMonths : 0
  );
  const coverageRemainingMonths = Math.max(0, coveredMonths - elapsedMonths);
  const requiredPaid = fee * Math.min(1, elapsedMonths / totalMonths);
  const balance = Math.max(0, fee - paid);

  // Requested minimum enforcement point: approximately 1 month + 15 days.
  // The student's paid coverage can push this point later, but never earlier
  // than the 1.5-month courtesy threshold for longer active courses.
  const minimumEnforcementMonths = Math.min(totalMonths, 1.5);
  const enforcementStartMonths = Math.max(
    coveredMonths,
    minimumEnforcementMonths
  );

  // Once the payment coverage/courtesy window has elapsed, require the FULL
  // remaining balance. No monthly instalment is calculated or suggested.
  const coverageExhausted =
    paid < fee && elapsedMonths > enforcementStartMonths + 1e-9;

  const courseEnded = todayStart > endInclusive;

  // Early warning during the final seven course-days before enforcement.
  const warningDays = 7;
  const remainingCoverageDays =
    coverageRemainingMonths / totalMonths * totalDays;
  const remainingEnforcementDays =
    Math.max(0, enforcementStartMonths - elapsedMonths) /
    totalMonths * totalDays;
  const dueSoon =
    paid < fee &&
    !coverageExhausted &&
    remainingEnforcementDays <= warningDays &&
    elapsedMonths > 0;

  let status = "current";
  let statusLabel = "Payment current";
  let severity = "ok";
  let accessAllowed = true;
  let message = "Your current payment covers your course time.";

  if (courseEnded) {
    status = "ended";
    statusLabel = "Course ended";
    severity = "neutral";
    accessAllowed = true;
    message = "Your registered course duration has ended.";
  } else if (coverageExhausted) {
    status = "overdue";
    statusLabel = "Payment overdue — access suspended";
    severity = "danger";
    accessAllowed = false;
    message =
      `Hello ${s.name || "Student"}. Your paid course coverage has elapsed. ` +
      `Please settle your full remaining balance of ${money(balance)} to continue accessing lessons.`;
  } else if (paid >= fee) {
    status = "paid";
    statusLabel = "Paid in full";
    severity = "ok";
    accessAllowed = true;
    message = "Your course fee is fully paid.";
  } else if (dueSoon) {
    status = "reminder";
    statusLabel = "Payment coverage ending soon";
    severity = "warn";
    accessAllowed = true;
    message =
      `Your current payment is almost exhausted. Please settle the full ` +
      `remaining balance of ${money(balance)} before your lesson access is suspended.`;
  }

  return {
    valid: true, fee, paid, balance, totalMonths, totalDays,
    elapsedMonths, completedMonths, coveredMonths, coverageRemainingMonths,
    enforcementStartMonths,
    requiredPaid,
    shortage: coverageExhausted ? balance : 0,
    nextRequired: fee * Math.min(
      1,
      Math.min(totalMonths, elapsedMonths + 1) / totalMonths
    ),
    nextShortage: balance,
    paidPercent: fee ? Math.min(100, paid / fee * 100) : 0,
    schedulePercent: fee ? Math.min(100, requiredPaid / fee * 100) : 0,
    remainingCoverageDays, remainingEnforcementDays,
    coverageExhausted, dueSoon, status, statusLabel, severity,
    accessAllowed, courseEnded, message
  };
}

function paymentStatusIconHTML(s) {
  const p = paymentInfo(s);
  const map = {
    paid:    { cls: "pay-ok",      icon: "✓", label: "Paid in full" },
    current: { cls: "pay-ok",      icon: "✓", label: "Payment okay" },
    reminder:{ cls: "pay-warn",    icon: "!", label: "Payment attention required" },
    overdue: { cls: "pay-danger",  icon: "!", label: "Payment overdue — access suspended" },
    ended:   { cls: "pay-ended",   icon: "–", label: "Course ended" },
    unknown: { cls: "pay-unknown", icon: "?", label: "Payment status unavailable" }
  };
  const m = map[p.status] || map.unknown;
  return `<button type="button" class="payment-status-icon ${m.cls}" data-payment-detail="${esc(s.id)}"
    aria-label="${esc(m.label)}" title="${esc(m.label)}">
    <span>${m.icon}</span><i></i>
  </button>`;
}

function paymentDetailHTML(s) {
  const p = paymentInfo(s);
  const statusClass = p.status === "overdue" ? "danger" :
                      p.status === "reminder" ? "warn" :
                      p.status === "paid" || p.status === "current" ? "ok" : "neutral";
  const statusText = p.statusLabel || "Payment status";
  const action = p.status === "overdue"
    ? `Settle the full balance of ${money(p.balance)} to restore lesson access.`
    : p.status === "reminder"
    ? `Please settle the full remaining balance of ${money(p.balance)} before the current payment coverage ends.`
    : p.status === "paid"
    ? "This course is fully paid."
    : p.status === "ended"
    ? "The registered course duration has ended."
    : "The student's payment is currently within the required coverage.";

  return `<div class="payment-detail-modal" id="paymentDetailModal" role="dialog" aria-modal="true">
    <div class="payment-detail-card">
      <button class="payment-detail-close" data-close-payment-detail aria-label="Close">×</button>
      <div class="payment-detail-head">
        <div class="payment-detail-icon ${statusClass}">${p.status === "paid" || p.status === "current" ? "✓" : p.status === "overdue" ? "!" : p.status === "reminder" ? "!" : "–"}</div>
        <div>
          <div class="payment-detail-kicker">Payment status</div>
          <h2>${esc(s.name || "Student")}</h2>
          <span class="payment-detail-status ${statusClass}">${esc(statusText)}</span>
        </div>
      </div>
      <p class="payment-detail-message">${esc(action)}</p>
      <div class="payment-detail-grid">
        <div><small>Course fee</small><b>${money(p.fee)}</b></div>
        <div><small>Amount paid</small><b class="positive">${money(p.paid)}</b></div>
        <div><small>Full balance</small><b class="${p.balance ? "attention" : "positive"}">${money(p.balance)}</b></div>
        <div><small>Course duration</small><b>${p.totalMonths || 0} months</b></div>
        <div><small>Payment coverage</small><b>${p.coveredMonths.toFixed(2)} months</b></div>
        <div><small>Course time used</small><b>${p.elapsedMonths.toFixed(2)} months</b></div>
      </div>
      <div class="payment-detail-track">
        <div class="track-label"><span>Fee paid</span><b>${p.paidPercent.toFixed(1)}%</b></div>
        <div class="payment-progress"><i style="width:${Math.min(100,p.paidPercent)}%"></i></div>
      </div>
      <div class="payment-detail-track">
        <div class="track-label"><span>Time covered by payment</span><b>${Math.min(100,(p.coveredMonths / Math.max(.001,p.totalMonths))*100).toFixed(1)}%</b></div>
        <div class="payment-progress coverage"><i style="width:${Math.min(100,(p.coveredMonths / Math.max(.001,p.totalMonths))*100)}%"></i></div>
      </div>
      <div class="payment-detail-footer">
        <span>Start: <b>${fmtDate(s.start)}</b></span>
        <span>End: <b>${fmtDate(s.end)}</b></span>
      </div>
    </div>
  </div>`;
}

function paymentBadgeHTML(s) {
  const p = paymentInfo(s);
  const cls = p.severity === "danger" ? "b-danger" : p.severity === "warn" ? "b-due" : p.severity === "ok" ? "b-ok" : "b-mu";
  return `<span class="badge ${cls}">${esc(p.statusLabel)}</span>`;
}

function paymentNoticeHTML(s, compact = false) {
  const p = paymentInfo(s);
  if (!p.valid || p.status === "current" || p.status === "paid" || p.status === "ended") return "";

  const danger = p.status === "overdue";
  const title = danger
    ? "Lesson access suspended — full balance required"
    : "Payment coverage ending soon";
  const text = danger
    ? `${s.name || "Student"}, your paid coverage has elapsed. Settle the full remaining balance of ${money(p.balance)} to continue lessons.`
    : `${s.name || "Student"}, your current payment is almost exhausted. Please settle the full remaining balance of ${money(p.balance)} before access is suspended.`;

  return `<div class="payment-notice ${danger ? "danger" : "warn"}">
    <div class="payment-notice-icon">${danger ? "⛔" : "🔔"}</div>
    <div>
      <b>${esc(title)}</b>
      <div>${esc(text)}</div>
      ${!compact ? `<div class="payment-mini">
        <span>Course fee: <b>${money(p.fee)}</b></span>
        <span>Paid: <b>${money(p.paid)}</b></span>
        <span>Full balance: <b>${money(p.balance)}</b></span>
        <span>Coverage: <b>${p.coveredMonths.toFixed(2)} months</b></span>
      </div>` : ""}
    </div>
  </div>`;
}

function paymentAdminSummary(list) {
  return list.reduce((a, s) => {
    const p = paymentInfo(s);
    if (p.status === "overdue") a.overdue++;
    if (p.status === "reminder") a.reminders++;
    if (p.status === "paid") a.paidFull++;
    return a;
  }, { overdue: 0, reminders: 0, paidFull: 0 });
}

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
