import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

async function addEmployee(slug: string, formData: FormData) {
  "use server";
  const { db } = await getTenantContext(slug);
  await db.employee.create({
    data: {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      phone: (String(formData.get("phone") ?? "") || null) as string | null,
      email: (String(formData.get("email") ?? "") || null) as string | null,
      employmentType: String(formData.get("employmentType") ?? "CONTRACTOR") as
        | "W2"
        | "CONTRACTOR",
      payRateCents: Math.round(
        Number(formData.get("payRate") ?? "0") * 100,
      ),
      payRateUnit: String(formData.get("payRateUnit") ?? "HOURLY") as
        | "HOURLY"
        | "PER_VISIT"
        | "FLAT_MONTHLY"
        | "PER_UNIT",
      paymentMethod: String(formData.get("paymentMethod") ?? "ZELLE") as
        | "ZELLE"
        | "DIRECT_DEPOSIT"
        | "CHECK"
        | "CASH"
        | "PAYPAL"
        | "VENMO",
      paymentDetail:
        (String(formData.get("paymentDetail") ?? "") || null) as string | null,
      status: String(formData.get("status") ?? "GREEN") as
        | "GREEN"
        | "YELLOW"
        | "RED",
    },
  });
  revalidatePath(`/t/${slug}/onboarding/employees`);
}

export default async function EmployeesOnboardingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);
  const employees = await db.employee.findMany({
    orderBy: { createdAt: "desc" },
  });
  const add = addEmployee.bind(null, slug);

  return (
    <>
      <PageHeader
        title="7. Employees"
        description="Your roster. Color status: green = clean, yellow = warning, red = final."
      />

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          action={add}
          className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-card p-5 lg:col-span-1"
        >
          <h2 className="text-base font-semibold">Add employee</h2>
          <div className="grid grid-cols-2 gap-2">
            <Field label="First name" name="firstName" required />
            <Field label="Last name" name="lastName" required />
          </div>
          <Field label="Phone" name="phone" />
          <Field label="Email" name="email" type="email" />
          <Select
            label="Type"
            name="employmentType"
            options={["CONTRACTOR", "W2"]}
          />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Pay rate ($)" name="payRate" type="number" />
            <Select
              label="Per"
              name="payRateUnit"
              options={["HOURLY", "PER_VISIT", "FLAT_MONTHLY", "PER_UNIT"]}
            />
          </div>
          <Select
            label="Pay via"
            name="paymentMethod"
            options={["ZELLE", "DIRECT_DEPOSIT", "CHECK", "CASH", "PAYPAL", "VENMO"]}
          />
          <Field
            label="Payment detail (email/phone/acct)"
            name="paymentDetail"
          />
          <Select
            label="Status"
            name="status"
            options={["GREEN", "YELLOW", "RED"]}
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
          >
            Add employee
          </button>
        </form>

        <ul className="space-y-2 lg:col-span-2">
          {employees.length === 0 ? (
            <li className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-500">
              No employees yet.
            </li>
          ) : (
            employees.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4"
              >
                <div>
                  <div className="font-medium">
                    {e.firstName} {e.lastName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {e.employmentType} · ${(e.payRateCents / 100).toFixed(2)}/
                    {e.payRateUnit.toLowerCase().replace("_", " ")} · pays via {" "}
                    {e.paymentMethod.toLowerCase().replace("_", " ")}
                  </div>
                </div>
                <StatusPill status={e.status} />
              </li>
            ))
          )}
        </ul>
      </section>
    </>
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
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm shadow-sm"
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      <select
        name={name}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm shadow-sm"
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

function StatusPill({ status }: { status: string }) {
  const color =
    status === "GREEN"
      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
      : status === "YELLOW"
        ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
        : "bg-red-500/15 text-red-300 ring-1 ring-red-500/30";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
