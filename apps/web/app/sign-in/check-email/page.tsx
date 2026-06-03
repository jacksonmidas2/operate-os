export default function CheckEmailPage() {
  const isDev = process.env.NODE_ENV !== "production";
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500/20 blur-[100px]" />
      </div>
      <div className="relative w-full max-w-md animate-slide-up rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-2xl shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xl">
          ✉
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-white">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          A sign-in link has been sent. Click it to finish signing in.
        </p>
        {isDev ? (
          <p className="mt-4 text-xs text-gray-500">
            (dev tip) View caught email at{" "}
            <a
              href="http://localhost:1080"
              className="text-accent-400 hover:text-accent-300"
              target="_blank"
              rel="noreferrer"
            >
              localhost:1080
            </a>
            .
          </p>
        ) : null}
      </div>
    </main>
  );
}
