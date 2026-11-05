export { toJsonSchema, type JsonSchema }

import { type Result, Success, Failure, traverse_ } from "@lib/result"
import { type Schema, type Shape } from "@lib/json/schema"
import { type JsonObject } from "@lib/json/types"

type JsonSchema = JsonObject

const DRAFT = "https://json-schema.org/draft/2020-12/schema"

/**
 * Emit a draft 2020-12 JSON Schema; every object is closed (additionalProperties:false), non-optional keys are required.
 * Fails on any `opaque` node with its path, so an agent schema can't silently lose structure.
 */
function toJsonSchema<A>(schema: Schema<A>): Result<string, JsonSchema> {
  return emit(schema.shape, "$").map((node) => ({ $schema: DRAFT, ...node }))
}

function emit(shape: Shape, path: string): Result<string, JsonSchema> {
  switch (shape.kind) {
    case "string":
      return Success({ type: "string" })
    case "number":
      return Success({ type: "number" })
    case "boolean":
      return Success({ type: "boolean" })
    case "json":
      return Success({})
    case "literal":
      return Success({ type: "string", const: shape.value })
    case "enum":
      return Success({ type: "string", enum: [...shape.values] })
    case "array":
      return emit(shape.item, `${path}[]`).map((items) => ({ type: "array", items }))
    case "nullable":
      return emit(shape.inner, path).map((inner) => ({ anyOf: [inner, { type: "null" }] }))
    case "anyOf":
      return traverse_(
        shape.options.map((option, i) => ({ option, i })),
        ({ option, i }) => emit(option, `${path}.anyOf[${i}]`)
      ).map((anyOf) => ({ anyOf }))
    case "object":
      return emitObject(shape.fields, path)
    case "opaque":
      return Failure(`${path}: ${shape.reason}`)
    default:
      return shape satisfies never
  }
}

function emitObject(fields: Extract<Shape, { kind: "object" }>["fields"], path: string): Result<string, JsonSchema> {
  const entries = Object.entries(fields)
  return traverse_(entries, ([key, field]) =>
    emit(field.shape, `${path}.${key}`).map((node) => [key, node] as const)
  ).map((properties) => {
    const required = entries.filter(([, field]) => !field.optional).map(([key]) => key)
    return {
      type: "object",
      properties: Object.fromEntries(properties),
      ...(required.length > 0 ? { required } : {}),
      additionalProperties: false,
    }
  })
}
