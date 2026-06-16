import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import {
  getOrCreateTenantClient,
  getTenantBySlug,
} from "@operate/tenant-router";
import { TenantPrismaClient } from "@operate/db-tenant";

async function submitLead(slug: string, formData: FormData) {
  "use server";
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return;
  const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await db.lead.create({
    data: {
      source: "public-site",
      name,
      email:
        (String(formData.get("email") ?? "").trim() || null) as string | null,
      phone:
        (String(formData.get("phone") ?? "").trim() || null) as string | null,
      message:
        (String(formData.get("message") ?? "").trim() || null) as string | null,
      serviceInterest:
        (String(formData.get("serviceInterest") ?? "").trim() || null) as
          | string
          | null,
      addressHint:
        (String(formData.get("addressHint") ?? "").trim() || null) as
          | string
          | null,
      status: "NEW",
    },
  });

  redirect(`/contact?ok=1`);
}

export default async function PublicSiteContact({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { slug } = await params;
  const { ok } = await searchParams;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);
  const [config, profile, services] = await Promise.all([
    db.publicSiteConfig.findFirst(),
    db.businessProfile.findFirst(),
    db.publicService.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const primary = config?.brandPrimaryColor ?? "#F59E0B";
  const accent = config?.brandAccentColor ?? "#EA580C";
  const submit = submitLead.bind(null, slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <p
        className="text-xs font-medium uppercase tracking-[0.2em]"
        style={{ color: primary }}
      >
        Contact
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
        Get a free quote
      </h1>
      <p className="mt-3 max-w-2xl text-base text-gray-300">
        Tell us a bit about your space and what you need cleaned. We'll get
        back to you within one business day.
      </p>

      {ok === "1" ? (
        <div
          className="mt-8 rounded-2xl border p-5 text-sm"
          style={{
            borderColor: `${accent}66`,
            backgroundColor: `${accent}11`,
            color: "#fff",
          }}
        >
          <strong className="block text-base">Thanks — we got your message.</strong>
          <span className="mt-1 block text-gray-300">
            We'll reach out shortly. If it's urgent, give us a call.
          </span>
        </div>
      ) : null}

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <form
          action={submit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md lg:col-span-3"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Your name" name="name" required />
            <Field label="Phone" name="phone" />
            <Field label="Email" name="email" type="email" />
            <Field label="Property address (optional)" name="addressHint" />
          </div>
          <div>
            <label className="block">
              <span className="block text-sm font-medium">Service interest</span>
              <select
                name="serviceInterest"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-gray-100"
                defaultValue=""
              >
                <option value="">— Pick one (optional) —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
                <option value="Other">Other / not sure</option>
              </select>
            </label>
          </div>
          <div>
            <label className="block">
              <span className="block text-sm font-medium">
                Tell us about your space
              </span>
              <textarea
                name="message"
                rows={5}
                placeholder="Square footage, type of property, special requirements, schedule preferences…"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-gray-100"
              />
            </label>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg px-5 py-3 text-sm font-medium text-ink-950 transition hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            Send quote request
          </button>
          <p className="text-xs text-gray-500">
            By submitting, you agree we may contact you about your inquiry. We
            don't share your info.
          </p>
        </form>

        <aside className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Talk to a person
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {(config?.publicPhone ?? profile?.phone) ? (
                <div>
                  <span className="text-gray-400">Phone</span>
                  <a
                    href={`tel:${(config?.publicPhone ?? profile?.phone ?? "").replace(/[^\d+]/g, "")}`}
                    className="ml-2 font-medium hover:underline"
                  >
                    {config?.publicPhone ?? profile?.phone}
                  </a>
                </div>
              ) : null}
              {(config?.publicEmail ?? profile?.email) ? (
                <div>
                  <span className="text-gray-400">Email</span>
                  <a
                    href={`mailto:${config?.publicEmail ?? profile?.email}`}
                    className="ml-2 font-medium hover:underline"
                  >
                    {config?.publicEmail ?? profile?.email}
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Service area
            </div>
            <p className="mt-2 text-sm">
              {config?.serviceAreaText ?? "Greater Los Angeles + Orange County"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Response time
            </div>
            <p className="mt-2 text-sm">
              We reply to most quote requests within one business day.
            </p>
          </div>
        </aside>
      </div>
    </div>
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
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-gray-100"
      />
    </label>
  );
}
