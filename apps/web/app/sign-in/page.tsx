import { signIn } from "@/auth";

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500/20 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-2xl shadow-card">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent-500 shadow-glow"></div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
              OperateHQ
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white">Sign in</h1>
          <p className="mt-1.5 text-sm text-gray-400">
            Use email or Google to continue.
          </p>

          <SignInErrorBanner searchParams={searchParams} />

          {process.env.GOOGLE_CLIENT_ID ? (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
              className="mt-6"
            >
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.10]"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </form>
          ) : null}

          {process.env.EMAIL_SERVER_HOST ? (
            <>
              <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-gray-500">
                <div className="h-px flex-1 bg-white/10" />
                or
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <form
                action={async (formData) => {
                  "use server";
                  const email = String(formData.get("email") ?? "");
                  await signIn("nodemailer", { email, redirectTo: "/" });
                }}
                className="space-y-3"
              >
                <label className="block">
                  <span className="block text-xs font-medium uppercase tracking-wider text-gray-400">
                    Email
                  </span>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-accent-500/60 focus:outline-none focus:ring-1 focus:ring-accent-500/60"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2.5 text-sm font-medium text-white shadow-glow transition hover:from-accent-400 hover:to-accent-600"
                >
                  Send magic link
                </button>
              </form>
            </>
          ) : (
            <p className="mt-6 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs text-gray-500">
              Email sign-in is disabled in this environment. Use Google above.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Protected by your global role + per-tenant memberships.
        </p>
      </div>
    </main>
  );
}

async function SignInErrorBanner({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.error) return null;
  return (
    <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
      Sign-in failed: {sp.error}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5L18.6 4.9C16.8 3.2 14.6 2.2 12 2.2 6.5 2.2 2 6.6 2 12.1S6.5 22 12 22c6.9 0 11.5-4.8 11.5-11.6 0-.8-.1-1.4-.2-2H12z"
      />
    </svg>
  );
}
