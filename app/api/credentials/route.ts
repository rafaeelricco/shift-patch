import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db, sql } from "@lib/db"
import { Id } from "@lib/id"
import { audit } from "@lib/audit"
import { authorize } from "@lib/auth"
import { credentialSummary } from "@lib/credentials"
import { facilityToday } from "@lib/facility"
import { Future } from "@lib/future"
import { DateOnly } from "@lib/time"
import { json, failure, respond, fromDb } from "@lib/http"
import type { UploadType } from "@lib/endpoint"

type StoredType = Exclude<UploadType, "image/webp">

const MAX_BYTES = api.uploadCredential.maxBytes // 4 MB
const TOO_LARGE = "File must be 4 MB or smaller"
const WRONG_TYPE = "File must be a PDF, PNG or JPEG"
const UPLOAD_LOCK = 2 // two-key advisory lock namespace, apart from Foundation's single-key locks

// FR-7.2: the type comes from the content, never from the Content-Type header or the name.
const SIGNATURES: ReadonlyArray<{ type: StoredType; magic: ReadonlyArray<number> }> = [
  { type: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { type: "image/png", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
]

function sniff(bytes: Uint8Array): StoredType | null {
  return SIGNATURES.find(({ magic }) => magic.every((byte, i) => bytes[i] === byte))?.type ?? null
}

function expiryOf(request: Request): Future<Response, DateOnly> {
  const raw = request.headers.get("x-expiry-date")?.trim() ?? ""
  if (raw === "") return Future.reject(failure(400, "Enter an expiry date"))
  return Future.fromResult(s.decode(DateOnly.schema, raw))
    .mapRej(() => failure(400, "Enter a valid expiry date"))
    .chain((date) =>
      date.compare(facilityToday()) < 0 ?
        Future.reject(failure(400, "Expiry date is in the past"))
      : Future.resolve(date)
    )
}

type Read = { type: "Read"; bytes: Uint8Array } | { type: "TooLarge" }

// Platform boundary: stops reading once past the cap, so an oversized body never sits in memory.
function readCapped(request: Request): Future<Response, Uint8Array> {
  const declared = Number(request.headers.get("content-length") ?? "")
  if (Number.isFinite(declared) && declared > MAX_BYTES) return Future.reject(failure(413, TOO_LARGE))
  return Future.attemptP(async (): Promise<Read> => {
    const reader = request.body?.getReader()
    if (reader === undefined) return { type: "Read", bytes: new Uint8Array() }
    const chunks: Array<Uint8Array> = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return { type: "Read", bytes: Buffer.concat(chunks) }
      total += value.byteLength
      if (total > MAX_BYTES) {
        await reader.cancel()
        return { type: "TooLarge" }
      }
      chunks.push(value)
    }
  })
    .mapRej(() => failure(400, "Couldn't read the file, try again"))
    .chain((read) => (read.type === "TooLarge" ? Future.reject(failure(413, TOO_LARGE)) : Future.resolve(read.bytes)))
}

function fileName(request: Request): string {
  let decoded = ""
  try {
    decoded = decodeURIComponent(request.headers.get("x-file-name") ?? "")
  } catch {
    decoded = "" // malformed escapes: platform boundary
  }
  const clean = decoded
    .replace(/[\p{Cc}"\\/]/gu, "")
    .trim()
    .slice(0, 200)
  return clean === "" ? "document" : clean
}

export async function POST(request: Request): Promise<Response> {
  return respond(
    authorize(request, ["nurse"]).chain((nurse) =>
      expiryOf(request).chain((expiresOn) =>
        readCapped(request).chain((bytes) => {
          if (bytes.byteLength === 0)
            return Future.reject<Response, Response>(failure(400, "Choose a document to upload"))
          const type = sniff(bytes)
          if (type === null) return Future.reject<Response, Response>(failure(415, WRONG_TYPE))
          const nurseId = nurse.id.value
          const id = `upload-${Id.random<"Upload">().value}`
          return db
            .transaction((tx) =>
              tx
                .execute(sql`SELECT pg_advisory_xact_lock(${UPLOAD_LOCK}, hashtext(${nurseId}))`)
                // FR-7.5: a new upload replaces this nurse's pending one and its document.
                .chain(() =>
                  tx.execute(sql`DELETE FROM credential_uploads WHERE nurse_id = ${nurseId} AND status = 'pending'`)
                )
                .chain(() =>
                  tx.execute(sql`INSERT INTO credential_uploads
                    (id, nurse_id, expires_on, status, content_type, file_name, byte_size, document)
                    VALUES (${id}, ${nurseId}, ${expiresOn.pretty()}, 'pending', ${type}, ${fileName(request)},
                      ${bytes.byteLength}, ${Buffer.from(bytes)})`)
                )
                .chain(() =>
                  audit(tx, {
                    actorId: nurseId,
                    action: "credential.uploaded",
                    recordId: id,
                    reason: null,
                    previousNurseId: null,
                  })
                )
                // FR-7.4: credentials.expires_on is untouched; only Admin approval writes it.
                .chain(() => credentialSummary(tx, nurseId))
            )
            .bimap(fromDb, (summary) => json(201, s.encode(api.uploadCredential.response, summary)))
        })
      )
    )
  )
}
