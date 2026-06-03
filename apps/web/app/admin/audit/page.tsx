import { controlPrisma } from "@operate/db-control";
import { PageHeader } from "@/components/Shell";

export default async function AuditLogPage() {
  const logs = await controlPrisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { tenant: true },
  });

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every super-admin action + cross-tenant event. Append-only."
      />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-left text-[10px] uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Tenant</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No audit entries yet. Actions like tenant provisioning,
                  profit-share changes, and billing closes will appear here as
                  we wire them up.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {log.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-4 py-2 font-medium">{log.action}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {log.tenant?.legalName ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {log.userId ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {log.metadata ? (
                      <code className="rounded bg-white/[0.06] px-1 py-0.5 text-xs">
                        {JSON.stringify(log.metadata).slice(0, 60)}
                      </code>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Note: audit log writes happen in privileged actions only. Provisioning,
        profit-share edits, and billing closes will log here once Phase 6.5
        wires them in.
      </p>
    </>
  );
}
