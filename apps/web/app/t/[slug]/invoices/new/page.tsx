import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

async function createInvoice(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);

  const clientId = String(formData.get("clientId") ?? "");
  const issuedOn = new Date(String(formData.get("issuedOn") ?? new Date()));

  const business = await db.businessProfile.findFirst();
  const prefix = business?.invoicePrefix ?? "INV";
  const seq = business?.nextInvoiceSeq ?? 1;
  const number = `${prefix}-${String(seq).padStart(5, "0")}`;

  const lineDescs = formData.getAll("lineDescription").map(String);
  const linePrices = formData.getAll("linePrice").map((v) => Number(v ?? 0));
  const lineUnits = formData.getAll("lineUnitId").map(String);

  const lines = lineDescs
    .map((desc, i) => ({
      description: desc,
      unitPriceCents: Math.round((linePrices[i] ?? 0) * 100),
      totalCents: Math.round((linePrices[i] ?? 0) * 100),
      unitId: lineUnits[i] || null,
    }))
    .filter((l) => l.description && l.unitPriceCents > 0);

  if (lines.length === 0) {
    throw new Error("at least one non-zero line is required");
  }

  const total = lines.reduce((a, l) => a + l.totalCents, 0);

  await db.$transaction([
    db.invoice.create({
      data: {
        number,
        clientId,
        issuedOn,
        totalCents: total,
        status: "DRAFT",
        lines: { create: lines.map((l) => ({ ...l, quantity: 1 })) },
      },
    }),
    ...(business
      ? [
          db.businessProfile.update({
            where: { id: business.id },
            data: { nextInvoiceSeq: seq + 1 },
          }),
        ]
      : []),
  ]);

  redirect(`/t/${slug}/invoices/${number}`);
}

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);
  const clients = await db.client.findMany({
    include: {
      locations: { include: { units: true } },
    },
    orderBy: { businessName: "asc" },
  });

  return (
    <>
      <PageHeader title="New invoice" />

      <form
        action={createInvoice.bind(null, slug)}
        className="mt-6 max-w-3xl space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-card p-6"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="block text-sm font-medium">Client</span>
            <select
              name="clientId"
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium">Issue date</span>
            <input
              name="issuedOn"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div>
          <div className="text-sm font-medium">Line items</div>
          <p className="mt-1 text-xs text-gray-500">
            Add up to 6 lines. Future iteration: auto-fill from completed jobs.
          </p>
          <div className="mt-2 space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input
                  name="lineDescription"
                  placeholder={`Line ${i + 1} description`}
                  className="col-span-7 rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm"
                />
                <select
                  name="lineUnitId"
                  className="col-span-3 rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-2 py-2 text-xs"
                >
                  <option value="">— no unit —</option>
                  {clients.flatMap((c) =>
                    c.locations.flatMap((l) =>
                      l.units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {l.name} · {u.unitNumber}
                        </option>
                      )),
                    ),
                  )}
                </select>
                <input
                  name="linePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="col-span-2 rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-right text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
        >
          Create invoice
        </button>
      </form>
    </>
  );
}
