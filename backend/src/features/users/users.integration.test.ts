import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase } from "../../lib/database.js";
import { createUsersService } from "./users.service.js";
import { createUserSchema } from "../../contracts/user.js";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Set TEST_DATABASE_URL to a migrated, disposable PostgreSQL database.");
function databaseIdentity(connection: string) {
  const parsed = new URL(connection);
  return `${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
}
if (
  process.env.DATABASE_URL &&
  databaseIdentity(url) === databaseIdentity(process.env.DATABASE_URL)
) {
  throw new Error("TEST_DATABASE_URL must use a different database from DATABASE_URL.");
}
const database = createDatabase(url);
const service = createUsersService(database);
const email = `integration-${randomUUID()}@example.com`;
const input = createUserSchema.parse({ displayName: "Integration Example", email });
const paginationMarker = randomUUID();
const paginationEmails = [1, 2].map(
  (number) => `pagination-${paginationMarker}-${number}@example.com`,
);

beforeAll(async () => {
  await database.$connect();
});
afterAll(async () => {
  try {
    await database.user.deleteMany({ where: { email: { in: [email, ...paginationEmails] } } });
  } finally {
    await database.$disconnect();
  }
});

describe("PostgreSQL users service", () => {
  it("persists, searches, updates, enforces uniqueness, and deletes", async () => {
    const user = await service.create(input);
    expect(user.email).toBe(email);
    const secondConnection = createDatabase(url);
    try {
      expect((await createUsersService(secondConnection).get(user.id)).id).toBe(user.id);
    } finally {
      await secondConnection.$disconnect();
    }
    const results = await service.list({ q: email.toUpperCase(), page: 1, pageSize: 10 });
    expect(results.users.map((item) => item.id)).toContain(user.id);
    expect(results.pagination.total).toBe(1);
    expect((await service.update(user.id, { displayName: "Updated Example" })).displayName).toBe(
      "Updated Example",
    );
    await expect(service.create(input)).rejects.toMatchObject({ code: "P2002" });
    expect(await service.remove(user.id)).toEqual({ id: user.id });
    await expect(service.get(user.id)).rejects.toMatchObject({ status: 404 });
  });
  it("returns stable, distinct pages and accurate filtered totals", async () => {
    for (const email of paginationEmails) {
      await service.create({ displayName: "Pagination Example", email });
    }
    const first = await service.list({ q: paginationMarker, page: 1, pageSize: 1 });
    const second = await service.list({ q: paginationMarker, page: 2, pageSize: 1 });
    const empty = await service.list({ q: paginationMarker, page: 3, pageSize: 1 });
    expect(first.pagination).toEqual({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
    expect(first.users).toHaveLength(1);
    expect(second.users).toHaveLength(1);
    expect(first.users[0]?.id).not.toBe(second.users[0]?.id);
    expect(empty.users).toEqual([]);
    expect(empty.pagination.total).toBe(2);
  });
});
