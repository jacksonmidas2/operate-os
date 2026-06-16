import Link from "next/link";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

export default async function LeadsInbox({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);
  const leads = await db.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const counts = await db.lead.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countByStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  ) as Record<string, number>;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Quote requests from the public site. Convert them to clients here."
      />

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["NEW", "CONTACTED", "QUOTED", "WON", "LOST"] as const).map((s) => (
          <div
            key={s}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center backdrop-blur-md"
          >
            <div className="text-xs text-gray-500">{s.toLowerCase()}</div>
            <div className="mt-0.5 text-xl font-semibold">
              {countByStatus[s] ?? 0}
            </div>
          </div>
        ))}
      </section>

      <ul className="mt-6 divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md">
        {leads.length === 0 ? (
          <li className="p-8 text-center text-sm text-gray-500">
            No leads yet. They'll appear here when someone submits the contact
            form on your public site.
          </li>
        ) : (
          leads.map((l) => (
            <li key={l.id} className="block p-4">
              <Link
                href={`/t/${slug}/leads/${l.id}`}
                className="flex items-start justify-between gap-4 hover:opacity-90"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{l.name}</span>
                    <StatusPill status={l.status} />
                    {l.serviceInterest ? (
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                        {l.serviceInterest}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-sm text-gray-400">
                    {l.email ?? "no email"}
                    {l.phone ? ` · ${l.phone}` : ""}
                  </div>
                  {l.message ? (
                    <p className="mt-1 line-clamp-1 text-sm text-gray-500">
                      {l.message}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right text-xs text-gray-500">
                  {l.createdAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                  <div>
                    {l.createdAt.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "NEW"
      ? "bg-blue-500/15 text-blue-300"
      : status === "CONTACTED"
        ? "bg-yellow-500/15 text-yellow-200"
        : status === "QUOTED"
          ? "bg-purple-500/15 text-purple-200"
          : status === "WON"
            ? "bg-green-500/15 text-green-200"
            : "bg-gray-500/15 text-gray-300";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${color}`}
    >
      {status.toLowerCase()}
    </span>
  );
}
