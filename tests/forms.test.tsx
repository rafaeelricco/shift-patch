import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { DateOnly } from "@lib/time"
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
} from "@ui/forms"
import { FileField } from "@ui/field"

afterEach(cleanup)

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
