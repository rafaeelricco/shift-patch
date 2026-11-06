import type { APIRequestContext, Page } from "@playwright/test"

import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db, sql, type Sql } from "@lib/db"
import { resetToSeed } from "@lib/seed"
import { Future } from "@lib/future"

import {
  notification,
  test,
  expect,
  signInAs,
  signOutVia,
  apiToken,
  authed,
  decoded,
  setExpiry,
  relativeDate,
} from "../fixtures"

const ERROR = s.object({ error: s.string })
const keys = async (res: { json: () => Promise<unknown> }) => {
  const body = await res.json()
  return typeof body === "object" && body !== null ? Object.keys(body).sort() : []
}
const run = <T>(f: Future<{ type: string; message: string }, T>) =>
  f.promise((e) => new Error(`${e.type}: ${e.message}`))
const count = (q: Sql) => run(db.one(q, s.object({ n: s.number }))).then((r) => r.n)

// Files built here: just enough bytes for each signature (FR-7.2).
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n")
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00,
])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9])
const TEXT = Buffer.from("not a document")
const GIF = Buffer.from("GIF89a")
const MAX = 4 * 1024 * 1024
const pdfOfSize = (size: number) => Buffer.concat([PDF, Buffer.alloc(size - PDF.byteLength, 0x20)])

const future = relativeDate(180)

function uploadApi(
  request: APIRequestContext,
  token: string,
  x: { bytes: Buffer; type: string; name: string; expiry?: string }
) {
  return request.post("/api/credentials", {
    data: x.bytes,
    headers: {
      ...authed(token).headers,
      "Content-Type": x.type,
      "X-File-Name": encodeURIComponent(x.name),
      ...(x.expiry === undefined ? {} : { "X-Expiry-Date": x.expiry }),
    },
  })
}

const me = async (request: APIRequestContext, token: string) => {
  const res = await request.get("/api/credentials/me", authed(token))
  expect(res.status()).toBe(200)
  return decoded(res, api.credential.response)
}

const documentOf = (request: APIRequestContext, id: string, token?: string) =>
  request.get(`/api/credentials/uploads/${encodeURIComponent(id)}/document`, token === undefined ? {} : authed(token))

const banner = (page: Page) => notification(page)
const panel = (page: Page) => page.getByRole("region", { name: "Credential", exact: true })
const current = (page: Page) => panel(page).getByRole("region", { name: "Current credential" })
const renewal = (page: Page) => panel(page).getByRole("region", { name: "Renewal", exact: true })
const fileInput = (page: Page) => page.getByTestId("credential-upload-input")
const dateInput = (page: Page) => page.getByTestId("credential-expiry-date-input")
const submit = (page: Page) => panel(page).getByRole("button", { name: "Submit for review" })

async function chooseFile(page: Page, name: string, mimeType: string, buffer: Buffer): Promise<void> {
  await fileInput(page).setInputFiles({ name, mimeType, buffer })
}

/** Counts `POST /api/credentials` from the page; `/api/credentials/me` polls are not uploads. */
function uploadsSent(page: Page): { n: number } {
  const sent = { n: 0 }
  page.on("request", (r) => {
    if (r.method() === "POST" && new URL(r.url()).pathname === "/api/credentials") sent.n += 1
  })
  return sent
}

const approvedExpiry = (nurseId: string) =>
  run(
    db.one(sql`SELECT expires_on::text AS e FROM credentials WHERE nurse_id = ${nurseId}`, s.object({ e: s.string }))
  ).then((r) => r.e)

test("FR-7.1 James uploads a PDF with an expiry date and sees Credential submitted for review", async ({
  page,
  request,
  auditLog,
}) => {
  await signInAs(page, "nurse-2")
  await chooseFile(page, "licence.pdf", "application/pdf", PDF)
  await dateInput(page).fill(future)
  await submit(page).click()
  await expect(banner(page).locator("[data-title]")).toHaveText("Credential submitted for review")
  await expect(banner(page)).toHaveCount(1)

  const check = async () => {
    await expect(renewal(page).locator("time")).toHaveAttribute("datetime", future)
    await expect(renewal(page).getByText("In review", { exact: true })).toBeVisible()
    await expect(current(page).locator("time")).toHaveAttribute("datetime", "2026-06-01")
    await expect(current(page).getByText("Expired", { exact: true })).toBeVisible()
  }
  await check()
  await page.reload()
  await check()

  const summary = await me(request, await apiToken(request, "nurse-2"))
  expect(summary.approved?.expiresOn.pretty()).toBe("2026-06-01")
  expect(summary.approved?.state).toBe("expired")
  expect(summary.latest?.expiresOn.pretty()).toBe(future)
  expect(summary.latest?.status).toBe("pending")
  expect(summary.latest?.fileName).toBe("licence.pdf")

  const entries = (await auditLog.entries()).filter((e) => e.action === "credential.uploaded")
  expect(entries).toHaveLength(1)
  expect(entries[0]).toMatchObject({
    actor_id: "nurse-2",
    record_id: summary.latest?.id.value,
    previous_nurse_id: null,
  })
})

test("FR-7.1 the form tells users not to upload real documents", async ({ page }) => {
  await signInAs(page, "nurse-2")
  await expect(panel(page).getByText("Use a sample file, not a real document.")).toBeVisible()
})

test("FR-7.2 PDF, PNG and JPEG are accepted, and the stored type comes from the content", async ({ request }) => {
  const token = await apiToken(request, "nurse-2")
  for (const [bytes, type, name] of [
    [PDF, "application/pdf", "a.pdf"],
    [PNG, "image/png", "b.png"],
    [JPEG, "image/jpeg", "c.jpg"],
  ] as const) {
    const res = await uploadApi(request, token, { bytes, type, name, expiry: future })
    expect(res.status()).toBe(201)
  }

  const res = await uploadApi(request, token, { bytes: PNG, type: "application/pdf", name: "d.pdf", expiry: future })
  expect(res.status()).toBe(201)
  const summary = await decoded(res, api.uploadCredential.response)
  const id = summary.latest?.id.value ?? ""
  const doc = await documentOf(request, id, token)
  expect(doc.status()).toBe(200)
  expect(doc.headers()["content-type"]).toBe("image/png")
})

test("FR-7.2 content that is not PDF, PNG or JPEG is 415 { error: 'File must be a PDF, PNG or JPEG' }", async ({
  page,
  request,
  auditLog,
}) => {
  const token = await apiToken(request, "nurse-2")
  for (const [bytes, name] of [
    [TEXT, "x.pdf"],
    [GIF, "y.gif"],
  ] as const) {
    const res = await uploadApi(request, token, { bytes, type: "application/pdf", name, expiry: future })
    expect(res.status()).toBe(415)
    expect(await decoded(res, ERROR)).toEqual({ error: "File must be a PDF, PNG or JPEG" })
    expect(await keys(res)).toEqual(["error"])
  }
  expect((await me(request, token)).latest).toBeNull()
  expect(await auditLog.entries()).toHaveLength(0)

  await signInAs(page, "nurse-2")
  await chooseFile(page, "x.pdf", "application/pdf", TEXT)
  await dateInput(page).fill(future)
  await submit(page).click()
  await expect(banner(page).locator("[data-title]")).toHaveText("File must be a PDF, PNG or JPEG")
  await expect(banner(page)).toHaveCount(1)
})

test("FR-7.2 over 4 MB is 413 { error: 'File must be 4 MB or smaller' } and exactly 4 MB is accepted", async ({
  page,
  request,
}) => {
  const token = await apiToken(request, "nurse-2")
  const over = await uploadApi(request, token, {
    bytes: pdfOfSize(MAX + 1),
    type: "application/pdf",
    name: "big.pdf",
    expiry: future,
  })
  expect(over.status()).toBe(413)
  expect(await decoded(over, ERROR)).toEqual({ error: "File must be 4 MB or smaller" })
  const exact = await uploadApi(request, token, {
    bytes: pdfOfSize(MAX),
    type: "application/pdf",
    name: "exact.pdf",
    expiry: future,
  })
  expect(exact.status()).toBe(201)

  await signInAs(page, "nurse-2")
  await renewal(page).getByRole("button", { name: "Replace upload" }).click()
  const sent = uploadsSent(page)
  await chooseFile(page, "big.pdf", "application/pdf", pdfOfSize(MAX + 1))
  await dateInput(page).fill(future)
  await submit(page).click()
  await expect(panel(page).getByText("File must be 4 MB or smaller")).toBeVisible()
  await expect(banner(page)).toHaveCount(1)
  await expect(banner(page).locator("[data-title]")).toHaveText("File must be 4 MB or smaller")
  expect(sent.n).toBe(0)
})

test("FR-7.2 an empty body is 400 { error: 'Choose a document to upload' }", async ({ page, request }) => {
  const token = await apiToken(request, "nurse-2")
  // A valid expiry, so the empty-body check is the one that answers.
  const res = await uploadApi(request, token, {
    bytes: Buffer.alloc(0),
    type: "application/pdf",
    name: "empty.pdf",
    expiry: future,
  })
  expect(res.status()).toBe(400)
  expect(await decoded(res, ERROR)).toEqual({ error: "Choose a document to upload" })

  await signInAs(page, "nurse-2")
  const sent = uploadsSent(page)
  await dateInput(page).fill(future)
  await submit(page).click()
  await expect(panel(page).getByText("Choose a document to upload")).toBeVisible()
  await expect(banner(page)).toHaveCount(1)
  await expect(banner(page).locator("[data-title]")).toHaveText("Choose a document to upload")
  expect(sent.n).toBe(0)
})

test("FR-7.3 a past expiry date is rejected in the banner", async ({ page, request }) => {
  const past = relativeDate(-30)
  await signInAs(page, "nurse-2")
  await chooseFile(page, "licence.pdf", "application/pdf", PDF)
  await dateInput(page).fill(past)
  await submit(page).click()
  await expect(banner(page).locator("[data-title]")).toHaveText("Expiry date is in the past")
  await expect(banner(page)).toHaveCount(1)

  const token = await apiToken(request, "nurse-2")
  expect((await me(request, token)).latest).toBeNull()
  const res = await uploadApi(request, token, { bytes: PDF, type: "application/pdf", name: "a.pdf", expiry: past })
  expect(res.status()).toBe(400)
  expect(await decoded(res, ERROR)).toEqual({ error: "Expiry date is in the past" })
  expect(await keys(res)).toEqual(["error"])

  const today = await uploadApi(request, token, {
    bytes: PDF,
    type: "application/pdf",
    name: "a.pdf",
    expiry: relativeDate(0),
  })
  expect(today.status()).toBe(201)
})

test("FR-7.3 a missing or malformed expiry date is 400", async ({ page, request }) => {
  const token = await apiToken(request, "nurse-2")
  const missing = await uploadApi(request, token, { bytes: PDF, type: "application/pdf", name: "a.pdf" })
  expect(missing.status()).toBe(400)
  expect(await decoded(missing, ERROR)).toEqual({ error: "Enter an expiry date" })
  const malformed = await uploadApi(request, token, {
    bytes: PDF,
    type: "application/pdf",
    name: "a.pdf",
    expiry: "2026-02-30",
  })
  expect(malformed.status()).toBe(400)
  expect(await decoded(malformed, ERROR)).toEqual({ error: "Enter a valid expiry date" })

  // The client doesn't check an empty date, so the server's message shows in the banner.
  await signInAs(page, "nurse-2")
  await chooseFile(page, "licence.pdf", "application/pdf", PDF)
  await submit(page).click()
  await expect(banner(page).locator("[data-title]")).toHaveText("Enter an expiry date")
  await expect(banner(page)).toHaveCount(1)
})

test("FR-7.4 a pending upload does not change eligibility", async ({ page, request }) => {
  const token = await apiToken(request, "nurse-2")
  const up = await uploadApi(request, token, { bytes: PDF, type: "application/pdf", name: "a.pdf", expiry: future })
  expect(up.status()).toBe(201)

  const claim = await request.post("/api/shifts/shift-1/claim", { ...authed(token), data: {} })
  expect(claim.status()).toBe(403)
  expect(await decoded(claim, ERROR)).toEqual({ error: "Credential expired, cannot claim shift" })

  await signInAs(page, "nurse-2")
  await page
    .getByTestId("shift-list-item")
    .filter({ hasText: "2026-10-02" })
    .getByRole("button", { name: "Claim shift" })
    .click()
  await expect(banner(page).locator("[data-title]")).toHaveText("Credential expired, cannot claim shift")
  await expect(banner(page)).toHaveCount(1)

  expect(await approvedExpiry("nurse-2")).toBe("2026-06-01")
})

test("FR-7.5 the approved date shows valid for Maria and expired for James", async ({ page }) => {
  const inNinety = relativeDate(90)
  await setExpiry("nurse-1", inNinety)
  await signInAs(page, "nurse-1")
  await expect(current(page).locator("time")).toHaveAttribute("datetime", inNinety)
  await expect(current(page).getByText("Approved", { exact: true })).toBeVisible()
  await expect(current(page).getByText("Expires in under 30 days")).toHaveCount(0)
  await signOutVia(page, "nurse-1")

  await signInAs(page, "nurse-2")
  await expect(current(page).locator("time")).toHaveAttribute("datetime", "2026-06-01")
  await expect(current(page).getByText("Expired", { exact: true })).toBeVisible()
  await signOutVia(page, "nurse-2")

  await setExpiry("nurse-1", relativeDate(0))
  await signInAs(page, "nurse-1")
  await expect(current(page).locator("time")).toHaveAttribute("datetime", relativeDate(0))
  await expect(current(page).getByText("Approved", { exact: true })).toBeVisible()
  await expect(current(page).getByText("Expires in under 30 days")).toBeVisible()
})

test("FR-7.5 a pending renewal keeps its filename and proposed expiry separate from the current credential", async ({
  page,
}) => {
  const approved = relativeDate(90)
  await setExpiry("nurse-1", approved)
  await signInAs(page, "nurse-1")
  await expect(current(page).getByText("Approved", { exact: true })).toBeVisible()
  await expect(fileInput(page)).toBeHidden()
  await renewal(page).getByRole("button", { name: "Upload a renewal" }).click()
  await expect(fileInput(page)).toBeVisible()
  await chooseFile(page, "renewal-sample.pdf", "application/pdf", PDF)
  await dateInput(page).fill(future)
  await submit(page).click()
  await expect(renewal(page).getByText("In review", { exact: true })).toBeVisible()
  await expect(renewal(page).getByText("renewal-sample.pdf", { exact: true })).toBeVisible()
  await expect(renewal(page).locator("time")).toHaveAttribute("datetime", future)
  await expect(current(page).locator("time")).toHaveAttribute("datetime", approved)
  await expect(current(page).getByText("Approved", { exact: true })).toBeVisible()
  await expect(fileInput(page)).toBeHidden()
  await expect(renewal(page).getByRole("button", { name: "Replace upload" })).toBeFocused()
})

test("FR-7.5 the latest upload shows approved or rejected after review", async ({ page, request }) => {
  const token = await apiToken(request, "nurse-2")
  await signInAs(page, "nurse-2")
  for (const status of ["rejected", "approved"] as const) {
    const up = await uploadApi(request, token, { bytes: PDF, type: "application/pdf", name: "a.pdf", expiry: future })
    expect(up.status()).toBe(201)
    const id = (await decoded(up, api.uploadCredential.response)).latest?.id.value ?? ""
    // The review itself is an Admin-phase route; set its outcome directly.
    await run(db.execute(sql`UPDATE credential_uploads SET status = ${status} WHERE id = ${id}`))
    await page.reload()
    await expect(
      renewal(page).getByText(status === "approved" ? "Approved" : "Rejected", { exact: true })
    ).toBeVisible()
    expect((await me(request, token)).latest?.status).toBe(status)
  }
})

test("FR-7.5 a new upload replaces the pending one and its document", async ({ page, request }) => {
  const token = await apiToken(request, "nurse-2")
  const later = relativeDate(200)
  const a = await uploadApi(request, token, { bytes: PDF, type: "application/pdf", name: "a.pdf", expiry: future })
  expect(a.status()).toBe(201)
  const aId = (await decoded(a, api.uploadCredential.response)).latest?.id.value ?? ""
  const b = await uploadApi(request, token, { bytes: PNG, type: "image/png", name: "b.png", expiry: later })
  expect(b.status()).toBe(201)

  const gone = await documentOf(request, aId, token)
  expect(gone.status()).toBe(404)
  expect(await decoded(gone, ERROR)).toEqual({ error: "Document not found" })
  expect(
    await count(
      sql`SELECT count(*)::int AS n FROM credential_uploads WHERE nurse_id = 'nurse-2' AND status = 'pending'`
    )
  ).toBe(1)
  const summary = await me(request, token)
  expect(summary.latest?.expiresOn.pretty()).toBe(later)
  expect(summary.latest?.fileName).toBe("b.png")

  await signInAs(page, "nurse-2")
  await expect(renewal(page).locator("time")).toHaveAttribute("datetime", later)
  await expect(renewal(page).getByText("In review", { exact: true })).toBeVisible()
})

test("FR-7.5 a network failure keeps the chosen file and date", async ({ page }) => {
  await signInAs(page, "nurse-2")
  await page.route("**/api/credentials", (route) => route.abort())
  await chooseFile(page, "licence.pdf", "application/pdf", PDF)
  await dateInput(page).fill(future)
  await submit(page).click()
  await expect(banner(page).locator("[data-title]")).toHaveText("Couldn't upload document, try again")
  await expect(banner(page)).toHaveCount(1)
  await expect(dateInput(page)).toHaveValue(future)
  expect(await fileInput(page).evaluate((el: HTMLInputElement) => el.files?.[0]?.name ?? null)).toBe("licence.pdf")

  await page.unroute("**/api/credentials")
  const reply = page.waitForResponse(
    (r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/credentials"
  )
  await submit(page).click()
  expect((await reply).status()).toBe(201)
  await expect(banner(page).locator("[data-title]")).toHaveText("Credential submitted for review")
})

test("FR-7.7 only the uploader and the admin can retrieve a document", async ({ request }) => {
  const james = await apiToken(request, "nurse-2")
  const up = await uploadApi(request, james, { bytes: PDF, type: "application/pdf", name: "a.pdf", expiry: future })
  expect(up.status()).toBe(201)
  const id = (await decoded(up, api.uploadCredential.response)).latest?.id.value ?? ""

  for (const who of ["nurse-2", "admin-1"] as const) {
    const res = await documentOf(request, id, who === "nurse-2" ? james : await apiToken(request, who))
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toBe("application/pdf")
    expect(res.headers()["cache-control"]).toContain("no-store")
    expect(res.headers()["x-content-type-options"]).toBe("nosniff")
    expect(Buffer.compare(await res.body(), PDF)).toBe(0)
  }

  const otherNurse = await documentOf(request, id, await apiToken(request, "nurse-1"))
  expect(otherNurse.status()).toBe(404)
  expect(await decoded(otherNurse, ERROR)).toEqual({ error: "Document not found" })

  for (const who of ["agency-a", "agency-b"] as const) {
    const res = await documentOf(request, id, await apiToken(request, who))
    expect(res.status()).toBe(403)
    expect(await decoded(res, ERROR)).toEqual({ error: "You don't have access to this" })
  }

  const anonymous = await documentOf(request, id)
  expect(anonymous.status()).toBe(401)
  expect(await decoded(anonymous, ERROR)).toEqual({ error: "Session expired, sign in again" })

  const missing = await documentOf(request, "upload-missing", james)
  expect(missing.status()).toBe(404)
  expect(await decoded(missing, ERROR)).toEqual({ error: "Document not found" })
})

test("FR-7.7 a document is never publicly reachable", async ({ request }) => {
  const token = await apiToken(request, "nurse-2")
  const up = await uploadApi(request, token, { bytes: PDF, type: "application/pdf", name: "a.pdf", expiry: future })
  expect(up.status()).toBe(201)
  const id = (await decoded(up, api.uploadCredential.response)).latest?.id.value ?? ""

  expect((await request.get(`/${id}`)).status()).toBe(404)
  expect((await request.get(`/uploads/${id}`)).status()).toBe(404)
  expect((await documentOf(request, id)).status()).toBe(401)
})

test("FR-10.1 resetToSeed removes every credential upload", async ({ request }) => {
  const token = await apiToken(request, "nurse-2")
  const up = await uploadApi(request, token, { bytes: PDF, type: "application/pdf", name: "a.pdf", expiry: future })
  expect(up.status()).toBe(201)
  const id = (await decoded(up, api.uploadCredential.response)).latest?.id.value ?? ""

  await run(resetToSeed())
  const after = await apiToken(request, "nurse-2")
  expect((await me(request, after)).latest).toBeNull()
  expect((await documentOf(request, id, after)).status()).toBe(404)
  expect(await count(sql`SELECT count(*)::int AS n FROM credential_uploads`)).toBe(0)
})
