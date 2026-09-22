import { describe, expect, it } from "vitest";
import { isRelevant, mergeWithGoogle, normalizePath, selectReviews, type PublishedReview } from "@/lib/reviews";

const review = (extra: Partial<PublishedReview>): PublishedReview => ({
  id: "r",
  rating: 5,
  text: "Alles liep perfect.",
  author_name: "Ilona",
  author_role: "",
  company: "Districon",
  source: "portal",
  tags: [],
  created_at: "2026-06-20T00:00:00Z",
  entry_path: "",
  block_ids: [],
  ...extra,
});

describe("reviews: relevantie per pagina", () => {
  it("normalizePath laat query, hash en slash aan het eind weg", () => {
    expect(normalizePath("/bedrijfsuitje-vlieland/?utm=x#faq")).toBe("/bedrijfsuitje-vlieland");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("")).toBe("/");
  });

  it("landingspagina: instappagina of tag met de slug", () => {
    const viaPagina = review({ id: "a", entry_path: "/bedrijfsuitje-vlieland?utm_source=google" });
    const viaTag = review({ id: "b", tags: ["Bedrijfsuitje-Vlieland"] });
    const anders = review({ id: "c", entry_path: "/teamuitje-vlieland" });
    expect(isRelevant(viaPagina, { landingPath: "/bedrijfsuitje-vlieland/" })).toBe(true);
    expect(isRelevant(viaTag, { landingPath: "/bedrijfsuitje-vlieland" })).toBe(true);
    expect(isRelevant(anders, { landingPath: "/bedrijfsuitje-vlieland" })).toBe(false);
  });

  it("activiteitpagina: bouwsteen in het programma of tag met het id", () => {
    const met = review({ id: "a", block_ids: ["zeehondentocht", "diner"] });
    const zonder = review({ id: "b", block_ids: ["wadexcursie"] });
    expect(isRelevant(met, { blockId: "zeehondentocht" })).toBe(true);
    expect(isRelevant(zonder, { blockId: "zeehondentocht" })).toBe(false);
    expect(isRelevant(review({ tags: ["zeehondentocht"] }), { blockId: "zeehondentocht" })).toBe(true);
  });

  it("selectReviews: passende eerst, dan de rest, nieuwste eerst; strict alleen passende", () => {
    const oud = review({ id: "oud", entry_path: "/x", created_at: "2026-01-01T00:00:00Z" });
    const nieuw = review({ id: "nieuw", entry_path: "/x", created_at: "2026-06-01T00:00:00Z" });
    const ander = review({ id: "ander", entry_path: "/y", created_at: "2026-07-01T00:00:00Z" });
    expect(selectReviews([oud, ander, nieuw], { landingPath: "/x" }).map((r) => r.id)).toEqual(["nieuw", "oud", "ander"]);
    expect(selectReviews([oud, ander, nieuw], { landingPath: "/x" }, { limit: 2 }).map((r) => r.id)).toEqual(["nieuw", "oud"]);
    expect(selectReviews([oud, ander, nieuw], { blockId: "geen" }, { strict: true })).toEqual([]);
  });
});

describe("reviews: samenvoegen met Google", () => {
  const google = [
    { author_name: "Rients", rating: 5, text: "Top arrangement.", relative_time: "een maand geleden" },
    { author_name: "Kees", rating: 3, text: "Ging wel." },
    { author_name: "Anna", rating: 5, text: "Geweldige dag op het eiland!", author_photo: "https://x/a.png" },
  ];

  it("eigen eerst, Google vult aan, lage scores en dubbele namen vallen weg", () => {
    const eigen = [review({ id: "1", author_name: "Rients", company: "Raethuis" })];
    const uit = mergeWithGoogle(eigen, google, 3);
    expect(uit.map((d) => d.source)).toEqual(["own", "google"]);
    expect(uit[0].meta).toBe("Raethuis");
    expect(uit[0].rating).toBe(5);
    expect(uit[1].author).toBe("Anna");
    expect(uit[1].meta).toBe("Google-review");
    expect(uit[1].photo).toBe("https://x/a.png");
  });

  it("bestaande citaten zonder score krijgen geen sterren", () => {
    const legacy = review({ id: "l", source: "legacy", rating: null, author_role: "journalist", company: "" });
    const uit = mergeWithGoogle([legacy], [], 3);
    expect(uit[0].rating).toBeNull();
    expect(uit[0].meta).toBe("journalist");
  });

  it("houdt zich aan de limiet", () => {
    expect(mergeWithGoogle([], google, 1)).toHaveLength(1);
  });
});
