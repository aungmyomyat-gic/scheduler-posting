import { z } from "zod";
import { apiRequest } from "@/lib/api-client";
import { successResponseSchema } from "@/lib/api-contract";

export const healthResponseSchema = successResponseSchema(
  z.strictObject({ status: z.literal("ok") }),
);
export function getHealth(signal?: AbortSignal) {
  return apiRequest("/health", healthResponseSchema, { signal });
}
