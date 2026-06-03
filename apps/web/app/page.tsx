import Link from "next/link";

export default async function ApexHomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Hero glow */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-accent-500/20 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-[400px] w-[600px] rounded-full bg-brand-500/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-stretch px-6 py-20">
        <div className="flex items-center gap-3 animate-fade-in">
          <div className="h-2 w-2 rounded-full bg-accent-500 shadow-glow"></div>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
            OperateHQ
          </span>
        </div>

        <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl animate-slide-up">
          The operating system for
          <span className="relative ml-3 inline-block">
            <span className="relative z-10 bg-gradient-to-br from-accent-300 via-accent-400 to-brand-400 bg-clip-text text-transparent">
              cleaning businesses
            </span>
            <span className="absolute inset-x-0 -bottom-1 h-2 -z-0 rounded-full bg-accent-500/30 blur-md" />
          </span>
          .
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-gray-300 animate-slide-up">
          Scheduling, payroll, payments, dispatch, and an AI co-pilot — for
          owner-operators and on-demand marketplaces, in one platform.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 animate-slide-up">
          <CallToAction
            title="Book a cleaning"
            description="Track B — homeowner booking funnel."
            href="/book"
            badge="For customers"
            accent="brand"
          />
          <CallToAction
            title="Run your cleaning business"
            description="Track A — operator dashboard, billing, payroll."
            href="/sign-in"
            badge="For operators"
            accent="accent"
          />
          <CallToAction
            title="Super-admin console"
            description="OperateHQ team — manage tenants + profit shares."
            href="/admin"
            badge="Internal"
            accent="accent"
          />
          <CallToAction
            title="M&M Cleaning (pilot)"
            description="The first tenant on the platform."
            href="/t/mm"
            badge="Pilot"
            accent="brand"
          />
        </div>

        <FeatureGrid />
      </div>
    </main>
  );
}

function CallToAction({
  title,
  description,
  href,
  badge,
  accent,
}: {
  title: string;
  description: string;
  href: string;
  badge: string;
  accent: "accent" | "brand";
}) {
  const badgeStyle =
    accent === "brand"
      ? "bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30"
      : "bg-accent-500/15 text-accent-300 ring-1 ring-accent-500/30";
  const glow =
    accent === "brand"
      ? "group-hover:shadow-glow-brand"
      : "group-hover:shadow-glow";

  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.06] ${glow}`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent-500/5 blur-3xl transition group-hover:bg-accent-500/15" />
      <span
        className={`relative inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${badgeStyle}`}
      >
        {badge}
      </span>
      <h2 className="relative mt-4 text-xl font-semibold text-white">
        {title}
      </h2>
      <p className="relative mt-1.5 text-sm text-gray-400">{description}</p>
      <span className="relative mt-4 inline-flex items-center text-xs text-gray-500 transition group-hover:text-gray-300">
        Enter
        <span className="ml-1 transition group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}

function FeatureGrid() {
  const features = [
    { icon: "📅", title: "Schedule + dispatch", desc: "Calendar, jobs, real-time cleaner assignment." },
    { icon: "🧾", title: "Native invoicing", desc: "Branded PDFs, payment tracking, recurring." },
    { icon: "⏱️", title: "Payroll-grade timeclock", desc: "Clock in/out flows into job profitability." },
    { icon: "🤖", title: "AI co-pilot", desc: "Grounded chatbot over your business data." },
    { icon: "📊", title: "Live P&L + profit-share", desc: "Net profit computed from your own ledger." },
    { icon: "🛰️", title: "Marketplace-ready", desc: "Track B Uber-for-cleaning bookings." },
  ];
  return (
    <section className="mt-20 animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <span className="text-xs uppercase tracking-[0.2em] text-gray-500">
          What's inside
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-md transition hover:border-white/10 hover:bg-white/[0.04]"
          >
            <div className="mb-3 text-2xl">{f.icon}</div>
            <div className="font-semibold text-white">{f.title}</div>
            <div className="mt-1 text-sm text-gray-400">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
