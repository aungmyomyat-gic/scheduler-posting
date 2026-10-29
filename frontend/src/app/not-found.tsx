import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-sm text-muted-foreground">This page doesn’t exist in the starter.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back to overview</Link>
      </Button>
    </div>
  );
}
