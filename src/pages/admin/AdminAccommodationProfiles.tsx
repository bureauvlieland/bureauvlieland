import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ExternalLink, Hotel, Loader2, Mail, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SendPartnerMailingDialog } from "@/components/admin/SendPartnerMailingDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  calculatePartnerCompleteness,
  isAccommodationPartner,
  type CompletenessResult,
  type PartnerCompletenessInput,
} from "@/lib/partnerCompleteness";
import { cn } from "@/lib/utils";

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  hasAccount: boolean;
  lastLoginAt: string | null;
  completeness: CompletenessResult;
}

const PORTAL_BASE = typeof window !== "undefined" ? window.location.origin : "https://bureauvlieland.nl";

const REMINDER_SUBJECT = "Uw logiesprofiel bij Bureau Vlieland: klanten willen u zien";

const reminderBody = (portalBase: string) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; background: #f4f7fa;">
  <div style="background: #104860; padding: 35px 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 26px;">Bureau Vlieland</h1>
  </div>
  <div style="background: white; padding: 35px 30px;">
    <h2 style="color: #104860;">Beste {{partner_name}},</h2>
    <p>Klanten die via ons een groepsuitje boeken, kiezen hun logies sinds kort op een nieuwe manier: ze zien bij uw offerte direct foto's, de ligging, de kamers en de faciliteiten van uw accommodatie. Dat werkt alleen als die informatie in uw profiel staat.</p>
    <p>Voor uw profiel ontbreekt op dit moment:</p>
    {{missing_list}}
    <p>Invullen duurt een kwartier en hoeft maar één keer:</p>
    <ol>
      <li><a href="${portalBase}/partner/profiel" style="color: #104860;">Bedrijfsprofiel</a>: foto's, tekst, kenmerken, ligging, faciliteiten en in-/uitchecktijden.</li>
      <li><a href="${portalBase}/partner/kamersoorten" style="color: #104860;">Kamertypes</a>: per kamertype een paar foto's, bedden en faciliteiten. Bij een offerte kiest u dan een kamertype en ziet de klant meteen wat hij krijgt.</li>
    </ol>
    <p>Liever dat wij het voor u doen? Stuur een paar foto's en een korte tekst naar <a href="mailto:erwin@bureauvlieland.nl" style="color: #104860;">erwin@bureauvlieland.nl</a>, dan zetten wij het erin.</p>
    <p style="margin-top: 30px;">Met vriendelijke groet,<br><strong>Erwin Soolsma</strong><br>Bureau Vlieland</p>
  </div>
  <div style="background: #e8f0f8; padding: 20px 30px; text-align: center;">
    <p style="color: #374151; font-size: 13px; margin: 0;">
      Vragen? <a href="mailto:erwin@bureauvlieland.nl" style="color: #104860;">erwin@bureauvlieland.nl</a> of 0562 700 208
    </p>
  </div>
</body>
</html>`;

const missingListHtml = (missing: string[]) =>
  missing.length === 0
    ? "<p><em>Niets, uw profiel is compleet.</em></p>"
    : `<ul>${missing.map((m) => `<li>${m.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string))}</li>`).join("")}</ul>`;

const scoreTone = (score: number) =>
  score >= 80 ? "text-primary" : score >= 50 ? "text-amber-600" : "text-destructive";

/**
 * Overzicht van alle actieve logiespartners met hoe compleet hun profiel is
 * voor de logieskeuze van de klant (docs/plan-logieskeuze.md, fase 3), en een
 * herinneringsmailing met per partner de lijst van wat ontbreekt.
 */
const AdminAccommodationProfilesContent = () => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mailingOpen, setMailingOpen] = useState(false);

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-accommodation-profiles"],
    queryFn: async (): Promise<ProfileRow[]> => {
      const [{ data: partners, error }, { data: roomTypes }] = await Promise.all([
        supabase
          .from("partners")
          .select(
            "id, name, email, partner_type, is_active, auth_user_id, last_login_at, about_text, image_url, gallery_images, location_lat, location_lng, location_description, website_url, highlight_features, accommodation_description, facilities, check_in_time, check_out_time",
          )
          .eq("is_active", true)
          .order("name"),
        supabase.from("partner_room_types").select("partner_id, images").eq("is_active", true),
      ]);
      if (error) throw error;
      const roomTypesByPartner = new Map<string, { images: unknown }[]>();
      for (const rt of roomTypes ?? []) {
        const list = roomTypesByPartner.get(rt.partner_id) ?? [];
        list.push({ images: rt.images });
        roomTypesByPartner.set(rt.partner_id, list);
      }
      return (partners ?? [])
        .filter((p) => isAccommodationPartner(p.partner_type))
        .map((p) => {
          const input: PartnerCompletenessInput = {
            about_text: p.about_text,
            image_url: p.image_url,
            gallery_images: (p.gallery_images as { url: string; alt?: string }[] | null) ?? [],
            location_lat: p.location_lat,
            location_lng: p.location_lng,
            location_description: p.location_description,
            website_url: p.website_url,
            highlight_features: (p.highlight_features as string[] | null) ?? [],
            partner_type: p.partner_type,
            accommodation_description: p.accommodation_description,
            facilities: p.facilities ?? [],
            check_in_time: p.check_in_time,
            check_out_time: p.check_out_time,
            room_types: roomTypesByPartner.get(p.id) ?? [],
          };
          return {
            id: p.id,
            name: p.name,
            email: p.email,
            hasAccount: !!p.auth_user_id,
            lastLoginAt: p.last_login_at,
            completeness: calculatePartnerCompleteness(input),
          };
        })
        .sort((a, b) => a.completeness.score - b.completeness.score || a.name.localeCompare(b.name));
    },
  });

  const stats = useMemo(() => {
    const total = rows.length;
    const complete = rows.filter((r) => r.completeness.score >= 80).length;
    const empty = rows.filter((r) => r.completeness.score < 30).length;
    const avg = total ? Math.round(rows.reduce((s, r) => s + r.completeness.score, 0) / total) : 0;
    return { total, complete, empty, avg };
  }, [rows]);

  const mailable = rows.filter((r) => r.hasAccount && r.completeness.score < 80);
  const selectedMailable = mailable.filter((r) => selected.has(r.id));

  const partnerVariables = useMemo(() => {
    const vars: Record<string, Record<string, string>> = {};
    for (const r of rows) vars[r.id] = { missing_list: missingListHtml(r.completeness.missing) };
    return vars;
  }, [rows]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const allSelected = mailable.length > 0 && mailable.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(mailable.map((r) => r.id)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium flex items-center gap-2"><Hotel className="h-6 w-6 text-primary" />Logiesprofielen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Wat de klant ziet bij het kiezen van een logies komt uit het profiel en de kamertypes van de partner.
            Hier staat wie nog wat mist. Bewerken kan via "Open als partner".
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", isFetching && "animate-spin")} />Vernieuwen
          </Button>
          <Button size="sm" onClick={() => setMailingOpen(true)} disabled={selectedMailable.length === 0}>
            <Mail className="h-4 w-4 mr-1.5" />Herinnering sturen{selectedMailable.length > 0 ? ` (${selectedMailable.length})` : ""}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Logiespartners", value: stats.total },
          { label: "Compleet (≥ 80%)", value: stats.complete },
          { label: "Vrijwel leeg (< 30%)", value: stats.empty },
          { label: "Gemiddelde score", value: `${stats.avg}%` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="font-display text-2xl font-semibold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Per partner</CardTitle>
          <CardDescription>
            Gesorteerd van minst naar meest compleet. Alleen partners met een account en een score onder 80% kunnen een herinnering krijgen.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Geen actieve logiespartners gevonden.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Alles selecteren" />
                    </TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead className="w-44">Score</TableHead>
                    <TableHead>Ontbreekt</TableHead>
                    <TableHead className="w-36">Laatst ingelogd</TableHead>
                    <TableHead className="w-40"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const canMail = r.hasAccount && r.completeness.score < 80;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} disabled={!canMail} aria-label={`Selecteer ${r.name}`} />
                        </TableCell>
                        <TableCell>
                          <Link to={`/admin/partners/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                          {!r.hasAccount && <Badge variant="outline" className="mt-1 text-xs">Geen account</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={r.completeness.score} className="h-2 flex-1" />
                            <span className={cn("text-sm font-semibold w-10 text-right", scoreTone(r.completeness.score))}>{r.completeness.score}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.completeness.missing.length === 0 ? (
                            <span className="text-sm text-muted-foreground">Niets</span>
                          ) : (
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {r.completeness.missing.map((m) => <li key={m}>· {m}</li>)}
                            </ul>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.lastLoginAt ? format(new Date(r.lastLoginAt), "d MMM yyyy", { locale: nl }) : "Nooit"}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <a href={`${PORTAL_BASE}/partner/profiel?impersonate=${r.id}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Open als partner
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SendPartnerMailingDialog
        open={mailingOpen}
        onOpenChange={setMailingOpen}
        selectedPartnerIds={selectedMailable.map((r) => r.id)}
        totalActivePartners={mailable.length}
        defaultSubject={REMINDER_SUBJECT}
        defaultBody={reminderBody(PORTAL_BASE)}
        partnerVariables={partnerVariables}
      />
    </div>
  );
};

const AdminAccommodationProfiles = () => (
  <>
    <Helmet>
      <title>Logiesprofielen | Admin Bureau Vlieland</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <AdminLayout>
      <AdminAccommodationProfilesContent />
    </AdminLayout>
  </>
);

export default AdminAccommodationProfiles;
