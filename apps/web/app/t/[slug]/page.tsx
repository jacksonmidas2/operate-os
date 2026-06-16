import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  getTenantBySlug,
  getOrCreateTenantClient,
} from "@operate/tenant-router";
import { TenantPrismaClient } from "@operate/db-tenant";
import { PageHeader } from "@/components/Shell";
import { getEffectiveRole } from "@/lib/role";

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const session = await auth();
  const membership = session?.user.tenantMemberships.find(
    (m) => m.tenantSlug === slug,
  );
  const isSuperAdmin = session?.user.globalRole === "SUPER_ADMIN";
  const { role, entityId } = await getEffectiveRole({
    tenantSlug: slug,
    membershipRole: membership?.role ?? null,
    isSuperAdmin: Boolean(isSuperAdmin),
  });

  const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);

  if (role === "EMPLOYEE") {
    return <EmployeeTodayView db={db} employeeId={entityId} />;
  }

  if (role === "CUSTOMER") {
    return <CustomerHomeView db={db} customerId={entityId} />;
  }

  return <OperatorDashboard db={db} tenantSlug={slug} tenantName={tenant.displayName ?? tenant.legalName} />;
}

// ─────────────────────────────────────────────────────────────────────
// Operator dashboard — the page Marilu sees when she signs in
// ─────────────────────────────────────────────────────────────────────

async function OperatorDashboard({
  db,
  tenantSlug,
  tenantName,
}: {
  db: TenantPrismaClient;
  tenantSlug: string;
  tenantName: string;
}) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const weekStart = (() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay()); // Sunday
    return d;
  })();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Fire every query in parallel — single round-trip wall time.
  const [
    invoicedThisMonth,
    paidThisMonth,
    overdueInvoices,
    openJobsCount,
    jobsThisWeek,
    todayJobs,
    topClients,
    leadsCounts,
    newLeads,
    recentJobs,
    totalEmployees,
    totalLocations,
  ] = await Promise.all([
    // Revenue billed MTD (sum of invoice totals issued this month)
    db.invoice.aggregate({
      _sum: { totalCents: true },
      where: {
        issuedOn: { gte: monthStart, lt: monthEnd },
        status: { in: ["SENT", "PARTIALLY_PAID", "PAID"] },
      },
    }),
    // Revenue collected MTD (sum of payments this month)
    db.payment.aggregate({
      _sum: { amountCents: true },
      where: { paidAt: { gte: monthStart, lt: monthEnd } },
    }),
    db.invoice.findMany({
      where: {
        status: { in: ["SENT", "PARTIALLY_PAID"] },
        dueOn: { lt: now, not: null },
      },
      include: { client: true },
      orderBy: { dueOn: "asc" },
      take: 5,
    }),
    db.job.count({
      where: { status: { in: ["SCHEDULED", "EN_ROUTE", "IN_PROGRESS"] } },
    }),
    db.job.findMany({
      where: { scheduledStart: { gte: weekStart, lt: weekEnd } },
      select: { id: true, scheduledStart: true, status: true },
    }),
    db.job.findMany({
      where: { scheduledStart: { gte: todayStart, lt: todayEnd } },
      include: {
        location: { include: { client: true } },
        unit: true,
        assignments: { include: { employee: true } },
      },
      orderBy: { scheduledStart: "asc" },
    }),
    // Top clients by invoiced revenue (last 90 days)
    db.invoice.groupBy({
      by: ["clientId"],
      _sum: { totalCents: true },
      where: {
        issuedOn: {
          gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        },
        status: { in: ["SENT", "PARTIALLY_PAID", "PAID"] },
      },
      orderBy: { _sum: { totalCents: "desc" } },
      take: 4,
    }),
    db.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    db.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.job.findMany({
      where: { status: "COMPLETED" },
      include: { location: { include: { client: true } } },
      orderBy: { actualEnd: "desc" },
      take: 5,
    }),
    db.employee.count(),
    db.location.count(),
  ]);

  // Top-clients query gave us IDs; fetch businessNames in one go
  const topClientIds = topClients.map((t) => t.clientId);
  const topClientNames =
    topClientIds.length > 0
      ? await db.client.findMany({
          where: { id: { in: topClientIds } },
          select: { id: true, businessName: true },
        })
      : [];
  const nameById = new Map(topClientNames.map((c) => [c.id, c.businessName]));

  const invoicedCents = Number(invoicedThisMonth._sum.totalCents ?? 0);
  const paidCents = Number(paidThisMonth._sum.amountCents ?? 0);
  const outstandingCents = invoicedCents - paidCents;
  const overdueCount = overdueInvoices.length;
  const newLeadsCount =
    leadsCounts.find((l) => l.status === "NEW")?._count._all ?? 0;

  // Jobs this week — group by day-of-week for sparkline
  const sparkBuckets = new Array(7).fill(0);
  for (const j of jobsThisWeek) {
    const dow = j.scheduledStart.getDay();
    sparkBuckets[dow] += 1;
  }

  return (
    <>
      <PageHeader
        title={`${tenantName} — dashboard`}
        description={`Today is ${now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}.`}
      />

      {/* ── Ask your business (AI co-pilot hero) ───────────── */}
      <section className="mt-6">
        <div className="rounded-2xl border border-accent-500/30 bg-accent-500/[0.06] p-5 ring-1 ring-accent-500/20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-accent-300" aria-hidden>
              ✦
            </span>
            <h2 className="text-base font-semibold text-white">
              Ask your business
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-300">
            Type a question — the co-pilot answers from your live data.
          </p>
          <form
            method="get"
            action={`/t/${tenantSlug}/ai`}
            className="mt-3 flex gap-2"
          >
            <input
              name="q"
              aria-label="Ask your business a question"
              placeholder="Show me this month's revenue, who hasn't paid, today's jobs…"
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-5 py-2.5 text-sm font-medium text-white shadow-glow transition hover:from-accent-400 hover:to-accent-600"
            >
              Ask →
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Show me overdue invoices",
              "How much did we make this month?",
              "What's scheduled today?",
              "Who hasn't paid?",
            ].map((s) => (
              <Link
                key={s}
                href={`/t/${tenantSlug}/ai?q=${encodeURIComponent(s)}`}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-200 transition hover:border-accent-500/40 hover:bg-accent-500/[0.08]"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top KPI row — money ────────────────────────────── */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          href={`/t/${tenantSlug}/invoices`}
          label="Billed this month"
          value={fmtMoney(invoicedCents)}
          hint={`${monthAbbr(now)} 1 – ${monthAbbr(now)} ${now.getDate()}`}
        />
        <KpiCard
          href={`/t/${tenantSlug}/ledger`}
          label="Collected this month"
          value={fmtMoney(paidCents)}
          hint={paidCents > 0 ? `${Math.round((paidCents / Math.max(1, invoicedCents)) * 100)}% of billed` : "—"}
          tone="success"
        />
        <KpiCard
          href={`/t/${tenantSlug}/invoices?filter=overdue`}
          label="Outstanding A/R"
          value={fmtMoney(outstandingCents)}
          hint={`${overdueCount} overdue invoice${overdueCount === 1 ? "" : "s"}`}
          tone={overdueCount > 0 ? "warn" : "muted"}
        />
      </section>

      {/* ── Secondary KPI row — operations ─────────────────── */}
      <section className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SmallStat
          href={`/t/${tenantSlug}/jobs`}
          label="Open jobs"
          value={String(openJobsCount)}
        />
        <SmallStat
          href={`/t/${tenantSlug}/clients`}
          label="Locations"
          value={String(totalLocations)}
        />
        <SmallStat
          href={`/t/${tenantSlug}/employees`}
          label="Employees"
          value={String(totalEmployees)}
        />
        <SmallStat
          href={`/t/${tenantSlug}/leads`}
          label="New leads"
          value={String(newLeadsCount)}
          tone={newLeadsCount > 0 ? "accent" : "muted"}
        />
      </section>

      {/* ── This week sparkline ────────────────────────────── */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
              Jobs this week
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {jobsThisWeek.length} job{jobsThisWeek.length === 1 ? "" : "s"} scheduled · click a day to filter
            </p>
          </div>
          <Link
            href={`/t/${tenantSlug}/schedule`}
            className="text-sm text-accent-300 hover:text-accent-200"
          >
            Schedule →
          </Link>
        </div>
        <DayBars buckets={sparkBuckets} tenantSlug={tenantSlug} weekStart={weekStart} />
      </section>

      {/* ── Today + top clients side by side ───────────────── */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
          <div className="flex items-end justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
              Today's jobs
            </h2>
            <Link
              href={`/t/${tenantSlug}/jobs`}
              className="text-xs text-accent-300 hover:text-accent-200"
            >
              All jobs →
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {todayJobs.length === 0 ? (
              <li className="rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-gray-400">
                Nothing scheduled today.
              </li>
            ) : (
              todayJobs.map((j) => (
                <li key={j.id}>
                  <Link
                    href={`/t/${tenantSlug}/jobs`}
                    className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm transition hover:border-white/15 hover:bg-white/[0.05]"
                  >
                    <span className="font-mono text-xs text-gray-300">
                      {j.scheduledStart.toLocaleTimeString(undefined, { timeStyle: "short" })}
                    </span>
                    <span className="font-medium text-gray-100">
                      {j.location.client.businessName}
                    </span>
                    <span className="text-gray-400">
                      {j.location.name}
                      {j.unit ? ` · #${j.unit.unitNumber}` : ""}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">
                      {j.assignments.map((a) => a.employee.firstName).join(", ") || "unassigned"}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
          <div className="flex items-end justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
              Top clients (90d)
            </h2>
            <Link
              href={`/t/${tenantSlug}/clients`}
              className="text-xs text-accent-300 hover:text-accent-200"
            >
              All clients →
            </Link>
          </div>
          {topClients.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-gray-400">
              No invoiced revenue yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {topClients.map((t) => {
                const cents = Number(t._sum.totalCents ?? 0);
                const max = Number(topClients[0]?._sum.totalCents ?? 0);
                const pct = max > 0 ? Math.round((cents / max) * 100) : 0;
                return (
                  <li key={t.clientId}>
                    <Link
                      href={`/t/${tenantSlug}/clients/${t.clientId}`}
                      className="block rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm transition hover:border-white/15"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-100">
                          {nameById.get(t.clientId) ?? t.clientId}
                        </span>
                        <span className="font-mono text-xs text-gray-200">
                          {fmtMoney(cents)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ── Overdue invoices + recent leads ────────────────── */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
          <div className="flex items-end justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
              Overdue invoices
            </h2>
            <Link
              href={`/t/${tenantSlug}/invoices`}
              className="text-xs text-accent-300 hover:text-accent-200"
            >
              All invoices →
            </Link>
          </div>
          {overdueInvoices.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-gray-400">
              No overdue invoices.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {overdueInvoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/t/${tenantSlug}/invoices/${inv.number}`}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm transition hover:border-white/15"
                  >
                    <div>
                      <div className="font-medium text-gray-100">{inv.client.businessName}</div>
                      <div className="text-xs text-gray-400">
                        {inv.number} · due {inv.dueOn?.toLocaleDateString()}
                      </div>
                    </div>
                    <span className="font-mono text-sm text-red-300">
                      {fmtMoney(inv.totalCents)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
          <div className="flex items-end justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
              Recent leads
            </h2>
            <Link
              href={`/t/${tenantSlug}/leads`}
              className="text-xs text-accent-300 hover:text-accent-200"
            >
              Inbox →
            </Link>
          </div>
          {newLeads.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-gray-400">
              No leads yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {newLeads.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/t/${tenantSlug}/leads/${l.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm transition hover:border-white/15"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-100">{l.name}</div>
                      <div className="truncate text-xs text-gray-400">
                        {l.email ?? l.phone ?? "no contact"}
                        {l.serviceInterest ? ` · ${l.serviceInterest}` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {timeAgo(l.createdAt, now)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Recent completed jobs (activity feed) ──────────── */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
          Recently completed
        </h2>
        {recentJobs.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-gray-400">
            No completed jobs yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {recentJobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium text-gray-100">
                    {j.location.client.businessName}
                  </span>
                  <span className="ml-2 text-gray-400">{j.location.name}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {j.actualEnd ? timeAgo(j.actualEnd, now) : timeAgo(j.scheduledEnd, now)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Reusable bits
// ─────────────────────────────────────────────────────────────────────

function KpiCard({
  href,
  label,
  value,
  hint,
  tone = "default",
}: {
  href: string;
  label: string;
  value: string;
  hint?: string;
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
    <Link
      href={href}
      className="group block rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md transition hover:border-white/25 hover:bg-white/[0.07]"
    >
      <div className="text-xs font-medium uppercase tracking-wide text-gray-300">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-semibold tracking-tight ${valueColor}`}>
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-gray-400 group-hover:text-gray-300">
          {hint}
        </div>
      ) : null}
    </Link>
  );
}

function SmallStat({
  href,
  label,
  value,
  tone = "default",
}: {
  href: string;
  label: string;
  value: string;
  tone?: "default" | "accent" | "muted";
}) {
  const ring =
    tone === "accent" ? "ring-1 ring-accent-500/40 bg-accent-500/[0.08]" : "";
  return (
    <Link
      href={href}
      className={`block rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md transition hover:border-white/25 hover:bg-white/[0.06] ${ring}`}
    >
      <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
    </Link>
  );
}

function DayBars({
  buckets,
  tenantSlug,
  weekStart,
}: {
  buckets: number[];
  tenantSlug: string;
  weekStart: Date;
}) {
  const max = Math.max(1, ...buckets);
  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <ul className="mt-4 grid grid-cols-7 gap-2">
      {buckets.map((count, i) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const isToday = date.toDateString() === new Date().toDateString();
        const pct = (count / max) * 100;
        return (
          <li key={i}>
            <Link
              href={`/t/${tenantSlug}/schedule`}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="flex h-20 w-full items-end overflow-hidden rounded-md bg-white/[0.04]">
                <div
                  className={`w-full rounded-md ${isToday ? "bg-gradient-to-t from-accent-400 to-accent-500" : "bg-gradient-to-t from-white/15 to-white/35"}`}
                  style={{ height: count > 0 ? `${Math.max(8, pct)}%` : "0%" }}
                />
              </div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400">
                {labels[i]}
              </div>
              <div className={`text-xs font-medium ${isToday ? "text-accent-300" : "text-gray-200"}`}>
                {count}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function fmtMoney(cents: number): string {
  const dollars = Math.round(cents / 100);
  return `$${dollars.toLocaleString()}`;
}

function monthAbbr(d: Date): string {
  return d.toLocaleString(undefined, { month: "short" });
}

function timeAgo(d: Date, now: Date): string {
  const diffMs = now.getTime() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString();
}

// ─────────────────────────────────────────────────────────────────────
// Employee + Customer views — kept from the prior version
// ─────────────────────────────────────────────────────────────────────

async function EmployeeTodayView({
  db,
  employeeId,
}: {
  db: TenantPrismaClient;
  employeeId: string | null;
}) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const employee = employeeId
    ? await db.employee.findUnique({ where: { id: employeeId } })
    : null;

  const jobs = await db.job.findMany({
    where: {
      scheduledStart: { gte: todayStart, lt: todayEnd },
      ...(employeeId
        ? { assignments: { some: { employeeId } } }
        : {}),
    },
    include: {
      location: { include: { client: true } },
      unit: true,
      assignments: { include: { employee: true } },
    },
    orderBy: { scheduledStart: "asc" },
  });

  const openShift = employeeId
    ? await db.timeEntry.findFirst({
        where: { employeeId, clockOut: null },
        orderBy: { clockIn: "desc" },
      })
    : null;

  return (
    <>
      <PageHeader
        title={employee ? `Today — ${employee.firstName}` : "Today"}
        description={
          employee
            ? `Your jobs for ${todayStart.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}.`
            : "Pick a specific employee in the sidebar switcher to see their day."
        }
      />

      {openShift ? (
        <div className="mt-4 rounded-xl border border-blue-900/40 bg-blue-900/20 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-blue-300">
            ⏱ Clocked in
          </div>
          <div className="mt-1 text-sm text-blue-100">
            Since {openShift.clockIn.toLocaleString(undefined, { timeStyle: "short" })}
          </div>
        </div>
      ) : null}

      {jobs.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-400">
          {employeeId
            ? "No jobs scheduled for today."
            : "No employee selected — use the sidebar switcher."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {jobs.map((j) => (
            <li
              key={j.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-sm text-gray-300">
                    {j.scheduledStart.toLocaleTimeString(undefined, { timeStyle: "short" })}
                    {" – "}
                    {j.scheduledEnd.toLocaleTimeString(undefined, { timeStyle: "short" })}
                  </div>
                  <div className="mt-1 font-medium text-gray-50">{j.location.client.businessName}</div>
                  <div className="text-sm text-gray-300">
                    {j.location.name}
                    {j.unit ? ` · Unit ${j.unit.unitNumber}` : ""}
                  </div>
                </div>
                <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-xs text-gray-100">
                  {j.status.toLowerCase().replace("_", " ")}
                </span>
              </div>
              {j.notes ? (
                <p className="mt-2 text-sm text-gray-300">{j.notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function CustomerHomeView({
  db,
  customerId,
}: {
  db: TenantPrismaClient;
  customerId: string | null;
}) {
  const customer = customerId
    ? await db.customer.findUnique({ where: { id: customerId } })
    : null;

  const bookings = customerId
    ? await db.booking.findMany({
        where: { customerId },
        orderBy: { scheduledStart: "desc" },
        take: 20,
      })
    : [];

  return (
    <>
      <PageHeader
        title={customer ? `Hi ${customer.name ?? customer.email}` : "My bookings"}
        description={
          customer
            ? "Your past and upcoming cleanings."
            : "Pick a specific customer in the sidebar switcher to see their bookings."
        }
      />

      {bookings.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-400">
          {customerId ? "No bookings yet." : "No customer selected."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {bookings.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-100">
                    {b.scheduledStart.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                  <div className="text-sm text-gray-300">
                    {b.addressLine1}, {b.city}, {b.state} {b.postalCode}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-gray-100">${(b.totalCents / 100).toFixed(2)}</div>
                  <div className="text-xs text-gray-400">{b.status}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
