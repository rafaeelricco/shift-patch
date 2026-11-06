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

All product groups are implemented, including admin credential review and the standalone operator command. The current UI and required API/test-ID contracts are preserved. Production acceptance, CI for the published revision and the final production reset remain separate delivery gates.

### Verification ledger

Evidence date: **2026-11-05 (America/Sao_Paulo)**. Evidence target: the implementation changes in this PR, based on `6cb289c79395596c843e0b55994ea9a652d9cff7`. These local checks ran before publication; CI must separately verify the published revision. Automated checks use Node 24.22.1 and disposable PostgreSQL 17. Local browser checks use the production build on port 3101 and a separate disposable database. No local result is presented as deployed verification.

| Requirements / check | Evidence | Result |
| --- | --- | --- |
| Type safety, lint | `pnpm typecheck`, `pnpm lint` | Passed. Lint initially scanned generated files in an ignored local agent worktree; the root ESLint configuration now excludes that worktree. |
| UI/unit regressions | `pnpm test` | 102 tests across 13 files passed, including review loading, empty, error/retry, stale polling, duplicate clicks and notification handling. |
| FR-7.6; FR-4.4 locking; FR-7.7 privacy | `tests/e2e/admin/{credentials,credential-screen}.spec.ts`, `tests/e2e/nurse/{claim,credential}.spec.ts` | Passed in the production-build E2E run. Covers both nurses/agencies, approval/rejection, expired pending uploads, replacement ordering, claim/review ordering, duplicate decisions and audit-failure rollback. Concurrent decisions now explicitly queue both requests behind the nurse lock. |
| FR-6.4 validation order | `tests/e2e/nurse/cancel.spec.ts` | Passed, including invalid reason on an open shift returning 400 before 409. |
| FR-10 operator process | `tests/e2e/operator/reset.spec.ts` | All five process tests passed: exact restoration including a missing credential, removed uploads/documents and login failures, preserved history and sequence, transaction rollback, sanitized failures and process exit/cleanup. |
| Full application regressions/build | `make e2e` | 213 tests passed against the production build. Earlier runs exposed two test-harness issues: conflicting inherited color settings in subprocess stderr, then text ordering of numeric audit IDs. Both were corrected within the two allowed fix/rerun rounds; no product failure remained. |
| FR-8.2 / FR-8.3 audit writes | Mutation suites under `tests/e2e/{agency,nurse,admin,operator}` | Passed: one entry per successful mutation or blocked claim; transactional rollback verified at the database primitive, approval/rejection endpoints and actual reset command. |
| FR-8.4 audit immutability | Audit route/UI inspection, source search for audit UPDATE/DELETE/TRUNCATE, operator history-preservation test | Only the admin GET route exposes audit records; no application mutation path or editing control exists. Reset preserves all prior entries. |
| NFR-1 / NFR-2 | Contract, role, token, login-throttle, password, file-access suites; required-ID source comparison; ignored environment files | Passed automated coverage for required response shapes and all 15 IDs, permissions including both agencies/nurses, hash-only storage, token tampering and failed-login limits. Server secrets remain environment-only. Deployed element checks remain pending below. |
| NFR-5 branding | Source/asset inspection and local Codex browser | ShiftPatch branding retained; no Designli name/assets in product source. |
| NFR-8 local security checks | `pnpm audit --audit-level=high`; CI's Semgrep 1.183.0 OWASP command | Passed: one moderate dependency finding, no high/critical; zero ERROR-severity Semgrep findings across the normal scan and an explicit scan of all seven new files. Submission CI remains pending. |
| Local Codex browser | James and Alex on `localhost:3101` / `127.0.0.1:3101` | Exact expired-claim message, synthetic PDF submission and protected viewing, keyboard approval, empty review queue, successful subsequent claim and scheduled hours verified. Approval propagated in 1,377 ms; claim in 2,333 ms, with no reload. These timings are local only. |

The full automated inventory is `tests/e2e/{foundation,nurse,admin,agency,operator}` plus `tests/*.test.{ts,tsx}`. The operator README documents setup, environment keys, accounts, checks, reset invocation and exclusions. `ESCALATION.md` remains unchanged.

Resolved issues: foreign nurses now receive the same 404 for existing and missing documents; upload, review and claim share the nurse credential lock; FR-6.4's wording now matches its established validation order.

### Remaining delivery verification

The user authorized publishing the verified implementation as a ready-for-review PR. Production release, deployed browser acceptance and the final production reset remain pending. The checklist below is reserved for the release pass. Require passing CI for the exact published revision, deploy through the existing Vercel project, and record that revision below before completing deployment requirements.

All ordinary account flows must first run on `https://shift-patch.vercel.app/` in the Codex browser:

- [ ] Sunrise: default/custom overnight posting, ownership, covering nurse, advance/no-show cancellation, hours and notifications.
- [ ] Metro: independent posting and ownership; Sunrise data/admin controls unavailable; own hours.
- [ ] Maria: both agencies, claim, own hours, hold-to-cancel, reopening and reclaim.
- [ ] James: enabled expired claim and exact error; upload validation; pending block; rejection; resubmission; approval and successful claim.
- [ ] Alex: complete coverage/counts, protected documents, both review decisions, audit actors/reasons/previous nurse, all hours.
- [ ] All 15 required test IDs, success/error notification, sign-out/account switching, role boundaries, keyboard operation, narrow layouts and loading/empty/error/retry states.
- [ ] Measured posting/claim/cancellation updates in an open admin session within five seconds, plus upload/review propagation. Verify alternate hostnames point to the same deployment/database before using them to isolate sessions.
- [ ] Persistence across a production redeploy.
- [ ] Acquire read-only confirmation authentication, run the operator reset as the last application-data write, confirm exactly the seeded three shifts with authenticated `GET /api/shifts`, record evidence, and make no further deployed writes.

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
- [x] FR-1.8 Opening the submitted URL with no session shows the login form directly. After login, each role has one landing screen that shows all its required test IDs with no further navigation. FR-1.9 to FR-1.11 list them per role. Items that depend on data appear when that data exists. A user can sign out to switch accounts. (decision)

#### Sample data and deployed app (FR-11) · core

- [x] FR-11.1 A fresh database contains exactly the sample agencies, nurses, admin, shifts and credential dates from the technical spec. Redeploying neither duplicates nor overwrites them.
- [ ] FR-11.2 The app runs at a public HTTPS URL that opens without any access step. The API is served at `/api/...` from that URL's root. See assumption A2.
- [ ] FR-11.3 The API and all screens above work on the deployed URL with the sample logins.
- [ ] FR-11.4 Failed logins and every user action in FR-2 to FR-9 report success or failure in a single `notification-banner`, told apart by its text.

#### Audit trail (FR-8) · core

Each actor group writes its own entries as it is built, so no route needs a later retrofit. The admin group adds the screen that reads them.

- [x] FR-8.2 Posting, claiming, blocked claims, cancelling, credential upload, approval, rejection and operator seed reset each add one entry. (decision)
- [x] FR-8.3 An entry is saved together with the change it records, so neither can exist without the other. Blocked claims change nothing and add only the entry. (decision)
- [x] FR-8.4 No route or screen can edit or delete an entry. (decision)

### Nurse

Sample accounts: `nurse-1` Maria Lopez (valid credential) and `nurse-2` James Cook (lapsed credential).

#### Landing screen · core

- [x] FR-1.9 The nurse landing screen shows `shift-list-item`, `shift-claim-button`, `shift-cancel-button` and `timesheet-table`. The Renewal disclosure on that screen contains `credential-upload-input` and `credential-expiry-date-input`. (decision)

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
- [x] FR-6.4 Cancel checks run in this order: 401 for a bad token, 404 for an unknown ID, 403 for an agency that does not own the shift or a nurse when another nurse holds it, 400 for an invalid reason, and 409 if the shift is open. A nurse cancelling an open shift with a valid reason gets 409; an invalid reason gets 400 first. (decision)
- [x] FR-6.5 A cancelled shift can be claimed again.
- [x] FR-6.7 `shift-cancel-button` appears on a nurse's own claimed shifts and on an agency's filled shifts. Nurses hold the button for two seconds with a primary pointer, Space or Enter. Agencies cancel with one click. (decision)
- [x] FR-6.8 A nurse's cancel uses `advance`. An agency chooses the reason beside the button, defaulting to `advance`. (decision)
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

- [x] FR-1.11 The admin landing screen shows `admin-dashboard-shift-table`, `admin-shift-status-badge`, `audit-log-table` and `timesheet-table`. (decision)

#### Live dashboard and basic reporting (FR-5) · core

- [x] FR-5.1 `admin-dashboard-shift-table` lists every shift with agency, role, date, times and the covering nurse's name.
- [x] FR-5.2 Each row has an `admin-shift-status-badge` showing the shift's API status, `open` or `filled`. See FR-6.9 and assumption A4. (decision)
- [x] FR-5.3 The dashboard shows the number of open shifts and filled shifts.
- [x] FR-5.4 A change made elsewhere appears within 5 seconds without a manual reload. (decision)
- [x] FR-5.5 Admin-only data and screens return 403 or are unavailable to nurses and agencies.

#### Cancellation record (FR-6) · core

- [x] FR-6.6 The reason and previous nurse are stored and visible to the admin in the audit log.

#### Credential review (FR-7) · supporting

- [x] FR-7.6 An admin can see pending uploads, open each document, and approve or reject it. Approval makes that expiry date the one used by FR-4.4. (decision)

#### Audit log screen (FR-8) · supporting

- [x] FR-8.1 `audit-log-table` is visible only to the admin. It lists actor, action, affected record, time and any cancellation reason, newest first. (decision)

### Agency

Sample accounts: `agency-a` Sunrise Health Staffing and `agency-b` Metro Care Partners.

Relies on: FR-6.1 to FR-6.4, FR-6.7 and FR-6.8 (cancel with a reason) and FR-9.1 to FR-9.3 (own rows).

#### Landing screen · core

- [x] FR-1.10 The agency landing screen shows `agency-post-shift-button`, `shift-cancel-button` and `timesheet-table`. (decision)

#### Post a shift (FR-2) · core

- [x] FR-2.1 `POST /api/shifts` with `{ role, date, startTime, endTime }` from an agency returns 201 and the full shift, with `status: "open"`, `claimedBy: null`, and `agencyId` and `agencyName` taken from the token.
- [x] FR-2.2 An `agencyId` in the request body has no effect.
- [x] FR-2.3 A caller who is not an agency gets 403.
- [x] FR-2.4 An invalid body returns 400 with `{ error }`. Valid means `role` is `RN` or `LPN`, `date` is a real `YYYY-MM-DD` date, times are 24-hour `HH:mm`, and start and end differ. (decision)
- [x] FR-2.5 Dates in the past are accepted, because the sample shifts and the spec's example may already be past. (decision)
- [x] FR-2.6 An `endTime` earlier than `startTime` is accepted as an overnight shift.
- [x] FR-2.7 New shifts get a unique `shift-<n>` ID that is never reused. The spec's `shift-7` is illustrative. (decision)
- [x] FR-2.8 `GET /api/agencies/:agencyId/shifts` with the caller's own agency ID returns 200 and `{ agencyId, shifts }`, using the full shift shape and only that agency's shifts.
- [x] FR-2.9 Another agency or a nurse requesting that route gets 403. An admin may read any agency, and an unknown agency returns 404 for an admin. (decision)
- [x] FR-2.10 `agency-post-shift-button` opens the form and `agency-post-shift-submit-button` submits it. The form opens with valid default values, so it can be submitted unchanged. (decision)
- [x] FR-2.11 The agency screen lists only its own shifts with their current status and the covering nurse.

### Operator

No screen or HTTP route. Run from the deployment environment.

#### Operator seed reset (FR-10) · supporting

- [x] FR-10.1 A documented operator command restores shifts and credential expiry dates to the exact sample data and removes all uploaded credential records and files. (decision)
- [x] FR-10.2 Only the deployment operator can run the reset. No application screen or HTTP endpoint exposes it. (decision)
- [x] FR-10.3 The audit log is kept and records the reset. IDs of removed shifts are not reused. (decision)

#### Submission (FR-11) · core

- [ ] FR-11.5 After the last verification and before submission, the operator seed reset in FR-10 runs on the deployed app, and `GET /api/shifts` is confirmed to return only `shift-1`, `shift-2` and `shift-3` in their seeded states. No other writes are made to deployed data before submitting. (decision)

## Non-functional requirements

- [x] NFR-1 Contract fidelity: required routes return exactly the specified keys, and every error body is `{ "error": "<message>" }`. All 15 test IDs in the technical spec are present as `data-testid` with their exact names, on the elements it describes. Supports FR-1 to FR-9.
- [x] NFR-2 Security: passwords are stored only as salted hashes and never returned. Signing keys and other secrets live outside git, and the only committed credentials are the published sample passwords. Every route enforces permissions itself. After 20 failed logins for the same email and client address within 15 minutes, further attempts for that pair return 429 with `{ error }` until the window ends. Other emails and addresses are unaffected, and accounts are never locked (decision). Supports FR-1 and FR-7.
- [ ] NFR-3 Durability: data survives restarts and redeploys. Supports FR-11.
- [ ] NFR-4 Quality gate: CI runs type checks, lint, tests and build on every push, and all pass. Tests cover FR-1 to FR-10, including cross-agency access, simultaneous claims, overnight hours, credential upload validation, approval and rejection, protected file access, audit entries, role-scoped scheduled hours and operator seed reset.
- [x] NFR-5 Branding: the UI and public URL use the fictional, neutral ShiftPatch brand and never Designli's name or assets.
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
