// Contracttest (notificaties fase 3): de publicatiedialoog biedt "Nu versturen"
// aan (standaard uit) en geeft sendNow mee aan publish-program-changes, dat de
// wijzigingsmails anders in de wachtrij voor de dagelijkse bundel zet.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("PublishChangesDialog — wijzigingsmails bundelen", () => {
  const src = read("src/components/admin/PublishChangesDialog.tsx");

  it("checkbox 'Nu versturen' staat standaard uit en wordt bij openen teruggezet", () => {
    expect(src).toMatch(/const \[sendNow, setSendNow\] = useState\(false\)/);
    expect(src).toContain("Nu versturen (niet wachten tot de dagelijkse bundel)");
    expect(src).toContain("om 17:00 in één mail per ontvanger");
    expect(src).toContain("setSendNow(false);");
  });

  it("geeft sendNow mee aan publicatie én dry-run", () => {
    const matches = src.match(/\n\s+sendNow,\n/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it("toont in de melding hoeveel mails in de bundel gingen", () => {
    expect(src).toContain("emails_queued");
    expect(src).toContain("in de bundel van 17:00");
  });
});

describe("publish-program-changes — wachtrij in plaats van directe mail", () => {
  const src = read("supabase/functions/publish-program-changes/index.ts");

  it("sendNow defaultet op false en stuurt anders naar pending_change_notifications", () => {
    expect(src).toMatch(/sendNow = false,/);
    expect(src).toContain('from "../_shared/changeDigest.ts"');
    expect(src).toContain("enqueueChangeNotifications(supabase, queueRows)");
    expect(src).toContain("emails_queued: emailsQueued,");
  });

  it("alleen de 'programma bijgewerkt'-mail wordt gebundeld; akkoord-vraag blijft direct", () => {
    expect(src).toContain("if (customerTemplateId === TemplateIds.ITEM_CHANGES_CUSTOMER && !sendNow)");
  });
});
