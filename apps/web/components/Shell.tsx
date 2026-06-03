import Link from "next/link";
import { signOut } from "@/auth";
import { MobileNav } from "./MobileNav";

export interface ShellLink {
  label: string;
  href: string;
  icon?: string;
}

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export function Shell({
  brand,
  area,
  links,
  user,
  extraSidebar,
  children,
}: {
  brand: string;
  area: string;
  links: ShellLink[];
  user?: { email?: string | null; name?: string | null } | null;
  extraSidebar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      {/* Mobile top bar + drawer (client) */}
      <MobileNav
        brand={brand}
        area={area}
        links={links}
        user={user}
        signOutAction={signOutAction}
        extraSidebar={extraSidebar}
      />

      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r border-white/5 bg-ink-950/60 backdrop-blur-xl sm:flex">
        <div className="border-b border-white/5 px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent-500 shadow-glow"></div>
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
              className="group flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/[0.06] hover:text-white"
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
        ) : (
          <div className="border-t border-white/5 p-3">
            <Link
              href="/sign-in"
              className="block w-full rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-3 py-2 text-center text-sm font-medium text-white shadow-glow"
            >
              Sign in
            </Link>
          </div>
        )}
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-white/5 pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-gray-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-card sm:p-5">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent-500/10 blur-3xl" />
      <div className="relative">
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400 sm:text-[11px]">
          {label}
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-white sm:mt-3 sm:text-3xl">
          {value}
        </div>
        {hint ? (
          <div className="mt-1 text-xs text-gray-500">{hint}</div>
        ) : null}
      </div>
    </div>
  );
}
