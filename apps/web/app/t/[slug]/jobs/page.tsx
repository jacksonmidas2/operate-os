import Link from "next/link";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

export default async function JobsListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);
  const jobs = await db.job.findMany({
    include: {
      location: { include: { client: true } },
      unit: true,
      assignments: { include: { employee: true } },
    },
    orderBy: { scheduledStart: "desc" },
    take: 50,
  });

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Every scheduled, in-progress, and completed cleaning."
        actions={
          <Link
            href={`/t/${slug}/jobs/new`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + New job
          </Link>
        }
      />

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2">Assigned</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No jobs yet — create your first.
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-3 font-mono">
                    {j.scheduledStart.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">{j.location.client.businessName}</td>
                  <td className="px-4 py-3">{j.location.name}</td>
                  <td className="px-4 py-3 font-mono">{j.unit?.unitNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    {j.assignments
                      .map((a) => `${a.employee.firstName} ${a.employee.lastName}`)
                      .join(", ") || (
                      <span className="text-gray-400">unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={j.status} />
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
    status === "COMPLETED"
      ? "bg-green-100 text-green-900 dark:bg-green-900/30"
      : status === "IN_PROGRESS" || status === "EN_ROUTE"
        ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30"
        : status === "CANCELLED" || status === "NO_SHOW"
          ? "bg-red-100 text-red-900 dark:bg-red-900/30"
          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${color}`}>
      {status.replace("_", " ")}
    </span>
  );
}
