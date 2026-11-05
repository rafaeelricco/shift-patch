export { api, schema_user, type User }

import * as s from "@lib/json/schema"

import { Id } from "@lib/id"
import { PlainEndpoint } from "@lib/endpoint"

// The login reply's user, as FR-1.1 sends it.
const schema_user = s.object({
  id: Id.schema<"User">(),
  name: s.string,
  role: s.stringEnum(["nurse", "agency", "admin"]),
})
type User = s.Infer<typeof schema_user>

const api = {
  login: new PlainEndpoint({
    path: "/api/auth/login",
    request: s.object({ email: s.string, password: s.string }),
    response: s.object({ token: s.string, user: schema_user }),
  }),
}
