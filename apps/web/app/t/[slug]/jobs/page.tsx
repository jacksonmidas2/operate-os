import Link from "next/link";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

const ALL_STATUSES = [
  "SCHEDULED",
  "EN_ROUTE",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

const DATE_RANGES = [
  { key: "all", label: "Any date" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
] as const;

type StatusFilter = (typeof ALL_STATUSES)[number];
type DateRangeKey = (typeof DATE_RANGES)[number]["key"];

function dateRangeFor(key: DateRangeKey): { gte?: Date; lt?: Date } {
  const now = new Date();
  if (key === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { gte: start, lt: end };
  }
  if (key === "week") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay()); // Sunday
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { gte: start, lt: end };
  }
  if (key === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { gte: start, lt: end };
  }
  return {};
}

export default async function JobsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    status?: string;
    client?: string;
    range?: string;
    q?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { db } = await getTenantContext(slug);

  const statusFilter = ALL_STATUSES.find((s) => s === sp.status) as
    | StatusFilter
    | undefined;
  const clientFilter = sp.client && sp.client !== "all" ? sp.client : undefined;
  const rangeFilter = (
    DATE_RANGES.find((d) => d.key === sp.range)?.key ?? "all"
  ) as DateRangeKey;
  const q = (sp.q ?? "").trim().toLowerCase();

  const range = dateRangeFor(rangeFilter);

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(clientFilter
      ? { location: { clientId: clientFilter } }
      : {}),
    ...(range.gte ? { scheduledStart: { gte: range.gte, lt: range.lt } } : {}),
  };

  const [jobs, clients, statusCounts] = await Promise.all([
    db.job.findMany({
      where,
      include: {
        location: { include: { client: true } },
        unit: true,
        assignments: { include: { employee: true } },
      },
      orderBy: { scheduledStart: "desc" },
      take: 200,
    }),
    db.client.findMany({
      select: { id: true, businessName: true },
      orderBy: { businessName: "asc" },
    }),
    db.job.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  // Client-side filter for q (text search) — small dataset
  const filtered = q
    ? jobs.filter(
        (j) =>
          j.location.client.businessName.toLowerCase().includes(q) ||
          j.location.name.toLowerCase().includes(q) ||
          (j.unit?.unitNumber?.toLowerCase().includes(q) ?? false) ||
          j.assignments.some((a) =>
            `${a.employee.firstName} ${a.employee.lastName}`
              .toLowerCase()
              .includes(q),
          ),
      )
    : jobs;

  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count._all]),
  ) as Record<string, number>;
  const totalCount = statusCounts.reduce((sum, s) => sum + s._count._all, 0);

  const baseQuery = (overrides: Record<string, string | undefined>) => {
    const params: Record<string, string> = {};
    if (sp.status) params.status = sp.status;
    if (sp.client) params.client = sp.client;
    if (sp.range) params.range = sp.range;
    if (sp.q) params.q = sp.q;
    Object.assign(params, overrides);
    for (const k of Object.keys(params)) {
      if (params[k] === undefined || params[k] === "") delete params[k];
    }
    const qs = new URLSearchParams(params).toString();
    return qs ? `?${qs}` : "";
  };

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Every scheduled, in-progress, and completed cleaning."
        actions={
          <Link
            href={`/t/${slug}/jobs/new`}
            className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
          >
            + New job
          </Link>
        }
      />

      {/* ── Status filter pills ─────────────────────────── */}
      <section className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/t/${slug}/jobs${baseQuery({ status: undefined })}`}
          className={pillClass(!statusFilter)}
        >
          All <span className="ml-1.5 text-xs text-gray-400">{totalCount}</span>
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/t/${slug}/jobs${baseQuery({ status: s })}`}
            className={pillClass(statusFilter === s)}
          >
            {s.replace("_", " ").toLowerCase()}
            <span className="ml-1.5 text-xs text-gray-400">
              {countByStatus[s] ?? 0}
            </span>
          </Link>
        ))}
      </section>

      {/* ── Secondary filters ───────────────────────────── */}
      <form
        method="get"
        className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-12"
      >
        {/* Preserve status pill choice */}
        {statusFilter ? (
          <input type="hidden" name="status" value={statusFilter} />
        ) : null}

        <select
          name="client"
          defaultValue={clientFilter ?? "all"}
          className="sm:col-span-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100"
        >
          <option value="all">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.businessName}
            </option>
          ))}
        </select>

        <select
          name="range"
          defaultValue={rangeFilter}
          className="sm:col-span-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100"
        >
          {DATE_RANGES.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>

        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search client, location, unit, or employee…"
          className="sm:col-span-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500"
        />

        <button
          type="submit"
          className="sm:col-span-1 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-medium text-gray-100 hover:bg-white/[0.1]"
        >
          Apply
        </button>
      </form>

      {/* ── Results table ───────────────────────────────── */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.06] text-left text-[10px] uppercase tracking-wider text-gray-300">
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Client</th>
              <th className="px-4 py-2.5">Location</th>
              <th className="px-4 py-2.5">Unit</th>
              <th className="px-4 py-2.5">Assigned</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No jobs match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((j) => (
                <tr key={j.id} className="hover:bg-white/[0.04]">
                  <td className="px-4 py-3 font-mono text-gray-300">
                    {j.scheduledStart.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-100">
                    {j.location.client.businessName}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{j.location.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-300">
                    {j.unit?.unitNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {j.assignments
                      .map((a) => `${a.employee.firstName} ${a.employee.lastName}`)
                      .join(", ") || (
                      <span className="text-gray-500">unassigned</span>
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

      <p className="mt-3 text-xs text-gray-400">
        Showing {filtered.length} of {jobs.length} loaded (cap 200).{" "}
        {totalCount > 200 ? "Use filters to narrow." : null}
      </p>
    </>
  );
}

function pillClass(active: boolean): string {
  return `rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition ${
    active
      ? "border-accent-500/50 bg-accent-500/15 text-accent-200"
      : "border-white/10 bg-white/[0.04] text-gray-300 hover:border-white/25 hover:bg-white/[0.08]"
  }`;
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "COMPLETED"
      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
      : status === "IN_PROGRESS" || status === "EN_ROUTE"
        ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30"
        : status === "CANCELLED" || status === "NO_SHOW"
          ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/30"
          : "bg-white/[0.06] text-gray-200 ring-1 ring-white/10";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${color}`}
    >
      {status.replace("_", " ").toLowerCase()}
    </span>
  );
}
