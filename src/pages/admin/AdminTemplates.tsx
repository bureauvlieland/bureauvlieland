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
  LayoutTemplate,
  Filter,
  Calendar,
} from "lucide-react";
import { useAdminTemplates, useToggleTemplatePublish } from "@/hooks/useProgramTemplates";
import { AdminTemplateSheet } from "@/components/admin/AdminTemplateSheet";
import { getBlockImage } from "@/lib/buildingBlockUtils";
import type { ProgramTemplate } from "@/types/programTemplate";

const AdminTemplates = () => {
  const { toast } = useToast();
  const { data: templates, isLoading } = useAdminTemplates();
  const togglePublish = useToggleTemplatePublish();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [durationFilter, setDurationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplate | null>(null);
  
  // Filter templates
  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDuration = durationFilter === "all" || template.duration_days.toString() === durationFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "published" && template.is_published) ||
      (statusFilter === "draft" && !template.is_published);
    
    return matchesSearch && matchesDuration && matchesStatus;
  }) || [];
  
  const handleTogglePublish = async (template: ProgramTemplate) => {
    try {
      await togglePublish.mutateAsync({ id: template.id, is_published: !template.is_published });
      toast({
        title: template.is_published ? "Template gedepubliceerd" : "Template gepubliceerd",
        description: `${template.name} is nu ${template.is_published ? "niet meer" : ""} zichtbaar voor klanten.`,
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Er ging iets mis bij het wijzigen van de publicatiestatus.",
        variant: "destructive",
      });
    }
  };
  
  const handleEdit = (template: ProgramTemplate) => {
    setSelectedTemplate(template);
    setSheetOpen(true);
  };
  
  const handleCreate = () => {
    setSelectedTemplate(null);
    setSheetOpen(true);
  };
  
  const getDurationLabel = (days: number) => {
    if (days === 1) return "1 dag";
    return `${days} dagen`;
  };
  
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <LayoutTemplate className="h-6 w-6" />
              Programma Templates
            </h1>
            <p className="text-slate-500 mt-1">
              Beheer voorbeeldprogramma's voor de configurator
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe template
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
            
            <Select value={durationFilter} onValueChange={setDurationFilter}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Duur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle duurtes</SelectItem>
                <SelectItem value="1">1 dag</SelectItem>
                <SelectItem value="2">2 dagen</SelectItem>
                <SelectItem value="3">3 dagen</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "published" | "draft")}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
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
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Geen templates gevonden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Preview</TableHead>
                  <TableHead className="w-[300px]">Template</TableHead>
                  <TableHead>Duur</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Prijs p.p.</TableHead>
                  <TableHead className="text-center">Gepubliceerd</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => {
                  // Get first 4 block images for preview
                  const blockImages = template.items
                    ?.slice(0, 4)
                    .map(item => item.block ? getBlockImage(item.block) : null)
                    .filter(Boolean) || [];
                  
                  return (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex -space-x-2">
                          {blockImages.length > 0 ? (
                            blockImages.map((src, i) => (
                              <div
                                key={i}
                                className="h-8 w-8 rounded-full overflow-hidden border-2 border-white bg-muted"
                              >
                                <img
                                  src={src as string}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ))
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          {template.short_description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {template.short_description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getDurationLabel(template.duration_days)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {template.items?.length || 0} bouwstenen
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {template.indicative_price_pp 
                          ? `€ ${template.indicative_price_pp}` 
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={template.is_published}
                          onCheckedChange={() => handleTogglePublish(template)}
                          disabled={togglePublish.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
        
        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{filteredTemplates.length} templates</span>
          <span>•</span>
          <span>{filteredTemplates.filter(t => t.is_published).length} gepubliceerd</span>
          <span>•</span>
          <span>{filteredTemplates.filter(t => !t.is_published).length} concept</span>
        </div>
      </div>
      
      <AdminTemplateSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        template={selectedTemplate}
      />
    </AdminLayout>
  );
};

export default AdminTemplates;
