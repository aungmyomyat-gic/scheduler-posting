"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ContentSkeleton, ErrorFeedback, SuccessFeedback } from "@/components/feedback";
import { useUser, useDeleteUser } from "../hooks/use-users";

export function UserDetail({ id, notice }: { id: string; notice?: "created" | "updated" }) {
  const router = useRouter();
  const result = useUser(id);
  const remove = useDeleteUser();
  if (result.isPending) return <ContentSkeleton />;
  if (result.isError)
    return <ErrorFeedback error={result.error} retry={() => void result.refetch()} />;
  const user = result.data.data;

  return (
    <div className="max-w-3xl space-y-5">
      {notice && <SuccessFeedback message={`The user was ${notice}.`} />}
      <Card className="gap-6 shadow-none">
        <CardHeader className="flex-row items-center justify-between gap-4 border-b pb-6">
          <div className="flex min-w-0 items-center gap-4">
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary font-semibold text-primary"
            >
              {user.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <CardTitle className="break-words text-xl">
                <h2>{user.displayName}</h2>
              </CardTitle>
              <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/users/${id}/edit`}>
              <Pencil />
              Edit
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {[
              ["User ID", user.id],
              ["Email address", user.email],
              ["Created (UTC)", user.createdAt.replace("T", " ").replace("Z", "")],
              ["Last updated (UTC)", user.updatedAt.replace("T", " ").replace("Z", "")],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-2 break-all text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-6">
        <div>
          <h2 className="text-sm font-semibold">Delete this user</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Permanently remove this record from the directory.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-destructive">
              <Trash2 />
              Delete user
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {user.displayName}?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the user. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {remove.isError && <ErrorFeedback error={remove.error} />}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>Keep user</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={remove.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  remove.mutate(id, { onSuccess: () => router.replace("/users?notice=deleted") });
                }}
              >
                {remove.isPending ? "Deleting…" : "Confirm deletion"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
