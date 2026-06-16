import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

async function updateClient(
  slug: string,
  clientId: string,
  formData: FormData,
) {
  "use server";
  const { db } = await getTenantContext(slug);
  const businessName = String(formData.get("businessName") ?? "").trim();
  if (!businessName) return;
  await db.client.update({
    where: { id: clientId },
    data: {
      businessName,
      mainContactName:
        (String(formData.get("mainContactName") ?? "") || null) as string | null,
      contactEmail:
        (String(formData.get("contactEmail") ?? "") || null) as string | null,
      contactPhone:
        (String(formData.get("contactPhone") ?? "") || null) as string | null,
      notes: (String(formData.get("notes") ?? "") || null) as string | null,
    },
  });
  revalidatePath(`/t/${slug}/clients/${clientId}`);
  revalidatePath(`/t/${slug}/clients`);
}

async function deleteClient(slug: string, clientId: string) {
  "use server";
  const { db } = await getTenantContext(slug);
  await db.client.delete({ where: { id: clientId } });
  revalidatePath(`/t/${slug}/clients`);
  redirect(`/t/${slug}/clients`);
}

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

async function updateLocation(
  slug: string,
  clientId: string,
  locationId: string,
  formData: FormData,
) {
  "use server";
  const { db } = await getTenantContext(slug);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.location.update({
    where: { id: locationId },
    data: {
      name,
      addressLine1: String(formData.get("addressLine1") ?? "").trim(),
      addressLine2:
        (String(formData.get("addressLine2") ?? "").trim() || null) as
          | string
          | null,
      city: String(formData.get("city") ?? "").trim(),
      state: String(formData.get("state") ?? "").trim(),
      postalCode: String(formData.get("postalCode") ?? "").trim(),
    },
  });
  revalidatePath(`/t/${slug}/clients/${clientId}`);
}

async function deleteLocation(
  slug: string,
  clientId: string,
  locationId: string,
) {
  "use server";
  const { db } = await getTenantContext(slug);
  await db.location.delete({ where: { id: locationId } });
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
        <h2 className="text-lg font-semibold">Client details</h2>
        <form
          action={updateClient.bind(null, slug, id)}
          className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 sm:grid-cols-2"
        >
          <label className="block sm:col-span-2">
            <span className="block text-sm font-medium">Business name (rename here)</span>
            <input
              name="businessName"
              required
              defaultValue={client.businessName}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium">Main contact</span>
            <input
              name="mainContactName"
              defaultValue={client.mainContactName ?? ""}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium">Contact phone</span>
            <input
              name="contactPhone"
              defaultValue={client.contactPhone ?? ""}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-sm font-medium">Contact email</span>
            <input
              name="contactEmail"
              type="email"
              defaultValue={client.contactEmail ?? ""}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-sm font-medium">Notes</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={client.notes ?? ""}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-2 flex items-center justify-between gap-3">
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
            >
              Save changes
            </button>
            <button
              formAction={deleteClient.bind(null, slug, id)}
              className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
            >
              Delete client
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Locations</h2>
        <ul className="mt-3 space-y-3">
          {client.locations.map((loc) => (
            <li
              key={loc.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4"
            >
              <form
                action={updateLocation.bind(null, slug, id, loc.id)}
                className="grid grid-cols-1 gap-2 sm:grid-cols-6"
              >
                <input name="name" required defaultValue={loc.name} placeholder="Location name" className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm sm:col-span-3" />
                <input name="addressLine1" required defaultValue={loc.addressLine1} placeholder="Address" className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm sm:col-span-3" />
                <input name="addressLine2" defaultValue={loc.addressLine2 ?? ""} placeholder="Suite / unit (optional)" className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm sm:col-span-2" />
                <input name="city" required defaultValue={loc.city} placeholder="City" className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm sm:col-span-2" />
                <input name="state" required defaultValue={loc.state} placeholder="ST" className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm" />
                <input name="postalCode" required defaultValue={loc.postalCode} placeholder="ZIP" className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm" />
                <div className="sm:col-span-6 flex items-center justify-between gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-3 py-1.5 text-sm font-medium text-white hover:from-accent-400 hover:to-accent-600 transition"
                  >
                    Save location
                  </button>
                  <button
                    formAction={deleteLocation.bind(null, slug, id, loc.id)}
                    className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10"
                    title="Removes this location and its units, jobs, and line items"
                  >
                    Delete location
                  </button>
                </div>
              </form>

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
                        className="rounded-lg border border-white/10 px-3 py-2 text-sm"
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
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-1.5 text-sm"
                  />
                  <input
                    name="bedroomCount"
                    type="number"
                    min="0"
                    placeholder="BR"
                    className="w-16 rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-white/[0.08]"
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
          className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-dashed border-white/10 p-4 sm:grid-cols-6"
        >
          <input name="name" required placeholder="Location name" className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm sm:col-span-2" />
          <input name="addressLine1" required placeholder="Address" className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm sm:col-span-2" />
          <input name="city" required placeholder="City" className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input name="state" required placeholder="ST" className="w-14 rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm" />
            <input name="postalCode" required placeholder="ZIP" className="w-24 rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-3 py-2 text-sm font-medium text-white hover:from-accent-400 hover:to-accent-600">
              + Add
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Recent invoices</h2>
        <ul className="mt-3 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md">
          {client.invoices.length === 0 ? (
            <li className="p-4 text-sm text-gray-500">No invoices yet.</li>
          ) : (
            client.invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between p-3 text-sm">
                <Link href={`/t/${slug}/invoices/${inv.number}`} className="font-mono text-accent-400 hover:text-accent-300">
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
