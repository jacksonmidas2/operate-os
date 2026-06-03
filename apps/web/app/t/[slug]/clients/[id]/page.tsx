import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

async function addLocation(
  slug: string,
  clientId: string,
  formData: FormData,
) {
  "use server";
  const { db } = await getTenantContext(slug);
  await db.location.create({
    data: {
      clientId,
      name: String(formData.get("name") ?? ""),
      addressLine1: String(formData.get("addressLine1") ?? ""),
      city: String(formData.get("city") ?? ""),
      state: String(formData.get("state") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
    },
  });
  revalidatePath(`/t/${slug}/clients/${clientId}`);
}

async function addUnit(
  slug: string,
  clientId: string,
  locationId: string,
  formData: FormData,
) {
  "use server";
  const { db } = await getTenantContext(slug);
  await db.unit.create({
    data: {
      locationId,
      unitNumber: String(formData.get("unitNumber") ?? ""),
      bedroomCount: formData.get("bedroomCount")
        ? Number(formData.get("bedroomCount"))
        : null,
    },
  });
  revalidatePath(`/t/${slug}/clients/${clientId}`);
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { db } = await getTenantContext(slug);
  const client = await db.client.findUnique({
    where: { id },
    include: {
      locations: { include: { units: true }, orderBy: { name: "asc" } },
      invoices: { orderBy: { issuedOn: "desc" }, take: 5 },
    },
  });
  if (!client) notFound();

  return (
    <>
      <PageHeader
        title={client.businessName}
        description={
          client.mainContactName
            ? `Contact: ${client.mainContactName}${client.contactEmail ? ` · ${client.contactEmail}` : ""}`
            : "No contact recorded."
        }
      />

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Locations</h2>
        <ul className="mt-3 space-y-3">
          {client.locations.map((loc) => (
            <li
              key={loc.id}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold">{loc.name}</h3>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {loc.addressLine1}, {loc.city}, {loc.state} {loc.postalCode}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Units
                </div>
                {loc.units.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-400">No units.</p>
                ) : (
                  <ul className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {loc.units.map((u) => (
                      <li
                        key={u.id}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
                      >
                        <div className="font-mono">{u.unitNumber}</div>
                        <div className="text-xs text-gray-500">
                          {u.bedroomCount ? `${u.bedroomCount} BR` : "no BR"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  action={addUnit.bind(null, slug, id, loc.id)}
                  className="mt-3 flex gap-2"
                >
                  <input
                    name="unitNumber"
                    required
                    placeholder="Unit #"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                  <input
                    name="bedroomCount"
                    type="number"
                    min="0"
                    placeholder="BR"
                    className="w-16 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    + Unit
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>

        <form
          action={addLocation.bind(null, slug, id)}
          className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-dashed border-gray-300 p-4 sm:grid-cols-6 dark:border-gray-700"
        >
          <input name="name" required placeholder="Location name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2 dark:border-gray-700 dark:bg-gray-800" />
          <input name="addressLine1" required placeholder="Address" className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2 dark:border-gray-700 dark:bg-gray-800" />
          <input name="city" required placeholder="City" className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
          <div className="flex gap-2">
            <input name="state" required placeholder="ST" className="w-14 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <input name="postalCode" required placeholder="ZIP" className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <button type="submit" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
              + Add
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Recent invoices</h2>
        <ul className="mt-3 divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {client.invoices.length === 0 ? (
            <li className="p-4 text-sm text-gray-500">No invoices yet.</li>
          ) : (
            client.invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between p-3 text-sm">
                <Link href={`/t/${slug}/invoices/${inv.number}`} className="font-mono text-brand-600 hover:underline">
                  {inv.number}
                </Link>
                <div className="text-gray-500">
                  {inv.issuedOn.toISOString().slice(0, 10)} · ${(inv.totalCents / 100).toFixed(2)} · {inv.status}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </>
  );
}
