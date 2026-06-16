import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrCreateTenantClient,
  getTenantBySlug,
} from "@operate/tenant-router";
import { TenantPrismaClient } from "@operate/db-tenant";

export default async function PublicSiteAbout({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);
  const [config, profile] = await Promise.all([
    db.publicSiteConfig.findFirst(),
    db.businessProfile.findFirst(),
  ]);

  const brand = tenant.displayName ?? tenant.legalName;
  const primary = config?.brandPrimaryColor ?? "#F59E0B";
  const accent = config?.brandAccentColor ?? "#EA580C";

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
      <p
        className="text-xs font-medium uppercase tracking-[0.2em]"
        style={{ color: primary }}
      >
        About
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
        Built on trust, run with care.
      </h1>

      <div className="mt-8 space-y-5 text-base leading-relaxed text-gray-300">
        {config?.aboutBody ? (
          <AboutMarkdown body={config.aboutBody} />
        ) : (
          <>
            <p>
              {brand} is a family-owned cleaning business serving Southern
              California. We started by cleaning small commercial spaces and
              grew through word-of-mouth — every job is still treated as if
              it's the one that earns the next referral.
            </p>
            <p>
              Today we handle commercial cleaning for retail floors, office
              suites, and apartment-turnover programs. Whether it's a flagship
              store or a single unit between tenants, we send a trained crew
              with the right equipment and a clear scope of work.
            </p>
            <p>
              If you're looking for a cleaner that shows up on time, asks the
              right questions, and treats your space like their own — we'd
              love to talk.
            </p>
          </>
        )}
      </div>

      {/* Service area */}
      <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-md">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          Service area
        </div>
        <p className="mt-2 text-lg font-medium">
          {config?.serviceAreaText ?? "Greater Los Angeles + Orange County"}
        </p>
        {profile?.addressLine1 ? (
          <p className="mt-3 text-sm text-gray-400">
            Based in {[profile.city, profile.state].filter(Boolean).join(", ")}
            {profile.city ? "." : ""}
          </p>
        ) : null}
      </section>

      {/* CTA */}
      <div className="mt-12 flex items-center justify-between gap-4 rounded-2xl border border-white/10 p-6">
        <div>
          <h2 className="text-lg font-semibold">Ready to talk?</h2>
          <p className="mt-1 text-sm text-gray-400">
            We respond within one business day.
          </p>
        </div>
        <Link
          href="/contact"
          className="rounded-lg px-4 py-2 text-sm font-medium text-ink-950"
          style={{ backgroundColor: accent }}
        >
          Contact
        </Link>
      </div>
    </div>
  );
}

/**
 * Minimal markdown-ish renderer — splits paragraphs on blank lines.
 * We can swap in a real markdown lib later if Marilu starts using lists/headings.
 */
function AboutMarkdown({ body }: { body: string }) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}
