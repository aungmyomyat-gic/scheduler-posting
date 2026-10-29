"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { createUser, deleteUser, getUser, getUsers, updateUser } from "../api/users";
import type { UpdateUserInput, UserListQuery } from "../schemas/user";

export const userKeys = {
  all: ["users"] as const,
  list: (query: UserListQuery) => ["users", "list", query] as const,
  detail: (id: string) => ["users", "detail", id] as const,
};
export function useUsers(query: UserListQuery) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: ({ signal }) => getUsers(query, signal),
    placeholderData: keepPreviousData,
  });
}
export function useUser(id: string) {
  return useQuery({ queryKey: userKeys.detail(id), queryFn: ({ signal }) => getUser(id, signal) });
}
export function useCreateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: async (response) => {
      client.setQueryData(userKeys.detail(response.data.id), response);
      await client.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
export function useUpdateUser(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => updateUser(id, input),
    onSuccess: async (response) => {
      client.setQueryData(userKeys.detail(id), response);
      await client.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
export function useDeleteUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: async (response) => {
      client.removeQueries({ queryKey: userKeys.detail(response.data.id) });
      await client.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
