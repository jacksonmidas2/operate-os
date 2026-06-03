import Link from "next/link";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

const SECTIONS = [
  { key: "business", label: "1. Business info", href: "business" },
  { key: "clients", label: "2. Clients + locations", href: "clients" },
  { key: "schedule", label: "3. Cleaning schedule", href: "schedule" },
  { key: "scope", label: "4. Scope of work", href: "scope" },
  { key: "supplies", label: "5. Supplies + expenses", href: "supplies" },
  { key: "payment-methods", label: "6. Payment methods", href: "payment-methods" },
  { key: "employees", label: "7. Employees", href: "employees" },
  { key: "employee-docs", label: "8. Employee docs", href: "employee-docs" },
  { key: "insurance", label: "9. Insurance", href: "insurance" },
  { key: "existing-systems", label: "10. Existing systems", href: "existing-systems" },
] as const;

export default async function OnboardingHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db } = await getTenantContext(slug);

  const counts = await Promise.all([
    db.businessProfile.count(),
    db.client.count(),
    db.serviceSchedule.count(),
    db.scopeItem.count(),
    db.supplyEstimate.count(),
    db.paymentMethod.count(),
    db.employee.count(),
    db.employeeDocument.count(),
    db.insurancePolicy.count(),
    db.existingSystem.count(),
  ]);

  const sectionsWithStatus = SECTIONS.map((s, i) => ({
    ...s,
    count: counts[i] ?? 0,
    done: (counts[i] ?? 0) > 0,
  }));

  const done = sectionsWithStatus.filter((s) => s.done).length;
  const total = sectionsWithStatus.length;
  const pct = Math.round((done / total) * 100);

  return (
    <>
      <PageHeader
        title="Onboarding"
        description="Walk through 10 sections to fully set up your business."
      />

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">
              {done} of {total} sections complete
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Each section saves to your tenant database.
            </div>
          </div>
          <div className="text-3xl font-semibold text-brand-600">{pct}%</div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sectionsWithStatus.map((s) => (
          <li key={s.key}>
            <Link
              href={`/t/${slug}/onboarding/${s.href}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand-500 dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <div className="font-medium">{s.label}</div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {s.count} {s.count === 1 ? "record" : "records"}
                </div>
              </div>
              <div
                className={`text-xs font-medium ${
                  s.done ? "text-green-600" : "text-gray-400"
                }`}
              >
                {s.done ? "✓ done" : "pending"}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
