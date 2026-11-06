export { FileField, fieldFrame, fieldMessage }

import { type ComponentProps, type ReactNode, useId } from "react"

import { CloudUploadIcon, File01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

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

/**
 * The 56px drop face (design canvas `.sp-drop`). The real file input covers it, transparent, so clicking, dropping,
 * focus and `setInputFiles` all reach the native control, and a phone still offers camera and files.
 */
const dropFace = cn(
  "relative flex min-h-14 items-center gap-2.5 rounded-lg bg-control px-3 py-2.5 inset-ring inset-ring-strong",
  "transition-[background-color,box-shadow] duration-(--transition-duration-basic) ease-basic",
  "has-[input:hover]:bg-[linear-gradient(var(--alpha-02),var(--alpha-02))] has-[input:hover]:inset-ring-border-primary-outline-hover",
  "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-1 has-[input:focus-visible]:outline-ring",
  "has-[input[aria-invalid]]:inset-ring-border-danger-outline"
)

/** A credential document picker: `FormInput` has no file config, so this is the one file control. */
function FileField({
  label,
  hint,
  error,
  look = "input",
  fileName,
  className,
  id: idProp,
  ...rest
}: FieldProps & {
  /** `dropzone` draws the design's drop face with the chosen file's name. */
  look?: "input" | "dropzone"
  fileName?: string | undefined
} & Omit<ComponentProps<"input">, "type">) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const description = [error || hint ? `${id}-message` : null, look === "dropzone" ? `${id}-formats` : null]
    .filter(Boolean)
    .join(" ")
  const input = (extra: string) => (
    <input
      type="file"
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={description || undefined}
      className={cn(extra, className)}
      {...rest}
    />
  )
  return (
    <FieldFrame label={label} hint={hint} error={error} controlId={id}>
      {look === "dropzone" ?
        <div className={dropFace}>
          <HugeiconsIcon
            icon={fileName === undefined ? CloudUploadIcon : File01Icon}
            className="size-5 flex-none text-secondary"
            aria-hidden="true"
          />
          <span className="flex min-w-0 flex-col">
            {fileName === undefined ?
              <span className="type-text-sm" aria-hidden="true">
                Drop a file or <span className="font-medium text-accent">browse</span>
              </span>
            : <span className="truncate type-text-sm font-medium" aria-hidden="true">
                {fileName}
              </span>
            }
            <span id={`${id}-formats`} className="type-text-xs text-secondary">
              PDF, PNG or JPEG, up to 4 MB
            </span>
          </span>
          {input("absolute inset-0 size-full cursor-pointer opacity-0")}
        </div>
      : input(
          cn(
            fieldControl,
            "cursor-pointer py-(--inset) pr-gutter-md pl-(--inset) text-sm leading-[calc(var(--control-size-lg)-2*var(--inset))] text-secondary [--inset:4px]",
            "file:mr-gutter-xs file:h-[calc(var(--control-size-lg)-2*var(--inset))] file:cursor-pointer file:rounded-[max(0px,calc(var(--outer-radius)-var(--inset)))] file:border-0 file:bg-secondary-soft file:px-gutter-sm file:text-sm file:leading-none file:font-medium file:text-primary"
          )
        )
      }
    </FieldFrame>
  )
}
