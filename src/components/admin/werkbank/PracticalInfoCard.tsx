import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { ROOM_TYPES, ROOM_OCCUPANCY_OPTIONS, BOARD_PREFERENCE_OPTIONS } from "@/types/accommodation";

/**
 * Praktische informatie die de klant zelf op de klantpagina invult (gastenlijst,
 * dieetwensen, omschrijving, kamers & verzorging, kamerindeling, facturatie).
 * Stond nergens in de Werkbank, terwijl het bureau hierop moet handelen.
 */

interface ProgramPractical {
  guest_names: string | null;
  dietary_notes: string | null;
  program_description: string | null;
  guest_details_updated_at: string | null;
  linked_accommodation_id: string | null;
  billing_company_name: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  billing_reference: string | null;
  billing_address_city: string | null;
}

interface LodgingPractical {
  room_count: number | null;
  room_occupancy: string | null;
  room_types: string[] | null;
  board_preference: string | null;
  room_assignment: string | null;
  special_requests: string | null;
}

function label(options: ReadonlyArray<{ value: string; label: string }>, value: string | null | undefined) {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? value;
}

function Row({ title, value, empty = "Nog niet ingevuld" }: { title: string; value: string | null | undefined; empty?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{title}</div>
      {value ? (
        <div className="whitespace-pre-wrap">{value}</div>
      ) : (
        <div className="text-muted-foreground italic">{empty}</div>
      )}
    </div>
  );
}

export function PracticalInfoCard({ requestId }: { requestId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["werkbank-practical-info", requestId],
    queryFn: async () => {
      const { data: program, error } = await supabase
        .from("program_requests")
        .select(
          "guest_names, dietary_notes, program_description, guest_details_updated_at, linked_accommodation_id, billing_company_name, billing_contact_name, billing_contact_email, billing_reference, billing_address_city",
        )
        .eq("id", requestId)
        .maybeSingle();
      if (error) throw error;
      const p = program as ProgramPractical | null;
      let lodging: LodgingPractical | null = null;
      if (p?.linked_accommodation_id) {
        const { data: acc } = await supabase
          .from("accommodation_requests")
          .select("room_count, room_occupancy, room_types, board_preference, room_assignment, special_requests")
          .eq("id", p.linked_accommodation_id)
          .maybeSingle();
        lodging = (acc as LodgingPractical | null) ?? null;
      }
      return { program: p, lodging };
    },
  });

  if (isLoading || !data?.program) return null;
  const { program, lodging } = data;

  const roomTypes = Array.isArray(lodging?.room_types)
    ? lodging!.room_types.map((t) => label(ROOM_TYPES, t)).filter(Boolean).join(", ")
    : "";
  const roomsSummary = lodging
    ? [
        lodging.room_count ? `${lodging.room_count} kamer${lodging.room_count === 1 ? "" : "s"}` : null,
        label(ROOM_OCCUPANCY_OPTIONS, lodging.room_occupancy),
        roomTypes || null,
      ].filter(Boolean).join(" · ")
    : "";
  const billing = program.billing_company_name || program.billing_contact_name
    ? [program.billing_company_name, program.billing_contact_name, program.billing_contact_email, program.billing_address_city, program.billing_reference ? `ref. ${program.billing_reference}` : null]
        .filter(Boolean)
        .join(" · ")
    : null;
  const updated = program.guest_details_updated_at
    ? new Date(program.guest_details_updated_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClipboardList className="h-4 w-4 text-primary" /> Praktische info van de klant
          {updated && <span className="ml-auto text-xs font-normal text-muted-foreground">bijgewerkt {updated}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm md:grid-cols-2">
        <Row title="Omschrijving / doel van het uitje" value={program.program_description} />
        <Row title="Gastenlijst" value={program.guest_names} />
        <Row title="Dieetwensen & allergieën" value={program.dietary_notes} empty="Geen opgegeven" />
        {lodging && (
          <>
            <Row title="Kamers & verzorging" value={[roomsSummary, label(BOARD_PREFERENCE_OPTIONS, lodging.board_preference)].filter(Boolean).join(" · ") || null} />
            <Row title="Kamerindeling" value={lodging.room_assignment} />
            <Row title="Bijzondere wensen logies" value={lodging.special_requests} empty="Geen opgegeven" />
          </>
        )}
        <Row title="Facturatiegegevens" value={billing} />
      </CardContent>
    </Card>
  );
}
