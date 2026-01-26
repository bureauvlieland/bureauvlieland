import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Edit,
  Eye,
  EyeOff,
  Blocks,
  Filter,
} from "lucide-react";
import { useAdminBuildingBlocks, useTogglePublishBlock } from "@/hooks/useBuildingBlocks";
import { BuildingBlockSheet } from "@/components/admin/BuildingBlockSheet";
import { categoryLabels, blockTypeLabels } from "@/types/buildingBlock";
import { getBlockImage } from "@/lib/buildingBlockUtils";
import type { BuildingBlock, BuildingBlockCategory, BuildingBlockType } from "@/types/buildingBlock";

const AdminBuildingBlocks = () => {
  const { toast } = useToast();
  const { data: blocks, isLoading } = useAdminBuildingBlocks();
  const togglePublish = useTogglePublishBlock();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<BuildingBlockCategory | "all">("all");
  const [typeFilter, setTypeFilter] = useState<BuildingBlockType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<BuildingBlock | null>(null);
  
  // Filter blocks
  const filteredBlocks = blocks?.filter((block) => {
    const matchesSearch = block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || block.category === categoryFilter;
    const matchesType = typeFilter === "all" || block.block_type === typeFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "published" && block.is_published) ||
      (statusFilter === "draft" && !block.is_published);
    
    return matchesSearch && matchesCategory && matchesType && matchesStatus && block.is_active;
  }) || [];
  
  const handleTogglePublish = async (block: BuildingBlock) => {
    try {
      await togglePublish.mutateAsync({ id: block.id, is_published: !block.is_published });
      toast({
        title: block.is_published ? "Bouwsteen gedepubliceerd" : "Bouwsteen gepubliceerd",
        description: `${block.name} is nu ${block.is_published ? "niet meer" : ""} zichtbaar op de website.`,
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Er ging iets mis bij het wijzigen van de publicatiestatus.",
        variant: "destructive",
      });
    }
  };
  
  const handleEdit = (block: BuildingBlock) => {
    setSelectedBlock(block);
    setSheetOpen(true);
  };
  
  const handleCreate = () => {
    setSelectedBlock(null);
    setSheetOpen(true);
  };
  
  const formatPrice = (block: BuildingBlock) => {
    if (block.price_display_override) return block.price_display_override;
    if (!block.price_adult) return "—";
    
    const prefix = block.is_from_price ? "vanaf " : "";
    const price = `€ ${block.price_adult.toFixed(2).replace(".", ",")}`;
    const note = block.price_adult_note ? ` ${block.price_adult_note}` : "";
    
    return `${prefix}${price}${note}`;
  };
  
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Blocks className="h-6 w-6" />
              Bouwstenen
            </h1>
            <p className="text-slate-500 mt-1">
              Beheer de bouwstenen voor de programma configurator
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe bouwsteen
          </Button>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as BuildingBlockCategory | "all")}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle categorieën</SelectItem>
                <SelectItem value="activiteiten">Activiteiten</SelectItem>
                <SelectItem value="catering">Catering</SelectItem>
                <SelectItem value="vervoer">Vervoer</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as BuildingBlockType | "all")}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle types</SelectItem>
                <SelectItem value="bureau">Bureau</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="self_arranged">Zelf regelen</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "published" | "draft")}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="published">Gepubliceerd</SelectItem>
                <SelectItem value="draft">Concept</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredBlocks.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Blocks className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Geen bouwstenen gevonden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Bouwsteen</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Prijs</TableHead>
                  <TableHead className="text-center">Gepubliceerd</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBlocks.map((block) => (
                  <TableRow key={block.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-14 rounded overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={getBlockImage(block)}
                            alt={block.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium">{block.name}</p>
                          {block.short_description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {block.short_description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {categoryLabels[block.category]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={block.block_type === "bureau" ? "default" : "secondary"}
                      >
                        {blockTypeLabels[block.block_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {block.provider?.name || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatPrice(block)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={block.is_published}
                        onCheckedChange={() => handleTogglePublish(block)}
                        disabled={togglePublish.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(block)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        
        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{filteredBlocks.length} bouwstenen</span>
          <span>•</span>
          <span>{filteredBlocks.filter(b => b.is_published).length} gepubliceerd</span>
          <span>•</span>
          <span>{filteredBlocks.filter(b => !b.is_published).length} concept</span>
        </div>
      </div>
      
      <BuildingBlockSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        block={selectedBlock}
      />
    </AdminLayout>
  );
};

export default AdminBuildingBlocks;
