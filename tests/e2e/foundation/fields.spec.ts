import { test, expect } from "@playwright/test"

test("empty fields, placeholders and entered text use consistent 14px sizing", async ({ page }) => {
  await page.goto("/")
  const email = page.getByTestId("login-email-input")
  await expect(email).toBeVisible()
  const metrics = await email.evaluate((element) => ({
    control: getComputedStyle(element).fontSize,
    placeholder: getComputedStyle(element, "::placeholder").fontSize,
  }))
  expect(metrics).toEqual({ control: "14px", placeholder: "14px" })
  await email.fill("nurse@example.com")
  await expect(email).toHaveCSS("font-size", "14px")
})

test("field hover tint leaves the inset border visible and yields to keyboard focus", async ({ page }) => {
  await page.goto("/")
  const email = page.getByTestId("login-email-input")
  await email.hover()
  await expect(email).toHaveCSS("background-image", /linear-gradient/)
  await expect(email).toHaveCSS("box-shadow", /1px inset/)
  const insetShadow = await email.evaluate((element) => getComputedStyle(element).getPropertyValue("--tw-inset-shadow"))
  expect(insetShadow).not.toContain("99px")
  await email.focus()
  await expect(email).toHaveCSS("background-image", "none")
  await expect(email).toHaveCSS("outline-style", "solid")
})
