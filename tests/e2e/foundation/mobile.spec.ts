import type { Locator, Page } from "@playwright/test"

import { test, expect, ACCOUNTS, signInAs, insertShift, relativeDate } from "../fixtures"

const widths = [320, 390] as const

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const width = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }))
  expect(width.content).toBeLessThanOrEqual(width.viewport)
}

async function expectFullWidthAction(card: Locator, button: Locator): Promise<void> {
  await expect(button).toHaveCSS("height", "44px")
  await expect(button).toHaveCSS("font-size", "14px")
  const cardBounds = await card.boundingBox()
  const buttonBounds = await button.boundingBox()
  if (cardBounds === null || buttonBounds === null) throw new Error("The shift and its action must be visible")
  // The card keeps its 16px horizontal inset on both sides.
  expect(buttonBounds.x - cardBounds.x).toBeCloseTo(16, 0)
  expect(cardBounds.width - buttonBounds.width).toBeCloseTo(32, 0)
}

for (const width of widths) {
  test.describe(`${width}px mobile layout`, () => {
    test.use({ viewport: { width, height: 844 }, reducedMotion: width === 390 ? "reduce" : "no-preference" })

    for (const id of ["nurse-1", "agency-a", "admin-1"] as const) {
      test(`${ACCOUNTS[id].role} account opens a bottom sheet and restores focus before sign-out`, async ({ page }) => {
        await signInAs(page, id)
        const account = page.getByRole("button", {
          name: `Account: ${ACCOUNTS[id].name}, ${ACCOUNTS[id].role}`,
        })
        await expect(account).toHaveCSS("width", "44px")
        await expect(account).toHaveCSS("height", "44px")
        await expectNoHorizontalOverflow(page)

        await account.press("Enter")
        const sheet = page.getByRole("dialog", { name: "Account", exact: true })
        await expect(sheet).toBeVisible()
        await expect(sheet.getByText(ACCOUNTS[id].name, { exact: true })).toBeVisible()
        await expect(sheet.getByText(ACCOUNTS[id].role, { exact: true })).toBeVisible()
        await expect(sheet).toHaveAttribute("data-side", "bottom")
        await expect(sheet).toHaveCSS("bottom", "0px")
        await expect(sheet).toHaveCSS("width", `${width}px`)
        await expect(sheet.getByRole("button", { name: "Sign out", exact: true })).toBeVisible()

        await page.keyboard.press("Escape")
        await expect(sheet).toBeHidden()
        await expect(account).toBeFocused()
        await account.press("Enter")
        await sheet.getByRole("button", { name: "Sign out", exact: true }).click()
        await expect(page.getByTestId("login-email-input")).toBeVisible()
        await expect(page.getByRole("heading", { name: "Account", exact: true })).toHaveCount(0)
      })
    }

    test("overnight cards separate time, duration and agency above full-width actions", async ({ page }) => {
      await insertShift({
        id: "shift-9001",
        agencyId: "agency-a",
        role: "LPN",
        date: relativeDate(1),
        startTime: "19:00",
        endTime: "07:00",
        claimedBy: null,
      })
      await insertShift({
        id: "shift-9002",
        agencyId: "agency-a",
        role: "LPN",
        date: relativeDate(2),
        startTime: "23:30",
        endTime: "00:15",
        claimedBy: "nurse-1",
      })
      await signInAs(page, "nurse-1")
      const open = page.getByRole("region", { name: "Open shifts" })
      const mine = page.getByRole("region", { name: "Your shifts" })
      const overnight = open.getByTestId("shift-list-item").filter({ hasText: relativeDate(1) })
      const short = mine.locator("article").filter({ hasText: relativeDate(2) })

      await expect(open.getByRole("heading", { name: "Open shifts", exact: true })).toHaveCSS("font-size", "20px")
      await expect(overnight.getByText("19:00 to 07:00", { exact: true })).toHaveCSS("font-size", "18px")
      await expect(overnight.getByText("Ends next day · 12 h scheduled", { exact: true })).toHaveCSS(
        "font-size",
        "14px"
      )
      await expect(overnight.getByText("open", { exact: true })).toBeHidden()
      const agency = overnight.getByText("Sunrise Health Staffing", { exact: true })
      await expect(agency).toBeVisible()
      expect(await agency.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
      await expectFullWidthAction(overnight, overnight.getByTestId("shift-claim-button"))

      await expect(short.getByText("Ends next day · 45 min scheduled", { exact: true })).toHaveCSS("font-size", "14px")
      const cancel = short.getByTestId("shift-cancel-button")
      await expectFullWidthAction(short, cancel)
      await cancel.click()
      await expect(cancel).toBeVisible() // A full-width action still requires holding, never a short tap.
      await expectNoHorizontalOverflow(page)
    })
  })
}
