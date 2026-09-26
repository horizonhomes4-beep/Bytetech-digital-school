# Practical PC Skills Course — student lesson + admin monitor

## Architecture now

### 1. Every lesson describes itself

Each `phaseN/weekN.html` contains its own:

```html
<meta name="week-data" content='{
  "phase": 1,
  "week": 1,
  "title": "Meet Your Machine",
  "skills": "...",
  "status": "live",
  "phaseTitle": "Digital Foundations",
  "phaseTagline": "...",
  "phaseColorVar": "--ink"
}'>
```

The curriculum and course map fetch the lesson pages and read those tags directly. There is no `weeks-data.js` and no `build-weeks-data.js` step.

### 2. Student identity continues from the previous login page

The lesson pages use the same session key already written by the previous login page:

```js
sessionStorage.lessonDeskStudent
```

Expected value:

```js
{ id, name, classId }
```

The lesson page re-checks `students/{id}` in Firebase, then keeps the student's ID with their live activity and lesson progress.

If the session is missing, the student is sent to the configured login page and the intended lesson URL is saved as:

```js
sessionStorage.lessonDeskReturnTo
```

To automatically return to the requested lesson after the existing login script succeeds, add this one line/script to the existing login page:

```html
<script src="YOUR-PATH/assets/login-return.js"></script>
```

The helper does not replace the existing login code; it simply notices the existing `lessonDeskStudent` session and redirects to the saved lesson.

### 3. Real-time student monitoring

While a student is working, Firebase receives:

- student ID/name
- current lesson/page
- current section
- current task when available
- checklist completion percentage
- last heartbeat time
- per-lesson checklist progress

The admin page listens to `students` with Firebase `onValue`, so the dashboard updates without a manual refresh.

### 4. Access request → admin grant

Pending lessons show a request button.

The request is stored under:

```text
accessRequests/
students/{studentId}/requests/
```

Admin can:

- see the student name and ID
- see the requested lesson
- Grant access
- Delete/deny the request

Granting creates:

```text
students/{studentId}/unlocked/{weekKey}: true
```

and removes the request from both request locations.

### 5. Admin lesson editor

`admin.html` now has a lesson editor.

Admin can:

- choose any of the 12 lesson pages
- type/paste HTML
- upload an `.html`/`.htm` file
- load an existing Firebase override
- save the lesson
- remove the override and return to the original file

Saved content goes to:

```text
lessonOverrides/{weekKey}
```

Students already on the lesson receive the update through Firebase's live listener.

If a complete HTML document is uploaded, the editor extracts its body and keeps its `<style>` elements. Script tags and inline `on...` event attributes are removed before saving.

### 6. Read aloud

`assets/read-aloud.js` provides:

- Play/pause
- Stop
- Male/female voice choice
- normal speaking speed (`1.0`)
- automatic selection of the best available English natural/neural voice exposed by the visitor's browser/OS

The exact voice is controlled by the student's Windows/browser voice inventory. A web page cannot guarantee a recorded human voice without a separate TTS provider or hosted audio service.

### 7. DevTools deterrent

`assets/devtools-guard.js` blocks common:

- F12
- Ctrl+U
- Ctrl+Shift+I
- Ctrl+Shift+J
- Ctrl+Shift+C
- right click

This is only a browser deterrent. It is not a security boundary. Real access control must be enforced by Firebase rules/server-side authentication.

## Firebase configuration

`assets/firebase-config.js` contains the Firebase project configuration taken from the supplied student login code.

The lesson portal expects the same database structure already used by the login page:

```text
students/{studentId}
admins/{adminId}
accessRequests/{requestId}
lessonOverrides/{weekKey}
```

## Important security note

The current student login is a custom database credential check, so the browser can technically be manipulated. The admin page is likewise protected by the existing `admins` database check.

For strong production security, move student/admin authentication to Firebase Authentication and enforce per-user Firebase Realtime Database rules. The client-side F12 protection must never be treated as protection for passwords or private data.
