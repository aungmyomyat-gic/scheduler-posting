import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { CreateUserForm } from "@/features/users/components/user-form";

export const metadata: Metadata = { title: "Create user" };
export default function NewUserPage() {
  return (
    <div className="space-y-7">
      <Link
        href="/users"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Back to users
      </Link>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Create a user</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add someone new to the directory.</p>
      </div>
      <CreateUserForm />
    </div>
  );
}
