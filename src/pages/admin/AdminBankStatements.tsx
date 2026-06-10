import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload, Banknote, ArrowDownLeft, ArrowUpRight, Check, X, Trash2, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  useBankStatements,
  useBankStatementLines,
  useConfirmMatch,
  useIgnoreLine,
  useBankPendingCount,
  type BankStatement,
  type BankStatementLine,
} from "@/hooks/useBankStatements";
import { PartnerIbanSuggestionsCard } from "@/components/admin/PartnerIbanSuggestionsCard";

const fmtEur = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
const fmtDate = (d: string | null) =>
  d ? format(new Date(d), "d MMM yyyy", { locale: nl }) : "—";

function MatchDialog({
  line,
  onClose,
}: {
  line: BankStatementLine | null;
  onClose: () => void;
}) {
  const confirm = useConfirmMatch();
  if (!line) return null;
  return (
    <Dialog open={!!line} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Match bevestigen</DialogTitle>
          <DialogDescription>
            {line.direction === "in" ? "Inkomend" : "Uitgaand"} • {fmtEur(Math.abs(line.amount))} •{" "}
            {fmtDate(line.booking_date)}
            <div className="mt-1 text-xs">{line.counterparty_name ?? "—"}</div>
            <div className="mt-1 text-xs italic">{line.description ?? ""}</div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {line.suggestions.length === 0 && (
            <div className="text-sm text-muted-foreground">Geen suggesties — handmatig koppelen volgt later.</div>
          )}
          {line.suggestions.map((s) => (
            <div
              key={`${s.type}-${s.id}`}
              className="flex items-center justify-between border rounded-md p-3"
            >
              <div>
                <div className="font-medium text-sm">
                  {s.label}{" "}
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {s.type === "sales" ? "Verkoop" : s.type === "purchase" ? "Inkoop" : "Batch"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {fmtEur(Number(s.amount))} • zekerheid {Math.round(s.confidence * 100)}%
                </div>
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  await confirm.mutateAsync({ line, type: s.type, invoiceId: s.id });
                  onClose();
                }}
                disabled={confirm.isPending}
              >
                <Check className="h-4 w-4 mr-1" /> Bevestigen
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Sluiten</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: BankStatementLine["status"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    unmatched: { label: "Geen match", cls: "bg-slate-100 text-slate-700 border-slate-200" },
    suggested: { label: "Voorstel", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    ambiguous: { label: "Meerdere", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    confirmed: { label: "Bevestigd", cls: "bg-green-50 text-green-700 border-green-200" },
    ignored: { label: "Genegeerd", cls: "bg-slate-50 text-slate-500 border-slate-200" },
  };
  const m = map[status];
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

function LinesTable({ statementId }: { statementId?: string }) {
  const { data: lines, isLoading } = useBankStatementLines(statementId);
  const [openLine, setOpenLine] = useState<BankStatementLine | null>(null);
  const ignore = useIgnoreLine();

  if (isLoading) return <Skeleton className="h-32" />;
  if (!lines || lines.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Geen regels</div>;
  }

  return (
    <>
      <div className="space-y-2">
        {lines.map((l) => (
          <div key={l.id} className="flex items-center gap-3 border rounded-lg p-3 hover:bg-accent/30">
            <div className={l.direction === "in" ? "text-green-600" : "text-red-600"}>
              {l.direction === "in" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{fmtEur(Math.abs(l.amount))}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-sm">{l.counterparty_name ?? "Onbekend"}</span>
                <StatusBadge status={l.status} />
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {fmtDate(l.booking_date)} • {l.description ?? "—"}
              </div>
            </div>
            {(l.status === "suggested" || l.status === "ambiguous" || l.status === "unmatched") && (
              <div className="flex items-center gap-1">
                {l.suggestions.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setOpenLine(l)}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Koppel
                  </Button>
                )}
                <Button
                  size="icon" variant="ghost" className="h-8 w-8"
                  onClick={() => ignore.mutate(l.id)} title="Negeren"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <MatchDialog line={openLine} onClose={() => setOpenLine(null)} />
    </>
  );
}

function StatementCard({ s, onDelete }: { s: BankStatement; onDelete: (s: BankStatement) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              {s.iban ?? "Onbekend IBAN"}
            </CardTitle>
            <CardDescription>
              {fmtDate(s.statement_date)} • {s.line_count} regels • {s.matched_count} auto-gematcht
              {s.closing_balance != null && <> • saldo {fmtEur(Number(s.closing_balance))}</>}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
              {open ? "Verbergen" : "Bekijken"}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
              onClick={() => { if (confirm("Afschrift verwijderen?")) onDelete(s); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {open && <CardContent><LinesTable statementId={s.id} /></CardContent>}
    </Card>
  );
}

export default function AdminBankStatements() {
  const { statements, isLoading, uploadStatement, deleteStatement } = useBankStatements();
  const { data: pendingCount = 0 } = useBankPendingCount();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Bankafschriften</h1>
            <p className="text-sm text-muted-foreground">
              Upload CAMT.053 XML-bestanden en koppel ze aan verkoop- en inkoopfacturen.
            </p>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".xml,application/xml,text/xml"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await uploadStatement.mutateAsync(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={uploadStatement.isPending}>
              {uploadStatement.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload CAMT.053
            </Button>
          </div>
        </div>

        <PartnerIbanSuggestionsCard />

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Te bevestigen
              {pendingCount > 0 && (
                <Badge className="ml-2 bg-amber-500 text-white">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="statements">Afschriften ({statements?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Openstaande regels</CardTitle>
                <CardDescription>
                  Alle regels uit alle afschriften die nog een actie vragen.
                </CardDescription>
              </CardHeader>
              <CardContent><LinesTable /></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statements" className="mt-4 space-y-3">
            {isLoading && <Skeleton className="h-24" />}
            {!isLoading && (!statements || statements.length === 0) && (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nog geen afschriften geüpload.
              </CardContent></Card>
            )}
            {statements?.map((s) => (
              <StatementCard key={s.id} s={s} onDelete={(x) => deleteStatement.mutate(x)} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
