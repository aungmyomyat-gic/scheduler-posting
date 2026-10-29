import type { ErrorRequestHandler } from "express";
import { Prisma } from "../generated/prisma/client.js";
import { errorResponseSchema } from "../contracts/api-response.js";
import { AppError } from "../lib/app-error.js";

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new AppError(409, "CONFLICT", "A user with this email already exists.", {
        email: ["This email is already in use."],
      });
    }
    if (error.code === "P2025") return new AppError(404, "NOT_FOUND", "User not found.");
  }
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    return new AppError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }
  if (error instanceof URIError) return new AppError(400, "BAD_REQUEST", "Invalid URL encoding.");
  if (error instanceof Error && "type" in error && error.type === "entity.too.large") {
    return new AppError(413, "BAD_REQUEST", "Request body is too large.");
  }
  return new AppError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) return next(error);
  const normalized = normalizeError(error);
  const requestId = response.getHeader("X-Request-ID");
  if (normalized.status >= 500) {
    // Do not log request bodies, database messages, email addresses, or secrets.
    console.error({ requestId, errorName: error instanceof Error ? error.name : "UnknownError" });
  }
  response.status(normalized.status).json(
    errorResponseSchema.parse({
      success: false,
      message: normalized.message,
      error: { code: normalized.code, fieldErrors: normalized.fieldErrors },
      meta: { requestId },
    }),
  );
};
