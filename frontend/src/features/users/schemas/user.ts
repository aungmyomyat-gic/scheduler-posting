import { z } from "zod";
import { successResponseSchema } from "@/lib/api-contract";

const displayNameSchema = z.string().trim().min(2, "Use at least 2 characters.").max(80);
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address.").max(254));
export const createUserSchema = z.strictObject({
  displayName: displayNameSchema,
  email: emailSchema,
});
export const updateUserSchema = createUserSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update.");
export const userIdParamsSchema = z.strictObject({ id: z.uuid("Enter a valid user ID.") });
export const userListQuerySchema = z.strictObject({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
export const userSchema = z.strictObject({
  id: z.uuid(),
  displayName: z.string().min(2).max(80),
  email: z.email().max(254),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const userResponseSchema = successResponseSchema(userSchema);
export const userListResponseSchema = successResponseSchema(z.array(userSchema)).refine(
  (response) => response.meta.pagination !== undefined,
  "List responses require pagination.",
);
export const deleteUserResponseSchema = successResponseSchema(z.strictObject({ id: z.uuid() }));
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
