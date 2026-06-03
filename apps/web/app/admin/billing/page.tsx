import Link from "next/link";
import { controlPrisma } from "@operate/db-control";
import { PageHeader, StatCard } from "@/components/Shell";

export default async function BillingPage() {
  const events = await controlPrisma.billingEvent.findMany({
    include: { tenant: true },
    orderBy: { periodStart: "desc" },
    take: 50,
  });

  const totals = events.reduce(
    (acc, e) => {
      acc.share += Number(e.shareCents);
      if (e.status === "PAID") acc.paid += Number(e.shareCents);
      return acc;
    },
    { share: 0, paid: 0 },
  );

  return (
    <>
      <PageHeader
        title="Billing events"
        description="Each month-end close creates a billing event per tenant."
        actions={
          <Link
            href="/admin/billing/new"
            className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
          >
            Close a month →
          </Link>
        }
      />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total billed" value={`$${(totals.share / 100).toFixed(2)}`} />
        <StatCard label="Collected" value={`$${(totals.paid / 100).toFixed(2)}`} />
        <StatCard label="Events" value={String(events.length)} />
      </section>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-left text-[10px] uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-4 py-2">Invoice #</th>
              <th className="px-4 py-2">Tenant</th>
              <th className="px-4 py-2">Period</th>
              <th className="px-4 py-2 text-right">Net profit</th>
              <th className="px-4 py-2 text-right">Our share</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No billing events yet.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 font-mono text-xs">{e.invoiceNumber}</td>
                  <td className="px-4 py-2">{e.tenant.legalName}</td>
                  <td className="px-4 py-2 font-mono">
                    {e.periodStart.toISOString().slice(0, 7)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    ${(Number(e.netProfitCents) / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    ${(Number(e.shareCents) / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-gray-200">
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
