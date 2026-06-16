export default function CustomerAccountPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">My account</h1>
      <p className="mt-2 text-gray-400">
        Sign in or enter the email you booked with to find your cleaning.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-card p-6">
        <p className="text-sm text-gray-500">
          Customer self-service login is a v2 feature. For now, customers
          receive a booking confirmation link directly after booking, and the
          team manages reschedules / refunds from the operator dashboard.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <a
            href="/book/quote"
            className="rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white hover:from-accent-400 hover:to-accent-600"
          >
            Book a new cleaning
          </a>
          <a
            href="mailto:hello@operatehq.app"
            className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-4 py-2 text-center text-sm hover:bg-white/[0.08]"
          >
            Email us for help
          </a>
        </div>
      </div>
    </div>
  );
}
