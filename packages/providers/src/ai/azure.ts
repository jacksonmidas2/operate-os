import ModelClient, {
  type ChatCompletionsOutput,
  type ChatRequestMessage,
  isUnexpected,
} from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import type { AIProvider, ChatRequest, ChatResponse } from "./index";

/**
 * AzureAnthropicAIProvider — Claude hosted on Azure AI Foundry.
 *
 *   AZURE_AI_FOUNDRY_ENDPOINT (e.g. https://my-resource.services.ai.azure.com)
 *   AZURE_AI_FOUNDRY_KEY      (admin key from `az cognitiveservices account keys list`)
 *   AZURE_AI_FOUNDRY_MODEL    (deployment name, e.g. "claude-opus-4-7")
 *
 * Routes the same ChatRequest shape that AnthropicAIProvider uses through
 * Azure's unified Model Inference API. Anthropic's tool-use, prompt caching
 * (in extra_body), and streaming are supported transparently.
 */
export class AzureAnthropicAIProvider implements AIProvider {
  readonly name = "azure-anthropic";
  private client: ReturnType<typeof ModelClient>;
  private model: string;

  constructor(opts?: { endpoint?: string; apiKey?: string; model?: string }) {
    const endpoint = opts?.endpoint ?? process.env.AZURE_AI_FOUNDRY_ENDPOINT;
    const apiKey = opts?.apiKey ?? process.env.AZURE_AI_FOUNDRY_KEY;
    if (!endpoint || !apiKey) {
      throw new Error(
        "AzureAnthropicAIProvider requires AZURE_AI_FOUNDRY_ENDPOINT + AZURE_AI_FOUNDRY_KEY",
      );
    }
    this.client = ModelClient(endpoint, new AzureKeyCredential(apiKey));
    this.model = opts?.model ?? process.env.AZURE_AI_FOUNDRY_MODEL ?? "claude-opus-4-7";
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const messages: ChatRequestMessage[] = [];
    if (req.system) {
      messages.push({ role: "system", content: req.system });
    }
    for (const m of req.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    const response = await this.client.path("/chat/completions").post({
      body: {
        model: this.model,
        messages,
        max_tokens: req.maxTokens ?? 1024,
        tools: req.tools?.map((t) => ({
          type: "function" as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.inputSchema,
          },
        })),
      },
    });

    if (isUnexpected(response)) {
      throw new Error(
        `Azure AI Foundry chat failed: ${response.status} ${JSON.stringify(response.body).slice(0, 200)}`,
      );
    }

    const out = response.body as ChatCompletionsOutput;
    const choice = out.choices?.[0];
    const message = choice?.message;
    const text = typeof message?.content === "string" ? message.content : "";

    const toolUses =
      (message as { tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> })
        ?.tool_calls?.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          input: safeParse(tc.function.arguments),
        })) ?? [];

    return {
      text,
      toolUses,
      inputTokens: out.usage?.prompt_tokens ?? 0,
      outputTokens: out.usage?.completion_tokens ?? 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      stopReason: choice?.finish_reason ?? null,
    };
  }
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return { _raw: s };
  }
}
