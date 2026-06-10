import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Mail, AlertCircle, CheckCircle2, RotateCw, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useInvoiceForwardHistory } from "@/hooks/useInvoiceForwardHistory";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  invoiceId: string;
  onResend: (method: "outlook" | "mailjet") => void;
}

export function InvoiceForwardHistoryPopover({ invoiceId, onResend }: Props) {
  const { data: entries, isLoading } = useInvoiceForwardHistory(invoiceId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Verzendgeschiedenis">
          <History className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        <div className="px-3 py-2 border-b">
          <p className="text-sm font-semibold">Verzendgeschiedenis</p>
          <p className="text-xs text-muted-foreground">Alle verzendpogingen naar de boekhouding</p>
        </div>
        <ScrollArea className="max-h-[360px]">
          <div className="p-2 space-y-2">
            {isLoading && <p className="text-xs text-muted-foreground p-2">Laden...</p>}
            {!isLoading && (!entries || entries.length === 0) && (
              <p className="text-xs text-muted-foreground p-2">Nog niet verstuurd.</p>
            )}
            {entries?.map((e) => {
              const method = (e.metadata?.send_method as string) || "mailjet";
              const includedPdf = !!e.metadata?.includedPdf;
              const ok = e.status === "sent";
              return (
                <div key={e.id} className="border rounded-md p-2 text-xs space-y-1 bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {ok ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                      )}
                      <span className="font-medium">
                        {format(new Date(e.created_at), "d MMM yyyy HH:mm", { locale: nl })}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          method === "outlook"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        {method === "outlook" ? "Outlook" : "Mailjet"}
                      </Badge>
                      {includedPdf && (
                        <Badge variant="outline" className="text-[10px]">
                          <Paperclip className="h-3 w-3 mr-0.5" />
                          PDF
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => onResend(method as "outlook" | "mailjet")}
                      title="Opnieuw versturen via dezelfde methode"
                    >
                      <RotateCw className="h-3 w-3 mr-1" />
                      Opnieuw
                    </Button>
                  </div>
                  <div className="text-muted-foreground">
                    Naar: <span className="font-mono">{e.recipient_email}</span>
                  </div>
                  {!ok && e.error_message && (
                    <div className="text-red-700 text-[11px] break-all">{e.error_message}</div>
                  )}
                  {e.mailjet_message_id && (
                    <div className="text-[10px] font-mono text-muted-foreground truncate">
                      msg-id: {e.mailjet_message_id}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
