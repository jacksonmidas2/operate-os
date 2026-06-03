export default function BookHomePage() {
  return (
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
          Track B — Marketplace
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          A spotless home, on demand.
        </h1>
        <p className="mt-4 max-w-prose text-gray-600 dark:text-gray-300">
          Vetted cleaners. Transparent pricing. Real-time tracking. Book in
          under 60 seconds.
        </p>

        <a
          href="/book/quote"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-6 py-3 text-base font-medium text-white shadow hover:bg-brand-700"
        >
          Get an instant quote
        </a>

        <p className="mt-3 text-xs text-gray-500">
          Phase 11 wires this funnel: address autocomplete → Stripe deposit →
          cleaner dispatch.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold">How it works</h2>
        <ol className="mt-4 space-y-3 text-sm">
          <li>
            <strong>1.</strong> Tell us your space — beds, baths, square feet.
          </li>
          <li>
            <strong>2.</strong> Pick a date + time that works for you.
          </li>
          <li>
            <strong>3.</strong> Pay a 50% deposit; we dispatch a vetted cleaner.
          </li>
          <li>
            <strong>4.</strong> Rate the job; pay the balance.
          </li>
        </ol>
      </div>
    </div>
  );
}
