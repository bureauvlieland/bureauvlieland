/**
 * Bewaakt dat de redactionele activiteitcontent en de filterfacetten
 * niet afwijken van de opgeslagen activiteitdata (snapshot van
 * `building_blocks` in `activityFactsSource.ts`).
 */
import { describe, expect, it } from "vitest";
import {
  canonicalTextFor,
  findContentSourceViolations,
} from "@/lib/activityFactConsistency";
import { activityContent } from "@/content/activityContent";
import { activityFactsSource } from "@/content/activityFactsSource";
import { activityFacets, type DurationBucket } from "@/content/activityFacets";

const bucketFor = (minutes: number): DurationBucket =>
  minutes <= 90 ? "kort" : minutes <= 180 ? "halve-dag" : "dagdeel-plus";

describe("activityContent versus opgeslagen activiteitdata", () => {
  it("heeft voor elke content-entry een databasesnapshot", () => {
    const missing = Object.keys(activityContent).filter((slug) => !activityFactsSource[slug]);
    expect(missing).toEqual([]);
  });

  it.each(Object.keys(activityContent))(
    "%s claimt geen duur, prijs of groepsgrootte buiten de opgeslagen data",
    (slug) => {
      const violations = findContentSourceViolations(
        slug,
        canonicalTextFor(activityContent[slug]),
        activityFactsSource[slug],
      );
      expect(violations.map((v) => `${v.kind}: ${v.value}`)).toEqual([]);
    },
  );

  it("gebruikt filterfacetten met een duurbucket die bij de opgeslagen duur past", () => {
    const mismatches = Object.entries(activityFacets)
      .filter(([slug]) => activityFactsSource[slug]?.durationMinutes != null)
      .filter(
        ([slug, facets]) =>
          facets.duration !== bucketFor(activityFactsSource[slug].durationMinutes as number),
      )
      .map(([slug, facets]) => `${slug}: ${facets.duration}`);
    expect(mismatches).toEqual([]);
  });
});
