import { type ComponentProps, type ReactNode, useId } from "react"

import { cn } from "@lib/utils"
import { AlertCircleIcon, ChevronDownIcon } from "@/components/ui/icons"

type FieldProps = { label: string; hint?: string | undefined; error?: string | undefined }

function FieldFrame({
  label,
  hint,
  error,
  controlId,
  children,
}: FieldProps & { controlId: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={controlId}>
        {label}
      </label>
      {children}
      {error ?
        <p id={`${controlId}-message`} className="field-message" data-error>
          <AlertCircleIcon className="mt-px size-4 shrink-0" />
          {error}
        </p>
      : hint ?
        <p id={`${controlId}-message`} className="field-message">
          {hint}
        </p>
      : null}
    </div>
  )
}

function controlProps(
  id: string,
  { hint, error }: Pick<FieldProps, "hint" | "error">
): { id: string; "aria-invalid": true | undefined; "aria-describedby": string | undefined } {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint ? `${id}-message` : undefined,
  }
}

export function TextField({
  label,
  hint,
  error,
  className,
  id: idProp,
  ...rest
}: FieldProps & ComponentProps<"input">) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  return (
    <FieldFrame label={label} hint={hint} error={error} controlId={id}>
      <input className={cn("field-control", className)} {...controlProps(id, { hint, error })} {...rest} />
    </FieldFrame>
  )
}

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  id: idProp,
  ...rest
}: FieldProps & ComponentProps<"select">) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  return (
    <FieldFrame label={label} hint={hint} error={error} controlId={id}>
      <span className="field-select">
        <select className={cn("field-control", className)} {...controlProps(id, { hint, error })} {...rest}>
          {children}
        </select>
        <ChevronDownIcon />
      </span>
    </FieldFrame>
  )
}

export function FileField({ className, ...rest }: FieldProps & Omit<ComponentProps<"input">, "type">) {
  return <TextField type="file" className={cn("field-file", className)} {...rest} />
}
