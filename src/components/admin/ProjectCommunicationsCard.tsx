import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  Mail,
  Send,
  Phone,
  FileText,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useProjectCommunications } from "@/hooks/useProjectCommunications";
import { AddCommunicationSheet } from "./AddCommunicationSheet";
import { SendProjectEmailSheet } from "./SendProjectEmailSheet";
import { COMMUNICATION_TYPE_CONFIG, type CommunicationType } from "@/types/projectCommunication";
import { cn } from "@/lib/utils";

interface PartnerRecipient {
  name: string;
  email: string;
  partnerId: string;
}

interface ProjectCommunicationsCardProps {
  requestId?: string;
  accommodationId?: string;
  customerName?: string;
  customerEmail?: string;
  partnerRecipients?: PartnerRecipient[];
}

export function ProjectCommunicationsCard({
  requestId,
  accommodationId,
  customerName,
  customerEmail,
  partnerRecipients = [],
}: ProjectCommunicationsCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [emailSheetOpen, setEmailSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const {
    communications,
    isLoading,
    deleteCommunication,
    isDeleting,
  } = useProjectCommunications({ requestId, accommodationId });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCommunication(deleteId);
      toast.success("Communicatie verwijderd");
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting communication:", error);
      toast.error("Fout bij verwijderen");
    }
  };

  const getIcon = (type: CommunicationType) => {
    switch (type) {
      case "email_in":
        return <Mail className="h-4 w-4" />;
      case "email_out":
        return <Send className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "note":
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const isInbound = (comm: any) => 
    comm.communication_type === "email_in" || comm.direction === "inbound";

  const displayCount = expanded ? communications.length : 5;
  const visibleCommunications = communications.slice(0, displayCount);
  const hasMore = communications.length > 5;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            Communicatie
            {communications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {communications.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEmailSheetOpen(true)}>
              <Send className="h-4 w-4 mr-1" />
              E-mail
            </Button>
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Loggen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : communications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nog geen communicatie gelogd</p>
              <p className="text-xs mt-1">
                Voeg emails, telefoongesprekken of notities toe
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleCommunications.map((comm) => {
                const config = COMMUNICATION_TYPE_CONFIG[comm.communication_type as CommunicationType];
                return (
                  <div
                    key={comm.id}
                    className="group relative border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5", config?.color || "text-slate-600")}>
                        {getIcon(comm.communication_type as CommunicationType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {config?.label || comm.communication_type}
                          </span>
                          {isInbound(comm) && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              Inkomend
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comm.communication_date), "d MMM yyyy, HH:mm", {
                              locale: nl,
                            })}
                          </span>
                        </div>
                        {comm.subject && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {comm.subject}
                          </p>
                        )}
                        {comm.contact_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {comm.contact_name}
                            {comm.contact_email && ` (${comm.contact_email})`}
                          </p>
                        )}
                        <p className="text-sm mt-1 whitespace-pre-wrap line-clamp-3">
                          {comm.content}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(comm.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Minder tonen
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Toon alle {communications.length} berichten
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddCommunicationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        requestId={requestId}
        accommodationId={accommodationId}
        defaultContactName={customerName}
        defaultContactEmail={customerEmail}
      />

      <SendProjectEmailSheet
        open={emailSheetOpen}
        onOpenChange={setEmailSheetOpen}
        requestId={requestId}
        accommodationId={accommodationId}
        recipients={[
          ...(customerEmail ? [{
            label: `Klant: ${customerName || ""}`,
            email: customerEmail,
            name: customerName || "",
            type: "customer" as const,
          }] : []),
          ...partnerRecipients.map((p) => ({
            label: `Partner: ${p.name}`,
            email: p.email,
            name: p.name,
            type: "partner" as const,
            partnerId: p.partnerId,
          })),
        ]}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Communicatie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze communicatie wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
