import { apiRequest } from "@/lib/api-client";
import {
  createUserSchema,
  updateUserSchema,
  userResponseSchema,
  userListResponseSchema,
  deleteUserResponseSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserListQuery,
} from "../schemas/user";

export function getUsers(query: UserListQuery, signal?: AbortSignal) {
  const search = new URLSearchParams({
    q: query.q,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  return apiRequest(`/users?${search}`, userListResponseSchema, { signal });
}
export function getUser(id: string, signal?: AbortSignal) {
  return apiRequest(`/users/${encodeURIComponent(id)}`, userResponseSchema, { signal });
}
export function createUser(input: CreateUserInput) {
  return apiRequest("/users", userResponseSchema, {
    method: "POST",
    body: JSON.stringify(createUserSchema.parse(input)),
  });
}
export function updateUser(id: string, input: UpdateUserInput) {
  return apiRequest(`/users/${encodeURIComponent(id)}`, userResponseSchema, {
    method: "PATCH",
    body: JSON.stringify(updateUserSchema.parse(input)),
  });
}
export function deleteUser(id: string) {
  return apiRequest(`/users/${encodeURIComponent(id)}`, deleteUserResponseSchema, {
    method: "DELETE",
  });
}
