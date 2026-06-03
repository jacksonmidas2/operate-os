import Anthropic from "@anthropic-ai/sdk";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ChatRequest {
  system?: string;
  messages: ChatMessage[];
  tools?: ChatTool[];
  maxTokens?: number;
  cacheKey?: string; // for prompt caching
}

export interface ChatResponse {
  text: string;
  /** When the model called a tool, this is populated. */
  toolUses: Array<{
    name: string;
    input: Record<string, unknown>;
    id: string;
  }>;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  stopReason: string | null;
}

export interface AIProvider {
  readonly name: string;
  chat(req: ChatRequest): Promise<ChatResponse>;
}

/**
 * Anthropic provider — Claude with prompt caching enabled.
 *
 * The system prompt + tool definitions are marked with ephemeral cache
 * control so repeated calls within a session reuse the prefix tokens.
 * This is critical for the "ask the business" chat (Phase 13) where
 * the same system prompt fires on every turn.
 */
export class AnthropicAIProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for AnthropicAIProvider");
    }
    this.client = new Anthropic({ apiKey });
    this.model = opts?.model ?? "claude-opus-4-7";
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const systemBlocks = req.system
      ? [
          {
            type: "text" as const,
            text: req.system,
            cache_control: { type: "ephemeral" as const },
          },
        ]
      : undefined;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 1024,
      system: systemBlocks,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      tools: req.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Messages.Tool.InputSchema,
      })),
    });

    let text = "";
    const toolUses: ChatResponse["toolUses"] = [];
    for (const block of response.content) {
      if (block.type === "text") text += block.text;
      else if (block.type === "tool_use") {
        toolUses.push({
          name: block.name,
          input: block.input as Record<string, unknown>,
          id: block.id,
        });
      }
    }

    return {
      text,
      toolUses,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      stopReason: response.stop_reason,
    };
  }
}

/**
 * Console provider — echoes the user message back. Useful when
 * ANTHROPIC_API_KEY isn't set, so the dev server still boots.
 */
export class ConsoleAIProvider implements AIProvider {
  readonly name = "console-ai";

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const last = req.messages[req.messages.length - 1];
    return {
      text: `(console-ai stub) you said: "${last?.content ?? ""}"`,
      toolUses: [],
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      stopReason: "end_turn",
    };
  }
}
