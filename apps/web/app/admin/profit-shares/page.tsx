import Link from "next/link";
import { controlPrisma } from "@operate/db-control";
import { PageHeader, StatCard } from "@/components/Shell";

export default async function ProfitSharesPage() {
  const tenants = await controlPrisma.tenant.findMany({
    include: {
      profitShareConfig: true,
      billingEvents: {
        orderBy: { periodStart: "desc" },
        take: 1,
      },
      _count: { select: { billingEvents: true } },
    },
    orderBy: { legalName: "asc" },
  });

  const configured = tenants.filter((t) => t.profitShareConfig);
  const unconfigured = tenants.filter((t) => !t.profitShareConfig);

  // Aggregate trailing-month run-rate
  const trailingTotal = configured.reduce((acc, t) => {
    const last = t.billingEvents[0];
    return last ? acc + Number(last.shareCents) : acc;
  }, 0);

  return (
    <>
      <PageHeader
        title="Profit shares"
        description="Every tenant's profit-share contract + the last billing event."
      />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Tenants with contract"
          value={`${configured.length} / ${tenants.length}`}
        />
        <StatCard
          label="Most recent month's run-rate"
          value={`$${(trailingTotal / 100).toFixed(2)}`}
          hint="Sum of last billing event per tenant"
        />
        <StatCard
          label="Unconfigured"
          value={String(unconfigured.length)}
          hint={unconfigured.length > 0 ? "Action needed" : undefined}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Active contracts</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-[10px] uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-2">Tenant</th>
                <th className="px-4 py-2">Split</th>
                <th className="px-4 py-2">Basis</th>
                <th className="px-4 py-2">Buyout</th>
                <th className="px-4 py-2">Started</th>
                <th className="px-4 py-2 text-right">Last share</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {configured.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No contracts yet. Configure one from a tenant detail page.
                  </td>
                </tr>
              ) : (
                configured.map((t) => {
                  const cfg = t.profitShareConfig!;
                  const last = t.billingEvents[0];
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/tenants/${t.slug}`}
                          className="font-medium text-accent-400 hover:text-accent-300"
                        >
                          {t.legalName}
                        </Link>
                        <div className="text-xs text-gray-500">{t.slug}</div>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {(cfg.splitBasisPoints / 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {cfg.basis.toLowerCase().replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {cfg.buyoutMultiple}x
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {cfg.startDate.toISOString().slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {last
                          ? `$${(Number(last.shareCents) / 100).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/tenants/${t.slug}/profit-share`}
                          className="text-xs text-accent-400 hover:text-accent-300"
                        >
                          Edit →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {unconfigured.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">No contract yet</h2>
          <p className="mt-1 text-sm text-gray-500">
            These tenants are on the platform but aren't being billed.
          </p>
          <ul className="mt-3 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md">
            {unconfigured.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{t.legalName}</div>
                  <div className="text-xs text-gray-500">{t.slug}</div>
                </div>
                <Link
                  href={`/admin/tenants/${t.slug}/profit-share`}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:from-accent-400 hover:to-accent-600"
                >
                  Configure →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
