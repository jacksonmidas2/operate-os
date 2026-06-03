import { redirect } from "next/navigation";
import { controlPrisma } from "@operate/db-control";
import { closeMonth } from "@operate/db-control/billing";
import { PageHeader } from "@/components/Shell";

async function runClose(formData: FormData) {
  "use server";
  const slug = String(formData.get("tenantSlug") ?? "");
  const yearMonth = String(formData.get("yearMonth") ?? "");
  const [yStr, mStr] = yearMonth.split("-");
  const year = Number(yStr);
  const month = Number(mStr) - 1;
  const periodStart = new Date(Date.UTC(year, month, 1));
  const periodEnd = new Date(Date.UTC(year, month + 1, 1));
  await closeMonth({ tenantSlug: slug, periodStart, periodEnd });
  redirect("/admin/billing");
}

export default async function NewBillingClosePage() {
  const tenants = await controlPrisma.tenant.findMany({
    include: { profitShareConfig: true },
    orderBy: { legalName: "asc" },
  });
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultYm = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

  return (
    <>
      <PageHeader
        title="Close month"
        description="Compute the tenant's P&L for the period, then bill our profit share."
      />

      <form
        action={runClose}
        className="mt-6 max-w-md space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-card p-6"
      >
        <label className="block">
          <span className="block text-sm font-medium">Tenant</span>
          <select
            name="tenantSlug"
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm"
          >
            {tenants
              .filter((t) => t.profitShareConfig)
              .map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.legalName} —{" "}
                  {t.profitShareConfig
                    ? `${t.profitShareConfig.splitBasisPoints / 100}% of ${t.profitShareConfig.basis.toLowerCase().replace("_", " ")}`
                    : ""}
                </option>
              ))}
          </select>
          <span className="mt-1 block text-xs text-gray-500">
            Only tenants with a profit-share contract appear here.
          </span>
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Month</span>
          <input
            name="yearMonth"
            type="month"
            required
            defaultValue={defaultYm}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
        >
          Run close + create billing event
        </button>

        <p className="text-xs text-gray-500">
          Idempotent: running the same (tenant, month) twice returns the existing
          event without re-billing.
        </p>
      </form>
    </>
  );
}
