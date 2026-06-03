import Link from "next/link";
import { PageHeader } from "@/components/Shell";

/**
 * Stub for onboarding sections not yet built out (3, 4, 5, 8, 9, 10).
 * Captures the section name so users can see what's coming. Replace with
 * real forms following the same pattern as business/clients/employees.
 */
const SECTION_LABELS: Record<string, string> = {
  schedule: "3. Cleaning schedule",
  scope: "4. Scope of work",
  supplies: "5. Supplies + expenses",
  "employee-docs": "8. Employee documentation",
  insurance: "9. Insurance",
  "existing-systems": "10. Existing systems",
};

export default async function OnboardingSectionStub({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}) {
  const { slug, section } = await params;
  const label = SECTION_LABELS[section];
  if (!label) {
    return (
      <p className="text-sm text-gray-500">
        Unknown section: <code>{section}</code>.
      </p>
    );
  }

  return (
    <>
      <PageHeader
        title={label}
        description="This section's form lands in the next iteration. The data model is in place — fields just need to be wired."
      />

      <div className="mt-6 rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The tenant DB already has the table for this section. The form
          follows the same pattern as{" "}
          <Link
            href={`/t/${slug}/onboarding/clients`}
            className="text-brand-600 underline"
          >
            clients
          </Link>{" "}
          and{" "}
          <Link
            href={`/t/${slug}/onboarding/employees`}
            className="text-brand-600 underline"
          >
            employees
          </Link>
          .
        </p>
        <Link
          href={`/t/${slug}/onboarding`}
          className="mt-4 inline-block rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          ← Back to checklist
        </Link>
      </div>
    </>
  );
}
