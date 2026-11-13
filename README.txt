GMAIL TWO-PAGE FIREBASE CLASSROOM DEMO
======================================

WHAT IT DOES
------------
There are two separate pages:
- Student page: student signs in with Google, approves Gmail readonly access,
  reads their newest email, reviews it, and explicitly clicks "Share this email
  with Instructor".
- Administrator page: instructor signs in and sees only records students chose
  to share. Both pages use the same Firebase Authentication and Firestore
  project.

No hidden Gmail collection, background inbox monitoring, password collection,
or access to messages from other apps is implemented.

IMPORTANT PRIVACY MODEL
-----------------------
A student-shared message is copied into the classroom Firebase database and
becomes visible to the authorised instructor. Tell students this clearly
before they share. Use only consenting participants and preferably test with
a dedicated classroom Gmail account. The student must actively click Share.

REQUIREMENTS
------------
- Google account for Firebase project owner/instructor.
- Firebase project with Authentication (Google provider) and Firestore enabled.
- Gmail API enabled in the associated Google Cloud project.
- Node.js LTS and Firebase CLI on Windows 10.
- A real Android phone or Windows browser. No app install is needed on Android;
  open the hosted HTTPS student page in Chrome.

STEP 1 — CREATE FIREBASE PROJECT
--------------------------------
1. Open https://console.firebase.google.com/ and create a project.
2. Build > Authentication > Get started > Sign-in method.
3. Enable Google sign-in. Add the project domain to authorised domains if
   Firebase asks.
4. Build > Firestore Database > Create database.
5. Project settings > General > Your apps > Add Web app.
6. Copy the Firebase web config values into public/firebase-config.js:
   apiKey, authDomain, projectId, appId.
   Do not leave the PASTE_ placeholders.

STEP 2 — ENABLE GMAIL API AND OAUTH CONSENT
-------------------------------------------
1. Open https://console.cloud.google.com/ and select the same Google Cloud
   project associated with Firebase.
2. APIs & Services > Library > enable "Gmail API".
3. Open Google Auth Platform / OAuth consent screen. Configure the app name,
   support email and audience. For a test, add your own Gmail account and
   participating student test accounts as Test users if required.
4. The student login requests this scope:
   https://www.googleapis.com/auth/gmail.readonly
5. Google may show a testing/unverified warning. Only continue if this is your
   own project and you understand the requested readonly permission. Public use
   may require Google's verification process.

STEP 3 — INSTALL FIREBASE CLI ON WINDOWS
----------------------------------------
Open PowerShell:
    npm install -g firebase-tools
    firebase login
Go to the extracted project folder, then:
    firebase use --add
Choose your Firebase project and use alias "default".
If there is no .firebaserc file, copy .firebaserc.example to .firebaserc and
replace YOUR_FIREBASE_PROJECT_ID with the actual project ID.

STEP 4 — DEPLOY FIRESTORE RULES AND HOSTING
-------------------------------------------
From the project root:
    firebase deploy --only firestore:rules,hosting

The CLI will print a Hosting URL similar to:
    https://YOUR_PROJECT_ID.web.app

Open:
    https://YOUR_PROJECT_ID.web.app/student.html
    https://YOUR_PROJECT_ID.web.app/admin.html

STEP 5 — GOOGLE OAUTH AUTHORIZED DOMAINS
----------------------------------------
In Firebase Authentication settings, ensure the Firebase Hosting domain
YOUR_PROJECT_ID.web.app is an authorised domain.
The Gmail API and OAuth consent configuration must be for the same Google
Cloud/Firebase project. For the Firebase Google provider, the Google OAuth
client configured by Firebase is used with the requested Gmail readonly scope.
If Google's OAuth configuration asks for an authorised origin, add the exact
HTTPS origin shown by Firebase Hosting.

STEP 6 — GRANT INSTRUCTOR ACCESS
--------------------------------
The admin page requires the Firebase custom claim labAdmin=true.

1. Sign in once on the administrator page with the intended instructor Google
   account so Firebase Authentication creates the user.
2. Firebase Console > Authentication > Users. Copy that user's UID.
3. Create a private service-account key from Google Cloud IAM only if your
   organisation permits this. Keep the JSON key outside the public project
   folder. Never upload or share it.
4. On the trusted Windows instructor PC, install the Admin SDK in a private
   folder:
       mkdir C:\MITSL-admin
       cd C:\MITSL-admin
       npm init -y
       npm install firebase-admin
5. Copy grant-admin.cjs into that folder. Set the environment variable using
   the exact path to your private key:
       $env:GOOGLE_APPLICATION_CREDENTIALS="C:\private\service-account.json"
6. Run:
       node grant-admin.cjs PASTE_INSTRUCTOR_UID
7. Sign out of the admin page and sign in again so the refreshed token contains
   the custom claim.
Do not put the service-account key in public/ or on student devices.

STEP 7 — CLASSROOM TEST
-----------------------
1. Open student.html on a phone or PC.
2. Student clicks "Sign in with Google and approve Gmail access".
3. Student reviews Google's permission prompt and approves.
4. Student clicks "Read latest email from Gmail".
5. Student compares the sender, subject and body with their own Gmail inbox.
6. Only if they agree to share, student clicks "Share this email with Instructor"
   and confirms the prompt.
7. Open admin.html on the instructor PC and sign in as the authorised instructor.
8. Click Refresh list. The shared message should appear.
9. Test with a dedicated sample email first, not private personal correspondence.

ANDROID USE
-----------
Once deployed to Firebase Hosting, open the HTTPS student URL on Android Chrome.
It is a mobile-friendly web page; no APK installation is needed for this Gmail
demonstration. Browser support for Google popups may require allowing popups
for your Firebase Hosting domain.

SECURITY NOTES
--------------
- The student can only write their own sharedEmails/{uid} document.
- Students cannot list or read other students' shared message records.
- Only users with labAdmin=true can list all shared records.
- This simple starter stores one latest shared message per student; sharing a
  later message replaces that student's previous shared record.
- This is a classroom prototype, not a production school records platform.
  Before real deployment, add institutional review, data retention/deletion
  policy, stronger enrollment/identity verification, monitoring and security
  testing. Never ask students to share sensitive or confidential email.
- If Google blocks the OAuth flow, do not bypass the warning. Review Gmail API,
  consent-screen test users, authorised domains and OAuth settings.
