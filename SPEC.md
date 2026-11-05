# ShiftPatch specification

## Goal

A deployed app where an agency posts an open nursing shift, a nurse with valid credentials claims it, and an admin can see who is covering every shift. The scope is limited to what can be built and verified in about eight hours.

Authoritative sources:

- [Technical spec](docs/ShiftPatch-Technical-Spec.md): routes, sample data and test IDs. It wins on any contract question.
- [Trial brief](docs/Designli%20Trial%20Challenge%20-%20Product%20Engineer.md): product brief, deliverables and evaluation.
- Scope commitment emailed on 2026-11-05: role-based access, posting and claiming shifts with credential checks, cancellation/no-show handling, admin shift coverage, a deployed app with the sample data, and the required submission materials. Other work depends on the time remaining.

Items marked (decision) are choices made where the sources are silent or conflict, not requirements imposed by the trial.

Delivery follows the actor groups under Functional requirements: Foundation, Nurse, Admin, Agency, then Operator. Each group's subsections are marked core or supporting. Core is the fixed technical baseline and the emailed core flow. Supporting covers credential upload and review, the audit log screen and scheduled hours. Those supporting workflows remain in this version to complete the required UI surfaces, and admin credential approval is a retained product decision. If time runs short, finish every group's core before any supporting subsection, because agency posting is part of the emailed commitment. Reserve time within the eight-hour budget for deployed verification and all five submission materials. Further founder-wishlist features remain excluded.

## Tracking

Each requirement has a stable ID. IDs are never reused, and removed IDs are listed here. Check an item only after it has been verified against the deployed app or an automated test. Unchecked does not necessarily mean absent.

Requirements are grouped by actor, so a group can hold IDs from several FR families. A route that several actors use sits with the first actor in delivery order, and later groups list it under "Relies on".

Removed IDs: none.

### Status

The Foundation and Nurse groups are built. Admin, Agency and Operator are next.

Ticked items are covered by automated tests. Validate the current revision with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `make e2e`.

Specs: `tests/e2e/foundation/{fields,login,session,seed}.spec.ts` and `tests/e2e/nurse/{access,browse,claim,cancel,credential,timesheet}.spec.ts`. Unit tests: `tests/{password,token,request,time,facility,session}.test.ts` and `tests/page.test.tsx`.

What exists:

- **Server**
  - `lib/db.ts` is the typed Postgres layer: parameter-only `sql`, schema-decoded rows, additive migrations, and a one-time seed under an advisory lock.
  - Shared modules: `lib/password.ts` (scrypt), `lib/token.ts` (HS256 JWT, 8 h), `lib/auth.ts` (per-route guard), `lib/http.ts`, `lib/audit.ts`, `lib/seed.ts` (reset), `lib/shifts.ts`, `lib/credentials.ts` and `lib/facility.ts`.
  - Routes:
    - `POST /api/auth/login`
    - `GET /api/shifts`
    - `POST /api/shifts/:id/claim`
    - `POST /api/shifts/:id/cancel`
    - `GET /api/credentials/me`
    - `POST /api/credentials`
    - `GET /api/credentials/uploads/:id/document`
    - `GET /api/timesheet`
- **Client**
  - `/` holds the session gate, the canvas sign-in card and one section shell per role (account menu with Sign out, top-bar banner slot).
  - The Nurse screen has open and own shifts, claim and cancel, the credential panel with upload, and scheduled hours.
  - Every section polls every 3 s.
- **Tooling**: `playwright.config.ts`, `make db-up`, `make e2e ARGS=…`, and a CI `e2e` job with a Postgres service.

Built but left unticked:

- **FR-1.8**: the login form, landing and sign-out work for all roles. The agency and admin screens are still empty shells, so their test IDs (FR-1.10, FR-1.11) are missing.
- **FR-6.6**: the cancel route stores the reason and `previous_nurse_id` on the audit entry. The admin audit screen that shows them is not built.
- **FR-6.7, FR-6.8**: the nurse halves are tested. The agency halves (cancel button and reason chooser) are not built.
- **FR-8.2**: claim, blocked claim, cancel, upload and seed reset each write one entry, and the tests check them. Posting, approval and rejection come in later groups.
- **FR-8.3**: every route writes its entry on the same transaction as its change. Only a primitive-level test proves the rollback, plus the blocked-claim route test.
- **FR-8.4**: a grep confirms no route or screen updates or deletes `audit_log`. No test asserts it yet.
- **FR-10.1**: `resetToSeed()` exists and is tested. The documented operator command is Operator work.
- **FR-11.2 to FR-11.5**: need the deployed app.
- **NFR-1 to NFR-4 and NFR-7 to NFR-9**: hold for everything built so far. Each needs the remaining screens, a CI run on push, or the deployment before it can be ticked.

Known issues to settle in a later group:

- `GET /api/credentials/uploads/:id/document` answers 404 before checking ownership, so another nurse can tell whether an upload ID exists (404 versus 403). The IDs are random.
- The claim route reads the approved expiry without a row lock. Once admin approval (FR-7.6) exists, an approval committing mid-claim could be read stale. Lock the credentials row in FR-7.6.
- FR-6.4: a nurse cancelling an open shift with an invalid reason gets 400, because the ordered list puts 400 before 409. That contradicts the sentence "A nurse cancelling any open shift therefore gets 409".

## Functional requirements

### Foundation: every actor

Built first. Every actor group depends on it. The seeded shifts and credential dates let the nurse group start before agency posting exists.

#### Login and roles (FR-1) · core

- [x] FR-1.1 `POST /api/auth/login` with valid credentials returns 200 and `{ token, user: { id, name, role } }` for all five sample accounts. `token` is a JWT and `role` is `nurse`, `agency` or `admin`.
- [x] FR-1.2 A wrong email or wrong password returns 401 and `{ "error": "Invalid email or password" }`, with no difference between the two cases.
- [x] FR-1.3 An agency login returns its agency ID as `user.id` and the agency name as `user.name`. (decision)
- [x] FR-1.4 A missing, malformed or expired token on an authenticated route returns 401 with `{ error }`. (decision)
- [x] FR-1.5 A valid token whose role is not allowed on a route returns 403 with `{ error }`. (decision)
- [x] FR-1.6 Identity, role and agency come only from the verified token, never from the request body.
- [x] FR-1.7 The login form uses `login-email-input`, `login-password-input` and `login-submit-button`. A failed login shows the error message in `notification-banner`.
- [ ] FR-1.8 Opening the submitted URL with no session shows the login form directly. After login, each role has one landing screen that shows all its required test IDs with no further navigation. FR-1.9 to FR-1.11 list them per role. Items that depend on data appear when that data exists. A user can sign out to switch accounts. (decision)

#### Sample data and deployed app (FR-11) · core

- [x] FR-11.1 A fresh database contains exactly the sample agencies, nurses, admin, shifts and credential dates from the technical spec. Redeploying neither duplicates nor overwrites them.
- [ ] FR-11.2 The app runs at a public HTTPS URL that opens without any access step. The API is served at `/api/...` from that URL's root. See assumption A2.
- [ ] FR-11.3 The API and all screens above work on the deployed URL with the sample logins.
- [ ] FR-11.4 Failed logins and every user action in FR-2 to FR-9 report success or failure in a single `notification-banner`, told apart by its text.

#### Audit trail (FR-8) · core

Each actor group writes its own entries as it is built, so no route needs a later retrofit. The admin group adds the screen that reads them.

- [ ] FR-8.2 Posting, claiming, blocked claims, cancelling, credential upload, approval, rejection and operator seed reset each add one entry. (decision)
- [ ] FR-8.3 An entry is saved together with the change it records, so neither can exist without the other. Blocked claims change nothing and add only the entry. (decision)
- [ ] FR-8.4 No route or screen can edit or delete an entry. (decision)

### Nurse

Sample accounts: `nurse-1` Maria Lopez (valid credential) and `nurse-2` James Cook (lapsed credential).

#### Landing screen · core

- [x] FR-1.9 The nurse landing screen shows `shift-list-item`, `shift-claim-button`, `shift-cancel-button`, `credential-upload-input`, `credential-expiry-date-input` and `timesheet-table`. (decision)

#### Browse and claim (FR-3) · core

- [x] FR-3.1 `GET /api/shifts` with any valid token returns 200 and `{ shifts }`, listing every shift of every status from both agencies, in the full shift shape. See assumption A1.
- [x] FR-3.2 The nurse screen shows each open shift as a `shift-list-item` with its own `shift-claim-button`.
- [x] FR-3.3 `POST /api/shifts/:id/claim` with an empty body from an eligible nurse returns 200 and the updated shift, with `status: "filled"` and `claimedBy` set to that nurse.
- [x] FR-3.4 Claiming a filled shift returns 409 with `{ error }`. An unknown ID returns 404. A caller who is not a nurse gets 403. (decision)
- [x] FR-3.5 When several nurses claim the same open shift at the same time, exactly one succeeds and the others get 409. (decision)
- [x] FR-3.6 A successful claim shows "Shift claimed" in the banner, and the shift moves to the nurse's own shifts without a manual reload. (decision)

#### Lapsed-credential block (FR-4) · core

- [x] FR-4.1 A nurse with a lapsed credential gets 403 and exactly `{ "error": "Credential expired, cannot claim shift" }`, and the shift does not change.
- [x] FR-4.2 `shift-claim-button` stays visible and enabled for a nurse with a lapsed credential. Clicking it calls the claim route, and the banner shows exactly the FR-4.1 message. (decision)
- [x] FR-4.3 The credential check runs before the shift status check, so `nurse-2` gets this 403 on any existing shift. (decision)
- [x] FR-4.4 A credential is valid only if its approved expiry date is on or after both today and the date the shift ends. An overnight shift ends the day after its `date`. The expiry date itself counts as valid. "Today" means the current date in `America/New_York`, the facility-local time for this demo, and FR-7.3 uses the same date. (decision)
- [x] FR-4.5 `nurse-1` can claim the seeded `shift-1` even though its date has passed. (decision)
- [x] FR-4.6 Eligibility means valid credentials only, because the roster has no RN or LPN field. (decision)

#### Cancellation and no-show (FR-6) · core

The cancel route is built here and shared with the agency and admin groups.

- [x] FR-6.1 `POST /api/shifts/:id/cancel` with `{ reason }` on a filled shift returns 200 and the shift with `status: "open"` and `claimedBy: null`, plus `cancellation: { reason, previousNurseId }`.
- [x] FR-6.2 A missing or invalid `reason` returns 400 with `{ error }`. Valid reasons are `no-show` and `advance`. (decision)
- [x] FR-6.3 The assigned nurse, the owning agency and the admin may cancel. Everyone else gets 403. (decision)
- [x] FR-6.4 Cancel checks run in this order: 401 for a bad token, 404 for an unknown ID, 403 for an agency that does not own the shift or a nurse when another nurse holds it, 400 for an invalid reason, and 409 if the shift is open. A nurse cancelling any open shift therefore gets 409. (decision)
- [x] FR-6.5 A cancelled shift can be claimed again.
- [ ] FR-6.7 `shift-cancel-button` appears on a nurse's own claimed shifts and on an agency's filled shifts. One click completes the cancellation, with no confirmation step. (decision)
- [ ] FR-6.8 A nurse's cancel uses `advance`. An agency chooses the reason beside the button, defaulting to `advance`. (decision)
- [x] FR-6.9 Cancelling reopens the shift, so its status after a cancel is `open`, as the cancel route's example requires, and `cancelled` is never a stored or API status. The test ID table also lists `cancelled` as a badge value. See assumption A4. (decision)

#### Credential upload (FR-7) · supporting

- [x] FR-7.1 A nurse can upload a document using `credential-upload-input` and `credential-expiry-date-input`, and submit it with a visible button. (decision)
- [x] FR-7.2 Only PDF, PNG and JPEG files up to 4 MB are accepted, and the type is checked from the file's content. (decision)
- [x] FR-7.3 An expiry date in the past is rejected with an error in the banner. (decision)
- [x] FR-7.4 An upload is `pending` and does not change eligibility until an admin approves it. (decision)
- [x] FR-7.5 A nurse can see their approved expiry date with its state, `valid` or `expired`, and their latest upload's expiry date with its state, `pending`, `approved` or `rejected`. A new upload replaces that nurse's existing pending upload and its file. (decision)
- [x] FR-7.7 Only the uploader and the admin can retrieve a document. Files are never publicly reachable. (decision)

#### Scheduled hours (FR-9) · supporting

The table and its role scoping are built here and shared with the admin and agency groups.

- [x] FR-9.1 `timesheet-table` lists filled shifts with nurse, agency, date, times and hours, labelled as scheduled hours. (decision)
- [x] FR-9.2 Overnight shifts count correctly, so `19:00` to `07:00` is 12 hours. (decision)
- [x] FR-9.3 An admin sees all rows, an agency sees its own shifts, and a nurse sees their own shifts. (decision)

### Admin

Sample account: `admin-1` Alex Kim.

Relies on: FR-3.1 (all shifts), FR-6.1 to FR-6.4 (cancel through the API only), FR-7.7 (document access) and FR-9.1 to FR-9.3 (all rows).

#### Landing screen · core

- [ ] FR-1.11 The admin landing screen shows `admin-dashboard-shift-table`, `admin-shift-status-badge`, `audit-log-table` and `timesheet-table`. (decision)

#### Live dashboard and basic reporting (FR-5) · core

- [ ] FR-5.1 `admin-dashboard-shift-table` lists every shift with agency, role, date, times and the covering nurse's name.
- [ ] FR-5.2 Each row has an `admin-shift-status-badge` showing the shift's API status, `open` or `filled`. See FR-6.9 and assumption A4. (decision)
- [ ] FR-5.3 The dashboard shows the number of open shifts and filled shifts.
- [ ] FR-5.4 A change made elsewhere appears within 5 seconds without a manual reload. (decision)
- [ ] FR-5.5 Admin-only data and screens return 403 or are unavailable to nurses and agencies.

#### Cancellation record (FR-6) · core

- [ ] FR-6.6 The reason and previous nurse are stored and visible to the admin in the audit log.

#### Credential review (FR-7) · supporting

- [ ] FR-7.6 An admin can see pending uploads, open each document, and approve or reject it. Approval makes that expiry date the one used by FR-4.4. (decision)

#### Audit log screen (FR-8) · supporting

- [ ] FR-8.1 `audit-log-table` is visible only to the admin. It lists actor, action, affected record, time and any cancellation reason, newest first. (decision)

### Agency

Sample accounts: `agency-a` Sunrise Health Staffing and `agency-b` Metro Care Partners.

Relies on: FR-6.1 to FR-6.4, FR-6.7 and FR-6.8 (cancel with a reason) and FR-9.1 to FR-9.3 (own rows).

#### Landing screen · core

- [ ] FR-1.10 The agency landing screen shows `agency-post-shift-button`, `shift-cancel-button` and `timesheet-table`. (decision)

#### Post a shift (FR-2) · core

- [ ] FR-2.1 `POST /api/shifts` with `{ role, date, startTime, endTime }` from an agency returns 201 and the full shift, with `status: "open"`, `claimedBy: null`, and `agencyId` and `agencyName` taken from the token.
- [ ] FR-2.2 An `agencyId` in the request body has no effect.
- [ ] FR-2.3 A caller who is not an agency gets 403.
- [ ] FR-2.4 An invalid body returns 400 with `{ error }`. Valid means `role` is `RN` or `LPN`, `date` is a real `YYYY-MM-DD` date, times are 24-hour `HH:mm`, and start and end differ. (decision)
- [ ] FR-2.5 Dates in the past are accepted, because the sample shifts and the spec's example may already be past. (decision)
- [ ] FR-2.6 An `endTime` earlier than `startTime` is accepted as an overnight shift.
- [ ] FR-2.7 New shifts get a unique `shift-<n>` ID that is never reused. The spec's `shift-7` is illustrative. (decision)
- [ ] FR-2.8 `GET /api/agencies/:agencyId/shifts` with the caller's own agency ID returns 200 and `{ agencyId, shifts }`, using the full shift shape and only that agency's shifts.
- [ ] FR-2.9 Another agency or a nurse requesting that route gets 403. An admin may read any agency, and an unknown agency returns 404 for an admin. (decision)
- [ ] FR-2.10 `agency-post-shift-button` opens the form and `agency-post-shift-submit-button` submits it. The form opens with valid default values, so it can be submitted unchanged. (decision)
- [ ] FR-2.11 The agency screen lists only its own shifts with their current status and the covering nurse.

### Operator

No screen or HTTP route. Run from the deployment environment.

#### Operator seed reset (FR-10) · supporting

- [ ] FR-10.1 A documented operator command restores shifts and credential expiry dates to the exact sample data and removes all uploaded credential records and files. (decision)
- [ ] FR-10.2 Only the deployment operator can run the reset. No application screen or HTTP endpoint exposes it. (decision)
- [ ] FR-10.3 The audit log is kept and records the reset. IDs of removed shifts are not reused. (decision)

#### Submission (FR-11) · core

- [ ] FR-11.5 After the last verification and before submission, the operator seed reset in FR-10 runs on the deployed app, and `GET /api/shifts` is confirmed to return only `shift-1`, `shift-2` and `shift-3` in their seeded states. No other writes are made to deployed data before submitting. (decision)

## Non-functional requirements

- [ ] NFR-1 Contract fidelity: required routes return exactly the specified keys, and every error body is `{ "error": "<message>" }`. All 15 test IDs in the technical spec are present as `data-testid` with their exact names, on the elements it describes. Supports FR-1 to FR-9.
- [ ] NFR-2 Security: passwords are stored only as salted hashes and never returned. Signing keys and other secrets live outside git, and the only committed credentials are the published sample passwords. Every route enforces permissions itself. After 20 failed logins for the same email and client address within 15 minutes, further attempts for that pair return 429 with `{ error }` until the window ends. Other emails and addresses are unaffected, and accounts are never locked (decision). Supports FR-1 and FR-7.
- [ ] NFR-3 Durability: data survives restarts and redeploys. Supports FR-11.
- [ ] NFR-4 Quality gate: CI runs type checks, lint, tests and build on every push, and all pass. Tests cover FR-1 to FR-10, including cross-agency access, simultaneous claims, overnight hours, credential upload validation, approval and rejection, protected file access, audit entries, role-scoped scheduled hours and operator seed reset.
- [ ] NFR-5 Branding: the UI and public URL use the fictional, neutral ShiftPatch brand and never Designli's name or assets.
- [x] NFR-6 Data: the demo holds synthetic data only, and the upload form tells users not to upload real documents. Supports FR-7.
- [ ] NFR-7 Usability: every screen handles loading, empty and error states, and a first-time reviewer can complete the main flow without instructions.
- [ ] NFR-8 Static security: at submission, a full dependency audit including dev dependencies reports no high or critical vulnerabilities, and an OWASP-rules static scan reports no high-severity findings. CI runs both.
- [ ] NFR-9 Deployed verification: use the sample accounts to exercise FR-1 to FR-9 in a browser at the submitted URL, confirm all 15 required test IDs are on the intended elements, and verify cross-session admin updates within 5 seconds. Include expired-credential rejection, upload followed by admin approval and successful claim, cancellation with each reason, audit entries and role-scoped scheduled hours. Then complete FR-11.5.

## Constraints and exclusions

Constraints:

- TypeScript, on the repo's existing Next.js 16 setup and strict compiler settings.
- Follow the installed Next.js docs, as `AGENTS.md` requires.
- Submission includes the deployed app, repo with passing CI, the agentic setup actually used, a 5-minute Loom explaining the built scope and omissions to the founder in non-technical language, and full unedited transcripts of every AI session.
- `ESCALATION.md` is committed as soon as the issue is identified, because reviewers check the timestamp. It covers the inspector export and has these sections: Problem, Root cause, Alternative solutions considered, Recommended solution, Impact/urgency.

Unconfirmed grader assumptions; use these defaults until clarified:

- A1: `GET /api/shifts` requires a token.
- A2: graders call `/api/...` at the root of the submitted URL.
- A3: retain admin approval before an upload changes eligibility, as specified in FR-7. The technical packet does not define the upload API or an approval sequence; compatibility with the grader's renewal flow is unconfirmed.
- A4: graders expect `admin-shift-status-badge` to show `open`, not `cancelled`, after a cancellation.

Excluded from this version:

- Inspector export of license documents and TB results. It's raised in `ESCALATION.md` instead of being built.
- Email notifications.
- Clock-in and clock-out, timesheet approval and payroll.
- Reporting beyond the FR-5.3 counts.
- PostHog analytics.
- RN and LPN matching, and overlapping-shift checks.
- TB test records and other credential types.
- WebSockets or other push updates.
- Tools for demand validation or prospect verification. This trial demonstrates the staffing workflow; validating buyer demand remains a separate founder activity and must be identified as deferred in the Loom.
