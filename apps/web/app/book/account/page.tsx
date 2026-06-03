export default function CustomerAccountPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">My account</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Sign in or enter the email you booked with to find your cleaning.
      </p>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500">
          Customer self-service login is a v2 feature. For now, customers
          receive a booking confirmation link directly after booking, and the
          team manages reschedules / refunds from the operator dashboard.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <a
            href="/book/quote"
            className="rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-700"
          >
            Book a new cleaning
          </a>
          <a
            href="mailto:hello@operatehq.app"
            className="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Email us for help
          </a>
        </div>
      </div>
    </div>
  );
}
