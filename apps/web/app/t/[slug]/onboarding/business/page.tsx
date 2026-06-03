import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

async function saveBusiness(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  const existing = await db.businessProfile.findFirst();
  const data = {
    legalName: String(formData.get("legalName") ?? ""),
    displayName: (String(formData.get("displayName") ?? "") || null) as string | null,
    entityType: String(formData.get("entityType") ?? "LLC") as
      | "LLC"
      | "S_CORP"
      | "C_CORP"
      | "PARTNERSHIP"
      | "SOLE_PROPRIETOR"
      | "OTHER",
    ein: (String(formData.get("ein") ?? "") || null) as string | null,
    licenseNumber: (String(formData.get("licenseNumber") ?? "") || null) as
      | string
      | null,
    addressLine1: (String(formData.get("addressLine1") ?? "") || null) as
      | string
      | null,
    city: (String(formData.get("city") ?? "") || null) as string | null,
    state: (String(formData.get("state") ?? "") || null) as string | null,
    postalCode: (String(formData.get("postalCode") ?? "") || null) as
      | string
      | null,
    phone: (String(formData.get("phone") ?? "") || null) as string | null,
    email: (String(formData.get("email") ?? "") || null) as string | null,
  };
  if (existing) {
    await db.businessProfile.update({ where: { id: existing.id }, data });
  } else {
    await db.businessProfile.create({ data });
  }
  redirect(`/t/${slug}/onboarding`);
}

export default async function BusinessOnboardingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);
  const profile = await db.businessProfile.findFirst();
  const save = saveBusiness.bind(null, slug);

  return (
    <>
      <PageHeader
        title="1. Business info"
        description="The legal foundation. Used on every invoice and contract."
      />

      <form
        action={save}
        className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2"
      >
        <Field label="Legal name" name="legalName" defaultValue={profile?.legalName ?? ""} required />
        <Field label="Display name" name="displayName" defaultValue={profile?.displayName ?? ""} />
        <SelectField
          label="Entity type"
          name="entityType"
          defaultValue={profile?.entityType ?? "LLC"}
          options={["LLC", "S_CORP", "C_CORP", "PARTNERSHIP", "SOLE_PROPRIETOR", "OTHER"]}
        />
        <Field label="EIN" name="ein" defaultValue={profile?.ein ?? ""} />
        <Field label="License #" name="licenseNumber" defaultValue={profile?.licenseNumber ?? ""} />
        <Field label="Phone" name="phone" defaultValue={profile?.phone ?? ""} />
        <Field label="Email" name="email" type="email" defaultValue={profile?.email ?? ""} />
        <Field label="Address" name="addressLine1" defaultValue={profile?.addressLine1 ?? ""} />
        <Field label="City" name="city" defaultValue={profile?.city ?? ""} />
        <Field label="State" name="state" defaultValue={profile?.state ?? ""} />
        <Field label="ZIP" name="postalCode" defaultValue={profile?.postalCode ?? ""} />

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Save business info
          </button>
        </div>
      </form>
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
  defaultValue?: string | null;
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
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
