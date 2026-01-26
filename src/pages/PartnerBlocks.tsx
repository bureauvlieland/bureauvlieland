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
} from "lucide-react";
import { PartnerBlockSheet } from "@/components/partner-portal/PartnerBlockSheet";
import type { PartnerBuildingBlock } from "@/types/partner";

const PartnerBlocksContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [blocks, setBlocks] = useState<PartnerBuildingBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<PartnerBuildingBlock | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [isNewBlock, setIsNewBlock] = useState(false);

  useEffect(() => {
    const fetchBlocks = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/partner/login");
        return;
      }

      // Check if admin is impersonating
      const impersonatePartnerId = searchParams.get("impersonate");
      let currentPartnerId: string | null = null;

      if (impersonatePartnerId) {
        const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
        
        if (isAdmin) {
          currentPartnerId = impersonatePartnerId;
        }
      }

      if (!currentPartnerId) {
        const { data: partner, error: partnerError } = await supabase
          .from("partners")
          .select("id")
          .eq("auth_user_id", session.user.id)
          .eq("is_active", true)
          .single();

        if (partnerError || !partner) {
          setError("Je account is niet gekoppeld aan een partner.");
          setIsLoading(false);
          return;
        }

        currentPartnerId = partner.id;
      }

      setPartnerId(currentPartnerId);

      // Fetch building blocks for this partner
      const { data: blocksData, error: blocksError } = await supabase
        .from("building_blocks")
        .select("id, name, description, short_description, category, block_type, duration, price_adult, price_type, min_people, max_people, is_published, is_active, image_url, image_asset")
        .eq("provider_id", currentPartnerId)
        .order("name");

      if (blocksError) {
        console.error("Error fetching blocks:", blocksError);
        setError("Kon je aanbod niet laden.");
        setIsLoading(false);
        return;
      }

      setBlocks(blocksData || []);
      setIsLoading(false);
    };

    fetchBlocks();
  }, [navigate, searchParams]);

  const handleEditBlock = (block: PartnerBuildingBlock) => {
    setSelectedBlock(block);
    setIsNewBlock(false);
    setShowSheet(true);
  };

  const handleNewBlock = () => {
    setSelectedBlock(null);
    setIsNewBlock(true);
    setShowSheet(true);
  };

  const handleSheetClose = () => {
    setShowSheet(false);
    setSelectedBlock(null);
    setIsNewBlock(false);
  };

  const handleBlockSaved = async () => {
    // Refresh blocks
    if (!partnerId) return;

    const { data: blocksData } = await supabase
      .from("building_blocks")
      .select("id, name, description, short_description, category, block_type, duration, price_adult, price_type, min_people, max_people, is_published, is_active, image_url, image_asset")
      .eq("provider_id", partnerId)
      .order("name");

    setBlocks(blocksData || []);
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

  const publishedBlocks = blocks.filter(b => b.is_published);
  const draftBlocks = blocks.filter(b => !b.is_published);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Mijn Aanbod</h1>
          <p className="text-muted-foreground">Beheer je activiteiten en diensten</p>
        </div>
        <Button onClick={handleNewBlock}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuw voorstel
        </Button>
      </div>

      {blocks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-medium mb-2">Nog geen aanbod</h2>
            <p className="text-muted-foreground mb-4">
              Je hebt nog geen activiteiten of diensten toegevoegd.
            </p>
            <Button onClick={handleNewBlock}>
              <Plus className="h-4 w-4 mr-2" />
              Eerste activiteit toevoegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Published blocks */}
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

          {/* Draft blocks */}
          {draftBlocks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-amber-600" />
                Concept ({draftBlocks.length})
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {draftBlocks.map((block) => (
                  <BlockCard key={block.id} block={block} onEdit={handleEditBlock} isDraft />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <PartnerBlockSheet
        isOpen={showSheet}
        onClose={handleSheetClose}
        block={selectedBlock}
        isNew={isNewBlock}
        partnerId={partnerId || ""}
        onSaved={handleBlockSaved}
      />
    </div>
  );
};

interface BlockCardProps {
  block: PartnerBuildingBlock;
  onEdit: (block: PartnerBuildingBlock) => void;
  isDraft?: boolean;
}

const BlockCard = ({ block, onEdit, isDraft }: BlockCardProps) => {
  // Get image URL - check storage URL first, then asset map, then placeholder
  const getImageUrl = () => {
    if (block.image_url) return block.image_url;
    if (block.image_asset) {
      // Try to construct path - for partner blocks we use placeholder
      return "/placeholder.svg";
    }
    return "/placeholder.svg";
  };
  
  const formatPrice = () => {
    if (!block.price_adult) return "Prijs op aanvraag";
    const price = block.price_adult.toLocaleString("nl-NL", { minimumFractionDigits: 2 });
    
    switch (block.price_type) {
      case "per_person":
        return `€${price} p.p.`;
      case "total":
        return `€${price} totaal`;
      case "per_hour":
        return `€${price}/uur`;
      case "per_day":
        return `€${price}/dag`;
      default:
        return `€${price}`;
    }
  };

  return (
    <Card className={isDraft ? "border-amber-300 dark:border-amber-700" : ""}>
      <div className="aspect-video relative overflow-hidden rounded-t-lg">
        <img
          src={getImageUrl()}
          alt={block.name}
          className="w-full h-full object-cover"
        />
        {isDraft && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              Concept
            </Badge>
          </div>
        )}
        {!isDraft && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-600">Gepubliceerd</Badge>
          </div>
        )}
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
          <p className="text-xs text-center text-muted-foreground mt-2">
            Wacht op goedkeuring Bureau Vlieland
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