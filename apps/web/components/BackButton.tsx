"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-white/[0.08]"
      aria-label="Go back"
    >
      <span aria-hidden>←</span> Back
    </button>
  );
}
