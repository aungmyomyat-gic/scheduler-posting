"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorFeedback } from "@/components/feedback";
import { getHealth } from "../api/health";

export function ConnectionCheck() {
  const result = useQuery({
    queryKey: ["system", "health"],
    queryFn: ({ signal }) => getHealth(signal),
    enabled: false,
    retry: false,
  });
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
            <Activity className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">API connection</h2>
            <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
              {result.isFetching
                ? "Checking…"
                : result.isError
                  ? "Connection check failed"
                  : result.isSuccess
                    ? "Express is reachable. Database connectivity is checked by user requests."
                    : "Check whether your Express server is running."}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void result.refetch()}
          disabled={result.isFetching}
        >
          Check connection
        </Button>
      </div>
      {result.isError && <ErrorFeedback error={result.error} />}
      {result.isSuccess && !result.isFetching && (
        <p
          role="status"
          className="break-all rounded-md bg-background p-3 font-mono text-xs text-muted-foreground"
        >
          {result.data.message} Reference: {result.data.meta.requestId}
        </p>
      )}
    </section>
  );
}
