import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  getTenantBySlug,
  getOrCreateTenantClient,
} from "@operate/tenant-router";
import { TenantPrismaClient } from "@operate/db-tenant";
import { PageHeader, StatCard } from "@/components/Shell";
import { getEffectiveRole } from "@/lib/role";

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const session = await auth();
  const membership = session?.user.tenantMemberships.find(
    (m) => m.tenantSlug === slug,
  );
  const isSuperAdmin = session?.user.globalRole === "SUPER_ADMIN";
  const { role, entityId } = await getEffectiveRole({
    tenantSlug: slug,
    membershipRole: membership?.role ?? null,
    isSuperAdmin: Boolean(isSuperAdmin),
  });

  const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);

  if (role === "EMPLOYEE") {
    return <EmployeeTodayView db={db} employeeId={entityId} />;
  }

  if (role === "CUSTOMER") {
    return <CustomerHomeView db={db} customerId={entityId} />;
  }

  // OWNER / MANAGER — operator dashboard
  const [clients, locations, employees, openJobs] = await Promise.all([
    db.client.count(),
    db.location.count(),
    db.employee.count(),
    db.job.count({
      where: { status: { in: ["SCHEDULED", "EN_ROUTE", "IN_PROGRESS"] } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title={`${tenant.displayName ?? tenant.legalName} — dashboard`}
        description="Live snapshot of your business."
      />
      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Clients" value={String(clients)} />
        <StatCard label="Locations" value={String(locations)} />
        <StatCard label="Employees" value={String(employees)} />
        <StatCard label="Open jobs" value={String(openJobs)} />
      </section>
    </>
  );
}

async function EmployeeTodayView({
  db,
  employeeId,
}: {
  db: TenantPrismaClient;
  employeeId: string | null;
}) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const employee = employeeId
    ? await db.employee.findUnique({ where: { id: employeeId } })
    : null;

  const jobs = await db.job.findMany({
    where: {
      scheduledStart: { gte: todayStart, lt: todayEnd },
      ...(employeeId
        ? { assignments: { some: { employeeId } } }
        : {}),
    },
    include: {
      location: { include: { client: true } },
      unit: true,
      assignments: { include: { employee: true } },
    },
    orderBy: { scheduledStart: "asc" },
  });

  const openShift = employeeId
    ? await db.timeEntry.findFirst({
        where: { employeeId, clockOut: null },
        orderBy: { clockIn: "desc" },
      })
    : null;

  return (
    <>
      <PageHeader
        title={employee ? `Today — ${employee.firstName}` : "Today"}
        description={
          employee
            ? `Your jobs for ${todayStart.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}.`
            : "Pick a specific employee in the sidebar switcher to see their day."
        }
      />

      {openShift ? (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/20">
          <div className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
            ⏱ Clocked in
          </div>
          <div className="mt-1 text-sm">
            Since {openShift.clockIn.toLocaleString(undefined, { timeStyle: "short" })}
          </div>
        </div>
      ) : null}

      {jobs.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
          {employeeId
            ? "No jobs scheduled for today."
            : "No employee selected — use the sidebar switcher."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {jobs.map((j) => (
            <li
              key={j.id}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-sm text-gray-500">
                    {j.scheduledStart.toLocaleTimeString(undefined, { timeStyle: "short" })}
                    {" – "}
                    {j.scheduledEnd.toLocaleTimeString(undefined, { timeStyle: "short" })}
                  </div>
                  <div className="mt-1 font-medium">{j.location.client.businessName}</div>
                  <div className="text-sm text-gray-500">
                    {j.location.name}
                    {j.unit ? ` · Unit ${j.unit.unitNumber}` : ""}
                  </div>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                  {j.status.toLowerCase().replace("_", " ")}
                </span>
              </div>
              {j.notes ? (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{j.notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function CustomerHomeView({
  db,
  customerId,
}: {
  db: TenantPrismaClient;
  customerId: string | null;
}) {
  const customer = customerId
    ? await db.customer.findUnique({ where: { id: customerId } })
    : null;

  const bookings = customerId
    ? await db.booking.findMany({
        where: { customerId },
        orderBy: { scheduledStart: "desc" },
        take: 20,
      })
    : [];

  return (
    <>
      <PageHeader
        title={customer ? `Hi ${customer.name ?? customer.email}` : "My bookings"}
        description={
          customer
            ? "Your past and upcoming cleanings."
            : "Pick a specific customer in the sidebar switcher to see their bookings."
        }
      />

      {bookings.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
          {customerId ? "No bookings yet." : "No customer selected."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {bookings.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">
                    {b.scheduledStart.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                  <div className="text-sm text-gray-500">
                    {b.addressLine1}, {b.city}, {b.state} {b.postalCode}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">${(b.totalCents / 100).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{b.status}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
