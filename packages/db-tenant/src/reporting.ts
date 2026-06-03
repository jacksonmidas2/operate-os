import type { TenantPrismaClient } from "./client";

export interface PnLReport {
  periodStart: Date;
  periodEnd: Date;
  revenueCents: number;
  expensesCents: number;
  netProfitCents: number;
  byCategory: Record<string, number>;
}

/**
 * Lightweight P&L computation. Revenue = sum of payments received in the
 * period. Expenses = sum of Expense rows spent in the period.
 *
 * This is the source of truth for profit-share billing. A full
 * double-entry ledger lands in Phase 9.5 — we don't need it to compute
 * the 40% share, but we'll want it for tax filing later.
 */
export async function computePnL(
  db: TenantPrismaClient,
  periodStart: Date,
  periodEnd: Date,
): Promise<PnLReport> {
  const [paymentsAgg, expensesByCategory] = await Promise.all([
    db.payment.aggregate({
      where: { paidAt: { gte: periodStart, lt: periodEnd } },
      _sum: { amountCents: true },
    }),
    db.expense.groupBy({
      by: ["category"],
      where: { spentAt: { gte: periodStart, lt: periodEnd } },
      _sum: { amountCents: true },
    }),
  ]);

  const revenueCents = paymentsAgg._sum.amountCents ?? 0;
  const byCategory: Record<string, number> = {};
  let expensesCents = 0;
  for (const row of expensesByCategory) {
    const amt = row._sum.amountCents ?? 0;
    byCategory[row.category] = amt;
    expensesCents += amt;
  }

  return {
    periodStart,
    periodEnd,
    revenueCents,
    expensesCents,
    netProfitCents: revenueCents - expensesCents,
    byCategory,
  };
}
