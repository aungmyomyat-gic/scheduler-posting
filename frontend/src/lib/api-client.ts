import { z } from "zod";
import { errorResponseSchema, type ApiErrorCode } from "./api-contract";

type ClientErrorCode =
  ApiErrorCode | "NETWORK_ERROR" | "INVALID_RESPONSE" | "CONFIG_ERROR" | "HTTP_ERROR";

function isAbortError(error: unknown) {
  // DOMException can come from a different realm and need not extend this realm's Error.
  return (
    typeof error === "object" && error !== null && "name" in error && error.name === "AbortError"
  );
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ClientErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T extends z.ZodType>(
  path: string,
  schema: T,
  options: RequestInit = {},
): Promise<z.output<T>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) throw new ApiError(0, "CONFIG_ERROR", "The API URL is not configured.");
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Cannot reach the API. Check that the backend is running.",
    );
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(
      response.status || 502,
      "INVALID_RESPONSE",
      "The API returned an unexpected response.",
      undefined,
      response.headers.get("X-Request-ID") ?? undefined,
    );
  }
  if (!response.ok) {
    const result = errorResponseSchema.safeParse(body);
    if (result.success) {
      const { message, error, meta } = result.data;
      throw new ApiError(response.status, error.code, message, error.fieldErrors, meta.requestId);
    }
    throw new ApiError(
      response.status,
      "HTTP_ERROR",
      `Request failed (${response.status}). Please try again.`,
    );
  }
  const result = schema.safeParse(body);
  if (!result.success)
    throw new ApiError(
      502,
      "INVALID_RESPONSE",
      "The API response did not match the expected contract.",
    );
  return result.data;
}
