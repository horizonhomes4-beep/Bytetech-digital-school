// Single source of truth for the whole course.
// Update a week's `status` to "live" once its lesson page is published —
// the course map, curriculum table and search/filter all read from here.

var COURSE_PHASES = [
  { id: 1, title: "Digital Foundations", tagline: "Get comfortable operating the machine itself before touching any real software.", colorVar: "--ink" },
  { id: 2, title: "Productivity & Communication", tagline: "Documents, spreadsheets, slides, email and cloud storage — the tools of everyday work.", colorVar: "--info" },
  { id: 3, title: "Advanced Skills & Troubleshooting", tagline: "System settings, the command line, fixing your own problems, and a final practical exam.", colorVar: "--accent-ink" }
];

var COURSE_WEEKS = [
  {
    phase: 1, week: 1, title: "Meet Your Machine",
    skills: "Power on/off correctly, mouse & keyboard control, desktop navigation, files & folders, zipping, Task Manager, Wi-Fi, screenshots, basic troubleshooting.",
    href: "phase1/week1.html", status: "live"
  },
  {
    phase: 1, week: 2, title: "Your Operating System, Properly",
    skills: "Personalise the desktop, manage user accounts, install & uninstall software safely, connect a printer, update the OS.",
    href: "phase1/week2.html", status: "pending"
  },
  {
    phase: 1, week: 3, title: "The Internet & Browsers",
    skills: "Use a browser like a pro (tabs, bookmarks, downloads), search effectively, spot unsafe sites, set up and use email.",
    href: "phase1/week3.html", status: "pending"
  },
  {
    phase: 1, week: 4, title: "Word Processing Essentials",
    skills: "Type, format, and lay out a document; headers, page numbers, spell-check, saving in multiple formats, printing.",
    href: "phase1/week4.html", status: "pending"
  },
  {
    phase: 2, week: 5, title: "Spreadsheets Basics",
    skills: "Enter and organise data, write simple formulas (SUM, AVERAGE), sort and filter, build a basic chart.",
    href: "phase2/week5.html", status: "pending"
  },
  {
    phase: 2, week: 6, title: "Presentations That Land",
    skills: "Build a slide deck with a clear structure, add images and transitions responsibly, present with speaker notes.",
    href: "phase2/week6.html", status: "pending"
  },
  {
    phase: 2, week: 7, title: "Email & Cloud Storage",
    skills: "Professional email etiquette, attachments, folders and filters, sharing files via Google Drive / OneDrive.",
    href: "phase2/week7.html", status: "pending"
  },
  {
    phase: 2, week: 8, title: "Digital Safety & Security",
    skills: "Strong passwords & two-factor authentication, spotting phishing, safe downloads, backing up your files.",
    href: "phase2/week8.html", status: "pending"
  },
  {
    phase: 3, week: 9, title: "Advanced System Management",
    skills: "Task Manager deep-dive, Control Panel / Settings, drivers & updates, storage and disk cleanup.",
    href: "phase3/week9.html", status: "pending"
  },
  {
    phase: 3, week: 10, title: "Intro to the Command Line",
    skills: "Open a terminal, navigate folders with commands, run a simple script, understand what automation can do.",
    href: "phase3/week10.html", status: "pending"
  },
  {
    phase: 3, week: 11, title: "Troubleshooting & Maintenance",
    skills: "Diagnose a frozen PC, run malware scans, free up space, recover an unsaved file, ask for help effectively.",
    href: "phase3/week11.html", status: "pending"
  },
  {
    phase: 3, week: 12, title: "Capstone Project & Final Exam",
    skills: "Build a CV in Word, a budget in Excel and a pitch deck in PowerPoint, then sit a timed practical exam.",
    href: "phase3/week12.html", status: "pending"
  }
];
