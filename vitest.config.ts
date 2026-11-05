import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["lib/**/*.test.ts", "tests/**/*.test.{ts,tsx}"],
  },
})
