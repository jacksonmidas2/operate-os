import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Shell } from "@/components/Shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/admin");
  }
  if (session.user.globalRole !== "SUPER_ADMIN") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-gray-400">
          The super-admin console is restricted to OperateHQ staff.
        </p>
      </main>
    );
  }

  return (
    <Shell
      brand="OperateHQ"
      area="Super-admin"
      user={session.user}
      links={[
        { label: "Overview", href: "/admin", icon: "▦" },
        { label: "Tenants", href: "/admin/tenants", icon: "🏢" },
        { label: "Users", href: "/admin/users", icon: "👤" },
        { label: "Profit shares", href: "/admin/profit-shares", icon: "📊" },
        { label: "Billing events", href: "/admin/billing", icon: "💸" },
        { label: "Audit log", href: "/admin/audit", icon: "📜" },
      ]}
    >
      {children}
    </Shell>
  );
}
