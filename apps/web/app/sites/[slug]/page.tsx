import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrCreateTenantClient,
  getTenantBySlug,
} from "@operate/tenant-router";
import { TenantPrismaClient } from "@operate/db-tenant";
import { ClientMarquee } from "@/components/ClientMarquee";

export default async function PublicSiteHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);
  const [config, services, clients, insuredCount] = await Promise.all([
    db.publicSiteConfig.findFirst(),
    db.publicService.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
    db.client.findMany({
      select: { id: true, businessName: true },
      orderBy: { businessName: "asc" },
    }),
    db.insurancePolicy.count(),
  ]);

  const brand = tenant.displayName ?? tenant.legalName;
  const primary = config?.brandPrimaryColor ?? "#F59E0B";
  const accent = config?.brandAccentColor ?? "#EA580C";

  const headline = config?.heroHeadline ?? `Clean spaces. Quiet operations.`;
  const subhead =
    config?.heroSubhead ??
    `${brand} keeps your property spotless so you can focus on the work that matters.`;

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, ${primary}55, transparent 50%), radial-gradient(circle at 80% 60%, ${accent}55, transparent 55%)`,
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          {config?.tagline ? (
            <p
              className="text-xs font-medium uppercase tracking-[0.2em]"
              style={{ color: primary }}
            >
              {config.tagline}
            </p>
          ) : null}
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            {headline}
          </h1>
          <p className="mt-5 max-w-2xl text-base text-gray-300 sm:text-lg">
            {subhead}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="rounded-lg px-5 py-3 text-sm font-medium text-ink-950 transition hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              {config?.heroCtaLabel ?? "Get a free quote"}
            </Link>
            <Link
              href="/services"
              className="rounded-lg border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/5"
            >
              See services
            </Link>
          </div>
        </div>
      </section>

      {/* ── Services preview ─────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              What we do
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Commercial-grade cleaning, dialed for your space.
            </p>
          </div>
          <Link
            href="/services"
            className="hidden text-sm text-gray-300 hover:text-white sm:inline"
            style={{ color: accent }}
          >
            See all →
          </Link>
        </div>

        {services.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-gray-500">
            Services will appear here once they're added in the ops dashboard.
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md transition hover:border-white/20"
              >
                <div
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-base font-semibold text-ink-950"
                  style={{ backgroundColor: primary }}
                >
                  {s.name.charAt(0)}
                </div>
                <h3 className="mt-4 text-base font-semibold">{s.name}</h3>
                {s.shortDesc ? (
                  <p className="mt-1 text-sm text-gray-400">{s.shortDesc}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Client marquee (social proof) ───────────────── */}
      <ClientMarquee clients={clients} />

      {/* ── Value props ──────────────────────────────────── */}
      <section className="border-b border-white/5 bg-white/[0.02]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
          {[
            ...(insuredCount > 0
              ? [{ stat: "Fully", label: "Insured (GL · auto · umbrella · WC)" }]
              : []),
            { stat: "Family-owned", label: "Owner-operated, every job" },
            { stat: "7 days", label: "A week, on call" },
            { stat: "0", label: "Long-term contracts required" },
          ].map((b) => (
            <div key={b.label}>
              <div
                className="text-2xl font-semibold sm:text-3xl"
                style={{ color: primary }}
              >
                {b.stat}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-gray-400">
                {b.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div
          className="rounded-3xl border border-white/10 p-8 sm:p-12"
          style={{
            background: `linear-gradient(135deg, ${primary}22, ${accent}22)`,
          }}
        >
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">
            Ready for a cleaner space?
          </h2>
          <p className="mt-3 max-w-xl text-base text-gray-300">
            Tell us about your property — we'll send a free quote within one
            business day.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-block rounded-lg px-5 py-3 text-sm font-medium text-ink-950"
            style={{ backgroundColor: primary }}
          >
            Request a quote
          </Link>
        </div>
      </section>
    </>
  );
}
