import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { LocationEditDialog, type LocationEntity } from "@/components/admin/LocationEditDialog";
import { MapPin, Search, Link2 } from "lucide-react";
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

  // Bulk-state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPartnerId, setBulkPartnerId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

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

  // Reset selectie als je van tab wisselt
  useEffect(() => { setSelected(new Set()); }, [tab]);

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

  // Bulk-selectie helpers
  const toggleRow = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };
  const allVisibleChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleAll = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((r) => { checked ? next.add(r.id) : next.delete(r.id); });
      return next;
    });
  };

  const partnerOptions = rows.partner.filter((p) => p.lat != null && p.lng != null);
  const chosenPartner = partnerOptions.find((p) => p.id === bulkPartnerId) || null;

  const applyBulk = async () => {
    if (!chosenPartner || tab !== "building_block") return;
    setBulkSaving(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase
        .from("building_blocks")
        .update({
          location_lat: chosenPartner.lat,
          location_lng: chosenPartner.lng,
          location_address: chosenPartner.address || null,
        })
        .in("id", ids);
      if (error) throw error;

      setRows((prev) => ({
        ...prev,
        building_block: prev.building_block.map((r) =>
          selected.has(r.id)
            ? { ...r, lat: chosenPartner.lat, lng: chosenPartner.lng, address: chosenPartner.address }
            : r
        ),
      }));
      toast({
        title: `${ids.length} bouwsteen${ids.length === 1 ? "" : "en"} gekoppeld`,
        description: `Locatie van ${chosenPartner.name} toegepast.`,
      });
      setSelected(new Set());
      setBulkOpen(false);
      setBulkPartnerId(null);
    } catch (e: any) {
      toast({ title: "Bulk-koppeling mislukt", description: e.message, variant: "destructive" });
    } finally {
      setBulkSaving(false);
    }
  };

  const counts = {
    building_block: rows.building_block.length,
    partner: rows.partner.length,
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Locaties
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Beheer adressen en kaartpinnen voor bouwstenen en partners. Klik op een rij om de pin te plaatsen,
              of selecteer meerdere bouwstenen om ze in één keer aan een partnerlocatie te koppelen.
            </p>
          </div>
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
            <TabsContent key={k} value={k} className="mt-4 space-y-3">
              {k === "building_block" && selected.size > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-4 py-2">
                  <div className="text-sm">
                    <strong>{selected.size}</strong> bouwsteen{selected.size === 1 ? "" : "en"} geselecteerd
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                      Selectie wissen
                    </Button>
                    <Button size="sm" onClick={() => setBulkOpen(true)}>
                      <Link2 className="h-4 w-4 mr-1" /> Koppel aan partnerlocatie
                    </Button>
                  </div>
                </div>
              )}

              <Card>
                {loading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">Niets te tonen.</div>
                ) : (
                  <div className="divide-y">
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground bg-muted/40 items-center">
                      <div className="col-span-1">
                        {k === "building_block" && (
                          <Checkbox
                            checked={allVisibleChecked}
                            onCheckedChange={(c) => toggleAll(!!c)}
                            aria-label="Alles selecteren"
                          />
                        )}
                      </div>
                      <div className="col-span-3">Naam</div>
                      <div className="col-span-2">Categorie</div>
                      <div className="col-span-4">Adres</div>
                      <div className="col-span-2 text-right">Status</div>
                    </div>
                    {filtered.map((row) => (
                      <div
                        key={`${row.kind}-${row.id}`}
                        className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-muted/40 transition-colors items-center"
                      >
                        <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                          {k === "building_block" && (
                            <Checkbox
                              checked={selected.has(row.id)}
                              onCheckedChange={(c) => toggleRow(row.id, !!c)}
                              aria-label={`Selecteer ${row.name}`}
                            />
                          )}
                        </div>
                        <button
                          onClick={() => openEdit(row)}
                          className="col-span-11 grid grid-cols-11 gap-2 text-left items-center"
                        >
                          <div className="col-span-3 font-medium truncate">{row.name}</div>
                          <div className="col-span-2 text-sm text-muted-foreground truncate">{row.category}</div>
                          <div className="col-span-4 text-sm text-muted-foreground truncate">
                            {row.address || <span className="italic">—</span>}
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <StatusBadge row={row} />
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <p className="text-xs text-muted-foreground">
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

        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Bouwstenen aan partnerlocatie koppelen</DialogTitle>
              <DialogDescription>
                Pas de coördinaten en het adres van een partner toe op {selected.size} geselecteerde
                bouwsteen{selected.size === 1 ? "" : "en"}. Bestaande locaties worden overschreven.
              </DialogDescription>
            </DialogHeader>

            <Command>
              <CommandInput placeholder="Zoek partner met locatie…" />
              <CommandList className="max-h-72">
                <CommandEmpty>Geen partner gevonden.</CommandEmpty>
                <CommandGroup>
                  {partnerOptions.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`${p.name} ${p.address}`}
                      onSelect={() => setBulkPartnerId(p.id)}
                      className={bulkPartnerId === p.id ? "bg-accent" : ""}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{p.name}</span>
                        {p.address && <span className="text-xs text-muted-foreground">{p.address}</span>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>

            {chosenPartner && (
              <div className="text-sm rounded-md bg-muted/40 p-3">
                <div className="font-medium">{chosenPartner.name}</div>
                <div className="text-muted-foreground">{chosenPartner.address || "—"}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {chosenPartner.lat?.toFixed(5)}, {chosenPartner.lng?.toFixed(5)}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => setBulkOpen(false)} disabled={bulkSaving}>
                Annuleer
              </Button>
              <Button onClick={applyBulk} disabled={!chosenPartner || bulkSaving}>
                {bulkSaving ? "Bezig…" : `Koppel ${selected.size} bouwsteen${selected.size === 1 ? "" : "en"}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
