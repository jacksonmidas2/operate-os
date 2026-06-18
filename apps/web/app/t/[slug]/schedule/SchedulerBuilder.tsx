"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export interface BuilderLocation {
  id: string;
  label: string;
}
export interface BuilderEmployee {
  id: string;
  name: string;
}
export interface EditState {
  jobId: string;
  locationId: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  employeeIds: string[];
}

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

function diffHours(start: string, end: string): number {
  const sp = start.split(":");
  const ep = end.split(":");
  const sh = Number(sp[0]);
  const sm = Number(sp[1]);
  const eh = Number(ep[0]);
  const em = Number(ep[1]);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins > 0 ? mins / 60 : 0;
}

export function SchedulerBuilder({
  locations,
  employees,
  defaultDate,
  edit,
  saveAction,
}: {
  locations: BuilderLocation[];
  employees: BuilderEmployee[];
  defaultDate: string;
  edit: EditState | null;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(edit?.employeeIds ?? []),
  );
  const [search, setSearch] = useState("");
  const [start, setStart] = useState(edit?.start ?? "08:00");
  const [end, setEnd] = useState(edit?.end ?? "12:00");

  const perPerson = diffHours(start, end);
  const totalHours = perPerson * selected.size;
  const q = search.trim().toLowerCase();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      action={saveAction}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl shadow-card"
    >
      {edit ? <input type="hidden" name="jobId" value={edit.jobId} /> : null}

      <h2 className="text-sm font-semibold text-white">1. Select job details</h2>
      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="block text-xs font-medium text-gray-300">
            Location / job
          </span>
          <select
            name="locationId"
            required
            defaultValue={edit?.locationId ?? ""}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100"
          >
            <option value="" disabled>
              Select a location…
            </option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-gray-300">Date</span>
          <input
            type="date"
            name="date"
            required
            defaultValue={edit?.date ?? defaultDate}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-300">
              Start time
            </span>
            <input
              type="time"
              name="start"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-300">
              End time
            </span>
            <input
              type="time"
              name="end"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100"
            />
          </label>
        </div>
      </div>

      <h2 className="mt-5 text-sm font-semibold text-white">
        2. Assign employees
      </h2>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search employees…"
        className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100 placeholder:text-gray-400"
      />

      <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1">
        {employees.length === 0 ? (
          <li className="rounded-lg border border-dashed border-white/10 p-3 text-center text-xs text-gray-400">
            No employees yet.
          </li>
        ) : (
          employees.map((e) => {
            const match = q === "" || e.name.toLowerCase().includes(q);
            const checked = selected.has(e.id);
            return (
              <li key={e.id} hidden={!match}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 hover:border-white/15">
                  <input
                    type="checkbox"
                    name="employeeIds"
                    value={e.id}
                    checked={checked}
                    onChange={() => toggle(e.id)}
                    className="h-4 w-4 accent-accent-500"
                  />
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarColor(e.id)}`}
                  >
                    {initialsOf(e.name)}
                  </span>
                  <span className="text-sm text-gray-100">{e.name}</span>
                </label>
              </li>
            );
          })
        )}
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">
            Selected
          </div>
          <div className="text-sm font-semibold text-gray-100">
            {selected.size} employee{selected.size === 1 ? "" : "s"}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">
            Total hours
          </div>
          <div className="text-sm font-semibold text-gray-100">
            {totalHours.toFixed(2)}
          </div>
        </div>
      </div>

      <SaveButton editing={Boolean(edit)} disabled={selected.size === 0} />
    </form>
  );
}

function SaveButton({
  editing,
  disabled,
}: {
  editing: boolean;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="mt-4 w-full rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2.5 text-sm font-medium text-white shadow-glow transition hover:from-accent-400 hover:to-accent-600 disabled:opacity-50"
    >
      {pending ? "Saving…" : editing ? "Update assignment" : "Save assignment"}
    </button>
  );
}
