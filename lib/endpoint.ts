export { PlainEndpoint, UploadEndpoint, type UploadType }

import { Schema } from "@lib/json/schema"

/**
 * One command or query's shape: where it's mounted and how to decode its
 * request and encode its response. Built once per endpoint, shared by the
 * client-facing route table and the server's handler wiring.
 */
class PlainEndpoint<Req, Res> {
  readonly path: string
  readonly request: Schema<Req>
  readonly response: Schema<Res>
  readonly method = "post" as const

  constructor(args: { path: string; request: Schema<Req>; response: Schema<Res> }) {
    this.path = args.path
    this.request = args.request
    this.response = args.response
  }
}

type UploadType = "application/pdf" | "image/png" | "image/jpeg" | "image/webp"

/** Binary request body (e.g. a PDF), JSON response. Same POST-only rule. The server sniffs magic bytes anyway. */
class UploadEndpoint<Res> {
  readonly method = "post" as const
  readonly path: string
  readonly contentTypes: ReadonlyArray<UploadType>
  readonly maxBytes: number
  readonly response: Schema<Res>

  constructor(args: {
    path: string
    contentTypes: ReadonlyArray<UploadType>
    maxBytes: number
    response: Schema<Res>
  }) {
    this.path = args.path
    this.contentTypes = args.contentTypes
    this.maxBytes = args.maxBytes
    this.response = args.response
  }
}
