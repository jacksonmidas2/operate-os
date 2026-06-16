// Provider barrel — re-exports each interface + its default implementation.
//
// Pattern: never call Stripe/QBO/Twilio/Anthropic directly from a route or
// page. Always go through the matching provider. This is what lets us
// swap third-party services for native modules without rewrites.

export * from "./payments";
export * from "./accounting";
export * from "./payroll";
export * from "./messaging";
export * from "./ocr";
export * from "./ai";

import { ManualPaymentProvider, type PaymentProvider } from "./payments";
import { StripePaymentProvider } from "./payments/stripe";
export { StripePaymentProvider } from "./payments/stripe";
import { NativeLedgerProvider, type AccountingProvider } from "./accounting";
import { ManualPayrollProvider, type PayrollProvider } from "./payroll";
import { ConsoleMessagingProvider, type MessagingProvider } from "./messaging";
import { ManualOCRProvider, type OCRProvider } from "./ocr";
import {
  AnthropicAIProvider,
  ConsoleAIProvider,
  type AIProvider,
} from "./ai";
import { AzureAnthropicAIProvider } from "./ai/azure";
import { GeminiAIProvider } from "./ai/gemini";
export { AzureAnthropicAIProvider } from "./ai/azure";
export { GeminiAIProvider } from "./ai/gemini";

export interface ProviderBundle {
  payments: PaymentProvider;
  accounting: AccountingProvider;
  payroll: PayrollProvider;
  messaging: MessagingProvider;
  ocr: OCRProvider;
  ai: AIProvider;
}

/**
 * Default provider bundle for a tenant. Inspects env vars to decide
 * which implementation to use. Phase 4 ships stubs everywhere; Phases
 * 10/13 swap in Stripe / Twilio / Anthropic real implementations.
 */
export function getDefaultProviders(): ProviderBundle {
  // Priority: Gemini on Vertex AI → Gemini API key → Azure-hosted Anthropic
  // → direct Anthropic → console stub. Gemini wins by default because it's
  // the cheapest and lives in the same GCP project as the app.
  const ai: AIProvider =
    process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" &&
    process.env.GOOGLE_CLOUD_PROJECT
      ? new GeminiAIProvider()
      : process.env.GOOGLE_API_KEY
        ? new GeminiAIProvider()
        : process.env.AZURE_AI_FOUNDRY_ENDPOINT && process.env.AZURE_AI_FOUNDRY_KEY
          ? new AzureAnthropicAIProvider()
          : process.env.ANTHROPIC_API_KEY
            ? new AnthropicAIProvider()
            : new ConsoleAIProvider();

  const payments: PaymentProvider = process.env.STRIPE_SECRET_KEY
    ? new StripePaymentProvider()
    : new ManualPaymentProvider();

  return {
    payments,
    accounting: new NativeLedgerProvider(),
    payroll: new ManualPayrollProvider(),
    messaging: new ConsoleMessagingProvider(),
    ocr: new ManualOCRProvider(),
    ai,
  };
}
