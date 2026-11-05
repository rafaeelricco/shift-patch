import { api } from "@api/endpoints"

import { test, expect, ACCOUNTS, signInAs, signOutVia, decoded } from "../fixtures"

test("persistence: a reload keeps the session and the same role screen", async ({ page }) => {
  await signInAs(page, "nurse-1")
  await page.reload()
  await expect(page.getByRole("button", { name: "Account: Maria Lopez, nurse" }).first()).toBeVisible()
  await expect(page.getByTestId("login-email-input")).toHaveCount(0)
})

test("FR-1.8 sign out from the account menu returns to the form, and Back stays there", async ({ page }) => {
  await signInAs(page, "admin-1")
  await signOutVia(page, "admin-1")
  await page.goBack()
  await page.goto("/")
  await expect(page.getByTestId("login-email-input")).toBeVisible()
})

test("FR-1.8 after sign-out another role signs in and sees its own screen", async ({ page }) => {
  await signInAs(page, "nurse-1")
  await signOutVia(page, "nurse-1")
  await signInAs(page, "agency-b")
  await expect(page.getByText(ACCOUNTS["agency-b"].name).first()).toBeVisible()
  await expect(page.getByText(ACCOUNTS["nurse-1"].name)).toHaveCount(0)
})

test("a fresh browser context shares no session", async ({ page, browser }) => {
  await signInAs(page, "nurse-1")
  const other = await browser.newContext()
  const fresh = await other.newPage()
  await fresh.goto("/")
  await expect(fresh.getByTestId("login-email-input")).toBeVisible()
  await other.close()
})

test("each role screen has a top bar title and the account control", async ({ page }) => {
  for (const [id, title] of [
    ["nurse-1", "Shifts"],
    ["agency-a", "Your shifts"],
    ["admin-1", "Coverage"],
  ] as const) {
    await signInAs(page, id)
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
    await signOutVia(page, id)
  }
})

test("FR-1.8 sign-out ends the server session, not just the screen", async ({ page, request }) => {
  await signInAs(page, "nurse-1")
  const sid = (await page.context().cookies()).find((c) => c.name === "sid")?.value ?? ""
  expect(sid).not.toBe("")
  const headers = { Cookie: `sid=${sid}` }
  expect((await request.get("/api/shifts", { headers })).status()).toBe(200)

  await signOutVia(page, "nurse-1")

  await expect
    .poll(async () => (await decoded(await request.get("/api/auth/me", { headers }), api.whoAmI.response)).actor)
    .toEqual({ type: "Anonymous" })
  expect((await request.get("/api/shifts", { headers })).status()).toBe(401)
})
