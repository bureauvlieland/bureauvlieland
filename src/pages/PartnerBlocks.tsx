import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Package,
  Plus,
  Edit,
  Users,
  Clock,
  Euro,
  CheckCircle,
  FileEdit,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PartnerBlockSheet, type PrefillFromMap } from "@/components/partner-portal/PartnerBlockSheet";
import { MapTypeCard } from "@/components/partner-portal/MapTypeCard";
import { useMapActivityTypes, type MapActivityType } from "@/hooks/useMapActivities";
import type { PartnerBuildingBlock } from "@/types/partner";

const PartnerBlocksContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [blocks, setBlocks] = useState<PartnerBuildingBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [mapTenantSlug, setMapTenantSlug] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<PartnerBuildingBlock | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [isNewBlock, setIsNewBlock] = useState(false);
  const [prefillFromMap, setPrefillFromMap] = useState<PrefillFromMap | null>(null);

  const BLOCK_SELECT = `
    id, name, description, short_description, category, block_type,
    duration, price_adult, price_adult_note, price_type,
    price_child, price_child_note, price_child_min_age, price_child_max_age,
    price_pet, price_pet_note,
    min_people, max_people, is_published, is_active, status,
    image_url, image_asset, is_from_price, price_includes_vat, vat_rate,
    seasonal_notes, tags, location_lat, location_lng, location_address,
    external_url, price_display_override, sort_order, map_activity_type_id
  `;

  useEffect(() => {
    const fetchBlocks = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/partner/login");
        return;
      }

      const impersonatePartnerId = searchParams.get("impersonate");
      let currentPartnerId: string | null = null;

      if (impersonatePartnerId) {
        const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
        if (isAdmin) currentPartnerId = impersonatePartnerId;
      }

      if (!currentPartnerId) {
        const { data: partner, error: partnerError } = await supabase
          .from("partners")
          .select("id, map_tenant_slug")
          .eq("auth_user_id", session.user.id)
          .eq("is_active", true)
          .single();

        if (partnerError || !partner) {
          setError("Uw account is niet gekoppeld aan een partner.");
          setIsLoading(false);
          return;
        }

        currentPartnerId = partner.id;
        setMapTenantSlug(partner.map_tenant_slug);
      } else {
        const { data: partner } = await supabase
          .from("partners")
          .select("map_tenant_slug")
          .eq("id", currentPartnerId)
          .maybeSingle();
        setMapTenantSlug(partner?.map_tenant_slug ?? null);
      }

      setPartnerId(currentPartnerId);

      const { data: blocksData, error: blocksError } = await supabase
        .from("building_blocks")
        .select(BLOCK_SELECT)
        .eq("provider_id", currentPartnerId)
        .order("name");

      if (blocksError) {
        console.error("Error fetching blocks:", blocksError);
        setError("Kon uw aanbod niet laden.");
        setIsLoading(false);
        return;
      }

      setBlocks((blocksData || []) as PartnerBuildingBlock[]);
      setIsLoading(false);
    };

    fetchBlocks();
  }, [navigate, searchParams]);

  const { data: mapTypes = [] } = useMapActivityTypes(
    mapTenantSlug,
    !!mapTenantSlug && !!partnerId,
    partnerId ?? undefined,
  );

  const linkedTypeIds = new Set(
    blocks
      .map((b) => b.map_activity_type_id)
      .filter((v): v is number => typeof v === "number"),
  );
  const availableMapTypes = (mapTypes as MapActivityType[]).filter(
    (t) => !linkedTypeIds.has(t.Id),
  );

  const handleEditBlock = (block: PartnerBuildingBlock) => {
    setSelectedBlock(block);
    setIsNewBlock(false);
    setPrefillFromMap(null);
    setShowSheet(true);
  };

  const handleNewBlock = () => {
    setSelectedBlock(null);
    setIsNewBlock(true);
    setPrefillFromMap(null);
    setShowSheet(true);
  };

  const handleEnrichFromMap = (type: MapActivityType) => {
    setSelectedBlock(null);
    setIsNewBlock(true);
    setPrefillFromMap({
      map_activity_type_id: type.Id,
      name: type.Name,
      description: type.Description ?? null,
      duration_hours: type.Duration,
      price_per_person: null,
      max_persons: null,
      external_url: mapTenantSlug
        ? `https://boeking.mijnactiviteitenplanner.nl/${mapTenantSlug}`
        : null,
      image_ref: type.Image,
    });
    setShowSheet(true);
  };

  const handleSheetClose = () => {
    setShowSheet(false);
    setSelectedBlock(null);
    setIsNewBlock(false);
    setPrefillFromMap(null);
  };

  const handleBlockSaved = async () => {
    if (!partnerId) return;

    const { data: blocksData } = await supabase
      .from("building_blocks")
      .select(BLOCK_SELECT)
      .eq("provider_id", partnerId)
      .order("name");

    setBlocks((blocksData || []) as PartnerBuildingBlock[]);
    handleSheetClose();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center py-16">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Fout</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const publishedBlocks = blocks.filter(b => b.status === "published");
  const activeBlocks = blocks.filter(b => b.status === "active");
  const conceptBlocks = blocks.filter(b => b.status === "concept");

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Mijn Aanbod</h1>
          <p className="text-muted-foreground">Beheer uw activiteiten en diensten</p>
        </div>
        <Button onClick={handleNewBlock}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuw voorstel
        </Button>
      </div>

      <div className="space-y-8">
        {blocks.length === 0 && availableMapTypes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-medium mb-2">Nog geen aanbod</h2>
              <p className="text-muted-foreground mb-4">
                U hebt nog geen activiteiten of diensten toegevoegd.
              </p>
              <Button onClick={handleNewBlock}>
                <Plus className="h-4 w-4 mr-2" />
                Eerste activiteit toevoegen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {publishedBlocks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Gepubliceerd ({publishedBlocks.length})
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publishedBlocks.map((block) => (
                    <BlockCard key={block.id} block={block} onEdit={handleEditBlock} />
                  ))}
                </div>
              </div>
            )}

            {activeBlocks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  Goedgekeurd ({activeBlocks.length})
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Deze activiteiten zijn goedgekeurd en beschikbaar voor maatwerk-offertes, maar nog niet publiek zichtbaar.
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeBlocks.map((block) => (
                    <BlockCard key={block.id} block={block} onEdit={handleEditBlock} status="active" />
                  ))}
                </div>
              </div>
            )}

            {conceptBlocks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileEdit className="h-5 w-5 text-amber-600" />
                  Wacht op goedkeuring ({conceptBlocks.length})
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {conceptBlocks.map((block) => (
                    <BlockCard key={block.id} block={block} onEdit={handleEditBlock} status="concept" />
                  ))}
                </div>
              </div>
            )}

            {mapTenantSlug && (
              <div>
                <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Beschikbaar vanuit MAP ({availableMapTypes.length})
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Activiteitentypes uit MijnActiviteitenPlanner. Verrijk en publiceer ze om als bouwsteen op Bureau Vlieland te gebruiken.
                </p>
                {availableMapTypes.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Alle MAP-types zijn al toegevoegd aan uw aanbod.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableMapTypes.map((t) => (
                      <MapTypeCard key={t.Id} type={t} onEnrich={handleEnrichFromMap} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <PartnerBlockSheet
        isOpen={showSheet}
        onClose={handleSheetClose}
        block={selectedBlock}
        isNew={isNewBlock}
        partnerId={partnerId || ""}
        onSaved={handleBlockSaved}
        prefillFromMap={prefillFromMap}
      />
    </div>
  );
};

interface BlockCardProps {
  block: PartnerBuildingBlock;
  onEdit: (block: PartnerBuildingBlock) => void;
  status?: string;
}

const BlockCard = ({ block, onEdit, status }: BlockCardProps) => {
  const isDraft = status === "concept";
  const isActive = status === "active";
  
  const getImageUrl = () => {
    if (block.image_url) return block.image_url;
    return "/placeholder.svg";
  };
  
  const formatPrice = () => {
    if (!block.price_adult) return "Prijs op aanvraag";
    const price = block.price_adult.toLocaleString("nl-NL", { minimumFractionDigits: 2 });
    switch (block.price_type) {
      case "per_person": return `€${price} p.p.`;
      case "per_person_per_day": return `€${price} p.p.p.d.`;
      case "total": return `€${price} totaal`;
      default: return `€${price}`;
    }
  };

  const getBorderClass = () => {
    if (isDraft) return "border-amber-300 dark:border-amber-700";
    if (isActive) return "border-blue-300 dark:border-blue-700";
    return "";
  };

  const isFromMap = typeof block.map_activity_type_id === "number";

  return (
    <Card className={getBorderClass()}>
      <div className="aspect-video relative overflow-hidden rounded-t-lg">
        <img src={getImageUrl()} alt={block.name} className="w-full h-full object-cover" />
        {isFromMap && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-accent text-accent-foreground gap-1">
              <Sparkles className="h-3 w-3" />
              Synchroon met MAP
            </Badge>
          </div>
        )}
        <div className="absolute top-2 right-2">
          {isDraft && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              Wacht op goedkeuring
            </Badge>
          )}
          {isActive && (
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              Goedgekeurd
            </Badge>
          )}
          {!isDraft && !isActive && (
            <Badge className="bg-green-600">Gepubliceerd</Badge>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-1">{block.name}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {block.short_description || block.description || "Geen beschrijving"}
        </p>
        
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Euro className="h-3 w-3" />
            {formatPrice()}
          </span>
          {block.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {block.duration}
            </span>
          )}
          {(block.min_people || block.max_people) && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {block.min_people && block.max_people
                ? `${block.min_people}-${block.max_people}`
                : block.min_people
                ? `min. ${block.min_people}`
                : `max. ${block.max_people}`}
            </span>
          )}
        </div>

        <Button variant="outline" className="w-full" onClick={() => onEdit(block)}>
          <Edit className="h-4 w-4 mr-2" />
          Bewerken
        </Button>

        {isDraft && (
          <p className="text-xs text-center text-amber-600 mt-2 font-medium">
            Bureau Vlieland beoordeelt uw voorstel
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const PartnerBlocks = () => {
  return (
    <PartnerLayout>
      <Helmet>
        <title>Mijn Aanbod | Partner Portal | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <PartnerBlocksContent />
    </PartnerLayout>
  );
};

export default PartnerBlocks;