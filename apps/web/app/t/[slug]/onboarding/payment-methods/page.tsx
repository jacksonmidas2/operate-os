import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

const TYPES = [
  "ZELLE",
  "PAYPAL",
  "STRIPE",
  "WIRE_TRANSFER",
  "CHECK",
  "CASH_APP",
  "VENMO",
  "BANK_TRANSFER",
  "CASH",
  "OTHER",
] as const;

async function addPaymentMethod(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  await db.paymentMethod.create({
    data: {
      type: String(formData.get("type") ?? "ZELLE") as (typeof TYPES)[number],
      identifier:
        (String(formData.get("identifier") ?? "") || null) as string | null,
      instructions:
        (String(formData.get("instructions") ?? "") || null) as string | null,
    },
  });
  revalidatePath(`/t/${slug}/onboarding/payment-methods`);
}

export default async function PaymentMethodsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);
  const methods = await db.paymentMethod.findMany({
    orderBy: { displayOrder: "asc" },
  });
  const add = addPaymentMethod.bind(null, slug);

  return (
    <>
      <PageHeader
        title="6. Payment methods"
        description="How your clients can pay you. Shown on invoices."
      />

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          action={add}
          className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-card p-5"
        >
          <h2 className="text-base font-semibold">Accept payment via…</h2>
          <label className="block">
            <span className="block text-sm font-medium">Type</span>
            <select
              name="type"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium">Identifier</span>
            <input
              name="identifier"
              placeholder="email / phone / account ref"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium">Instructions</span>
            <textarea
              name="instructions"
              rows={2}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
          >
            Add method
          </button>
        </form>

        <ul className="space-y-2 lg:col-span-2">
          {methods.length === 0 ? (
            <li className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-500">
              No payment methods yet.
            </li>
          ) : (
            methods.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4"
              >
                <div className="font-medium">{m.type.replace("_", " ")}</div>
                {m.identifier ? (
                  <div className="mt-1 text-sm text-gray-500">
                    {m.identifier}
                  </div>
                ) : null}
                {m.instructions ? (
                  <div className="mt-1 text-xs text-gray-500">
                    {m.instructions}
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>
    </>
  );
}
