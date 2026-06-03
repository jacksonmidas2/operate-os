import Link from "next/link";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

export default async function ClientsListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);
  const clients = await db.client.findMany({
    include: {
      _count: { select: { locations: true, invoices: true } },
    },
    orderBy: { businessName: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Clients"
        description="The businesses you clean for."
        actions={
          <Link
            href={`/t/${slug}/onboarding/clients`}
            className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
          >
            + Add client
          </Link>
        }
      />

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {clients.length === 0 ? (
          <li className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-500 sm:col-span-2">
            No clients yet — add the first one.
          </li>
        ) : (
          clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/t/${slug}/clients/${c.id}`}
                className="block rounded-xl border border-white/10 bg-white p-4 transition hover:border-brand-500"
              >
                <h3 className="text-base font-semibold">{c.businessName}</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {c.mainContactName ?? "no contact"}
                  {c.contactEmail ? ` · ${c.contactEmail}` : ""}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {c._count.locations} location
                  {c._count.locations === 1 ? "" : "s"} ·{" "}
                  {c._count.invoices} invoice
                  {c._count.invoices === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </>
  );
}
