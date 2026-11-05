export { Id }

import * as s from "@lib/json/schema"
import { createId } from "@paralleldrive/cuid2"
import { sha256 } from "js-sha256"
import { type Result, Success, Failure } from "@lib/result"

type Schema<T> = s.Schema<T>

const ID_LENGTH = 50

/**
 * A reusable, nominally-tagged entity id. `Tag` is a phantom string literal
 * (e.g. "Workspace", "Event") — never assigned, only used to keep `Id<"Workspace">`
 * and `Id<"Event">` from being assignable to one another.
 */
class Id<Tag extends string> {
  declare private readonly _tag: Tag
  readonly value: string
  constructor(value: string) {
    this.value = value
  }

  static random<Tag extends string>(): Id<Tag> {
    return new Id(createId())
  }

  /** Derive an id for `aggregateClass` from `seed`, so replays produce the same id every time. */
  static deterministicForAggregate<Tag extends string>(
    aggregateClass: { readonly type: Tag },
    seed: string
  ): Result<string, Id<Tag>> {
    return deterministic<Tag>(`${aggregateClass.type}:${seed}`)
  }

  /** Same as `deterministicForAggregate`, for event ids. */
  static deterministicForEvent(eventClass: { type: string }, seed: string): Result<string, Id<"Event">> {
    return deterministic<"Event">(`${eventClass.type}:${seed}`)
  }

  static schema<Tag extends string>(): Schema<Id<Tag>> {
    return s.string.dimap(
      (v) => new Id<Tag>(v),
      (id) => id.value
    )
  }

  /** Lexicographic ordering on the id string. */
  compare(other: Id<Tag>): -1 | 0 | 1 {
    return (
      this.value > other.value ? 1
      : this.value === other.value ? 0
      : -1
    )
  }
}

/**
 * Deterministically derive an id from a seed. Fails on an empty seed instead
 * of throwing — callers decide how to report a programmer error upstream.
 */
function deterministic<Tag extends string>(seed: string): Result<string, Id<Tag>> {
  if (seed.trim() === "") {
    return Failure("Seed cannot be empty")
  }

  // js-sha256 returns a hex string
  const hashHex = sha256(seed)
  const bigIntValue = BigInt("0x" + hashHex)
  const encoded = bigIntValue.toString(36)

  return Success(new Id<Tag>(encoded.padStart(ID_LENGTH, "0")))
}
