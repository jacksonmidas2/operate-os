import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getTenantContext } from "@/lib/tenant-db";
import { getEffectiveRole } from "@/lib/role";
import { PageHeader } from "@/components/Shell";

async function clockIn(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  await db.timeEntry.create({
    data: {
      employeeId: String(formData.get("employeeId") ?? ""),
      jobId: formData.get("jobId") ? String(formData.get("jobId")) : null,
      clockIn: new Date(),
    },
  });
  revalidatePath(`/t/${slug}/timeclock`);
}

async function clockOut(slug: string, entryId: string) {
  "use server";
  const { db } = await getTenantContext(slug);
  const entry = await db.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.clockOut) return;
  const clockOut = new Date();
  const minutes = Math.round(
    (clockOut.getTime() - entry.clockIn.getTime()) / 60_000,
  );
  await db.timeEntry.update({
    where: { id: entryId },
    data: { clockOut, minutes },
  });
  revalidatePath(`/t/${slug}/timeclock`);
}

export default async function TimeclockPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);

  // If the viewer is impersonating a specific employee, pre-select them.
  const session = await auth();
  const isSuperAdmin = session?.user.globalRole === "SUPER_ADMIN";
  const membership = session?.user.tenantMemberships.find(
    (m) => m.tenantSlug === slug,
  );
  const { entityId: impersonatedEmployeeId } = await getEffectiveRole({
    tenantSlug: slug,
    membershipRole: membership?.role ?? null,
    isSuperAdmin: Boolean(isSuperAdmin),
  });

  const [openEntries, employees] = await Promise.all([
    db.timeEntry.findMany({
      where: { clockOut: null },
      include: { employee: true, job: { include: { location: true } } },
      orderBy: { clockIn: "desc" },
    }),
    db.employee.findMany({ orderBy: { firstName: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Timeclock"
        description="Clock in/out. Time entries roll into payroll + job profitability."
      />

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          action={clockIn.bind(null, slug)}
          className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 className="text-base font-semibold">Clock in</h2>
          <label className="block">
            <span className="block text-sm font-medium">Employee</span>
            <select
              name="employeeId"
              required
              defaultValue={impersonatedEmployeeId ?? undefined}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
            {impersonatedEmployeeId ? (
              <span className="mt-1 block text-xs text-purple-700 dark:text-purple-300">
                Pre-selected from your impersonation override.
              </span>
            ) : null}
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Clock in now
          </button>
        </form>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-semibold">Open shifts</h2>
          {openEntries.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No one is clocked in.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
              {openEntries.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">
                      {e.employee.firstName} {e.employee.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      since {e.clockIn.toISOString().slice(11, 16)} UTC
                      {e.job ? ` · ${e.job.location.name}` : ""}
                    </div>
                  </div>
                  <form action={clockOut.bind(null, slug, e.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Clock out
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
