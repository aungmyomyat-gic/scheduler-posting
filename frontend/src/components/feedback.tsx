import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";

export function ErrorFeedback({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle />
      <AlertTitle>
        {error instanceof ApiError && error.status === 404
          ? "We couldn’t find that user"
          : "Something needs your attention"}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          {error instanceof ApiError
            ? error.message
            : "Unable to complete the request. Please try again."}
        </p>
        {error instanceof ApiError && error.requestId && (
          <p className="break-all text-xs">Reference: {error.requestId}</p>
        )}
        {retry && (
          <Button variant="outline" size="sm" onClick={retry}>
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function SuccessFeedback({ message }: { message: string }) {
  return (
    <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900" role="status">
      <CheckCircle2 />
      <AlertTitle>All done</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function ContentSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className="space-y-4 rounded-xl border bg-card p-6"
    >
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-1/3" />
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-14 w-full" />
      ))}
    </div>
  );
}
