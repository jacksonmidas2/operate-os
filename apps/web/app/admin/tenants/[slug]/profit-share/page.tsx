import { notFound, redirect } from "next/navigation";
import { controlPrisma, type ProfitBasis } from "@operate/db-control";
import { PageHeader } from "@/components/Shell";

async function saveProfitShare(slug: string, formData: FormData) {
  "use server";
  const tenant = await controlPrisma.tenant.findUnique({ where: { slug } });
  if (!tenant) throw new Error("tenant not found");

  const splitBasisPoints = Math.round(
    Number(formData.get("splitPercent") ?? "0") * 100,
  );
  const basis = String(formData.get("basis") ?? "NET_PROFIT") as ProfitBasis;
  const buyoutMultiple = Number(formData.get("buyoutMultiple") ?? "24");
  const setupFeeCents = Math.round(
    Number(formData.get("setupFee") ?? "0") * 100,
  );
  const startDate = new Date(String(formData.get("startDate")));

  await controlPrisma.profitShareConfig.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      splitBasisPoints,
      basis,
      buyoutMultiple,
      setupFeeCents,
      startDate,
    },
    update: {
      splitBasisPoints,
      basis,
      buyoutMultiple,
      setupFeeCents,
      startDate,
    },
  });

  redirect(`/admin/tenants/${slug}`);
}

export default async function ProfitSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await controlPrisma.tenant.findUnique({
    where: { slug },
    include: { profitShareConfig: true },
  });
  if (!tenant) notFound();

  const cfg = tenant.profitShareConfig;
  const save = saveProfitShare.bind(null, slug);

  return (
    <>
      <PageHeader
        title={`Profit share — ${tenant.legalName}`}
        description="Per the operator contract. Used to compute the monthly billing event."
      />

      <form
        action={save}
        className="mt-6 max-w-xl space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <label className="block">
          <span className="block text-sm font-medium">Split (%)</span>
          <input
            name="splitPercent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={cfg ? cfg.splitBasisPoints / 100 : 40}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Basis</span>
          <select
            name="basis"
            defaultValue={cfg?.basis ?? "NET_PROFIT"}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="NET_PROFIT">Net profit</option>
            <option value="GROSS_REVENUE">Gross revenue</option>
            <option value="NET_REVENUE">Net revenue (direct costs only)</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-medium">
            Buyout multiple (x trailing monthly payment)
          </span>
          <input
            name="buyoutMultiple"
            type="number"
            min="0"
            defaultValue={cfg?.buyoutMultiple ?? 24}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Setup fee ($)</span>
          <input
            name="setupFee"
            type="number"
            step="0.01"
            min="0"
            defaultValue={cfg ? cfg.setupFeeCents / 100 : 0}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Start date</span>
          <input
            name="startDate"
            type="date"
            required
            defaultValue={
              cfg
                ? cfg.startDate.toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10)
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Save profit-share
        </button>
      </form>
    </>
  );
}
