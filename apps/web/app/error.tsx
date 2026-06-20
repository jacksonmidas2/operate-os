"use client";

import { useEffect } from "react";

// App-wide error boundary. Replaces Next's default "Application error" screen
// with a themed, friendlier one — and auto-recovers from the common
// "Failed to find Server Action" deploy-skew error (a page loaded before a
// deploy submitting against a newer build) by reloading once.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const stale = /Failed to find Server Action|older or newer deployment/i.test(
    error?.message ?? "",
  );

  useEffect(() => {
    if (!stale) return;
    // One-shot guard so a persistent error can't cause a reload loop.
    const key = "op-stale-reload-at";
    const last = Number(sessionStorage.getItem(key) ?? "0");
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  }, [stale]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl shadow-card">
        <h1 className="text-xl font-semibold text-white">
          {stale ? "Updating to the latest version…" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-gray-300">
          {stale
            ? "The app was updated since this page loaded — reloading."
            : "An unexpected error occurred. You can retry, or reload the page."}
        </p>
        {error?.digest ? (
          <p className="mt-3 font-mono text-xs text-gray-500">
            ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-gray-100 transition hover:bg-white/10"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:from-accent-400 hover:to-accent-600"
          >
            Reload
          </button>
        </div>
      </div>
    </main>
  );
}
