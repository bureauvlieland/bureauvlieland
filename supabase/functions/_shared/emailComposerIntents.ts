/**
 * Slimme e-mailcomposer voor de klantenkaart.
 *
 * Deze module is puur (geen I/O) zodat zowel de admin-UI als de
 * `compose-followup-email` edge function dezelfde intenties, dossier-samenvatting
 * en promptopbouw gebruiken — en het geheel testbaar blijft.
 *
 * Deze file is een kopie van src/lib/emailComposerIntents.ts (bron van waarheid).
 */

export type EmailIntentId =
  | "reminder_proposal"
  | "ask_approval"
  | "status_update"
  | "confirm_change"
  | "payment_followup"
  | "aftercare"
  | "reply_last"
  | "free";

export interface EmailIntent {
  id: EmailIntentId;
  /** Korte knoplabel in de UI. */
  label: string;
  /** Toelichting onder/naast de knop. */
  hint: string;
  /** Doelinstructie die de AI meekrijgt. */
  goal: string;
}

export const EMAIL_INTENTS: EmailIntent[] = [
  {
    id: "reminder_proposal",
    label: "Herinnering voorstel",
    hint: "Klant heeft het programmavoorstel nog niet opgepakt",
    goal:
      "Herinner de klant vriendelijk aan het programmavoorstel dat in het klantportaal klaarstaat. " +
      "Benoem hoe lang het er al staat als dat uit de context blijkt, houd het licht en zonder druk, " +
      "en bied aan om telefonisch mee te denken.",
  },
  {
    id: "ask_approval",
    label: "Vraag om akkoord",
    hint: "Aansporen tot goedkeuren/ondertekenen",
    goal:
      "Vraag de klant om het voorstel in het klantportaal goed te keuren en de algemene voorwaarden te " +
      "ondertekenen. Leg in één zin uit waarom dat nodig is (dan kunnen wij de onderdelen definitief " +
      "vastleggen bij de partners) en noem, als bekend, de geldigheidsdatum van de offerte.",
  },
  {
    id: "status_update",
    label: "Statusupdate",
    hint: "Informeren, zonder actie te vragen",
    goal:
      "Geef een korte statusupdate over waar het project nu staat. Vraag géén actie van de klant; " +
      "sluit af met wat de klant van ons kan verwachten en wanneer.",
  },
  {
    id: "confirm_change",
    label: "Wijziging bevestigen",
    hint: "Doorgeven of bevestigen van een aanpassing",
    goal:
      "Bevestig de wijziging in het programma of de logies zoals die uit de context blijkt. " +
      "Benoem uitsluitend wijzigingen die daadwerkelijk in de context staan en verwijs voor het " +
      "volledige overzicht naar het klantportaal.",
  },
  {
    id: "payment_followup",
    label: "Factuur opvolgen",
    hint: "Betaling of factuur netjes nabellen",
    goal:
      "Volg de openstaande factuur of betaling vriendelijk op. Noem geen bedragen, factuurnummers of " +
      "termijnen die niet in de context staan. Houd de toon dienstverlenend, niet aanmanend.",
  },
  {
    id: "aftercare",
    label: "Nazorg / bedankt",
    hint: "Na uitvoering: bedanken en om feedback vragen",
    goal:
      "Bedank de klant voor het verblijf of het evenement op Vlieland en vraag kort of alles naar wens " +
      "was. Nodig uit om een reactie te delen en houd de deur open voor een volgend bezoek.",
  },
  {
    id: "reply_last",
    label: "Antwoord op laatste bericht",
    hint: "Reageer inhoudelijk op wat de klant schreef",
    goal:
      "Reageer inhoudelijk op het laatste bericht van de klant uit de context. Beantwoord de gestelde " +
      "vraag of vragen expliciet. Kun je een vraag niet met de beschikbare context beantwoorden, zeg dan " +
      "toe dat wij dit uitzoeken en terugkomen — verzin geen antwoord.",
  },
  {
    id: "free",
    label: "Vrij bericht",
    hint: "Eigen instructie, AI schrijft het uit",
    goal:
      "Schrijf de mail volledig op basis van de instructie van de admin, passend bij de projectcontext.",
  },
];

export function findIntent(id: string | null | undefined): EmailIntent | null {
  if (!id) return null;
  return EMAIL_INTENTS.find((i) => i.id === id) ?? null;
}

export function goalForIntent(id: string | null | undefined): string {
  return (
    findIntent(id)?.goal ??
    "Schrijf een passende opvolgmail op basis van de projectcontext en de gespreksgeschiedenis."
  );
}

/* ------------------------------------------------------------------ *
 * Dossier
 * ------------------------------------------------------------------ */

export type DossierKind =
  | "email_out"
  | "email_in"
  | "chat_in"
  | "chat_out"
  | "system_email"
  | "note"
  | "history";

export interface DossierEntry {
  at: string;
  kind: DossierKind;
  who?: string | null;
  subject?: string | null;
  content?: string | null;
}

export interface DossierSummary {
  outgoingCount: number;
  incomingCount: number;
  systemEmailCount: number;
  totalEntries: number;
  lastCustomerContactAt: string | null;
  daysSinceCustomerContact: number | null;
  lastIncomingExcerpt: string | null;
}

const INBOUND_KINDS: DossierKind[] = ["email_in", "chat_in"];
const OUTBOUND_KINDS: DossierKind[] = ["email_out", "chat_out"];

export function truncate(text: string | null | undefined, max = 700): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function daysBetween(from: string, to: Date = new Date()): number {
  const t = new Date(from).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((to.getTime() - t) / 86_400_000));
}

/**
 * Sorteert dossieritems (nieuwste eerst), kapt af op `max` en berekent de samenvatting.
 * Voor de prompt draaien we daarna om naar chronologisch.
 */
export function buildDossier(
  entries: DossierEntry[],
  opts: { max?: number; now?: Date } = {},
): { entries: DossierEntry[]; summary: DossierSummary } {
  const max = opts.max ?? 15;
  const now = opts.now ?? new Date();

  const valid = entries.filter((e) => e && e.at && !Number.isNaN(new Date(e.at).getTime()));
  const sorted = [...valid].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const kept = sorted.slice(0, max);

  const inbound = sorted.filter((e) => INBOUND_KINDS.includes(e.kind));
  const lastInbound = inbound[0] ?? null;

  const summary: DossierSummary = {
    outgoingCount: sorted.filter((e) => OUTBOUND_KINDS.includes(e.kind)).length,
    incomingCount: inbound.length,
    systemEmailCount: sorted.filter((e) => e.kind === "system_email").length,
    totalEntries: sorted.length,
    lastCustomerContactAt: lastInbound?.at ?? null,
    daysSinceCustomerContact: lastInbound ? daysBetween(lastInbound.at, now) : null,
    lastIncomingExcerpt: lastInbound ? truncate(lastInbound.content, 400) || null : null,
  };

  // Chronologisch voor de prompt: oudste eerst leest als een gesprek.
  const chronological = [...kept].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  return { entries: chronological, summary };
}

const KIND_LABEL: Record<DossierKind, string> = {
  email_out: "Wij → klant (e-mail)",
  email_in: "Klant → wij (e-mail)",
  chat_out: "Wij → klant (chat)",
  chat_in: "Klant → wij (chat)",
  system_email: "Automatische systeemmail",
  note: "Interne notitie",
  history: "Projectgebeurtenis",
};

export function formatDossier(entries: DossierEntry[]): string {
  if (entries.length === 0) return "(nog geen eerdere communicatie vastgelegd)";
  return entries
    .map((e) => {
      const date = e.at.slice(0, 10);
      const head = `[${date}] ${KIND_LABEL[e.kind]}${e.who ? ` — ${e.who}` : ""}`;
      const subject = e.subject ? `\n  Onderwerp: ${truncate(e.subject, 160)}` : "";
      const content = e.content ? `\n  ${truncate(e.content, 700)}` : "";
      return `${head}${subject}${content}`;
    })
    .join("\n\n");
}

/**
 * Bepaalt welke intentie het meest logisch is, zodat de UI die kan aanraden.
 */
export function suggestIntent(input: {
  quoteSentAt?: string | null;
  termsAcceptedAt?: string | null;
  executionDone?: boolean;
  hasOpenInvoice?: boolean;
  summary: DossierSummary;
}): EmailIntentId {
  const { summary } = input;
  // Klant wacht op antwoord: dat gaat altijd voor.
  if (
    summary.lastCustomerContactAt &&
    (summary.daysSinceCustomerContact ?? 99) <= 5 &&
    summary.incomingCount > 0
  ) {
    return "reply_last";
  }
  if (input.executionDone) return input.hasOpenInvoice ? "payment_followup" : "aftercare";
  if (input.quoteSentAt && !input.termsAcceptedAt) {
    return summary.outgoingCount > 1 ? "reminder_proposal" : "ask_approval";
  }
  return "status_update";
}

/* ------------------------------------------------------------------ *
 * Prompt
 * ------------------------------------------------------------------ */

export interface ComposerPromptInput {
  intent?: string | null;
  /** Extra sturing van de admin bij een nieuwe suggestie. */
  instruction?: string | null;
  /** Huidige tekst in de editor bij een herschrijf-actie. */
  currentBody?: string | null;
  /** Herschrijf-opdracht, bijv. "korter" of "warmer". */
  refineInstruction?: string | null;
  contactFirstName: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientType?: "customer" | "partner";
  referenceNumber?: string | null;
  portalUrl?: string | null;
  projectContext: Record<string, unknown>;
  dossier: DossierEntry[];
  summary: DossierSummary;
}

export function buildComposerPrompt(input: ComposerPromptInput): {
  system: string;
  user: string;
} {
  const isRefine = !!(input.currentBody && input.currentBody.trim() && input.refineInstruction);
  const formal = input.recipientType !== "partner";

  const system = [
    "Je bent een ervaren accountmanager bij Bureau Vlieland, een lokale reisspecialist en boekingskantoor op Vlieland.",
    formal
      ? "Je schrijft in formeel Nederlands: altijd 'u/uw', nooit 'jij/jouw'."
      : "Je schrijft naar een partner: informeel Nederlands met 'je/jouw'.",
    "",
    "Harde regels:",
    "- Platte tekst met regeleinden. Geen markdown, geen HTML, geen opsommingstekens met sterretjes.",
    `- Begin met "Beste ${input.contactFirstName},".`,
    '- Sluit af met "Met vriendelijke groet,\\nBureau Vlieland".',
    "- Maximaal ongeveer 180 woorden in de body.",
    "- Geen onderwerpregel in de body.",
    "- Verzin NOOIT prijzen, data, aantallen, partners, factuurnummers of toezeggingen die niet in de context staan.",
    "- Verwijs naar de klantpagina met exact de placeholder {{portal_url}} — nooit een verzonnen URL.",
    "",
    "Persoonlijk en actueel:",
    "- Sluit aan op de gespreksgeschiedenis: herhaal niets wat al gezegd is en verwijs natuurlijk naar wat eerder is besproken.",
    "- Staat er een recent bericht van de klant in het dossier, ga daar dan expliciet op in (toon, naam, gestelde vraag).",
    "- Geen standaard-template-taal; schrijf zoals een mens die dit dossier kent.",
    "",
    'Output: STRICT JSON met velden {"subject": string, "body": string}. Geen extra tekst, geen code-fences.',
  ].join("\n");

  const parts: string[] = [];
  parts.push(`DOEL VAN DEZE MAIL:\n${goalForIntent(input.intent)}`);
  parts.push(
    `ONTVANGER: ${input.recipientName || ""} <${input.recipientEmail || ""}> (${
      input.recipientType === "partner" ? "partner" : "klant"
    })`,
  );
  if (input.referenceNumber) parts.push(`REFERENTIE: ${input.referenceNumber}`);
  if (input.portalUrl) {
    parts.push(`PORTAL URL: ${input.portalUrl} — gebruik in de mail de placeholder {{portal_url}}`);
  }

  const s = input.summary;
  parts.push(
    [
      "DOSSIER-SAMENVATTING:",
      `- Uitgaande berichten van ons: ${s.outgoingCount}`,
      `- Berichten van de klant: ${s.incomingCount}`,
      `- Automatische systeemmails: ${s.systemEmailCount}`,
      s.daysSinceCustomerContact === null
        ? "- De klant heeft nog nooit zelf gereageerd"
        : `- Laatste bericht van de klant: ${s.daysSinceCustomerContact} dag(en) geleden`,
    ].join("\n"),
  );

  parts.push(`PROJECTCONTEXT (JSON):\n${JSON.stringify(input.projectContext, null, 2)}`);
  parts.push(`GESPREKSGESCHIEDENIS (oudste eerst):\n${formatDossier(input.dossier)}`);

  if (input.instruction?.trim()) {
    parts.push(`INSTRUCTIE VAN DE ADMIN: ${input.instruction.trim()}`);
  }

  if (isRefine) {
    parts.push(
      [
        "HERSCHRIJF-OPDRACHT:",
        `Pas de onderstaande bestaande mail aan volgens: ${input.refineInstruction!.trim()}`,
        "Behoud de kern, de feiten en de toezeggingen; verander alleen wat de opdracht vraagt.",
        "",
        "BESTAANDE MAIL:",
        input.currentBody!.trim(),
      ].join("\n"),
    );
    parts.push('Output uitsluitend JSON {"subject","body"}.');
  } else {
    parts.push('Schrijf nu de mail. Output uitsluitend JSON {"subject","body"}.');
  }

  return { system, user: parts.join("\n\n") };
}
