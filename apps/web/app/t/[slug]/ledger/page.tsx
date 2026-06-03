import { getTenantContext } from "@/lib/tenant-db";
import { computePnL } from "@operate/db-tenant/reporting";
import { PageHeader, StatCard } from "@/components/Shell";

export default async function LedgerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const ytdStart = new Date(now.getFullYear(), 0, 1);

  const [thisMonth, ytd] = await Promise.all([
    computePnL(db, monthStart, monthEnd),
    computePnL(db, ytdStart, monthEnd),
  ]);

  return (
    <>
      <PageHeader
        title="Ledger"
        description="Lightweight P&L. Drives profit-share billing each month."
      />

      <section className="mt-6">
        <h2 className="text-lg font-semibold">
          {monthStart.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Revenue" value={fmt(thisMonth.revenueCents)} />
          <StatCard label="Expenses" value={fmt(thisMonth.expensesCents)} />
          <StatCard
            label="Net profit"
            value={fmt(thisMonth.netProfitCents)}
            hint={thisMonth.netProfitCents < 0 ? "loss" : undefined}
          />
        </div>
        {Object.keys(thisMonth.byCategory).length > 0 ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Expenses by category
            </div>
            <ul className="mt-2 divide-y divide-white/5">
              {Object.entries(thisMonth.byCategory).map(([cat, amt]) => (
                <li key={cat} className="flex justify-between py-1.5 text-sm">
                  <span>{cat.replace("_", " ").toLowerCase()}</span>
                  <span className="font-mono">{fmt(amt)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">YTD {now.getFullYear()}</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Revenue" value={fmt(ytd.revenueCents)} />
          <StatCard label="Expenses" value={fmt(ytd.expensesCents)} />
          <StatCard label="Net profit" value={fmt(ytd.netProfitCents)} />
        </div>
      </section>
    </>
  );
}

function fmt(cents: number): string {
  const v = (cents / 100).toFixed(2);
  return cents < 0 ? `-$${v.slice(1)}` : `$${v}`;
}
