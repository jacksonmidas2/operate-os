import Link from "next/link";

export default async function ApexHomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <div className="rounded-3xl border border-gray-200 bg-white p-12 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
          OperateHQ
        </p>
        <h1 className="mt-2 text-5xl font-semibold tracking-tight">
          The operating system for cleaning businesses.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          Scheduling, payroll, payments, dispatch, and an AI co-pilot — for
          owner-operators and on-demand marketplaces, in one platform.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CallToAction
            title="Book a cleaning"
            description="Track B — homeowner booking funnel."
            href="/book"
            badge="For customers"
          />
          <CallToAction
            title="Run your cleaning business"
            description="Track A — operator dashboard, billing, payroll."
            href="/sign-in"
            badge="For operators"
          />
          <CallToAction
            title="Super-admin console"
            description="OperateHQ team — manage tenants + profit shares."
            href="/admin"
            badge="Internal"
          />
          <CallToAction
            title="M&M Cleaning (pilot)"
            description="The first tenant on the platform."
            href="/t/mm"
            badge="Pilot"
          />
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Tip: subdomain URLs like <code>admin.localhost:3030</code> require DNS
          setup on Windows. Path URLs above work everywhere.
        </p>
      </div>
    </main>
  );
}

function CallToAction({
  title,
  description,
  href,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  badge: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-gray-200 p-5 transition hover:border-brand-500 hover:bg-brand-50/40 dark:border-gray-800 dark:hover:bg-brand-900/10"
    >
      <span className="inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-900 dark:bg-brand-900/30 dark:text-brand-100">
        {badge}
      </span>
      <h2 className="mt-3 text-xl font-semibold group-hover:text-brand-700">
        {title}
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </Link>
  );
}
