import type { Page } from "@playwright/test"

import { notification, test, expect, signInAs, relativeDate, setExpiry } from "../fixtures"

const POLL = { timeout: 5_000 }
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n")
const queue = (page: Page) => page.getByRole("region", { name: "Credential review" })
const renewal = (page: Page) => page.getByRole("region", { name: "Renewal", exact: true })
const current = (page: Page) => page.getByRole("region", { name: "Current credential" })
const banner = (page: Page) => notification(page)

async function upload(page: Page, name: string, expiry: string): Promise<void> {
  await page.getByTestId("credential-upload-input").setInputFiles({ name, mimeType: "application/pdf", buffer: PDF })
  await page.getByTestId("credential-expiry-date-input").fill(expiry)
  await page.getByRole("button", { name: "Submit for review" }).click()
  await expect(banner(page).locator("[data-title]")).toHaveText("Credential submitted for review")
}

test("FR-7.6 admin rejects then approves a renewal and both sessions update within five seconds", async ({
  page,
  browser,
}) => {
  const expired = relativeDate(-1)
  const expiry = relativeDate(180)
  await setExpiry("nurse-2", expired)
  await signInAs(page, "admin-1")
  await expect(queue(page).getByText("No credentials to review")).toBeVisible()

  const baseURL = test.info().project.use.baseURL
  const nurseContext = await browser.newContext(baseURL === undefined ? {} : { baseURL })
  try {
    const nurse = await nurseContext.newPage()
    await signInAs(nurse, "nurse-2")
    await upload(nurse, "sample-first-renewal.pdf", expiry)
    await expect(queue(page).getByText("sample-first-renewal.pdf")).toBeVisible(POLL)
    await expect(queue(page).getByText("James Cook", { exact: true })).toBeVisible()
    await expect(queue(page).getByText(expiry, { exact: true })).toBeVisible()

    const document = queue(page).getByRole("link", { name: "View document for James Cook" })
    await expect(document).toHaveAttribute("target", "_blank")
    await expect(document).toHaveAttribute("rel", "noopener noreferrer")
    const documentPath = await document.getAttribute("href")
    expect(documentPath).toMatch(/^\/api\/credentials\/uploads\/[^/]+\/document$/)
    const response = await page.request.get(documentPath ?? "")
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toBe("application/pdf")
    expect(await response.body()).toEqual(PDF)

    // Pending renewal does not bypass the approved credential's expiry.
    await nurse.getByTestId("shift-claim-button").first().click()
    await expect(banner(nurse).locator("[data-title]")).toHaveText("Credential expired, cannot claim shift")
    await queue(page).getByRole("button", { name: "Reject credential for James Cook" }).click()
    await expect(banner(page).locator("[data-title]")).toHaveText("Credential rejected")
    await expect(banner(page)).toHaveCount(1)
    await expect(queue(page).getByText("No credentials to review")).toBeVisible()
    await expect(renewal(nurse).getByText("Rejected", { exact: true })).toBeVisible(POLL)
    await expect(current(nurse).locator("time")).toHaveAttribute("datetime", expired)
    await expect(current(nurse).getByText("Expired", { exact: true })).toBeVisible()

    await renewal(nurse).getByRole("button", { name: "Upload a renewal" }).click()
    await upload(nurse, "sample-second-renewal.pdf", expiry)
    await expect(queue(page).getByText("sample-second-renewal.pdf")).toBeVisible(POLL)
    await queue(page).getByRole("button", { name: "Approve credential for James Cook" }).click()
    await expect(banner(page).locator("[data-title]")).toHaveText("Credential approved")
    await expect(banner(page)).toHaveCount(1)
    await expect(queue(page).getByText("No credentials to review")).toBeVisible()
    await expect(renewal(nurse).getByText("Approved", { exact: true })).toBeVisible(POLL)
    await expect(current(nurse).locator("time")).toHaveAttribute("datetime", expiry)
    await expect(current(nurse).getByText("Approved", { exact: true })).toBeVisible()
    await nurse.getByTestId("shift-claim-button").first().click()
    await expect(banner(nurse).locator("[data-title]")).toHaveText("Shift claimed")
    await expect(page.getByTestId("audit-log-table")).toContainText("credential.approved", POLL)
    await expect(page.getByTestId("audit-log-table")).toContainText("credential.rejected", POLL)
    await expect(page.getByTestId("admin-dashboard-shift-table")).toContainText("James Cook", POLL)
  } finally {
    await nurseContext.close()
  }
})

for (const id of ["nurse-1", "nurse-2", "agency-a", "agency-b"] as const) {
  test(`FR-7.6 ${id} has no credential review controls or queue requests`, async ({ page }) => {
    const requests: string[] = []
    page.on("request", (request) => requests.push(new URL(request.url()).pathname))
    await signInAs(page, id)
    await expect(queue(page)).toHaveCount(0)
    await expect(page.getByTestId("admin-credential-review-table")).toHaveCount(0)
    await expect(page.getByRole("button", { name: /(?:Approve|Reject) credential/ })).toHaveCount(0)
    expect(requests).not.toContain("/api/admin/credentials")
  })
}
