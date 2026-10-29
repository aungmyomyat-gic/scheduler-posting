import type { Request, Response } from "express";
import { z } from "zod";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamsSchema,
  userListQuerySchema,
  userSchema,
} from "../../contracts/user.js";
import { parseInput } from "../../middleware/validate.js";
import { sendSuccess } from "../../lib/response.js";
import type { UsersService } from "./users.service.js";

export function createUsersController(service: UsersService) {
  return {
    async list(request: Request, response: Response) {
      const query = parseInput(userListQuerySchema, request.query);
      const result = await service.list(query);
      sendSuccess(response, z.array(userSchema), result.users, "Users retrieved.", {
        pagination: result.pagination,
      });
    },
    async get(request: Request, response: Response) {
      const { id } = parseInput(userIdParamsSchema, request.params);
      sendSuccess(response, userSchema, await service.get(id), "User retrieved.");
    },
    async create(request: Request, response: Response) {
      const input = parseInput(createUserSchema, request.body);
      sendSuccess(response, userSchema, await service.create(input), "User created.", {
        status: 201,
      });
    },
    async update(request: Request, response: Response) {
      const { id } = parseInput(userIdParamsSchema, request.params);
      const input = parseInput(updateUserSchema, request.body);
      sendSuccess(response, userSchema, await service.update(id, input), "User updated.");
    },
    async remove(request: Request, response: Response) {
      const { id } = parseInput(userIdParamsSchema, request.params);
      sendSuccess(
        response,
        z.strictObject({ id: z.uuid() }),
        await service.remove(id),
        "User deleted.",
      );
    },
  };
}
