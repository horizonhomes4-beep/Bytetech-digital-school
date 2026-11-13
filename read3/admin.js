import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);
let isAdmin = false;

function log(message) {
  $("log").textContent = `[${new Date().toLocaleTimeString()}] ${message}\n` + $("log").textContent;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
async function checkAdmin(user) {
  const token = await user.getIdTokenResult(true);
  return token.claims.labAdmin === true;
}
async function loadMessages() {
  if (!isAdmin) return;
  $("list").textContent = "Loading shared messages…";
  try {
    const q = query(collection(db, "sharedEmails"), orderBy("sharedAt", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      $("list").innerHTML = '<p class="muted">No students have shared a message yet.</p>';
      return;
    }
    $("list").innerHTML = "";
    snap.forEach(d => {
      const x = d.data();
      const date = x.sharedAt?.toDate ? x.sharedAt.toDate().toLocaleString() : "Timestamp pending";
      const card = document.createElement("article");
      card.className = "item";
      card.innerHTML = `<h3>${escapeHtml(x.subject || "(No subject)")}</h3>
        <div class="meta">Student: ${escapeHtml(x.studentEmail)} · Gmail account: ${escapeHtml(x.gmailAccount)}<br>
        From: ${escapeHtml(x.sender)}<br>Shared: ${escapeHtml(date)}</div>
        <div class="body">${escapeHtml(x.body || "(No body)")}</div>`;
      $("list").appendChild(card);
    });
    log(`Loaded ${snap.size} student-shared message record(s).`);
  } catch (e) {
    $("list").textContent = "Could not load messages: " + e.message;
    log("Firestore read error: " + e.message);
  }
}
$("signin").onclick = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    isAdmin = await checkAdmin(result.user);
    if (!isAdmin) {
      $("status").textContent = "Access denied: this account is not an authorised instructor.";
      $("refresh").disabled = true;
      $("list").textContent = "Instructor permission is required.";
      log("Sign-in succeeded, but labAdmin custom claim was not found.");
      return;
    }
    $("status").textContent = `Authorised instructor: ${result.user.email}`;
    $("refresh").disabled = false;
    $("signout").disabled = false;
    log("Instructor authentication and admin claim verified.");
    await loadMessages();
  } catch (e) {
    $("status").textContent = "Sign-in failed: " + e.message;
    log("Sign-in error: " + e.message);
  }
};
$("refresh").onclick = loadMessages;
$("signout").onclick = async () => {
  isAdmin = false;
  await signOut(auth);
  $("status").textContent = "Signed out.";
  $("refresh").disabled = true; $("signout").disabled = true;
  $("list").textContent = "Sign in as an authorised instructor to load records.";
  log("Instructor signed out.");
};
onAuthStateChanged(auth, async user => {
  if (!user) return;
  try {
    isAdmin = await checkAdmin(user);
    if (isAdmin) {
      $("status").textContent = `Authorised instructor: ${user.email}`;
      $("refresh").disabled = false; $("signout").disabled = false;
      await loadMessages();
    } else {
      $("status").textContent = "Signed in, but instructor access is not enabled.";
    }
  } catch (e) { log("Could not verify instructor claim: " + e.message); }
});
