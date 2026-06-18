// Plain (non-"use client") module so these pure helpers can be called from
// BOTH the server component (the schedule day table) AND the client builder.
// Exporting them from the "use client" SchedulerBuilder made the server invoke
// a client reference at render time -> runtime crash (digest 2124781567).

const AV_COLORS = [
  "bg-accent-500/25 text-accent-100",
  "bg-emerald-500/25 text-emerald-100",
  "bg-amber-500/25 text-amber-100",
  "bg-pink-500/25 text-pink-100",
  "bg-sky-500/25 text-sky-100",
  "bg-violet-500/25 text-violet-100",
];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase() || "?";
}

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length] ?? "bg-white/10 text-gray-100";
}
