import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"

import { DateOnly, TimeOfDay } from "@lib/time"
import { Money } from "@lib/money"
import {
  CheckboxInput,
  ComboboxInput,
  DateInput,
  FormInput,
  MoneyInput,
  SelectInput,
  TagsInput,
  TextareaInput,
  TextInput,
  TimeInput,
  useForm,
  type FormOutputs,
} from "@ui/forms"
import { FileField } from "@ui/field"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// jsdom lacks these: cmdk measures and scrolls its list, and Base UI waits on animations before closing a popup.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub)
Element.prototype.scrollIntoView = () => {}
Element.prototype.getAnimations = () => []

const ROLES = [
  { id: "nurse", name: "Nurse" },
  { id: "agency", name: "Agency" },
]

function AllConfigs() {
  const { fields } = useForm({
    fields: {
      text: new TextInput({ label: "Email", type: "email", defaultValue: "", input: { "data-testid": "text-id" } }),
      textarea: new TextareaInput({ label: "Notes", defaultValue: "", testId: "textarea-id" }),
      date: new DateInput({ label: "Date", defaultValue: null, testId: "date-id" }),
      time: new TimeInput({ label: "Start", defaultValue: null, testId: "time-id" }),
      checkbox: new CheckboxInput({ label: "Urgent", defaultValue: false, testId: "checkbox-id" }),
      money: new MoneyInput({ label: "Rate", defaultValue: null, testId: "money-id" }),
      combobox: new ComboboxInput({
        label: "Facility",
        items: ROLES,
        defaultValue: null,
        getValue: (role) => role.id,
        getLabel: (role) => role.name,
        testId: "combobox-id",
      }),
      select: new SelectInput({
        label: "Role",
        items: ROLES,
        defaultValue: null,
        getValue: (role) => role.id,
        getLabel: (role) => role.name,
        testId: "select-id",
      }),
      tags: new TagsInput({ label: "Skills", defaultValue: ["ICU"], testId: "tags-id" }),
    },
  })
  return (
    <form>
      <FormInput config={fields.text} />
      <FormInput config={fields.textarea} />
      <FormInput config={fields.date} />
      <FormInput config={fields.time} />
      <FormInput config={fields.checkbox} />
      <FormInput config={fields.money} />
      <FormInput config={fields.combobox} />
      <FormInput config={fields.select} />
      <FormInput config={fields.tags} />
    </form>
  )
}

function ExpiryForm({ onSave }: { onSave: (expiry: string) => void }) {
  const { fields, onSubmit } = useForm({
    fields: {
      expiry: new TextInput({
        label: "Expiry date",
        description: "The date printed on the document.",
        type: "date",
        defaultValue: "",
        input: { "data-testid": "credential-expiry-date-input" },
      }),
    },
    validate: (values) => ({ expiry: values.expiry === "" ? "Enter the expiry date." : null }),
  })
  return (
    <form onSubmit={onSubmit((values) => onSave(values.expiry))}>
      <FormInput config={fields.expiry} />
      <button type="submit">Save</button>
    </form>
  )
}

describe("test ids", () => {
  it.each([
    ["text", "text-id", "INPUT"],
    ["textarea", "textarea-id", "TEXTAREA"],
    ["date", "date-id", "BUTTON"],
    ["time", "time-id", "INPUT"],
    ["money", "money-id", "INPUT"],
    ["combobox", "combobox-id", "BUTTON"],
    ["select", "select-id", "BUTTON"],
    ["tags", "tags-id", "INPUT"],
  ])("%s forwards its test id to the control", (_config, testId, tagName) => {
    render(<AllConfigs />)
    expect(screen.getByTestId(testId).tagName).toBe(tagName)
  })

  it("checkbox forwards its test id to the checkbox control", () => {
    render(<AllConfigs />)
    expect(screen.getByTestId("checkbox-id").getAttribute("role")).toBe("checkbox")
  })

  it("controls take the field-control surface", () => {
    render(<AllConfigs />)
    for (const testId of ["text-id", "textarea-id", "date-id", "time-id", "money-id", "combobox-id", "select-id"]) {
      expect(screen.getByTestId(testId).classList).toContain("inset-ring-strong")
    }
  })
})

describe("native date input", () => {
  it("renders a fillable input[type=date]", () => {
    render(<ExpiryForm onSave={() => {}} />)
    const input = screen.getByTestId<HTMLInputElement>("credential-expiry-date-input")
    expect(input.tagName).toBe("INPUT")
    expect(input.type).toBe("date")
    fireEvent.change(input, { target: { value: "2027-03-14" } })
    expect(input.value).toBe("2027-03-14")
  })
})

describe("password input", () => {
  it("reveals and hides the entered value without changing it", () => {
    function Form() {
      const { fields } = useForm({
        fields: { password: new TextInput({ label: "Password", type: "password", defaultValue: "" }) },
      })
      return <FormInput config={fields.password} />
    }

    render(<Form />)
    const input = screen.getByLabelText<HTMLInputElement>("Password")
    fireEvent.change(input, { target: { value: "example-password" } })
    expect(input.type).toBe("password")
    fireEvent.click(screen.getByRole("button", { name: "Show password" }))
    expect(input.type).toBe("text")
    expect(input.value).toBe("example-password")
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }))
    expect(input.type).toBe("password")
    expect(input.value).toBe("example-password")
  })
})

describe("validate", () => {
  it("blocks submit and shows the error in place of the hint", async () => {
    const onSave = vi.fn()
    render(<ExpiryForm onSave={onSave} />)
    const input = screen.getByTestId("credential-expiry-date-input")
    expect(screen.getByText("The date printed on the document.").id).toBe(input.getAttribute("aria-describedby"))
    expect(input.getAttribute("aria-invalid")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toBe("Enter the expiry date.")
    expect(alert.hasAttribute("data-error")).toBe(true)
    expect(alert.id).toBe(input.getAttribute("aria-describedby"))
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(screen.queryByText("The date printed on the document.")).toBeNull()
    expect(onSave).not.toHaveBeenCalled()
  })

  it("submits once the field is valid and clears the error", async () => {
    const onSave = vi.fn()
    render(<ExpiryForm onSave={onSave} />)
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await screen.findByRole("alert")

    fireEvent.change(screen.getByTestId("credential-expiry-date-input"), { target: { value: "2027-03-14" } })
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("2027-03-14"))
  })
})

describe("DateInput", () => {
  it("uses the UTC date for the empty calendar and year range", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2027-01-01T00:30:00Z"))
    function Form() {
      const { fields } = useForm({
        fields: { day: new DateInput({ label: "Day", defaultValue: null, testId: "day-id" }) },
      })
      return <FormInput config={fields.day} />
    }
    render(<Form />)
    fireEvent.click(screen.getByTestId("day-id"))
    expect(await screen.findByRole("button", { name: "Today, Friday, January 1st, 2027" })).toBeTruthy()
    expect(screen.getByRole("option", { name: "2037" })).toBeTruthy()
  })

  it("shows the chosen date on its trigger", () => {
    function Form() {
      const { fields } = useForm({
        fields: { day: new DateInput({ label: "Day", defaultValue: new DateOnly(2027, 3, 14), testId: "day-id" }) },
      })
      return <FormInput config={fields.day} />
    }
    render(<Form />)
    expect(screen.getByTestId("day-id").textContent).toContain("2027-03-14")
  })
})

describe("popover fields", () => {
  it("DateInput picks a day from the calendar", async () => {
    function Form() {
      const { fields } = useForm({
        fields: { day: new DateInput({ label: "Day", defaultValue: new DateOnly(2027, 3, 14), testId: "day-id" }) },
      })
      return <FormInput config={fields.day} />
    }
    render(<Form />)
    fireEvent.click(screen.getByTestId("day-id"))
    fireEvent.click(await screen.findByRole("button", { name: /March 20th, 2027/ }))
    await waitFor(() => expect(screen.getByTestId("day-id").textContent).toContain("2027-03-20"))
  })

  it("ComboboxInput picks an item from the command list", async () => {
    function Form() {
      const { fields, values } = useForm({
        fields: {
          role: new ComboboxInput({
            label: "Role",
            items: ROLES,
            defaultValue: null,
            getValue: (role) => role.id,
            getLabel: (role) => role.name,
            testId: "role-id",
          }),
        },
      })
      return (
        <>
          <FormInput config={fields.role} />
          <output>{values.role}</output>
        </>
      )
    }
    render(<Form />)
    fireEvent.click(screen.getByTestId("role-id"))
    fireEvent.click(await screen.findByRole("option", { name: "Agency" }))
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("agency"))
  })
})

describe("FileField", () => {
  it("forwards native props and its test id to a file input", () => {
    render(<FileField label="Document" hint="PDF or image." data-testid="credential-upload-input" />)
    const input = screen.getByTestId<HTMLInputElement>("credential-upload-input")
    expect(input.type).toBe("file")
    expect(input.classList).toContain("file:bg-secondary-soft")
    expect(screen.getByText("PDF or image.").id).toBe(input.getAttribute("aria-describedby"))
  })
})

describe("form state", () => {
  it("preserves every field value through validation and resets to its defaults", async () => {
    const configs = {
      text: new TextInput({ label: "Name", type: "text", defaultValue: "Maria" }),
      textarea: new TextareaInput({ label: "Notes", defaultValue: "Initial notes" }),
      date: new DateInput({ label: "Date", defaultValue: new DateOnly(2027, 3, 14) }),
      time: new TimeInput({ label: "Start", defaultValue: new TimeOfDay(7 * 3600) }),
      checkbox: new CheckboxInput({ label: "Urgent", defaultValue: false }),
      money: new MoneyInput({ label: "Rate", defaultValue: Money.USD(25) }),
      combobox: new ComboboxInput({
        label: "Facility",
        items: ROLES,
        defaultValue: "nurse",
        getValue: (role) => role.id,
        getLabel: (role) => role.name,
      }),
      select: new SelectInput({
        label: "Role",
        items: ROLES,
        defaultValue: "nurse",
        getValue: (role) => role.id,
        getLabel: (role) => role.name,
      }),
      tags: new TagsInput({ label: "Skills", defaultValue: ["ICU"] }),
    }
    type Outputs = {
      text: string
      textarea: string
      date: DateOnly | null
      time: TimeOfDay | null
      checkbox: boolean
      money: Money | null
      combobox: string | null
      select: string | null
      tags: string[]
    }
    expectTypeOf<FormOutputs<typeof configs>>().toEqualTypeOf<Outputs>()

    const { result } = renderHook(() =>
      useForm({
        fields: configs,
        validate: (values) => {
          expectTypeOf(values).toEqualTypeOf<Outputs>()
          return {
            text: "Invalid name",
            textarea: "Invalid notes",
            date: "Invalid date",
            time: "Invalid time",
            checkbox: "Invalid urgency",
            money: "Invalid rate",
            combobox: "Invalid facility",
            select: "Invalid role",
            tags: "Invalid skills",
          }
        },
      })
    )
    expectTypeOf(result.current.values).toEqualTypeOf<Outputs>()
    const defaults = result.current.values
    act(() => {
      result.current.fields.text.values.onChange("James")
      result.current.fields.textarea.values.onChange("Changed notes")
      result.current.fields.date.values.onChange(new DateOnly(2027, 3, 20))
      result.current.fields.time.values.onChange(new TimeOfDay(19 * 3600))
      result.current.fields.checkbox.values.onCheckedChange(true)
      result.current.fields.money.values.onChange("12.")
      result.current.fields.combobox.values.onChange("agency")
      result.current.fields.select.values.onChange("agency")
      result.current.fields.tags.values.onChange(["ER"])
    })
    const edited: Outputs = {
      text: "James",
      textarea: "Changed notes",
      date: new DateOnly(2027, 3, 20),
      time: new TimeOfDay(19 * 3600),
      checkbox: true,
      money: Money.USD(12),
      combobox: "agency",
      select: "agency",
      tags: ["ER"],
    }
    expect(result.current.values).toEqual(edited)
    const onSave = vi.fn()
    await act(() => result.current.onSubmit(onSave)())
    expect(onSave).not.toHaveBeenCalled()
    expect(result.current.values).toEqual(edited)
    expect(result.current.fields.money.values.value).toBe("12.")
    for (const field of Object.values(result.current.fields)) {
      expect(field.values.error.maybe("", (message) => message)).toMatch(/^Invalid /)
    }

    act(() => result.current.reset())
    expect(result.current.values).toEqual(defaults)
    expect(result.current.fields.money.values.value).toBe("25")
    for (const field of Object.values(result.current.fields)) {
      expect(field.values.error.maybe(null, (message) => message)).toBeNull()
    }
    // A reset starts a new editing cycle: changes stay unvalidated until the next submit.
    act(() => result.current.fields.text.values.onChange("Next name"))
    expect(result.current.fields.text.values.error.maybe(null, (message) => message)).toBeNull()
    await act(() => result.current.onSubmit(onSave)())
    expect(result.current.fields.text.values.error.maybe(null, (message) => message)).toBe("Invalid name")
  })

  it("keeps intermediate Money text in the rendered field when validation fails", async () => {
    function Form() {
      const { fields, onSubmit } = useForm({
        fields: { rate: new MoneyInput({ label: "Rate", defaultValue: null }) },
        validate: () => ({ rate: "Choose another rate." }),
      })
      return (
        <form onSubmit={onSubmit(() => {})}>
          <FormInput config={fields.rate} />
          <button type="submit">Save</button>
        </form>
      )
    }
    render(<Form />)
    const input = screen.getByLabelText<HTMLInputElement>("Rate")
    fireEvent.change(input, { target: { value: "12." } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    expect((await screen.findByRole("alert")).textContent).toBe("Choose another rate.")
    expect(input.value).toBe("12.")
    fireEvent.change(input, { target: { value: "12.0" } })
    expect(input.value).toBe("12.0")
  })

  it("isolates Tags defaults from the source array and other form instances", () => {
    const defaults = ["ICU"]
    const fields = { tags: new TagsInput({ label: "Skills", defaultValue: defaults }) }
    const first = renderHook(() => useForm({ fields }))
    const second = renderHook(() => useForm({ fields }))
    expect(first.result.current.values.tags).not.toBe(defaults)
    expect(first.result.current.values.tags).not.toBe(second.result.current.values.tags)

    defaults.push("External change")
    expect(first.result.current.values.tags).toEqual(["ICU"])
    expect(second.result.current.values.tags).toEqual(["ICU"])
    act(() => first.result.current.fields.tags.values.onChange(["ER"]))
    expect(second.result.current.values.tags).toEqual(["ICU"])
    expect(defaults).toEqual(["ICU", "External change"])
    act(() => first.result.current.reset())
    expect(first.result.current.values.tags).toEqual(["ICU"])
  })

  it("clears derived-field edits on reset", () => {
    const { result } = renderHook(() =>
      useForm({
        fields: {
          name: new TextInput({ label: "Name", type: "text", defaultValue: "Sunrise" }),
          slug: new TextInput({ label: "Slug", type: "text", defaultValue: "" }),
        },
        derive: (values) => ({ slug: values.name.toLowerCase() }),
      })
    )
    act(() => result.current.fields.slug.values.onChange("custom"))
    act(() => result.current.fields.name.values.onChange("Metro"))
    expect(result.current.values.slug).toBe("custom")
    act(() => result.current.reset())
    expect(result.current.values).toEqual({ name: "Sunrise", slug: "sunrise" })
    act(() => result.current.fields.name.values.onChange("Metro"))
    expect(result.current.values.slug).toBe("metro")
  })
})
