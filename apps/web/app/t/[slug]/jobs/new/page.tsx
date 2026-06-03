import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

async function createJob(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  const start = new Date(String(formData.get("scheduledStart")));
  const durationMin = Number(formData.get("duration") ?? "120");
  const end = new Date(start.getTime() + durationMin * 60_000);

  const job = await db.job.create({
    data: {
      locationId: String(formData.get("locationId") ?? ""),
      unitId: formData.get("unitId") ? String(formData.get("unitId")) : null,
      scheduledStart: start,
      scheduledEnd: end,
      serviceType: String(formData.get("serviceType") ?? "TURNOVER") as
        | "TURNOVER"
        | "RECURRING"
        | "DEEP_CLEAN"
        | "POST_CONSTRUCTION"
        | "MOVE_IN_MOVE_OUT"
        | "ONE_TIME",
      notes: (String(formData.get("notes") ?? "") || null) as string | null,
    },
  });

  const employeeIds = formData.getAll("employeeIds").map(String).filter(Boolean);
  if (employeeIds.length > 0) {
    await db.jobAssignment.createMany({
      data: employeeIds.map((eid) => ({ jobId: job.id, employeeId: eid })),
    });
  }

  redirect(`/t/${slug}/jobs`);
}

export default async function NewJobPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);
  const [locations, employees] = await Promise.all([
    db.location.findMany({
      include: { client: true, units: true },
      orderBy: { name: "asc" },
    }),
    db.employee.findMany({ orderBy: { firstName: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="New job" description="Schedule a cleaning." />

      <form
        action={createJob.bind(null, slug)}
        className="mt-6 grid max-w-2xl grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2"
      >
        <label className="block sm:col-span-2">
          <span className="block text-sm font-medium">Location</span>
          <select name="locationId" required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
            {locations.length === 0 ? (
              <option value="">no locations — add one first</option>
            ) : (
              locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.client.businessName} — {l.name}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Unit (optional)</span>
          <select name="unitId" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">— whole location —</option>
            {locations.flatMap((l) =>
              l.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {l.name} · {u.unitNumber}
                </option>
              )),
            )}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Service</span>
          <select name="serviceType" defaultValue="TURNOVER" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="TURNOVER">Turnover</option>
            <option value="RECURRING">Recurring</option>
            <option value="DEEP_CLEAN">Deep clean</option>
            <option value="MOVE_IN_MOVE_OUT">Move-in/out</option>
            <option value="ONE_TIME">One-time</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Start</span>
          <input
            name="scheduledStart"
            type="datetime-local"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Duration (minutes)</span>
          <input
            name="duration"
            type="number"
            defaultValue={120}
            min={15}
            step={15}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="block text-sm font-medium">Assigned employees</span>
          <select
            name="employeeIds"
            multiple
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            size={4}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-gray-500">Ctrl/Cmd+click to multi-select.</span>
        </label>

        <label className="block sm:col-span-2">
          <span className="block text-sm font-medium">Notes</span>
          <textarea
            name="notes"
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Schedule job
          </button>
        </div>
      </form>
    </>
  );
}
