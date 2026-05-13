import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GuestDetailsCard } from "./GuestDetailsCard";
import { ProgramPdfDownload } from "./ProgramPdfDownload";
import { downloadAllEvents } from "@/lib/calendarExport";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail,
  Phone,
  CalendarPlus,
  FileText,
  Ticket,
  Download,
  Info,
  Building2,
} from "lucide-react";
import type { ProgramRequestItem } from "@/types/programRequest";

interface PracticalViewProps {
  program: {
    id?: string;
    customer_name: string;
    customer_company?: string;
    customer_token?: string;
    number_of_people: number;
    items: ProgramRequestItem[];
    reference_number?: string | null;
  };
  selectedDates: Date[];
  guestDetails?: {
    guest_names: string | null;
    dietary_notes: string | null;
    room_assignment: string | null;
    updated_at: string | null;
    showDietary: boolean;
    showRoomAssignment: boolean;
  };
  onOpenGuestDetails?: () => void;
}

export const PracticalView = ({
  program,
  selectedDates,
  guestDetails,
  onOpenGuestDetails,
}: PracticalViewProps) => {
  const ticketItems = (program.items || []).filter(
    (i) => i.status !== "cancelled" && !!i.booking_document_path
  );

  const handleTicketDownload = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("ticket-documents")
      .createSignedUrl(path, 60 * 60);
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro strip */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 dark:text-blue-100">
          <p className="font-medium">Wat kunt u hier doen?</p>
          <p className="text-blue-800/90 dark:text-blue-100/90 mt-1">
            Geef de gegevens van uw groep door (gasten, dieet, kamerindeling),
            download tickets en uw programma als PDF of agenda-export. Hier vindt u
            ook de contactgegevens van Bureau Vlieland.
          </p>
        </div>
      </div>

      {/* Groep & wensen */}
      {guestDetails && onOpenGuestDetails && (
        <GuestDetailsCard
          guestNames={guestDetails.guest_names}
          dietaryNotes={guestDetails.dietary_notes}
          roomAssignment={guestDetails.room_assignment}
          showDietary={guestDetails.showDietary}
          showRoomAssignment={guestDetails.showRoomAssignment}
          updatedAt={guestDetails.updated_at}
          onEdit={onOpenGuestDetails}
        />
      )}

      {/* Tickets (ferry / fietshuur) */}
      {ticketItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              Tickets & vouchers
              <Badge variant="secondary" className="text-xs">
                {ticketItems.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ticketItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.block_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.provider_name}
                    {item.booking_reference && ` · Ref ${item.booking_reference}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTicketDownload(item.booking_document_path!)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Ticket
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Downloads */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Programma downloaden
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Bewaar uw programma als Word-document of importeer het direct in uw agenda.
          </p>
          <div className="flex flex-wrap gap-2">
            <ProgramPdfDownload
              customerName={program.customer_name}
              customerCompany={program.customer_company}
              selectedDates={selectedDates}
              numberOfPeople={program.number_of_people}
              items={program.items}
              referenceNumber={program.reference_number}
              requestId={program.id}
              customerToken={program.customer_token}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const activeItems = program.items.filter(
                  (i) => i.status !== "cancelled" && i.day_index >= 0
                );
                downloadAllEvents(
                  activeItems.map((i) => ({
                    id: i.id,
                    block_name: i.block_name,
                    provider_name: i.provider_name,
                    day_index: i.day_index,
                    confirmed_time: i.confirmed_time,
                    proposed_time: i.proposed_time,
                    preferred_time: i.preferred_time,
                    duration: i.duration,
                    location_address: i.location_address,
                  })),
                  selectedDates.map((d) => d.toISOString().split("T")[0]),
                  program.number_of_people,
                  `Programma ${program.customer_company || program.customer_name}`
                );
              }}
            >
              <CalendarPlus className="h-4 w-4 mr-1.5" />
              Agenda-export (.ics)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Bureau Vlieland */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Contact Bureau Vlieland
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <a
            href="mailto:hallo@bureauvlieland.nl"
            className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
            hallo@bureauvlieland.nl
          </a>
          <a
            href="tel:+31562700208"
            className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
          >
            <Phone className="h-4 w-4 text-muted-foreground" />
            0562 700 208
          </a>
          <p className="text-xs text-muted-foreground pt-2">
            Tijdens uw verblijf op Vlieland zijn wij ook telefonisch bereikbaar voor
            ondersteuning ter plekke.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
