// READ ALOUD
// Uses the best natural/neural English voice exposed by the visitor's browser/OS.
// The browser controls the actual voice inventory. Male/female is selected when
// the platform exposes a voice whose name makes that distinction clear.
// Normal speed = 1.0.
(function () {
  if (!("speechSynthesis" in window)) return;

  let voices = [];
  let gender = "female";
  let utterance = null;

  const $ = id => document.getElementById(id);

  function refreshVoices() {
    voices = speechSynthesis.getVoices().filter(v => /^en(-|$)/i.test(v.lang || ""));
    populateVoiceDetails();
  }

  function score(v, wanted) {
    const n = (v.name || "").toLowerCase();
    let s = 0;
    if (/neural|natural|online|premium|enhanced|multilingual/.test(n)) s += 100;
    if (/microsoft|google|apple/.test(n)) s += 25;
    if (wanted === "female" && /female|zira|samantha|susan|karen|victoria|aria|jenny|sonia|hazel|libby|ava|serena/.test(n)) s += 80;
    if (wanted === "male" && /male|david|daniel|alex|fred|george|mark|guy|ryan|liam|aaron/.test(n)) s += 80;
    if (/en-ng/i.test(v.lang)) s += 50;
    if (/en-gb|en-us|en-au|en-za/i.test(v.lang)) s += 15;
    return s;
  }

  function bestVoice(wanted) {
    const pool = voices.length ? voices : speechSynthesis.getVoices();
    return [...pool].sort((a,b) => score(b,wanted) - score(a,wanted))[0] || null;
  }

  function text() {
    const target = document.querySelector("[data-readable]") || document.querySelector("main") || document.body;
    const nodes = target.querySelectorAll("h1,h2,h3,h4,h5,p,li,label,dt,dd");
    const out = [];
    nodes.forEach(n => {
      if (n.closest("nav,footer,#readAloudBar,.course-map,#lessonAccessBox")) return;
      const t = n.textContent.replace(/\s+/g, " ").trim();
      if (t && !out.includes(t)) out.push(t);
    });
    return out.join(". ");
  }

  function render() {
    if (document.getElementById("readAloudBar")) return;
    const bar = document.createElement("div");
    bar.id = "readAloudBar";
    bar.innerHTML =
      '<button id="raPlay" type="button" aria-label="Read lesson aloud">▶</button>' +
      '<select id="raGender" aria-label="Voice"><option value="female">Female natural voice</option><option value="male">Male natural voice</option></select>' +
      '<button id="raStop" type="button" aria-label="Stop reading">■</button>';
    document.body.appendChild(bar);

    $("raGender").value = gender;
    $("raGender").addEventListener("change", e => {
      gender = e.target.value;
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        setTimeout(play, 80);
      }
    });
    $("raPlay").addEventListener("click", () => speechSynthesis.speaking ? speechSynthesis.cancel() : play());
    $("raStop").addEventListener("click", () => { speechSynthesis.cancel(); updateButtons(false); });
  }

  function updateButtons(speaking) {
    if ($("raPlay")) $("raPlay").textContent = speaking ? "Ⅱ" : "▶";
  }

  function play() {
    const value = text();
    if (!value) return;
    speechSynthesis.cancel();
    utterance = new SpeechSynthesisUtterance(value);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const v = bestVoice(gender);
    if (v) utterance.voice = v;
    utterance.lang = v?.lang || "en";
    utterance.onstart = () => updateButtons(true);
    utterance.onend = utterance.onerror = () => updateButtons(false);
    speechSynthesis.speak(utterance);
  }

  speechSynthesis.onvoiceschanged = refreshVoices;
  refreshVoices();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
  window.addEventListener("beforeunload", () => speechSynthesis.cancel());
})();
