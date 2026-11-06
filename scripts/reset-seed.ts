export {}

import { closeDb } from "@lib/db"
import { resetToSeed } from "@lib/seed"

/** Explicit operator entry point. It inherits DATABASE_URL; it never loads a developer's .env file. */
async function main(): Promise<void> {
  let succeeded = false
  try {
    await resetToSeed().promise(() => new Error("Seed reset failed"))
    succeeded = true
  } catch {
    process.stderr.write("Seed reset failed. Check the deployment database configuration and access.\n")
    process.exitCode = 1
  } finally {
    try {
      await closeDb()
    } catch {
      succeeded = false
      process.stderr.write("Database cleanup failed.\n")
      process.exitCode = 1
    }
  }
  if (succeeded) process.stdout.write("Sample data reset; audit log retained.\n")
}

void main()
