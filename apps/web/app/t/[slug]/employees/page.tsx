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

async function updatePay(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  const id = String(formData.get("employeeId") ?? "");
  if (!id) return;
  const rateRaw = String(formData.get("rate") ?? "").trim();
  const dollars = rateRaw === "" ? 0 : Math.max(0, Number(rateRaw) || 0);
  await db.employee.update({
    where: { id },
    data: {
      payRateCents: Math.round(dollars * 100),
      payRateUnit: String(formData.get("unit") ?? "HOURLY") as
        | "HOURLY"
        | "PER_VISIT"
        | "FLAT_MONTHLY"
        | "PER_UNIT",
      paymentMethod: String(formData.get("method") ?? "ZELLE") as
        | "ZELLE"
        | "DIRECT_DEPOSIT"
        | "CHECK"
        | "CASH"
        | "PAYPAL"
        | "VENMO",
    },
  });
  revalidatePath(`/t/${slug}/employees`);
}

async function clearPay(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  const id = String(formData.get("employeeId") ?? "");
  if (!id) return;
  await db.employee.update({ where: { id }, data: { payRateCents: 0 } });
  revalidatePath(`/t/${slug}/employees`);
}

async function updateEmployee(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  const id = String(formData.get("employeeId") ?? "");
  if (!id) return;
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  if (!firstName) return;
  await db.employee.update({
    where: { id },
    data: {
      firstName,
      lastName,
      employmentType: String(formData.get("employmentType") ?? "CONTRACTOR") as
        | "W2"
        | "CONTRACTOR",
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
              <th className="px-4 py-2">Name &amp; type</th>
              <th className="px-4 py-2">Pay</th>
              <th className="px-4 py-2 text-right">Jobs</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No employees yet — add your first.
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <form
                      action={updateEmployee.bind(null, slug)}
                      className="flex flex-col gap-1.5"
                    >
                      <input type="hidden" name="employeeId" value={e.id} />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          name="firstName"
                          defaultValue={e.firstName}
                          placeholder="First"
                          className="w-24 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-gray-100"
                        />
                        <input
                          name="lastName"
                          defaultValue={e.lastName}
                          placeholder="Last"
                          className="w-28 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-gray-100"
                        />
                        {e.timeEntries.length > 0 ? (
                          <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300 ring-1 ring-blue-500/30">
                            ⏱ on shift
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          name="employmentType"
                          defaultValue={e.employmentType}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-gray-100"
                        >
                          <option value="CONTRACTOR">Contractor</option>
                          <option value="W2">Employee</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-gray-100 hover:bg-white/[0.08]"
                        >
                          Save
                        </button>
                        <span className="text-xs text-gray-400">
                          {e.email ?? e.phone ?? "—"}
                        </span>
                      </div>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <form
                      action={updatePay.bind(null, slug)}
                      className="flex flex-wrap items-center gap-1.5"
                    >
                      <input type="hidden" name="employeeId" value={e.id} />
                      <span className="text-gray-400">$</span>
                      <input
                        name="rate"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={
                          e.payRateCents > 0
                            ? (e.payRateCents / 100).toFixed(2)
                            : ""
                        }
                        placeholder="—"
                        className="w-20 rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-2 py-1 text-xs"
                      />
                      <select
                        name="unit"
                        defaultValue={e.payRateUnit}
                        className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-2 py-1 text-xs"
                      >
                        <option value="HOURLY">/hr</option>
                        <option value="PER_VISIT">/visit</option>
                        <option value="FLAT_MONTHLY">/mo</option>
                        <option value="PER_UNIT">/unit</option>
                      </select>
                      <select
                        name="method"
                        defaultValue={e.paymentMethod}
                        className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-2 py-1 text-xs"
                      >
                        <option value="ZELLE">Zelle</option>
                        <option value="DIRECT_DEPOSIT">Direct deposit</option>
                        <option value="CHECK">Check</option>
                        <option value="CASH">Cash</option>
                        <option value="PAYPAL">PayPal</option>
                        <option value="VENMO">Venmo</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-2 py-1 text-xs hover:bg-white/[0.08]"
                      >
                        Save
                      </button>
                      <button
                        formAction={clearPay.bind(null, slug)}
                        className="rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                        title="Clear this employee's pay rate"
                      >
                        Clear
                      </button>
                    </form>
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
                        className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-2 py-1 text-xs hover:bg-white/[0.08]"
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
      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
      : status === "YELLOW"
        ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
        : "bg-red-500/15 text-red-300 ring-1 ring-red-500/30";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
