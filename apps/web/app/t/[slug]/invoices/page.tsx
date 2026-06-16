import Link from "next/link";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

const ALL_STATUSES = [
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "VOIDED",
] as const;

type StatusFilter = (typeof ALL_STATUSES)[number] | "overdue";

export default async function InvoicesListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; filter?: string; q?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { db } = await getTenantContext(slug);

  const statusFilter = ALL_STATUSES.find((s) => s === sp.status);
  const isOverdueLens = sp.filter === "overdue";
  const q = (sp.q ?? "").trim().toLowerCase();

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(isOverdueLens
      ? {
          status: { in: ["SENT" as const, "PARTIALLY_PAID" as const] },
          dueOn: { lt: new Date(), not: null },
        }
      : {}),
  };

  const [invoices, statusCounts] = await Promise.all([
    db.invoice.findMany({
      where,
      include: { client: true, _count: { select: { lines: true } } },
      orderBy: { issuedOn: "desc" },
      take: 200,
    }),
    db.invoice.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { totalCents: true },
    }),
  ]);

  const filtered = q
    ? invoices.filter(
        (i) =>
          i.client.businessName.toLowerCase().includes(q) ||
          i.number.toLowerCase().includes(q),
      )
    : invoices;

  const totals = statusCounts.reduce(
    (acc, s) => {
      const v = Number(s._sum.totalCents ?? 0);
      acc.all += v;
      if (s.status === "PAID") acc.paid += v;
      if (s.status === "SENT" || s.status === "PARTIALLY_PAID")
        acc.outstanding += v;
      return acc;
    },
    { all: 0, paid: 0, outstanding: 0 },
  );

  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count._all]),
  ) as Record<string, number>;
  const totalCount = statusCounts.reduce((sum, s) => sum + s._count._all, 0);

  const baseQuery = (overrides: Record<string, string | undefined>) => {
    const next: Record<string, string> = {};
    if (sp.status) next.status = sp.status;
    if (sp.filter) next.filter = sp.filter;
    if (sp.q) next.q = sp.q;
    Object.assign(next, overrides);
    for (const k of Object.keys(next))
      if (!next[k]) delete next[k];
    const qs = new URLSearchParams(next).toString();
    return qs ? `?${qs}` : "";
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Track billing, collection, and aging."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/t/${slug}/reminders`}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-100 hover:bg-white/[0.08]"
            >
              Payment reminders
            </Link>
            <Link
              href={`/t/${slug}/invoices/new`}
              className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
            >
              + New invoice
            </Link>
          </div>
        }
      />

      {/* ── Money summary ──────────────────────────────── */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total billed" value={fmt(totals.all)} />
        <SummaryCard label="Paid" value={fmt(totals.paid)} tone="success" />
        <SummaryCard
          label="Outstanding"
          value={fmt(totals.outstanding)}
          tone={totals.outstanding > 0 ? "warn" : "muted"}
        />
      </section>

      {/* ── Filter pills ───────────────────────────────── */}
      <section className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/t/${slug}/invoices${baseQuery({ status: undefined, filter: undefined })}`}
          className={pillClass(!statusFilter && !isOverdueLens)}
        >
          All <span className="ml-1.5 text-xs text-gray-400">{totalCount}</span>
        </Link>
        <Link
          href={`/t/${slug}/invoices${baseQuery({ status: undefined, filter: "overdue" })}`}
          className={pillClass(isOverdueLens, "red")}
        >
          Overdue
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/t/${slug}/invoices${baseQuery({ status: s, filter: undefined })}`}
            className={pillClass(statusFilter === s)}
          >
            {s.replace("_", " ").toLowerCase()}
            <span className="ml-1.5 text-xs text-gray-400">
              {countByStatus[s] ?? 0}
            </span>
          </Link>
        ))}
      </section>

      {/* ── Search ─────────────────────────────────────── */}
      <form method="get" className="mt-3">
        {statusFilter ? (
          <input type="hidden" name="status" value={statusFilter} />
        ) : null}
        {isOverdueLens ? (
          <input type="hidden" name="filter" value="overdue" />
        ) : null}
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search invoice number or client…"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 sm:max-w-md"
        />
      </form>

      {/* ── Table ──────────────────────────────────────── */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.06] text-left text-[10px] uppercase tracking-wider text-gray-300">
            <tr>
              <th className="px-4 py-2.5">Number</th>
              <th className="px-4 py-2.5">Client</th>
              <th className="px-4 py-2.5">Issued</th>
              <th className="px-4 py-2.5">Due</th>
              <th className="px-4 py-2.5 text-right">Total</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No invoices match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((i) => {
                const overdue =
                  i.dueOn &&
                  i.dueOn < new Date() &&
                  (i.status === "SENT" || i.status === "PARTIALLY_PAID");
                return (
                  <tr key={i.id} className="hover:bg-white/[0.04]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/t/${slug}/invoices/${i.number}`}
                        className="font-mono text-accent-300 hover:text-accent-200"
                      >
                        {i.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-100">
                      {i.client.businessName}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-300">
                      {i.issuedOn.toISOString().slice(0, 10)}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono ${overdue ? "text-red-300" : "text-gray-300"}`}
                    >
                      {i.dueOn?.toISOString().slice(0, 10) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-100">
                      ${(i.totalCents / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={overdue ? "OVERDUE" : i.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function pillClass(active: boolean, tone: "default" | "red" = "default"): string {
  if (active && tone === "red") {
    return "rounded-full border border-red-500/40 bg-red-500/15 text-red-200 px-3 py-1 text-xs font-medium uppercase tracking-wide";
  }
  return `rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition ${
    active
      ? "border-accent-500/50 bg-accent-500/15 text-accent-200"
      : "border-white/10 bg-white/[0.04] text-gray-300 hover:border-white/25 hover:bg-white/[0.08]"
  }`;
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warn" | "muted";
}) {
  const valueColor =
    tone === "success"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "muted"
          ? "text-gray-200"
          : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-300">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${valueColor}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "PAID"
      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
      : status === "OVERDUE"
        ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/30"
        : status === "SENT" || status === "PARTIALLY_PAID"
          ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30"
          : "bg-white/[0.06] text-gray-200 ring-1 ring-white/10";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${color}`}
    >
      {status.replace("_", " ").toLowerCase()}
    </span>
  );
}

function fmt(cents: number): string {
  const v = (cents / 100).toFixed(2);
  return cents < 0 ? `-$${v.slice(1)}` : `$${v}`;
}
