import Link from "next/link";
import { getTenantContext } from "@/lib/tenant-db";
import { computePnL } from "@operate/db-tenant/reporting";
import { PageHeader } from "@/components/Shell";

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
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ytdStart = new Date(now.getFullYear(), 0, 1);

  const [thisMonth, lastMonth, ytd] = await Promise.all([
    computePnL(db, monthStart, monthEnd),
    computePnL(db, prevMonthStart, monthStart),
    computePnL(db, ytdStart, monthEnd),
  ]);

  const revenueDelta = pctDelta(thisMonth.revenueCents, lastMonth.revenueCents);
  const expenseDelta = pctDelta(thisMonth.expensesCents, lastMonth.expensesCents);
  const profitDelta = pctDelta(thisMonth.netProfitCents, lastMonth.netProfitCents);

  // Compute total category spend for percentages
  const categoryTotal = Object.values(thisMonth.byCategory).reduce(
    (sum, v) => sum + v,
    0,
  );
  const sortedCategories = Object.entries(thisMonth.byCategory).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <>
      <PageHeader
        title="Ledger"
        description="Lightweight P&L. Drives profit-share billing each month."
      />

      {/* ── This month KPIs with month-over-month deltas ──── */}
      <section className="mt-6">
        <h2 className="text-base font-semibold uppercase tracking-wide text-gray-300">
          {monthStart.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MoneyCard
            label="Revenue"
            value={fmt(thisMonth.revenueCents)}
            delta={revenueDelta}
            higherIsBetter
          />
          <MoneyCard
            label="Expenses"
            value={fmt(thisMonth.expensesCents)}
            delta={expenseDelta}
            higherIsBetter={false}
          />
          <MoneyCard
            label="Net profit"
            value={fmt(thisMonth.netProfitCents)}
            delta={profitDelta}
            higherIsBetter
            highlight
          />
        </div>

        {sortedCategories.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
            <div className="flex items-end justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                Expenses by category
              </h3>
              <span className="text-xs text-gray-400">
                {fmt(categoryTotal)} total
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {sortedCategories.map(([cat, amt]) => {
                const pct = categoryTotal > 0 ? (amt / categoryTotal) * 100 : 0;
                return (
                  <li key={cat}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-100">
                        {cat.replace("_", " ").toLowerCase()}
                      </span>
                      <span className="font-mono text-gray-200">
                        {fmt(amt)}{" "}
                        <span className="text-xs text-gray-400">
                          ({Math.round(pct)}%)
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>

      {/* ── YTD ──────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-base font-semibold uppercase tracking-wide text-gray-300">
          YTD {now.getFullYear()}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MoneyCard label="Revenue" value={fmt(ytd.revenueCents)} />
          <MoneyCard label="Expenses" value={fmt(ytd.expensesCents)} />
          <MoneyCard
            label="Net profit"
            value={fmt(ytd.netProfitCents)}
            highlight
          />
        </div>
      </section>

      <div className="mt-8 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-gray-400">
        Need to record an expense? Use the{" "}
        <Link
          href={`/t/${slug}/ai`}
          className="text-accent-300 hover:text-accent-200"
        >
          AI co-pilot
        </Link>{" "}
        or add via Onboarding → Supplies.
      </div>
    </>
  );
}

function MoneyCard({
  label,
  value,
  delta,
  higherIsBetter,
  highlight = false,
}: {
  label: string;
  value: string;
  delta?: number | null;
  higherIsBetter?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 backdrop-blur-md ${
        highlight
          ? "border-accent-500/30 bg-accent-500/[0.05]"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-gray-300">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {value}
      </div>
      {delta != null && Number.isFinite(delta) ? (
        <DeltaPill pct={delta} higherIsBetter={higherIsBetter ?? true} />
      ) : null}
    </div>
  );
}

function DeltaPill({
  pct,
  higherIsBetter,
}: {
  pct: number;
  higherIsBetter: boolean;
}) {
  const isUp = pct > 0;
  const good = (isUp && higherIsBetter) || (!isUp && !higherIsBetter);
  const color = good
    ? "text-emerald-300"
    : pct === 0
      ? "text-gray-400"
      : "text-red-300";
  const arrow = pct === 0 ? "·" : isUp ? "▲" : "▼";
  return (
    <div className={`mt-2 text-xs ${color}`}>
      {arrow} {Math.abs(Math.round(pct))}% vs. last month
    </div>
  );
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function fmt(cents: number): string {
  const v = (cents / 100).toFixed(2);
  return cents < 0 ? `-$${v.slice(1)}` : `$${v}`;
}
