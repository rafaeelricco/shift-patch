# ShiftPatch

ShiftPatch is a synthetic nursing-staffing demo. Agencies post shifts, nurses claim shifts when their approved credential covers them, and an admin reviews coverage, credential renewals and the audit trail.

Public app: [shift-patch.vercel.app](https://shift-patch.vercel.app/). The root URL opens the login form; the API is served under `/api` on the same host.

## Run locally

Use Node.js 24, pnpm 10.33.0 and PostgreSQL 17. The pnpm version is pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
```

For a new setup, copy `.env.example` to `.env.local` and fill in the server-only settings below. Use a development database separate from the deployed app and the disposable E2E database. The database role must be able to create tables, indexes and sequences. The first database request creates the schema and seeds the sample data; subsequent starts preserve existing data.

| Setting             | Purpose                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | PostgreSQL connection URI, including the provider's required connection options.                |
| `JWT_SECRET`        | Signing key of at least 32 characters. Generate one with `openssl rand -hex 32`.                |
| `TRUSTED_IP_HEADER` | Optional proxy-overwritten client-address header for login throttling; defaults to `x-real-ip`. |

Keep the values out of git and never prefix them with `NEXT_PUBLIC_`. Set deployment values in the host's environment configuration. `.env.example` documents the test and optional environment variables too.

```sh
pnpm dev
```

Open [localhost:3000](http://localhost:3000). To serve a production build locally, use `pnpm build` followed by `pnpm start`.

## Sample accounts

All five published demo accounts use the password `Trial2026!`. They contain synthetic data only. Upload sample documents, never real license documents or health records.

| Role   | Name                    | Email                         | Seeded credential  |
| ------ | ----------------------- | ----------------------------- | ------------------ |
| Agency | Sunrise Health Staffing | `admin@sunrisehealth.example` | —                  |
| Agency | Metro Care Partners     | `admin@metrocare.example`     | —                  |
| Nurse  | Maria Lopez             | `maria.lopez@example.com`     | Expires 2027-01-01 |
| Nurse  | James Cook              | `james.cook@example.com`      | Expired 2026-06-01 |
| Admin  | Alex Kim                | `alex.kim@example.com`        | —                  |

Each role has one landing screen. Use its account menu to sign out and switch accounts. Nurses browse both agencies; agency screens and scheduled hours are scoped to the signed-in account. Admin coverage and audit views span the platform. Uploaded renewals remain pending until an admin approves them; rejection leaves the current approved credential unchanged.

The sample shifts deliberately retain their supplied historical dates. Overnight hours and credential eligibility use facility time in `America/New_York`. Scheduled hours are planned coverage, not worked or approved timesheets.

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --audit-level=high
```

End-to-end tests reset their database before each test. Use the disposable container, never a development or production database:

```sh
make db-up
make e2e
```

`make db-up` creates `shiftpatch-e2e` on port 5433. `make e2e` supplies its database URL, creates a test signing key and runs Playwright against a production build on port 3100. A running test server must use the same disposable database. Narrow a run with `make e2e ARGS=tests/e2e/operator` or another test path. Stop the container afterward with `docker stop shiftpatch-e2e`.

CI runs lint, type checks, unit/component tests, a production build, the full dependency audit, and Playwright with disposable PostgreSQL. The OWASP job runs:

```sh
semgrep scan --config p/owasp-top-ten --severity ERROR --error --metrics=off
```

Use Semgrep 1.183.0, matching CI. High/critical dependency findings or ERROR-severity OWASP findings fail the gate. Passing definitions are not passing results: confirm the CI run for the exact submitted revision.

`SPEC.md` is the requirement and verification ledger. Its checked items need a passing automated check or deployed browser evidence. The technical API contract and required test IDs are in `docs/ShiftPatch-Technical-Spec.md`.

For deployed acceptance, use the Codex browser to exercise both agencies, both nurses and the admin at the public URL. Verify posting, claim/expiry blocking, cancellation and no-show, renewal approval/rejection, protected documents, audit entries, scoped hours, all 15 test IDs and action notifications. Measure admin updates within five seconds without reloading. Same-host tabs share login state; use verified hostnames of the same deployment for simultaneous role sessions, after checking each account on the canonical public URL. Record the revision, environment, date and observed results in `SPEC.md`.

## Operator seed reset

The reset is a process command, with no app screen or HTTP endpoint. Only an operator with database access can run it. It restores the exact sample shifts and credential dates, deletes uploaded credential records and their document bytes, clears failed-login counters, retains the audit history, records one `seed.reset` entry and preserves the shift-number sequence.

The command inherits `DATABASE_URL` from its process environment. It does **not** load `.env`, `.env.local` or other Next.js environment files, and does not accept a database URL as a command-line argument. Install development dependencies in the operator checkout so the `tsx` runner is available.

To exercise it against the disposable local test database:

```sh
DATABASE_URL=postgres://postgres@localhost:5433/shiftpatch_e2e pnpm operator:reset-seed
```

For the deployment, use a trusted operator process with the intended deployment's `DATABASE_URL` injected securely through its environment, then run:

```sh
pnpm operator:reset-seed
```

A successful command exits 0 and prints `Sample data reset; audit log retained.` Failures exit nonzero with a sanitized message. The process closes its database pool in either case. Do not paste database credentials into transcripts or commit them.

Complete final verification, including persistence across a redeploy, before the submission reset. Obtain the authenticated API session/token needed for read-only confirmation beforehand. After the reset, authenticated `GET /api/shifts` must return exactly:

| Shift     | Agency     | Role | Date       | Times       | State  | Claimed by |
| --------- | ---------- | ---- | ---------- | ----------- | ------ | ---------- |
| `shift-1` | `agency-a` | RN   | 2026-10-02 | 19:00–07:00 | open   | `null`     |
| `shift-2` | `agency-a` | LPN  | 2026-10-03 | 07:00–19:00 | filled | `nurse-1`  |
| `shift-3` | `agency-b` | RN   | 2026-10-04 | 19:00–07:00 | open   | `null`     |

Record the reset and confirmation in `SPEC.md`, then make no further deployed writes before submission. Any subsequent write requires another reset and confirmation.

## Scope and delivery

This version covers authenticated role permissions, agency posting, credential-gated claims, cancellation/no-show, credential upload and admin review, coverage counts, an audit log and scheduled hours. `AGENTS.md`, `CLAUDE.md` and the checked-in project skill describe the agentic setup used in the repository.

Deliberate exclusions are inspector exports and TB records, email notifications, clock-in/out, payroll and timesheet approval, expanded reporting, PostHog, RN/LPN matching, overlapping-shift checks, WebSockets and buyer-demand validation. `ESCALATION.md` explains why the inspector export is deferred.

Technical delivery requires the public deployment with sample data, matching green CI and the evidence in `SPEC.md`. The separate five-minute Loom and full unedited AI-session transcripts remain submission materials; preparing them is outside this implementation pass.
