/**
 * Guard: de `enforce_program_request_has_items_on_commit`-trigger voorkomt dat
 * een lege program_request wordt gecommit. Als een migration deze trigger
 * DROPt zonder hem opnieuw aan te maken, kunnen lege projecten in productie
 * belanden — en dat is precies wat de trigger moet voorkomen.
 *
 * Deze test scant álle migrations en eist:
 *   - elke DROP TRIGGER voor deze naam moet in dezelfde migration weer een
 *     CREATE CONSTRAINT TRIGGER met dezelfde naam bevatten.
 *   - de functie `enforce_program_request_has_items()` mag alleen worden
 *     gedropt als hij in dezelfde migration opnieuw wordt gedefinieerd.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const TRIGGER_NAME = "enforce_program_request_has_items_on_commit";
const FUNCTION_NAME = "enforce_program_request_has_items";

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));

describe("enforce_program_request_has_items trigger — geen stille drops", () => {
  it("er is minstens één migration die de trigger definieert", () => {
    const creators = files.filter((f) => {
      const src = readFileSync(join(migrationsDir, f), "utf8");
      return new RegExp(`CREATE\\s+CONSTRAINT\\s+TRIGGER\\s+${TRIGGER_NAME}`, "i").test(src);
    });
    expect(creators.length, "trigger nergens gedefinieerd").toBeGreaterThan(0);
  });

  it("elke DROP TRIGGER wordt in dezelfde migration gevolgd door een CREATE (…) TRIGGER", () => {
    for (const f of files) {
      const src = readFileSync(join(migrationsDir, f), "utf8");
      const hasDrop = new RegExp(`DROP\\s+TRIGGER[^;]*${TRIGGER_NAME}`, "i").test(src);
      if (!hasDrop) continue;
      const hasRecreate = new RegExp(`CREATE\\s+(CONSTRAINT\\s+)?TRIGGER\\s+${TRIGGER_NAME}`, "i").test(src);
      expect(
        hasRecreate,
        `${f} dropt trigger ${TRIGGER_NAME} zonder recreate — lege program_requests kunnen weer gecommit worden`,
      ).toBe(true);
    }
  });

  it("elke DROP FUNCTION wordt in dezelfde migration gevolgd door een CREATE (…) FUNCTION", () => {
    for (const f of files) {
      const src = readFileSync(join(migrationsDir, f), "utf8");
      const hasDrop = new RegExp(`DROP\\s+FUNCTION[^;]*${FUNCTION_NAME}\\s*\\(`, "i").test(src);
      if (!hasDrop) continue;
      const hasRecreate = new RegExp(
        `CREATE\\s+(OR\\s+REPLACE\\s+)?FUNCTION[^(]*${FUNCTION_NAME}\\s*\\(`,
        "i",
      ).test(src);
      expect(
        hasRecreate,
        `${f} dropt ${FUNCTION_NAME}() zonder recreate`,
      ).toBe(true);
    }
  });
});
