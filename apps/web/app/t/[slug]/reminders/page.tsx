import Link from "next/link";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";
import { RemindersList, type ReminderItem } from "./RemindersList";

export default async function RemindersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db, tenant } = await getTenantContext(slug);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const invoices = await db.invoice.findMany({
    where: {
      status: { in: ["SENT", "PARTIALLY_PAID"] },
      dueOn: { not: null },
    },
    include: { client: true },
    orderBy: { dueOn: "asc" },
    take: 100,
  });

  const items: ReminderItem[] = [];
  for (const inv of invoices) {
    if (!inv.dueOn) continue;
    const dueDay = new Date(inv.dueOn);
    dueDay.setHours(0, 0, 0, 0);
    const daysUntil = Math.round(
      (dueDay.getTime() - startOfToday.getTime()) / 86_400_000,
    );
    if (daysUntil > 14) continue; // only overdue or due within two weeks
    const state: ReminderItem["state"] =
      daysUntil < 0 ? "overdue" : daysUntil === 0 ? "today" : "upcoming";
    items.push({
      id: inv.id,
      number: inv.number,
      clientName: inv.client.businessName,
      contact: inv.client.mainContactName ?? inv.client.businessName,
      amount: fmtMoney(inv.totalCents),
      dueLabel: inv.dueOn.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      state,
      days: Math.abs(daysUntil),
    });
  }

  const rank = { overdue: 0, today: 1, upcoming: 2 } as const;
  items.sort(
    (a, b) =>
      rank[a.state] - rank[b.state] ||
      (a.state === "overdue" ? b.days - a.days : a.days - b.days),
  );

  const businessName = tenant.displayName ?? tenant.legalName;

  return (
    <>
      <PageHeader
        title="Payment reminders"
        description="Auto-drafted from each invoice's due date. Copy and send when you're ready — nothing is sent automatically."
        actions={
          <Link
            href={`/t/${slug}/invoices`}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-100 hover:bg-white/[0.08]"
          >
            All invoices
          </Link>
        }
      />

      {items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-400">
          No upcoming or overdue invoices need reminders right now.
        </p>
      ) : (
        <RemindersList items={items} businessName={businessName} />
      )}
    </>
  );
}

function fmtMoney(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0
    ? `$${dollars.toLocaleString()}`
    : `$${dollars.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
}
