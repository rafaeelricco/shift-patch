import { type ReactNode } from "react"

export type ViewState =
  | { kind: "loading"; label: string }
  | { kind: "empty"; title: string; body: string }
  | { kind: "error"; title: string; body: string; action: ReactNode }

export function StateMessage({ state }: { state: ViewState }) {
  switch (state.kind) {
    case "loading":
      return (
        <p role="status" className="py-6 text-center type-text-md">
          <span className="shimmer">{state.label}</span>
        </p>
      )
    case "empty":
      return (
        <div className="px-4 py-6 text-center">
          <p className="text-2xl leading-[28.8px]">{state.title}</p>
          <p className="mt-2 type-text-sm text-secondary">{state.body}</p>
        </div>
      )
    case "error":
      return (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-4"
          style={{
            background: "var(--color-background-warning-surface)",
            boxShadow: "inset 0 0 0 1px var(--color-border-warning-surface)",
          }}
        >
          <div>
            <p className="type-heading-xs">{state.title}</p>
            <p className="type-text-sm text-secondary">{state.body}</p>
          </div>
          {state.action}
        </div>
      )
    default: {
      const _exhaustiveCheck: never = state
      throw new Error(`Unknown view state: ${JSON.stringify(_exhaustiveCheck)}`)
    }
  }
}
