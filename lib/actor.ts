export { type Actor, type UserActor, schema_actor }

import * as s from "@lib/json/schema"

import { Id } from "@lib/id"

/** Who is making a request: `Anonymous` until a verified JWT resolves to a user. An agency's `id` is its agency ID. */
const schema_actor = s.discriminatedUnion([
  s.variant({ type: "Anonymous" }),
  s.variant({
    type: "User",
    id: Id.schema<"User">(),
    name: s.string,
    role: s.stringEnum(["nurse", "agency", "admin"]),
  }),
])

// Derived from the schema so the wire shape and the type cannot drift.
type Actor = s.Infer<typeof schema_actor>
type UserActor = Extract<Actor, { type: "User" }>
