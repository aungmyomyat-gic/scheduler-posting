"use client";

import { ErrorFeedback } from "@/components/feedback";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <ErrorFeedback error={null} retry={reset} />;
}
