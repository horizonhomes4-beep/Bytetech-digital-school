// Shared behaviour for the Practical Computer Skills Course site

document.addEventListener('DOMContentLoaded', function () {

  var BASE = document.body.getAttribute('data-base') || '';

  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  // ---------- Course map: "jump to any week", rendered on every page ----------
  var mapRoot = document.getElementById('courseMap');
  if (mapRoot && typeof COURSE_PHASES !== 'undefined' && typeof COURSE_WEEKS !== 'undefined') {
    var currentPath = window.location.pathname.replace(/^.*\//, '');
    var currentFolder = window.location.pathname.split('/').slice(-2, -1)[0] || '';

    COURSE_PHASES.forEach(function (phase) {
      var phaseWeeks = COURSE_WEEKS.filter(function (w) { return w.phase === phase.id; });

      var phaseWrap = document.createElement('div');
      phaseWrap.className = 'course-map-phase';

      var label = document.createElement('div');
      label.className = 'course-map-phase-label';
      label.innerHTML = '<span class="swatch" style="background:var(' + phase.colorVar + ')"></span>' +
        'Phase ' + phase.id + ' — ' + phase.title;
      phaseWrap.appendChild(label);

      var row = document.createElement('div');
      row.className = 'week-pill-row';

      phaseWeeks.forEach(function (w) {
        var a = document.createElement('a');
        var hrefParts = w.href.split('/'); // e.g. ["phase1","week1.html"]
        var isCurrent = hrefParts[0] === currentFolder && hrefParts[1] === currentPath;
        a.href = BASE + w.href;
        a.className = 'week-pill ' + (w.status === 'live' ? 'is-live' : 'is-pending') + (isCurrent ? ' is-current' : '');
        a.setAttribute('aria-current', isCurrent ? 'page' : 'false');
        a.innerHTML = '<span class="wp-num">Week ' + w.week + '</span><span class="wp-title">' + w.title + '</span>';
        row.appendChild(a);
      });

      phaseWrap.appendChild(row);
      mapRoot.appendChild(phaseWrap);
    });
  }

  // ---------- Curriculum page: dynamic table + search + filters ----------
  var curriculumRoot = document.getElementById('curriculumRoot');
  if (curriculumRoot && typeof COURSE_PHASES !== 'undefined' && typeof COURSE_WEEKS !== 'undefined') {
    COURSE_PHASES.forEach(function (phase) {
      var phaseWeeks = COURSE_WEEKS.filter(function (w) { return w.phase === phase.id; });

      var block = document.createElement('div');
      block.className = 'phase-block';
      block.setAttribute('data-phase-block', phase.id);

      block.innerHTML =
        '<div class="phase-title-row">' +
          '<span class="phase-tag" style="background:var(' + phase.colorVar + ')">Phase ' + phase.id + '</span>' +
          '<h2 class="mt-0" style="margin:0;">' + phase.title + '</h2>' +
        '</div>' +
        '<p>' + phase.tagline + '</p>' +
        '<table class="week-table">' +
          '<thead><tr><th style="width:70px;">Week</th><th>Focus</th><th>What you\'ll be able to do</th><th style="width:80px;">Status</th><th style="width:120px;">Lesson</th></tr></thead>' +
          '<tbody></tbody>' +
        '</table>';

      var tbody = block.querySelector('tbody');

      phaseWeeks.forEach(function (w) {
        var tr = document.createElement('tr');
        tr.setAttribute('data-phase', phase.id);
        tr.setAttribute('data-status', w.status);
        tr.setAttribute('data-search', (w.title + ' ' + w.skills).toLowerCase());
        if (w.status === 'live') tr.classList.add('is-live');

        var statusHtml = w.status === 'live'
          ? '<span class="status-pill status-live"><span class="dot"></span>Available</span>'
          : '<span class="status-pill status-pending"><span class="dot"></span>Pending</span>';

        var linkHtml = w.status === 'live'
          ? '<a class="wk-link" href="' + w.href + '">Open lesson →</a>'
          : '<a class="wk-link" href="' + w.href + '" style="color:var(--ink-faint);">View status →</a>';

        tr.innerHTML =
          '<td data-label="Week" class="wk-num">' + w.week + '</td>' +
          '<td data-label="Focus" class="wk-title">' + w.title + '</td>' +
          '<td data-label="Skills" class="wk-skills">' + w.skills + '</td>' +
          '<td data-label="Status">' + statusHtml + '</td>' +
          '<td data-label="Lesson">' + linkHtml + '</td>';
        tbody.appendChild(tr);
      });

      curriculumRoot.appendChild(block);
    });

    // Controls
    var searchInput = document.getElementById('curriculumSearch');
    var phaseChips = Array.prototype.slice.call(document.querySelectorAll('[data-filter-phase]'));
    var statusChips = Array.prototype.slice.call(document.querySelectorAll('[data-filter-status]'));
    var emptyState = document.getElementById('curriculumEmpty');
    var countLabel = document.getElementById('curriculumCount');

    var state = { phase: 'all', status: 'all', search: '' };

    function applyFilters() {
      var rows = Array.prototype.slice.call(curriculumRoot.querySelectorAll('tbody tr'));
      var visibleCount = 0;

      rows.forEach(function (row) {
        var matchesPhase = state.phase === 'all' || row.getAttribute('data-phase') === state.phase;
        var matchesStatus = state.status === 'all' || row.getAttribute('data-status') === state.status;
        var matchesSearch = state.search === '' || row.getAttribute('data-search').indexOf(state.search) !== -1;
        var visible = matchesPhase && matchesStatus && matchesSearch;
        row.classList.toggle('week-row-hidden', !visible);
        if (visible) visibleCount++;
      });

      // Hide whole phase blocks with no visible rows
      Array.prototype.slice.call(curriculumRoot.querySelectorAll('[data-phase-block]')).forEach(function (block) {
        var anyVisible = block.querySelector('tbody tr:not(.week-row-hidden)');
        block.classList.toggle('phase-block-hidden', !anyVisible);
      });

      if (emptyState) emptyState.classList.toggle('show', visibleCount === 0);
      if (countLabel) {
        countLabel.textContent = visibleCount === COURSE_WEEKS.length
          ? 'Showing all ' + COURSE_WEEKS.length + ' weeks'
          : 'Showing ' + visibleCount + ' of ' + COURSE_WEEKS.length + ' weeks';
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.search = searchInput.value.trim().toLowerCase();
        applyFilters();
      });
    }
    phaseChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        phaseChips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        state.phase = chip.getAttribute('data-filter-phase');
        applyFilters();
      });
    });
    statusChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        statusChips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        state.status = chip.getAttribute('data-filter-status');
        applyFilters();
      });
    });

    applyFilters();
  }

  // Checklist persistence + progress bar
  // Each checkbox needs a unique data-task-id attribute.
  var pageKey = document.body.getAttribute('data-progress-key');
  if (!pageKey) return;

  var storageKey = 'pcskills:' + pageKey;
  var checkboxes = Array.prototype.slice.call(document.querySelectorAll('.task input[type="checkbox"]'));
  if (checkboxes.length === 0) return;

  var saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch (e) { saved = {}; }

  function updateTaskVisual(box) {
    var taskEl = box.closest('.task');
    if (taskEl) taskEl.classList.toggle('done', box.checked);
  }

  function save() {
    var state = {};
    checkboxes.forEach(function (box) {
      state[box.dataset.taskId] = box.checked;
    });
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (e) {}
    updateProgress();
  }

  function updateProgress() {
    var total = checkboxes.length;
    var done = checkboxes.filter(function (b) { return b.checked; }).length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    var fill = document.querySelector('.progress-fill');
    var text = document.querySelector('.progress-text');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = done + ' of ' + total + ' tasks completed (' + pct + '%)';
  }

  checkboxes.forEach(function (box) {
    if (saved[box.dataset.taskId]) box.checked = true;
    updateTaskVisual(box);
    box.addEventListener('change', function () {
      updateTaskVisual(box);
      save();
    });
  });

  updateProgress();

  // Reset button
  var resetBtn = document.querySelector('[data-reset-progress]');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (!confirm('Clear all your ticked tasks on this page? This cannot be undone.')) return;
      checkboxes.forEach(function (box) {
        box.checked = false;
        updateTaskVisual(box);
      });
      try { localStorage.removeItem(storageKey); } catch (e) {}
      updateProgress();
    });
  }
});
