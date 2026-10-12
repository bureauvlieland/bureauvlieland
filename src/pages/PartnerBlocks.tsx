import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPage } from "@/components/partner-portal/PartnerPage";
import { Button } from "@/components/ui/button";
import { EmptyState, Pill } from "@/components/system";
import { Clock, Euro, Package, Plus, Users } from "lucide-react";
import { PartnerBlockSheet, type PrefillFromMap } from "@/components/partner-portal/PartnerBlockSheet";
import { MapOfferOverview } from "@/components/partner-portal/MapOfferOverview";
import type { MapActivityType } from "@/hooks/useMapActivities";
import { usePartnerPortal } from "@/hooks/usePartnerPortal";
import type { PartnerBuildingBlock } from "@/types/partner";
import { calculateBlockCompleteness } from "@/lib/partnerCompleteness";
import { PARTNER_BLOCK_GROUPS, partnerBlockStatus } from "@/lib/partnerBlockStatus";
import { reportError } from "@/lib/errorReporting";
import { formatEuro } from "@/lib/formatEuro";
import { cn } from "@/lib/utils";

/**
 * Aanbod (partnerportaal fase 4): wat de partner aanbiedt, in drie groepen
 * op één woordenlijst (`partnerBlockStatus`), elke rij met één `Pill`, en
 * daaronder het aanbod in MijnActiviteitenplanner. "Aanbod" is het woord
 * voor wat de partner aanbiedt; "activiteit" voor wat de klant boekt.
 */
const BLOCK_SELECT = `
  id, name, description, short_description, category, block_type,
  duration, price_adult, price_adult_note, price_type,
  price_child, price_child_note, price_child_min_age, price_child_max_age,
  price_pet, price_pet_note,
  min_people, max_people, is_published, is_active, status,
  image_url, image_asset, is_from_price, price_includes_vat, vat_rate,
  seasonal_notes, tags, location_lat, location_lng, location_address,
  external_url, price_display_override, sort_order, map_activity_type_id,
  price_extras
`;

const formatBlockPrice = (block: PartnerBuildingBlock) => {
  if (block.price_type === "tiered_total") {
    const extras = (block.price_extras ?? {}) as Record<string, unknown>;
    const tiers = (Array.isArray(extras.tiers) ? extras.tiers : []) as Array<{ price?: number }>;
    const prices = tiers.map((t) => Number(t?.price)).filter((p) => Number.isFinite(p));
    if (prices.length === 0) return "Prijs op aanvraag";
    return `vanaf ${formatEuro(Math.min(...prices))} (staffel)`;
  }
  if (!block.price_adult) return "Prijs op aanvraag";
  const price = formatEuro(block.price_adult);
  switch (block.price_type) {
    case "per_person":
      return `${price} p.p.`;
    case "per_person_per_day":
      return `${price} p.p.p.d.`;
    case "total":
      return `${price} totaal`;
    default:
      return price;
  }
};

const peopleLabel = (block: PartnerBuildingBlock) => {
  if (block.min_people && block.max_people) return `${block.min_people} tot ${block.max_people} personen`;
  if (block.min_people) return `vanaf ${block.min_people} personen`;
  if (block.max_people) return `tot ${block.max_people} personen`;
  return null;
};

const BlockRow = ({ block, onEdit }: { block: PartnerBuildingBlock; onEdit: (block: PartnerBuildingBlock) => void }) => {
  const status = partnerBlockStatus(block.status);
  const isFromMap = typeof block.map_activity_type_id === "number";
  const completeness = calculateBlockCompleteness(block as never);
  const needsImprovement = completeness.score < 70 && status.key !== "concept";
  const people = peopleLabel(block);

  return (
    <li>
      <button
        type="button"
        onClick={() => onEdit(block)}
        className={cn(
          "flex w-full flex-col gap-3 rounded-lg border bg-card p-3 text-left transition-colors duration-fast hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-row sm:items-center",
          status.tone === "warning" && "border-warning/40",
        )}
      >
        <img src={block.image_url || "/placeholder.svg"} alt="" className="h-14 w-20 shrink-0 rounded-md bg-muted object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-medium">{block.name}</span>
            {isFromMap && (
              <Pill tone="brand" size="sm" title="Gekoppeld aan MijnActiviteitenplanner">
                MAP
              </Pill>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Euro className="h-3 w-3" aria-hidden="true" />
              {formatBlockPrice(block)}
            </span>
            {block.duration && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {block.duration}
              </span>
            )}
            {people && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden="true" />
                {people}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end">
          {needsImprovement && (
            <Pill tone="warning" size="sm" title={`${completeness.score}% compleet: ${completeness.missing.join(", ")}`}>
              Kan beter ({completeness.score}%)
            </Pill>
          )}
          <Pill tone={status.tone} title={status.hint}>
            {status.label}
          </Pill>
        </div>
      </button>
    </li>
  );
};

const PartnerBlocksContent = () => {
  const { partner, isDemo } = usePartnerPortal();
  const partnerId = partner.id;
  const mapTenantSlug = partner.map_tenant_slug ?? null;
  const [blocks, setBlocks] = useState<PartnerBuildingBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<PartnerBuildingBlock | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [isNewBlock, setIsNewBlock] = useState(false);
  const [prefillFromMap, setPrefillFromMap] = useState<PrefillFromMap | null>(null);

  const fetchBlocks = useCallback(async () => {
    if (isDemo) {
      setBlocks([]);
      setIsLoading(false);
      return;
    }
    const { data, error: blocksError } = await supabase.from("building_blocks").select(BLOCK_SELECT).eq("provider_id", partnerId).order("name");
    if (blocksError) {
      reportError(blocksError, { where: "PartnerBlocks: Error fetching blocks" });
      setError("Kon uw aanbod niet laden.");
    } else {
      setBlocks((data || []) as PartnerBuildingBlock[]);
    }
    setIsLoading(false);
  }, [partnerId, isDemo]);

  useEffect(() => {
    void fetchBlocks();
  }, [fetchBlocks]);

  const openSheet = (block: PartnerBuildingBlock | null, prefill: PrefillFromMap | null = null) => {
    setSelectedBlock(block);
    setIsNewBlock(block === null);
    setPrefillFromMap(prefill);
    setShowSheet(true);
  };

  const handleEnrichFromMap = (type: MapActivityType) =>
    openSheet(null, {
      map_activity_type_id: type.Id,
      name: type.Name,
      description: type.Description ?? null,
      duration_hours: type.Duration,
      price_per_person: null,
      max_persons: null,
      external_url: mapTenantSlug ? `https://boeking.mijnactiviteitenplanner.nl/${mapTenantSlug}` : null,
      image_ref: type.Image,
    });

  const handleSheetClose = () => {
    setShowSheet(false);
    setSelectedBlock(null);
    setIsNewBlock(false);
    setPrefillFromMap(null);
  };

  const handleBlockSaved = async () => {
    await fetchBlocks();
    handleSheetClose();
  };

  const groups = PARTNER_BLOCK_GROUPS.map((key) => ({ status: partnerBlockStatus(key), blocks: blocks.filter((b) => partnerBlockStatus(b.status).key === key) })).filter((g) => g.blocks.length > 0);

  return (
    <PartnerPage
      title="Aanbod"
      icon={<Package />}
      description="Wat u aanbiedt, zoals Bureau Vlieland het in programma's zet: naam, prijs, duur en foto."
      actions={
        <Button onClick={() => openSheet(null)} disabled={isDemo}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nieuwe activiteit
        </Button>
      }
      loading={isLoading}
      error={error}
    >
      {blocks.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title="Nog geen aanbod"
          description="Stel uw eerste activiteit voor; Bureau Vlieland beoordeelt hem en zet hem in de programma's."
          action={
            <Button onClick={() => openSheet(null)} disabled={isDemo}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Eerste activiteit toevoegen
            </Button>
          }
        />
      ) : (
        groups.map((group) => (
          <section key={group.status.key} aria-labelledby={`aanbod-${group.status.key}`} className="space-y-3">
            <div>
              <h2 id={`aanbod-${group.status.key}`} className="flex items-center gap-2 font-display text-xl font-medium">
                {group.status.label}
                <Pill tone={group.status.tone}>{group.blocks.length}</Pill>
              </h2>
              <p className="text-sm text-muted-foreground">{group.status.hint}</p>
            </div>
            <ul className="space-y-2">
              {group.blocks.map((block) => (
                <BlockRow key={block.id} block={block} onEdit={(b) => openSheet(b)} />
              ))}
            </ul>
          </section>
        ))
      )}

      {mapTenantSlug && !isDemo && (
        <MapOfferOverview tenantSlug={mapTenantSlug} partnerId={partnerId} onOffer={handleEnrichFromMap} refreshKey={blocks.map((b) => `${b.id}:${b.map_activity_type_id ?? ""}`).join(",")} />
      )}

      <PartnerBlockSheet isOpen={showSheet} onClose={handleSheetClose} block={selectedBlock} isNew={isNewBlock} partnerId={partnerId} onSaved={handleBlockSaved} prefillFromMap={prefillFromMap} mapTenantSlug={mapTenantSlug} />
    </PartnerPage>
  );
};

const PartnerBlocks = () => (
  <PartnerLayout>
    <PartnerBlocksContent />
  </PartnerLayout>
);

export { PartnerBlocksContent };

export default PartnerBlocks;
