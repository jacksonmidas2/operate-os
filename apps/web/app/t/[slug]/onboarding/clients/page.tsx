import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

async function addClient(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  await db.client.create({
    data: {
      businessName: String(formData.get("businessName") ?? ""),
      mainContactName:
        (String(formData.get("mainContactName") ?? "") || null) as string | null,
      contactEmail:
        (String(formData.get("contactEmail") ?? "") || null) as string | null,
      contactPhone:
        (String(formData.get("contactPhone") ?? "") || null) as string | null,
    },
  });
  revalidatePath(`/t/${slug}/onboarding/clients`);
}

export default async function ClientsOnboardingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);
  const clients = await db.client.findMany({
    include: { _count: { select: { locations: true } } },
    orderBy: { createdAt: "desc" },
  });
  const add = addClient.bind(null, slug);

  return (
    <>
      <PageHeader
        title="2. Clients + locations"
        description="Every business you clean for. Add locations + units under each client."
      />

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          action={add}
          className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:col-span-1"
        >
          <h2 className="text-base font-semibold">Add client</h2>
          <Field label="Business name" name="businessName" required />
          <Field label="Main contact" name="mainContactName" />
          <Field label="Contact email" name="contactEmail" type="email" />
          <Field label="Contact phone" name="contactPhone" />
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add client
          </button>
        </form>

        <ul className="space-y-3 lg:col-span-2">
          {clients.length === 0 ? (
            <li className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
              No clients yet — add your first on the left.
            </li>
          ) : (
            clients.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold">{c.businessName}</h3>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {c.mainContactName ?? "no contact"}
                      {c.contactEmail ? ` · ${c.contactEmail}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/t/${slug}/clients/${c.id}`}
                    className="text-sm text-brand-600 hover:underline"
                  >
                    Manage →
                  </Link>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {c._count.locations} location
                  {c._count.locations === 1 ? "" : "s"}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800"
      />
    </label>
  );
}
