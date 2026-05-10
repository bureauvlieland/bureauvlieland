import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Hotel, Sparkles, ExternalLink } from "lucide-react";
import {
  COMMUNICATION_STATE_META,
  type ProjectCommunicationState,
} from "@/lib/projectCommunication";
import type { ProjectSummary } from "@/lib/getProject";
import { cn } from "@/lib/utils";

function CommBadge({ state }: { state: ProjectCommunicationState }) {
  const meta = COMMUNICATION_STATE_META[state];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium", meta.tone)}>
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

function fmtEur(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

export function ProjectDetailPanel({ project }: { project: ProjectSummary | null }) {
  const navigate = useNavigate();

  const { data: detail } = useQuery({
    queryKey: ["werkbank-detail", project?.id],
    enabled: !!project?.id,
    queryFn: async () => {
      const id = project!.id;
      const [items, lodging, comms, financial] = await Promise.all([
        supabase
          .from("program_request_items")
          .select("id, title, day_index, start_time, end_time, status, quoted_price, provider_id, skip_partner_notification, customer_approved_at")
          .eq("request_id", id)
          .order("day_index", { ascending: true })
          .order("start_time", { ascending: true }),
        project!.hasLodging
          ? supabase
              .from("accommodation_requests")
              .select("id, reference_number, status, arrival_date, departure_date, number_of_guests, accommodation_quotes(id, status, partner_id, price_total, room_summary)")
              .eq("linked_program_id", id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("project_communications")
          .select("id, communication_type, direction, subject, content, communication_date")
          .eq("request_id", id)
          .order("communication_date", { ascending: false })
          .limit(15),
        supabase
          .from("bureau_invoices")
          .select("id, invoice_number, amount_incl_vat, invoice_type, invoice_date")
          .eq("request_id", id)
          .order("invoice_date", { ascending: false }),
      ]);
      return {
        items: items.data ?? [],
        lodging: lodging.data,
        comms: comms.data ?? [],
        invoices: financial.data ?? [],
      };
    },
  });

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Selecteer een project links om details te zien.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs text-muted-foreground">{project.reference}</div>
          <h2 className="truncate text-xl font-semibold">
            {project.customer.company || project.customer.name}
          </h2>
          <div className="mt-1 text-sm text-muted-foreground">
            {project.numberOfPeople} personen
            {project.dates.length > 0 && ` · ${project.dates.join(" → ")}`}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <CommBadge state={project.comm} />
            <Badge variant="outline">{project.pipeline.replace(/_/g, " ")}</Badge>
            {project.kind !== "programma_only" && (
              <Badge variant="secondary" className="gap-1">
                <Hotel className="h-3 w-3" />
                {project.kind === "logies_only" ? "logies-only" : "+ logies"}
              </Badge>
            )}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() =>
            navigate(
              project.kind === "logies_only" && detail?.lodging
                ? `/admin/logies/${detail.lodging.id}`
                : `/admin/projecten/${project.id}`,
            )
          }
        >
          Open dossier <ExternalLink className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>

      <Tabs defaultValue="overzicht">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
          <TabsTrigger value="programma">Programma</TabsTrigger>
          <TabsTrigger value="logies">Logies</TabsTrigger>
          <TabsTrigger value="financieel">Financieel</TabsTrigger>
          <TabsTrigger value="communicatie">Communicatie</TabsTrigger>
        </TabsList>

        <TabsContent value="overzicht" className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Programma</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {project.hasProgram ? (
                  <>
                    <div className="text-xs text-muted-foreground">Pipeline: {project.programPipeline}</div>
                    <CommBadge state={project.programComm} />
                  </>
                ) : (
                  <div className="text-muted-foreground">Geen programma-spoor.</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Logies</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {project.hasLodging && project.lodgingComm ? (
                  <>
                    <div className="text-xs text-muted-foreground">Pipeline: {project.lodgingPipeline}</div>
                    <CommBadge state={project.lodgingComm} />
                  </>
                ) : (
                  <div className="text-muted-foreground">Geen logies in dit project.</div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" /> Claudia denkt mee
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Open Claudia rechtsboven en stel een vraag — ze ziet automatisch dit project als context.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programma">
          {!detail ? (
            <div className="p-4 text-sm text-muted-foreground">Laden…</div>
          ) : detail.items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Geen programma-items.</div>
          ) : (
            <div className="space-y-1.5">
              {detail.items.map((it: any) => (
                <div key={it.id} className="flex items-center justify-between rounded border bg-background px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{it.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Dag {it.day_index === -1 ? "intern" : it.day_index} · {it.start_time ?? "—"} · {it.status}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtEur(it.quoted_price)}</div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logies">
          {!detail?.lodging ? (
            <div className="p-4 text-sm text-muted-foreground">Geen logies-aanvraag.</div>
          ) : (
            <div className="space-y-2">
              <div className="rounded border bg-background px-3 py-2 text-sm">
                <div className="font-mono text-xs text-muted-foreground">{detail.lodging.reference_number}</div>
                <div>{detail.lodging.number_of_guests} gasten · {detail.lodging.arrival_date} → {detail.lodging.departure_date}</div>
                <div className="mt-1 text-xs text-muted-foreground">Status: {detail.lodging.status}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium uppercase text-muted-foreground">Offertes</div>
                {(detail.lodging.accommodation_quotes ?? []).map((q: any) => (
                  <div key={q.id} className="flex items-center justify-between rounded border bg-background px-3 py-1.5 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">{q.partner_id}</div>
                      <div className="text-xs">{q.status}</div>
                    </div>
                    <div className="text-xs">{fmtEur(q.price_total)}</div>
                  </div>
                ))}
                {(detail.lodging.accommodation_quotes ?? []).length === 0 && (
                  <div className="text-xs text-muted-foreground">Nog geen offertes.</div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="financieel">
          {!detail ? (
            <div className="p-4 text-sm text-muted-foreground">Laden…</div>
          ) : detail.invoices.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Nog geen facturen.</div>
          ) : (
            <div className="space-y-1.5">
              {detail.invoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between rounded border bg-background px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{inv.invoice_number}</div>
                    <div className="text-xs text-muted-foreground">{inv.invoice_date} · {inv.invoice_type}</div>
                  </div>
                  <div>{fmtEur(inv.amount_incl_vat)}</div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="communicatie">
          {!detail ? (
            <div className="p-4 text-sm text-muted-foreground">Laden…</div>
          ) : detail.comms.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Nog geen communicatie gelogd.</div>
          ) : (
            <div className="space-y-2">
              {detail.comms.map((c: any) => (
                <div key={c.id} className="rounded border bg-background px-3 py-2 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.communication_type} · {c.direction}</span>
                    <span>{new Date(c.communication_date).toLocaleString("nl-NL")}</span>
                  </div>
                  {c.subject && <div className="mt-1 font-medium">{c.subject}</div>}
                  <div className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{c.content}</div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
