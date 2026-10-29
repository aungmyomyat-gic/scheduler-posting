import type { Metadata } from "next";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConnectionCheck } from "@/features/system/components/connection-check";

export const metadata: Metadata = { title: "API reference" };
const success = {
  success: true,
  message: "User created.",
  data: {
    id: "d9428888-122b-4b7b-9300-987654321000",
    displayName: "Alex Morgan",
    email: "alex@example.com",
    createdAt: "2026-10-29T00:00:00.000Z",
    updatedAt: "2026-10-29T00:00:00.000Z",
  },
  meta: { requestId: "example-request-id" },
};
const failure = {
  success: false,
  message: "Please check the highlighted fields.",
  error: { code: "VALIDATION_ERROR", fieldErrors: { email: ["Enter a valid email address."] } },
  meta: { requestId: "example-request-id" },
};
const endpoints = [
  ["GET", "/health", "API liveness"],
  ["GET", "/users", "Search and paginate users"],
  ["GET", "/users/:id", "Retrieve a user"],
  ["POST", "/users", "Create a user"],
  ["PATCH", "/users/:id", "Update a user"],
  ["DELETE", "/users/:id", "Delete a user; returns 200 with its ID"],
];

export default function ResponsesPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-primary">
          Example 02 / The frontend–backend agreement
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Predictable by design</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Every JSON endpoint uses the same envelope. HTTP status tells you the outcome; the body
          gives you typed data or a useful error.
        </p>
      </div>
      <ConnectionCheck />
      <div className="grid gap-5 xl:grid-cols-2">
        {[
          {
            title: "A successful request",
            status: "201 CREATED",
            icon: CheckCircle2,
            body: success,
          },
          {
            title: "An input validation error",
            status: "422 UNPROCESSABLE CONTENT",
            icon: CircleAlert,
            body: failure,
          },
        ].map(({ title, status, icon: Icon, body }) => (
          <section key={status} className="min-w-0 overflow-hidden rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="size-4 text-primary" />
                {title}
              </h2>
              <Badge variant="secondary" className="text-[10px]">
                {status}
              </Badge>
            </div>
            <pre className="overflow-x-auto bg-[#202334] p-5 font-mono text-[11px] leading-6 text-violet-100">
              <code>{JSON.stringify(body, null, 2)}</code>
            </pre>
          </section>
        ))}
      </div>
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-5">
          <h2 className="text-sm font-semibold">Users API</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Base path: <code>/api/v1</code> · Full request rules are in docs/api-contract.md.
          </p>
        </div>
        <ul className="divide-y">
          {endpoints.map(([method, path, description]) => (
            <li
              key={`${method}:${path}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5"
            >
              <span className="w-14 font-mono text-[11px] font-semibold text-primary">
                {method}
              </span>
              <code className="min-w-28 text-xs">{path}</code>
              <span className="text-xs text-muted-foreground sm:ml-auto">{description}</span>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs leading-6 text-muted-foreground">
        Errors use 400, 401, 403, 404, 409, 413, 422, or 500 as appropriate. This starter has no
        login or authorization flow. Request IDs help correlate failures without exposing server
        details.
      </p>
    </div>
  );
}
