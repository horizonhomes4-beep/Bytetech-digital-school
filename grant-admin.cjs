// Run this only on the instructor's trusted computer.
// Requires GOOGLE_APPLICATION_CREDENTIALS to point to a private service-account JSON key.
const admin = require("firebase-admin");
const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node grant-admin.cjs FIREBASE_AUTH_USER_UID");
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.applicationDefault() });
(async () => {
  const user = await admin.auth().getUser(uid);
  await admin.auth().setCustomUserClaims(uid, { ...(user.customClaims || {}), labAdmin: true });
  console.log(`Granted labAdmin=true to ${user.email || uid}. Sign out and sign in again.`);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
