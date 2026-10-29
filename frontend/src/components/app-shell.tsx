import Link from "next/link";
import { ArrowUpRight, Braces, Layers3 } from "lucide-react";
import type { ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:p-3 focus:text-primary"
      >
        Skip to content
      </a>
      <aside className="flex flex-col bg-sidebar p-4 text-white md:sticky md:top-0 md:h-screen md:p-6">
        <Link
          href="/"
          className="mb-5 flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white md:mb-12"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-violet-400 text-xl font-bold text-sidebar">
            f.
          </span>
          <span className="text-lg font-semibold tracking-tight">
            foundation<span className="text-violet-300">.</span>
          </span>
        </Link>
        <p className="mb-4 hidden px-4 text-[10px] font-semibold tracking-[0.2em] text-slate-500 md:block">
          YOUR WORKSPACE
        </p>
        <SidebarNav />
        <div className="mt-auto hidden pt-12 md:block">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <Layers3 className="mb-3 size-5 text-violet-300" />
            <p className="text-sm font-medium">Start small. Build well.</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              One feature at a time, with a pattern you can follow.
            </p>
            <Link
              href="/examples/responses"
              className="mt-4 inline-flex items-center gap-1 text-xs text-violet-200"
            >
              Explore the API <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
            <span className="flex size-8 items-center justify-center rounded-full bg-white/10">
              <Braces className="size-4" />
            </span>
            <div>
              <p className="text-xs font-medium">Team starter</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Local development</p>
            </div>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between gap-3 border-b bg-card/80 px-5 md:px-10">
          <p className="text-xs text-muted-foreground">
            Workspace <span className="mx-2 text-border">/</span>{" "}
            <span className="font-medium text-foreground">Starter project</span>
          </p>
          <span className="rounded-full border bg-background px-2.5 py-1 text-[10px] font-medium tracking-wide text-muted-foreground">
            LEARNING TEMPLATE
          </span>
        </header>
        <main id="main-content" className="mx-auto max-w-[1320px] p-5 md:p-10 lg:px-12">
          {children}
        </main>
        <footer className="mx-5 flex flex-wrap justify-between gap-2 border-t py-5 text-[11px] text-muted-foreground md:mx-10 lg:mx-12">
          <span>Foundation · A starting point for your next project</span>
          <span>Next.js + Express</span>
        </footer>
      </div>
    </div>
  );
}
