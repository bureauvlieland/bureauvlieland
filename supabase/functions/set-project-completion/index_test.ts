import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const CompletionInput = z.object({
  action: z.enum(["complete", "reopen"]),
  reason: z.string().max(2000).optional(),
  outstanding: z.number().min(0).optional(),
}).superRefine((value, context) => {
  if (value.action === "complete" && Number(value.outstanding ?? 0) > 0.005 && (value.reason?.trim().length ?? 0) < 3) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "reason required" });
  }
});

Deno.test("manual completion with outstanding requires a reason", () => {
  assertEquals(CompletionInput.safeParse({ action: "complete", outstanding: 10 }).success, false);
  assertEquals(CompletionInput.safeParse({ action: "complete", outstanding: 10, reason: "Extern gefactureerd" }).success, true);
});

Deno.test("automatic completion at zero outstanding needs no reason", () => {
  assertEquals(CompletionInput.safeParse({ action: "complete", outstanding: 0 }).success, true);
});