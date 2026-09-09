// Vertaling tussen het OpenAI-achtige verzoek dat onze edge functions bouwen
// (messages, tools met function.parameters, tool_choice, response_format) en
// de Claude Messages API, en terug. Pure functies; het netwerkdeel zit in ai.ts.
// deno-lint-ignore-file no-explicit-any

export const CLAUDE_MODEL = "claude-opus-5";

export interface OpenAiLikeRequest {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: unknown }>;
  tools?: Array<{ type: "function"; function: { name: string; description?: string; parameters?: Record<string, unknown> } }>;
  tool_choice?: { type: "function"; function: { name: string } } | "auto" | "none" | "required";
  response_format?: { type: "json_object" | "text" };
  max_tokens?: number;
}

export interface AnthropicRequestShape {
  model: string;
  max_tokens: number;
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: any }>;
  tools?: Array<{ name: string; description?: string; input_schema: Record<string, unknown> }>;
  tool_choice?: { type: "tool"; name: string } | { type: "auto" } | { type: "any" } | { type: "none" };
}

const JSON_ONLY_INSTRUCTION =
  "Antwoord uitsluitend met één geldig JSON-object, zonder uitleg, zonder markdown en zonder code-fences.";

/** data:<mime>;base64,<data> → onderdelen, of null als het geen data-URL is. */
export function parseDataUrl(url: string): { mediaType: string; data: string } | null {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(url.trim());
  return m ? { mediaType: m[1], data: m[2] } : null;
}

function convertContentPart(part: any): any {
  if (typeof part === "string") return { type: "text", text: part };
  if (part?.type === "text") return { type: "text", text: String(part.text ?? "") };
  if (part?.type === "image_url") {
    const url: string = part.image_url?.url ?? "";
    const data = parseDataUrl(url);
    if (data && data.mediaType === "application/pdf") {
      return { type: "document", source: { type: "base64", media_type: "application/pdf", data: data.data } };
    }
    if (data) {
      return { type: "image", source: { type: "base64", media_type: data.mediaType, data: data.data } };
    }
    return { type: "image", source: { type: "url", url } };
  }
  return { type: "text", text: JSON.stringify(part) };
}

export function toAnthropicRequest(body: OpenAiLikeRequest, model: string = CLAUDE_MODEL): AnthropicRequestShape {
  const systemParts: string[] = [];
  const messages: AnthropicRequestShape["messages"] = [];
  for (const m of body.messages ?? []) {
    if (m.role === "system") {
      systemParts.push(typeof m.content === "string" ? m.content : JSON.stringify(m.content));
      continue;
    }
    const content = Array.isArray(m.content) ? m.content.map(convertContentPart) : String(m.content ?? "");
    messages.push({ role: m.role, content });
  }
  if (body.response_format?.type === "json_object") systemParts.push(JSON_ONLY_INSTRUCTION);
  if (messages.length === 0 || messages[0].role !== "user") {
    messages.unshift({ role: "user", content: "Voer de opdracht uit." });
  }
  const req: AnthropicRequestShape = {
    model,
    max_tokens: body.max_tokens ?? 16000,
    messages,
  };
  if (systemParts.length > 0) req.system = systemParts.join("\n\n");
  if (body.tools && body.tools.length > 0) {
    req.tools = body.tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: (t.function.parameters ?? { type: "object", properties: {} }) as Record<string, unknown>,
    }));
    const tc = body.tool_choice;
    if (tc && typeof tc === "object" && tc.type === "function") req.tool_choice = { type: "tool", name: tc.function.name };
    else if (tc === "required") req.tool_choice = { type: "any" };
    else if (tc === "none") req.tool_choice = { type: "none" };
  }
  return req;
}

/**
 * Claude-antwoord → OpenAI-achtig antwoord zoals onze functions het lezen:
 * choices[0].message.content en choices[0].message.tool_calls[].function.arguments.
 */
export function fromAnthropicResponse(resp: {
  id?: string;
  model?: string;
  stop_reason?: string | null;
  content: Array<any>;
  usage?: { input_tokens?: number; output_tokens?: number };
}): Record<string, unknown> {
  const text = resp.content.filter((b) => b?.type === "text").map((b) => String(b.text ?? "")).join("\n").trim();
  const toolCalls = resp.content
    .filter((b) => b?.type === "tool_use")
    .map((b) => ({
      id: String(b.id ?? ""),
      type: "function",
      function: { name: String(b.name ?? ""), arguments: JSON.stringify(b.input ?? {}) },
    }));
  return {
    id: resp.id ?? null,
    model: resp.model ?? null,
    provider: "anthropic",
    choices: [{
      index: 0,
      finish_reason: resp.stop_reason === "tool_use" ? "tool_calls" : resp.stop_reason === "refusal" ? "content_filter" : "stop",
      message: {
        role: "assistant",
        content: text || null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      },
    }],
    usage: {
      prompt_tokens: resp.usage?.input_tokens ?? 0,
      completion_tokens: resp.usage?.output_tokens ?? 0,
    },
  };
}
