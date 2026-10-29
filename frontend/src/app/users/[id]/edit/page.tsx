import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { EditUserForm } from "@/features/users/components/user-form";

export const metadata: Metadata = { title: "Edit user" };
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-7">
      <Link
        href={`/users/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Back to user
      </Link>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit user</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Make your changes, then save when you’re ready.
        </p>
      </div>
      <EditUserForm id={id} />
    </div>
  );
}
