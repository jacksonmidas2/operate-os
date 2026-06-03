import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

async function recordPayment(slug: string, invoiceId: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  const amountCents = Math.round(Number(formData.get("amount") ?? "0") * 100);
  if (amountCents <= 0) return;

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return;

  await db.payment.create({
    data: {
      invoiceId,
      amountCents,
      method: String(formData.get("method") ?? "ZELLE") as
        | "ZELLE"
        | "PAYPAL"
        | "STRIPE"
        | "WIRE_TRANSFER"
        | "CHECK"
        | "CASH_APP"
        | "VENMO"
        | "BANK_TRANSFER"
        | "CASH"
        | "OTHER",
      paidAt: new Date(),
      reference: (String(formData.get("reference") ?? "") || null) as string | null,
    },
  });

  const sumPaid = await db.payment.aggregate({
    where: { invoiceId },
    _sum: { amountCents: true },
  });
  const paid = sumPaid._sum.amountCents ?? 0;
  const newStatus = paid >= invoice.totalCents ? "PAID" : "PARTIALLY_PAID";
  await db.invoice.update({ where: { id: invoiceId }, data: { status: newStatus } });

  revalidatePath(`/t/${slug}/invoices/${invoice.number}`);
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const { slug, number } = await params;
  const { db, tenant } = await getTenantContext(slug);
  const business = await db.businessProfile.findFirst();

  const invoice = await db.invoice.findUnique({
    where: { number },
    include: {
      client: true,
      lines: { include: { location: true, unit: true } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!invoice) notFound();

  const totalPaid = invoice.payments.reduce((a, p) => a + p.amountCents, 0);
  const balance = invoice.totalCents - totalPaid;

  return (
    <>
      <PageHeader
        title={`Invoice ${invoice.number}`}
        description={`${invoice.client.businessName} · ${invoice.issuedOn.toISOString().slice(0, 10)}`}
      />

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {business?.displayName ?? business?.legalName ?? tenant.legalName}
            </h2>
            {business ? (
              <p className="mt-1 text-sm text-gray-500">
                {business.addressLine1}
                {business.city ? `, ${business.city}` : ""}
                {business.state ? `, ${business.state}` : ""} {business.postalCode}
                <br />
                {business.phone} · {business.email}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-gray-500">Invoice</div>
            <div className="font-mono text-lg">{invoice.number}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs uppercase text-gray-500">Bill to</div>
            <div className="font-medium">{invoice.client.businessName}</div>
            {invoice.client.contactEmail ? (
              <div className="text-gray-500">{invoice.client.contactEmail}</div>
            ) : null}
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-gray-500">Issued</div>
            <div className="font-mono">{invoice.issuedOn.toISOString().slice(0, 10)}</div>
            {invoice.dueOn ? (
              <>
                <div className="mt-1 text-xs uppercase text-gray-500">Due</div>
                <div className="font-mono">{invoice.dueOn.toISOString().slice(0, 10)}</div>
              </>
            ) : null}
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 text-left font-medium">Description</th>
              <th className="py-2 text-left font-medium">Location</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <td className="py-2">{line.description}</td>
                <td className="py-2 text-gray-500">
                  {line.location?.name ?? "—"}
                  {line.unit?.unitNumber ? ` · ${line.unit.unitNumber}` : ""}
                </td>
                <td className="py-2 text-right font-mono">{line.quantity}</td>
                <td className="py-2 text-right font-mono">
                  ${(line.totalCents / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 dark:border-gray-700">
              <td colSpan={3} className="pt-3 text-right text-sm font-medium">Total</td>
              <td className="pt-3 text-right font-mono text-lg font-semibold">
                ${(invoice.totalCents / 100).toFixed(2)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="text-right text-sm text-gray-500">Paid</td>
              <td className="text-right font-mono text-gray-500">
                ${(totalPaid / 100).toFixed(2)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="text-right text-sm font-medium">Balance</td>
              <td className="text-right font-mono font-semibold">
                ${(balance / 100).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Payments</h2>
          <ul className="mt-3 divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {invoice.payments.length === 0 ? (
              <li className="p-4 text-sm text-gray-500">No payments yet.</li>
            ) : (
              invoice.payments.map((p) => (
                <li key={p.id} className="flex justify-between p-3 text-sm">
                  <div>
                    <div className="font-mono">${(p.amountCents / 100).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">
                      {p.method} · {p.paidAt.toISOString().slice(0, 10)}
                    </div>
                  </div>
                  {p.reference ? (
                    <div className="text-xs text-gray-500">{p.reference}</div>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>

        <form
          action={recordPayment.bind(null, slug, invoice.id)}
          className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 className="text-base font-semibold">Record payment</h2>
          <label className="block">
            <span className="block text-sm font-medium">Amount ($)</span>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={(balance / 100).toFixed(2)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium">Method</span>
            <select
              name="method"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option>ZELLE</option><option>PAYPAL</option><option>STRIPE</option>
              <option>WIRE_TRANSFER</option><option>CHECK</option><option>CASH_APP</option>
              <option>VENMO</option><option>BANK_TRANSFER</option><option>CASH</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium">Reference (optional)</span>
            <input
              name="reference"
              placeholder="Check #, Zelle confirmation"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Record payment
          </button>
        </form>
      </section>
    </>
  );
}
