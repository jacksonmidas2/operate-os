import Link from "next/link";
import { signOut } from "@/auth";

export interface ShellLink {
  label: string;
  href: string;
  icon?: string;
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
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 sm:flex">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {area}
          </div>
          <div className="mt-1 text-lg font-semibold">{brand}</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-900 dark:text-gray-300 dark:hover:bg-brand-900/20"
            >
              {link.icon ? <span className="mr-2">{link.icon}</span> : null}
              {link.label}
            </Link>
          ))}
        </nav>
        {extraSidebar}
        {user ? (
          <div className="border-t border-gray-200 p-3 dark:border-gray-800">
            <div className="px-3 py-1 text-xs text-gray-500">
              {user.name ?? user.email}
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="border-t border-gray-200 p-3 dark:border-gray-800">
            <Link
              href="/sign-in"
              className="block rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-700"
            >
              Sign in
            </Link>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-x-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
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
    <header className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4 dark:border-gray-800">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
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
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint ? (
        <div className="mt-1 text-xs text-gray-500">{hint}</div>
      ) : null}
    </div>
  );
}
