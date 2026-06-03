import { redirect } from "next/navigation";
import {
  getTenantBySlug,
  getOrCreateTenantClient,
} from "@operate/tenant-router";
import { TenantPrismaClient } from "@operate/db-tenant";

const MARKETPLACE_TENANT_SLUG = process.env.MARKETPLACE_TENANT_SLUG ?? "mm";

async function submitBooking(formData: FormData) {
  "use server";
  const tenant = await getTenantBySlug(MARKETPLACE_TENANT_SLUG);
  if (!tenant) {
    throw new Error(
      `Marketplace tenant "${MARKETPLACE_TENANT_SLUG}" not provisioned. Run npm run provision-tenant -- --slug ${MARKETPLACE_TENANT_SLUG} --name "OperateHQ Marketplace"`,
    );
  }
  const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);

  const email = String(formData.get("email") ?? "");
  const customer = await db.customer.upsert({
    where: { email },
    update: {
      name: (String(formData.get("name") ?? "") || undefined) as string | undefined,
      phone: (String(formData.get("phone") ?? "") || undefined) as string | undefined,
    },
    create: {
      email,
      name: String(formData.get("name") ?? ""),
      phone: (String(formData.get("phone") ?? "") || null) as string | null,
    },
  });

  const totalCents = Number(formData.get("price") ?? "0");
  const depositCents = Math.round(totalCents / 2);
  const scheduledStart = new Date(String(formData.get("scheduledStart")));
  const scheduledEnd = new Date(scheduledStart.getTime() + 3 * 3600 * 1000);

  const booking = await db.booking.create({
    data: {
      customerId: customer.id,
      scheduledStart,
      scheduledEnd,
      addressLine1: String(formData.get("addressLine1") ?? ""),
      city: String(formData.get("city") ?? ""),
      state: String(formData.get("state") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      bedroomCount: Number(formData.get("bedrooms") ?? "0"),
      serviceType: "ONE_TIME",
      totalCents,
      depositCents,
      status: "PENDING",
    },
  });

  redirect(`/book/confirm/${booking.id}`);
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    bedrooms?: string;
    bathrooms?: string;
    sqft?: string;
    price?: string;
  }>;
}) {
  const sp = await searchParams;
  const price = Number(sp.price ?? "0");
  const deposit = Math.round(price / 2);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <form action={submitBooking} className="space-y-5 lg:col-span-2">
        <input type="hidden" name="bedrooms" value={sp.bedrooms ?? "2"} />
        <input type="hidden" name="bathrooms" value={sp.bathrooms ?? "1"} />
        <input type="hidden" name="sqft" value={sp.sqft ?? "900"} />
        <input type="hidden" name="price" value={String(price)} />

        <h1 className="text-2xl font-semibold">Book your cleaning</h1>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" name="name" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Phone" name="phone" type="tel" />
          <Field label="Date + time" name="scheduledStart" type="datetime-local" required />
          <div className="sm:col-span-2">
            <Field label="Address" name="addressLine1" required />
          </div>
          <Field label="City" name="city" required />
          <div className="grid grid-cols-2 gap-4">
            <Field label="State" name="state" required />
            <Field label="ZIP" name="postalCode" required />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700"
        >
          Confirm booking — pay deposit
        </button>
        <p className="text-xs text-gray-500">
          Phase 10 wires Stripe deposit charge here. For now, the booking is
          recorded as pending and a cleaner gets dispatched.
        </p>
      </form>

      <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-base font-semibold">Order summary</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Bedrooms" value={sp.bedrooms ?? "2"} />
          <Row label="Bathrooms" value={sp.bathrooms ?? "1"} />
          <Row label="Square feet" value={sp.sqft ?? "900"} />
        </dl>
        <hr className="my-4 border-gray-200 dark:border-gray-700" />
        <dl className="space-y-2 text-sm">
          <Row label="Total" value={`$${(price / 100).toFixed(2)}`} bold />
          <Row label="Due today (50%)" value={`$${(deposit / 100).toFixed(2)}`} />
          <Row label="Due on completion" value={`$${((price - deposit) / 100).toFixed(2)}`} />
        </dl>
      </aside>
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
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800"
      />
    </label>
  );
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className={bold ? "font-semibold" : "text-gray-500"}>{label}</dt>
      <dd className={bold ? "font-semibold font-mono" : "font-mono"}>{value}</dd>
    </div>
  );
}
