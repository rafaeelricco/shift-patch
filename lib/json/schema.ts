export {
  Schema,
  type Infer,
  type SchemaDef,
  type SchemaOptional,
  type Shape,
  type Variant,
  object,
  pair,
  triple,
  map,
  boolean,
  number,
  string,
  array,
  json,
  both,
  maybe,
  result,
  nullable,
  optional,
  optionalNullable,
  optionalMaybe,
  optionalDefault,
  stringLiteral,
  stringEnum,
  stringified,
  oneOf,
  discriminatedUnion,
  variant,
  from,
  decode,
  encode,
  decoder,
  encoder,
  recursive,
}

import * as decoder from "@lib/json/decoder"
import * as encoder from "@lib/json/encoder"

import { type Result, Success, Failure } from "@lib/result"
import { Decoder, type DecoderDef, type DecoderOptional } from "@lib/json/decoder"
import { Encoder, type EncoderDef, type EncoderOptional } from "@lib/json/encoder"
import { type Json } from "@lib/json/types"
import { type Maybe, type Nullable } from "@lib/maybe"
import { filterMap, mapValues, isRecord } from "@lib/helpers/object"

/** Infer the type from a schema definition. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Infer<A extends Schema<any>> = A extends Schema<infer B> ? B : never

/** Wire shape of a schema, for emitters. `opaque` = not expressible (custom decoder, tuple, recursion). */
type Shape =
  | { kind: "string" }
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "json" }
  | { kind: "literal"; value: string }
  | { kind: "enum"; values: readonly string[] }
  | { kind: "array"; item: Shape }
  | { kind: "nullable"; inner: Shape }
  | { kind: "object"; fields: Readonly<Record<string, { shape: Shape; optional: boolean }>> }
  | { kind: "anyOf"; options: readonly Shape[] }
  | { kind: "opaque"; reason: string }

/**
 * A `Schema<A>` contains information to encode and decode a value.
 *
 * This allows us to have safe conversion to and from JSON.
 *
 * ```ts
 * import * as Schema from "@lib/json/schema";
 *
 * const user = Schema.object({
 *   name: Schema.string,
 *   age: Schema.number,
 * });
 *
 * Schema.decode(user, { name: "Ada", age: 36 });
 * Schema.encode(user, { name: "Ada", age: 36 });
 * ```
 */
class Schema<A> {
  decoder: Decoder<A>
  encoder: Encoder<A>
  readonly shape: Shape

  constructor(decoder: Decoder<A>, encoder: Encoder<A>, shape: Shape = { kind: "opaque", reason: "custom schema" }) {
    this.decoder = decoder
    this.encoder = encoder
    this.shape = shape
  }

  // dimap/chain change only the TS side; the wire shape is the parent's (Id → string, POSIX → number).
  dimap<W>(p: (v: A) => W, s: (v: W) => A): Schema<W> {
    return new Schema(this.decoder.map(p), this.encoder.rmap(s), this.shape)
  }

  chain<W>(p: (v: A) => Decoder<W>, s: (v: W) => A): Schema<W> {
    return new Schema(this.decoder.chain(p), this.encoder.rmap(s), this.shape)
  }
}

function decode<A>(schema: Schema<A>, input: unknown): Result<string, A> {
  return decoder.decode(input, schema.decoder)
}

function encode<A>(schema: Schema<A>, input: A): Json {
  return schema.encoder.run(input)
}

/** Create a Schema. */
function from<A>(decoder: Decoder<A>, encoder: Encoder<A>): Schema<A> {
  return new Schema(decoder, encoder)
}

type SchemaDef<A> = {
  [D in keyof A]: Schema<A[D]> | SchemaOptional<A[D]>
}

const json: Schema<Json> = new Schema(decoder.json, encoder.json, { kind: "json" })
const boolean: Schema<boolean> = new Schema(decoder.boolean, encoder.boolean, { kind: "boolean" })
const number: Schema<number> = new Schema(decoder.number, encoder.number, { kind: "number" })
const string: Schema<string> = new Schema(decoder.string, encoder.string, { kind: "string" })

const array = <A>(schema: Schema<A>): Schema<Array<A>> =>
  new Schema(decoder.array(schema.decoder), encoder.array(schema.encoder), { kind: "array", item: schema.shape })

const OPAQUE: Shape = { kind: "opaque", reason: "custom schema" }
const TUPLE: Shape = { kind: "opaque", reason: "tuple" }

const both = <T, U>(left: Schema<T>, right: Schema<U>): Schema<[T, U]> =>
  new Schema(decoder.both(left.decoder, right.decoder), encoder.both(left.encoder, right.encoder), TUPLE)

/** Schema for an object field that may not be present. */
class SchemaOptional<A> {
  readonly decoder: DecoderOptional<A>
  readonly encoder: EncoderOptional<A>
  readonly shape: Shape
  constructor(decoder: DecoderOptional<A>, encoder: EncoderOptional<A>, shape: Shape = OPAQUE) {
    this.decoder = decoder
    this.encoder = encoder
    this.shape = shape
  }

  dimap<W>(p: (v: A) => W, s: (v: W) => A): SchemaOptional<W> {
    return new SchemaOptional(this.decoder.map(p), this.encoder.rmap(s), this.shape)
  }
}

/** An object field that may be absent. */
const optional = <A>(s: Schema<A>): SchemaOptional<A | undefined> =>
  new SchemaOptional(decoder.optional(s.decoder), encoder.optional(s.encoder), s.shape)

const optionalNullable = <A>(schema: Schema<NonNullable<A>>): SchemaOptional<Nullable<A>> =>
  new SchemaOptional(decoder.optionalNullable(schema.decoder), encoder.optionalNullable(schema.encoder), {
    kind: "nullable",
    inner: schema.shape,
  })

/** Inside an object the `Maybe` envelope never reaches the wire: `Just` writes the bare value, `Nothing` omits the key. */
const optionalMaybe = <A>(schema: Schema<A>): SchemaOptional<Maybe<A>> =>
  new SchemaOptional(decoder.optionalMaybe(schema.decoder), encoder.optionalMaybe(schema.encoder), schema.shape)

/**
 * When decoding, if the field is absent, then the default will be used.
 * When encoding, the field is required.
 */
const optionalDefault = <A>(def: A, schema: Schema<A>): SchemaOptional<A> =>
  new SchemaOptional(decoder.optionalDefault(def, schema.decoder), encoder.optional(schema.encoder), schema.shape)

function object<A>(def: SchemaDef<A>): Schema<A> {
  const pdef = {} as DecoderDef<A>
  const sdef = {} as EncoderDef<A>
  const fields: Record<string, { shape: Shape; optional: boolean }> = {}
  for (const key in def) {
    const schema = def[key]
    pdef[key] = schema.decoder
    sdef[key] = schema.encoder
    fields[key] = { shape: schema.shape, optional: schema instanceof SchemaOptional }
  }
  return new Schema(decoder.object(pdef), encoder.object(sdef), { kind: "object", fields })
}

const pair = <L, R>(l: Schema<L>, r: Schema<R>): Schema<[L, R]> =>
  new Schema(decoder.pair(l.decoder, r.decoder), encoder.pair(l.encoder, r.encoder), TUPLE)

const triple = <A, B, C>(a: Schema<A>, b: Schema<B>, c: Schema<C>): Schema<[A, B, C]> =>
  new Schema(decoder.triple(a.decoder, b.decoder, c.decoder), encoder.triple(a.encoder, b.encoder, c.encoder), TUPLE)

const map = <A>(s: Schema<A>): Schema<Map<string, A>> =>
  array(pair(string, s)).dimap(
    (xs) => xs.reduce((acc, [k, v]) => acc.set(k, v), new Map<string, A>()),
    (m) => Array.from(m.entries())
  )

/** `Maybe` goes over the wire as `{nothing: {}}` or `{just: inner}`. */
const maybeShape = (inner: Shape): Shape => ({
  kind: "anyOf",
  options: [
    { kind: "object", fields: { nothing: { shape: { kind: "object", fields: {} }, optional: false } } },
    { kind: "object", fields: { just: { shape: inner, optional: false } } },
  ],
})

const maybe = <A>(s: Schema<A>): Schema<Maybe<A>> =>
  new Schema(decoder.maybe(s.decoder), encoder.maybe(s.encoder), maybeShape(s.shape))

const result = <E, T>(error: Schema<E>, success: Schema<T>): Schema<Result<E, T>> =>
  discriminatedUnion([
    variant({
      type: "Success",
      value: success,
    }),
    variant({
      type: "Failure",
      error,
    }),
  ]).dimap<Result<E, T>>(
    (v) => {
      switch (v.type) {
        case "Success":
          return Success(v.value)
        case "Failure":
          return Failure(v.error)
        default:
          return v satisfies never
      }
    },
    (r) =>
      r.either<{ type: "Failure"; error: E } | { type: "Success"; value: T }>(
        (error) => ({ type: "Failure", error }),
        (value) => ({ type: "Success", value })
      )
  )

const nullable = <A>(s: Schema<A>): Schema<Nullable<A>> =>
  new Schema(decoder.nullable(s.decoder), encoder.nullable(s.encoder), { kind: "nullable", inner: s.shape })

const stringLiteral = <T extends string>(str: T): Schema<T> =>
  new Schema(
    decoder.stringLiteral(str),
    encoder.string.rmap((input) => {
      if (input != str) {
        throw new Error(`Cannot encode '${input}'. Expected literal '${str}'"`)
      }
      return input
    }),
    { kind: "literal", value: str }
  )

const stringEnum = <const T extends string[]>(strs: T): Schema<T[number]> =>
  new Schema(decoder.stringEnum(strs), encoder.stringEnum(strs), { kind: "enum", values: strs })

const oneOf = <V>(f: (v: V) => Schema<V>, ss: Array<Schema<V>>): Schema<V> =>
  new Schema(
    decoder.oneOf(ss.map((s) => s.decoder)),
    encoder.oneOf((v) => f(v).encoder),
    { kind: "anyOf", options: ss.map((s) => s.shape) }
  )

/**
 * `A` is the tuple of variant payload types, inferred from the mapped tuple
 * `vars`, so the result is `Schema<A[number]>` without erasing any variant.
 */
const discriminatedUnion = <const A extends readonly unknown[]>(vars: {
  [K in keyof A]: Variant<A[K]>
}): Schema<A[number]> => {
  type Ty = A[number]
  const variants: ReadonlyArray<Variant<A[number]>> = vars
  const d: Decoder<Ty> = decoder.oneOf(variants.map((v) => v.schema.decoder))
  const e: Encoder<Ty> = encoder.oneOf<Ty>((v) => {
    const found = variants.find((variant) => matches(variant.pattern, v))
    if (found == undefined) {
      throw new Error(`Invalid discriminant in union type: '${v}'`)
    }

    return found.schema.encoder
  })

  return new Schema<Ty>(d, e, { kind: "anyOf", options: variants.map((v) => v.schema.shape) })
}

/** Check whether a value matches a pattern. */
const matches = (pattern: Record<string, string>, val: unknown): boolean => {
  if (!isRecord(val)) {
    return false
  }

  for (const key in pattern) {
    if (!(key in val)) {
      return false
    }
    if (pattern[key] != undefined && pattern[key] !== val[key]) {
      return false
    }
  }

  return true
}

/**
 * One option in a sum type.
 * Includes the pattern that differentiates it from the other options in the type.
 */
class Variant<T> {
  readonly pattern: Record<string, string>
  readonly schema: Schema<T>
  constructor(pattern: Record<string, string>, schema: Schema<T>) {
    this.pattern = pattern
    this.schema = schema
  }
}

type VariantDef<T extends string, A> = {
  [D in keyof A]: Schema<A[D]> | SchemaOptional<A[D]> | (A[D] & T)
}

const variant = <const T extends string, const A>(def: VariantDef<T, A>): Variant<A> => {
  const pattern = filterMap(def, (_, v): string | undefined => (typeof v == "string" ? v : undefined)) as Record<
    string,
    string
  >

  if (Object.keys(pattern).length == 0) {
    throw new Error("Invalid variant definition. No discriminant identified. Discriminant must be provided as a string")
  }

  const schemaDef: SchemaDef<A> = mapValues(def, (_, value) =>
    // @ts-expect-error hard to prove the types, but this is correct.
    typeof value == "string" ? stringLiteral<T>(value) : value
  )

  const schema: Schema<A> = object(schemaDef)

  return new Variant(pattern, schema)
}

/** Schema for a stringified JSON representation. */
const stringified = <T>(inner: Schema<T>): Schema<T> =>
  new Schema(decoder.stringified(inner.decoder), encoder.stringified(inner.encoder), {
    kind: "opaque",
    reason: "stringified",
  })

const recursive = <T>(f: (s: Schema<T>) => Schema<T>): Schema<T> => {
  const baseEncoder: Encoder<T> = new Encoder((_) => {
    throw new Error("A recursive encoder cannot immediately call itself.")
  })
  const baseDecoder: Decoder<T> = decoder.fail("A recursive decoder cannot immediately call itself.")
  const base: Schema<T> = new Schema(baseDecoder, baseEncoder, { kind: "opaque", reason: "recursive" })
  const top = f(base)
  // @ts-expect-error assigning to read-only prop
  base.encoder.run = top.encoder.run
  // @ts-expect-error assigning to read-only prop
  base.decoder.run = top.decoder.run
  return top
}
