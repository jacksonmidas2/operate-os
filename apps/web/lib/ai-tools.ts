import type { TenantPrismaClient } from "@operate/db-tenant";
import { computePnL } from "@operate/db-tenant/reporting";
import type { ChatTool } from "@operate/providers";

/**
 * Tools the AI co-pilot can call to query a tenant's business data.
 * Each tool returns a small, JSON-serializable payload.
 */
export const AI_TOOLS: ChatTool[] = [
  {
    name: "get_dashboard_summary",
    description:
      "Get a quick snapshot of the cleaning business: client/location/employee counts and this month's revenue, expenses, and net profit.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_unpaid_invoices",
    description:
      "Return invoices that have been sent but not fully paid (status: SENT, PARTIALLY_PAID, OVERDUE).",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max invoices to return (default 20).",
        },
      },
    },
  },
  {
    name: "list_recent_jobs",
    description:
      "Return the most recent jobs, scheduled or completed.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "default 10" },
        statusFilter: {
          type: "string",
          enum: ["all", "scheduled", "in_progress", "completed"],
        },
      },
    },
  },
  {
    name: "draft_review_request",
    description:
      "Draft a polite, brand-appropriate text message asking a customer for a Google review after a completed job.",
    inputSchema: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        serviceDescription: { type: "string" },
      },
      required: ["customerName"],
    },
  },
];

export async function runTool(
  db: TenantPrismaClient,
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  if (name === "get_dashboard_summary") {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [clients, locations, employees, openJobs, pnl] = await Promise.all([
      db.client.count(),
      db.location.count(),
      db.employee.count(),
      db.job.count({
        where: { status: { in: ["SCHEDULED", "EN_ROUTE", "IN_PROGRESS"] } },
      }),
      computePnL(db, monthStart, monthEnd),
    ]);
    return {
      clients,
      locations,
      employees,
      openJobs,
      thisMonth: {
        revenue: `$${(pnl.revenueCents / 100).toFixed(2)}`,
        expenses: `$${(pnl.expensesCents / 100).toFixed(2)}`,
        netProfit: `$${(pnl.netProfitCents / 100).toFixed(2)}`,
      },
    };
  }

  if (name === "list_unpaid_invoices") {
    const limit = Math.min(Number(input.limit ?? 20), 100);
    const invoices = await db.invoice.findMany({
      where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      include: { client: true, payments: true },
      orderBy: { issuedOn: "asc" },
      take: limit,
    });
    return invoices.map((i) => {
      const paid = i.payments.reduce((a, p) => a + p.amountCents, 0);
      return {
        number: i.number,
        client: i.client.businessName,
        issued: i.issuedOn.toISOString().slice(0, 10),
        due: i.dueOn?.toISOString().slice(0, 10) ?? null,
        total: `$${(i.totalCents / 100).toFixed(2)}`,
        paid: `$${(paid / 100).toFixed(2)}`,
        balance: `$${((i.totalCents - paid) / 100).toFixed(2)}`,
        status: i.status,
      };
    });
  }

  if (name === "list_recent_jobs") {
    const limit = Math.min(Number(input.limit ?? 10), 50);
    const statusFilter = String(input.statusFilter ?? "all");
    const where =
      statusFilter === "scheduled"
        ? { status: "SCHEDULED" as const }
        : statusFilter === "in_progress"
          ? { status: { in: ["EN_ROUTE", "IN_PROGRESS"] as ("EN_ROUTE" | "IN_PROGRESS")[] } }
          : statusFilter === "completed"
            ? { status: "COMPLETED" as const }
            : undefined;
    const jobs = await db.job.findMany({
      where,
      include: {
        location: { include: { client: true } },
        unit: true,
        assignments: { include: { employee: true } },
      },
      orderBy: { scheduledStart: "desc" },
      take: limit,
    });
    return jobs.map((j) => ({
      date: j.scheduledStart.toISOString().slice(0, 10),
      client: j.location.client.businessName,
      location: j.location.name,
      unit: j.unit?.unitNumber ?? null,
      status: j.status,
      assigned: j.assignments.map(
        (a) => `${a.employee.firstName} ${a.employee.lastName}`,
      ),
    }));
  }

  if (name === "draft_review_request") {
    // Pure formatting tool — the model could have done this inline, but
    // gating it as a tool prevents accidental "send" sounding language
    // until the operator approves.
    const customerName = String(input.customerName ?? "there");
    const service = String(input.serviceDescription ?? "your cleaning");
    return {
      draft:
        `Hi ${customerName}, thanks again for choosing us for ${service}! ` +
        `If we did a good job, could we ask you to leave a quick Google ` +
        `review? It really helps a small business like ours. — M&M Cleaning`,
    };
  }

  return { error: `unknown tool: ${name}` };
}
