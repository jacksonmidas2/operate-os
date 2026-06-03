import { notFound } from "next/navigation";
import {
  getTenantBySlug,
  getOrCreateTenantClient,
} from "@operate/tenant-router";
import { TenantPrismaClient } from "@operate/db-tenant";

const MARKETPLACE_TENANT_SLUG = process.env.MARKETPLACE_TENANT_SLUG ?? "mm";

export default async function BookingConfirmedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getTenantBySlug(MARKETPLACE_TENANT_SLUG);
  if (!tenant) notFound();
  const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);
  const booking = await db.booking.findUnique({
    where: { id },
    include: { customer: true },
  });
  if (!booking) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 dark:border-green-900/40 dark:bg-green-900/20">
        <div className="text-4xl">✓</div>
        <h1 className="mt-2 text-2xl font-semibold">Booking confirmed</h1>
        <p className="mt-1 text-sm text-gray-200">
          We've got it on the schedule. A cleaner will be assigned shortly.
        </p>
      </div>

      <dl className="mt-6 divide-y divide-white/5 rounded-2xl border border-white/10 bg-white text-sm">
        <Row label="Booking ID" value={booking.id} />
        <Row label="Customer" value={`${booking.customer?.name ?? "—"} (${booking.customer?.email ?? "—"})`} />
        <Row
          label="When"
          value={booking.scheduledStart.toLocaleString(undefined, {
            dateStyle: "full",
            timeStyle: "short",
          })}
        />
        <Row
          label="Address"
          value={`${booking.addressLine1}, ${booking.city}, ${booking.state} ${booking.postalCode}`}
        />
        <Row label="Total" value={`$${(booking.totalCents / 100).toFixed(2)}`} />
        <Row label="Deposit" value={`$${(booking.depositCents / 100).toFixed(2)}`} />
        <Row label="Status" value={booking.status} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
