import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";
import { getDefaultProviders } from "@operate/providers";
import { AI_TOOLS, runTool } from "@/lib/ai-tools";

const SUGGESTIONS = [
  "How much did we make this month?",
  "Who hasn't paid?",
  "What jobs are scheduled this week?",
  "Draft a review request for Katherine at RHF.",
];

interface Turn {
  role: "user" | "assistant" | "tool";
  text: string;
  toolName?: string;
}

const conversations = new Map<string, Turn[]>();

async function ask(slug: string, formData: FormData) {
  "use server";
  const { db, tenant } = await getTenantContext(slug);
  const question = String(formData.get("question") ?? "").trim();
  if (!question) return;

  const key = `${slug}:${tenant.id}`;
  const turns = conversations.get(key) ?? [];

  const { ai } = getDefaultProviders();
  const systemPrompt = `You are the AI co-pilot for ${tenant.legalName}, a cleaning business running on OperateHQ. You help the owner understand their business and draft messages. Be concise and concrete. When the answer needs live data, call a tool. Format dollars without decimals when whole, e.g. "$600". Address the owner directly in second person.`;

  const messages = [
    ...turns.map((t) => ({
      role: (t.role === "tool" ? "user" : t.role) as "user" | "assistant",
      content: t.role === "tool" ? `Tool result: ${t.text}` : t.text,
    })),
    { role: "user" as const, content: question },
  ];

  turns.push({ role: "user", text: question });

  // Up to 5 tool-use rounds
  let finalText = "";
  for (let round = 0; round < 5; round++) {
    const response = await ai.chat({
      system: systemPrompt,
      messages,
      tools: AI_TOOLS,
      maxTokens: 1024,
    });

    if (response.text) finalText += response.text;

    if (response.toolUses.length === 0 || response.stopReason !== "tool_use") {
      break;
    }

    for (const toolUse of response.toolUses) {
      const result = await runTool(db, toolUse.name, toolUse.input);
      turns.push({
        role: "tool",
        toolName: toolUse.name,
        text: JSON.stringify(result, null, 2).slice(0, 2000),
      });
      messages.push({
        role: "assistant",
        content: `[calling tool: ${toolUse.name}]`,
      });
      messages.push({
        role: "user",
        content: `Tool ${toolUse.name} result: ${JSON.stringify(result)}`,
      });
    }
  }

  turns.push({ role: "assistant", text: finalText });
  conversations.set(key, turns);
  revalidatePath(`/t/${slug}/ai`);
}

async function reset(slug: string) {
  "use server";
  const { tenant } = await getTenantContext(slug);
  conversations.delete(`${slug}:${tenant.id}`);
  revalidatePath(`/t/${slug}/ai`);
}

export default async function AICopilotPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await getTenantContext(slug);
  const turns = conversations.get(`${slug}:${tenant.id}`) ?? [];
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <>
      <PageHeader
        title="AI co-pilot"
        description={'Ask anything about your business. "How much did we make last week?" "Who hasn\'t paid?"'}
        actions={
          turns.length > 0 ? (
            <form action={reset.bind(null, slug)}>
              <button
                type="submit"
                className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm hover:bg-gray-50"
              >
                New chat
              </button>
            </form>
          ) : null
        }
      />

      {!hasApiKey ? (
        <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-900/40 dark:bg-yellow-900/20 dark:text-yellow-100">
          ANTHROPIC_API_KEY not set in .env — using stub responses.
        </div>
      ) : null}

      <section className="mt-6 space-y-3">
        {turns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6">
            <p className="text-sm text-gray-500">Try one of these to start:</p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <form action={ask.bind(null, slug)}>
                    <input type="hidden" name="question" value={s} />
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-white/10 p-3 text-left text-sm hover:border-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-900/20"
                    >
                      {s}
                    </button>
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
        action={ask.bind(null, slug)}
        className="sticky bottom-4 mt-6 flex gap-2 rounded-2xl border border-white/10 bg-white p-2 shadow-sm"
      >
        <input
          name="question"
          placeholder="Ask the business…"
          className="flex-1 rounded-lg border-0 bg-transparent px-3 py-2 text-sm focus:outline-none"
          required
        />
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-glow hover:from-accent-400 hover:to-accent-600 transition"
        >
          Ask
        </button>
      </form>
    </>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  if (turn.role === "user") {
    return (
      <div className="rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-900/20">
        <div className="text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-300">
          You
        </div>
        <div className="mt-1 whitespace-pre-wrap">{turn.text}</div>
      </div>
    );
  }
  if (turn.role === "tool") {
    return (
      <details className="rounded-xl border border-white/10 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-gray-500">
          🔧 tool: {turn.toolName}
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs">
          {turn.text}
        </pre>
      </details>
    );
  }
  return (
    <div className="rounded-xl border border-white/10 p-3 text-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Co-pilot
      </div>
      <div className="mt-1 whitespace-pre-wrap">{turn.text}</div>
    </div>
  );
}
