// ============================================================================
// DEVTOOLS / VIEW-SOURCE DETERRENT
// IMPORTANT — read this before relying on it:
// This can only discourage casual poking around. It cannot stop anyone who
// actually wants in: DevTools can still be opened via the browser menu, a
// second browser, disabling JS first, or a browser extension, and "view
// source" is meaningless once someone just saves the page or opens Network
// tab. Never put real secrets (passwords, private keys, unpublished exam
// answers) in client-side HTML/JS relying on this file for protection —
// use Firebase database rules for actual access control.
// ============================================================================
(function () {
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    const blocked =
      k === "f12" ||
      (e.ctrlKey && k === "u") ||                                   // view-source
      (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) ||   // devtools panels
      (e.metaKey && e.altKey && ["i", "j", "c"].includes(k));       // Mac equivalents
    if (blocked) e.preventDefault();
  });

  // Soft heuristic: a big jump in outer-vs-inner size often means a docked
  // devtools panel just opened. Purely cosmetic — shows a nudge, doesn't lock anything.
  let warned = false;
  setInterval(() => {
    const threshold = 160;
    const opened = window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold;
    if (opened && !warned) {
      warned = true;
      console.log("%cThis page asks that you not inspect it — thanks for respecting that.", "font-size:14px;");
    }
    if (!opened) warned = false;
  }, 1500);
})();
