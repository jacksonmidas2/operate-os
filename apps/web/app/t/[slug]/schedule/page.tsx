import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";
import {
  SchedulerBuilder,
  type BuilderLocation,
  type BuilderEmployee,
  type EditState,
} from "./SchedulerBuilder";
import { initialsOf, avatarColor } from "./avatar";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function hm(d: Date): string {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 3_600_000;
}

// ── server actions ───────────────────────────────────────────────────
async function saveAssignment(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  const jobId = String(formData.get("jobId") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const employeeIds = formData.getAll("employeeIds").map(String).filter(Boolean);
  if (!locationId || !date || !start || !end) return;

  const scheduledStart = new Date(`${date}T${start}:00`);
  const scheduledEnd = new Date(`${date}T${end}:00`);

  if (jobId) {
    await db.job.update({
      where: { id: jobId },
      data: { locationId, scheduledStart, scheduledEnd },
    });
    await db.jobAssignment.deleteMany({ where: { jobId } });
    if (employeeIds.length > 0) {
      await db.jobAssignment.createMany({
        data: employeeIds.map((eid) => ({ jobId, employeeId: eid })),
      });
    }
  } else {
    const job = await db.job.create({
      data: { locationId, scheduledStart, scheduledEnd },
    });
    if (employeeIds.length > 0) {
      await db.jobAssignment.createMany({
        data: employeeIds.map((eid) => ({ jobId: job.id, employeeId: eid })),
      });
    }
  }
  revalidatePath(`/t/${slug}/schedule`);
  redirect(`/t/${slug}/schedule?date=${date}`);
}

async function deleteJob(slug: string, jobId: string, date: string) {
  "use server";
  const { db } = await getTenantContext(slug);
  await db.job.delete({ where: { id: jobId } });
  revalidatePath(`/t/${slug}/schedule`);
  redirect(`/t/${slug}/schedule?date=${date}`);
}

// ── page ─────────────────────────────────────────────────────────────
export default async function SchedulerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; edit?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { db } = await getTenantContext(slug);

  const isYmd = (s: string | undefined): s is string =>
    !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const date = isYmd(sp.date) ? sp.date : ymd(new Date());

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const [dayJobs, locationsRaw, employeesRaw, editJob] = await Promise.all([
    db.job.findMany({
      where: { scheduledStart: { gte: dayStart, lt: dayEnd } },
      include: {
        location: { include: { client: true } },
        unit: true,
        assignments: { include: { employee: true } },
      },
      orderBy: { scheduledStart: "asc" },
    }),
    db.location.findMany({ include: { client: true }, orderBy: { name: "asc" } }),
    db.employee.findMany({ orderBy: [{ firstName: "asc" }] }),
    sp.edit
      ? db.job.findUnique({
          where: { id: sp.edit },
          include: { assignments: true },
        })
      : Promise.resolve(null),
  ]);

  const locations: BuilderLocation[] = locationsRaw.map((l) => ({
    id: l.id,
    label: `${l.client.businessName} — ${l.name}`,
  }));
  const employees: BuilderEmployee[] = employeesRaw.map((e) => ({
    id: e.id,
    name: `${e.firstName} ${e.lastName}`,
  }));

  const edit: EditState | null = editJob
    ? {
        jobId: editJob.id,
        locationId: editJob.locationId,
        date: ymd(editJob.scheduledStart),
        start: hm(editJob.scheduledStart),
        end: hm(editJob.scheduledEnd),
        employeeIds: editJob.assignments.map((a) => a.employeeId),
      }
    : null;

  // Day summary
  const distinctEmployees = new Set<string>();
  let totalLaborHours = 0;
  for (const j of dayJobs) {
    totalLaborHours += hoursBetween(j.scheduledStart, j.scheduledEnd) * j.assignments.length;
    for (const a of j.assignments) distinctEmployees.add(a.employeeId);
  }

  const dayDate = new Date(`${date}T00:00:00`);
  const prev = new Date(dayDate);
  prev.setUTCDate(prev.getUTCDate() - 1);
  const next = new Date(dayDate);
  next.setUTCDate(next.getUTCDate() + 1);
  const dateLabel = dayDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <PageHeader
        title="Scheduler"
        description="Assign employees to jobs and manage daily schedules."
        actions={
          <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
            <Link
              href={`/t/${slug}/schedule?date=${ymd(prev)}`}
              className="rounded-md px-2.5 py-1.5 text-sm text-gray-300 hover:bg-white/[0.06]"
              aria-label="Previous day"
            >
              ‹
            </Link>
            <Link
              href={`/t/${slug}/schedule`}
              className="rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-200 hover:bg-white/[0.06]"
            >
              Today
            </Link>
            <Link
              href={`/t/${slug}/schedule?date=${ymd(next)}`}
              className="rounded-md px-2.5 py-1.5 text-sm text-gray-300 hover:bg-white/[0.06]"
              aria-label="Next day"
            >
              ›
            </Link>
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(320px,380px)_1fr]">
        {/* Left: assignment builder */}
        <SchedulerBuilder
          locations={locations}
          employees={employees}
          defaultDate={date}
          edit={edit}
          saveAction={saveAssignment.bind(null, slug)}
        />

        {/* Right: day schedule */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-white">
              Schedule for {dateLabel}
            </h2>
            <div className="flex gap-2">
              <a
                href={`/t/${slug}/schedule/export?format=excel&date=${date}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
              >
                ⬇ Export Excel
              </a>
              <a
                href={`/t/${slug}/schedule/export?format=pdf&date=${date}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/20"
              >
                ⬇ Export PDF
              </a>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-left text-[10px] uppercase tracking-wider text-gray-300">
                <tr>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Location / job</th>
                  <th className="px-4 py-2.5">Employees assigned</th>
                  <th className="px-4 py-2.5 text-right">Hours</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dayJobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-gray-400"
                    >
                      No jobs scheduled for this day. Build one on the left.
                    </td>
                  </tr>
                ) : (
                  dayJobs.map((j) => {
                    const perPerson = hoursBetween(
                      j.scheduledStart,
                      j.scheduledEnd,
                    );
                    return (
                      <tr key={j.id} className="align-top">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-200">
                          {hm(j.scheduledStart)}
                          <div className="text-gray-500">– {hm(j.scheduledEnd)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-100">
                            {j.location.client.businessName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {j.location.name}
                            {j.unit ? ` · #${j.unit.unitNumber}` : ""}
                          </div>
                          <div className="text-xs text-gray-500">
                            {j.location.addressLine1}, {j.location.city},{" "}
                            {j.location.state} {j.location.postalCode}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {j.assignments.length === 0 ? (
                            <span className="text-xs text-gray-500">
                              Unassigned
                            </span>
                          ) : (
                            <ul className="space-y-1">
                              {j.assignments.map((a) => {
                                const nm = `${a.employee.firstName} ${a.employee.lastName}`;
                                return (
                                  <li
                                    key={a.id}
                                    className="flex items-center gap-2"
                                  >
                                    <span
                                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarColor(a.employeeId)}`}
                                    >
                                      {initialsOf(nm)}
                                    </span>
                                    <span className="text-xs text-gray-100">
                                      {nm}
                                    </span>
                                    <span className="text-emerald-400">✓</span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-gray-200">
                          {perPerson.toFixed(2)}
                          <div className="text-[10px] uppercase text-gray-500">
                            each
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/t/${slug}/schedule?date=${date}&edit=${j.id}`}
                              className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-gray-200 hover:bg-white/[0.08]"
                              aria-label="Edit assignment"
                            >
                              ✏️
                            </Link>
                            <form action={deleteJob.bind(null, slug, j.id, date)}>
                              <button
                                type="submit"
                                className="rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                                aria-label="Delete assignment"
                              >
                                🗑️
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Summary bar */}
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3">
            <Summary label="Total jobs" value={String(dayJobs.length)} icon="📅" />
            <Summary
              label="Total employees"
              value={String(distinctEmployees.size)}
              icon="👥"
            />
            <Summary
              label="Total labor hours"
              value={totalLaborHours.toFixed(2)}
              icon="⏱️"
            />
          </div>
        </div>
      </div>
    </>
  );
}

function Summary({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-base">
        {icon}
      </span>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-gray-400">
          {label}
        </div>
        <div className="text-lg font-semibold text-white">{value}</div>
      </div>
    </div>
  );
}
