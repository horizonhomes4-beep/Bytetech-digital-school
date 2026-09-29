# Practical Computer Skills — rebuilt setup

1. Deploy the contents of this folder to your hosting.
2. Make sure Firebase Realtime Database is the `survey-d97e7` database already configured in `assets/firebase-config.js`.
3. Import `seed-data.json` into Realtime Database if you want the sample accounts/content.
4. If this is a new database and you need the requested no-login admin page to write, the supplied `firebase-rules.json` matches that requirement but is intentionally open.
5. Open `index.html` for student login.
6. Open `admin.html` for the administrator control centre. There is no admin login.
7. Create a student in Admin → Students. Give the generated passcode to the student.
8. Student signs in and opens Week 1.
9. At the bottom of Week 1, the student requests Week 2.
10. Admin reviews the request and may send a notification/assignment, then clicks Grant access.
11. The student's Week 1 panel immediately changes to an Open Week 2 button.
