import { format, parseISO, addHours } from "date-fns";

interface CalendarItem {
  id: string;
  block_name: string;
  provider_name?: string;
  day_index: number;
  confirmed_time?: string | null;
  proposed_time?: string | null;
  preferred_time?: string | null;
  duration?: string | null;
  location_address?: string | null;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsDate(date: Date): string {
  return format(date, "yyyyMMdd");
}

function formatIcsDateTime(date: Date, time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return format(d, "yyyyMMdd'T'HHmmss");
}

function parseDurationHours(duration: string): number {
  // Try to parse durations like "2 uur", "1,5 uur", "1.5 uur", "90 min"
  const hourMatch = duration.match(/([\d,.]+)\s*uur/i);
  if (hourMatch) {
    return parseFloat(hourMatch[1].replace(",", "."));
  }
  const minMatch = duration.match(/([\d,.]+)\s*min/i);
  if (minMatch) {
    return parseFloat(minMatch[1].replace(",", ".")) / 60;
  }
  return 2; // default 2 hours
}

function generateVEvent(
  item: CalendarItem,
  dates: (string | Date)[],
  numberOfPeople?: number
): string | null {
  const dateValue = dates[item.day_index];
  if (!dateValue) return null;

  const date = typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
  const effectiveTime = item.confirmed_time || item.proposed_time || item.preferred_time;
  const uid = `bureauvlieland-${item.id}@bureauvlieland.nl`;
  const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

  let dtStart: string;
  let dtEnd: string;

  if (effectiveTime && effectiveTime !== "flexibel") {
    dtStart = formatIcsDateTime(date, effectiveTime);
    const durationHours = item.duration ? parseDurationHours(item.duration) : 2;
    const startDate = new Date(date);
    const [h, m] = effectiveTime.split(":").map(Number);
    startDate.setHours(h, m, 0, 0);
    const endDate = addHours(startDate, durationHours);
    dtEnd = format(endDate, "yyyyMMdd'T'HHmmss");
  } else {
    // All-day event
    dtStart = formatIcsDate(date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    dtEnd = formatIcsDate(nextDay);
  }

  const descParts: string[] = [];
  if (item.provider_name) descParts.push(`Aanbieder: ${item.provider_name}`);
  if (numberOfPeople) descParts.push(`${numberOfPeople} personen`);

  const isAllDay = !effectiveTime || effectiveTime === "flexibel";

  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    isAllDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
    isAllDay ? `DTEND;VALUE=DATE:${dtEnd}` : `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(item.block_name)}`,
    `LOCATION:${escapeIcsText(item.location_address || "Vlieland")}`,
    `DESCRIPTION:${escapeIcsText(descParts.join("\\n"))}`,
    "END:VEVENT",
  ];

  return lines.join("\r\n");
}

function wrapCalendar(vevents: string[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bureau Vlieland//Programma//NL",
    "METHOD:PUBLISH",
    "CALSCALE:GREGORIAN",
    ...vevents,
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

function downloadIcsFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSingleEvent(
  item: CalendarItem,
  dates: (string | Date)[],
  numberOfPeople?: number
) {
  const vevent = generateVEvent(item, dates, numberOfPeople);
  if (!vevent) return;
  const ics = wrapCalendar([vevent]);
  const safeName = item.block_name.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-");
  downloadIcsFile(ics, `${safeName}.ics`);
}

export function downloadAllEvents(
  items: CalendarItem[],
  dates: (string | Date)[],
  numberOfPeople?: number,
  programName?: string
) {
  const vevents = items
    .map((item) => generateVEvent(item, dates, numberOfPeople))
    .filter(Boolean) as string[];
  if (vevents.length === 0) return;
  const ics = wrapCalendar(vevents);
  const filename = programName
    ? `${programName.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-")}.ics`
    : "programma-vlieland.ics";
  downloadIcsFile(ics, filename);
}
