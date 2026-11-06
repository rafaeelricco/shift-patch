import type { Page } from "@playwright/test"

import { test, expect, notification, signInAs, signOutVia, ACCOUNTS, PASSWORD } from "../fixtures"

const INVALID = "Invalid email or password"
const EXPIRED = "Credential expired, cannot claim shift"
const title = (page: Page) => notification(page).locator("[data-title]")

async function failLogin(page: Page) {
  await page.getByTestId("login-submit-button").click()
  await expect(title(page)).toHaveText(INVALID)
  await page.mouse.move(0, 0)
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`notifications are centered and themed at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: viewport.width === 390 ? "reduce" : "no-preference" })
    await page.goto("/")
    await failLogin(page)

    const host = page.locator("[data-sonner-toaster]")
    await expect(host).toHaveCount(1)
    await expect(host).toHaveAttribute("data-x-position", "center")
    await expect(host).toHaveAttribute("data-y-position", "top")
    await expect(notification(page)).toHaveAttribute("data-type", "error")
    await expect(notification(page)).toHaveCSS("background-color", "rgb(255, 255, 255)")
    await expect(notification(page)).toHaveCSS("font-size", "14px")
    await expect(notification(page)).toHaveCSS("border-radius", "12px")
    await expect(notification(page)).toHaveCSS("opacity", "1")
    const box = await notification(page).boundingBox()
    expect(box).not.toBeNull()
    expect(Math.abs(box!.x + box!.width / 2 - viewport.width / 2)).toBeLessThan(1)
    expect(box!.y).toBeCloseTo(viewport.width === 390 ? 64 : 68, 0)
    expect(box!.x).toBeGreaterThanOrEqual(16)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width - 16)
    await expect(page.getByRole("form", { name: "Sign in" }).getByTestId("notification-banner")).toHaveCount(0)
    await expect(page.locator('section[aria-live="polite"]')).toContainText(INVALID)
    await expect(page.locator('section[aria-live="polite"]')).not.toHaveAttribute("aria-hidden", "true")
    if (viewport.width === 390) await expect(notification(page)).toHaveCSS("transition-duration", "0s")
    await page.screenshot({ path: info.outputPath(`notification-${viewport.width}.png`) })

    // The host exposes Sonner's keyboard shortcut without moving focus on publication.
    await expect(notification(page)).not.toBeFocused()
    await page.keyboard.press("Alt+t")
    await expect(host).toBeFocused()
  })
}

test("errors expire after the default lifetime and hover pauses the remaining time", async ({ page }) => {
  await page.clock.install()
  await page.goto("/")
  await failLogin(page)
  await page.clock.runFor(2000)
  await notification(page).hover()
  await page.clock.runFor(5000)
  await expect(title(page)).toHaveText(INVALID)
  await page.mouse.move(0, 0)
  await page.clock.runFor(2500)
  await expect(page.getByTestId("notification-banner")).toHaveCount(0)
})

test("successes expire after the default lifetime", async ({ page }) => {
  await signInAs(page, "agency-a")
  await page.clock.install()
  await page.getByTestId("shift-cancel-button").press("Space")
  await expect(title(page)).toHaveText("Shift cancelled, now open")
  await expect(notification(page)).toHaveAttribute("data-type", "success")
  await page.mouse.move(0, 0)
  await page.clock.runFor(3000)
  await expect(notification(page)).toHaveCount(1)
  await page.clock.runFor(1500)
  await expect(page.getByTestId("notification-banner")).toHaveCount(0)
})

test("a repeated outcome gets a fresh lifetime after hover and during an exit", async ({ page }) => {
  await page.clock.install()
  await page.goto("/")
  await failLogin(page)
  await page.clock.runFor(2500)
  await notification(page).hover()
  await page.clock.runFor(1000)
  await failLogin(page)
  await page.clock.runFor(3000)
  await expect(notification(page)).toHaveCount(1)
  await page.clock.runFor(1500)
  await expect(page.getByTestId("notification-banner")).toHaveCount(0)

  await failLogin(page)
  await page.clock.runFor(3950)
  // Submitting again dismisses the old outcome while Sonner retains its exiting node.
  await failLogin(page)
  await page.clock.runFor(3000)
  await expect(notification(page)).toHaveCount(1)
  await page.clock.runFor(1500)
  await expect(page.getByTestId("notification-banner")).toHaveCount(0)
})

test("post errors remain announced above the sheet, retain the draft and allow retry", async ({ page }, info) => {
  await page.route("**/api/shifts", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 500, json: { error: "Unavailable" } })
    } else await route.continue()
  })
  await signInAs(page, "agency-a")
  await page.getByTestId("agency-post-shift-button").click()
  const sheet = page.getByRole("dialog")
  const lpn = sheet.getByRole("radiogroup", { name: "Role" }).getByRole("radio", { name: "LPN" })
  await lpn.check()
  await page.getByTestId("agency-post-shift-submit-button").click()
  await expect(title(page)).toHaveText("Couldn't post shift, try again")
  await expect(sheet).toBeVisible()
  await expect(lpn).toBeChecked()
  await expect(sheet.getByTestId("notification-banner")).toHaveCount(0)
  await expect(page.locator('section[aria-live="polite"]')).not.toHaveAttribute("aria-hidden", "true")
  await notification(page).hover()
  await notification(page).click()
  await expect(sheet).toBeVisible()
  await expect(lpn).toBeChecked()
  await page.screenshot({ path: info.outputPath("notification-post-sheet.png") })

  // Swipe the toast away without treating the gesture as an outside press on the sheet.
  const box = await notification(page).boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2, box!.y - 100, { steps: 5 })
  await page.mouse.up()
  await expect(notification(page)).toHaveCount(0)
  await expect(sheet).toBeVisible()
  await page.getByTestId("agency-post-shift-submit-button").click()
  await expect(title(page)).toHaveText("Couldn't post shift, try again")
  await expect(lpn).toBeChecked()
  await lpn.press("ArrowLeft")
  await expect(notification(page)).toHaveCount(0)
})

test("expired claims keep the renewal path available after the toast expires", async ({ page }) => {
  await signInAs(page, "nurse-2")
  await page.clock.install()
  await page.getByTestId("shift-claim-button").first().click()
  await expect(title(page)).toHaveText(EXPIRED)
  await notification(page).getByRole("button", { name: "Upload renewal" }).click()
  await page.clock.runFor(50)
  await expect(page.getByTestId("credential-upload-input")).toBeFocused()
  await page.getByTestId("shift-claim-button").first().click()
  await expect(title(page)).toHaveText(EXPIRED)
  await page.mouse.move(0, 0)
  await page.clock.runFor(4500)
  await expect(notification(page)).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Upload a renewal", exact: true })).toBeVisible()
  await expect(page.getByTestId("shift-claim-button").first()).toBeEnabled()
})

for (const change of ["sign out", "replace account"] as const) {
  test(`${change} clears the old outcome and renewal action`, async ({ page }) => {
    await signInAs(page, "nurse-2")
    await page.getByTestId("shift-claim-button").first().click()
    await expect(title(page)).toHaveText(EXPIRED)
    if (change === "sign out") await signOutVia(page, "nurse-2")
    else {
      await page.request.post("/api/auth/login", { data: { email: ACCOUNTS["nurse-1"].email, password: PASSWORD } })
      await page.evaluate((account) => {
        const next = JSON.stringify({ id: account.id, name: account.name, role: account.role })
        localStorage.setItem("session", next)
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "session",
            newValue: next,
            storageArea: localStorage,
          })
        )
      }, ACCOUNTS["nurse-1"])
      await expect(page.getByRole("button", { name: "Account: Maria Lopez, nurse" }).first()).toBeVisible()
    }
    await expect(page.getByTestId("notification-banner")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Upload renewal" })).toHaveCount(0)
  })
}
