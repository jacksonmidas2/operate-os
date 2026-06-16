import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getOrCreateTenantClient,
  getTenantBySlug,
} from "@operate/tenant-router";
import { TenantPrismaClient } from "@operate/db-tenant";
import { PublicLogo } from "@/components/PublicLogo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return {};
  const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);
  const config = await db.publicSiteConfig.findFirst();
  const brand = tenant.displayName ?? tenant.legalName;
  return {
    title: config?.tagline ? `${brand} — ${config.tagline}` : brand,
    description:
      config?.heroSubhead ??
      `${brand} — professional cleaning services.`,
  };
}

export default async function PublicSiteLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
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

  const navLinks: Array<{ label: string; href: string }> = [
    { label: "Services", href: `/services` },
    { label: "About", href: `/about` },
    { label: "Contact", href: `/contact` },
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 text-gray-100"
      style={
        {
          "--brand-primary": primary,
          "--brand-accent": accent,
        } as React.CSSProperties
      }
    >
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <PublicLogo brand={brand} primary={primary} accent={accent} size={36} />
            <span className="text-base font-semibold tracking-tight">
              {brand}
            </span>
          </Link>
          <nav className="hidden gap-6 sm:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-gray-300 hover:text-white transition"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/contact"
            className="hidden rounded-lg px-4 py-2 text-sm font-medium text-ink-950 transition hover:opacity-90 sm:inline-block"
            style={{ backgroundColor: primary }}
          >
            {config?.heroCtaLabel ?? "Free quote"}
          </Link>
          {/* Mobile fallback */}
          <Link
            href="/contact"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-950 sm:hidden"
            style={{ backgroundColor: primary }}
          >
            Quote
          </Link>
        </div>
        {/* Mobile bottom-bar nav */}
        <nav className="border-t border-white/5 sm:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs text-gray-300 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/5 bg-ink-950/60">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <PublicLogo brand={brand} primary={primary} accent={accent} size={28} />
                <span className="text-sm font-semibold">{brand}</span>
              </div>
              {config?.tagline ? (
                <p className="mt-2 max-w-xs text-sm text-gray-400">
                  {config.tagline}
                </p>
              ) : null}
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Contact
              </div>
              <ul className="mt-2 space-y-1 text-sm text-gray-300">
                {(config?.publicPhone ?? profile?.phone) ? (
                  <li>
                    <a
                      href={`tel:${(config?.publicPhone ?? profile?.phone ?? "").replace(/[^\d+]/g, "")}`}
                      className="hover:text-white"
                    >
                      {config?.publicPhone ?? profile?.phone}
                    </a>
                  </li>
                ) : null}
                {(config?.publicEmail ?? profile?.email) ? (
                  <li>
                    <a
                      href={`mailto:${config?.publicEmail ?? profile?.email}`}
                      className="hover:text-white"
                    >
                      {config?.publicEmail ?? profile?.email}
                    </a>
                  </li>
                ) : null}
                {config?.serviceAreaText ? (
                  <li className="text-gray-400">{config.serviceAreaText}</li>
                ) : null}
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Pages
              </div>
              <ul className="mt-2 space-y-1 text-sm text-gray-300">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-white/5 pt-6 text-xs text-gray-500">
            © {new Date().getFullYear()} {tenant.legalName}. All rights reserved.
            <span className="ml-2" style={{ color: accent }}>
              ·
            </span>
            <span className="ml-2">
              Powered by{" "}
              <a
                href="https://operatehq.app"
                className="text-gray-400 hover:text-gray-300"
              >
                OperateHQ
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
