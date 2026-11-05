export { FileField }

import { type ComponentProps, type ReactNode, useId } from "react"

import { cn } from "@lib/utils"
import { AlertCircleIcon } from "@ui/icons"

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

/** A credential document picker: `FormInput` has no file config, so this is the one file control. */
function FileField({
  label,
  hint,
  error,
  className,
  id: idProp,
  ...rest
}: FieldProps & Omit<ComponentProps<"input">, "type">) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  return (
    <FieldFrame label={label} hint={hint} error={error} controlId={id}>
      <input
        type="file"
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-message` : undefined}
        className={cn("field-control field-file", className)}
        {...rest}
      />
    </FieldFrame>
  )
}
