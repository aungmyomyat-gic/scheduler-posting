import { z } from "zod";

// Transport contract mirrored from backend/src/contracts/api-response.ts.
// Both applications validate the same fixtures in docs/contract-fixtures.json.
export const apiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "VALIDATION_ERROR",
  "INTERNAL_ERROR",
]);
export const paginationSchema = z.strictObject({
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
const requestMetaSchema = z.strictObject({ requestId: z.string().min(1).max(100) });
export const errorResponseSchema = z.strictObject({
  success: z.literal(false),
  message: z.string().min(1),
  error: z.strictObject({
    code: apiErrorCodeSchema,
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  }),
  meta: requestMetaSchema,
});
export function successResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.strictObject({
    success: z.literal(true),
    message: z.string().min(1),
    data: dataSchema,
    meta: requestMetaSchema.extend({ pagination: paginationSchema.optional() }),
  });
}
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
