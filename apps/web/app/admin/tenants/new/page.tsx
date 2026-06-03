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
        className="mt-6 max-w-xl space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-card p-6"
      >
        <label className="block">
          <span className="block text-sm font-medium">Slug</span>
          <input
            name="slug"
            type="text"
            required
            placeholder="acme"
            pattern="[a-z][a-z0-9-]*[a-z0-9]"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 font-mono text-sm focus:border-accent-500/60 focus:outline-none focus:ring-1 focus:ring-accent-500/60"
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
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm focus:border-accent-500/60 focus:outline-none focus:ring-1 focus:ring-accent-500/60"
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
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
