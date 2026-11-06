"use client"

/**
 * Typed forms: describe each field with a config class, get the form's state from `useForm`, and render each field
 * with `FormInput`.
 *
 * Sign-in and credential forms use these fields for consistent labels, errors, validation timing, ids and test ids.
 * The fields render
 * with the design system's field parts: a hint sits under the control and an error replaces it.
 *
 * ```tsx
 * const { fields, onSubmit } = useForm({
 *   fields: {
 *     email: new TextInput({
 *       label: "Email",
 *       type: "email",
 *       defaultValue: "",
 *       input: { "data-testid": "login-email-input" },
 *     }),
 *   },
 *   validate: (values) => ({ email: values.email.includes("@") ? null : "Enter a valid email address." }),
 * })
 * <form onSubmit={onSubmit((values) => save(values.email))}>
 *   <FormInput config={fields.email} />
 * </form>
 * ```
 *
 * `TextInput` takes its test id in `input`; every other config takes `testId`, forwarded to its control or trigger.
 * A date a test must type into stays `new TextInput({ type: "date" })`, because `DateInput` is a popover button.
 *
 * Errors appear after the first submit and then update on every change. The form's state is seeded from `fields`
 * once, on mount: to add or drop a field, change the form component's `key`.
 */

export {
  useForm,
  FormLabel,
  FormInput,
  TextInput,
  TextareaInput,
  DateInput,
  TimeInput,
  CheckboxInput,
  MoneyInput,
  ComboboxInput,
  SelectInput,
  TagsInput,
  TextElementConfig,
  TextareaElementConfig,
  DateElementConfig,
  TimeElementConfig,
  CheckboxElementConfig,
  MoneyElementConfig,
  ComboboxElementConfig,
  SelectElementConfig,
  TagsElementConfig,
  type FormConfig,
  type FormErrors,
  type FormOutputs,
  type TextInputType,
}

import { cva, type VariantProps } from "class-variance-authority"

import * as React from "react"

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Calendar03Icon,
  Cancel01Icon,
  Clock01Icon,
  DollarCircleIcon,
  UnfoldMoreIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons"
import { fromNullable, fromOptional, type Maybe, Nothing } from "@lib/maybe"
import { DateOnly, TimeOfDay } from "@lib/time"
import { Money } from "@lib/money"
import { search } from "@lib/fuzzy"
import { cn } from "@lib/utils"
import { type ReactNode, useMemo, useState } from "react"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Textarea } from "@ui/textarea"
import { Checkbox } from "@ui/checkbox"
import { Calendar } from "@ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/popover"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, selectTrigger } from "@ui/select"
import { Label } from "@ui/label"
import { fieldFrame, fieldMessage } from "@ui/field"
import { AlertCircleIcon } from "@ui/icons"

type ItemConfig =
  | TextInput
  | TextareaInput
  | DateInput
  | TimeInput
  | CheckboxInput
  | MoneyInput
  | ComboboxInputBase
  | SelectInputBase
  | TagsInput

type ItemProps<T> =
  T extends TextInput ? TextElementConfig
  : T extends TextareaInput ? TextareaElementConfig
  : T extends DateInput ? DateElementConfig
  : T extends TimeInput ? TimeElementConfig
  : T extends CheckboxInput ? CheckboxElementConfig
  : T extends MoneyInput ? MoneyElementConfig
  : T extends SelectInputBase ? SelectElementConfig
  : T extends ComboboxInputBase ? ComboboxElementConfig
  : T extends TagsInput ? TagsElementConfig
  : never

type ItemState<T extends ItemConfig> = ReturnType<T["initialState"]>

type ItemOutput<T extends ItemConfig> = ReturnType<ItemState<T>["getValue"]>

type AnyElementConfig = ItemProps<ItemConfig>
type FormInputs = Record<string, ItemConfig>
type FormState<T extends FormInputs> = { [K in keyof T]: ItemState<T[K]> }
type FormProps<T extends FormInputs> = { [K in keyof T]: ItemProps<T[K]> }
type FormOutputs<T extends FormInputs> = { [K in keyof T]: ItemOutput<T[K]> }
type FormErrors<T extends FormInputs> = { [K in keyof T]: string | null }
type DerivableKeys<T extends FormInputs> = { [K in keyof T]: T[K] extends TextInput ? K : never }[keyof T]
type FormDerive<T extends FormInputs> = (v: FormOutputs<T>) => Partial<Record<DerivableKeys<T>, string>>
/** @property onChange - Called with every field's value after each edit, for forms that save as the user types. */
type FormConfig<T extends FormInputs> = {
  fields: T
  validate?: (v: FormOutputs<NoInfer<T>>) => FormErrors<NoInfer<T>>
  derive?: FormDerive<NoInfer<T>>
  onChange?: (v: FormOutputs<NoInfer<T>>) => void
}

type SubmitEventListener = (e?: { preventDefault(): void }) => Promise<void>
type OnSubmit<T extends FormInputs> = (f: (v: FormOutputs<T>) => void | Promise<void>) => SubmitEventListener
type HookReturn<T extends FormInputs> = {
  onSubmit: OnSubmit<T>
  fields: FormProps<T>
  values: FormOutputs<T>
  reset: () => void
}

type TextInputType = NonNullable<React.ComponentProps<typeof Input>["type"]>
/** Native attributes passed straight to the `<input>`; autofill hints and length caps the config cannot infer. */
type TextInputAttrs = Pick<
  React.ComponentProps<typeof Input>,
  "autoComplete" | "inputMode" | "maxLength" | "autoFocus"
> & {
  "data-testid"?: string
}

class TextInput {
  readonly values: {
    label: ReactNode
    hideLabel?: boolean
    description?: ReactNode
    type: TextInputType
    defaultValue: string
    placeholder?: string
    icon?: IconSvgElement
    input?: TextInputAttrs
  }
  constructor(values: {
    label: ReactNode
    hideLabel?: boolean
    description?: ReactNode
    type: TextInputType
    defaultValue: string
    placeholder?: string
    icon?: IconSvgElement
    input?: TextInputAttrs
  }) {
    this.values = values
  }
  initialState(): TextItemState {
    return new TextItemState({ value: this.values.defaultValue, error: Nothing() })
  }
}

class TextItemState {
  readonly values: { value: string; error: Maybe<string> }
  constructor(values: { value: string; error: Maybe<string> }) {
    this.values = values
  }
  getValue(): string {
    return this.values.value
  }
  withError(error: Maybe<string>): TextItemState {
    return new TextItemState({ value: this.values.value, error })
  }
}

class TextElementConfig {
  readonly values: {
    name: string
    id: string
    value: string
    type: TextInputType
    label: ReactNode
    hideLabel: boolean
    description: Maybe<ReactNode>
    placeholder: Maybe<string>
    icon: Maybe<IconSvgElement>
    input: TextInputAttrs
    error: Maybe<string>
    onChange: (value: string) => void
  }
  constructor(values: {
    name: string
    id: string
    value: string
    type: TextInputType
    label: ReactNode
    hideLabel: boolean
    description: Maybe<ReactNode>
    placeholder: Maybe<string>
    icon: Maybe<IconSvgElement>
    input: TextInputAttrs
    error: Maybe<string>
    onChange: (value: string) => void
  }) {
    this.values = values
  }
}

class TextareaInput {
  readonly values: {
    label: ReactNode
    description?: ReactNode
    defaultValue: string
    placeholder?: string
    rows?: number
    testId?: string
  }
  constructor(values: {
    label: ReactNode
    description?: ReactNode
    defaultValue: string
    placeholder?: string
    rows?: number
    testId?: string
  }) {
    this.values = values
  }
  initialState(): TextareaItemState {
    return new TextareaItemState({ value: this.values.defaultValue, error: Nothing() })
  }
}

class TextareaItemState {
  readonly values: { value: string; error: Maybe<string> }
  constructor(values: { value: string; error: Maybe<string> }) {
    this.values = values
  }
  getValue(): string {
    return this.values.value
  }
  withError(error: Maybe<string>): TextareaItemState {
    return new TextareaItemState({ value: this.values.value, error })
  }
}

class TextareaElementConfig {
  readonly values: {
    name: string
    id: string
    value: string
    label: ReactNode
    description: Maybe<ReactNode>
    placeholder: Maybe<string>
    rows: number
    testId: string | undefined
    error: Maybe<string>
    onChange: (value: string) => void
  }
  constructor(values: {
    name: string
    id: string
    value: string
    label: ReactNode
    description: Maybe<ReactNode>
    placeholder: Maybe<string>
    rows: number
    testId: string | undefined
    error: Maybe<string>
    onChange: (value: string) => void
  }) {
    this.values = values
  }
}

class DateInput {
  readonly values: {
    label: ReactNode
    description?: ReactNode
    defaultValue: DateOnly | null
    placeholder?: string
    testId?: string
    onChange?: (value: DateOnly | null) => void
  }
  constructor(values: {
    label: ReactNode
    description?: ReactNode
    defaultValue: DateOnly | null
    placeholder?: string
    testId?: string
    onChange?: (value: DateOnly | null) => void
  }) {
    this.values = values
  }
  initialState(): DateItemState {
    return new DateItemState({ value: this.values.defaultValue, error: Nothing() })
  }
}

class DateItemState {
  readonly values: { value: DateOnly | null; error: Maybe<string> }
  constructor(values: { value: DateOnly | null; error: Maybe<string> }) {
    this.values = values
  }
  getValue(): DateOnly | null {
    return this.values.value
  }
  withError(error: Maybe<string>): DateItemState {
    return new DateItemState({ value: this.values.value, error })
  }
}

class DateElementConfig {
  readonly values: {
    name: string
    id: string
    value: DateOnly | null
    label: ReactNode
    description: Maybe<ReactNode>
    placeholder: Maybe<string>
    testId: string | undefined
    error: Maybe<string>
    onChange: (value: DateOnly | null) => void
  }
  constructor(values: {
    name: string
    id: string
    value: DateOnly | null
    label: ReactNode
    description: Maybe<ReactNode>
    placeholder: Maybe<string>
    testId: string | undefined
    error: Maybe<string>
    onChange: (value: DateOnly | null) => void
  }) {
    this.values = values
  }
}

class TimeInput {
  readonly values: {
    label: ReactNode
    description?: ReactNode
    defaultValue: TimeOfDay | null
    placeholder?: string
    step?: number
    testId?: string
  }
  constructor(values: {
    label: ReactNode
    description?: ReactNode
    defaultValue: TimeOfDay | null
    placeholder?: string
    step?: number
    testId?: string
  }) {
    this.values = values
  }
  initialState(): TimeItemState {
    return new TimeItemState({ value: this.values.defaultValue, error: Nothing() })
  }
}

class TimeItemState {
  readonly values: { value: TimeOfDay | null; error: Maybe<string> }
  constructor(values: { value: TimeOfDay | null; error: Maybe<string> }) {
    this.values = values
  }
  getValue(): TimeOfDay | null {
    return this.values.value
  }
  withError(error: Maybe<string>): TimeItemState {
    return new TimeItemState({ value: this.values.value, error })
  }
}

class TimeElementConfig {
  readonly values: {
    name: string
    id: string
    value: TimeOfDay | null
    label: ReactNode
    description: Maybe<ReactNode>
    placeholder: Maybe<string>
    step: number
    testId: string | undefined
    error: Maybe<string>
    onChange: (value: TimeOfDay | null) => void
  }
  constructor(values: {
    name: string
    id: string
    value: TimeOfDay | null
    label: ReactNode
    description: Maybe<ReactNode>
    placeholder: Maybe<string>
    step: number
    testId: string | undefined
    error: Maybe<string>
    onChange: (value: TimeOfDay | null) => void
  }) {
    this.values = values
  }
}

class CheckboxInput {
  readonly values: {
    label: ReactNode
    description?: ReactNode
    defaultValue: boolean
    testId?: string
  }
  constructor(values: { label: ReactNode; description?: ReactNode; defaultValue: boolean; testId?: string }) {
    this.values = values
  }
  initialState(): CheckboxItemState {
    return new CheckboxItemState({ value: this.values.defaultValue, error: Nothing() })
  }
}

class CheckboxItemState {
  readonly values: { value: boolean; error: Maybe<string> }
  constructor(values: { value: boolean; error: Maybe<string> }) {
    this.values = values
  }
  getValue(): boolean {
    return this.values.value
  }
  withError(error: Maybe<string>): CheckboxItemState {
    return new CheckboxItemState({ value: this.values.value, error })
  }
}

class CheckboxElementConfig {
  readonly values: {
    name: string
    id: string
    value: boolean
    label: ReactNode
    description: Maybe<ReactNode>
    testId: string | undefined
    error: Maybe<string>
    onCheckedChange: (checked: boolean) => void
  }
  constructor(values: {
    name: string
    id: string
    value: boolean
    label: ReactNode
    description: Maybe<ReactNode>
    testId: string | undefined
    error: Maybe<string>
    onCheckedChange: (checked: boolean) => void
  }) {
    this.values = values
  }
}

/** Captures a major-unit (dollar) amount as free text and emits a `Money` (or null when blank). Currency is fixed to USD. */
class MoneyInput {
  readonly values: {
    label: ReactNode
    description?: ReactNode
    defaultValue: Money | null
    placeholder?: string
    testId?: string
  }
  constructor(values: {
    label: ReactNode
    description?: ReactNode
    defaultValue: Money | null
    placeholder?: string
    testId?: string
  }) {
    this.values = values
  }
  initialState(): MoneyItemState {
    return new MoneyItemState({ value: moneyToInputValue(this.values.defaultValue), error: Nothing() })
  }
}

/** Holds the raw dollar text so in-progress entry (e.g. "12." or "") survives keystrokes; the `Money` value is derived on read. */
class MoneyItemState {
  readonly values: { value: string; error: Maybe<string> }
  constructor(values: { value: string; error: Maybe<string> }) {
    this.values = values
  }
  getValue(): Money | null {
    // Strip "$", "," and whitespace so "$5,000.00" isn't dropped; empty, non-numeric or non-finite input reads as unset.
    const cleaned = this.values.value.replace(/[$,\s]/g, "")
    if (cleaned === "") return null
    const dollars = Number(cleaned)
    if (!Number.isFinite(dollars)) return null
    return Money.USD(dollars)
  }
  withError(error: Maybe<string>): MoneyItemState {
    return new MoneyItemState({ value: this.values.value, error })
  }
}

class MoneyElementConfig {
  readonly values: {
    name: string
    id: string
    value: string
    label: ReactNode
    description: Maybe<ReactNode>
    placeholder: Maybe<string>
    testId: string | undefined
    error: Maybe<string>
    onChange: (value: string) => void
  }
  constructor(values: {
    name: string
    id: string
    value: string
    label: ReactNode
    description: Maybe<ReactNode>
    placeholder: Maybe<string>
    testId: string | undefined
    error: Maybe<string>
    onChange: (value: string) => void
  }) {
    this.values = values
  }
}

function moneyToInputValue(money: Money | null): string {
  return money == null ? "" : String(money.amount)
}

type ComboboxValues<T> = {
  label: ReactNode
  description?: ReactNode
  items: readonly T[]
  defaultValue: string | null
  getValue: (item: T) => string
  getLabel: (item: T) => ReactNode
  getKey?: (item: T) => string
  itemToString?: (item: T) => string
  placeholder?: string
  emptyMessage?: string
  allowClear?: boolean
  testId?: string
}

/** Type-erased base for `ComboboxInput`; `kind` discriminates it from the otherwise structurally identical select config. */
class ComboboxInputBase {
  readonly kind = "combobox"
  readonly values: ComboboxValues<unknown>
  constructor(values: ComboboxValues<unknown>) {
    this.values = values
  }
  initialState(): ComboboxItemState {
    return new ComboboxItemState({ value: this.values.defaultValue, error: Nothing() })
  }
}

class ComboboxInput<T> extends ComboboxInputBase {
  constructor(values: ComboboxValues<T>) {
    // Sound: `items` only ever reach the callbacks given beside them.
    super(values as ComboboxValues<unknown>)
  }
}

class ComboboxItemState {
  readonly values: { value: string | null; error: Maybe<string> }
  constructor(values: { value: string | null; error: Maybe<string> }) {
    this.values = values
  }
  getValue(): string | null {
    return this.values.value
  }
  withError(error: Maybe<string>): ComboboxItemState {
    return new ComboboxItemState({ value: this.values.value, error })
  }
}

type ComboboxElementValues = {
  name: string
  id: string
  items: readonly unknown[]
  value: string | null
  label: ReactNode
  description: Maybe<ReactNode>
  placeholder: Maybe<string>
  emptyMessage: string
  allowClear: boolean
  getValue: (item: unknown) => string
  getLabel: (item: unknown) => ReactNode
  getKey: (item: unknown) => string
  itemToString: (item: unknown) => string
  testId: string | undefined
  error: Maybe<string>
  onChange: (value: string | null) => void
}

class ComboboxElementConfig {
  readonly values: ComboboxElementValues
  constructor(values: ComboboxElementValues) {
    this.values = values
  }
}

function comboboxItemToString<T>(
  getValue: (item: T) => string,
  getLabel: (item: T) => ReactNode,
  itemToString: ((item: T) => string) | undefined
): (item: T) => string {
  if (itemToString) return itemToString
  return (item) => {
    const label = getLabel(item)
    return typeof label === "string" ? label : getValue(item)
  }
}

type SelectValues<T> = {
  label: ReactNode
  description?: ReactNode
  items: readonly T[]
  defaultValue: string | null
  getValue: (item: T) => string
  getLabel: (item: T) => ReactNode
  getKey?: (item: T) => string
  placeholder?: string
  allowClear?: boolean
  testId?: string
}

/** Type-erased base for `SelectInput`; `kind` discriminates it from the otherwise structurally identical combobox config. */
class SelectInputBase {
  readonly kind = "select"
  readonly values: SelectValues<unknown>
  constructor(values: SelectValues<unknown>) {
    this.values = values
  }
  initialState(): SelectItemState {
    return new SelectItemState({ value: this.values.defaultValue, error: Nothing() })
  }
}

class SelectInput<T> extends SelectInputBase {
  constructor(values: SelectValues<T>) {
    // Sound: `items` only ever reach the callbacks given beside them.
    super(values as SelectValues<unknown>)
  }
}

class SelectItemState {
  readonly values: { value: string | null; error: Maybe<string> }
  constructor(values: { value: string | null; error: Maybe<string> }) {
    this.values = values
  }
  getValue(): string | null {
    return this.values.value
  }
  withError(error: Maybe<string>): SelectItemState {
    return new SelectItemState({ value: this.values.value, error })
  }
}

type SelectElementValues = {
  name: string
  id: string
  items: readonly unknown[]
  value: string | null
  label: ReactNode
  description: Maybe<ReactNode>
  placeholder: Maybe<string>
  allowClear: boolean
  getValue: (item: unknown) => string
  getLabel: (item: unknown) => ReactNode
  getKey: (item: unknown) => string
  testId: string | undefined
  error: Maybe<string>
  onChange: (value: string | null) => void
}

class SelectElementConfig {
  readonly values: SelectElementValues
  constructor(values: SelectElementValues) {
    this.values = values
  }
}

class TagsInput {
  readonly values: {
    label: ReactNode
    description?: ReactNode
    defaultValue: string[]
    placeholder?: string
    testId?: string
  }
  constructor(values: {
    label: ReactNode
    description?: ReactNode
    defaultValue: string[]
    placeholder?: string
    testId?: string
  }) {
    this.values = values
  }
  initialState(): TagsItemState {
    return new TagsItemState({ value: [...this.values.defaultValue], error: Nothing() })
  }
}

class TagsItemState {
  readonly values: { value: string[]; error: Maybe<string> }
  constructor(values: { value: string[]; error: Maybe<string> }) {
    this.values = values
  }
  getValue(): string[] {
    return this.values.value
  }
  withError(error: Maybe<string>): TagsItemState {
    return new TagsItemState({ value: this.values.value, error })
  }
}

class TagsElementConfig {
  readonly values: {
    name: string
    id: string
    value: string[]
    label: ReactNode
    description: Maybe<ReactNode>
    placeholder: Maybe<string>
    testId: string | undefined
    error: Maybe<string>
    onChange: (value: string[]) => void
  }
  constructor(values: {
    name: string
    id: string
    value: string[]
    label: ReactNode
    description: Maybe<ReactNode>
    placeholder: Maybe<string>
    testId: string | undefined
    error: Maybe<string>
    onChange: (value: string[]) => void
  }) {
    this.values = values
  }
}

type SetState<T extends ItemConfig> = (v: ItemState<T>) => void

/** Build the props a field's element receives from its config, current state and state setter. */
function buildProps(
  name: string,
  id: string,
  config: ItemConfig,
  state: ItemState<ItemConfig>,
  setState: SetState<ItemConfig>
): ItemProps<ItemConfig> {
  if (config instanceof TextInput) {
    const { value, error } = (state as TextItemState).values
    const { label, hideLabel, placeholder, type, description, icon, input } = config.values
    return new TextElementConfig({
      name,
      id,
      value,
      label,
      hideLabel: hideLabel ?? false,
      type,
      description: fromOptional(description),
      placeholder: fromOptional(placeholder),
      icon: fromOptional(icon),
      input: input ?? {},
      error,
      onChange: (text) => setState(new TextItemState({ value: text, error })),
    })
  }
  if (config instanceof TextareaInput) {
    const { value, error } = (state as TextareaItemState).values
    const { label, placeholder, description, rows, testId } = config.values
    return new TextareaElementConfig({
      name,
      id,
      value,
      label,
      description: fromOptional(description),
      placeholder: fromOptional(placeholder),
      rows: rows ?? 3,
      testId,
      error,
      onChange: (text) => setState(new TextareaItemState({ value: text, error })),
    })
  }
  if (config instanceof DateInput) {
    const { value, error } = (state as DateItemState).values
    const { label, description, placeholder, testId, onChange: onValueChange } = config.values
    return new DateElementConfig({
      name,
      id,
      value,
      label,
      description: fromOptional(description),
      placeholder: fromOptional(placeholder),
      testId,
      error,
      onChange: (d) => {
        onValueChange?.(d)
        setState(new DateItemState({ value: d, error }))
      },
    })
  }
  if (config instanceof TimeInput) {
    const { value, error } = (state as TimeItemState).values
    const { label, description, placeholder, step, testId } = config.values
    return new TimeElementConfig({
      name,
      id,
      value,
      label,
      description: fromOptional(description),
      placeholder: fromOptional(placeholder),
      step: step ?? 60,
      testId,
      error,
      onChange: (t) => setState(new TimeItemState({ value: t, error })),
    })
  }
  if (config instanceof CheckboxInput) {
    const { value, error } = (state as CheckboxItemState).values
    const { label, description, testId } = config.values
    return new CheckboxElementConfig({
      name,
      id,
      value,
      label,
      description: fromOptional(description),
      testId,
      error,
      onCheckedChange: (checked) => setState(new CheckboxItemState({ value: checked, error })),
    })
  }
  if (config instanceof MoneyInput) {
    const { value, error } = (state as MoneyItemState).values
    const { label, description, placeholder, testId } = config.values
    return new MoneyElementConfig({
      name,
      id,
      value,
      label,
      description: fromOptional(description),
      placeholder: fromOptional(placeholder),
      testId,
      error,
      onChange: (next) => setState(new MoneyItemState({ value: next, error })),
    })
  }
  if (config instanceof ComboboxInputBase) {
    const { value, error } = (state as ComboboxItemState).values
    const {
      label,
      description,
      items,
      getValue,
      getLabel,
      getKey,
      itemToString,
      placeholder,
      emptyMessage,
      allowClear,
      testId,
    } = config.values
    return new ComboboxElementConfig({
      name,
      id,
      items,
      value,
      label,
      description: fromOptional(description),
      placeholder: fromOptional(placeholder),
      emptyMessage: emptyMessage ?? "No items found.",
      allowClear: allowClear ?? true,
      getValue,
      getLabel,
      getKey: getKey ?? getValue,
      itemToString: comboboxItemToString(getValue, getLabel, itemToString),
      testId,
      error,
      onChange: (next) => setState(new ComboboxItemState({ value: next, error })),
    })
  }
  if (config instanceof SelectInputBase) {
    const { value, error } = (state as SelectItemState).values
    const { label, description, items, getValue, getLabel, getKey, placeholder, allowClear, testId } = config.values
    return new SelectElementConfig({
      name,
      id,
      items,
      value,
      label,
      description: fromOptional(description),
      placeholder: fromOptional(placeholder),
      allowClear: allowClear ?? false,
      getValue,
      getLabel,
      getKey: getKey ?? getValue,
      testId,
      error,
      onChange: (next) => setState(new SelectItemState({ value: next, error })),
    })
  }
  if (config instanceof TagsInput) {
    const { value, error } = (state as TagsItemState).values
    const { label, description, placeholder, testId } = config.values
    return new TagsElementConfig({
      name,
      id,
      value,
      label,
      description: fromOptional(description),
      placeholder: fromOptional(placeholder),
      testId,
      error,
      onChange: (next) => setState(new TagsItemState({ value: next, error })),
    })
  }
  return config satisfies never
}

function initialState<T extends FormInputs>(fields: T): FormState<T> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(fields)) {
    result[key] = fields[key]!.initialState()
  }
  return result as FormState<T>
}

function getValues<T extends FormInputs>(state: FormState<T>): FormOutputs<T> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(state)) {
    result[key] = state[key]!.getValue()
  }
  return result as FormOutputs<T>
}

function updateErrors<T extends FormInputs>(errs: FormErrors<T>, state: FormState<T>): FormState<T> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(state)) {
    result[key] = state[key]!.withError(fromNullable(errs[key] ?? null))
  }
  return result as FormState<T>
}

function noErrors<T extends FormInputs>(values: FormOutputs<T>): FormErrors<T> {
  const result: Record<string, null> = {}
  for (const key of Object.keys(values)) {
    result[key] = null
  }
  return result as FormErrors<T>
}

/** Overwrite derivable text fields with `derive`'s output, skipping any the user has touched. */
function applyDerive<T extends FormInputs>(
  state: FormState<T>,
  touched: ReadonlySet<string>,
  derive: FormDerive<T> | undefined
): FormState<T> {
  if (!derive) return state
  const overrides = derive(getValues(state))
  const result: Record<string, unknown> = { ...state }
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value !== "string" || touched.has(key)) continue
    const current = state[key]!
    if (current instanceof TextItemState) {
      result[key] = new TextItemState({ value, error: current.values.error })
    }
  }
  return result as FormState<T>
}

/**
 * `fields` is read once, on mount: keep the same keys for the life of the form.
 * For conditional fields, give the form component a React `key` that changes with
 * the field set so it remounts with fresh state.
 */
function useForm<T extends FormInputs>({
  fields,
  validate = noErrors,
  derive,
  onChange,
}: FormConfig<T>): HookReturn<T> {
  const initial = useMemo(() => initialState(fields), [fields])
  const [state, setState] = useState(initial)
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set())
  const [validateOnChange, setValidateOnChange] = useState(false)
  // Prefix DOM ids per form so two forms sharing a field key don't collide; `name` stays the bare key.
  const formId = React.useId()

  const effective = applyDerive(state, touched, derive)

  const props: Record<string, AnyElementConfig> = {}
  for (const key of Object.keys(fields)) {
    props[key] = buildProps(key, `${formId}-${key}`, fields[key]!, effective[key]! as never, (s) => {
      const isEmptyText = s instanceof TextItemState && s.values.value === ""
      const nextTouched: ReadonlySet<string> =
        isEmptyText ?
          touched.has(key) ?
            new Set([...touched].filter((k) => k !== key))
          : touched
        : touched.has(key) ? touched
        : new Set(touched).add(key)
      setTouched(nextTouched)
      onChange?.(getValues(applyDerive({ ...state, [key]: s } as FormState<T>, nextTouched, derive)))
      setState((current) => {
        const next = { ...current, [key]: s } as FormState<T>
        if (validateOnChange) {
          return updateErrors(validate(getValues(applyDerive(next, nextTouched, derive))), next)
        }
        return next
      })
    })
  }

  const values = getValues(effective)

  const onSubmit: OnSubmit<T> = (f) => async (e) => {
    e?.preventDefault()
    setValidateOnChange(true)
    const errors = validate(values)
    setState((s) => updateErrors(errors, s))
    if (Object.values(errors).every((v) => v === null)) {
      await f(values)
    }
  }

  const reset = (): void => {
    setState(initial)
    setTouched(new Set())
    setValidateOnChange(false)
  }

  return { onSubmit, fields: props as FormProps<T>, values, reset }
}

/** A label, its control, and one message line: an error replaces the hint, as in the design system's Field. */
const labelVariants = cva("", {
  variants: { hideLabel: { true: "sr-only" } },
})

const inputVariants = cva("peer", {
  variants: {
    hasIcon: { true: "pl-9" },
    hasTrailingControl: { true: "pr-8" },
    search: { true: "[&::-webkit-search-cancel-button]:hidden" },
  },
})

type LabelVariants = VariantProps<typeof labelVariants>
type InputVariants = VariantProps<typeof inputVariants>

function FormLabel({
  label,
  hideLabel = false,
  description,
  error = Nothing(),
  children,
  htmlFor,
}: {
  label: ReactNode
  hideLabel?: boolean
  htmlFor: string
  description: Maybe<ReactNode>
  error?: Maybe<string>
  children: ReactNode
}) {
  return (
    <div className={fieldFrame}>
      {typeof label === "string" ?
        <Label htmlFor={htmlFor} className={labelVariants({ hideLabel } satisfies LabelVariants)}>
          {label}
        </Label>
      : label}
      {children}
      <FormMessage controlId={htmlFor} description={description} error={error} />
    </div>
  )
}

function FormMessage({
  controlId,
  description,
  error,
}: {
  controlId: string
  description: Maybe<ReactNode>
  error: Maybe<string>
}) {
  const id = `${controlId}-message`
  return error.maybe<ReactNode>(
    description.maybe<ReactNode>(null, (hint) => (
      <p id={id} className={fieldMessage}>
        {hint}
      </p>
    )),
    (message) => (
      <p id={id} role="alert" className={fieldMessage} data-error>
        <AlertCircleIcon className="mt-px size-4 shrink-0" />
        {message}
      </p>
    )
  )
}

/** The attributes tying a control to its message line; the message's id is `<control id>-message`. */
function messageProps(
  controlId: string,
  description: Maybe<ReactNode>,
  error: Maybe<string>
): { "aria-invalid": true | undefined; "aria-describedby": string | undefined } {
  const hasError = error.maybe(false, () => true)
  const hasMessage = hasError || description.maybe(false, () => true)
  return {
    "aria-invalid": hasError ? true : undefined,
    "aria-describedby": hasMessage ? `${controlId}-message` : undefined,
  }
}

/** A leading icon inside a control's wrapper; dims when the control before it (the `peer`) is disabled. */
const CONTROL_ICON =
  "pointer-events-none absolute top-1/2 left-gutter-md size-icon-sm -translate-y-1/2 text-secondary peer-disabled:text-disabled"

/** A small round icon button inside a control: the search clear, the password toggle and the tag remove. */
const CHIP_BUTTON =
  "inline-flex cursor-pointer items-center justify-center rounded-full text-secondary transition-[color] duration-(--transition-duration-basic) ease-basic focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:text-disabled hover:not-disabled:text-primary [&>svg]:size-icon-xs"

/** `CHIP_BUTTON` pinned to a control's trailing edge. */
const CLEAR_BUTTON = cn(CHIP_BUTTON, "absolute top-1/2 right-gutter-2xs size-control-4xs -translate-y-1/2")

/** The tags field frame: chips and a borderless input, drawn in the field-control states. */
const TAGS_FRAME = cn(
  "flex min-h-control-lg w-full cursor-text flex-wrap items-center gap-input-sm rounded-lg bg-control px-gutter-md py-input-xs text-base text-primary inset-ring inset-ring-strong transition-[background-color,box-shadow] duration-(--transition-duration-basic) ease-basic",
  "has-[>input:focus-visible]:outline-2 has-[>input:focus-visible]:outline-offset-1 has-[>input:focus-visible]:outline-ring",
  "has-[>input[aria-invalid=true]:focus-visible]:outline-ring-danger has-[>input[aria-invalid=true]:not(:disabled)]:inset-ring-border-danger-outline-hover",
  "has-[>input:disabled]:cursor-not-allowed has-[>input:disabled]:bg-transparent has-[>input:disabled]:text-disabled has-[>input:disabled]:inset-ring-border-disabled",
  "hover:not-has-[>input:disabled]:not-has-[>input:focus-visible]:inset-shadow-[0_0_0_99px_var(--color-hover-tint)] hover:not-has-[>input:disabled]:not-has-[>input:focus-visible]:inset-ring-border-primary-outline-hover",
  "has-[>input[aria-invalid=true]]:hover:not-has-[>input:focus-visible]:bg-danger-surface has-[>input[aria-invalid=true]]:hover:not-has-[>input:focus-visible]:inset-shadow-none has-[>input[aria-invalid=true]]:hover:not-has-[>input:focus-visible]:inset-ring-border-danger-outline-hover"
)

type FormInputProps = {
  config: AnyElementConfig
  className?: string | undefined
  disabled?: boolean | undefined
}

function FormTextField({
  config,
  className,
  disabled,
}: {
  config: TextElementConfig
  className: string | undefined
  disabled: boolean | undefined
}) {
  const { name, id, value, type, label, hideLabel, description, placeholder, icon, input, error, onChange } =
    config.values
  // A password field always offers show and hide (design canvas, sign-in "Leading icons, show or hide password").
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === "password"
  const hasIcon = icon.maybe(false, () => true)
  const showClear = type === "search" && value.length > 0
  const needsWrapper = hasIcon || type === "search" || isPassword

  const inputEl = (
    <Input
      {...input}
      {...messageProps(id, description, error)}
      id={id}
      name={name}
      value={value}
      className={cn(
        inputVariants({
          hasIcon,
          hasTrailingControl: showClear || isPassword,
          search: type === "search",
        } satisfies InputVariants),
        className
      )}
      placeholder={placeholder.withDefault("")}
      disabled={disabled}
      type={isPassword && revealed ? "text" : type}
      onChange={(e) => onChange(e.target.value)}
    />
  )

  return (
    <FormLabel htmlFor={id} label={label} hideLabel={hideLabel} description={description} error={error}>
      {needsWrapper ?
        <div className="relative">
          {inputEl}
          {icon.maybe(null, (Icon) => (
            <HugeiconsIcon icon={Icon} className={CONTROL_ICON} />
          ))}
          {showClear && (
            <button
              type="button"
              onClick={() => {
                if (!disabled) onChange("")
              }}
              aria-label="Clear search"
              className={CLEAR_BUTTON}
              disabled={disabled}
            >
              <HugeiconsIcon icon={Cancel01Icon} />
            </button>
          )}
          {isPassword && (
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              aria-label={revealed ? "Hide password" : "Show password"}
              aria-pressed={revealed}
              className={CLEAR_BUTTON}
              disabled={disabled}
            >
              <HugeiconsIcon icon={revealed ? ViewOffSlashIcon : ViewIcon} />
            </button>
          )}
        </div>
      : inputEl}
    </FormLabel>
  )
}

function FormTextareaField({
  config,
  className,
  disabled,
}: {
  config: TextareaElementConfig
  className: string | undefined
  disabled: boolean | undefined
}) {
  const { name, id, value, label, description, placeholder, rows, testId, error, onChange } = config.values

  return (
    <FormLabel htmlFor={id} label={label} description={description} error={error}>
      <Textarea
        {...messageProps(id, description, error)}
        id={id}
        name={name}
        value={value}
        rows={rows}
        className={cn(className)}
        placeholder={placeholder.withDefault("")}
        disabled={disabled}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormLabel>
  )
}

function FormDateField({
  config,
  className,
  disabled,
}: {
  config: DateElementConfig
  className: string | undefined
  disabled: boolean | undefined
}) {
  const { id, value, label, description, placeholder, testId, error, onChange } = config.values
  const [open, setOpen] = useState(false)
  const selectedJs = value ? new Date(value.year, value.month - 1, value.day) : undefined
  const today = DateOnly.todayUTC()
  // Native Date adapter required by the calendar widget.
  const todayJs = new Date(today.year, today.month - 1, today.day)
  // The dropdown caption otherwise stops at this December, and shifts and credential expiries run into later years.
  const lastYear = Math.max(today.year, value?.year ?? 0) + 10

  return (
    <FormLabel htmlFor={id} label={label} description={description} error={error}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          {...messageProps(id, description, error)}
          id={id}
          disabled={disabled ?? false}
          data-testid={testId}
          data-placeholder={value ? undefined : ""}
          className={cn(selectTrigger, "w-full justify-start text-left", className)}
        >
          <HugeiconsIcon icon={Calendar03Icon} />
          {value ? value.pretty() : placeholder.withDefault("Pick a date")}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedJs}
            today={todayJs}
            defaultMonth={selectedJs ?? todayJs}
            captionLayout="dropdown"
            endMonth={new Date(lastYear, 11)}
            onSelect={(d) => {
              onChange(d ? new DateOnly(d.getFullYear(), d.getMonth() + 1, d.getDate()) : null)
              setOpen(false)
            }}
          />
          {value && (
            <div className="border-t border-default p-gutter-xs">
              <Button
                type="button"
                variant="ghost-primary"
                size="sm"
                className="w-full"
                onClick={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                Clear date
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </FormLabel>
  )
}

/** Format a time for `<input type="time">`: `HH:MM`, or with seconds when the step or the value needs them. */
function timeOfDayToInputValue(t: TimeOfDay | null, step: number): string {
  if (t == null) return ""
  const full = t.pretty()
  // Drop seconds only when neither the step nor the value uses them, so the input never hides data it submits.
  return step % 60 === 0 && t.seconds % 60 === 0 ? full.slice(0, 5) : full
}

/** Parse an `<input type="time">` value; `null` when blank or malformed. */
function inputValueToTimeOfDay(value: string): TimeOfDay | null {
  if (!value) return null
  const [h, m, s = "0"] = value.split(":")
  const hours = Number(h)
  const minutes = Number(m)
  const seconds = Number(s)
  if ([hours, minutes, seconds].some(Number.isNaN)) return null
  return TimeOfDay.fromParts({ hours, minutes, seconds })
}

function FormTimeField({
  config,
  className,
  disabled,
}: {
  config: TimeElementConfig
  className: string | undefined
  disabled: boolean | undefined
}) {
  const { name, id, value, label, description, step, testId, error, onChange } = config.values

  return (
    <FormLabel htmlFor={id} label={label} description={description} error={error}>
      <div className="relative">
        <Input
          {...messageProps(id, description, error)}
          id={id}
          name={name}
          type="time"
          step={step}
          disabled={disabled}
          data-testid={testId}
          value={timeOfDayToInputValue(value, step)}
          onChange={(e) => onChange(inputValueToTimeOfDay(e.target.value))}
          className={cn("peer pl-9 [&::-webkit-calendar-picker-indicator]:hidden", className)}
        />
        <HugeiconsIcon icon={Clock01Icon} className={CONTROL_ICON} />
      </div>
    </FormLabel>
  )
}

function FormCheckboxField({
  config,
  disabled,
}: {
  config: CheckboxElementConfig
  className: string | undefined
  disabled: boolean | undefined
}) {
  const { name, id, value, label, description, testId, error, onCheckedChange } = config.values
  const checkboxId = `${id}-checkbox`

  return (
    <div className={fieldFrame}>
      <div className="flex items-center gap-2">
        <Checkbox
          {...messageProps(checkboxId, description, error)}
          id={checkboxId}
          name={name}
          checked={value}
          disabled={disabled ?? false}
          data-testid={testId}
          onCheckedChange={(v) => onCheckedChange(v === true)}
        />
        {typeof label === "string" ?
          <Label htmlFor={checkboxId} className="cursor-pointer font-normal">
            {label}
          </Label>
        : label}
      </div>
      <FormMessage controlId={checkboxId} description={description} error={error} />
    </div>
  )
}

function FormMoneyField({
  config,
  className,
  disabled,
}: {
  config: MoneyElementConfig
  className: string | undefined
  disabled: boolean | undefined
}) {
  const { name, id, value, label, description, placeholder, testId, error, onChange } = config.values

  return (
    <FormLabel htmlFor={id} label={label} description={description} error={error}>
      <div className="relative">
        <Input
          {...messageProps(id, description, error)}
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          value={value}
          className={cn("peer pl-9", className)}
          placeholder={placeholder.withDefault("0.00")}
          disabled={disabled}
          data-testid={testId}
          onChange={(e) => onChange(e.target.value)}
        />
        <HugeiconsIcon icon={DollarCircleIcon} className={CONTROL_ICON} />
      </div>
    </FormLabel>
  )
}

/** Cap on mounted options: large datasets otherwise freeze the popover, and users narrow past it by typing. */
const COMBOBOX_MAX_VISIBLE = 50

function FormComboboxField({
  config,
  className,
  disabled,
}: {
  config: ComboboxElementConfig
  className: string | undefined
  disabled: boolean | undefined
}) {
  const {
    id,
    items,
    value,
    label,
    description,
    placeholder,
    emptyMessage,
    allowClear,
    getValue,
    getLabel,
    getKey,
    itemToString,
    testId,
    error,
    onChange,
  } = config.values

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selectedItem = items.find((item) => getValue(item) === value) ?? null

  // Bounded, fuzzy-ranked slice, so thousands of items are never mounted at once.
  const ranked = useMemo(
    () => search(query, items, [itemToString], { caseSensitive: false }).map((r) => r.item),
    [query, items, itemToString]
  )
  const visible = ranked.slice(0, COMBOBOX_MAX_VISIBLE)
  const hiddenCount = ranked.length - visible.length

  return (
    <FormLabel htmlFor={id} label={label} description={description} error={error}>
      <Popover
        modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery("")
        }}
      >
        <PopoverTrigger
          {...messageProps(id, description, error)}
          id={id}
          role="combobox"
          aria-expanded={open}
          disabled={disabled ?? false}
          data-testid={testId}
          data-placeholder={selectedItem ? undefined : ""}
          className={cn(selectTrigger, "w-full", className)}
        >
          <span className="truncate">{selectedItem ? getLabel(selectedItem) : placeholder.withDefault("Select…")}</span>
          <HugeiconsIcon icon={UnfoldMoreIcon} />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) p-0">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search…" value={query} onValueChange={setQuery} />
            <CommandList>
              {visible.length === 0 && (
                <p className="py-6 text-center text-sm font-normal text-secondary">{emptyMessage}</p>
              )}
              <CommandGroup>
                {visible.map((item) => {
                  const itemValue = getValue(item)
                  const isSelected = itemValue === value
                  return (
                    <CommandItem
                      key={getKey(item)}
                      value={itemValue}
                      data-checked={isSelected}
                      onSelect={(current) => {
                        const next = allowClear && current === value ? null : current
                        onChange(next)
                        setOpen(false)
                        setQuery("")
                      }}
                    >
                      {getLabel(item)}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {hiddenCount > 0 && (
                <p className="border-t border-default px-gutter-md py-gutter-xs text-xs font-normal text-secondary">
                  Showing first {visible.length} of {ranked.length}. Keep typing to narrow results.
                </p>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FormLabel>
  )
}

function FormSelectField({
  config,
  className,
  disabled,
}: {
  config: SelectElementConfig
  className: string | undefined
  disabled: boolean | undefined
}) {
  const {
    name,
    id,
    items,
    value,
    label,
    description,
    placeholder,
    allowClear,
    getValue,
    getLabel,
    getKey,
    testId,
    error,
    onChange,
  } = config.values

  const showClear = allowClear && value !== null

  // Base UI Select reserves "" for placeholder/clear, so `null` maps to "" and real values must be non-empty.
  const selectValue = value === null ? "" : selectNonEmptyValue(name, value)
  const selectItems = items.map((item) => {
    const itemValue = selectNonEmptyValue(name, getValue(item))
    return { key: getKey(item), label: getLabel(item), value: itemValue }
  })

  const optionValues = new Set(selectItems.map((item) => item.value))
  const clearValuePrefix = "__form_select_clear__"
  let clearValue = clearValuePrefix
  for (let index = 0; optionValues.has(clearValue); index += 1) {
    clearValue = `${clearValuePrefix}:${index}`
  }

  return (
    <FormLabel htmlFor={id} label={label} description={description} error={error}>
      <Select
        name={name}
        value={selectValue}
        items={selectItems.map((i) => ({ value: i.value, label: i.label }))}
        disabled={disabled ?? false}
        onValueChange={(next) => onChange(showClear && next === clearValue ? null : next)}
      >
        <SelectTrigger
          {...messageProps(id, description, error)}
          id={id}
          data-testid={testId}
          className={cn("w-full", className)}
        >
          <SelectValue placeholder={placeholder.withDefault("Select…")} />
        </SelectTrigger>
        <SelectContent>
          {showClear && (
            <SelectItem value={clearValue} className="text-secondary">
              Clear selection
            </SelectItem>
          )}
          {selectItems.map((item) => (
            <SelectItem key={item.key} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormLabel>
  )
}

/** Return `value`, throwing if it is `""`: the select reserves the empty string for its placeholder/clear state. */
function selectNonEmptyValue(name: string, value: string): string {
  if (value === "") {
    throw new Error(`SelectInput "${name}" values must be non-empty strings. Use null for no selection.`)
  }
  return value
}

function FormTagsField({
  config,
  className,
  disabled,
}: {
  config: TagsElementConfig
  className: string | undefined
  disabled: boolean | undefined
}) {
  const { name, id, value, label, description, placeholder, testId, error, onChange } = config.values
  const [draft, setDraft] = useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed.length === 0) return
    const exists = value.some((t) => t.toLowerCase() === trimmed.toLowerCase())
    if (!exists) onChange([...value, trimmed])
    setDraft("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commit()
      return
    }
    if (e.key === "Backspace" && draft.length === 0 && value.length > 0) {
      e.preventDefault()
      onChange(value.slice(0, -1))
    }
  }

  return (
    <FormLabel htmlFor={id} label={label} description={description} error={error}>
      <div onClick={() => inputRef.current?.focus()} className={cn(TAGS_FRAME, className)}>
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-input-xs rounded-full bg-secondary-soft px-gutter-xs text-sm font-normal text-secondary"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (!disabled) onChange(value.filter((t) => t !== tag))
              }}
              className={CHIP_BUTTON}
              aria-label={`Remove ${tag}`}
              disabled={disabled}
            >
              <HugeiconsIcon icon={Cancel01Icon} />
            </button>
          </span>
        ))}
        <input
          {...messageProps(id, description, error)}
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          data-testid={testId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={value.length === 0 ? placeholder.withDefault("") : undefined}
          disabled={disabled}
          className="min-w-20 flex-1 bg-transparent text-inherit outline-none [font:inherit] placeholder:text-tertiary disabled:cursor-not-allowed"
        />
      </div>
    </FormLabel>
  )
}

/** Render the field element that matches `config`'s class. */
const FormInput: React.FC<FormInputProps> = ({ config, className, disabled }) => {
  if (config instanceof TextElementConfig) {
    return <FormTextField config={config} className={className} disabled={disabled} />
  }

  if (config instanceof TextareaElementConfig) {
    return <FormTextareaField config={config} className={className} disabled={disabled} />
  }

  if (config instanceof DateElementConfig) {
    return <FormDateField config={config} className={className} disabled={disabled} />
  }

  if (config instanceof TimeElementConfig) {
    return <FormTimeField config={config} className={className} disabled={disabled} />
  }

  if (config instanceof CheckboxElementConfig) {
    return <FormCheckboxField config={config} className={className} disabled={disabled} />
  }

  if (config instanceof MoneyElementConfig) {
    return <FormMoneyField config={config} className={className} disabled={disabled} />
  }

  if (config instanceof ComboboxElementConfig) {
    return <FormComboboxField config={config} className={className} disabled={disabled} />
  }

  if (config instanceof SelectElementConfig) {
    return <FormSelectField config={config} className={className} disabled={disabled} />
  }

  if (config instanceof TagsElementConfig) {
    return <FormTagsField config={config} className={className} disabled={disabled} />
  }

  return config satisfies never
}
