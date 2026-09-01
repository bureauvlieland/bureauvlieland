import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("publish-program-changes — klantakkoord blijft standaard staan", () => {
  const src = read("supabase/functions/publish-program-changes/index.ts");

  it("klantkant defaultet op 'keep': alleen een expliciete admin-keuze reset", () => {
    expect(src).toMatch(/resetCustomerApproval\s*=\s*approvalScope\?\.customer\s*===\s*"reset"/);
    // Geen ?? "reset" fallback meer op de klantkant.
    expect(src).not.toMatch(/approvalScope\?\.customer\s*\?\?\s*"reset"/);
  });

  it("partnerkant blijft conservatief defaulten op 'reset'", () => {
    expect(src).toMatch(/approvalScope\?\.partner\s*\?\?\s*"reset"/);
  });

  it("reset gebeurt alleen voor al live onderdelen én bij expliciete keuze", () => {
    expect(src).toMatch(/if \(wasLive && resetCustomerApproval\)/);
  });
});

describe("PublishChangesDialog — default klantkeuze", () => {
  const src = read("src/components/admin/PublishChangesDialog.tsx");

  it("start met 'keep' voor de klant en 'reset' voor de partner", () => {
    expect(src).toMatch(/approvalCustomer[\s\S]{0,80}useState<"reset" \| "keep">\("keep"\)/);
    expect(src).toMatch(/approvalPartner[\s\S]{0,80}useState<"reset" \| "keep">\("reset"\)/);
  });
});
