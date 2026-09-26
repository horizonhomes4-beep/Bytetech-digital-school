// ============================================================================
// REQUEST ACCESS WIDGET
// Drop <div id="requestAccessRoot"></div> on any page, with the page's <body>
// carrying data-week-href="phase1/week2.html" and data-week-title="...".
// Needs auth-guard.js loaded first (module, defer-safe via events).
// ============================================================================
(function () {
  const root = document.getElementById("requestAccessRoot");
  if (!root) return;

  const weekHref = document.body.getAttribute("data-week-href");
  const weekTitle = document.body.getAttribute("data-week-title") || document.title;
  const weekKey = weekHref.replace(/[.\/]/g, "_"); // Firebase keys can't contain "." or "/"

  function render(state, extra) {
    if (state === "granted") {
      root.innerHTML =
        '<div class="callout callout-info" style="margin-top:0;">' +
          '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>' +
          '<div><h4 style="margin-bottom:4px;">Access granted</h4>' +
          '<p style="margin-bottom:0;">Your admin has unlocked this week for you. The full lesson will appear here as soon as it is written — you\'re on the list.</p></div>' +
        '</div>';
    } else if (state === "pending") {
      root.innerHTML =
        '<div class="callout callout-rule" style="margin-top:0;">' +
          '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>' +
          '<div><h4 style="margin-bottom:4px;">Request sent</h4>' +
          '<p style="margin-bottom:0;">Waiting on your admin to review it (requested ' + extra + ').</p></div>' +
        '</div>';
    } else {
      root.innerHTML =
        '<div class="callout callout-warn" style="margin-top:0;">' +
          '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>' +
          '<div><h4 style="margin-bottom:6px;">Want early access to this week?</h4>' +
          '<p>You can ask your admin to unlock this lesson for you ahead of schedule.</p>' +
          '<button type="button" id="requestAccessBtn" class="btn btn-primary btn-sm">Request early access</button></div>' +
        '</div>';
      const btn = document.getElementById("requestAccessBtn");
      if (btn) btn.addEventListener("click", sendRequest);
    }
  }

  function sendRequest() {
    const { db, ref, set, update, studentId } = window.AuthAPI;
    const student = window.currentStudent;
    const now = Date.now();
    const pushId = "req_" + studentId + "_" + weekKey;

    Promise.all([
      set(ref(db, "accessRequests/" + pushId), {
        studentId,
        studentName: student.name || "Student",
        classId: student.classId || "",
        weekHref,
        weekTitle,
        requestedAt: now,
        status: "pending"
      }),
      update(ref(db, "students/" + studentId + "/requests"), { [weekKey]: pushId })
    ]).then(() => render("pending", new Date(now).toLocaleString()))
      .catch(() => alert("Couldn't send the request — check your connection and try again."));
  }

  function refresh() {
    const student = window.currentStudent;
    if (!student) return;

    if (student.unlocked && student.unlocked[weekKey]) {
      render("granted");
      return;
    }

    const { db, ref, get } = window.AuthAPI;
    get(ref(db, "students/" + student.id + "/requests/" + weekKey)).then((snap) => {
      if (!snap.exists()) { render("idle"); return; }
      get(ref(db, "accessRequests/" + snap.val())).then((reqSnap) => {
        const req = reqSnap.val();
        if (!req) render("idle"); // admin deleted it (denied) — student can ask again
        else render("pending", new Date(req.requestedAt).toLocaleString());
      });
    }).catch(() => render("idle"));
  }

  document.addEventListener("student-ready", refresh);
  document.addEventListener("unlocks-changed", refresh);
})();
