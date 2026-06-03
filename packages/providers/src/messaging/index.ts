export interface SendSmsArgs {
  to: string;
  body: string;
  metadata?: Record<string, string>;
}

export interface SendEmailArgs {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html?: string;
  metadata?: Record<string, string>;
}

export interface MessagingProvider {
  readonly name: string;
  sendSms(args: SendSmsArgs): Promise<{ providerId: string }>;
  sendEmail(args: SendEmailArgs): Promise<{ providerId: string }>;
}

/**
 * Console provider — logs to stdout. Used in dev + when no real provider
 * is configured. Phase 10 will add TwilioMessagingProvider for SMS.
 */
export class ConsoleMessagingProvider implements MessagingProvider {
  readonly name = "console";

  async sendSms(args: SendSmsArgs): Promise<{ providerId: string }> {
    const id = `con_sms_${Date.now()}`;
    console.log(`[sms→${args.to}] ${args.body} (${id})`);
    return { providerId: id };
  }

  async sendEmail(args: SendEmailArgs): Promise<{ providerId: string }> {
    const id = `con_eml_${Date.now()}`;
    console.log(
      `[email→${args.to}] ${args.subject}\n${args.text}\n(${id})`,
    );
    return { providerId: id };
  }
}
