import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getTenantBySlug,
  getOrCreateTenantClient,
} from "@operate/tenant-router";
import { TenantPrismaClient } from "@operate/db-tenant";
import { Shell, type ShellLink } from "@/components/Shell";
import { RoleSwitcher, ImpersonationBanner } from "@/components/RoleSwitcher";
import { getEffectiveRole } from "@/lib/role";

const OPERATOR_LINKS: ShellLink[] = [
  { label: "Dashboard", href: "", icon: "▦" },
  { label: "Clients", href: "/clients", icon: "🏢" },
  { label: "Schedule", href: "/schedule", icon: "📅" },
  { label: "Jobs", href: "/jobs", icon: "🧹" },
  { label: "Dispatch", href: "/dispatch", icon: "🛰️" },
  { label: "Invoices", href: "/invoices", icon: "🧾" },
  { label: "Employees", href: "/employees", icon: "👥" },
  { label: "Timeclock", href: "/timeclock", icon: "⏱️" },
  { label: "Ledger", href: "/ledger", icon: "📒" },
  { label: "AI co-pilot", href: "/ai", icon: "🤖" },
  { label: "Onboarding", href: "/onboarding", icon: "🪄" },
];

const EMPLOYEE_LINKS: ShellLink[] = [
  { label: "Today", href: "", icon: "📍" },
  { label: "My schedule", href: "/schedule", icon: "📅" },
  { label: "Clock in/out", href: "/timeclock", icon: "⏱️" },
];

const CUSTOMER_LINKS: ShellLink[] = [
  { label: "My bookings", href: "", icon: "📅" },
  { label: "Book again", href: "/book", icon: "✨" },
];

export default async function TenantLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const session = await auth();
  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=/t/${slug}`);
  }

  const membership = session.user.tenantMemberships.find(
    (m) => m.tenantSlug === slug,
  );
  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";

  if (!membership && !isSuperAdmin) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">No access to this tenant</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          You are signed in but not a member of {tenant.legalName}.
        </p>
      </main>
    );
  }

  const { role, entityId, impersonated } = await getEffectiveRole({
    tenantSlug: slug,
    membershipRole: membership?.role ?? null,
    isSuperAdmin,
  });

  // Resolve a friendly name for the banner
  let entityName: string | null = null;
  if (impersonated && entityId) {
    const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);
    if (role === "EMPLOYEE") {
      const e = await db.employee.findUnique({ where: { id: entityId } });
      if (e) entityName = `${e.firstName} ${e.lastName}`;
    } else if (role === "CUSTOMER") {
      const c = await db.customer.findUnique({ where: { id: entityId } });
      if (c) entityName = c.name ?? c.email;
    }
  }

  const baseLinks =
    role === "EMPLOYEE"
      ? EMPLOYEE_LINKS
      : role === "CUSTOMER"
        ? CUSTOMER_LINKS
        : OPERATOR_LINKS;

  const links: ShellLink[] = baseLinks.map((l) => ({
    ...l,
    href: l.href.startsWith("/book") ? l.href : `/t/${slug}${l.href}`,
  }));

  const areaLabel =
    role === "EMPLOYEE"
      ? entityName
        ? `Employee · ${entityName}`
        : "Employee"
      : role === "CUSTOMER"
        ? entityName
          ? `Customer · ${entityName}`
          : "Customer"
        : role === "MANAGER"
          ? "Operator (Manager)"
          : "Operator";

  return (
    <Shell
      brand={tenant.displayName ?? tenant.legalName}
      area={areaLabel}
      user={session.user}
      links={links}
      extraSidebar={
        isSuperAdmin ? (
          <RoleSwitcher
            tenantSlug={slug}
            currentRole={role}
            currentEntityId={entityId}
            impersonated={impersonated}
          />
        ) : null
      }
    >
      {impersonated ? (
        <ImpersonationBanner
          role={role}
          entityName={entityName}
          tenantName={tenant.legalName}
        />
      ) : null}
      {children}
    </Shell>
  );
}
