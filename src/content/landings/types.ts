import type { LucideIcon } from "lucide-react";

/**
 * Inhoud van een landingspagina (ontwerpsysteem fase 3). Eén bestand per
 * pagina in deze map; `src/components/landing/LandingPage.tsx` is het ene
 * sjabloon dat ze allemaal tekent. Lopende tekst mag links bevatten als
 * `[tekst](/pad)` (zie `src/lib/richText.tsx`).
 */
export interface LandingLink {
  label: string;
  to: string;
  /** Korte toelichting in het linkblok onderaan. */
  description?: string;
}

export interface LandingFact {
  label: string;
  value: string;
}

export interface LandingFeature {
  icon: LucideIcon;
  title: string;
  text?: string;
}

export interface LandingImage {
  src: string;
  alt: string;
  title?: string;
  text?: string;
}

export type LandingSection =
  | {
      kind: "prose";
      title: string;
      paragraphs: string[];
      /** Opsomming met vinkjes onder de tekst. */
      checklist?: string[];
      /** Slotzin, iets zwaarder gezet. */
      closing?: string;
      align?: "left" | "center";
    }
  | {
      kind: "features";
      title: string;
      intro?: string;
      items: LandingFeature[];
      closing?: string;
      columns?: 2 | 3;
    }
  | {
      kind: "gallery";
      title: string;
      intro?: string;
      images: LandingImage[];
      /** Tekstkaart naast de foto's, bijvoorbeeld een verwijzing naar meerdaags. */
      aside?: { icon: LucideIcon; title: string; text: string; link: LandingLink };
    }
  | {
      kind: "split";
      title: string;
      paragraphs: string[];
      checklist?: string[];
      image: LandingImage;
    };

export interface LandingContent {
  slug: string;
  path: string;
  /** Laatste kruimel; de kruimels ervoor via `parent`. */
  breadcrumb: string;
  parent?: LandingLink;
  seo: { title: string; description: string };
  /** Voor de Service-structured data. */
  service: { name: string; description: string };
  hero: {
    image: string;
    alt: string;
    eyebrow: string;
    title: string;
    intro: string;
  };
  /** Kop en alinea's direct onder de hero, met de eilandfeiten ernaast. */
  intro: { title: string; paragraphs: string[] };
  facts?: LandingFact[];
  sections: LandingSection[];
  /** Voorbeeldprogramma's uit de database; `durationDays` = precies, `minDays` = minimaal zoveel dagen. */
  templates?: { title: string; intro?: string; durationDays?: number; minDays?: number; limit?: number };
  quote?: { text: string; author: string; company?: string };
  faq: { question: string; answer: string }[];
  /** "Bekijk ook": het ene linkblok onderaan. */
  also: LandingLink[];
}
