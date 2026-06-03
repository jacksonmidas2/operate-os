export interface CreateDepositArgs {
  /** Internal idempotency key (invoice/booking id). */
  idempotencyKey: string;
  amountCents: number;
  currency: "USD";
  customerEmail: string;
  description: string;
  metadata?: Record<string, string>;
}

export interface DepositIntent {
  providerId: string;
  status: "REQUIRES_PAYMENT" | "SUCCEEDED" | "PROCESSING" | "FAILED";
  clientSecret?: string;
  amountCents: number;
}

export interface PaymentProvider {
  readonly name: string;
  createDeposit(args: CreateDepositArgs): Promise<DepositIntent>;
  capture(providerId: string): Promise<DepositIntent>;
  refund(providerId: string, amountCents?: number): Promise<{ ok: true }>;
  /** Stripe Connect-style operator payout (Phase 10). */
  payoutToOperator?(args: {
    operatorAccountId: string;
    amountCents: number;
    metadata?: Record<string, string>;
  }): Promise<{ providerId: string }>;
}

/**
 * Manual provider — records the intent in the tenant DB without
 * charging anything. Useful before Stripe is connected, and for
 * tenants that prefer Zelle/Cash App where we just RECORD payment.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "manual";

  async createDeposit(args: CreateDepositArgs): Promise<DepositIntent> {
    return {
      providerId: `manual_${args.idempotencyKey}`,
      status: "REQUIRES_PAYMENT",
      amountCents: args.amountCents,
    };
  }

  async capture(providerId: string): Promise<DepositIntent> {
    return {
      providerId,
      status: "SUCCEEDED",
      amountCents: 0,
    };
  }

  async refund(): Promise<{ ok: true }> {
    return { ok: true };
  }
}
