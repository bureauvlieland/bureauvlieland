import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildAutoCloseEmail } from "./texts.ts";

const drempels = { staleHours: 26, stuckMinutes: 30 };

Deno.test("elk alarm begint met wat het bureau merkt en wat te doen; techniek staat eronder", () => {
  for (const health of ["missing_run", "errors", "stuck"] as const) {
    const { subject, html } = buildAutoCloseEmail(health, { id: "run-1", started_at: "2026-11-20T06:00:00Z", status: "error", result: { errors: ["x"] }, error_message: "boom" }, drempels);
    assertStringIncludes(subject, "[ALERT] Afsluiten van afgelopen programma's");
    assertStringIncludes(html, "Wat betekent dit:");
    assertStringIncludes(html, "nazorgmail");
    assertStringIncludes(html, "Wat te doen:");
    assertStringIncludes(html, "Nu uitvoeren");
    assertEquals(html.indexOf("Wat te doen") < html.indexOf("Technische details"), true);
    assertEquals(html.includes("<code>"), false);
  }
});

Deno.test("de technische details noemen run, status en fout; healthy geeft niets", () => {
  const { html } = buildAutoCloseEmail("errors", { id: "run-1", started_at: "2026-11-20T06:00:00Z", status: "error", result: { errors: ["<x>"] }, error_message: "boom" }, drempels);
  assertStringIncludes(html, "run-1");
  assertStringIncludes(html, "boom");
  assertStringIncludes(html, "&lt;x&gt;");
  assertEquals(buildAutoCloseEmail("healthy", null, drempels), { subject: "", html: "" });
});
