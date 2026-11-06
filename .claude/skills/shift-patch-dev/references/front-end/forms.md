# Forms and API integration

Every frontend write follows one recipe: pick a typed `api.*` entry, fire it with **`call(endpoint, body)`** (which returns a lazy **`Future`**), and handle the outcome with **`.fork(onError, onSuccess)`** at the boundary. Build the inputs with **`useForm`**: **config classes** for `fields`, a `validate` keyed to those fields, and `<FormInput>` to render each one. Model submit state as a **`RemoteData`** cell, and report outcomes through action feedback (see `./pages.md` §4), while field validation stays inline.

Page that hosts a form: `./pages.md`. Collection a write mutates: `./tables.md`. HTTP helpers live in `api/request.ts`, the `api` object in `api/endpoints.ts`.

## Audit

- Inspect `package.json` and the aliases in `tsconfig.json` (`@api/*`, `@ui/*`, `@lib/*`, `@hooks/*`).
- Find `api/endpoints.ts` (the `api` object), `api/request.ts` (`call`, `upload`, `fetchErrorToString`), and `components/ui/forms.tsx` (`useForm`, `FormInput`).
- Read `tests/forms.test.tsx` for working forms, and any screen already in `app/` that does a nearby write. Match its import surface and fork shape.
- List the test IDs this form must carry (`docs/ShiftPatch-Technical-Spec.md`).

Report the audit briefly:

```md
Forms and API Integration Audit:

- Package surface:
- Endpoints module (api object):
- Request helper (call):
- Form abstraction (useForm/FormInput):
- Test IDs this form carries:
- Nearby write/read flows:
```

## Canonical references (by role)

- **`@api/endpoints`**: the `api` object. Entries use `QueryEndpoint`, `CommandEndpoint`, `PlainEndpoint` or `UploadEndpoint` from `@lib/endpoint`, with their paths and schemas.
- **`@api/request`**: `call(endpoint, body)` → `Future<FetchError, Res>`, `upload(endpoint, file, headers)`, and `fetchErrorToString`.
- **`@ui/forms`**: `useForm`, `FormInput`, the `FormOutputs` type, and config classes (`TextInput`, `TextareaInput`, `DateInput`, `TimeInput`, `CheckboxInput`, `MoneyInput`, `ComboboxInput`, `SelectInput`, `TagsInput`).
- **`@ui/field`**: `FileField`, the one file control.
- **Action feedback**: the page's `useActionFeedback` helper; see `./pages.md` §4.
- **`@lib/remote-data`**: `RemoteData`, `NotAsked`, `Loading`, `Failed`, `Ready`.
- **`@lib/future`**: `Future`, and the `Cancel` that `.fork` returns.

## Imports

```ts
import { FormInput, TextInput, TextareaInput, useForm } from "@ui/forms"
import { api } from "@api/endpoints"
import { call, fetchErrorToString, type FetchError } from "@api/request"
import { type Cancel } from "@lib/future"
import { Failed, Loading, NotAsked, Ready, type RemoteData } from "@lib/remote-data"
```

## 1. Calling the server

Use the typed `api.*` entries. Never hand-roll `fetch` for a server route. Inspect `api/endpoints.ts` for the current endpoint registry. When `api.<name>` is absent, add it there with the path and shape from `docs/ShiftPatch-Technical-Spec.md`. For example, the existing shift write is:

```ts
postShift: new PlainEndpoint({
  path: "/api/shifts",
  request: schema_new_shift,
  response: schema_shift,
}),
```

`call` returns a lazy `Future`. Nothing runs until `.fork`, which returns a cancel function:

```ts
cancel.current = call(api.postShift, body).fork(
  (error) => setSubmit(Failed(error)),
  (shift) => onPosted(shift)
)
```

- `call(plain, body)` POSTs to a fixed path. `call(query, params)` GETs `path(params)` for a `QueryEndpoint`, and `call(command, params, body)` POSTs to `path(params)` for a `CommandEndpoint` (`/api/shifts/:id/claim`).
- `.chain` sequences dependent writes. `Future.parallel` and `Future.concurrently` run independent ones. (`Future` vocabulary: the composed data layer in `./pages.md`.)
- Keep the `Cancel` in a ref and call it on unmount, so a late reply never lands on an unmounted form.

## 2. The form (`useForm`)

Each config owns its `initialState()`; each resulting state owns `withError()` so validation replaces the error without converting the stored value. `FormOutputs` derives each value type from those methods and `getValue()`.

Define `fields` with **config classes** and a `validate` returning a per-field `string | null` map **keyed exactly to `fields`** (`null` means no error). `useForm` returns `{ fields, values, onSubmit, reset }`:

```ts
import { DateOnly } from "@lib/time"

const { fields, onSubmit } = useForm({
  fields: {
    role: new SelectInput({
      label: "Role",
      items: SHIFT_ROLES,
      defaultValue: "RN",
      getValue: (role) => role,
      getLabel: (role) => role,
    }),
    date: new DateInput({ label: "Date", defaultValue: DateOnly.todayUTC() }),
  },
  validate: (values) => ({
    role: values.role === null ? "Pick a role." : null,
    date: values.date === null ? "Pick a date." : null,
  }),
})
```

Render each field with `<FormInput config={fields.x} disabled={submit.isLoading} />`. Wrap the handler with `onSubmit(cb)`: it validates first and only calls `cb(values)` when every error is `null`. The result is the form's event listener, `<form noValidate onSubmit={onSubmit(cb)}>`, and it calls `preventDefault` itself. `noValidate` keeps the browser's own bubbles out, so the design system's error line is the only one. A callback that touches a ref must call `onSubmit` inside the handler instead, `(event) => void onSubmit(cb)(event)`, because `pnpm lint` rejects ref access in a call made during render (§4).

`useForm` also returns `values` (every field's current value, for a dirty check or live preview) and `reset()` (back to each `defaultValue`, errors cleared). Omit `validate` when no field has a rule. Errors appear after the first submit and then update on every change. `fields` is read once, at mount: a form whose defaults come from loaded data remounts with a React `key` when that data reloads.

`onChange(values)` is called after each edit with every field's current value, for a form that saves as the user types. No ShiftPatch form needs it yet.

Rows read from data (one field per list entry) get generated keys such as `` `${row.id.value}:reason` ``. Type them with a template-literal record, e.g. ``Record<`reason:${string}`, SelectInput<CancelReason>>``, and treat a lookup as possibly `undefined`.

## 3. Boundary conversions

Convert form values at the submit boundary: `values.email.trim()`, `values.date.pretty()` for `YYYY-MM-DD`, `values.startTime.pretty().slice(0, 5)` for `HH:mm`, and treat empty select or combobox selections as `null`. Cross-field rules live in `validate`. Keep instants as `POSIX` and durations as `Duration` through the app, and convert to raw ms only at platform edges: see `../time.md`.

## 4. Submit state (`RemoteData`)

Model the write like any async state: a `RemoteData<FetchError, never>` cell, `Loading()` before, `Failed` or `Ready` inside `.fork`. The `submit.isLoading` flag, mirrored by the submit button's `loading` prop, guards against double-submit:

```ts
const [submit, setSubmit] = useState<RemoteData<FetchError, never>>(NotAsked())

const send = (event: FormEvent) =>
  void onSubmit((values) => {
    if (submit.isLoading) return
    setSubmit(Loading())
    cancel.current = signIn(values.email.trim(), values.password).fork(
      (error) => setSubmit(Failed(error)),
      () => {} // the gate swaps the screen
    )
  })(event)
```

Keep the error typed in the cell and publish its message from the failure callback through action feedback (see `./pages.md` §4). A form that unmounts on success (sign-in, a closed post form) never needs `Ready`.

## 5. Test IDs, dates and files

- **Test IDs.** `TextInput` takes its test ID in `input: { "data-testid": … }`. Every other config takes `testId`, forwarded to its control or trigger. `Button` and `FileField` take `data-testid` as a prop; notifications use Sonner's `testId`. Names are in `./index.md`.
- **`credential-expiry-date-input` is a native date input:** `new TextInput({ type: "date" })`. `DateInput` is a popover button, so a test filling that field would fail. A date no test types into can use `DateInput`.
- **`credential-upload-input` is a `FileField`** from `@ui/field`, because `FormInput` has no file config. Hold the chosen `File` in its own state beside the form, and validate it in the submit handler. `upload` sends it as the raw request body.
- **Action feedback.** Follow the error and success surfaces in `./pages.md` (§4).

## Do / Do not

- Do: use `api.*` and `call`. Handle the `Future` with `.fork` at the boundary and cancel it on unmount.
- Do: define `fields` with config classes, and keep `validate` keyed to `fields` (`string | null`).
- Do: model submit state with `RemoteData`, set `Loading()` first, and guard double-submit with `submit.isLoading` and the button's `loading` prop.
- Do: show the server's message exactly as it came (FR-1.7, FR-4.2).
- Do not: raw `fetch` a server route, or add React Hook Form, Formik, Zod or a new request dependency.
- Do not: use `validate` keys that don't match `fields`.
- Do not: re-seed a mounted form from new props. Remount it with a `key`.
- Do not: use `DateInput` for `credential-expiry-date-input`.

## Examples

`call` source: `api/request.ts`. Registry source: `api/endpoints.ts`. `api.uploadCredential` serves the nurse screen and `api.postShift` serves the agency screen.

The write examples receive `onDone` from the owning screen, which maps outcomes to its action-feedback helper. Catalog entries are self-contained (`<form>` boilerplate repeated), so any one block stands alone. Each file needs `"use client"` at the top.

### A worked write flow: sign-in

The implementation is `LoginForm` in `app/page.tsx`: `useForm` → `RemoteData` submit cell → cancellable `Future` → `useActionFeedback` in the failure callback. The session gate replaces the form on success. A failed attempt preserves the email, clears the password and reports the server message. Session expiry uses the same feedback helper. See `./pages.md` §4 for notification ownership.

### A worked write flow: post a shift

FR-2.10: the form opens with valid defaults, so it can be submitted unchanged. Start and end must differ, and an end before the start is an overnight shift, not an error (FR-2.4, FR-2.6). `agency-post-shift-button` on the screen opens this form.

```tsx
import { type FormEvent, useEffect, useRef, useState } from "react"
import { api } from "@api/endpoints"
import { call, fetchErrorToString, type FetchError } from "@api/request"
import { type Cancel } from "@lib/future"
import { Failed, Loading, NotAsked, type RemoteData } from "@lib/remote-data"
import { DateOnly } from "@lib/time"
import { Button } from "@ui/button"
import { FormInput, SelectInput, TextInput, useForm } from "@ui/forms"

const SHIFT_ROLES = ["RN", "LPN"] as const

function PostShiftForm({ onDone }: { onDone: (kind: "success" | "error", message: string) => void }) {
  const [submit, setSubmit] = useState<RemoteData<FetchError, never>>(NotAsked())
  const cancel = useRef<Cancel>(() => {})
  useEffect(() => () => cancel.current(), [])

  const { fields, onSubmit } = useForm({
    fields: {
      role: new SelectInput({
        label: "Role",
        items: SHIFT_ROLES,
        defaultValue: "RN",
        getValue: (role) => role,
        getLabel: (role) => role,
      }),
      date: new TextInput({
        label: "Date",
        type: "date",
        defaultValue: DateOnly.todayUTC().pretty(),
      }),
      startTime: new TextInput({ label: "Start time", type: "time", defaultValue: "07:00" }),
      endTime: new TextInput({ label: "End time", type: "time", defaultValue: "19:00" }),
    },
    validate: (values) => ({
      role: values.role === null ? "Pick a role." : null,
      date: values.date === "" ? "Pick a date." : null,
      startTime: values.startTime === "" ? "Enter a start time." : null,
      endTime:
        values.endTime === "" ? "Enter an end time."
        : values.startTime === values.endTime ? "Start and end must differ."
        : null,
    }),
  })

  const send = (event: FormEvent) =>
    void onSubmit(({ role, date, startTime, endTime }) => {
      if (submit.isLoading) return
      const shiftRole = SHIFT_ROLES.find((one) => one === role)
      // validate has already rejected this; the check narrows the type
      if (shiftRole === undefined) return
      setSubmit(Loading())
      cancel.current = call(api.postShift, { role: shiftRole, date, startTime, endTime }).fork(
        (error) => {
          setSubmit(Failed(error))
          onDone("error", fetchErrorToString(error))
        },
        () => onDone("success", "Shift posted")
      )
    })(event)

  return (
    <form noValidate onSubmit={send} className="flex flex-col gap-4">
      <FormInput config={fields.role} />
      <FormInput config={fields.date} />
      <div className="grid grid-cols-2 gap-4">
        <FormInput config={fields.startTime} />
        <FormInput config={fields.endTime} />
      </div>
      <Button type="submit" loading={submit.isLoading} className="w-full" data-testid="agency-post-shift-submit-button">
        Post shift
      </Button>
    </form>
  )
}
```

### A worked write flow: add a credential

A native date input and a `FileField`. The file lives in its own state, because `FormInput` has no file config. The upload route isn't in the technical spec, so its shape is ours to choose (FR-7). The hint carries NFR-6's warning.

```tsx
import { type FormEvent, useEffect, useRef, useState } from "react"
import { api } from "@api/endpoints"
import { fetchErrorToString, upload, type FetchError } from "@api/request"
import { type Cancel } from "@lib/future"
import { Failed, Loading, NotAsked, type RemoteData } from "@lib/remote-data"
import { Button } from "@ui/button"
import { FileField } from "@ui/field"
import { FormInput, TextInput, useForm } from "@ui/forms"

function CredentialForm({ onDone }: { onDone: (kind: "success" | "error", message: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | undefined>(undefined)
  const [submit, setSubmit] = useState<RemoteData<FetchError, never>>(NotAsked())
  const cancel = useRef<Cancel>(() => {})
  useEffect(() => () => cancel.current(), [])

  const { fields, onSubmit, reset } = useForm({
    fields: {
      expiry: new TextInput({
        label: "Expiry date",
        type: "date",
        defaultValue: "",
        input: { "data-testid": "credential-expiry-date-input" },
      }),
    },
    validate: (values) => ({ expiry: values.expiry === "" ? "Enter the expiry date." : null }),
  })

  const send = (event: FormEvent) =>
    void onSubmit((values) => {
      if (submit.isLoading) return
      if (file === null) {
        setFileError("Choose a file.")
        return
      }
      setSubmit(Loading())
      cancel.current = upload(api.uploadCredential, file, { "X-Expiry-Date": values.expiry }).fork(
        (error) => {
          setSubmit(Failed(error))
          onDone("error", fetchErrorToString(error))
        },
        () => {
          setSubmit(NotAsked())
          setFile(null)
          reset()
          onDone("success", "Credential submitted for review")
        }
      )
    })(event)

  return (
    <form noValidate onSubmit={send} className="flex flex-col gap-4">
      <FileField
        label="Credential document"
        hint="PDF, PNG or JPEG, up to 4 MB. Use a sample file, not a real document."
        accept="application/pdf,image/png,image/jpeg"
        data-testid="credential-upload-input"
        error={fileError}
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null)
          setFileError(undefined)
        }}
      />
      <FormInput config={fields.expiry} />
      <Button type="submit" loading={submit.isLoading}>
        Submit for review
      </Button>
    </form>
  )
}
```

### Input catalog 1: text inputs (type matrix, icon, description)

The `type` prop drives the native input mode. `icon` and `description` are optional.

```tsx
import { Mail01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@ui/button"
import { FormInput, TextInput, useForm } from "@ui/forms"

function TextFields() {
  const { fields, onSubmit } = useForm({
    fields: {
      name: new TextInput({
        label: "Full name",
        type: "text",
        defaultValue: "",
        placeholder: "Maria Lopez",
        description: "Shown to the agency on claimed shifts.",
      }),
      email: new TextInput({
        label: "Email",
        type: "email",
        defaultValue: "",
        icon: Mail01Icon,
      }),
      password: new TextInput({
        label: "Password",
        type: "password",
        defaultValue: "",
      }),
      openings: new TextInput({
        label: "Openings",
        type: "number",
        defaultValue: "1",
      }),
      website: new TextInput({
        label: "Agency website",
        type: "url",
        defaultValue: "",
        placeholder: "https://…",
      }),
    },
    validate: (values) => ({
      name: values.name.trim() ? null : "Enter a name.",
      email: values.email.includes("@") ? null : "Enter a valid email address.",
      password: values.password.length >= 8 ? null : "Use at least 8 characters.",
      openings: Number(values.openings) > 0 ? null : "Must be at least 1.",
      website: null,
    }),
  })

  return (
    <form noValidate onSubmit={onSubmit((values) => console.log(values))} className="flex max-w-md flex-col gap-4">
      <FormInput config={fields.name} />
      <FormInput config={fields.email} />
      <FormInput config={fields.password} />
      <FormInput config={fields.openings} />
      <FormInput config={fields.website} />
      <Button type="submit">Save</Button>
    </form>
  )
}
```

### Input catalog 2: textarea

Multi-line free text. `rows` sets the initial height.

```tsx
import { Button } from "@ui/button"
import { FormInput, TextareaInput, useForm } from "@ui/forms"

function NotesField() {
  const { fields, onSubmit } = useForm({
    fields: {
      notes: new TextareaInput({
        label: "Notes",
        defaultValue: "",
        placeholder: "Anything the nurse should know",
        rows: 4,
      }),
    },
    validate: () => ({ notes: null }),
  })

  return (
    <form noValidate onSubmit={onSubmit((values) => console.log(values))} className="flex max-w-md flex-col gap-4">
      <FormInput config={fields.notes} />
      <Button type="submit">Save</Button>
    </form>
  )
}
```

### Input catalog 3: date and time with cross-field validation

Values are `DateOnly | null` and `TimeOfDay | null`. Cross-field rules live in `validate`, which receives every field's value. Compare two times through `TimeOfDay`'s public `seconds`. An end before the start is an overnight shift, so the only rule is that they differ.

```tsx
import { Button } from "@ui/button"
import { DateInput, FormInput, TimeInput, useForm } from "@ui/forms"

function DateAndTimeFields() {
  const { fields, onSubmit } = useForm({
    fields: {
      date: new DateInput({ label: "Date", defaultValue: null }),
      startTime: new TimeInput({ label: "Start time", defaultValue: null, step: 300 }),
      endTime: new TimeInput({ label: "End time", defaultValue: null, step: 300 }),
    },
    validate: (values) => ({
      date: values.date ? null : "Pick a date.",
      startTime: values.startTime ? null : "Enter a start time.",
      endTime:
        values.endTime === null ? "Enter an end time."
        : values.startTime?.seconds === values.endTime.seconds ? "Start and end must differ."
        : null,
    }),
  })

  return (
    <form noValidate onSubmit={onSubmit((values) => console.log(values))} className="flex max-w-md flex-col gap-4">
      <FormInput config={fields.date} />
      <FormInput config={fields.startTime} />
      <FormInput config={fields.endTime} />
      <Button type="submit">Save</Button>
    </form>
  )
}
```

### Input catalog 4: select, combobox and tags

`SelectInput` is a dropdown for short fixed lists. `ComboboxInput` is searchable, for long lists, and adds `emptyMessage` and `itemToString`. `TagsInput` is a free-form `string[]`. A select or combobox value is the `getValue()` string or `null`: map back to the item at the boundary. The cancel reason beside `shift-cancel-button` is a select that defaults to `advance` (FR-6.8), so its values stay the API's literals.

```tsx
import { Button } from "@ui/button"
import { ComboboxInput, FormInput, SelectInput, TagsInput, useForm } from "@ui/forms"

type Agency = { id: string; name: string }

const AGENCIES: Agency[] = [
  { id: "agency-a", name: "Sunrise Health Staffing" },
  { id: "agency-b", name: "Metro Care Partners" },
]

const CANCEL_REASONS = [
  { value: "advance", label: "Cancelled in advance" },
  { value: "no-show", label: "No-show" },
] as const

function ChoiceFields() {
  const { fields, onSubmit } = useForm({
    fields: {
      reason: new SelectInput({
        label: "Reason",
        items: CANCEL_REASONS,
        defaultValue: "advance",
        getValue: (reason) => reason.value,
        getLabel: (reason) => reason.label,
      }),
      agency: new ComboboxInput<Agency>({
        label: "Agency",
        items: AGENCIES,
        defaultValue: null,
        getValue: (agency) => agency.id,
        getKey: (agency) => agency.id,
        getLabel: (agency) => agency.name,
        itemToString: (agency) => agency.name,
        placeholder: "Search agencies",
        emptyMessage: "No agencies found.",
        allowClear: true,
      }),
      units: new TagsInput({
        label: "Units",
        defaultValue: [],
        placeholder: "Add a unit and press Enter",
      }),
    },
    validate: (values) => ({
      reason: values.reason ? null : "Pick a reason.",
      agency: null,
      units: null,
    }),
  })

  return (
    <form noValidate onSubmit={onSubmit((values) => console.log(values))} className="flex max-w-md flex-col gap-4">
      <FormInput config={fields.reason} />
      <FormInput config={fields.agency} />
      <FormInput config={fields.units} />
      <Button type="submit">Save</Button>
    </form>
  )
}
```

### Input catalog 5: checkbox

Boolean value. Combine several in `validate` for "at least one" rules.

```tsx
import { Button } from "@ui/button"
import { CheckboxInput, FormInput, useForm } from "@ui/forms"

function ShiftRoleFilter() {
  const { fields, onSubmit } = useForm({
    fields: {
      rn: new CheckboxInput({ label: "RN", defaultValue: true }),
      lpn: new CheckboxInput({ label: "LPN", defaultValue: false }),
    },
    validate: (values) => {
      const none = !values.rn && !values.lpn
      return {
        rn: none ? "Select at least one role." : null,
        lpn: none ? "Select at least one role." : null,
      }
    },
  })

  return (
    <form noValidate onSubmit={onSubmit((values) => console.log(values))} className="flex max-w-md flex-col gap-4">
      <FormInput config={fields.rn} />
      <FormInput config={fields.lpn} />
      <Button type="submit">Apply</Button>
    </form>
  )
}
```

### Input catalog 6: derived field (slug from name)

`derive` computes one field from the others on every change. Only `TextInput` fields are derivable. The user can still edit a derived field, and validation runs on the result.

```tsx
import { Button } from "@ui/button"
import { FormInput, TextInput, useForm } from "@ui/forms"

function DerivedField() {
  const { fields, onSubmit } = useForm({
    fields: {
      name: new TextInput({
        label: "Agency name",
        type: "text",
        defaultValue: "",
        placeholder: "Sunrise Health Staffing",
      }),
      slug: new TextInput({
        label: "Slug",
        type: "text",
        defaultValue: "",
        description: "Filled in from the name.",
      }),
    },
    derive: (values) => ({ slug: slugify(values.name) }),
    validate: (values) => ({
      name: values.name.trim() ? null : "Enter a name.",
      slug: isValidSlug(values.slug.trim()) ? null : "Use lowercase letters, numbers and dashes only.",
    }),
  })

  return (
    <form noValidate onSubmit={onSubmit((values) => console.log(values))} className="flex max-w-md flex-col gap-4">
      <FormInput config={fields.name} />
      <FormInput config={fields.slug} />
      <Button type="submit">Save</Button>
    </form>
  )
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function isValidSlug(value: string): boolean {
  return value.length > 0 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}
```
