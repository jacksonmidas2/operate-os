"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { initialsOf, avatarColor } from "./avatar";

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

function fmtDate(d: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const fieldCls =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-100";

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
  const [locationId, setLocationId] = useState(edit?.locationId ?? "");
  const [date, setDate] = useState(edit?.date ?? defaultDate);
  const [start, setStart] = useState(edit?.start ?? "08:00");
  const [end, setEnd] = useState(edit?.end ?? "12:00");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(edit?.employeeIds ?? []),
  );
  const [search, setSearch] = useState("");
  const [previewing, setPreviewing] = useState(false);

  const perPerson = diffHours(start, end);
  const totalHours = perPerson * selected.size;
  const q = search.trim().toLowerCase();
  const valid = locationId !== "" && selected.size > 0 && perPerson > 0;

  const locationLabel =
    locations.find((l) => l.id === locationId)?.label ?? "—";
  const selectedEmployees = employees.filter((e) => selected.has(e.id));

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
      onKeyDown={(e) => {
        // Don't let Enter submit straight through — the gate is the Confirm button.
        if (
          !previewing &&
          e.key === "Enter" &&
          (e.target as HTMLElement).tagName !== "TEXTAREA"
        )
          e.preventDefault();
      }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl shadow-card"
    >
      {edit ? <input type="hidden" name="jobId" value={edit.jobId} /> : null}

      {/* Edit UI — kept mounted (hidden during preview) so its fields still submit */}
      <div hidden={previewing}>
        <h2 className="text-sm font-semibold text-white">
          1. Select job details
        </h2>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-300">
              Location / job
            </span>
            <select
              name="locationId"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={fieldCls}
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
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
              className={`${fieldCls} [color-scheme:dark]`}
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
                value={start}
                onChange={(e) => setStart(e.target.value)}
                onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                className={`${fieldCls} [color-scheme:dark]`}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-300">
                End time
              </span>
              <input
                type="time"
                name="end"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                className={`${fieldCls} [color-scheme:dark]`}
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

        <button
          type="button"
          disabled={!valid}
          onClick={() => setPreviewing(true)}
          className="mt-4 w-full rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2.5 text-sm font-medium text-white shadow-glow transition hover:from-accent-400 hover:to-accent-600 disabled:opacity-50"
        >
          Preview assignment →
        </button>
        {!valid ? (
          <p className="mt-2 text-center text-xs text-gray-400">
            Pick a location, an end-after-start time, and at least one employee.
          </p>
        ) : null}
      </div>

      {/* Preview / confirm gate */}
      {previewing ? (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-accent-300" aria-hidden>
              ✦
            </span>
            <h2 className="text-sm font-semibold text-white">
              Review assignment
            </h2>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Nothing is saved yet — confirm the details or go back to edit.
          </p>

          <dl className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            <Row label="Location / job" value={locationLabel} />
            <Row label="Date" value={fmtDate(date)} />
            <Row
              label="Time"
              value={`${start} – ${end} · ${perPerson.toFixed(2)} h each`}
            />
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Employees ({selectedEmployees.length})
              </dt>
              <dd className="mt-1.5 flex flex-wrap gap-2">
                {selectedEmployees.map((e) => (
                  <span
                    key={e.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-2.5"
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${avatarColor(e.id)}`}
                    >
                      {initialsOf(e.name)}
                    </span>
                    <span className="text-xs text-gray-100">{e.name}</span>
                  </span>
                ))}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Total labor hours
              </dt>
              <dd className="text-base font-semibold text-white">
                {totalHours.toFixed(2)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setPreviewing(false)}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-white/10"
            >
              ← Edit
            </button>
            <ConfirmButton editing={Boolean(edit)} />
          </div>
        </div>
      ) : null}
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-xs uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="text-right text-gray-100">{value}</dd>
    </div>
  );
}

function ConfirmButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2.5 text-sm font-medium text-white shadow-glow transition hover:from-accent-400 hover:to-accent-600 disabled:opacity-50"
    >
      {pending ? "Saving…" : editing ? "Confirm & update" : "Confirm & save"}
    </button>
  );
}
