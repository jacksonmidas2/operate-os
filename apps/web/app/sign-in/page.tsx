import { signIn } from "@/auth";

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          OperateHQ
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Use email or Google to continue.
        </p>

        <SignInErrorBanner searchParams={searchParams} />

        <form
          action={async (formData) => {
            "use server";
            const email = String(formData.get("email") ?? "");
            await signIn("nodemailer", { email, redirectTo: "/" });
          }}
          className="mt-6 space-y-3"
        >
          <label className="block">
            <span className="block text-sm font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            Send magic link
          </button>
        </form>

        {process.env.GOOGLE_CLIENT_ID ? (
          <>
            <div className="my-6 flex items-center gap-3 text-xs text-gray-500">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              or
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            </div>
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Continue with Google
              </button>
            </form>
          </>
        ) : (
          <p className="mt-6 text-xs text-gray-500">
            Google sign-in not configured. Add{" "}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">
              GOOGLE_CLIENT_ID
            </code>{" "}
            +{" "}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">
              GOOGLE_CLIENT_SECRET
            </code>{" "}
            to <code>.env</code>.
          </p>
        )}
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
    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
      Sign-in failed: {sp.error}
    </div>
  );
}
