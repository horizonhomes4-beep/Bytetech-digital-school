/*
  Optional lesson-page payment gate.
  Add these two scripts to any lesson page that must enforce payment:
    <script src="config.js"></script>
    <script src="payment-gate.js"></script>
  The student ID can be supplied as ?id=STUDENT_ID or stored by student.html.
*/
(function () {
  "use strict";

  function showGate(student, p) {
    const old = document.getElementById("paymentAccessGate");
    if (old) old.remove();

    const wrap = document.createElement("div");
    wrap.id = "paymentAccessGate";
    wrap.style.cssText = [
      "position:fixed","inset:0","z-index:2147483647","display:flex","align-items:center",
      "justify-content:center","padding:20px","background:rgba(7,12,28,.82)",
      "backdrop-filter:blur(7px)","font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif"
    ].join(";");

    const box = document.createElement("div");
    box.style.cssText = [
      "width:min(520px,100%)","background:#fff","color:#172033","border-radius:22px",
      "padding:26px","box-shadow:0 25px 90px #0008","border:2px solid #ff526b"
    ].join(";");

    const name = esc(student.name || "Student");
    box.innerHTML = `
      <div style="font-size:38px;margin-bottom:8px">⛔</div>
      <h2 style="margin:0 0 7px">Lesson access suspended</h2>
      <p style="margin:0 0 15px;line-height:1.6">
        Hello <b>${name}</b>. Your paid course coverage has elapsed, so lesson access is
        suspended until the full remaining balance is settled.
      </p>
      <div style="background:#fff3f4;border-radius:12px;padding:13px;margin-bottom:15px">
        <b>Please settle the full balance of ${money(p.balance)}</b> to continue lessons.
        <br><small>Course fee: ${money(p.fee)} · Paid: ${money(p.paid)} · Payment coverage: ${p.coveredMonths.toFixed(2)} months</small>
      </div>
      <p style="color:#667085;line-height:1.5;margin:0">
        Please contact the school office to settle your balance before continuing lessons.
      </p>`;

    wrap.appendChild(box);
    document.body.appendChild(wrap);
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  window.enforcePaymentAccess = function (studentId) {
    if (!studentId || typeof studentsRef === "undefined" || !studentsRef) return Promise.resolve(true);
    return studentsRef.child(studentId).once("value").then(function (sn) {
      const student = sn.val();
      if (!student) return true;
      const p = paymentInfo(student);
      if (p.valid && !p.accessAllowed && p.status === "overdue") {
        showGate(student, p);
        return false;
      }
      return true;
    });
  };

  document.addEventListener("DOMContentLoaded", function () {
    const qsId = new URLSearchParams(location.search).get("id");
    let storedId = "";
    try { storedId = localStorage.getItem("studentAccountId") || ""; } catch (_) {}
    const studentId = qsId || storedId;
    if (!studentId) return;

    window.enforcePaymentAccess(studentId);

    // If a lesson remains open across the payment boundary, enforce the same
    // rule without requiring a page refresh.
    setInterval(function () {
      window.enforcePaymentAccess(studentId);
    }, 60000);
  });
})();
