import Link from "next/link";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

type View = "stack" | "week";

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const view: View = sp.view === "week" ? "week" : "stack";
  const { db } = await getTenantContext(slug);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 14);

  const jobs = await db.job.findMany({
    where: { scheduledStart: { gte: start, lt: end } },
    include: {
      location: { include: { client: true } },
      unit: true,
      assignments: { include: { employee: true } },
    },
    orderBy: { scheduledStart: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Next 14 days."
        actions={<ViewToggle slug={slug} current={view} />}
      />

      {view === "week" ? (
        <WeekGrid jobs={jobs} start={start} slug={slug} />
      ) : (
        <StackView jobs={jobs} start={start} slug={slug} />
      )}
    </>
  );
}

function ViewToggle({ slug, current }: { slug: string; current: View }) {
  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
      {(["stack", "week"] as const).map((v) => (
        <Link
          key={v}
          href={`/t/${slug}/schedule${v === "week" ? "?view=week" : ""}`}
          className={`rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition ${
            current === v
              ? "bg-accent-500/20 text-accent-200 ring-1 ring-accent-500/40"
              : "text-gray-300 hover:bg-white/[0.06]"
          }`}
        >
          {v === "stack" ? "Day stack" : "Week grid"}
        </Link>
      ))}
    </div>
  );
}

type JobWithRelations = Awaited<
  ReturnType<
    Awaited<ReturnType<typeof getTenantContext>>["db"]["job"]["findMany"]
  >
>[number] & {
  location: { client: { businessName: string }; name: string };
  unit: { unitNumber: string } | null;
  assignments: { employee: { firstName: string } }[];
};

function StackView({
  jobs,
  start,
  slug,
}: {
  jobs: JobWithRelations[];
  start: Date;
  slug: string;
}) {
  const byDay = new Map<string, JobWithRelations[]>();
  for (const j of jobs) {
    const key = j.scheduledStart.toISOString().slice(0, 10);
    const arr = byDay.get(key) ?? [];
    arr.push(j);
    byDay.set(key, arr);
  }
  const days: string[] = [];
  const cur = new Date(start);
  for (let i = 0; i < 14; i++) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mt-6 space-y-4">
      {days.map((day) => {
        const dayJobs = byDay.get(day) ?? [];
        const isToday = day === today;
        return (
          <div
            key={day}
            className={`rounded-xl border bg-white/[0.04] backdrop-blur-md p-4 ${
              isToday ? "border-accent-500/40" : "border-white/10"
            }`}
          >
            <div
              className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-accent-300" : "text-gray-300"}`}
            >
              {new Date(day + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
              {isToday ? " · today" : ""}
            </div>
            {dayJobs.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">No jobs scheduled.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {dayJobs.map((j) => (
                  <li key={j.id}>
                    <Link
                      href={`/t/${slug}/jobs`}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm transition hover:border-white/25"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-gray-300">
                          {j.scheduledStart.toISOString().slice(11, 16)}
                        </span>
                        <span className="font-medium text-gray-100">
                          {j.location.client.businessName}
                        </span>
                        <span className="text-gray-300">
                          {j.location.name}
                          {j.unit ? ` · ${j.unit.unitNumber}` : ""}
                        </span>
                      </div>
                      <div className="text-xs text-gray-300">
                        {j.assignments.map((a) => a.employee.firstName).join(", ") || "—"}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WeekGrid({
  jobs,
  start,
  slug,
}: {
  jobs: JobWithRelations[];
  start: Date;
  slug: string;
}) {
  // Lay out two consecutive weeks side-by-side in 7-day rows
  const weeks: string[][] = [];
  for (let w = 0; w < 2; w++) {
    const days: string[] = [];
    const cur = new Date(start);
    cur.setDate(cur.getDate() + w * 7);
    for (let i = 0; i < 7; i++) {
      days.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(days);
  }
  const byDay = new Map<string, JobWithRelations[]>();
  for (const j of jobs) {
    const k = j.scheduledStart.toISOString().slice(0, 10);
    const arr = byDay.get(k) ?? [];
    arr.push(j);
    byDay.set(k, arr);
  }
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mt-6 space-y-4">
      {weeks.map((week, wi) => (
        <div
          key={wi}
          className="grid grid-cols-1 gap-2 sm:grid-cols-7"
        >
          {week.map((day) => {
            const dayJobs = byDay.get(day) ?? [];
            const isToday = day === today;
            const date = new Date(day + "T00:00:00");
            return (
              <div
                key={day}
                className={`rounded-xl border bg-white/[0.03] backdrop-blur-md p-3 ${
                  isToday
                    ? "border-accent-500/40 ring-1 ring-accent-500/20"
                    : "border-white/10"
                }`}
              >
                <div
                  className={`flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-wide ${
                    isToday ? "text-accent-300" : "text-gray-300"
                  }`}
                >
                  <span>
                    {date.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                  <span className={isToday ? "text-accent-300" : "text-gray-400"}>
                    {date.getDate()}
                  </span>
                </div>
                {dayJobs.length === 0 ? (
                  <p className="mt-2 text-[11px] text-gray-500">—</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {dayJobs.slice(0, 4).map((j) => (
                      <li key={j.id}>
                        <Link
                          href={`/t/${slug}/jobs`}
                          className="block rounded border border-white/10 bg-white/[0.02] px-2 py-1.5 text-[11px] leading-tight transition hover:border-white/25"
                        >
                          <div className="font-mono text-[10px] text-gray-400">
                            {j.scheduledStart.toISOString().slice(11, 16)}
                          </div>
                          <div className="truncate font-medium text-gray-100">
                            {j.location.client.businessName}
                          </div>
                          <div className="truncate text-gray-400">
                            {j.unit?.unitNumber
                              ? `#${j.unit.unitNumber}`
                              : j.location.name}
                          </div>
                        </Link>
                      </li>
                    ))}
                    {dayJobs.length > 4 ? (
                      <li className="text-center text-[10px] text-gray-400">
                        +{dayJobs.length - 4} more
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
