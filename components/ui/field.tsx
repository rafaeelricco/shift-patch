export { FileField, fieldFrame, fieldMessage }

import { type ComponentProps, type ReactNode, useId } from "react"

import { cn } from "@lib/utils"
import { AlertCircleIcon } from "@ui/icons"
import { fieldControl } from "@ui/input"
import { fieldLabel } from "@ui/label"

/** A field's column: label, control, then its message line. Shared with the forms fields. */
const fieldFrame = "flex min-w-0 flex-col gap-input-sm"

/** The hint or error line under a control; `data-error` turns it red. Shared with the forms fields. */
const fieldMessage =
  "flex items-start gap-1 text-xs font-normal tracking-(--tracking-wide) text-secondary data-error:text-danger"

type FieldProps = { label: string; hint?: string | undefined; error?: string | undefined }

function FieldFrame({
  label,
  hint,
  error,
  controlId,
  children,
}: FieldProps & { controlId: string; children: ReactNode }) {
  return (
    <div className={fieldFrame}>
      <label className={fieldLabel} htmlFor={controlId}>
        {label}
      </label>
      {children}
      {error ?
        <p id={`${controlId}-message`} className={fieldMessage} data-error>
          <AlertCircleIcon className="mt-px size-4 shrink-0" />
          {error}
        </p>
      : hint ?
        <p id={`${controlId}-message`} className={fieldMessage}>
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
        className={cn(
          fieldControl,
          "cursor-pointer py-(--inset) pr-gutter-md pl-(--inset) text-sm leading-[calc(var(--control-size-lg)-2*var(--inset))] text-secondary [--inset:4px]",
          "file:mr-gutter-xs file:h-[calc(var(--control-size-lg)-2*var(--inset))] file:cursor-pointer file:rounded-[max(0px,calc(var(--outer-radius)-var(--inset)))] file:border-0 file:bg-secondary-soft file:px-gutter-sm file:text-sm file:leading-none file:font-medium file:text-primary",
          className
        )}
        {...rest}
      />
    </FieldFrame>
  )
}
