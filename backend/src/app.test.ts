import { createServer, type Server } from "node:http";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fixtures from "../../docs/contract-fixtures.json" with { type: "json" };
import { createApp } from "./app.js";
import { AppError } from "./lib/app-error.js";
import { Prisma } from "./generated/prisma/client.js";
import { errorResponseSchema } from "./contracts/api-response.js";
import {
  userResponseSchema,
  userListResponseSchema,
  deleteUserResponseSchema,
  healthResponseSchema,
} from "./contracts/user.js";
import type { UsersService } from "./features/users/users.service.js";

const service: UsersService = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer(
    createApp({ usersService: service, frontendOrigin: "http://localhost:3000" }),
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
});
beforeEach(() => {
  vi.mocked(service.list).mockResolvedValue({
    users: [fixtures.user],
    pagination: fixtures.pagination,
  });
  vi.mocked(service.get).mockResolvedValue(fixtures.user);
  vi.mocked(service.create).mockResolvedValue(fixtures.user);
  vi.mocked(service.update).mockResolvedValue(fixtures.user);
  vi.mocked(service.remove).mockResolvedValue({ id: fixtures.user.id });
});
afterEach(() => {
  vi.resetAllMocks();
});

async function request(path: string, options?: RequestInit) {
  return fetch(`${baseUrl}${path}`, options);
}
function jsonBody(value: unknown, method = "POST"): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) };
}

describe("global API responses", () => {
  it("returns health with a generated request ID and no database call", async () => {
    const response = await request("/api/v1/health");
    const body = healthResponseSchema.parse(await response.json());
    expect(response.status).toBe(200);
    expect(body.meta.requestId).toBe(response.headers.get("X-Request-ID"));
    expect(service.list).not.toHaveBeenCalled();
  });
  it("lists users with pagination and parsed query parameters", async () => {
    const response = await request("/api/v1/users?q=Alex&page=1&pageSize=10");
    expect(userListResponseSchema.parse(await response.json()).data).toEqual([fixtures.user]);
    expect(service.list).toHaveBeenCalledWith({ q: "Alex", page: 1, pageSize: 10 });
  });
  it("creates a normalized user and returns 201", async () => {
    const response = await request(
      "/api/v1/users",
      jsonBody({ displayName: " Alex Morgan ", email: " ALEX@EXAMPLE.COM " }),
    );
    expect(response.status).toBe(201);
    expect(userResponseSchema.parse(await response.json()).data.id).toBe(fixtures.user.id);
    expect(service.create).toHaveBeenCalledWith({
      displayName: "Alex Morgan",
      email: "alex@example.com",
    });
  });
  it("gets, updates, and deletes a user with JSON envelopes", async () => {
    const detail = await request(`/api/v1/users/${fixtures.user.id}`);
    expect(userResponseSchema.parse(await detail.json()).success).toBe(true);
    const update = await request(
      `/api/v1/users/${fixtures.user.id}`,
      jsonBody({ displayName: "Alex Morgan" }, "PATCH"),
    );
    expect(update.status).toBe(200);
    expect(userResponseSchema.parse(await update.json()).success).toBe(true);
    const remove = await request(`/api/v1/users/${fixtures.user.id}`, { method: "DELETE" });
    expect(remove.status).toBe(200);
    expect(deleteUserResponseSchema.parse(await remove.json()).data.id).toBe(fixtures.user.id);
  });
  it("returns 422 with field errors without calling the service", async () => {
    const response = await request("/api/v1/users", jsonBody({ displayName: "A", email: "bad" }));
    const body = errorResponseSchema.parse(await response.json());
    expect(response.status).toBe(422);
    expect(body.error.fieldErrors?.email).toBeDefined();
    expect(service.create).not.toHaveBeenCalled();
  });
  it.each(["/api/v1/users?page=0", "/api/v1/users/not-a-uuid"])(
    "rejects invalid query or ID: %s",
    async (path) => {
      const response = await request(path);
      expect(response.status).toBe(422);
      expect(errorResponseSchema.parse(await response.json()).error.code).toBe("VALIDATION_ERROR");
    },
  );
  it("rejects empty updates", async () => {
    const response = await request(`/api/v1/users/${fixtures.user.id}`, jsonBody({}, "PATCH"));
    expect(response.status).toBe(422);
    expect(service.update).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON with the standard 400 envelope", async () => {
    const response = await request("/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(response.status).toBe(400);
    expect(errorResponseSchema.parse(await response.json()).error.code).toBe("BAD_REQUEST");
  });
  it("rejects oversized bodies with a JSON envelope", async () => {
    const response = await request(
      "/api/v1/users",
      jsonBody({ displayName: "x".repeat(20_000), email: "a@example.com" }),
    );
    expect(response.status).toBe(413);
    expect(errorResponseSchema.parse(await response.json()).error.code).toBe("BAD_REQUEST");
  });
  it("returns a consistent 404 for unknown routes", async () => {
    const response = await request("/missing");
    expect(response.status).toBe(404);
    expect(errorResponseSchema.parse(await response.json()).error.code).toBe("NOT_FOUND");
  });
  it.each([401, 403, 404] as const)("preserves typed application errors (%i)", async (status) => {
    const code = status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : "NOT_FOUND";
    vi.mocked(service.get).mockRejectedValueOnce(new AppError(status, code, "Request rejected."));
    const response = await request(`/api/v1/users/${fixtures.user.id}`);
    expect(response.status).toBe(status);
    expect(errorResponseSchema.parse(await response.json()).error.code).toBe(code);
  });
  it("maps a Prisma unique constraint to 409 with an email field error", async () => {
    vi.mocked(service.create).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("sensitive database details", {
        code: "P2002",
        clientVersion: "7",
      }),
    );
    const response = await request(
      "/api/v1/users",
      jsonBody({ displayName: "Alex Morgan", email: "alex@example.com" }),
    );
    const body = errorResponseSchema.parse(await response.json());
    expect(response.status).toBe(409);
    expect(body.error.fieldErrors?.email).toEqual(["This email is already in use."]);
    expect(JSON.stringify(body)).not.toContain("sensitive");
  });
  it("maps missing Prisma records to 404", async () => {
    vi.mocked(service.remove).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("missing", { code: "P2025", clientVersion: "7" }),
    );
    const response = await request(`/api/v1/users/${fixtures.user.id}`, { method: "DELETE" });
    expect(response.status).toBe(404);
  });
  it("hides unexpected exception details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(service.list).mockRejectedValueOnce(new Error("secret-password"));
    const response = await request("/api/v1/users");
    const body = errorResponseSchema.parse(await response.json());
    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("secret-password");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-password");
    log.mockRestore();
  });
  it("treats invalid service output as a server error, not invalid user input", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(service.get).mockResolvedValueOnce({ ...fixtures.user, createdAt: "invalid" });
    const response = await request(`/api/v1/users/${fixtures.user.id}`);
    expect(response.status).toBe(500);
    expect(errorResponseSchema.parse(await response.json()).error.code).toBe("INTERNAL_ERROR");
    log.mockRestore();
  });
  it("allows only the configured browser origin", async () => {
    const allowed = await request("/api/v1/health", {
      headers: { Origin: "http://localhost:3000" },
    });
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    const denied = await request("/api/v1/health", {
      headers: { Origin: "https://untrusted.example" },
    });
    expect(denied.status).toBe(403);
    expect(errorResponseSchema.parse(await denied.json()).error.code).toBe("FORBIDDEN");
  });
});
