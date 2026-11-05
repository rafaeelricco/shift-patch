import { expect, test } from "vitest"

import { Money } from "./money"

test("USD converts major units to rounded minor units", () => {
  const price = Money.USD(19.99)
  expect(price.amountInMinorUnits).toBe(1999)
  expect(price.currency).toBe("USD")
  expect(price.amount).toBe(19.99)
})
