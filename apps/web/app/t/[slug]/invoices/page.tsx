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
            className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
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

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-left text-[10px] uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-4 py-2">Number</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Issued</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No invoices yet.
                </td>
              </tr>
            ) : (
              invoices.map((i) => (
                <tr key={i.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/t/${slug}/invoices/${i.number}`}
                      className="font-mono text-accent-400 hover:text-accent-300"
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
          : "bg-white/[0.06] text-gray-200";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${color}`}>
      {status.replace("_", " ")}
    </span>
  );
}
