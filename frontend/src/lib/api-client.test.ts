import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiRequest, ApiError } from "./api-client";
import { successResponseSchema } from "./api-contract";
import fixtures from "../../../docs/contract-fixtures.json";

const schema = successResponseSchema(z.strictObject({ value: z.string() }));
afterEach(() => vi.restoreAllMocks());

describe("typed API client", () => {
  it("validates a successful response and sends JSON through the configured URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1/");
    const body = {
      success: true,
      message: "OK",
      data: { value: "hello" },
      meta: { requestId: "test" },
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(body));
    vi.stubGlobal("fetch", fetchMock);
    expect(await apiRequest("/example", schema, { method: "POST", body: "{}" })).toEqual(body);
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("http://localhost:4000/api/v1/example");
    expect(options.headers.get("Content-Type")).toBe("application/json");
  });
  it("preserves structured server errors and the request ID", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(fixtures.error, { status: 422 })),
    );
    await expect(apiRequest("/users", schema)).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      fieldErrors: fixtures.error.error.fieldErrors,
      requestId: "example-request-id",
    });
  });
  it("distinguishes network failure", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("private network details")));
    await expect(apiRequest("/users", schema)).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    });
  });
  it("does not wrap request cancellation", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
    const aborted = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(aborted));
    await expect(apiRequest("/users", schema)).rejects.toBe(aborted);
  });
  it("rejects malformed JSON and mismatched success contracts", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("<html>bad gateway</html>", { status: 502 }))
      .mockResolvedValueOnce(Response.json({ success: true, data: "wrong" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiRequest("/users", schema)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(apiRequest("/users", schema)).rejects.toMatchObject({
      status: 502,
      code: "INVALID_RESPONSE",
    });
  });
  it("never displays an unvalidated HTTP error payload", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ message: "secret stack trace" }, { status: 500 })),
    );
    await expect(apiRequest("/users", schema)).rejects.toMatchObject({
      code: "HTTP_ERROR",
      message: "Request failed (500). Please try again.",
    });
  });
  it("reports missing configuration before requesting", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiRequest("/users", schema)).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
