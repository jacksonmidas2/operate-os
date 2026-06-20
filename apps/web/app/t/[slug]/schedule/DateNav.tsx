"use client";

import { useRouter } from "next/navigation";

function shift(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setUTCDate(d.getUTCDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

// Date navigation for the Scheduler: shows the SELECTED day (not always
// "Today"), opens a calendar on click, and navigates on change so the day's
// schedule re-renders below.
export function DateNav({
  slug,
  date,
  today,
}: {
  slug: string;
  date: string;
  today: string;
}) {
  const router = useRouter();
  const go = (d: string) => router.push(`/t/${slug}/schedule?date=${d}`);
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
      <button
        type="button"
        onClick={() => go(shift(date, -1))}
        aria-label="Previous day"
        className="rounded-md px-2.5 py-1.5 text-sm text-gray-300 hover:bg-white/[0.06]"
      >
        ‹
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => {
          if (e.target.value) go(e.target.value);
        }}
        onClick={(e) => {
          try {
            (e.currentTarget as HTMLInputElement).showPicker?.();
          } catch {
            /* showPicker can throw — native click still opens the picker. */
          }
        }}
        aria-label="Pick a day"
        className="rounded-md border-0 bg-transparent px-2 py-1 text-sm text-gray-100 [color-scheme:dark]"
      />
      <button
        type="button"
        onClick={() => go(shift(date, 1))}
        aria-label="Next day"
        className="rounded-md px-2.5 py-1.5 text-sm text-gray-300 hover:bg-white/[0.06]"
      >
        ›
      </button>
      {date !== today ? (
        <button
          type="button"
          onClick={() => go(today)}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium uppercase tracking-wide text-accent-300 hover:bg-white/[0.06]"
        >
          Today
        </button>
      ) : null}
    </div>
  );
}
