import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings as SettingsIcon, Loader2, ExternalLink, Upload, Trash2, Sparkles, Calendar, CheckCircle2, XCircle } from "lucide-react";

type SocialPost = {
  id: string;
  status: string;
  caption: string | null;
  hashtags: string[] | null;
  media_urls: string[] | null;
  channels: string[] | null;
  scheduled_for: string | null;
  published_at: string | null;
  source_type: string | null;
  source_summary: string | null;
  permalinks: Record<string, string> | null;
  error_message: string | null;
  created_at: string;
};

type SocialAsset = {
  id: string;
  storage_path: string;
  title: string | null;
  note: string | null;
  anonymize_customer: boolean;
  last_used_at: string | null;
  created_at: string;
};

export default function AdminSocial() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [assets, setAssets] = useState<SocialAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [postsRes, assetsRes] = await Promise.all([
      supabase.from("social_posts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("social_media_assets").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setPosts((postsRes.data as SocialPost[]) ?? []);
    setAssets((assetsRes.data as SocialAsset[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const generateDrafts = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-generate-drafts");
      if (error) throw error;
      toast.success(`${data?.generated ?? 0} concept(en) gegenereerd`);
      await load();
    } catch (e) {
      toast.error(`Fout bij genereren: ${String(e)}`);
    }
    setGenerating(false);
  };

  const draftPosts = posts.filter((p) => p.status === "draft");
  const scheduledPosts = posts.filter((p) => p.status === "scheduled");
  const publishedPosts = posts.filter((p) => p.status === "published" || p.status === "failed");

  return (
    <AdminLayout>
      <Helmet>
        <title>Social media | Admin | Bureau Vlieland</title>
      </Helmet>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Social media planner</h1>
            <p className="text-sm text-slate-600 mt-1">
              Concept-posts op basis van bouwstenen, partners en projectfoto's. Altijd handmatig goedkeuren.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={generateDrafts} disabled={generating} variant="default">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Genereer concepten
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/social/instellingen">
                <SettingsIcon className="h-4 w-4 mr-2" />
                Instellingen
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="wachtrij">
          <TabsList>
            <TabsTrigger value="wachtrij">
              Wachtrij <Badge variant="secondary" className="ml-2">{draftPosts.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="gepland">
              Gepland <Badge variant="secondary" className="ml-2">{scheduledPosts.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="geplaatst">
              Geplaatst <Badge variant="secondary" className="ml-2">{publishedPosts.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="mediabank">
              Mediabank <Badge variant="secondary" className="ml-2">{assets.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wachtrij" className="space-y-4 mt-4">
            {loading ? (
              <p className="text-slate-500">Laden…</p>
            ) : draftPosts.length === 0 ? (
              <EmptyState message="Geen concepten. Klik 'Genereer concepten' om te starten." />
            ) : (
              draftPosts.map((p) => <DraftCard key={p.id} post={p} onChange={load} />)
            )}
          </TabsContent>

          <TabsContent value="gepland" className="space-y-4 mt-4">
            {scheduledPosts.length === 0 ? (
              <EmptyState message="Niets ingepland." />
            ) : (
              scheduledPosts.map((p) => <ScheduledCard key={p.id} post={p} onChange={load} />)
            )}
          </TabsContent>

          <TabsContent value="geplaatst" className="space-y-4 mt-4">
            {publishedPosts.length === 0 ? (
              <EmptyState message="Nog niets gepubliceerd." />
            ) : (
              publishedPosts.map((p) => <PublishedCard key={p.id} post={p} />)
            )}
          </TabsContent>

          <TabsContent value="mediabank" className="space-y-4 mt-4">
            <MediabankPanel assets={assets} onChange={load} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-slate-500">{message}</CardContent>
    </Card>
  );
}

function DraftCard({ post, onChange }: { post: SocialPost; onChange: () => void }) {
  const [caption, setCaption] = useState(post.caption ?? "");
  const [hashtags, setHashtags] = useState((post.hashtags ?? []).join(" "));
  const [scheduledFor, setScheduledFor] = useState(defaultScheduleDatetime());
  const [channels, setChannels] = useState<string[]>(post.channels ?? ["instagram", "facebook"]);
  const [busy, setBusy] = useState(false);

  const toggle = (ch: string) =>
    setChannels((c) => (c.includes(ch) ? c.filter((x) => x !== ch) : [...c, ch]));

  const approve = async (publishNow = false) => {
    setBusy(true);
    const updates: Record<string, unknown> = {
      caption,
      hashtags: hashtags.split(/\s+/).filter(Boolean),
      channels,
      status: publishNow ? "scheduled" : "scheduled",
      scheduled_for: publishNow ? new Date().toISOString() : new Date(scheduledFor).toISOString(),
      approved_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("social_posts").update(updates).eq("id", post.id);
    if (error) toast.error(error.message);
    else toast.success(publishNow ? "Direct ingepland voor publicatie" : "Goedgekeurd & ingepland");
    setBusy(false);
    onChange();
  };

  const reject = async () => {
    setBusy(true);
    await supabase.from("social_posts").update({ status: "rejected" }).eq("id", post.id);
    toast.success("Verworpen");
    setBusy(false);
    onChange();
  };

  const image = post.media_urls?.[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">
            {post.source_type ?? "post"} — concept
          </CardTitle>
          <Badge variant="outline">{new Date(post.created_at).toLocaleDateString("nl-NL")}</Badge>
        </div>
        {post.source_summary && (
          <p className="text-xs text-slate-500 line-clamp-2">{post.source_summary}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4">
          <div>
            {image ? (
              <img src={image} alt="" className="w-40 h-40 object-cover rounded-md border" />
            ) : (
              <div className="w-40 h-40 bg-slate-100 rounded-md flex items-center justify-center text-xs text-slate-400 border">
                geen beeld
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Caption</Label>
              <Textarea rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Hashtags (spatie-gescheiden)</Label>
              <Input value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
          <div className="flex gap-2">
            {["instagram", "facebook"].map((ch) => (
              <Button
                key={ch}
                type="button"
                size="sm"
                variant={channels.includes(ch) ? "default" : "outline"}
                onClick={() => toggle(ch)}
              >
                {ch}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Plannen op</Label>
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <Button onClick={reject} variant="ghost" size="sm" disabled={busy}>
              <XCircle className="h-4 w-4 mr-1" /> Verwerp
            </Button>
            <Button onClick={() => approve(false)} variant="default" size="sm" disabled={busy}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Goedkeuren & inplannen
            </Button>
            <Button onClick={() => approve(true)} variant="secondary" size="sm" disabled={busy}>
              Nu publiceren
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduledCard({ post, onChange }: { post: SocialPost; onChange: () => void }) {
  const withdraw = async () => {
    await supabase.from("social_posts").update({ status: "draft", scheduled_for: null }).eq("id", post.id);
    toast.success("Teruggezet als concept");
    onChange();
  };
  return (
    <Card>
      <CardContent className="py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {post.media_urls?.[0] && (
            <img src={post.media_urls[0]} alt="" className="w-16 h-16 object-cover rounded" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium line-clamp-1">{post.caption}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {post.scheduled_for ? new Date(post.scheduled_for).toLocaleString("nl-NL") : "—"}
              {" · "}
              {(post.channels ?? []).join(", ")}
            </p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={withdraw}>
          Terug naar concept
        </Button>
      </CardContent>
    </Card>
  );
}

function PublishedCard({ post }: { post: SocialPost }) {
  const failed = post.status === "failed";
  return (
    <Card className={failed ? "border-destructive" : undefined}>
      <CardContent className="py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {post.media_urls?.[0] && (
            <img src={post.media_urls[0]} alt="" className="w-16 h-16 object-cover rounded" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium line-clamp-1">{post.caption}</p>
            {failed ? (
              <p className="text-xs text-destructive line-clamp-1">{post.error_message}</p>
            ) : (
              <p className="text-xs text-slate-500">
                {post.published_at ? new Date(post.published_at).toLocaleString("nl-NL") : "—"}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {post.permalinks &&
            Object.entries(post.permalinks).map(([ch, url]) => (
              <Button key={ch} asChild size="sm" variant="outline">
                <a href={url} target="_blank" rel="noreferrer">
                  {ch} <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            ))}
          {failed && <Badge variant="destructive">mislukt</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

function MediabankPanel({ assets, onChange }: { assets: SocialAsset[]; onChange: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [anonymize, setAnonymize] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("social-media").upload(path, file);
      if (upErr) throw upErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("social_media_assets").insert({
        storage_path: path,
        title,
        note,
        anonymize_customer: anonymize,
        uploaded_by: user?.id,
      });
      if (insErr) throw insErr;
      toast.success("Foto toegevoegd");
      setTitle("");
      setNote("");
      setFile(null);
      onChange();
    } catch (e) {
      toast.error(String(e));
    }
    setUploading(false);
  };

  const remove = async (a: SocialAsset) => {
    await supabase.storage.from("social-media").remove([a.storage_path]);
    await supabase.from("social_media_assets").delete().eq("id", a.id);
    toast.success("Verwijderd");
    onChange();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto toevoegen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Titel</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bv. Familieweekend mei" />
            </div>
            <div>
              <Label className="text-xs">Korte notitie / verhaal</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bv. Strandwandeling bij Posthuys" />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)} />
              Klantnaam afschermen
            </label>
            <Button onClick={upload} disabled={!file || uploading} size="sm">
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {assets.map((a) => {
          const { data } = supabase.storage.from("social-media").getPublicUrl(a.storage_path);
          return (
            <Card key={a.id} className="overflow-hidden">
              <img src={data.publicUrl} alt={a.title ?? ""} className="w-full aspect-square object-cover" />
              <div className="p-3 space-y-1">
                <p className="text-sm font-medium line-clamp-1">{a.title ?? "Zonder titel"}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{a.note ?? ""}</p>
                <div className="flex items-center justify-between pt-1">
                  {a.last_used_at ? (
                    <Badge variant="outline" className="text-[10px]">gebruikt</Badge>
                  ) : (
                    <Badge className="text-[10px]">nieuw</Badge>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove(a)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function defaultScheduleDatetime() {
  // Default: morgen 10:00
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
