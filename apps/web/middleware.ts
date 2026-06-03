import { NextRequest, NextResponse } from "next/server";
import {
  resolveTenantFromHost,
  resolveTenantFromPath,
} from "@operate/tenant-router";

/**
 * Tenant resolution + URL rewriting.
 *
 *  Host                       → Internal URL
 *  ────────────────────────────────────────────────
 *  operatehq.localhost:3000   → /                       (apex marketing)
 *  admin.localhost:3000       → /admin                  (super-admin)
 *  book.localhost:3000        → /book                   (Track B booking funnel)
 *  mm.localhost:3000          → /t/mm                   (tenant root — dispatches by role)
 *  mm.localhost:3000/jobs     → /t/mm/jobs
 *  localhost:3000/t/mm        → /t/mm                   (path fallback for dev)
 *
 * Headers stamped on every request:
 *   - x-surface       apex | admin | book | tenant
 *   - x-tenant-slug   present only when surface=tenant
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Skip API auth + Next internals
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const hostResult = resolveTenantFromHost(host);
  const pathSlug = resolveTenantFromPath(pathname);

  let surface: "admin" | "book" | "tenant" | "apex" = "apex";
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
