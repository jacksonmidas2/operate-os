import type {
  PaymentProvider,
  CreateDepositArgs,
  DepositIntent,
} from "./index";

/**
 * Stripe Connect provider.
 *
 * Two-tier setup:
 *   - Platform account (OperateHQ) holds the Stripe credentials.
 *   - Each tenant operator connects their own Stripe Express account
 *     via Stripe Connect; payouts flow to them with our take-rate
 *     siphoned to the platform.
 *
 * This implementation lazily imports the `stripe` package so the rest
 * of the app boots even without it installed. Install `stripe` when
 * you're ready to go live: `npm i stripe -w @operate/providers`.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  private secretKey: string;
  private connectAccountId?: string;

  constructor(opts?: { secretKey?: string; connectAccountId?: string }) {
    const key = opts?.secretKey ?? process.env.STRIPE_SECRET_KEY;
    if (!key)
      throw new Error("STRIPE_SECRET_KEY is required for StripePaymentProvider");
    this.secretKey = key;
    this.connectAccountId = opts?.connectAccountId;
  }

  private async stripe() {
    // Dynamic import so missing `stripe` package doesn't break the build.
    // webpackIgnore tells Next not to statically resolve this import.
    // @ts-expect-error - stripe is an optional peer dep; install with `npm i stripe -w @operate/providers`
    const mod = await import(/* webpackIgnore: true */ "stripe").catch(() => null);
    if (!mod)
      throw new Error(
        "stripe package not installed. Run: npm i stripe -w @operate/providers",
      );
    const Stripe = (mod as unknown as { default: new (k: string) => unknown })
      .default;
    return new Stripe(this.secretKey) as unknown as {
      paymentIntents: {
        create(args: Record<string, unknown>): Promise<{
          id: string;
          status: string;
          client_secret: string | null;
          amount: number;
        }>;
        retrieve(id: string): Promise<{
          id: string;
          status: string;
          amount: number;
        }>;
        capture(id: string): Promise<{
          id: string;
          status: string;
          amount: number;
        }>;
      };
      refunds: { create(args: Record<string, unknown>): Promise<unknown> };
      transfers: {
        create(args: Record<string, unknown>): Promise<{ id: string }>;
      };
    };
  }

  async createDeposit(args: CreateDepositArgs): Promise<DepositIntent> {
    const stripe = await this.stripe();
    const intent = await stripe.paymentIntents.create({
      amount: args.amountCents,
      currency: args.currency.toLowerCase(),
      receipt_email: args.customerEmail,
      description: args.description,
      metadata: args.metadata,
      capture_method: "manual", // capture remaining 50% on completion
      ...(this.connectAccountId
        ? { transfer_data: { destination: this.connectAccountId } }
        : {}),
    });
    return {
      providerId: intent.id,
      status: mapStatus(intent.status),
      clientSecret: intent.client_secret ?? undefined,
      amountCents: intent.amount,
    };
  }

  async capture(providerId: string): Promise<DepositIntent> {
    const stripe = await this.stripe();
    const intent = await stripe.paymentIntents.capture(providerId);
    return {
      providerId: intent.id,
      status: mapStatus(intent.status),
      amountCents: intent.amount,
    };
  }

  async refund(
    providerId: string,
    amountCents?: number,
  ): Promise<{ ok: true }> {
    const stripe = await this.stripe();
    await stripe.refunds.create({
      payment_intent: providerId,
      ...(amountCents !== undefined ? { amount: amountCents } : {}),
    });
    return { ok: true };
  }

  async payoutToOperator(args: {
    operatorAccountId: string;
    amountCents: number;
    metadata?: Record<string, string>;
  }): Promise<{ providerId: string }> {
    const stripe = await this.stripe();
    const transfer = await stripe.transfers.create({
      amount: args.amountCents,
      currency: "usd",
      destination: args.operatorAccountId,
      metadata: args.metadata,
    });
    return { providerId: transfer.id };
  }
}

function mapStatus(s: string): DepositIntent["status"] {
  if (s === "succeeded") return "SUCCEEDED";
  if (s === "processing") return "PROCESSING";
  if (s === "requires_payment_method" || s === "requires_confirmation" || s === "requires_action")
    return "REQUIRES_PAYMENT";
  return "FAILED";
}
