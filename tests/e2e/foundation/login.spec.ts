import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db, sql } from "@lib/db"

import { notification, test, expect, ACCOUNTS, PASSWORD, signInAs, decoded } from "../fixtures"

const ERROR = s.object({ error: s.string })
const keys = async (res: { json: () => Promise<unknown> }) => {
  const body = await res.json()
  return typeof body === "object" && body !== null ? Object.keys(body).sort() : []
}

test.describe("POST /api/auth/login", () => {
  for (const a of Object.values(ACCOUNTS)) {
    test(`FR-1.1 ${a.id} gets a JWT and exactly { token, user: { id, name, role } }`, async ({ request }) => {
      const res = await request.post("/api/auth/login", { data: { email: a.email, password: PASSWORD } })
      expect(res.status()).toBe(200)
      expect(await keys(res)).toEqual(["token", "user"])
      const body = await decoded(res, api.login.response)
      expect({ id: body.user.id.value, name: body.user.name, role: body.user.role }).toEqual({
        id: a.id,
        name: a.name,
        role: a.role,
      }) // FR-1.3 for agencies
      expect(body.token.split(".")).toHaveLength(3)
    })
  }

  test("FR-1.2 wrong password and unknown email answer identically", async ({ request }) => {
    const wrong = await request.post("/api/auth/login", {
      data: { email: ACCOUNTS["nurse-1"].email, password: "nope" },
    })
    const unknown = await request.post("/api/auth/login", { data: { email: "nobody@example.com", password: PASSWORD } })
    for (const res of [wrong, unknown]) {
      expect(res.status()).toBe(401)
      expect(await decoded(res, ERROR)).toEqual({ error: "Invalid email or password" })
      expect(await keys(res)).toEqual(["error"])
    }
  })

  test("email is matched case-insensitively and trimmed", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "  Maria.Lopez@Example.com ", password: PASSWORD },
    })
    expect(res.status()).toBe(200)
  })

  test("NFR-1 a malformed body gets 400 { error }", async ({ request }) => {
    const bodies = [
      { data: {} },
      { data: { email: 1, password: [] } },
      { data: "not json", headers: { "Content-Type": "text/plain" } },
    ]
    for (const body of bodies) {
      const res = await request.post("/api/auth/login", body)
      expect(res.status()).toBe(400)
      expect(await keys(res)).toEqual(["error"])
    }
  })

  test("NFR-2 the 21st failure for one email and address is 429; another email is unaffected", async ({ request }) => {
    const attempts = await Promise.all(
      Array.from({ length: 21 }, () =>
        request.post("/api/auth/login", { data: { email: ACCOUNTS["nurse-1"].email, password: "bad" } })
      )
    )
    expect(attempts.filter((res) => res.status() === 401)).toHaveLength(20)
    expect(attempts.filter((res) => res.status() === 429)).toHaveLength(1)
    const blocked = await request.post("/api/auth/login", {
      data: { email: ACCOUNTS["nurse-1"].email, password: PASSWORD },
    })
    expect(blocked.status()).toBe(429)
    expect(await keys(blocked)).toEqual(["error"])
    const other = await request.post("/api/auth/login", {
      data: { email: ACCOUNTS["nurse-2"].email, password: PASSWORD },
    })
    expect(other.status()).toBe(200)
  })

  test("valid login attempts expire old failures across pairs without clearing recent throttles", async ({
    request,
  }) => {
    await db
      .execute(
        sql`INSERT INTO login_failures (email, address, at) VALUES
      ('inactive@example.com', 'old-address', now() - interval '16 minutes'),
      ('another@example.com', 'different-address', now() - interval '1 day'),
      ('recent@example.com', 'recent-address', now() - interval '1 minute')`
      )
      .promise((e) => new Error(e.message))
    await db
      .execute(
        sql`INSERT INTO login_failures (email, address)
      SELECT ${ACCOUNTS["nurse-2"].email}, 'retention-test' FROM generate_series(1, 20)`
      )
      .promise((e) => new Error(e.message))

    const login = await request.post("/api/auth/login", {
      data: { email: ACCOUNTS["nurse-1"].email, password: PASSWORD },
    })
    expect(login.status()).toBe(200)
    const remaining = await db
      .rows(
        sql`SELECT email, address, count(*)::int AS n FROM login_failures GROUP BY email, address ORDER BY email`,
        s.object({ email: s.string, address: s.string, n: s.number })
      )
      .promise((e) => new Error(e.message))
    expect(remaining).toEqual([
      { email: ACCOUNTS["nurse-2"].email, address: "retention-test", n: 20 },
      { email: "recent@example.com", address: "recent-address", n: 1 },
    ])
    const blocked = await request.post("/api/auth/login", {
      headers: { "x-real-ip": "retention-test" },
      data: { email: ACCOUNTS["nurse-2"].email, password: PASSWORD },
    })
    expect(blocked.status()).toBe(429)
    expect(await decoded(blocked, ERROR)).toEqual({ error: "Too many failed attempts, try again later" })
  })

  test("NFR-2 the reply never contains a password hash", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: ACCOUNTS["admin-1"].email, password: PASSWORD },
    })
    expect(await res.text()).not.toContain("scrypt$")
  })
})

test.describe("login form", () => {
  test("FR-1.8 no session shows the form directly at /", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("login-email-input")).toBeVisible()
    await expect(page.getByTestId("login-password-input")).toBeVisible()
    await expect(page.getByTestId("login-submit-button")).toBeVisible()
  })

  test("FR-1.7 a failed login shows the message in notification-banner, keeps the email and clears the password", async ({
    page,
  }) => {
    await page.goto("/")
    await page.getByTestId("login-email-input").fill(ACCOUNTS["nurse-1"].email)
    await page.getByTestId("login-password-input").fill("wrong")
    await page.getByTestId("login-submit-button").click()
    await expect(notification(page).locator("[data-title]")).toHaveText("Invalid email or password")
    await expect(page.getByTestId("login-email-input")).toHaveValue(ACCOUNTS["nurse-1"].email)
    await expect(page.getByTestId("login-password-input")).toHaveValue("")
  })

  test("canvas A1: submitting empty fields reaches the server and shows the same 401 banner", async ({ page }) => {
    await page.goto("/")
    await page.getByTestId("login-submit-button").click()
    await expect(notification(page).locator("[data-title]")).toHaveText("Invalid email or password")
  })

  test("canvas sign-in card: Welcome back, placeholders and the show or hide toggle", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible()
    await expect(page.getByTestId("login-email-input")).toHaveAttribute("placeholder", "you@example.com")
    const password = page.getByTestId("login-password-input")
    await password.fill("Trial2026!")
    await expect(password).toHaveAttribute("type", "password")
    await page.getByRole("button", { name: "Show password" }).click()
    await expect(password).toHaveAttribute("type", "text")
    await page.getByRole("button", { name: "Hide password" }).click()
    await expect(password).toHaveAttribute("type", "password")
    await expect(page.getByText("Enter your email and password.")).toBeVisible()
  })

  test("canvas A2: a network failure reads Couldn't sign in, try again and keeps the email", async ({ page }) => {
    await page.route("**/api/auth/login", (route) => route.abort())
    await page.goto("/")
    await page.getByTestId("login-email-input").fill(ACCOUNTS["nurse-1"].email)
    await page.getByTestId("login-password-input").fill(PASSWORD)
    await page.getByTestId("login-submit-button").click()
    await expect(notification(page).locator("[data-title]")).toHaveText("Couldn't sign in, try again")
    await expect(page.getByTestId("login-email-input")).toHaveValue(ACCOUNTS["nurse-1"].email)
  })

  test("canvas A3: after 20 failures the banner shows the 429 text", async ({ page, request }) => {
    for (let i = 0; i < 20; i++) {
      await request.post("/api/auth/login", { data: { email: ACCOUNTS["nurse-2"].email, password: "bad" } })
    }
    await page.goto("/")
    await page.getByTestId("login-email-input").fill(ACCOUNTS["nurse-2"].email)
    await page.getByTestId("login-password-input").fill(PASSWORD)
    await page.getByTestId("login-submit-button").click()
    await expect(notification(page).locator("[data-title]")).toHaveText("Too many failed attempts, try again later")
  })

  for (const id of ["nurse-1", "agency-a", "admin-1"] as const) {
    test(`FR-1.8 ${id} lands on its own screen with name and role`, async ({ page }) => {
      await signInAs(page, id)
      await page.getByRole("button", { name: "Expand sidebar" }).click()
      await expect(page.getByText(ACCOUNTS[id].name).first()).toBeVisible()
      await expect(page.getByText(ACCOUNTS[id].role, { exact: true }).first()).toBeVisible()
      await expect(page.getByTestId("login-email-input")).toHaveCount(0)
    })
  }
})

test("FR-1.1 login also sets an HttpOnly sid cookie that /api/auth/me reads", async ({ request }) => {
  const res = await request.post("/api/auth/login", { data: { email: ACCOUNTS["nurse-1"].email, password: PASSWORD } })
  expect(res.headers()["set-cookie"]).toMatch(/^sid=[A-Za-z0-9_-]{43}; HttpOnly; SameSite=Lax; Path=\/; Max-Age=28800$/)
  const me = await decoded(await request.get("/api/auth/me"), api.whoAmI.response)
  expect(me.actor).toMatchObject({ type: "User", name: "Maria Lopez", role: "nurse" })
})

test("/api/auth/me answers Anonymous, not 401, with no session", async ({ request }) => {
  const res = await request.get("/api/auth/me")
  expect(res.status()).toBe(200)
  expect((await decoded(res, api.whoAmI.response)).actor).toEqual({ type: "Anonymous" })
})
