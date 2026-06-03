import { redirect } from "next/navigation";
import { controlPrisma } from "@operate/db-control";
import { provisionTenant } from "@operate/db-tenant/provision";
import { PageHeader } from "@/components/Shell";

async function createTenant(formData: FormData) {
  "use server";
  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("legalName") ?? "").trim();
  if (!slug || !name) throw new Error("slug and legalName are required");
  await provisionTenant({ slug, legalName: name });
  redirect(`/admin/tenants/${slug}`);
}

export default async function NewTenantPage() {
  return (
    <>
      <PageHeader
        title="New tenant"
        description="Provision a brand-new cleaning business on the platform."
      />

      <form
        action={createTenant}
        className="mt-6 max-w-xl space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <label className="block">
          <span className="block text-sm font-medium">Slug</span>
          <input
            name="slug"
            type="text"
            required
            placeholder="acme"
            pattern="[a-z][a-z0-9-]*[a-z0-9]"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Used in their subdomain — <code>{`{slug}.operatehq.app`}</code>.
            Lowercase, letters/digits/hyphens, 2–32 chars.
          </span>
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Legal name</span>
          <input
            name="legalName"
            type="text"
            required
            placeholder="Acme Cleaning Co LLC"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800"
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Provision tenant
        </button>

        <p className="text-xs text-gray-500">
          This creates a fresh per-tenant Postgres database, applies the schema,
          and inserts a control-plane row. Takes ~3 seconds.
        </p>
      </form>
    </>
  );
}
