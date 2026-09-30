PAYMENT SENSITIVITY UPDATE
===========================

This package keeps the existing Firebase student-account functions and adds a
continuous fee-duration payment monitor without requiring changes to existing
student records.

CORE RULE
---------
The amount paid is converted into course-time coverage:

  payment coverage = (amount paid / full course fee) × registered duration

The system does NOT require a monthly payment and does NOT tell the student to
pay only one month.

A minimum courtesy/enforcement point of approximately 1 month + 15 days
(1.5 months) is used for active courses. After that point, if the amount paid
does not cover the elapsed course time, the account becomes OVERDUE and lesson
access is suspended.

REQUESTED EXAMPLES
------------------
Example 1:
  Course fee: N60,000
  Duration: 3 months
  Paid: N20,000

  N20,000 provides 1 month of fee coverage.
  At about 1 month + 15 days, the student is flagged overdue.
  The student is asked to settle the FULL remaining balance: N40,000.

Example 2:
  Course fee: N120,000
  Duration: 3 months
  Paid: N50,000

  N50,000 provides about 1.25 months of fee coverage.
  At about 1 month + 15 days, the student is flagged overdue because the
  amount paid is no longer sufficient for the elapsed course period.
  The student is asked to settle the FULL remaining balance: N70,000.

IMPORTANT
---------
The system does not suggest a monthly instalment once access is suspended.
The required settlement amount is the student's complete remaining balance.

STUDENT PAGE
------------
- Personalised warning uses the student's actual name.
- Shows course fee, amount paid, full balance, payment coverage and elapsed time.
- Once overdue, lesson access is marked SUSPENDED.
- The payment popup is checked immediately and then every 60 seconds while the
  student page is open.
- The overdue popup can reappear every minute until the account is brought up
  to date.
- The calculation uses the existing start date, end date, fee and paid fields.
- No new Firebase payment record is required.

ADMIN PAGE
----------
- Shows live overdue/reminder counts.
- Rechecks payment status every 60 seconds even if Firebase data has not changed.
- Newly overdue students generate an administrator notification.
- Each student row shows the payment status and full balance.

INDEX / STUDENT ACCOUNTS PAGE
-----------------------------
- Shows the same live payment sensitivity status.
- Rechecks every 60 seconds so an account can become overdue without a page
  refresh or Firebase edit.
- Newly overdue accounts generate an on-screen notification.

LESSON ACCESS GATE
------------------
payment-gate.js blocks a lesson when the student is overdue.
It also rechecks the payment status every 60 seconds if the lesson page remains
open, so access cannot remain active indefinitely after the payment threshold
has been reached.

FILES UPDATED
-------------
config.js
  Continuous fee-duration calculation and full-balance enforcement.

student.html
  Personalised payment popup and one-minute payment monitoring.

admin.html
  Live administrator monitoring and one-minute clock-based checks.

index.html
  Live payment monitoring and overdue notifications.

payment-gate.js
  Full-balance lesson access gate with one-minute rechecking.

PAYMENT LOGIC PRESERVATION
--------------------------
Existing Firebase paths, Firebase configuration, certificate workflow,
student fields, account links and CRUD operations are preserved. The payment
status is calculated from the existing fields rather than rewriting the
database structure.


UI UPDATE
---------
Index and Admin now use compact color-coded payment status icons instead of
always-visible payment details.

GREEN:
  Payment is okay / paid in full.

AMBER:
  Payment coverage is ending soon and attention is required.

RED:
  Payment coverage has elapsed and lesson access is suspended.

GREY:
  Course ended or payment status is unavailable.

Clicking the status icon on INDEX or ADMIN opens a clean detail modal showing:
- Student name
- Payment status
- Course fee
- Amount paid
- Full outstanding balance
- Course duration
- Payment coverage
- Course time used
- Fee-paid progress
- Time-covered progress
- Course start and end dates

The detailed payment information is intentionally hidden from the main list
until the icon is clicked, keeping both pages clean.

The Admin page received additional visual polishing for its header, form area,
statistics, table, row hover states, payment controls and responsive layout.
