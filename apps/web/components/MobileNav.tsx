"use client";

import { useState } from "react";
import Link from "next/link";
import type { ShellLink } from "./Shell";

export function MobileNav({
  brand,
  area,
  links,
  user,
  signOutAction,
  extraSidebar,
}: {
  brand: string;
  area: string;
  links: ShellLink[];
  user?: { email?: string | null; name?: string | null } | null;
  signOutAction: () => Promise<void>;
  extraSidebar?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-ink-950/80 px-4 py-3 backdrop-blur-xl sm:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-accent-500 shadow-glow" />
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-gray-400">
              {area}
            </div>
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold text-white">
            {brand}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
          >
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-white/10 bg-ink-950/95 backdrop-blur-2xl sm:hidden animate-slide-up">
            <div className="border-b border-white/5 px-5 py-5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent-500 shadow-glow" />
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                  {area}
                </div>
              </div>
              <div className="mt-2 truncate text-lg font-semibold text-white">
                {brand}
              </div>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/[0.06] hover:text-white"
                >
                  {link.icon ? (
                    <span className="mr-3 text-base opacity-70 group-hover:opacity-100">
                      {link.icon}
                    </span>
                  ) : null}
                  {link.label}
                </Link>
              ))}
            </nav>
            {extraSidebar}
            {user ? (
              <div className="border-t border-white/5 p-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="truncate text-xs text-gray-400">
                    {user.name ?? user.email}
                  </div>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-white/10"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            ) : null}
          </aside>
        </>
      ) : null}
    </>
  );
}
