import { GoogleGenAI, type Tool, type FunctionDeclaration } from "@google/genai";
import type { AIProvider, ChatRequest, ChatResponse } from "./index";

/**
 * GeminiAIProvider — Google Gemini via Vertex AI (Gemini Enterprise Agent
 * Platform). Uses Application Default Credentials on Cloud Run via the
 * service account attached to the operate-web service (needs the
 * `roles/aiplatform.user` IAM binding on `deep-contact-470100-f0`).
 *
 *   GOOGLE_CLOUD_PROJECT       (e.g. "deep-contact-470100-f0")
 *   GOOGLE_CLOUD_LOCATION      (e.g. "us-central1")
 *   GOOGLE_GENAI_USE_VERTEXAI  ("true")
 *   GEMINI_MODEL               (default "gemini-2.5-flash")
 *
 * Routes the same ChatRequest shape that other AIProviders use. Tool
 * calls are mapped to Gemini's function-calling protocol.
 */
export class GeminiAIProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenAI;
  private model: string;

  constructor(opts?: {
    project?: string;
    location?: string;
    model?: string;
    apiKey?: string;
  }) {
    const useVertexAI =
      process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || Boolean(opts?.project);

    if (useVertexAI) {
      const project = opts?.project ?? process.env.GOOGLE_CLOUD_PROJECT;
      const location =
        opts?.location ?? process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
      if (!project) {
        throw new Error(
          "GeminiAIProvider (Vertex mode) requires GOOGLE_CLOUD_PROJECT env var",
        );
      }
      this.client = new GoogleGenAI({ vertexai: true, project, location });
    } else {
      const apiKey = opts?.apiKey ?? process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error(
          "GeminiAIProvider requires GOOGLE_API_KEY (or set GOOGLE_GENAI_USE_VERTEXAI=true + GOOGLE_CLOUD_PROJECT)",
        );
      }
      this.client = new GoogleGenAI({ apiKey });
    }

    this.model = opts?.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const contents = req.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const tools: Tool[] | undefined = req.tools
      ? [
          {
            functionDeclarations: req.tools.map(
              (t): FunctionDeclaration => ({
                name: t.name,
                description: t.description,
                parameters: t.inputSchema as FunctionDeclaration["parameters"],
              }),
            ),
          },
        ]
      : undefined;

    const response = await this.client.models.generateContent({
      model: this.model,
      contents,
      config: {
        systemInstruction: req.system,
        maxOutputTokens: req.maxTokens ?? 1024,
        tools,
      },
    });

    let text = "";
    const toolUses: ChatResponse["toolUses"] = [];
    let stopReason: string | null = null;

    const candidate = response.candidates?.[0];
    if (candidate?.finishReason) {
      stopReason = String(candidate.finishReason).toLowerCase();
    }

    for (const part of candidate?.content?.parts ?? []) {
      if (part.text) {
        text += part.text;
      } else if (part.functionCall) {
        toolUses.push({
          id: part.functionCall.name ?? "tool",
          name: part.functionCall.name ?? "tool",
          input: (part.functionCall.args ?? {}) as Record<string, unknown>,
        });
      }
    }

    // Normalize "stop reason" to the same vocabulary other providers use
    // so downstream code branching on `stop_reason === "tool_use"` keeps
    // working without provider-specific shims.
    const normalizedStop =
      toolUses.length > 0 ? "tool_use" : stopReason ?? "end_turn";

    return {
      text,
      toolUses,
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      cacheReadTokens: response.usageMetadata?.cachedContentTokenCount ?? 0,
      cacheWriteTokens: 0,
      stopReason: normalizedStop,
    };
  }
}
