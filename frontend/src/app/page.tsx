import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  Code2,
  Database,
  FolderTree,
  Layers3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-primary">
          Your next project starts here
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome to Foundation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A little structure. A working example. A clear path forward.
        </p>
      </div>
      <section className="relative overflow-hidden rounded-2xl border border-violet-200/60 bg-[#eeebf8] p-7 md:p-9">
        <div className="relative z-10 max-w-xl">
          <Badge variant="outline" className="mb-5 border-violet-300/70 bg-white/50 text-primary">
            THE TEAM STARTER
          </Badge>
          <h2 className="text-3xl leading-[1.2] font-semibold tracking-tight md:text-[40px]">
            Good projects start
            <br />
            with a solid foundation.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            Explore a complete feature, understand how the pieces connect, and use the same patterns
            to build your own.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/users">
                Explore sample users <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-violet-200 bg-white/60">
              <Link href="/examples/responses">
                View API reference <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute -right-8 top-8 hidden size-72 rotate-[-15deg] items-center justify-center lg:flex"
        >
          <div className="absolute size-60 rounded-[56px] border border-violet-300/40 bg-white/25" />
          <div className="absolute size-44 rotate-[30deg] rounded-[36px] border border-violet-300/50 bg-white/40" />
          <Layers3 className="size-24 text-violet-400/70" strokeWidth={1} />
        </div>
      </section>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Two projects. One clear flow.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Independent apps, connected through a documented API.
          </p>
        </div>
        <span className="hidden font-mono text-xs text-muted-foreground sm:block">
          frontend/ + backend/
        </span>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="gap-4 shadow-none">
          <CardHeader>
            <div className="mb-3 flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-primary">
                <Code2 className="size-5" />
              </span>
              <Badge variant="outline">01 / FRONTEND</Badge>
            </div>
            <CardTitle className="text-lg">A place for every feature</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Next.js pages, focused components, and forms that guide the user.
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex flex-wrap gap-2">
              {["Next.js", "TypeScript", "shadcn/ui", "TanStack Query"].map((item) => (
                <Badge key={item} variant="secondary" className="font-normal">
                  {item}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-background p-3 font-mono text-xs text-muted-foreground">
              <FolderTree className="size-4 text-primary" /> src/features/users/
            </div>
          </CardContent>
        </Card>
        <Card className="gap-4 shadow-none">
          <CardHeader>
            <div className="mb-3 flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-primary">
                <Database className="size-5" />
              </span>
              <Badge variant="outline">02 / BACKEND</Badge>
            </div>
            <CardTitle className="text-lg">One API. Consistent responses.</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Express routes, validated inputs, and a real PostgreSQL database.
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex flex-wrap gap-2">
              {["Node.js", "Express", "Prisma", "PostgreSQL"].map((item) => (
                <Badge key={item} variant="secondary" className="font-normal">
                  {item}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-background p-3 font-mono text-xs text-muted-foreground">
              <Braces className="size-4 text-primary" /> GET /api/v1/users
            </div>
          </CardContent>
        </Card>
      </div>
      <section className="grid gap-6 rounded-xl border bg-card p-6 md:grid-cols-[1fr_1.2fr] md:p-7">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Learn by doing
          </span>
          <h2 className="mt-2 text-lg font-semibold">Follow the users feature</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            A small example that covers the everyday work of building an application.
          </p>
          <Link
            href="/users"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            Open users <ArrowRight className="size-4" />
          </Link>
        </div>
        <ol className="grid gap-4 py-2 sm:grid-cols-2">
          {[
            "List, search, and paginate",
            "Create and edit with validation",
            "Handle loading and errors",
            "Confirm before deleting",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-50 text-primary">
                <Check className="size-3" />
              </span>
              {item}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
