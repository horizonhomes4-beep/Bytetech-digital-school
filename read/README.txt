GMAIL READ-ONLY CONSENT DEMO
============================

This is a small responsive browser demo for Windows and Android. It requests the
Google Gmail readonly OAuth scope and displays the sender, subject and readable body of the newest
email only (up to 20,000 characters; attachments are not displayed). It does NOT ask for a Gmail password.

IMPORTANT LIMITATION:
This demo does not secretly run in the background. It polls every 60 seconds
only while the page is visible. When the browser tab is hidden/minimised, it
pauses and resumes when visible. Mobile browsers can suspend tabs. Continuous
background access would require a separate, explicitly authorised server-side
design and additional security controls; this demo does not implement that.

SETUP (one-time Google configuration)
-------------------------------------
1. Go to https://console.cloud.google.com/ and create/select a Google Cloud project.
2. In APIs & Services > Library, enable "Gmail API".
3. In Google Auth Platform / OAuth consent screen, configure the app:
   - Audience: External (for a personal Gmail account, as appropriate).
   - Add your Google account as a Test user while the app is in testing.
   - Add scope: https://www.googleapis.com/auth/gmail.readonly
   Google may require additional verification before public distribution.
4. In APIs & Services > Credentials, create an OAuth client ID:
   - Application type: Web application.
   - Add the exact website origin under Authorized JavaScript origins.
   - For local testing, use http://localhost:8000.
   - For a hosted HTTPS deployment, add that exact https:// origin.
5. Copy the OAuth Client ID and paste it into the demo page.

RUN ON WINDOWS 10 (local test)
------------------------------
1. Install Python 3 from https://www.python.org/downloads/ if it is not already
   installed. During setup, tick "Add Python to PATH".
2. Extract this ZIP to a folder, for example C:\GmailConsentDemo.
3. Open PowerShell and run:
       cd C:\GmailConsentDemo
       py -m http.server 8000
4. On the Windows PC, open:
       http://localhost:8000
5. Paste your OAuth Web Client ID and select "Connect Gmail with Google".
6. Review Google's consent screen and approve read-only access.
7. Select "Read one latest email" to fetch one email's sender, subject and readable message body.
8. Select "Start 60-second refresh" to see visible-page polling. Switch tabs to
   see the app report that checks are paused while hidden.

OPEN ON AN ANDROID PHONE
------------------------
The local localhost address works only on the Windows PC itself. To open this
demo on a phone, host the folder on an HTTPS static website (for example, your
own Firebase Hosting site). Then add that exact HTTPS origin to the OAuth
client's Authorized JavaScript origins and open the HTTPS link on the phone.
Do not share the page publicly before you have reviewed consent-screen and
access settings. Use only your own account or an account whose owner agreed.

PRIVACY
-------
- The page uses Google's official Identity Services library and Gmail API.
- Requested scope is Gmail readonly.
- No Gmail password is collected.
- The access token is held in page memory; the demo does not send it to your
  own server.
- Disconnect revokes the token where possible and clears the page state.
- Do not use a shared/public computer.
- Never paste service-account keys or private credentials into this page.

TROUBLESHOOTING
---------------
- "Origin not allowed": add the exact origin (scheme, host and port) in OAuth
  Authorized JavaScript origins.
- "Access blocked" or "app not verified": confirm you created the OAuth project,
  added your account as a test user, and requested only the readonly scope.
- "Gmail API has not been used/enabled": enable Gmail API in the selected Cloud
  project and wait a few minutes.
- "Token expired": click Connect Gmail again.
- Do not disable Google account security or bypass a warning for an unknown app.
