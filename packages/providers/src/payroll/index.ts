export interface PayrollRun {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalGrossCents: number;
  status: "DRAFT" | "PROCESSING" | "PAID" | "FAILED";
}

export interface PayrollProvider {
  readonly name: string;
  upsertEmployee(args: {
    externalId: string;
    firstName: string;
    lastName: string;
    email?: string;
    type: "W2" | "CONTRACTOR";
    payRateCents: number;
    payRateUnit: "HOURLY" | "PER_VISIT" | "FLAT_MONTHLY";
  }): Promise<{ providerId: string }>;
  recordTime(args: {
    employeeProviderId: string;
    minutes: number;
    date: Date;
  }): Promise<{ ok: true }>;
  runPayroll(args: { periodStart: Date; periodEnd: Date }): Promise<PayrollRun>;
}

/**
 * ManualPayroll — operator computes payroll themselves; we just record
 * pay amounts as Expense rows in the tenant DB. Phase 10 will add a
 * GustoPayrollProvider that embeds the real Gusto SDK.
 */
export class ManualPayrollProvider implements PayrollProvider {
  readonly name = "manual-payroll";

  async upsertEmployee(args: {
    externalId: string;
  }): Promise<{ providerId: string }> {
    return { providerId: args.externalId };
  }

  async recordTime(): Promise<{ ok: true }> {
    return { ok: true };
  }

  async runPayroll(args: {
    periodStart: Date;
    periodEnd: Date;
  }): Promise<PayrollRun> {
    return {
      id: `manual_${args.periodStart.toISOString()}`,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      totalGrossCents: 0,
      status: "DRAFT",
    };
  }
}
