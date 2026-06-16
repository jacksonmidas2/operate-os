import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";

async function updateLead(
  slug: string,
  id: string,
  formData: FormData,
) {
  "use server";
  const { db } = await getTenantContext(slug);
  await db.lead.update({
    where: { id },
    data: {
      status: String(formData.get("status") ?? "NEW") as
        | "NEW"
        | "CONTACTED"
        | "QUOTED"
        | "WON"
        | "LOST",
      notes: (String(formData.get("notes") ?? "").trim() || null) as
        | string
        | null,
    },
  });
  revalidatePath(`/t/${slug}/leads/${id}`);
  revalidatePath(`/t/${slug}/leads`);
}

async function convertToClient(slug: string, id: string) {
  "use server";
  const { db } = await getTenantContext(slug);
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return;
  const client = await db.client.create({
    data: {
      businessName: lead.name,
      contactEmail: lead.email ?? null,
      contactPhone: lead.phone ?? null,
      notes: [lead.message, lead.notes].filter(Boolean).join("\n\n") || null,
    },
  });
  await db.lead.update({
    where: { id },
    data: { status: "WON" },
  });
  revalidatePath(`/t/${slug}/clients`);
  redirect(`/t/${slug}/clients/${client.id}`);
}

async function deleteLead(slug: string, id: string) {
  "use server";
  const { db } = await getTenantContext(slug);
  await db.lead.delete({ where: { id } });
  redirect(`/t/${slug}/leads`);
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { db } = await getTenantContext(slug);
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) notFound();

  const update = updateLead.bind(null, slug, id);

  return (
    <>
      <PageHeader
        title={lead.name}
        description={`From ${lead.source} · ${lead.createdAt.toLocaleString()}`}
        actions={
          <Link
            href={`/t/${slug}/leads`}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-gray-200 hover:bg-white/5"
          >
            ← Back
          </Link>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Inquiry
          </h2>
          <div className="mt-3 space-y-3 text-sm">
            <Row label="Name" value={lead.name} />
            <Row label="Email" value={lead.email ?? "—"} />
            <Row label="Phone" value={lead.phone ?? "—"} />
            <Row label="Service interest" value={lead.serviceInterest ?? "—"} />
            <Row label="Address hint" value={lead.addressHint ?? "—"} />
          </div>
          {lead.message ? (
            <>
              <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Message
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                {lead.message}
              </p>
            </>
          ) : null}
        </section>

        <aside className="space-y-4">
          <form
            action={update}
            className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Update
            </h2>
            <label className="block">
              <span className="block text-sm font-medium">Status</span>
              <select
                name="status"
                defaultValue={lead.status}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100"
              >
                {(["NEW", "CONTACTED", "QUOTED", "WON", "LOST"] as const).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium">Internal notes</span>
              <textarea
                name="notes"
                rows={4}
                defaultValue={lead.notes ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
            >
              Save
            </button>
          </form>

          <form
            action={convertToClient.bind(null, slug, id)}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Convert
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Create a Client record from this lead and mark it WON.
            </p>
            <button
              type="submit"
              className="mt-3 w-full rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/5"
            >
              Convert to client →
            </button>
          </form>

          <form action={deleteLead.bind(null, slug, id)}>
            <button
              type="submit"
              className="w-full rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
            >
              Delete lead
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right text-gray-200">{value}</span>
    </div>
  );
}
