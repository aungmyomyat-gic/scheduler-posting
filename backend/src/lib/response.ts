import type { Response } from "express";
import { z } from "zod";
import { successResponseSchema, type Pagination } from "../contracts/api-response.js";

export function sendSuccess<T extends z.ZodType>(
  response: Response,
  dataSchema: T,
  data: z.input<T>,
  message: string,
  options: { status?: number; pagination?: Pagination } = {},
) {
  // A response contract failure is a server bug, never an input validation error.
  const body = successResponseSchema(dataSchema).parse({
    success: true,
    message,
    data,
    meta: { requestId: response.getHeader("X-Request-ID"), pagination: options.pagination },
  });
  return response.status(options.status ?? 200).json(body);
}
