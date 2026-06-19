// Deterministic pricing engine — the baseline the AI guide wraps.
// Given a job (with its client/location/unit) and the active pricebook, it
// proposes one invoice line: amount, a plain-English rationale, and whether
// we're confident. The AI layer refines the rationale and handles edge cases,
// but this always produces a sane, explainable starting point on its own.

export interface PricebookEntryLite {
  name: string;
  serviceType: string;
  bedroomCount: number | null;
  sqftMin: number | null;
  sqftMax: number | null;
  priceCents: number;
}

export interface JobForPricing {
  id: string;
  serviceType: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  location: {
    name: string;
    monthlyPaymentCents: number | null;
    client: {
      businessName: string;
      billingStructure: string;
      hourlyRateCents: number | null;
    };
  };
  unit: { unitNumber: string; bedroomCount: number | null; sqft: number | null } | null;
}

export type PriceSource = "contract" | "hourly" | "pricebook" | "manual";

export interface ProposedLine {
  jobId: string;
  description: string;
  amountCents: number;
  rationale: string;
  source: PriceSource;
  confident: boolean;
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function serviceLabel(s: string): string {
  return s.replace(/_/g, " ").toLowerCase();
}

export function jobHours(j: JobForPricing): number {
  const start = j.actualStart ?? j.scheduledStart;
  const end = j.actualEnd ?? j.scheduledEnd;
  const h = (end.getTime() - start.getTime()) / 3_600_000;
  return h > 0 ? h : 0;
}

export function proposeLine(
  job: JobForPricing,
  pricebook: PricebookEntryLite[],
): ProposedLine {
  const c = job.location.client;
  const where = `${c.businessName} — ${job.location.name}${job.unit ? ` #${job.unit.unitNumber}` : ""}`;

  if (c.billingStructure === "FLAT_MONTHLY") {
    const amt = job.location.monthlyPaymentCents ?? 0;
    return {
      jobId: job.id,
      description: `${job.location.name} — monthly cleaning contract`,
      amountCents: amt,
      rationale:
        amt > 0
          ? `Flat-monthly contract for ${job.location.name} (${money(amt)}/mo). Bill once per month — not per visit.`
          : `Flat-monthly client, but no monthly amount is set on ${job.location.name}. Set it on the location, or enter manually.`,
      source: "contract",
      confident: amt > 0,
    };
  }

  if (c.billingStructure === "HOURLY") {
    const hrs = jobHours(job);
    const rate = c.hourlyRateCents;
    if (rate && rate > 0) {
      const amt = Math.round(hrs * rate);
      return {
        jobId: job.id,
        description: `${serviceLabel(job.serviceType)} — ${where} (${hrs.toFixed(2)} hrs)`,
        amountCents: amt,
        rationale: `Hourly client: ${hrs.toFixed(2)} hrs × ${money(rate)}/hr = ${money(amt)}.`,
        source: "hourly",
        confident: true,
      };
    }
    return {
      jobId: job.id,
      description: `${serviceLabel(job.serviceType)} — ${where} (${hrs.toFixed(2)} hrs)`,
      amountCents: 0,
      rationale: `Hourly client, but no billing rate is set. Set the client's hourly rate, or enter the amount manually.`,
      source: "manual",
      confident: false,
    };
  }

  // PER_VISIT / PER_UNIT → pricebook (by bedroom count, then square footage, then generic)
  const bd = job.unit?.bedroomCount ?? null;
  const sqft = job.unit?.sqft ?? null;
  const candidates = pricebook.filter((e) => e.serviceType === job.serviceType);
  const match =
    candidates.find((e) => e.bedroomCount != null && e.bedroomCount === bd) ??
    candidates.find(
      (e) =>
        (e.sqftMin != null || e.sqftMax != null) &&
        sqft != null &&
        (e.sqftMin == null || sqft >= e.sqftMin) &&
        (e.sqftMax == null || sqft <= e.sqftMax),
    ) ??
    candidates.find(
      (e) => e.bedroomCount == null && e.sqftMin == null && e.sqftMax == null,
    );

  if (match) {
    const basis =
      match.bedroomCount != null
        ? `${match.bedroomCount}BR`
        : match.sqftMin != null || match.sqftMax != null
          ? "square footage"
          : "service type";
    return {
      jobId: job.id,
      description: `${serviceLabel(job.serviceType)} — ${where}`,
      amountCents: match.priceCents,
      rationale: `Pricebook "${match.name}" (${money(match.priceCents)}) — matched on ${basis}.`,
      source: "pricebook",
      confident: true,
    };
  }

  return {
    jobId: job.id,
    description: `${serviceLabel(job.serviceType)} — ${where}`,
    amountCents: 0,
    rationale: `No pricebook entry matched ${serviceLabel(job.serviceType)}${bd != null ? ` / ${bd}BR` : ""}. Add a pricebook entry or set the amount manually.`,
    source: "manual",
    confident: false,
  };
}
