import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrCreateTenantClient,
  getTenantBySlug,
} from "@operate/tenant-router";
import { TenantPrismaClient } from "@operate/db-tenant";

export default async function PublicSiteServices({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);
  const [config, services] = await Promise.all([
    db.publicSiteConfig.findFirst(),
    db.publicService.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const primary = config?.brandPrimaryColor ?? "#F59E0B";
  const commercial = services.filter((s) => s.isCommercial);
  const residential = services.filter((s) => s.isResidential && !s.isCommercial);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <header>
        <p
          className="text-xs font-medium uppercase tracking-[0.2em]"
          style={{ color: primary }}
        >
          Services
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
          Cleaning, scaled to your space
        </h1>
        <p className="mt-3 max-w-2xl text-base text-gray-300">
          From single-unit turnovers to multi-store retail floors — we tailor
          the crew, equipment, and schedule to your property.
        </p>
      </header>

      {services.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-gray-500">
          Services will appear here once they're added in the ops dashboard.
        </p>
      ) : (
        <>
          {commercial.length > 0 ? (
            <ServiceGroup title="Commercial" items={commercial} primary={primary} />
          ) : null}
          {residential.length > 0 ? (
            <ServiceGroup title="Residential" items={residential} primary={primary} />
          ) : null}
        </>
      )}

      <div className="mt-16 rounded-3xl border border-white/10 p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight">
          Need something custom?
        </h2>
        <p className="mt-2 text-sm text-gray-300">
          Tell us about your space — we'll design a service package around it.
        </p>
        <Link
          href="/contact"
          className="mt-5 inline-block rounded-lg px-5 py-3 text-sm font-medium text-ink-950"
          style={{ backgroundColor: primary }}
        >
          Talk to us
        </Link>
      </div>
    </div>
  );
}

function ServiceGroup({
  title,
  items,
  primary,
}: {
  title: string;
  items: Array<{
    id: string;
    name: string;
    shortDesc: string | null;
    longDesc: string | null;
  }>;
  primary: string;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
        {title}
      </h2>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((s) => (
          <li
            key={s.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md"
          >
            <div
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-base font-semibold text-ink-950"
              style={{ backgroundColor: primary }}
            >
              {s.name.charAt(0)}
            </div>
            <h3 className="mt-4 text-lg font-semibold">{s.name}</h3>
            {s.shortDesc ? (
              <p className="mt-1 text-sm text-gray-400">{s.shortDesc}</p>
            ) : null}
            {s.longDesc ? (
              <p className="mt-3 text-sm leading-relaxed text-gray-300">
                {s.longDesc}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
