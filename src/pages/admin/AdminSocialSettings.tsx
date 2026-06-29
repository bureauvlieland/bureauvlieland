import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Link2 } from "lucide-react";

type Settings = {
  id?: string;
  cadence_per_week: number;
  posting_days: string[];
  posting_time: string;
  sources_enabled: Record<string, boolean>;
  hashtag_sets: Record<string, string[]>;
  default_ctas: Record<string, string>;
  tone_of_voice: string;
  meta_page_id: string | null;
  meta_ig_user_id: string | null;
  meta_token_expires_at: string | null;
  meta_connected_at: string | null;
  publishing_enabled: boolean;
};

const DEFAULTS: Settings = {
  cadence_per_week: 3,
  posting_days: ["ma", "wo", "vr"],
  posting_time: "10:00",
  sources_enabled: { building_blocks: true, partners: true, assets: true, partner_spotlight: true },
  hashtag_sets: { default: ["#vlieland", "#waddeneilanden", "#bureauvlieland"] },
  default_ctas: { default: "https://www.bureauvlieland.nl" },
  tone_of_voice: "warm, eilandelijk, professioneel, niet schreeuwerig",
  meta_page_id: null,
  meta_ig_user_id: null,
  meta_token_expires_at: null,
  meta_connected_at: null,
  publishing_enabled: false,
};

export default function AdminSocialSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("social_settings").select("*").limit(1).maybeSingle();
      if (data) {
        setSettings({ ...DEFAULTS, ...(data as unknown as Settings) });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      cadence_per_week: settings.cadence_per_week,
      posting_days: settings.posting_days,
      posting_time: settings.posting_time,
      sources_enabled: settings.sources_enabled,
      hashtag_sets: settings.hashtag_sets,
      default_ctas: settings.default_ctas,
      tone_of_voice: settings.tone_of_voice,
      meta_page_id: settings.meta_page_id,
      meta_ig_user_id: settings.meta_ig_user_id,
      publishing_enabled: settings.publishing_enabled,
    };
    if (token.trim()) {
      payload.meta_token_encrypted = token.trim();
      payload.meta_connected_at = new Date().toISOString();
      // Long-lived Page tokens duren ~60 dagen
      payload.meta_token_expires_at = new Date(Date.now() + 55 * 24 * 60 * 60 * 1000).toISOString();
    }

    let res;
    if (settings.id) {
      res = await supabase.from("social_settings").update(payload as any).eq("id", settings.id);
    } else {
      res = await supabase.from("social_settings").insert(payload);
    }
    if (res.error) toast.error(res.error.message);
    else {
      toast.success("Instellingen bewaard");
      setToken("");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const toggleSource = (key: string) =>
    setSettings((s) => ({ ...s, sources_enabled: { ...s.sources_enabled, [key]: !s.sources_enabled[key] } }));

  return (
    <AdminLayout>
      <Helmet>
        <title>Social instellingen | Admin | Bureau Vlieland</title>
      </Helmet>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/admin/social">
              <ArrowLeft className="h-4 w-4 mr-1" /> Terug
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Social media instellingen</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ritme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Posts per week</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={settings.cadence_per_week}
                  onChange={(e) => setSettings((s) => ({ ...s, cadence_per_week: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label className="text-xs">Standaard tijdstip</Label>
                <Input
                  type="time"
                  value={settings.posting_time}
                  onChange={(e) => setSettings((s) => ({ ...s, posting_time: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Posting dagen (komma-gescheiden, bv. ma,wo,vr)</Label>
              <Input
                value={settings.posting_days.join(",")}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, posting_days: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bronnen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { key: "building_blocks", label: "Nieuwe bouwstenen" },
              { key: "partners", label: "Nieuwe / bijgewerkte partners" },
              { key: "assets", label: "Projectfoto's (mediabank)" },
              { key: "partner_spotlight", label: "Partner in spotlight (rotatie)" },
            ].map((row) => (
              <label key={row.key} className="flex items-center justify-between border-b py-2 last:border-b-0">
                <span className="text-sm">{row.label}</span>
                <Switch checked={!!settings.sources_enabled[row.key]} onCheckedChange={() => toggleSource(row.key)} />
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Toon & hashtags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Tone-of-voice</Label>
              <Textarea
                rows={3}
                value={settings.tone_of_voice}
                onChange={(e) => setSettings((s) => ({ ...s, tone_of_voice: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Standaard hashtags (spatie-gescheiden)</Label>
              <Input
                value={(settings.hashtag_sets.default ?? []).join(" ")}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    hashtag_sets: { ...s.hashtag_sets, default: e.target.value.split(/\s+/).filter(Boolean) },
                  }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Standaard CTA-link</Label>
              <Input
                value={settings.default_ctas.default ?? ""}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, default_ctas: { ...s.default_ctas, default: e.target.value } }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Meta-koppeling
              {settings.publishing_enabled ? (
                <Badge variant="default">live</Badge>
              ) : (
                <Badge variant="secondary">conceptmodus</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              Klik op "Verbind met Meta" om in te loggen met je Facebook-account. We koppelen automatisch de juiste
              Facebook Page en het bijbehorende Instagram Business-account, en wisselen het token in voor een
              long-lived Page Token. Tot dat moment blijft alles in conceptmodus.
            </p>

            {settings.meta_page_id ? (
              <div className="rounded-md border bg-slate-50 p-3 text-sm space-y-1">
                <div><span className="text-slate-500">Facebook Page:</span> {settings.meta_page_id}</div>
                {settings.meta_ig_user_id && (
                  <div><span className="text-slate-500">Instagram:</span> {settings.meta_ig_user_id}</div>
                )}
                {settings.meta_connected_at && (
                  <div className="text-xs text-slate-500">
                    Gekoppeld op {new Date(settings.meta_connected_at).toLocaleDateString("nl-NL")}
                  </div>
                )}
                {settings.meta_token_expires_at && (
                  <div className="text-xs text-slate-500">
                    Token-anker verloopt: {new Date(settings.meta_token_expires_at).toLocaleDateString("nl-NL")}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-3 text-xs text-slate-500">
                Nog geen Meta-account gekoppeld.
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const { data, error } = await supabase.functions.invoke("social-meta-oauth-start", {
                    body: { return_url: `${window.location.origin}/admin/social/instellingen` },
                  });
                  if (error || !data?.url) {
                    toast.error(error?.message || "Kon Meta-login niet starten");
                    return;
                  }
                  window.location.href = data.url;
                }}
              >
                <Link2 className="h-4 w-4 mr-2" />
                {settings.meta_page_id ? "Opnieuw koppelen" : "Verbind met Meta"}
              </Button>
              {settings.meta_page_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const { data, error } = await supabase.functions.invoke("social-refresh-token");
                    if (error) { toast.error(error.message); return; }
                    if (!data?.ok) { toast.error(`Token ongeldig: ${data?.reason || "onbekend"}`); return; }
                    toast.success("Token gecheckt — actief");
                  }}
                >
                  Token testen
                </Button>
              )}
            </div>

            <label className="flex items-center justify-between border-t pt-3">
              <span className="text-sm font-medium">Publicatie naar Meta ingeschakeld</span>
              <Switch
                checked={settings.publishing_enabled}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, publishing_enabled: v }))}
              />
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Bewaren
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
