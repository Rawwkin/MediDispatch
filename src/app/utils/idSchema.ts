import { z } from "zod";

/**
 * Identifier validator for Prisma `@id String` columns.
 *
 * Replaces `z.string().uuid(...)` everywhere. The schema column is a
 * plain `String`, not a UUID-typed column, so we accept:
 *   - UUIDs (e.g. `f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
 *   - CUIDs (e.g. `cklq2c0xa0000abcd12345678`)
 *   - ULIDs (e.g. `01HXYZ...`)
 *   - Seed-style IDs (e.g. `SEED-AMB-001`, `seed-hospital-+15555550100`)
 *
 * We only guarantee a non-empty, trimmed, sane-character payload. Whether
 * the ID actually resolves to a row is the database's job.
 */
export const objectIdSchema = z
  .string({ required_error: "Invalid id", invalid_type_error: "Invalid id" })
  .trim()
  .min(1, "Invalid id")
  .max(64, "Invalid id")
  .regex(/^[A-Za-z0-9_+\-:.@]+$/, "Invalid id");

export type ObjectId = z.infer<typeof objectIdSchema>;