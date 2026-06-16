import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-db";
import { PageHeader } from "@/components/Shell";
import { getDefaultProviders } from "@operate/providers";
import { AI_TOOLS, runTool } from "@/lib/ai-tools";
import { CopilotChat, type Turn } from "./CopilotChat";

const SUGGESTIONS = [
  "How much did we make this month?",
  "Who hasn't paid?",
  "What jobs are scheduled this week?",
  "Draft a review request for Katherine at RHF.",
];

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

  // Up to 5 tool-use rounds. Only the FINAL round's text is shown to the
  // user — intermediate "let me check…" preambles would otherwise get
  // glued to the real answer.
  let finalText = "";
  for (let round = 0; round < 5; round++) {
    const response = await ai.chat({
      system: systemPrompt,
      messages,
      tools: AI_TOOLS,
      maxTokens: 1024,
    });

    if (response.toolUses.length === 0 || response.stopReason !== "tool_use") {
      finalText = response.text ?? "";
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const { tenant } = await getTenantContext(slug);
  const turns = conversations.get(`${slug}:${tenant.id}`) ?? [];
  const hasAi =
    (process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" &&
      Boolean(process.env.GOOGLE_CLOUD_PROJECT)) ||
    Boolean(process.env.GOOGLE_API_KEY) ||
    (Boolean(process.env.AZURE_AI_FOUNDRY_ENDPOINT) &&
      Boolean(process.env.AZURE_AI_FOUNDRY_KEY)) ||
    Boolean(process.env.ANTHROPIC_API_KEY);

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
                className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-3 py-2 text-sm hover:bg-white/[0.08]"
              >
                New chat
              </button>
            </form>
          ) : null
        }
      />

      {!hasAi ? (
        <div className="mt-6 rounded-xl border border-yellow-900/40 bg-yellow-900/20 p-4 text-sm text-yellow-100">
          No AI provider configured (set GOOGLE_CLOUD_PROJECT for Gemini on
          Vertex AI). Falling back to stub responses.
        </div>
      ) : null}

      <CopilotChat
        initialTurns={turns}
        suggestions={SUGGESTIONS}
        askAction={ask.bind(null, slug)}
        initialQuestion={q ?? ""}
      />
    </>
  );
}
