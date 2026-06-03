import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

async function dispatchBooking(slug: string, bookingId: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  const employeeId = String(formData.get("employeeId") ?? "");
  if (!employeeId) return;

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;

  // Materialize the booking as a Job in the operator's pipeline.
  const job = await db.job.create({
    data: {
      // Synthesize an ad-hoc Location for this booking address.
      locationId: await ensureMarketplaceLocation(db, booking),
      scheduledStart: booking.scheduledStart,
      scheduledEnd: booking.scheduledEnd,
      serviceType: booking.serviceType,
      notes: `Marketplace booking ${booking.id}`,
    },
  });
  await db.jobAssignment.create({
    data: { jobId: job.id, employeeId },
  });
  await db.booking.update({
    where: { id: bookingId },
    data: { status: "ASSIGNED" },
  });
  revalidatePath(`/t/${slug}/dispatch`);
}

async function ensureMarketplaceLocation(
  db: Awaited<ReturnType<typeof getTenantContext>>["db"],
  booking: {
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
  },
): Promise<string> {
  // Look for a synthetic "Marketplace" client + per-address location.
  const marketplaceClient = await db.client.upsert({
    where: { id: "marketplace" },
    update: {},
    create: {
      id: "marketplace",
      businessName: "Marketplace bookings",
      billingStructure: "PER_VISIT",
    },
  });
  const key = `${booking.addressLine1}-${booking.postalCode}`.toLowerCase();
  const loc = await db.location.upsert({
    where: { id: `mp-${key}` },
    update: {},
    create: {
      id: `mp-${key}`,
      clientId: marketplaceClient.id,
      name: booking.addressLine1,
      addressLine1: booking.addressLine1,
      city: booking.city,
      state: booking.state,
      postalCode: booking.postalCode,
    },
  });
  return loc.id;
}

export default async function DispatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);
  const [bookings, employees] = await Promise.all([
    db.booking.findMany({
      where: { status: "PENDING" },
      include: { customer: true },
      orderBy: { scheduledStart: "asc" },
    }),
    db.employee.findMany({ orderBy: { firstName: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Dispatch"
        description="Marketplace bookings waiting for an assigned cleaner."
      />

      {bookings.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
          No pending bookings. ✨
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {bookings.map((b) => (
            <li
              key={b.id}
              className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-3"
            >
              <div className="sm:col-span-2">
                <div className="font-medium">
                  {b.customer?.name ?? "—"} · ${(b.totalCents / 100).toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  {b.scheduledStart.toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
                <div className="mt-1 text-sm">
                  {b.addressLine1}, {b.city}, {b.state} {b.postalCode}
                  {b.bedroomCount ? ` · ${b.bedroomCount} BR` : ""}
                </div>
              </div>
              <form
                action={dispatchBooking.bind(null, slug, b.id)}
                className="flex gap-2"
              >
                <select
                  name="employeeId"
                  required
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="">— assign cleaner —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Dispatch
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
