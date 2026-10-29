import { z } from "zod";
import { successResponseSchema } from "./api-response.js";

export const healthDataSchema = z.strictObject({ status: z.literal("ok") });
export const healthResponseSchema = successResponseSchema(healthDataSchema);
