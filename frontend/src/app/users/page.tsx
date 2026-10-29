import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UsersList } from "@/features/users/components/users-list";
import { userListQuerySchema } from "@/features/users/schemas/user";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = userListQuerySchema.safeParse({
    q: params.q,
    page: params.page,
    pageSize: params.pageSize,
  });
  const query = parsed.success ? parsed.data : userListQuerySchema.parse({});
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-primary">
            Example 01 / A complete feature
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A simple directory. Everything you need to practice the basics.
          </p>
        </div>
        <Button asChild>
          <Link href="/users/new">
            <Plus />
            Add user
          </Link>
        </Button>
      </div>
      <UsersList
        key={`${query.q}:${query.page}:${query.pageSize}`}
        query={query}
        deleted={params.notice === "deleted"}
      />
    </div>
  );
}
