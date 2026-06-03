import { notFound } from "next/navigation";
import Link from "next/link";
import { controlPrisma } from "@operate/db-control";
import { PageHeader, StatCard } from "@/components/Shell";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await controlPrisma.tenant.findUnique({
    where: { slug },
    include: {
      profitShareConfig: true,
      tenantUsers: { include: { user: true } },
      billingEvents: { orderBy: { periodStart: "desc" }, take: 5 },
    },
  });
  if (!tenant) notFound();

  return (
    <>
      <PageHeader
        title={tenant.legalName}
        description={`Tenant slug: ${tenant.slug} · Status: ${tenant.status}`}
        actions={
          <a
            href={`/t/${tenant.slug}`}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Open tenant app →
          </a>
        }
      />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Users" value={String(tenant.tenantUsers.length)} />
        <StatCard
          label="Profit share"
          value={
            tenant.profitShareConfig
              ? `${tenant.profitShareConfig.splitBasisPoints / 100}%`
              : "—"
          }
        />
        <StatCard label="Billing events" value={String(tenant.billingEvents.length)} />
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Profit-share config</h2>
          <Link
            href={`/admin/tenants/${slug}/profit-share`}
            className="text-sm text-brand-600 hover:underline"
          >
            {tenant.profitShareConfig ? "Edit" : "Configure"} →
          </Link>
        </div>
        {tenant.profitShareConfig ? (
          <dl className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 p-4 sm:grid-cols-2 dark:border-gray-800">
            <Row
              label="Split"
              value={`${tenant.profitShareConfig.splitBasisPoints / 100}%`}
            />
            <Row label="Basis" value={tenant.profitShareConfig.basis} />
            <Row
              label="Buyout multiple"
              value={`${tenant.profitShareConfig.buyoutMultiple}x trailing monthly`}
            />
            <Row
              label="Setup fee"
              value={`$${(tenant.profitShareConfig.setupFeeCents / 100).toFixed(2)}`}
            />
            <Row
              label="Contract starts"
              value={tenant.profitShareConfig.startDate
                .toISOString()
                .slice(0, 10)}
            />
            <Row
              label="Contract ends"
              value={
                tenant.profitShareConfig.endDate
                  ? tenant.profitShareConfig.endDate.toISOString().slice(0, 10)
                  : "open"
              }
            />
          </dl>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700">
            No profit-share contract yet — this tenant isn't billed.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Members</h2>
        <ul className="mt-3 divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {tenant.tenantUsers.length === 0 ? (
            <li className="p-4 text-sm text-gray-500">No members yet.</li>
          ) : (
            tenant.tenantUsers.map((tu) => (
              <li
                key={tu.id}
                className="flex items-center justify-between p-3 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {tu.user.name ?? tu.user.email}
                  </div>
                  <div className="text-xs text-gray-500">{tu.user.email}</div>
                </div>
                <div className="text-xs">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {tu.role}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 font-mono text-sm">{value}</dd>
    </div>
  );
}
