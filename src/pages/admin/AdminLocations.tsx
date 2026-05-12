import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationEditDialog, type LocationEntity } from "@/components/admin/LocationEditDialog";
import { MapPin, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type EntityKind = "building_block" | "partner";

interface LocationRow extends LocationEntity {
  kind: EntityKind;
  category?: string | null;
}

const statusOf = (r: LocationRow) => {
  if (r.lat != null && r.lng != null) return "ok" as const;
  if (r.address && r.address.trim()) return "address" as const;
  return "none" as const;
};

const StatusBadge = ({ row }: { row: LocationRow }) => {
  const s = statusOf(row);
  if (s === "ok") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Pin OK</Badge>;
  if (s === "address") return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Alleen adres</Badge>;
  return <Badge variant="destructive">Geen locatie</Badge>;
};

export default function AdminLocations() {
  const { toast } = useToast();
  const [tab, setTab] = useState<EntityKind>("building_block");
  const [rows, setRows] = useState<Record<EntityKind, LocationRow[]>>({
    building_block: [],
    partner: [],
  });
  const [loading, setLoading] = useState(true);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [blocksRes, partnersRes] = await Promise.all([
        supabase
          .from("building_blocks")
          .select("id, name, category, location_lat, location_lng, location_address")
          .order("name"),
        supabase
          .from("partners")
          .select("id, name, address_street, address_postal, address_city, location_lat, location_lng")
          .order("name"),
      ]);

      const blocks: LocationRow[] = (blocksRes.data ?? []).map((b: any) => ({
        kind: "building_block",
        id: b.id,
        name: b.name,
        category: b.category,
        subtitle: b.category,
        lat: b.location_lat,
        lng: b.location_lng,
        address: b.location_address ?? "",
      }));

      const partners: LocationRow[] = (partnersRes.data ?? []).map((p: any) => ({
        kind: "partner",
        id: p.id,
        name: p.name,
        category: "Partner",
        subtitle: "Partner",
        lat: p.location_lat,
        lng: p.location_lng,
        address: [p.address_street, [p.address_postal, p.address_city].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(", "),
      }));

      setRows({ building_block: blocks, partner: partners });
    } catch (e: any) {
      toast({ title: "Laden mislukt", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => {
    let list = rows[tab];
    if (onlyMissing) list = list.filter((r) => r.lat == null || r.lng == null);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((r) =>
      r.name.toLowerCase().includes(q) || (r.address || "").toLowerCase().includes(q)
    );
    return list;
  }, [rows, tab, onlyMissing, search]);

  const editingIndex = editing ? filtered.findIndex((r) => r.id === editing.id) : -1;

  const openEdit = (row: LocationRow) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const goRelative = (delta: number) => {
    if (editingIndex < 0) return;
    const next = filtered[editingIndex + delta];
    if (next) setEditing(next);
  };

  const handleSave = async (e: LocationEntity) => {
    if (!editing) return;
    const kind = editing.kind;
    const res = kind === "building_block"
      ? await supabase.from("building_blocks").update({
          location_lat: e.lat,
          location_lng: e.lng,
          location_address: e.address || null,
        }).eq("id", e.id)
      : await supabase.from("partners").update({
          location_lat: e.lat,
          location_lng: e.lng,
        }).eq("id", e.id);

    if (res.error) {
      toast({ title: "Opslaan mislukt", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Locatie opgeslagen", description: e.name });
    setRows((prev) => ({
      ...prev,
      [kind]: prev[kind].map((r) => (r.id === e.id ? { ...r, lat: e.lat, lng: e.lng, address: e.address } : r)),
    }));
    setEditing((prev) => (prev ? { ...prev, lat: e.lat, lng: e.lng, address: e.address } : prev));
  };

  const counts = {
    building_block: rows.building_block.length,
    partner: rows.partner.length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" /> Locaties
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Beheer adressen en kaartpinnen voor bouwstenen en partners. Klik op een rij om de pin te plaatsen.
        </p>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam of adres…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="onlyMissing" checked={onlyMissing} onCheckedChange={setOnlyMissing} />
          <Label htmlFor="onlyMissing" className="text-sm cursor-pointer">Alleen zonder coördinaten</Label>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as EntityKind)}>
        <TabsList>
          <TabsTrigger value="building_block">Bouwstenen ({counts.building_block})</TabsTrigger>
          <TabsTrigger value="partner">Partners ({counts.partner})</TabsTrigger>
        </TabsList>

        {(["building_block", "partner"] as EntityKind[]).map((k) => (
          <TabsContent key={k} value={k} className="mt-4">
            <Card>
              {loading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Niets te tonen.</div>
              ) : (
                <div className="divide-y">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground bg-muted/40">
                    <div className="col-span-4">Naam</div>
                    <div className="col-span-2">Categorie</div>
                    <div className="col-span-4">Adres</div>
                    <div className="col-span-2 text-right">Status</div>
                  </div>
                  {filtered.map((row) => (
                    <button
                      key={`${row.kind}-${row.id}`}
                      onClick={() => openEdit(row)}
                      className="w-full grid grid-cols-12 gap-2 px-4 py-3 text-left hover:bg-muted/40 transition-colors items-center"
                    >
                      <div className="col-span-4 font-medium truncate">{row.name}</div>
                      <div className="col-span-2 text-sm text-muted-foreground truncate">{row.category}</div>
                      <div className="col-span-4 text-sm text-muted-foreground truncate">
                        {row.address || <span className="italic">—</span>}
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <StatusBadge row={row} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
            <p className="text-xs text-muted-foreground mt-2">
              {filtered.length} van {rows[k].length} weergegeven
            </p>
          </TabsContent>
        ))}
      </Tabs>

      <LocationEditDialog
        open={dialogOpen}
        entity={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onPrev={() => goRelative(-1)}
        onNext={() => goRelative(1)}
        hasPrev={editingIndex > 0}
        hasNext={editingIndex >= 0 && editingIndex < filtered.length - 1}
      />
    </div>
  );
}
