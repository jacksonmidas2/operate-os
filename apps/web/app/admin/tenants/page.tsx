import Link from "next/link";
import { controlPrisma } from "@operate/db-control";
import { PageHeader } from "@/components/Shell";

export default async function AdminTenantsPage() {
  const tenants = await controlPrisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      profitShareConfig: true,
      _count: { select: { tenantUsers: true, billingEvents: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Tenants"
        description="Every cleaning business on OperateHQ."
        actions={
          <Link
            href="/admin/tenants/new"
            className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
          >
            + New tenant
          </Link>
        }
      />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-left text-[10px] uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Legal name</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Users</th>
              <th className="px-4 py-2">Profit share</th>
              <th className="px-4 py-2">Billing events</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-mono">
                  <Link
                    href={`/admin/tenants/${t.slug}`}
                    className="text-accent-400 hover:text-accent-300"
                  >
                    {t.slug}
                  </Link>
                </td>
                <td className="px-4 py-3">{t.legalName}</td>
                <td className="px-4 py-3">
                  <StatusPill status={t.status} />
                </td>
                <td className="px-4 py-3">{t._count.tenantUsers}</td>
                <td className="px-4 py-3">
                  {t.profitShareConfig ? (
                    `${t.profitShareConfig.splitBasisPoints / 100}% of ${t.profitShareConfig.basis.toLowerCase().replace("_", " ")}`
                  ) : (
                    <span className="text-gray-400">not configured</span>
                  )}
                </td>
                <td className="px-4 py-3">{t._count.billingEvents}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "ACTIVE"
      ? "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200"
      : status === "SUSPENDED"
        ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200"
        : "bg-white/[0.06] text-gray-200";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${color}`}>
      {status}
    </span>
  );
}
