export default function CheckEmailPage() {
  const isDev = process.env.NODE_ENV !== "production";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          A sign-in link has been sent. Click the link to finish signing in.
        </p>
        {isDev ? (
          <p className="mt-3 text-xs text-gray-500">
            (dev tip) View caught email at{" "}
            <a
              href="http://localhost:1080"
              className="text-brand-600 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              localhost:1080 (maildev)
            </a>
            .
          </p>
        ) : null}
      </div>
    </main>
  );
}
