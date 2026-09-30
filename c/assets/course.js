/* ============================================================================
   COURSE.JS — the one place that knows about the 12-week course.

   * The fixed 12-week PLAN (titles / topics) lives here and rarely changes.
   * A week becomes "Available" AUTOMATICALLY when its lesson file exists and its
     <meta name="week-data"> says  "status": "live".
   * So to publish a new lesson you upload ONE file:  phaseN/weekN.html
     Nothing else (curriculum page, course map, admin list, buttons) needs editing.
   ============================================================================ */
(function () {
  if (window.CourseAPI) return;

  const PHASES = {
    1: { title: "Digital Foundations", tagline: "Weeks 1–4: learn to operate and manage the computer confidently.", color: "--ink" },
    2: { title: "Productivity & Communication", tagline: "Weeks 5–8: build practical workplace, communication and digital-safety skills.", color: "--info" },
    3: { title: "Advanced Skills & Troubleshooting", tagline: "Weeks 9–12: manage systems, use the command line, troubleshoot and complete the capstone.", color: "--accent-ink" }
  };

  const PLAN = [
    { week: 1, title: "Meet Your Machine", skills: "Power on/off correctly, mouse & keyboard control, desktop navigation, files & folders, zipping, Task Manager, Wi-Fi, screenshots, basic troubleshooting.", topics: "Computer parts, power on/off, mouse and keyboard control, Windows desktop, File Explorer, files and folders, ZIP files, Task Manager, Wi-Fi, screenshots and basic troubleshooting." },
    { week: 2, title: "Your Operating System, Properly", skills: "Personalise the desktop, manage user accounts, install & uninstall software safely, connect a printer, update the OS.", topics: "Desktop personalisation, user accounts, Windows Settings, safe software installation and removal, printers and Windows Update." },
    { week: 3, title: "The Internet & Browsers", skills: "Use a browser like a pro (tabs, bookmarks, downloads), search effectively, spot unsafe sites, set up and use email.", topics: "Web browsers, tabs, bookmarks, downloads, effective searching, website safety and email basics." },
    { week: 4, title: "Word Processing Essentials", skills: "Type, format, and lay out a document; headers, page numbers, spell-check, saving in multiple formats, printing.", topics: "Document creation, text formatting, page layout, headers and footers, page numbers, spell-check, PDF formats and printing." },
    { week: 5, title: "Spreadsheets Basics", skills: "Enter and organise data, write simple formulas (SUM, AVERAGE), sort and filter, build a basic chart.", topics: "Excel worksheets, rows and columns, data entry, SUM, AVERAGE, sorting, filtering and basic charts." },
    { week: 6, title: "Presentations That Land", skills: "Build a slide deck with a clear structure, add images and transitions responsibly, present with speaker notes.", topics: "PowerPoint slide structure, themes, images, transitions, speaker notes and practical presentation delivery." },
    { week: 7, title: "Email & Cloud Storage", skills: "Professional email etiquette, attachments, folders and filters, sharing files via Google Drive / OneDrive.", topics: "Professional email, attachments, folders, filters, Google Drive, OneDrive and safe file sharing." },
    { week: 8, title: "Digital Safety & Security", skills: "Strong passwords & two-factor authentication, spotting phishing, safe downloads, backing up your files.", topics: "Strong passwords, two-factor authentication, phishing, safe downloads, malware awareness, backups and account security." },
    { week: 9, title: "Advanced System Management", skills: "Task Manager deep-dive, Control Panel / Settings, drivers & updates, storage and disk cleanup.", topics: "Task Manager, Control Panel, Windows Settings, drivers, updates, storage management and Disk Cleanup." },
    { week: 10, title: "Intro to the Command Line", skills: "Open a terminal, navigate folders with commands, run a simple script, understand what automation can do.", topics: "Command Prompt, Terminal, navigation commands, file operations, simple scripts and practical automation." },
    { week: 11, title: "Troubleshooting & Maintenance", skills: "Diagnose a frozen PC, run malware scans, free up space, recover an unsaved file, ask for help effectively.", topics: "Frozen-PC diagnosis, malware scans, storage cleanup, file recovery, performance problems and technical support." },
    { week: 12, title: "Capstone Project & Final Exam", skills: "Build a CV in Word, a budget in Excel and a pitch deck in PowerPoint, then sit a timed practical exam.", topics: "Build a CV in Word, a budget in Excel and a PowerPoint pitch, then complete a timed practical examination." }
  ];
  PLAN.forEach(p => { p.phase = Math.ceil(p.week / 4); });

  const CACHE_KEY = "pcskills:course:v2";
  const TTL = 5 * 60 * 1000;         // re-check the lesson files at most every 5 minutes
  const LIVE_HINT = [1, 2];          // only used the very first time, before anything is cached

  const scriptEl = document.currentScript;
  const ROOT = (scriptEl && scriptEl.src) ? new URL("../", scriptEl.src).href : location.href.replace(/[^/]*$/, "");
  const hrefOf = n => `phase${Math.ceil(n / 4)}/week${n}.html`;
  const urlOf = n => ROOT + hrefOf(n);

  // ---- state (week -> {live, meta}) ----
  let state = {}, checkedAt = 0;
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (c && c.w) { state = c.w; checkedAt = c.t || 0; }
  } catch (e) {}
  if (!Object.keys(state).length) LIVE_HINT.forEach(n => { state[n] = { live: true, meta: null }; });

  const save = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: checkedAt, w: state })); } catch (e) {} };
  const decode = s => { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; };
  const maxLive = () => Object.keys(state).filter(k => state[k] && state[k].live).reduce((m, k) => Math.max(m, +k), 0);

  async function probe(n) {
    try {
      const res = await fetch(urlOf(n), { cache: "no-cache" });
      if (!res.ok) return { live: false, meta: null };
      const html = await res.text();
      const m = html.match(/<meta\s+name=["']week-data["']\s+content=(?:'([^']*)'|"([^"]*)")/i);
      let meta = null;
      if (m) { try { meta = JSON.parse(decode(m[1] != null ? m[1] : m[2])); } catch (e) {} }
      const live = meta && meta.status ? meta.status === "live" : /data-task-id=/.test(html);
      return { live: !!live, meta: live ? meta : null };
    } catch (e) { return null; }      // offline / blocked: keep what we already know
  }

  let running = null, firstDone = false;
  function refresh(force) {
    if (running) return running;
    if (!force && firstDone) return Promise.resolve();
    if (!force && Date.now() - checkedAt < TTL && Object.keys(state).length) {
      firstDone = true; return Promise.resolve();
    }
    running = (async () => {
      let changed = false, limit = Math.max(3, maxLive() + 2);
      const done = new Set();
      for (;;) {
        const todo = [];
        for (let i = 1; i <= Math.min(12, limit); i++) if (!done.has(i)) todo.push(i);
        if (!todo.length) break;
        const results = await Promise.all(todo.map(probe));
        todo.forEach((n, k) => {
          done.add(n);
          const r = results[k];
          if (!r) return;
          if (JSON.stringify(state[n] || null) !== JSON.stringify(r)) { state[n] = r; changed = true; }
        });
        limit = Math.max(limit, maxLive() + 2);
      }
      checkedAt = Date.now(); save(); firstDone = true;
      document.dispatchEvent(new CustomEvent("course-updated", { detail: { changed } }));
    })().finally(() => { running = null; });
    return running;
  }

  function list() {
    return PLAN.map(p => {
      const s = state[p.week], live = !!(s && s.live), m = (live && s.meta) || {};
      const ph = PHASES[p.phase];
      return {
        week: p.week, phase: p.phase, href: hrefOf(p.week),
        title: m.title || p.title, skills: m.skills || p.skills, topics: p.topics,
        status: live ? "live" : "pending",
        phaseTitle: ph.title, phaseTagline: ph.tagline, phaseColorVar: ph.color
      };
    });
  }

  window.CourseAPI = {
    phases: PHASES, plan: PLAN, list, hrefOf, refresh,
    isLive: n => !!(state[n] && state[n].live),
    title: n => { const w = list()[n - 1]; return w ? w.title : "Week " + n; }
  };

  // ---- lesson pages: fill in the boring attributes automatically ----
  (function autofill() {
    const b = document.body; if (!b) return;
    const m = decodeURIComponent(location.pathname).match(/(phase\d+)\/week(\d+)\.html$/i);
    if (!m) return;
    const ph = m[1].toLowerCase(), wk = m[2];
    if (!b.dataset.weekHref) b.dataset.weekHref = `${ph}/week${wk}.html`;
    if (!b.dataset.base) b.dataset.base = "../";
    if (!b.dataset.progressKey) b.dataset.progressKey = `${ph}-week${wk}`;
    if (!b.dataset.weekTitle) {
      try {
        const t = document.querySelector('meta[name="week-data"]');
        b.dataset.weekTitle = (t && JSON.parse(t.content).title) || document.title;
      } catch (e) { b.dataset.weekTitle = document.title; }
    }
  })();

  // start discovering as soon as possible (does nothing if checked recently)
  refresh(false).then(() => { if (!checkedAt) return; });
  // the very first render with cached data
  const announce = () => document.dispatchEvent(new CustomEvent("course-updated", { detail: { changed: false, cached: true } }));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", announce); else setTimeout(announce, 0);
})();
