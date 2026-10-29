import { writeFileSync } from "node:fs";
import { z } from "zod";
import { errorResponseSchema } from "../src/contracts/api-response.js";
import {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
  userResponseSchema,
  userListResponseSchema,
  deleteUserResponseSchema,
  healthResponseSchema,
} from "../src/contracts/user.js";

const schemas = {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
  userResponseSchema,
  userListResponseSchema,
  deleteUserResponseSchema,
  healthResponseSchema,
  errorResponseSchema,
};
const output = Object.fromEntries(
  Object.entries(schemas).map(([name, schema]) => [name, z.toJSONSchema(schema, { io: "input" })]),
);
writeFileSync(
  new URL("../../docs/api-schemas.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.info("Exported API JSON schemas. Review this diff and run tests in both projects.");
