import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader, StatCard } from "@/components/Shell";

async function updateStatus(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  await db.employee.update({
    where: { id: String(formData.get("employeeId") ?? "") },
    data: {
      status: String(formData.get("status") ?? "GREEN") as
        | "GREEN"
        | "YELLOW"
        | "RED",
    },
  });
  revalidatePath(`/t/${slug}/employees`);
}

export default async function EmployeesListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);

  const employees = await db.employee.findMany({
    include: {
      _count: { select: { jobAssignments: true, timeEntries: true } },
      timeEntries: {
        where: { clockOut: null },
        take: 1,
      },
    },
    orderBy: [{ status: "desc" }, { firstName: "asc" }],
  });

  const byStatus = employees.reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    },
    { GREEN: 0, YELLOW: 0, RED: 0 } as Record<string, number>,
  );

  return (
    <>
      <PageHeader
        title="Employees"
        description="Your cleaning roster. Status color reflects current standing."
        actions={
          <Link
            href={`/t/${slug}/onboarding/employees`}
            className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
          >
            + Add employee
          </Link>
        }
      />

      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={String(employees.length)} />
        <StatCard label="Green" value={String(byStatus.GREEN)} hint="No documentation" />
        <StatCard label="Yellow" value={String(byStatus.YELLOW)} hint="Warning issued" />
        <StatCard label="Red" value={String(byStatus.RED)} hint="Final warning" />
      </section>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-left text-[10px] uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Pay rate</th>
              <th className="px-4 py-2">Pays via</th>
              <th className="px-4 py-2 text-right">Jobs</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No employees yet — add your first.
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {e.firstName} {e.lastName}
                      {e.timeEntries.length > 0 ? (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-900 dark:bg-blue-900/30 dark:text-blue-200">
                          ⏱ on shift
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-500">
                      {e.email ?? e.phone ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{e.employmentType}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    ${(e.payRateCents / 100).toFixed(2)}/
                    {e.payRateUnit.toLowerCase().replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {e.paymentMethod.toLowerCase().replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {e._count.jobAssignments}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={e.status} />
                  </td>
                  <td className="px-4 py-3">
                    <form action={updateStatus.bind(null, slug)} className="flex gap-1">
                      <input type="hidden" name="employeeId" value={e.id} />
                      <select
                        name="status"
                        defaultValue={e.status}
                        className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-2 py-1 text-xs"
                      >
                        <option value="GREEN">GREEN</option>
                        <option value="YELLOW">YELLOW</option>
                        <option value="RED">RED</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Set
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "GREEN"
      ? "bg-green-100 text-green-900 dark:bg-green-900/30"
      : status === "YELLOW"
        ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30"
        : "bg-red-100 text-red-900 dark:bg-red-900/30";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
