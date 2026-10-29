import { describe, expect, it } from "vitest";
import fixtures from "../../../docs/contract-fixtures.json" with { type: "json" };
import schemas from "../../../docs/api-schemas.json" with { type: "json" };
import { z } from "zod";
import { errorResponseSchema } from "./api-response.js";
import { healthResponseSchema } from "./health.js";
import {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
  userResponseSchema,
  userListResponseSchema,
  deleteUserResponseSchema,
} from "./user.js";

describe("approved transport fixtures", () => {
  it("matches the reviewed JSON schema contract", () => {
    const backendSchemas = {
      createUserSchema,
      updateUserSchema,
      userListQuerySchema,
      userResponseSchema,
      userListResponseSchema,
      deleteUserResponseSchema,
      healthResponseSchema,
      errorResponseSchema,
    };
    expect(
      Object.fromEntries(
        Object.entries(backendSchemas).map(([name, schema]) => [
          name,
          z.toJSONSchema(schema, { io: "input" }),
        ]),
      ),
    ).toEqual(schemas);
  });
  it.each(fixtures.validCreate)("accepts valid create input %#", (value) => {
    expect(createUserSchema.safeParse(value).success).toBe(true);
  });
  it.each(fixtures.invalidCreate)("rejects invalid create input %#", (value) => {
    expect(createUserSchema.safeParse(value).success).toBe(false);
  });
  it.each(fixtures.validUpdate)("accepts partial updates %#", (value) => {
    expect(updateUserSchema.safeParse(value).success).toBe(true);
  });
  it.each(fixtures.invalidUpdate)("rejects invalid updates %#", (value) => {
    expect(updateUserSchema.safeParse(value).success).toBe(false);
  });
  it.each(fixtures.validQuery)("accepts valid queries %#", (value) => {
    expect(userListQuerySchema.safeParse(value).success).toBe(true);
  });
  it.each(fixtures.invalidQuery)("rejects invalid queries %#", (value) => {
    expect(userListQuerySchema.safeParse(value).success).toBe(false);
  });
  it("normalizes names and emails", () => {
    expect(createUserSchema.parse({ displayName: " Jo ", email: " JO@EXAMPLE.COM " })).toEqual({
      displayName: "Jo",
      email: "jo@example.com",
    });
  });
  it("validates envelopes and requires list pagination", () => {
    const envelope = {
      success: true,
      message: "User retrieved.",
      data: fixtures.user,
      meta: { requestId: "example-request-id" },
    };
    expect(userResponseSchema.safeParse(envelope).success).toBe(true);
    expect(userListResponseSchema.safeParse({ ...envelope, data: [fixtures.user] }).success).toBe(
      false,
    );
    expect(
      userListResponseSchema.safeParse({
        ...envelope,
        data: [fixtures.user],
        meta: { ...envelope.meta, pagination: fixtures.pagination },
      }).success,
    ).toBe(true);
    expect(errorResponseSchema.safeParse(fixtures.error).success).toBe(true);
    expect(
      errorResponseSchema.safeParse({ ...fixtures.error, error: { code: "UNKNOWN" } }).success,
    ).toBe(false);
  });
  it("enforces field lengths at the boundary", () => {
    expect(
      createUserSchema.safeParse({ displayName: "x".repeat(81), email: "a@example.com" }).success,
    ).toBe(false);
    expect(
      createUserSchema.safeParse({ displayName: "x".repeat(80), email: "a@example.com" }).success,
    ).toBe(true);
  });
});
