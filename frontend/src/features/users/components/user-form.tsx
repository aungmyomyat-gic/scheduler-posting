"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentSkeleton, ErrorFeedback } from "@/components/feedback";
import { ApiError } from "@/lib/api-client";
import { createUserSchema, type CreateUserInput, type User } from "../schemas/user";
import { useCreateUser, useUpdateUser, useUser } from "../hooks/use-users";

function UserFields({ user }: { user?: User }) {
  const router = useRouter();
  const create = useCreateUser();
  const update = useUpdateUser(user?.id ?? "");
  const mutation = user ? update : create;
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { displayName: user?.displayName ?? "", email: user?.email ?? "" },
  });

  async function submit(values: CreateUserInput) {
    form.clearErrors();
    try {
      const response = await mutation.mutateAsync(values);
      router.push(`/users/${response.data.id}?notice=${user ? "updated" : "created"}`);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const field of ["displayName", "email"] as const) {
          const messages = error.fieldErrors?.[field];
          if (messages?.length)
            form.setError(
              field,
              { type: "server", message: messages.join(" ") },
              { shouldFocus: true },
            );
        }
      }
      // Keep all entered values after a server error.
    }
  }

  return (
    <Card className="max-w-2xl gap-6 shadow-none">
      <CardHeader className="border-b pb-6">
        <CardTitle className="text-lg">User information</CardTitle>
        <p className="text-sm text-muted-foreground">
          Both fields are required. Use a fictional email for this sample.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-6">
          {mutation.isError && <ErrorFeedback error={mutation.error} />}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              autoComplete="name"
              maxLength={80}
              disabled={mutation.isPending}
              aria-invalid={!!form.formState.errors.displayName}
              aria-describedby={
                form.formState.errors.displayName ? "displayName-error" : "displayName-help"
              }
              {...form.register("displayName")}
            />
            <p id="displayName-help" className="text-xs text-muted-foreground">
              The name shown in the users directory. 2–80 characters.
            </p>
            {form.formState.errors.displayName && (
              <p id="displayName-error" role="alert" className="text-sm text-destructive">
                {form.formState.errors.displayName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              disabled={mutation.isPending}
              aria-invalid={!!form.formState.errors.email}
              aria-describedby={form.formState.errors.email ? "email-error" : "email-help"}
              {...form.register("email")}
            />
            <p id="email-help" className="text-xs text-muted-foreground">
              Each user needs a unique email address.
            </p>
            {form.formState.errors.email && (
              <p id="email-error" role="alert" className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 border-t pt-6">
            <Button asChild variant="outline" disabled={mutation.isPending}>
              <Link
                href={user ? `/users/${user.id}` : "/users"}
                aria-disabled={mutation.isPending}
                tabIndex={mutation.isPending ? -1 : undefined}
                onClick={(event) => {
                  if (mutation.isPending) event.preventDefault();
                }}
              >
                Cancel
              </Link>
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  {user ? "Save changes" : "Create user"}
                  <ArrowRight />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function CreateUserForm() {
  return <UserFields />;
}

export function EditUserForm({ id }: { id: string }) {
  const result = useUser(id);
  if (result.isPending) return <ContentSkeleton />;
  if (result.isError)
    return <ErrorFeedback error={result.error} retry={() => void result.refetch()} />;
  return <UserFields key={result.data.data.id} user={result.data.data} />;
}
