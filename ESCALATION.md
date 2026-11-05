# Escalation: inspector export of nurse records

## Problem

The founder's wish list asks for a one-click export of nurses' license documents and TB test results, to hand to the state inspector on request. Built as asked, one click would package sensitive records for every nurse and let them leave the system with no record of who received them or why.

## Root cause

The request describes the convenience, not the rules around the disclosure. Nothing in the brief or the technical spec says:

- Which law or inspector rule governs these records. TB results are health information, and I can't determine from the brief which privacy rules apply or what the state requires.
- Who may run the export, and how an inspector's request is verified.
- Which nurses, documents and dates a request covers.
- Whether nurses must consent or be told.
- How long an exported copy may exist and how it's delivered.

The technical spec also has no TB records in its sample data and no route for this export.

## Alternative solutions considered

1. **Build it as asked.** It's the fastest to demo, but it creates the riskiest feature in the product, based on guesses about legal requirements.
2. **Build it against synthetic data only.** This is safe for the demo, but it would look finished while the rules that matter remain undecided.
3. **Build a controlled export now.** An admin would choose the nurses and documents, record the inspector's request, and get an expiring, logged download. This is the likely final shape, but it can't be specified properly until the questions above are answered, and it would take time from the core flow.
4. **Hold the feature and get the answers first.** Nothing is built yet. Inspector requests stay manual for now.

## Recommended solution

Option 4 for this version. ShiftPatch won't store TB results or offer any bulk export. `SPEC.md` excludes both.

Before building, the founder should have counsel or a compliance lead answer the questions above and get a sample inspector request. Then build option 3, limited to what the request covers, with each export recorded in the audit log.

## Impact/urgency

- **Urgency:** a decision is needed before TB records or real nurse documents enter the system. It doesn't block the shift flow.
- **Impact of waiting:** inspector requests remain a manual task. The founder should say whether that's acceptable for a first release.
- **Impact of building it now:** a mistake could expose nurses' health and license records, and that can't be undone once a copy has left the system.
- **This demo:** it uses synthetic data only, and uploaded credentials can be opened only by the uploader and an admin.
