// Shared course behaviour. Lesson metadata is read from each lesson page itself.
// No weeks-data.js or build step is required.
document.addEventListener("DOMContentLoaded", async function () {
  const BASE = document.body.getAttribute("data-base") || "";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) toggle.addEventListener("click", () => links.classList.toggle("open"));

  // Static course metadata: do not download and parse all 12 lesson pages on every visit.
  // This keeps lesson pages fast even on slower mobile networks/hosting.
  const weeks = [
    {week:1,phase:1,title:"Meet Your Machine",skills:"Power on/off correctly, mouse & keyboard control, desktop navigation, files & folders, zipping, Task Manager, Wi-Fi, screenshots, basic troubleshooting.",status:"live",phaseTitle:"Digital Foundations",phaseTagline:"Get comfortable operating the machine itself before touching any real software.",phaseColorVar:"--ink",href:"phase1/week1.html"},
    {week:2,phase:1,title:"Your Operating System, Properly",skills:"Personalise the desktop, manage user accounts, install & uninstall software safely, connect a printer, update the OS.",status:"pending",phaseTitle:"Digital Foundations",phaseTagline:"Get comfortable operating the machine itself before touching any real software.",phaseColorVar:"--ink",href:"phase1/week2.html"},
    {week:3,phase:1,title:"The Internet & Browsers",skills:"Use a browser like a pro (tabs, bookmarks, downloads), search effectively, spot unsafe sites, set up and use email.",status:"pending",phaseTitle:"Digital Foundations",phaseTagline:"Get comfortable operating the machine itself before touching any real software.",phaseColorVar:"--ink",href:"phase1/week3.html"},
    {week:4,phase:1,title:"Word Processing Essentials",skills:"Type, format, and lay out a document; headers, page numbers, spell-check, saving in multiple formats, printing.",status:"pending",phaseTitle:"Digital Foundations",phaseTagline:"Get comfortable operating the machine itself before touching any real software.",phaseColorVar:"--ink",href:"phase1/week4.html"},
    {week:5,phase:2,title:"Spreadsheets Basics",skills:"Enter and organise data, write simple formulas (SUM, AVERAGE), sort and filter, build a basic chart.",status:"pending",phaseTitle:"Productivity & Communication",phaseTagline:"Documents, spreadsheets, slides, email and cloud storage — the tools of everyday work.",phaseColorVar:"--info",href:"phase2/week5.html"},
    {week:6,phase:2,title:"Presentations That Land",skills:"Build a slide deck with a clear structure, add images and transitions responsibly, present with speaker notes.",status:"pending",phaseTitle:"Productivity & Communication",phaseTagline:"Documents, spreadsheets, slides, email and cloud storage — the tools of everyday work.",phaseColorVar:"--info",href:"phase2/week6.html"},
    {week:7,phase:2,title:"Email & Cloud Storage",skills:"Professional email etiquette, attachments, folders and filters, sharing files via Google Drive / OneDrive.",status:"pending",phaseTitle:"Productivity & Communication",phaseTagline:"Documents, spreadsheets, slides, email and cloud storage — the tools of everyday work.",phaseColorVar:"--info",href:"phase2/week7.html"},
    {week:8,phase:2,title:"Digital Safety & Security",skills:"Strong passwords & two-factor authentication, spotting phishing, safe downloads, backing up your files.",status:"pending",phaseTitle:"Productivity & Communication",phaseTagline:"Documents, spreadsheets, slides, email and cloud storage — the tools of everyday work.",phaseColorVar:"--info",href:"phase2/week8.html"},
    {week:9,phase:3,title:"Advanced System Management",skills:"Task Manager deep-dive, Control Panel / Settings, drivers & updates, storage and disk cleanup.",status:"pending",phaseTitle:"Advanced Skills & Troubleshooting",phaseTagline:"System settings, the command line, fixing your own problems, and a final practical exam.",phaseColorVar:"--accent-ink",href:"phase3/week9.html"},
    {week:10,phase:3,title:"Intro to the Command Line",skills:"Open a terminal, navigate folders with commands, run a simple script, understand what automation can do.",status:"pending",phaseTitle:"Advanced Skills & Troubleshooting",phaseTagline:"System settings, the command line, fixing your own problems, and a final practical exam.",phaseColorVar:"--accent-ink",href:"phase3/week10.html"},
    {week:11,phase:3,title:"Troubleshooting & Maintenance",skills:"Diagnose a frozen PC, run malware scans, free up space, recover an unsaved file, ask for help effectively.",status:"pending",phaseTitle:"Advanced Skills & Troubleshooting",phaseTagline:"System settings, the command line, fixing your own problems, and a final practical exam.",phaseColorVar:"--accent-ink",href:"phase3/week11.html"},
    {week:12,phase:3,title:"Capstone Project & Final Exam",skills:"Build a CV in Word, a budget in Excel and a pitch deck in PowerPoint, then sit a timed practical exam.",status:"pending",phaseTitle:"Advanced Skills & Troubleshooting",phaseTagline:"System settings, the command line, fixing your own problems, and a final practical exam.",phaseColorVar:"--accent-ink",href:"phase3/week12.html"}
  ];
  window.COURSE_WEEKS = weeks;

  const phaseMap = {};
  weeks.forEach(w => {
    const id = Number(w.phase);
    if (!phaseMap[id]) phaseMap[id] = {
      id,
      title: w.phaseTitle || ("Phase " + id),
      tagline: w.phaseTagline || "",
      colorVar: w.phaseColorVar || (id === 1 ? "--ink" : id === 2 ? "--info" : "--accent-ink")
    };
  });
  window.COURSE_PHASES = Object.values(phaseMap).sort((a,b) => a.id - b.id);

  renderCourseMap();
  renderCurriculum();
  setupProgress();

  function renderCourseMap() {
    const root = document.getElementById("courseMap");
    if (!root) return;
    root.innerHTML = "";
    const current = location.pathname.split("/").slice(-2);
    COURSE_PHASES.forEach(phase => {
      const items = weeks.filter(w => Number(w.phase) === phase.id);
      const block = document.createElement("div");
      block.className = "course-map-phase";
      block.innerHTML = `<div class="course-map-phase-label"><span class="swatch" style="background:var(${phase.colorVar})"></span>Phase ${phase.id} — ${esc(phase.title)}</div>`;
      const row = document.createElement("div");
      row.className = "week-pill-row";
      items.forEach(w => {
        const parts = w.href.split("/");
        const a = document.createElement("a");
        a.href = BASE + w.href;
        const active = parts[0] === current[0] && parts[1] === current[1];
        a.className = "week-pill " + (w.status === "live" ? "is-live" : "is-pending") + (active ? " is-current" : "");
        a.setAttribute("aria-current", active ? "page" : "false");
        a.innerHTML = `<span class="wp-num">Week ${w.week}</span><span class="wp-title">${esc(w.title)}</span>`;
        row.appendChild(a);
      });
      block.appendChild(row);
      root.appendChild(block);
    });
  }

  function renderCurriculum() {
    const root = document.getElementById("curriculumRoot");
    if (!root) return;
    root.innerHTML = "";
    COURSE_PHASES.forEach(phase => {
      const phaseWeeks = weeks.filter(w => Number(w.phase) === phase.id);
      const block = document.createElement("div");
      block.className = "phase-block";
      block.dataset.phaseBlock = phase.id;
      block.innerHTML =
        `<div class="phase-title-row"><span class="phase-tag" style="background:var(${phase.colorVar})">Phase ${phase.id}</span><h2 class="mt-0" style="margin:0;">${esc(phase.title)}</h2></div>` +
        `<p>${esc(phase.tagline)}</p>` +
        `<table class="week-table"><thead><tr><th style="width:70px;">Week</th><th>Focus</th><th>What you'll be able to do</th><th>Status</th><th>Lesson</th></tr></thead><tbody></tbody></table>`;
      const tbody = block.querySelector("tbody");
      phaseWeeks.forEach(w => {
        const tr = document.createElement("tr");
        tr.dataset.phase = w.phase;
        tr.dataset.status = w.status;
        tr.dataset.search = `${w.title} ${w.skills}`.toLowerCase();
        if (w.status === "live") tr.classList.add("is-live");
        const status = w.status === "live"
          ? '<span class="status-pill status-live"><span class="dot"></span>Available</span>'
          : '<span class="status-pill status-pending"><span class="dot"></span>Pending</span>';
        const link = w.status === "live"
          ? `<a class="wk-link" href="${BASE}${w.href}">Open lesson →</a>`
          : `<a class="wk-link" href="${BASE}${w.href}" style="color:var(--ink-faint);">View status →</a>`;
        tr.innerHTML = `<td data-label="Week" class="wk-num">${w.week}</td><td data-label="Focus" class="wk-title">${esc(w.title)}</td><td data-label="Skills" class="wk-skills">${esc(w.skills)}</td><td data-label="Status">${status}</td><td data-label="Lesson">${link}</td>`;
        tbody.appendChild(tr);
      });
      root.appendChild(block);
    });

    const search = document.getElementById("curriculumSearch");
    const phases = [...document.querySelectorAll("[data-filter-phase]")];
    const statuses = [...document.querySelectorAll("[data-filter-status]")];
    const empty = document.getElementById("curriculumEmpty");
    const count = document.getElementById("curriculumCount");
    const state = {phase:"all", status:"all", search:""};

    function filter() {
      let visible = 0;
      root.querySelectorAll("tbody tr").forEach(row => {
        const ok = (state.phase === "all" || row.dataset.phase === state.phase) &&
          (state.status === "all" || row.dataset.status === state.status) &&
          (!state.search || row.dataset.search.includes(state.search));
        row.classList.toggle("week-row-hidden", !ok);
        if (ok) visible++;
      });
      root.querySelectorAll("[data-phase-block]").forEach(b => b.classList.toggle("phase-block-hidden", !b.querySelector("tbody tr:not(.week-row-hidden)")));
      if (empty) empty.classList.toggle("show", visible === 0);
      if (count) count.textContent = `Showing ${visible} of ${weeks.length} weeks`;
    }
    search?.addEventListener("input", e => { state.search = e.target.value.trim().toLowerCase(); filter(); });
    phases.forEach(chip => chip.addEventListener("click", () => {
      phases.forEach(c => c.classList.remove("active")); chip.classList.add("active");
      state.phase = chip.dataset.filterPhase; filter();
    }));
    statuses.forEach(chip => chip.addEventListener("click", () => {
      statuses.forEach(c => c.classList.remove("active")); chip.classList.add("active");
      state.status = chip.dataset.filterStatus; filter();
    }));
    filter();
  }

  function setupProgress() {
    const pageKey = document.body.dataset.progressKey;
    const boxes = [...document.querySelectorAll('.task input[type="checkbox"][data-task-id]')];
    if (!pageKey || !boxes.length) return;

    const storageKey = "pcskills:" + pageKey;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch {}
    const apiReady = () => window.AuthAPI && window.currentStudent;

    function updateVisual(box) { box.closest(".task")?.classList.toggle("done", box.checked); }

    function activity(task) {
      const all = boxes.length;
      const done = boxes.filter(b => b.checked).length;
      window.lessonActivity = {
        section: task?.closest(".day-block")?.querySelector("h3")?.textContent?.trim() || "",
        task: task?.closest(".task")?.querySelector("label")?.textContent?.trim() || "",
        progress: all ? Math.round(done / all * 100) : 0
      };
      window.lessonHeartbeat?.();
    }

    async function save(changedBox) {
      const state = {};
      boxes.forEach(b => state[b.dataset.taskId] = b.checked);
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
      const done = boxes.filter(b => b.checked).length;
      if (apiReady()) {
        window.AuthAPI.update(window.AuthAPI.ref(window.AuthAPI.db, `students/${window.AuthAPI.studentId}/progress/${pageKey}`), {
          tasks: state, completed: done, total: boxes.length, updatedAt: Date.now()
        }).catch(() => {});
      }
      updateProgress();
      activity(changedBox || null);
    }

    function updateProgress() {
      const done = boxes.filter(b => b.checked).length, total = boxes.length;
      const pct = total ? Math.round(done / total * 100) : 0;
      document.querySelector(".progress-fill")?.style.setProperty("width", pct + "%");
      const text = document.querySelector(".progress-text");
      if (text) text.textContent = `${done} of ${total} tasks completed (${pct}%)`;
      window.lessonActivity = {...window.lessonActivity, progress:pct};
      window.lessonHeartbeat?.();
    }

    boxes.forEach(box => {
      if (saved[box.dataset.taskId]) box.checked = true;
      updateVisual(box);
      box.addEventListener("change", () => { updateVisual(box); save(box); });
    });

    document.addEventListener("student-ready", () => {
      const api = window.AuthAPI;
      if (!api) return;
      api.get(api.ref(api.db, `students/${api.studentId}/progress/${pageKey}/tasks`)).then(snap => {
        const remote = snap.val();
        if (!remote) return;
        boxes.forEach(box => { box.checked = !!remote[box.dataset.taskId]; updateVisual(box); });
        updateProgress();
      }).catch(() => {});
    });

    document.querySelector("[data-reset-progress]")?.addEventListener("click", () => {
      if (!confirm("Clear all your ticked tasks on this page? This cannot be undone.")) return;
      boxes.forEach(box => { box.checked = false; updateVisual(box); });
      try { localStorage.removeItem(storageKey); } catch {}
      save();
    });

    updateProgress();

    // Report the lesson section being viewed so admin can see the student's live location.
    let timer = 0;
    function reportScroll() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const blocks = [...document.querySelectorAll("section, .day-block, header")];
        let best = "";
        let bestDist = Infinity;
        blocks.forEach(el => {
          const r = el.getBoundingClientRect();
          const dist = Math.abs(r.top - 140);
          if (r.bottom > 100 && dist < bestDist) {
            bestDist = dist;
            best = el.querySelector("h1,h2,h3")?.textContent?.trim() || "";
          }
        });
        window.lessonActivity = {...window.lessonActivity, section: best};
        window.lessonHeartbeat?.();
      }, 700);
    }
    window.addEventListener("scroll", reportScroll, {passive:true});
    reportScroll();
  }
});
