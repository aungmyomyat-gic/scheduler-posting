import type { PrismaClient, User as DatabaseUser } from "../../generated/prisma/client.js";
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserListQuery,
} from "../../contracts/user.js";
import { AppError } from "../../lib/app-error.js";

function toUser(user: DatabaseUser): User {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function createUsersService(database: PrismaClient) {
  return {
    async list(query: UserListQuery) {
      const where = query.q
        ? {
            OR: [
              { displayName: { contains: query.q, mode: "insensitive" as const } },
              { email: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {};
      const [users, total] = await database.$transaction(
        [
          database.user.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
          }),
          database.user.count({ where }),
        ],
        { isolationLevel: "RepeatableRead" },
      );
      return {
        users: users.map(toUser),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      };
    },
    async get(id: string) {
      const user = await database.user.findUnique({ where: { id } });
      if (!user) throw new AppError(404, "NOT_FOUND", "User not found.");
      return toUser(user);
    },
    async create(input: CreateUserInput) {
      return toUser(await database.user.create({ data: input }));
    },
    async update(id: string, input: UpdateUserInput) {
      return toUser(await database.user.update({ where: { id }, data: input }));
    },
    async remove(id: string) {
      const user = await database.user.delete({ where: { id }, select: { id: true } });
      return { id: user.id };
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
