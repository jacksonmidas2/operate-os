import { controlPrisma } from "@operate/db-control";
import { PageHeader, StatCard } from "@/components/Shell";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const [tenants, users, billingEvents] = await Promise.all([
    controlPrisma.tenant.count(),
    controlPrisma.user.count(),
    controlPrisma.billingEvent.count(),
  ]);

  const recentTenants = await controlPrisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <>
      <PageHeader
        title="Super-admin overview"
        description="Run Track A — onboard cleaning businesses, configure profit shares, monitor billing."
        actions={
          <Link
            href="/admin/tenants/new"
            className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
          >
            + New tenant
          </Link>
        }
      />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Tenants" value={String(tenants)} />
        <StatCard label="Users" value={String(users)} />
        <StatCard label="Billing events" value={String(billingEvents)} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Recent tenants</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-[10px] uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">Legal name</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentTenants.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No tenants yet — provision the first one with{" "}
                    <code className="rounded bg-white/[0.06] px-1">
                      npm run provision-tenant
                    </code>
                    .
                  </td>
                </tr>
              ) : (
                recentTenants.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2 font-mono">{t.slug}</td>
                    <td className="px-4 py-2">{t.legalName}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-900 dark:bg-green-900/30 dark:text-green-200">
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {t.createdAt.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
