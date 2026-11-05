import { type ComponentProps } from "react"

type IconProps = ComponentProps<"svg">

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.8a.75.75 0 0 0-1.1-1l-3.4 3.7-1.8-1.7a.75.75 0 1 0-1 1.1l2.3 2.2c.3.3.8.3 1.1 0l3.9-4.3Z"
      />
    </svg>
  )
}

export function AlertCircleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-12a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      />
    </svg>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3.5 5.8a.75.75 0 0 1 1.05 0L8 9.2l3.45-3.4a.75.75 0 1 1 1.05 1.07l-4 3.93a.75.75 0 0 1-1.05 0l-4-3.93a.75.75 0 0 1 0-1.07Z" />
    </svg>
  )
}
