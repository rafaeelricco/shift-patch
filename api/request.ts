/**
 * The one module that sends requests to the server: `call` and `upload`, each for an endpoint from
 * `@api/endpoints`. Both decode the reply with the endpoint's own schema.
 *
 * Every request is a `POST` to `/api/…` on the same origin, carrying `Authorization: Bearer <token>` while someone is
 * signed in. Each function returns a lazy `Future`: nothing is sent until it is forked, and the cancel that `fork`
 * returns aborts the request without reporting a failure.
 *
 * ```ts
 * const cancel = call(api.login, { email, password }).fork(
 *   (error) => setState(Failed(error)), // a FetchError: NetworkError | BadStatus | UnableToDecode
 *   ({ user }) => setState(Ready(user))
 * )
 * ```
 *
 * The server sends every error as `{ "error": "<message>" }`, which becomes `BadStatus.message`. A 401 on a request
 * that carried a token is announced to the `onUnauthorized` listeners, and `lib/session.ts` signs out on it; a 401
 * with no token is a failed login and announces nothing. Show a failure to the person with `fetchErrorToString(error)`.
 */

export {
  call,
  upload,
  onUnauthorized,
  setAuthToken,
  fetchErrorToString,
  type FetchError,
  NetworkError,
  BadStatus,
  UnableToDecode,
}

import * as s from "@lib/json/schema"

import { Future } from "@lib/future"
import { Just, Nothing, type Maybe } from "@lib/maybe"

const FILE_NAME_HEADER = "X-File-Name"

/** The request never got a reply: offline, refused connection, DNS. `reason` is the browser's message. */
class NetworkError {
  declare private readonly _tag: "NetworkError"
  readonly reason: string
  constructor(reason: string) {
    this.reason = reason
  }
}

/** A non-2xx reply. `message` is the server's `{ error }` string, else the status text. */
class BadStatus {
  declare private readonly _tag: "BadStatus"
  readonly status: number
  readonly message: string
  constructor(status: number, message: string) {
    this.status = status
    this.message = message
  }
}

/** The server replied, but the body did not match the endpoint's response schema. */
class UnableToDecode {
  declare private readonly _tag: "UnableToDecode"
  readonly reason: string
  constructor(reason: string) {
    this.reason = reason
  }
}

/** Every way a `call` or `upload` can fail. */
type FetchError = NetworkError | BadStatus | UnableToDecode

/** Structural: `PlainEndpoint` from `@lib/endpoint` satisfies it. */
type Endpoint<Req, Res> = { readonly path: string; readonly request: s.Schema<Req>; readonly response: s.Schema<Res> }

/** Structural like `Endpoint`: `UploadEndpoint` from `@lib/endpoint` satisfies it. */
type UploadTarget<Res> = { readonly path: string; readonly response: s.Schema<Res> }

/** What came back, before any decoding; a union so an "ok" reply can't carry a failure status. */
type Reply =
  | { type: "Ok"; body: string }
  | { type: "BadStatus"; status: number; statusText: string; body: string; sentToken: Maybe<string> }

const schema_errorBody = s.stringified(s.object({ error: s.string }))

/** The JWT sent on every request; `lib/session.ts` is the one writer. */
let authToken: Maybe<string> = Nothing()
function setAuthToken(token: Maybe<string>): void {
  authToken = token
}

/** Called on every 401 reply to a request that carried a token. */
const unauthorizedListeners = new Set<() => void>()

/**
 * Call `listener` whenever the server answers 401 to a request that carried a token, and return a function that
 * unsubscribes it. Such a 401 means the server no longer accepts the token: it is expired or malformed.
 */
function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

/** The one place a failure status becomes a `BadStatus`, so every 401 on an authenticated request is announced. */
function badStatus(status: number, reply: { statusText: string; body: string }, sentToken: Maybe<string>): BadStatus {
  // A 401 with no token is a failed login (FR-1.2), and one for a token since replaced says nothing about the current
  // session. Neither is a lost session.
  const lostCurrentToken = sentToken instanceof Just && authToken instanceof Just && sentToken.value === authToken.value
  if (status === 401 && lostCurrentToken) unauthorizedListeners.forEach((listener) => listener())
  return new BadStatus(status, errorMessage(reply))
}

/** POST `body` to `endpoint` with the bearer token, decoding the reply with the endpoint's own schema. */
function call<Req, Res>(endpoint: Endpoint<Req, Res>, body: Req): Future<FetchError, Res> {
  return send(
    endpoint.path,
    { "Content-Type": "application/json" },
    JSON.stringify(s.encode(endpoint.request, body))
  ).chain((reply) => decodeReply(endpoint.response, reply))
}

/**
 * POST `file` as the raw request body (typed by the file itself) with the bearer token. The original name
 * travels URI-encoded in `X-File-Name`. The reply decodes with the endpoint's own schema, and cancelling aborts the
 * transfer.
 */
function upload<Res>(
  endpoint: UploadTarget<Res>,
  file: File,
  headers: Record<string, string> = {}
): Future<FetchError, Res> {
  return send(
    endpoint.path,
    { "Content-Type": file.type, [FILE_NAME_HEADER]: encodeURIComponent(file.name), ...headers },
    file
  ).chain((reply) => decodeReply(endpoint.response, reply))
}

/** Decode an `Ok` reply with the endpoint's schema; a `BadStatus` reply rejects. */
function decodeReply<Res>(response: s.Schema<Res>, reply: Reply): Future<FetchError, Res> {
  switch (reply.type) {
    case "Ok":
      return s.decode(s.stringified(response), reply.body).either<Future<FetchError, Res>>(
        (reason) => Future.reject(new UnableToDecode(reason)),
        (value) => Future.resolve(value)
      )
    case "BadStatus":
      return Future.reject(badStatus(reply.status, reply, reply.sentToken))
    default: {
      const _exhaustiveCheck: never = reply
      throw new Error(`Unknown: ${JSON.stringify(_exhaustiveCheck)}`)
    }
  }
}

/** The fetch boundary: the one place a Promise becomes a Future. Cancelling aborts the request. */
function send(path: string, headers: Record<string, string>, body: string | File): Future<FetchError, Reply> {
  return Future.create<FetchError, Reply>((reject, resolve) => {
    const controller = new AbortController()
    const sentToken = authToken
    fetch(path, {
      method: "POST",
      headers: sentToken.maybe(headers, (token) => ({ ...headers, Authorization: `Bearer ${token}` })),
      body,
      signal: controller.signal,
    })
      .then((res) =>
        res
          .text()
          .then((text) =>
            resolve(
              res.ok ?
                { type: "Ok", body: text }
              : { type: "BadStatus", status: res.status, statusText: res.statusText, body: text, sentToken }
            )
          )
      )
      .catch((err: unknown) => {
        // An abort is our own cancel, not a failure anyone is still listening for.
        if (!controller.signal.aborted) reject(new NetworkError(err instanceof Error ? err.message : String(err)))
      })
    return () => controller.abort()
  })
}

/** The server's `{ error }` string, else the status text. */
function errorMessage(reply: { statusText: string; body: string }): string {
  return s.decode(schema_errorBody, reply.body).either(
    () => reply.statusText,
    ({ error }) => error
  )
}

/** A user-facing line for a `FetchError`. */
function fetchErrorToString(error: FetchError): string {
  switch (true) {
    case error instanceof NetworkError:
      return `Can't reach the server: ${error.reason}`
    case error instanceof BadStatus:
      return error.message
    case error instanceof UnableToDecode:
      return `Unexpected server response: ${error.reason}`
    default:
      return error satisfies never
  }
}
