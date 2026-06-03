export interface JournalLine {
  accountCode: string;
  debitCents: number;
  creditCents: number;
  description?: string;
}

export interface PostJournalArgs {
  entryDate: Date;
  reference: string; // invoice number, expense id, payroll run id
  description: string;
  lines: JournalLine[];
  metadata?: Record<string, unknown>;
}

export interface AccountingProvider {
  readonly name: string;
  postJournalEntry(args: PostJournalArgs): Promise<{ entryId: string }>;
  /** Pull a profit-and-loss for the period. Used by Phase 9. */
  getProfitAndLoss(args: {
    periodStart: Date;
    periodEnd: Date;
  }): Promise<{
    revenueCents: number;
    expensesCents: number;
    netCents: number;
  }>;
}

/**
 * NativeLedger — our own double-entry ledger inside the tenant DB.
 * Phase 9 fills in the journal posting + P&L computation against the
 * LedgerAccount + JournalEntry tables (which we'll add to the tenant
 * schema during Phase 9). The interface is set up now so callers
 * (invoice creation, payment recording) can already wire to it.
 */
export class NativeLedgerProvider implements AccountingProvider {
  readonly name = "native-ledger";

  async postJournalEntry(): Promise<{ entryId: string }> {
    // Phase 9 wires this to the tenant DB.
    return { entryId: `stub_${Date.now()}` };
  }

  async getProfitAndLoss(): Promise<{
    revenueCents: number;
    expensesCents: number;
    netCents: number;
  }> {
    return { revenueCents: 0, expensesCents: 0, netCents: 0 };
  }
}
