import { api } from "@api/endpoints"

import { test, expect, ACCOUNTS, PASSWORD, signInAs, signOutVia, decoded, authed } from "../fixtures"

test("persistence: a reload keeps the session and the same role screen", async ({ page }) => {
  await signInAs(page, "nurse-1")
  await page.reload()
  await expect(page.getByRole("button", { name: "Account: Maria Lopez, nurse" }).first()).toBeVisible()
  await expect(page.getByTestId("login-email-input")).toHaveCount(0)
})

test("desktop sidebar starts folded, preserves dashboard edits, and remembers both widths", async ({ page }) => {
  await signInAs(page, "nurse-1")
  const sidebar = page.getByRole("complementary", { name: "Sidebar" })
  const expand = page.getByRole("button", { name: "Expand sidebar" })
  const collapse = page.getByRole("button", { name: "Collapse sidebar" })
  const expiry = page.getByTestId("credential-expiry-date-input")

  await expect(sidebar).toHaveCSS("width", "48px")
  await expect(expand).toHaveAttribute("aria-expanded", "false")
  await expect(sidebar.getByRole("img", { name: "ShiftPatch" })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "On this screen" })).toHaveCount(0)
  await page.getByRole("button", { name: "Upload a renewal", exact: true }).click()
  await expiry.fill("2030-10-15")

  await expand.press("Enter")
  await expect(collapse).toHaveAttribute("aria-expanded", "true")
  await expect(collapse).toBeFocused()
  await expect(sidebar).toHaveCSS("width", "288px")
  await expect(sidebar.getByText("ShiftPatch", { exact: true })).toBeVisible()
  await expect(sidebar.getByText(ACCOUNTS["nurse-1"].name)).toBeVisible()
  await expect(expiry).toHaveValue("2030-10-15")

  await page.reload()
  await expect(collapse).toBeVisible()
  await expect(sidebar).toHaveCSS("width", "288px")
  await collapse.click()
  await expect(sidebar).toHaveCSS("width", "48px")

  await page.reload()
  await expect(expand).toBeVisible()
  await expect(sidebar).toHaveCSS("width", "48px")
  await signOutVia(page, "nurse-1")
})

test("desktop sidebar does not animate when reduced motion is enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await signInAs(page, "admin-1")
  const sidebar = page.getByRole("complementary", { name: "Sidebar" })
  await expect(sidebar).toHaveCSS("transition-property", "none")
  await page.getByRole("button", { name: "Expand sidebar" }).click()
  await expect(sidebar).toHaveCSS("width", "288px")
})

test("at phone width the sidebar is hidden and the header account sheet signs out", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInAs(page, "nurse-1")
  await expect(page.getByRole("complementary", { name: "Sidebar" })).toBeHidden()
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeHidden()
  await expect(page.getByRole("banner").getByRole("button", { name: "Account: Maria Lopez, nurse" })).toBeVisible()
  await signOutVia(page, "nurse-1")
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
  await expect(page.getByRole("button", { name: `Account: ${ACCOUNTS["agency-b"].name}, agency` })).toBeVisible()
  await expect(page.getByRole("button", { name: `Account: ${ACCOUNTS["nurse-1"].name}, nurse` })).toHaveCount(0)
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
    ["agency-a", "Shifts"],
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

for (const transport of ["cookie", "bearer", "bearer with another cookie"] as const) {
  test(`logout via ${transport} revokes both credentials from that login`, async ({ page, request }) => {
    const login = async () => {
      const response = await page.request.post("/api/auth/login", {
        data: { email: ACCOUNTS["nurse-1"].email, password: PASSWORD },
      })
      expect(response.status()).toBe(200)
      const cookie = response.headers()["set-cookie"]?.split(";")[0] ?? ""
      expect(cookie).toMatch(/^sid=.+$/)
      const { token } = await decoded(response, api.login.response)
      return { cookie: { Cookie: cookie }, bearer: authed(token).headers }
    }
    const first = await login()
    const second = await login()
    const protectedStatus = async (headers: Record<string, string>) =>
      (await request.get("/api/shifts", { headers })).status()

    for (const headers of [first.cookie, first.bearer, second.cookie, second.bearer]) {
      expect(await protectedStatus(headers)).toBe(200)
    }

    const headers =
      transport === "cookie" ? first.cookie
      : transport === "bearer" ? first.bearer
      : { ...second.cookie, ...first.bearer }
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await request.post("/api/auth/logout", { headers })
      expect(response.status()).toBe(200)
      expect(await response.json()).toEqual({})
    }
    for (const revoked of [first.cookie, first.bearer]) {
      expect(await protectedStatus(revoked)).toBe(401)
      const response = await request.get("/api/auth/me", { headers: revoked })
      expect((await decoded(response, api.whoAmI.response)).actor).toEqual({ type: "Anonymous" })
    }

    const invalid = { ...second.cookie, Authorization: "Bearer invalid" }
    expect(await protectedStatus(invalid)).toBe(401)
    const invalidLogout = await request.post("/api/auth/logout", { headers: invalid })
    expect(invalidLogout.status()).toBe(200)
    expect(await invalidLogout.json()).toEqual({})
    expect(await protectedStatus(second.cookie)).toBe(200)
    expect(await protectedStatus(second.bearer)).toBe(200)
  })
}
