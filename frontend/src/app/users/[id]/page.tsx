import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { UserDetail } from "@/features/users/components/user-detail";

export const metadata: Metadata = { title: "User details" };
export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
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
        <h1 className="text-3xl font-semibold tracking-tight">User details</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          View, update, or remove this directory record.
        </p>
      </div>
      <UserDetail
        id={id}
        notice={notice === "created" || notice === "updated" ? notice : undefined}
      />
    </div>
  );
}
