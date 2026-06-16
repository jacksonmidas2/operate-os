import { NextRequest, NextResponse } from "next/server";
import {
  resolveSlugFromDomainMap,
  resolveTenantFromHost,
  resolveTenantFromPath,
} from "@operate/tenant-router";

/**
 * Tenant resolution + URL rewriting.
 *
 *  Host                            → Internal URL
 *  ──────────────────────────────────────────────────────────────
 *  operatehq.localhost:3000        → /                       (apex marketing)
 *  admin.localhost:3000            → /admin                  (super-admin)
 *  book.localhost:3000             → /book                   (Track B booking funnel)
 *  mm.localhost:3000               → /t/mm                   (tenant ops — dispatches by role)
 *  mm.localhost:3000/jobs          → /t/mm/jobs
 *  portal.mmcleaningllc.com        → /t/mm                   (tenant's vanity ops domain)
 *  mmcleaningllc.com               → /sites/mm               (tenant's public marketing site)
 *  localhost:3000/t/mm             → /t/mm                   (path fallback for dev)
 *
 * Two domain maps (Edge-safe — pure env-var lookups, no DB):
 *   PUBLIC_SITE_DOMAIN_MAP = mmcleaningllc.com=mm,foo.com=foo
 *   APP_DOMAIN_MAP         = portal.mmcleaningllc.com=mm,app.foo.com=foo
 *
 * Headers stamped on every request:
 *   - x-surface       apex | admin | book | tenant | site
 *   - x-tenant-slug   present when surface=tenant or surface=site
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Skip API auth + Next internals + top-level auth pages.
  // Auth pages (/sign-in, /sign-out) live at the apex; we must NOT
  // rewrite them under /t/{slug} or /sites/{slug} because those nested
  // routes don't exist — they 404.
  // /admin is also skipped so SUPER_ADMINs can reach it from any host;
  // access is gated by globalRole in app/admin/layout.tsx.
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-out") ||
    pathname.startsWith("/admin")
  ) {
    return NextResponse.next();
  }

  const hostResult = resolveTenantFromHost(host);
  const pathSlug = resolveTenantFromPath(pathname);

  // Custom-domain lookups — only run when subdomain logic didn't match.
  const appDomainSlug =
    !hostResult.slug && !hostResult.reserved && !pathSlug && host
      ? resolveSlugFromDomainMap(host, process.env.APP_DOMAIN_MAP)
      : null;
  const publicSiteSlug =
    !hostResult.slug && !hostResult.reserved && !pathSlug && !appDomainSlug && host
      ? resolveSlugFromDomainMap(host, process.env.PUBLIC_SITE_DOMAIN_MAP)
      : null;

  let surface: "admin" | "book" | "tenant" | "apex" | "site" = "apex";
  let tenantSlug: string | null = null;
  let rewrittenPath = pathname;

  if (hostResult.reserved === "admin") {
    surface = "admin";
    if (!pathname.startsWith("/admin")) rewrittenPath = `/admin${pathname}`;
  } else if (hostResult.reserved === "book") {
    surface = "book";
    if (!pathname.startsWith("/book")) rewrittenPath = `/book${pathname}`;
  } else if (hostResult.slug) {
    surface = "tenant";
    tenantSlug = hostResult.slug;
    if (!pathname.startsWith(`/t/${tenantSlug}`)) {
      rewrittenPath = `/t/${tenantSlug}${pathname === "/" ? "" : pathname}`;
    }
  } else if (appDomainSlug) {
    surface = "tenant";
    tenantSlug = appDomainSlug;
    if (!pathname.startsWith(`/t/${tenantSlug}`)) {
      rewrittenPath = `/t/${tenantSlug}${pathname === "/" ? "" : pathname}`;
    }
  } else if (publicSiteSlug) {
    surface = "site";
    tenantSlug = publicSiteSlug;
    if (!pathname.startsWith(`/sites/${tenantSlug}`)) {
      rewrittenPath = `/sites/${tenantSlug}${pathname === "/" ? "" : pathname}`;
    }
  } else if (pathSlug) {
    surface = "tenant";
    tenantSlug = pathSlug;
    // already at /t/{slug}/..., no rewrite needed
  }

  const headers = new Headers(req.headers);
  headers.set("x-surface", surface);
  if (tenantSlug) headers.set("x-tenant-slug", tenantSlug);

  if (rewrittenPath !== pathname) {
    url.pathname = rewrittenPath;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
