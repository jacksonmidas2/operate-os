import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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

  // Group by day
  const byDay = new Map<string, typeof jobs>();
  for (const j of jobs) {
    const key = j.scheduledStart.toISOString().slice(0, 10);
    const arr = byDay.get(key) ?? [];
    arr.push(j);
    byDay.set(key, arr);
  }

  const days: string[] = [];
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Next 14 days. Click any job to manage assignments."
      />

      <div className="mt-6 space-y-4">
        {days.map((day) => {
          const dayJobs = byDay.get(day) ?? [];
          return (
            <div
              key={day}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {new Date(day + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              {dayJobs.length === 0 ? (
                <p className="mt-2 text-sm text-gray-400">No jobs scheduled.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {dayJobs.map((j) => (
                    <li
                      key={j.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-gray-500">
                          {j.scheduledStart.toISOString().slice(11, 16)}
                        </span>
                        <span className="font-medium">{j.location.client.businessName}</span>
                        <span className="text-gray-500">
                          {j.location.name}
                          {j.unit ? ` · ${j.unit.unitNumber}` : ""}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {j.assignments.map((a) => a.employee.firstName).join(", ") || "—"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
