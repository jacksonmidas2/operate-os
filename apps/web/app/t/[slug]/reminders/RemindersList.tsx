"use client";

import { useState, useRef } from "react";

export interface ReminderItem {
  id: string;
  number: string;
  clientName: string;
  contact: string;
  amount: string;
  dueLabel: string;
  state: "upcoming" | "today" | "overdue";
  days: number;
}

type Tone = "friendly" | "firm" | "final";

const TONES: { key: Tone; label: string }[] = [
  { key: "friendly", label: "Friendly" },
  { key: "firm", label: "Firm" },
  { key: "final", label: "Final notice" },
];

function plural(n: number): string {
  return `${n} day${n === 1 ? "" : "s"}`;
}

function buildDraft(it: ReminderItem, tone: Tone, biz: string): string {
  const { contact: c, number: num, amount: amt, dueLabel: due, days } = it;
  if (tone === "friendly") {
    if (it.state === "upcoming")
      return `Hi ${c}, just a friendly reminder that invoice ${num} for ${amt} is due on ${due}. You can pay anytime — let me know if you have any questions. Thanks so much!\n— ${biz}`;
    if (it.state === "today")
      return `Hi ${c}, a quick reminder that invoice ${num} for ${amt} is due today. Thank you for your business — reply here if you need anything.\n— ${biz}`;
    return `Hi ${c}, our records show invoice ${num} for ${amt} was due on ${due} and is now ${plural(days)} past due. If you've already paid, thank you — otherwise we'd appreciate settling it when you can.\n— ${biz}`;
  }
  if (tone === "firm") {
    if (it.state === "upcoming")
      return `Hi ${c}, this is a reminder that invoice ${num} for ${amt} is due on ${due}. Please arrange payment by the due date to keep your account current.\nThank you, ${biz}`;
    if (it.state === "today")
      return `Hi ${c}, invoice ${num} for ${amt} is due today. Please submit payment by end of day to avoid late status.\nThank you, ${biz}`;
    return `Hi ${c}, invoice ${num} for ${amt} was due on ${due} and is now ${plural(days)} past due. Please arrange payment as soon as possible. Let us know if there's an issue we should be aware of.\n— ${biz}`;
  }
  // final notice
  if (it.state === "upcoming")
    return `Hi ${c}, invoice ${num} for ${amt} is due on ${due}. Please ensure payment is made on time to avoid further notices.\n— ${biz}`;
  if (it.state === "today")
    return `Hi ${c}, final reminder: invoice ${num} for ${amt} is due today. Payment is required by end of day.\n— ${biz}`;
  return `FINAL NOTICE — invoice ${num} for ${amt} was due on ${due} and is now ${plural(days)} past due. Immediate payment is required. Please contact us today to resolve this balance.\n— ${biz}`;
}

function badgeFor(it: ReminderItem): { label: string; cls: string } {
  if (it.state === "overdue")
    return {
      label: `${plural(it.days)} overdue`,
      cls: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
    };
  if (it.state === "today")
    return {
      label: "Due today",
      cls: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    };
  return {
    label: `Due in ${plural(it.days)}`,
    cls: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30",
  };
}

export function RemindersList({
  items,
  businessName,
}: {
  items: ReminderItem[];
  businessName: string;
}) {
  const [tone, setTone] = useState<Tone>("friendly");
  return (
    <>
      <div className="mt-6 flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-gray-400">
          Tone
        </span>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {TONES.map((t) => (
            <button
              key={t.key}
              onClick={() => setTone(t.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                tone === t.key
                  ? "bg-accent-500/20 text-accent-200 ring-1 ring-accent-500/40"
                  : "text-gray-300 hover:bg-white/[0.06]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {items.map((it) => (
          <ReminderCard
            key={it.id}
            item={it}
            tone={tone}
            text={buildDraft(it, tone, businessName)}
          />
        ))}
      </ul>
    </>
  );
}

function ReminderCard({
  item,
  tone,
  text,
}: {
  item: ReminderItem;
  tone: Tone;
  text: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const badge = badgeFor(item);

  function copy() {
    const v = ref.current?.value ?? text;
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(v)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        })
        .catch(() => {});
    }
  }

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm">
          <span className="font-medium text-gray-100">{item.clientName}</span>
          <span className="text-gray-400">
            {" · "}
            {item.number}
            {" · "}
            {item.amount}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>

      <textarea
        key={tone}
        ref={ref}
        defaultValue={text}
        rows={4}
        className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.03] text-gray-100 px-3 py-2 text-sm leading-relaxed"
      />

      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={copy}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-white/[0.08]"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <span className="text-xs text-gray-400">
          Edit above before copying if you like.
        </span>
      </div>
    </li>
  );
}
