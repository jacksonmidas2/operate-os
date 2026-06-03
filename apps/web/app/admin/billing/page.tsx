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
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
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

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2">Invoice #</th>
              <th className="px-4 py-2">Tenant</th>
              <th className="px-4 py-2">Period</th>
              <th className="px-4 py-2 text-right">Net profit</th>
              <th className="px-4 py-2 text-right">Our share</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
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
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
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
