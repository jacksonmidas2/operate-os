"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ShellLink } from "./Shell";

// Desktop sidebar nav: highlights the active page, and supports drag-to-reorder
// with the order persisted per-browser in localStorage.
export function SidebarNav({
  links,
  storageKey = "operate-nav-order",
}: {
  links: ShellLink[];
  storageKey?: string;
}) {
  const pathname = usePathname() ?? "";
  const [order, setOrder] = useState<string[] | null>(null);
  const [dragHref, setDragHref] = useState<string | null>(null);
  const [overHref, setOverHref] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setOrder(JSON.parse(saved) as string[]);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // Apply saved order; any new links not in the saved list keep their position at the end.
  const ordered: ShellLink[] = (() => {
    if (!order) return links;
    const byHref = new Map(links.map((l) => [l.href, l]));
    const out: ShellLink[] = [];
    for (const href of order) {
      const l = byHref.get(href);
      if (l) {
        out.push(l);
        byHref.delete(href);
      }
    }
    for (const l of links) if (byHref.has(l.href)) out.push(l);
    return out;
  })();

  // Active = the most specific link whose href prefixes the current path.
  let active: string | null = null;
  for (const l of links) {
    if (pathname === l.href || pathname.startsWith(l.href + "/")) {
      if (active === null || l.href.length > active.length) active = l.href;
    }
  }

  function persist(next: ShellLink[]) {
    const hrefs = next.map((l) => l.href);
    setOrder(hrefs);
    try {
      localStorage.setItem(storageKey, JSON.stringify(hrefs));
    } catch {
      /* ignore */
    }
  }

  function onDrop(targetHref: string) {
    setOverHref(null);
    if (!dragHref || dragHref === targetHref) return;
    const next = [...ordered];
    const from = next.findIndex((l) => l.href === dragHref);
    const to = next.findIndex((l) => l.href === targetHref);
    setDragHref(null);
    if (from < 0 || to < 0) return;
    const moved = next.splice(from, 1)[0];
    if (!moved) return;
    next.splice(to, 0, moved);
    persist(next);
  }

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
      {ordered.map((link) => {
        const isActive = link.href === active;
        const isOver = link.href === overHref && dragHref !== null;
        return (
          <Link
            key={link.href}
            href={link.href}
            draggable
            onDragStart={() => setDragHref(link.href)}
            onDragEnd={() => {
              setDragHref(null);
              setOverHref(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverHref(link.href);
            }}
            onDrop={() => onDrop(link.href)}
            aria-current={isActive ? "page" : undefined}
            className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-accent-500/15 text-white ring-1 ring-accent-500/40"
                : "text-gray-300 hover:bg-white/[0.06] hover:text-white"
            } ${isOver ? "ring-1 ring-white/30" : ""}`}
          >
            {link.icon ? (
              <span className="mr-3 text-base opacity-70 group-hover:opacity-100">
                {link.icon}
              </span>
            ) : null}
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
