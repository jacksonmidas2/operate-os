"use client";

import { useOptimistic, useRef, startTransition } from "react";
import { useFormStatus } from "react-dom";

export interface Turn {
  role: "user" | "assistant" | "tool";
  text: string;
  toolName?: string;
}

interface Props {
  initialTurns: Turn[];
  suggestions: string[];
  askAction: (formData: FormData) => Promise<void>;
  initialQuestion?: string;
}

export function CopilotChat({
  initialTurns,
  suggestions,
  askAction,
  initialQuestion,
}: Props) {
  const [turns, addOptimistic] = useOptimistic(
    initialTurns,
    (state: Turn[], question: string): Turn[] => [
      ...state,
      { role: "user", text: question },
      { role: "assistant", text: "__thinking__" },
    ],
  );
  const inputRef = useRef<HTMLInputElement>(null);

  function submitWithOptimistic(formData: FormData) {
    const q = String(formData.get("question") ?? "").trim();
    if (!q) return;
    startTransition(async () => {
      addOptimistic(q);
      await askAction(formData);
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <section className="mt-6 space-y-3">
        {turns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6">
            <p className="text-sm text-gray-500">Try one of these to start:</p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <form action={submitWithOptimistic}>
                    <input type="hidden" name="question" value={s} />
                    <SuggestionButton label={s} />
                  </form>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          turns.map((t, i) => <TurnView key={i} turn={t} />)
        )}
      </section>

      <form
        action={submitWithOptimistic}
        className="sticky bottom-4 mt-6 flex gap-2 rounded-2xl border border-white/10 bg-ink-900/80 p-2 backdrop-blur-md shadow-card"
      >
        <input
          ref={inputRef}
          name="question"
          defaultValue={initialQuestion}
          placeholder="Ask the business…"
          className="flex-1 rounded-lg border-0 bg-transparent px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none disabled:opacity-50"
          required
        />
        <AskButton />
      </form>
    </>
  );
}

function AskButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:from-accent-400 hover:to-accent-600 disabled:opacity-60"
    >
      {pending ? "Thinking…" : "Ask"}
    </button>
  );
}

function SuggestionButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg border border-white/10 bg-white/[0.02] p-3 text-left text-sm text-gray-200 transition hover:border-accent-500/40 hover:bg-accent-500/[0.08] disabled:opacity-60"
    >
      {pending ? "Thinking…" : label}
    </button>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  if (turn.role === "user") {
    return (
      <div className="rounded-xl border border-accent-500/30 bg-accent-500/[0.08] p-3 text-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-accent-300">
          You
        </div>
        <div className="mt-1 whitespace-pre-wrap text-gray-100">{turn.text}</div>
      </div>
    );
  }
  if (turn.role === "tool") {
    return (
      <details className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
        <summary className="cursor-pointer font-medium text-gray-300">
          🔧 tool: {turn.toolName}
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-gray-300">
          {turn.text}
        </pre>
      </details>
    );
  }
  const isThinking = turn.text === "__thinking__";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-300">
        Co-pilot
      </div>
      <div className="mt-1 whitespace-pre-wrap text-gray-100">
        {isThinking ? (
          <span className="inline-flex items-center gap-2 text-gray-400">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent-400" />
            Thinking…
          </span>
        ) : (
          turn.text
        )}
      </div>
    </div>
  );
}
