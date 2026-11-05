"use client"

export { useSession }

import { useSyncExternalStore } from "react"

import { getServerSessionSnapshot, getSessionSnapshot, subscribeToSession, type Session } from "@lib/session"

function useSession(): Session {
  return useSyncExternalStore(subscribeToSession, getSessionSnapshot, getServerSessionSnapshot)
}
