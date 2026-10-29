import { describe, expect, it } from "vitest";
import { z } from "zod";
import fixtures from "../../../docs/contract-fixtures.json";
import schemas from "../../../docs/api-schemas.json";
import { errorResponseSchema } from "./api-contract";
import {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
  userResponseSchema,
  userListResponseSchema,
  deleteUserResponseSchema,
} from "@/features/users/schemas/user";
import { healthResponseSchema } from "@/features/system/api/health";

describe("API agreement", () => {
  it("matches every exported backend JSON schema", () => {
    const frontendSchemas = {
      createUserSchema,
      updateUserSchema,
      userListQuerySchema,
      userResponseSchema,
      userListResponseSchema,
      deleteUserResponseSchema,
      healthResponseSchema,
      errorResponseSchema,
    };
    const actual = Object.fromEntries(
      Object.entries(frontendSchemas).map(([name, schema]) => [
        name,
        z.toJSONSchema(schema, { io: "input" }),
      ]),
    );
    expect(actual).toEqual(schemas);
  });
  it.each(fixtures.validCreate)("accepts agreed create inputs %#", (value) =>
    expect(createUserSchema.safeParse(value).success).toBe(true),
  );
  it.each(fixtures.invalidCreate)("rejects agreed invalid inputs %#", (value) =>
    expect(createUserSchema.safeParse(value).success).toBe(false),
  );
  it.each(fixtures.validUpdate)("accepts agreed updates %#", (value) =>
    expect(updateUserSchema.safeParse(value).success).toBe(true),
  );
  it.each(fixtures.invalidUpdate)("rejects agreed invalid updates %#", (value) =>
    expect(updateUserSchema.safeParse(value).success).toBe(false),
  );
  it.each(fixtures.validQuery)("accepts agreed queries %#", (value) =>
    expect(userListQuerySchema.safeParse(value).success).toBe(true),
  );
  it.each(fixtures.invalidQuery)("rejects agreed invalid queries %#", (value) =>
    expect(userListQuerySchema.safeParse(value).success).toBe(false),
  );
  it("normalizes form values and requires pagination", () => {
    expect(createUserSchema.parse({ displayName: " Jo ", email: " JO@EXAMPLE.COM " })).toEqual({
      displayName: "Jo",
      email: "jo@example.com",
    });
    expect(
      userListResponseSchema.safeParse({
        success: true,
        message: "OK",
        data: [],
        meta: { requestId: "test" },
      }).success,
    ).toBe(false);
    expect(errorResponseSchema.parse(fixtures.error).error.code).toBe("VALIDATION_ERROR");
  });
});
