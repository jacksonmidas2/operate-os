import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";
import Link from "next/link";

async function saveConfig(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  const existing = await db.publicSiteConfig.findFirst();
  const data = {
    tagline: nullable(formData.get("tagline")),
    heroHeadline: nullable(formData.get("heroHeadline")),
    heroSubhead: nullable(formData.get("heroSubhead")),
    heroCtaLabel: nullable(formData.get("heroCtaLabel")) ?? "Get a free quote",
    aboutBody: nullable(formData.get("aboutBody")),
    serviceAreaText: nullable(formData.get("serviceAreaText")),
    yearsInBusiness: numOrNull(formData.get("yearsInBusiness")),
    brandPrimaryColor: nullable(formData.get("brandPrimaryColor")) ?? "#F59E0B",
    brandAccentColor: nullable(formData.get("brandAccentColor")) ?? "#EA580C",
    publicEmail: nullable(formData.get("publicEmail")),
    publicPhone: nullable(formData.get("publicPhone")),
    facebookUrl: nullable(formData.get("facebookUrl")),
    instagramUrl: nullable(formData.get("instagramUrl")),
    googleBusinessUrl: nullable(formData.get("googleBusinessUrl")),
    yelpUrl: nullable(formData.get("yelpUrl")),
    published: formData.get("published") === "on",
  };
  if (existing) {
    await db.publicSiteConfig.update({ where: { id: existing.id }, data });
  } else {
    await db.publicSiteConfig.create({ data });
  }
  revalidatePath(`/t/${slug}/site`);
}

async function addService(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.publicService.create({
    data: {
      name,
      shortDesc: nullable(formData.get("shortDesc")),
      longDesc: nullable(formData.get("longDesc")),
      isCommercial: formData.get("isCommercial") === "on",
      isResidential: formData.get("isResidential") === "on",
      sortOrder: numOrNull(formData.get("sortOrder")) ?? 0,
    },
  });
  revalidatePath(`/t/${slug}/site`);
}

async function deleteService(slug: string, id: string) {
  "use server";
  const { db } = await getTenantContext(slug);
  await db.publicService.delete({ where: { id } });
  revalidatePath(`/t/${slug}/site`);
}

function nullable(v: FormDataEntryValue | null): string | null {
  const s = (v == null ? "" : String(v)).trim();
  return s.length === 0 ? null : s;
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = (v == null ? "" : String(v)).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default async function PublicSiteEditor({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db, tenant } = await getTenantContext(slug);
  const [config, services] = await Promise.all([
    db.publicSiteConfig.findFirst(),
    db.publicService.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const save = saveConfig.bind(null, slug);
  const add = addService.bind(null, slug);
  const publicUrl =
    process.env.NEXT_PUBLIC_PUBLIC_SITE_URL_OVERRIDE ??
    `/sites/${slug}`;

  return (
    <>
      <PageHeader
        title="Public site"
        description={`Edit what visitors to ${tenant.displayName ?? tenant.legalName}'s marketing site see.`}
        actions={
          <Link
            href={publicUrl}
            target="_blank"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-200 hover:bg-white/5"
          >
            View site →
          </Link>
        }
      />

      {/* ── Site copy ───────────────────────────────────── */}
      <section className="mt-6">
        <form
          action={save}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
        >
          <h2 className="text-base font-semibold">Site content</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Tagline (small caps over the hero)"
              name="tagline"
              defaultValue={config?.tagline ?? ""}
            />
            <Field
              label="Hero CTA label"
              name="heroCtaLabel"
              defaultValue={config?.heroCtaLabel ?? "Get a free quote"}
            />
          </div>
          <Field
            label="Hero headline"
            name="heroHeadline"
            defaultValue={config?.heroHeadline ?? ""}
          />
          <Field
            label="Hero subhead"
            name="heroSubhead"
            defaultValue={config?.heroSubhead ?? ""}
          />
          <Textarea
            label="About (markdown — blank lines separate paragraphs)"
            name="aboutBody"
            rows={6}
            defaultValue={config?.aboutBody ?? ""}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="Service area"
              name="serviceAreaText"
              defaultValue={config?.serviceAreaText ?? ""}
            />
            <Field
              label="Years in business"
              name="yearsInBusiness"
              type="number"
              defaultValue={config?.yearsInBusiness?.toString() ?? ""}
            />
            <div />
          </div>

          <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-400">
            Contact (overrides BusinessProfile if set)
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Public phone"
              name="publicPhone"
              defaultValue={config?.publicPhone ?? ""}
            />
            <Field
              label="Public email"
              name="publicEmail"
              type="email"
              defaultValue={config?.publicEmail ?? ""}
            />
          </div>

          <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-400">
            Brand colors
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Primary color (hex)"
              name="brandPrimaryColor"
              defaultValue={config?.brandPrimaryColor ?? "#F59E0B"}
            />
            <Field
              label="Accent color (hex)"
              name="brandAccentColor"
              defaultValue={config?.brandAccentColor ?? "#EA580C"}
            />
          </div>

          <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-400">
            Social
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Google Business URL"
              name="googleBusinessUrl"
              defaultValue={config?.googleBusinessUrl ?? ""}
            />
            <Field
              label="Yelp URL"
              name="yelpUrl"
              defaultValue={config?.yelpUrl ?? ""}
            />
            <Field
              label="Facebook URL"
              name="facebookUrl"
              defaultValue={config?.facebookUrl ?? ""}
            />
            <Field
              label="Instagram URL"
              name="instagramUrl"
              defaultValue={config?.instagramUrl ?? ""}
            />
          </div>

          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              name="published"
              defaultChecked={config?.published ?? false}
              className="h-4 w-4 rounded border-white/20 bg-white/10"
            />
            <span className="text-sm">Site is published</span>
          </label>

          <button
            type="submit"
            className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
          >
            Save site
          </button>
        </form>
      </section>

      {/* ── Services ────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Services shown on the site</h2>
        <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <form
            action={add}
            className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md lg:col-span-2"
          >
            <h3 className="text-sm font-semibold">Add a service</h3>
            <Field label="Name" name="name" required />
            <Field label="Short description" name="shortDesc" />
            <Textarea label="Long description" name="longDesc" rows={3} />
            <Field label="Sort order" name="sortOrder" type="number" />
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isCommercial"
                  defaultChecked
                  className="h-4 w-4 rounded border-white/20 bg-white/10"
                />
                Commercial
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isResidential"
                  className="h-4 w-4 rounded border-white/20 bg-white/10"
                />
                Residential
              </label>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
            >
              Add service
            </button>
          </form>

          <ul className="space-y-3 lg:col-span-3">
            {services.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-500">
                No services yet — add one on the left.
              </li>
            ) : (
              services.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      {s.isCommercial ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
                          commercial
                        </span>
                      ) : null}
                      {s.isResidential ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
                          residential
                        </span>
                      ) : null}
                    </div>
                    {s.shortDesc ? (
                      <p className="mt-0.5 text-sm text-gray-400">{s.shortDesc}</p>
                    ) : null}
                  </div>
                  <form action={deleteService.bind(null, slug, s.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </form>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
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
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  rows = 4,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100"
      />
    </label>
  );
}
