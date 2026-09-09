import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fromAnthropicResponse, parseDataUrl, toAnthropicRequest } from "./ai-anthropic.ts";

Deno.test("toAnthropicRequest: system, json-instructie, tools en gedwongen tool", () => {
  const req = toAnthropicRequest({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: "Je bent kort." },
      { role: "user", content: "Hallo" },
    ],
    response_format: { type: "json_object" },
    tools: [{ type: "function", function: { name: "f", description: "d", parameters: { type: "object", properties: { a: { type: "string" } } } } }],
    tool_choice: { type: "function", function: { name: "f" } },
  });
  assertEquals(req.model, "claude-opus-5");
  assertEquals(req.system?.startsWith("Je bent kort."), true);
  assertEquals(req.system?.includes("JSON"), true);
  assertEquals(req.tools?.[0].name, "f");
  assertEquals(req.tools?.[0].input_schema, { type: "object", properties: { a: { type: "string" } } });
  assertEquals(req.tool_choice, { type: "tool", name: "f" });
  assertEquals(req.messages, [{ role: "user", content: "Hallo" }]);
});

Deno.test("toAnthropicRequest: pdf als document, afbeelding als image", () => {
  const req = toAnthropicRequest({
    model: "x",
    messages: [{ role: "user", content: [
      { type: "text", text: "Lees" },
      { type: "image_url", image_url: { url: "data:application/pdf;base64,AAAA" } },
      { type: "image_url", image_url: { url: "data:image/png;base64,BBBB" } },
    ] }],
  });
  const parts = req.messages[0].content as Array<Record<string, unknown>>;
  assertEquals(parts[0], { type: "text", text: "Lees" });
  assertEquals(parts[1], { type: "document", source: { type: "base64", media_type: "application/pdf", data: "AAAA" } });
  assertEquals(parts[2], { type: "image", source: { type: "base64", media_type: "image/png", data: "BBBB" } });
  assertEquals(parseDataUrl("https://x/y.png"), null);
});

Deno.test("fromAnthropicResponse: tool_use wordt tool_calls met JSON-string", () => {
  const out = fromAnthropicResponse({
    stop_reason: "tool_use",
    content: [{ type: "text", text: "even kijken" }, { type: "tool_use", id: "t1", name: "f", input: { a: 1 } }],
    usage: { input_tokens: 10, output_tokens: 5 },
  }) as { choices: Array<{ message: { content: string | null; tool_calls?: Array<{ function: { name: string; arguments: string } }> }; finish_reason: string }> };
  assertEquals(out.choices[0].finish_reason, "tool_calls");
  assertEquals(out.choices[0].message.content, "even kijken");
  assertEquals(out.choices[0].message.tool_calls?.[0].function.name, "f");
  assertEquals(JSON.parse(out.choices[0].message.tool_calls![0].function.arguments), { a: 1 });
});

Deno.test("fromAnthropicResponse: tekstantwoord", () => {
  const out = fromAnthropicResponse({ stop_reason: "end_turn", content: [{ type: "text", text: '{"subject":"x"}' }] }) as { choices: Array<{ message: { content: string | null; tool_calls?: unknown } }> };
  assertEquals(out.choices[0].message.content, '{"subject":"x"}');
  assertEquals(out.choices[0].message.tool_calls, undefined);
});
