"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContentSkeleton, ErrorFeedback, SuccessFeedback } from "@/components/feedback";
import { useUsers } from "../hooks/use-users";
import type { UserListQuery } from "../schemas/user";

export function UsersList({ query, deleted }: { query: UserListQuery; deleted: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState(query.q);
  const result = useUsers(query);
  function navigate(page: number, q = query.q) {
    const params = new URLSearchParams({ q, page: String(page), pageSize: String(query.pageSize) });
    router.push(`/users?${params}`);
  }
  const pagination = result.data?.meta.pagination;

  return (
    <div className="space-y-5">
      {deleted && <SuccessFeedback message="The user was deleted." />}
      <div className="rounded-xl border bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">All users</h2>
            {pagination && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-primary">
                {pagination.total}
              </span>
            )}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              navigate(1, search.trim());
            }}
            className="flex w-full gap-2 sm:w-auto"
          >
            <div className="relative min-w-0 flex-1">
              <Search
                className="absolute top-2.5 left-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <label htmlFor="user-search" className="sr-only">
                Search users
              </label>
              <Input
                id="user-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email…"
                maxLength={100}
                className="bg-background pl-9 sm:w-64"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </div>
        <div aria-busy={result.isFetching}>
          {result.isPending ? (
            <div className="p-5">
              <ContentSkeleton />
            </div>
          ) : result.isError ? (
            <div className="p-5">
              <ErrorFeedback error={result.error} retry={() => void result.refetch()} />
            </div>
          ) : result.data.data.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Users className="size-6" />
              </span>
              <h3 className="font-semibold">
                {query.q ? "No matching users" : "Your first user starts here"}
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {query.q
                  ? "Try another name or email, or clear your search."
                  : pagination && pagination.total > 0
                    ? "There are no users on this page. Go back to the first page."
                    : "Add a user to see the complete list, detail, and edit flow in action."}
              </p>
              {query.q || query.page > 1 ? (
                <Button
                  variant="outline"
                  className="mt-5"
                  onClick={() => {
                    setSearch("");
                    navigate(1, "");
                  }}
                >
                  Show all users
                </Button>
              ) : (
                <Button asChild className="mt-5">
                  <Link href="/users/new">
                    <Plus />
                    Add your first user
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table className="table-fixed lg:table-auto">
              <TableHeader>
                <TableRow className="bg-background/70 hover:bg-background/70">
                  <TableHead className="pl-5 text-xs">Name</TableHead>
                  <TableHead className="hidden text-xs lg:table-cell">Email address</TableHead>
                  <TableHead className="hidden text-xs xl:table-cell">Created</TableHead>
                  <TableHead className="w-28 pr-5 text-right text-xs">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="py-4 pl-5 whitespace-normal">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary"
                        >
                          {user.displayName
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((name) => name[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <Link
                            className="block break-all font-medium hover:text-primary hover:underline"
                            href={`/users/${user.id}`}
                          >
                            {user.displayName}
                          </Link>
                          <p className="mt-1 break-all text-xs text-muted-foreground lg:hidden">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {user.email}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">
                      {user.createdAt.slice(0, 10)}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/users/${user.id}`} aria-label={`View ${user.displayName}`}>
                          View <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        {pagination && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {pagination.total === 0
                ? "0 users"
                : `Page ${pagination.page} of ${Math.max(1, pagination.totalPages)} · ${pagination.total} users`}
              {result.isFetching && " · Updating…"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={query.page <= 1 || result.isPlaceholderData}
                onClick={() => navigate(query.page - 1)}
              >
                <ChevronLeft />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={query.page >= pagination.totalPages || result.isPlaceholderData}
                onClick={() => navigate(query.page + 1)}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>
      <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
        Changes are saved through the Express API. Refreshing this page keeps your data.
      </p>
    </div>
  );
}
