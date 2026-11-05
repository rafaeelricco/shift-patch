/**
 * The one module that sends requests to the server: `call` and `upload`, each for an endpoint from
 * `@api/endpoints`. Both decode the reply with the endpoint's own schema.
 *
 * Requests go to `/api/…` on the same origin (`GET` for a `QueryEndpoint`, `POST` otherwise). The browser attaches the
 * HttpOnly `sid` session cookie itself; no caller handles credentials. Each function returns a lazy `Future`: nothing is sent until it is forked, and the cancel that `fork`
 * returns aborts the request without reporting a failure.
 *
 * ```ts
 * const cancel = call(api.login, { email, password }).fork(
 *   (error) => setState(Failed(error)), // a FetchError: NetworkError | BadStatus | UnableToDecode
 *   ({ user }) => setState(Ready(user))
 * )
 * ```
 *
 * The server sends every error as `{ "error": "<message>" }`, which becomes `BadStatus.message`. Every 401 is announced
 * to the `onUnauthorized` listeners; `lib/session.ts` asks `/api/auth/me` whether the session is really gone. Show a failure to the person with `fetchErrorToString(error)`.
 */

export { call, upload, onUnauthorized, fetchErrorToString, type FetchError, NetworkError, BadStatus, UnableToDecode }

import * as s from "@lib/json/schema"

import { Future } from "@lib/future"
import { CommandEndpoint, QueryEndpoint } from "@lib/endpoint"

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
type Reply = { type: "Ok"; body: string } | { type: "BadStatus"; status: number; statusText: string; body: string }

const schema_errorBody = s.stringified(s.object({ error: s.string }))

/** Called on every 401 reply. */
const unauthorizedListeners = new Set<() => void>()

/**
 * Call `listener` whenever the server answers 401, and return a function that unsubscribes it. A 401 may mean the
 * session cookie is gone, or only a failed login; `lib/session.ts` asks `/api/auth/me` to tell them apart.
 */
function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

/** The one place a failure status becomes a `BadStatus`, so every 401 is announced. */
function badStatus(status: number, reply: { statusText: string; body: string }): BadStatus {
  if (status === 401) unauthorizedListeners.forEach((listener) => listener())
  return new BadStatus(status, errorMessage(reply))
}

/**
 * Send one request and decode the reply with the endpoint's own schema.
 * - `call(plain, body)`: POST `body` to the fixed path (login).
 * - `call(query, params)`: GET `path(params)` with no body.
 * - `call(command, params, body)`: POST `body` to `path(params)`.
 */
// `NoInfer`: the endpoint alone fixes the types, so a literal body (`{ reason: "advance" }`) is checked, not widened.
function call<Req, Res>(endpoint: Endpoint<Req, Res>, body: NoInfer<Req>): Future<FetchError, Res>
function call<P, Res>(endpoint: QueryEndpoint<P, Res>, params: NoInfer<P>): Future<FetchError, Res>
function call<P, Req, Res>(
  endpoint: CommandEndpoint<P, Req, Res>,
  params: NoInfer<P>,
  body: NoInfer<Req>
): Future<FetchError, Res>
function call<P, Req, Res>(
  endpoint: Endpoint<Req, Res> | QueryEndpoint<P, Res> | CommandEndpoint<P, Req, Res>,
  first: P & Req,
  body?: Req
): Future<FetchError, Res> {
  const jsonHeaders = { "Content-Type": "application/json" }
  const sent =
    endpoint instanceof QueryEndpoint ? send("GET", endpoint.path(first), {}, null)
    : endpoint instanceof CommandEndpoint ?
      // The command overload always passes `body`; `?? first` only satisfies the shared signature.
      send("POST", endpoint.path(first), jsonHeaders, JSON.stringify(s.encode(endpoint.request, body ?? first)))
    : send("POST", endpoint.path, jsonHeaders, JSON.stringify(s.encode(endpoint.request, first)))
  return sent.chain((reply) => decodeReply(endpoint.response, reply))
}

/**
 * POST `file` as the raw request body (typed by the file itself). The original name
 * travels URI-encoded in `X-File-Name`. The reply decodes with the endpoint's own schema, and cancelling aborts the
 * transfer.
 */
function upload<Res>(
  endpoint: UploadTarget<Res>,
  file: File,
  headers: Record<string, string> = {}
): Future<FetchError, Res> {
  return send(
    "POST",
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
      return Future.reject(badStatus(reply.status, reply))
    default: {
      const _exhaustiveCheck: never = reply
      throw new Error(`Unknown: ${JSON.stringify(_exhaustiveCheck)}`)
    }
  }
}

/** The fetch boundary: the one place a Promise becomes a Future. Cancelling aborts the request. */
function send(
  method: "GET" | "POST",
  path: string,
  headers: Record<string, string>,
  body: string | File | null
): Future<FetchError, Reply> {
  return Future.create<FetchError, Reply>((reject, resolve) => {
    const controller = new AbortController()
    // Same-origin by default, so the HttpOnly `sid` cookie rides every call.
    fetch(path, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) =>
        res
          .text()
          .then((text) =>
            resolve(
              res.ok ?
                { type: "Ok", body: text }
              : { type: "BadStatus", status: res.status, statusText: res.statusText, body: text }
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
