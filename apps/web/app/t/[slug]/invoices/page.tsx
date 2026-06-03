import Link from "next/link";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader, StatCard } from "@/components/Shell";

export default async function InvoicesListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);
  const invoices = await db.invoice.findMany({
    include: { client: true, _count: { select: { lines: true } } },
    orderBy: { issuedOn: "desc" },
  });

  const totals = invoices.reduce(
    (acc, i) => {
      acc.all += i.totalCents;
      if (i.status === "PAID") acc.paid += i.totalCents;
      if (i.status === "SENT" || i.status === "PARTIALLY_PAID") acc.outstanding += i.totalCents;
      return acc;
    },
    { all: 0, paid: 0, outstanding: 0 },
  );

  return (
    <>
      <PageHeader
        title="Invoices"
        actions={
          <Link
            href={`/t/${slug}/invoices/new`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + New invoice
          </Link>
        }
      />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total billed" value={`$${(totals.all / 100).toFixed(2)}`} />
        <StatCard label="Paid" value={`$${(totals.paid / 100).toFixed(2)}`} />
        <StatCard label="Outstanding" value={`$${(totals.outstanding / 100).toFixed(2)}`} />
      </section>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2">Number</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Issued</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No invoices yet.
                </td>
              </tr>
            ) : (
              invoices.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/t/${slug}/invoices/${i.number}`}
                      className="font-mono text-brand-600 hover:underline"
                    >
                      {i.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{i.client.businessName}</td>
                  <td className="px-4 py-3 font-mono">{i.issuedOn.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-3 font-mono">{i.dueOn?.toISOString().slice(0, 10) ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono">${(i.totalCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={i.status} />
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

function StatusPill({ status }: { status: string }) {
  const color =
    status === "PAID"
      ? "bg-green-100 text-green-900 dark:bg-green-900/30"
      : status === "OVERDUE"
        ? "bg-red-100 text-red-900 dark:bg-red-900/30"
        : status === "SENT" || status === "PARTIALLY_PAID"
          ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30"
          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${color}`}>
      {status.replace("_", " ")}
    </span>
  );
}
