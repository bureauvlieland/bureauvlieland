import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ExternalLink, Hotel, Loader2, Mail, RefreshCw, Compass } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  calculateOverallCompleteness,
  isAccommodationPartner,
  type CompletenessResult,
  type PartnerCompletenessInput,
} from "@/lib/partnerCompleteness";
import type { PartnerBuildingBlock } from "@/types/partner";

type ProfileTab = "logies" | "activiteiten";

const isActivityPartner = (partnerType: string | null | undefined) =>
  partnerType === "activity_provider" || partnerType === "both";
import { cn } from "@/lib/utils";

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  hasAccount: boolean;
  lastLoginAt: string | null;
  completeness: CompletenessResult;
  /** Aantal gepubliceerde bouwstenen (alleen activiteiten). */
  blockCount: number;
}

const PORTAL_BASE = typeof window !== "undefined" ? window.location.origin : "https://bureauvlieland.nl";

const REMINDER_SUBJECT: Record<ProfileTab, string> = {
  logies: "Uw logiesprofiel bij Bureau Vlieland: klanten willen u zien",
  activiteiten: "Uw activiteiten bij Bureau Vlieland: klanten willen ze zien",
};

const activityReminderBody = (portalBase: string) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; background: #f4f7fa;">
  <div style="background: #104860; padding: 35px 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 26px;">Bureau Vlieland</h1>
  </div>
  <div style="background: white; padding: 35px 30px;">
    <h2 style="color: #104860;">Beste {{partner_name}},</h2>
    <p>Klanten die via ons een groepsuitje samenstellen, zien bij elk programmaonderdeel een foto, de omschrijving, de duur en de ligging van de activiteit, en sinds kort ook een blok over de aanbieder: foto's, een korte tekst en kenmerken. Dat werkt alleen als die informatie is ingevuld.</p>
    <p>Voor uw aanbod ontbreekt op dit moment:</p>
    {{missing_list}}
    <p>Invullen duurt een kwartier en hoeft maar één keer:</p>
    <ol>
      <li><a href="${portalBase}/partner/aanbod" style="color: #104860;">Uw activiteiten</a>: per activiteit een foto, een omschrijving van een paar regels, prijs, duur en het aantal personen.</li>
      <li><a href="${portalBase}/partner/profiel" style="color: #104860;">Bedrijfsprofiel</a>: een paar foto's, een korte tekst over uw bedrijf, kenmerken en de ligging.</li>
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
 * Overzicht van alle actieve partners met hoe compleet hun profiel (en bij
 * activiteiten: hun bouwstenen) is voor wat de klant te zien krijgt
 * (docs/plan-logieskeuze.md fase 3, docs/plan-activiteitenaanbieders.md
 * fase 2), met een herinneringsmailing met per partner wat ontbreekt.
 */
const AdminPartnerProfilesContent = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: ProfileTab = searchParams.get("tab") === "activiteiten" ? "activiteiten" : "logies";
  const setTab = (t: ProfileTab) => {
    setSelected(new Set());
    setSearchParams(t === "logies" ? {} : { tab: t });
  };
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mailingOpen, setMailingOpen] = useState(false);

  const { data: allRows, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-partner-profiles"],
    queryFn: async (): Promise<Record<ProfileTab, ProfileRow[]>> => {
      const [{ data: partners, error }, { data: roomTypes }, { data: blocks }] = await Promise.all([
        supabase
          .from("partners")
          .select(
            "id, name, email, partner_type, is_active, auth_user_id, last_login_at, about_text, image_url, gallery_images, location_lat, location_lng, location_description, website_url, highlight_features, accommodation_description, facilities, check_in_time, check_out_time",
          )
          .eq("is_active", true)
          .order("name"),
        supabase.from("partner_room_types").select("partner_id, images").eq("is_active", true),
        supabase
          .from("building_blocks")
          .select("provider_id, short_description, description, image_url, image_asset, price_adult, price_display_override, duration, min_people, max_people, tags, location_address")
          .eq("status", "published"),
      ]);
      if (error) throw error;
      const blocksByPartner = new Map<string, PartnerBuildingBlock[]>();
      for (const b of blocks ?? []) {
        if (!b.provider_id) continue;
        const list = blocksByPartner.get(b.provider_id) ?? [];
        list.push(b as unknown as PartnerBuildingBlock);
        blocksByPartner.set(b.provider_id, list);
      }
      const roomTypesByPartner = new Map<string, { images: unknown }[]>();
      for (const rt of roomTypes ?? []) {
        const list = roomTypesByPartner.get(rt.partner_id) ?? [];
        list.push({ images: rt.images });
        roomTypesByPartner.set(rt.partner_id, list);
      }
      const toInput = (p: NonNullable<typeof partners>[number]): PartnerCompletenessInput => ({
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
      });
      const bySort = (a: ProfileRow, b: ProfileRow) =>
        a.completeness.score - b.completeness.score || a.name.localeCompare(b.name);
      const base = (p: NonNullable<typeof partners>[number]) => ({
        id: p.id, name: p.name, email: p.email, hasAccount: !!p.auth_user_id, lastLoginAt: p.last_login_at,
      });
      const list = partners ?? [];
      return {
        logies: list
          .filter((p) => isAccommodationPartner(p.partner_type))
          .map((p) => ({ ...base(p), blockCount: 0, completeness: calculatePartnerCompleteness(toInput(p)) }))
          .sort(bySort),
        activiteiten: list
          .filter((p) => isActivityPartner(p.partner_type))
          .map((p) => {
            const partnerBlocks = blocksByPartner.get(p.id) ?? [];
            // Activiteiten: het profiel telt 40%, de bouwstenen 60%. De extra
            // logieschecks (kamertypes, faciliteiten) horen hier niet bij.
            const input = { ...toInput(p), partner_type: "activity_provider" };
            const completeness = calculateOverallCompleteness(input, partnerBlocks, { profileWeight: 0.4 });
            if (partnerBlocks.length === 0) completeness.missing.unshift("Nog geen gepubliceerde bouwstenen");
            return { ...base(p), blockCount: partnerBlocks.length, completeness };
          })
          .sort(bySort),
      };
    },
  });
  const rows = useMemo(() => allRows?.[tab] ?? [], [allRows, tab]);

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
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium flex items-center gap-2">
            {tab === "logies" ? <Hotel className="h-6 w-6 text-primary" /> : <Compass className="h-6 w-6 text-primary" />}
            Partnerprofielen
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === "logies"
              ? "Wat de klant ziet bij het kiezen van een logies komt uit het profiel en de kamertypes van de partner."
              : "Wat de klant ziet bij een activiteit komt uit de bouwsteen (60%) en het profiel van de aanbieder (40%)."}
            {" "}Hier staat wie nog wat mist. Bewerken kan via "Open als partner".
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as ProfileTab)}>
        <TabsList>
          <TabsTrigger value="logies" className="gap-2"><Hotel className="h-4 w-4" />Logies {allRows && <Badge variant="secondary" className="ml-1">{allRows.logies.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="activiteiten" className="gap-2"><Compass className="h-4 w-4" />Activiteiten {allRows && <Badge variant="secondary" className="ml-1">{allRows.activiteiten.length}</Badge>}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: tab === "logies" ? "Logiespartners" : "Activiteitenaanbieders", value: stats.total },
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
        <CardContent className="p-0 border-t">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Geen actieve partners in deze groep.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-4">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Alles selecteren" />
                    </TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead className="w-44">Score</TableHead>
                    <TableHead>Ontbreekt</TableHead>
                    <TableHead className="w-36">Laatst ingelogd</TableHead>
                    <TableHead className="w-40 pr-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const canMail = r.hasAccount && r.completeness.score < 80;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="pl-4 align-top pt-4">
                          <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} disabled={!canMail} aria-label={`Selecteer ${r.name}`} />
                        </TableCell>
                        <TableCell className="align-top py-3">
                          <Link to={`/admin/partners/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                          <div className="flex gap-1 mt-1">
                            {!r.hasAccount && <Badge variant="outline" className="text-xs">Geen account</Badge>}
                            {tab === "activiteiten" && <Badge variant="outline" className="text-xs">{r.blockCount} {r.blockCount === 1 ? "bouwsteen" : "bouwstenen"}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="align-top py-4">
                          <div className="flex items-center gap-2">
                            <Progress value={r.completeness.score} className="h-2 flex-1" />
                            <span className={cn("text-sm font-semibold w-10 text-right", scoreTone(r.completeness.score))}>{r.completeness.score}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          {r.completeness.missing.length === 0 ? (
                            <span className="text-sm text-muted-foreground">Niets</span>
                          ) : (
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {r.completeness.missing.map((m) => <li key={m}>· {m}</li>)}
                            </ul>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3 text-sm text-muted-foreground">
                          {r.lastLoginAt ? format(new Date(r.lastLoginAt), "d MMM yyyy", { locale: nl }) : "Nooit"}
                        </TableCell>
                        <TableCell className="align-top py-3 pr-4">
                          <Button asChild variant="outline" size="sm">
                            <a href={`${PORTAL_BASE}/partner/${tab === "logies" ? "profiel" : "aanbod"}?impersonate=${r.id}`} target="_blank" rel="noopener noreferrer">
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
        defaultSubject={REMINDER_SUBJECT[tab]}
        defaultBody={tab === "logies" ? reminderBody(PORTAL_BASE) : activityReminderBody(PORTAL_BASE)}
        partnerVariables={partnerVariables}
      />
    </div>
  );
};

const AdminPartnerProfiles = () => (
  <>
    <Helmet>
      <title>Partnerprofielen | Admin Bureau Vlieland</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <AdminLayout>
      <AdminPartnerProfilesContent />
    </AdminLayout>
  </>
);

export default AdminPartnerProfiles;
