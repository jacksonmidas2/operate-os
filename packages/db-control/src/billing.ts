import { controlPrisma } from "./client";
import { getOrCreateTenantClient } from "@operate/tenant-router";
import { TenantPrismaClient } from "@operate/db-tenant";
import { computePnL } from "@operate/db-tenant/reporting";

export interface CloseMonthArgs {
  tenantSlug: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface ClosedMonth {
  billingEventId: string;
  invoiceNumber: string;
  netProfitCents: number;
  shareCents: number;
  splitBasisPoints: number;
}

/**
 * End-of-month close: pulls the tenant's P&L for the period, computes
 * our profit-share, and records a BillingEvent in the control plane.
 * Idempotent on (tenantId, periodStart) — re-running returns the
 * existing event without double-billing.
 */
export async function closeMonth(args: CloseMonthArgs): Promise<ClosedMonth> {
  const tenant = await controlPrisma.tenant.findUnique({
    where: { slug: args.tenantSlug },
    include: { profitShareConfig: true },
  });
  if (!tenant) throw new Error(`Tenant "${args.tenantSlug}" not found`);
  if (!tenant.profitShareConfig)
    throw new Error(`Tenant "${args.tenantSlug}" has no profit-share contract`);

  const existing = await controlPrisma.billingEvent.findFirst({
    where: { tenantId: tenant.id, periodStart: args.periodStart },
  });
  if (existing) {
    return {
      billingEventId: existing.id,
      invoiceNumber: existing.invoiceNumber,
      netProfitCents: Number(existing.netProfitCents),
      shareCents: Number(existing.shareCents),
      splitBasisPoints: tenant.profitShareConfig.splitBasisPoints,
    };
  }

  const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);
  const pnl = await computePnL(db, args.periodStart, args.periodEnd);

  const bps = tenant.profitShareConfig.splitBasisPoints;
  const basisCents =
    tenant.profitShareConfig.basis === "GROSS_REVENUE"
      ? pnl.revenueCents
      : pnl.netProfitCents;
  const shareCents = Math.max(0, Math.floor((basisCents * bps) / 10_000));

  const period = `${args.periodStart.toISOString().slice(0, 7)}`;
  const invoiceNumber = `OP-${tenant.slug}-${period}`;

  const event = await controlPrisma.billingEvent.create({
    data: {
      tenantId: tenant.id,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      netProfitCents: BigInt(pnl.netProfitCents),
      shareCents: BigInt(shareCents),
      status: shareCents > 0 ? "INVOICED" : "WAIVED",
      invoiceNumber,
      notes:
        shareCents === 0
          ? "Net profit was zero or negative — share waived for this period."
          : null,
    },
  });

  return {
    billingEventId: event.id,
    invoiceNumber,
    netProfitCents: pnl.netProfitCents,
    shareCents,
    splitBasisPoints: bps,
  };
}
