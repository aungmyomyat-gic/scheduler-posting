"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, Users } from "lucide-react";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/examples/responses", label: "API reference", icon: BookOpen },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="flex gap-1 md:flex-col md:gap-2">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:px-4 ${active ? "bg-white/10 font-medium text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Icon className="size-4" />
            <span>{label}</span>
            {active && (
              <span className="ml-auto hidden size-1.5 rounded-full bg-violet-300 md:block" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
