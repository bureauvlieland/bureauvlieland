import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMediaFiles, useUploadMedia, useAssetFiles, assetCategories, MediaFile, AssetFile } from "@/hooks/useMediaLibrary";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Upload, ImageIcon, Check, Loader2, FolderOpen } from "lucide-react";

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}

export const MediaPickerDialog = ({
  open,
  onOpenChange,
  onSelect,
}: MediaPickerDialogProps) => {
  const { toast } = useToast();
  const { data: files, isLoading } = useMediaFiles();
  const assetFiles = useAssetFiles();
  const uploadMedia = useUploadMedia();

  const [activeTab, setActiveTab] = useState<string>("uploads");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const filteredUploadedFiles = files?.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAssetFiles = assetFiles.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || file.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Ongeldig bestandstype",
        description: "Alleen afbeeldingen zijn toegestaan.",
        variant: "destructive",
      });
      return;
    }

    try {
      const uploadedFile = await uploadMedia.mutateAsync(file);
      setSelectedUrl(uploadedFile.url);
      toast({
        title: "Upload geslaagd",
        description: "Afbeelding is geüpload en geselecteerd.",
      });
    } catch (error: any) {
      toast({
        title: "Upload mislukt",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConfirm = () => {
    if (selectedUrl) {
      onSelect(selectedUrl);
      onOpenChange(false);
      setSelectedUrl(null);
      setSearchQuery("");
      setCategoryFilter("all");
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedUrl(null);
    setSearchQuery("");
    setCategoryFilter("all");
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Kies afbeelding uit bibliotheek</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="shrink-0">
            <TabsTrigger value="uploads" className="gap-2">
              <Upload className="h-4 w-4" />
              Uploads ({files?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="assets" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Website Assets ({assetFiles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="uploads" className="flex-1 overflow-hidden flex flex-col mt-4 space-y-4">
            {/* Search and Upload */}
            <div className="flex gap-4 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken op bestandsnaam..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploadMedia.isPending}
                />
                <Button disabled={uploadMedia.isPending} variant="outline">
                  {uploadMedia.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Uploaden
                </Button>
              </div>
            </div>

            {/* Drag and drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileUpload(e.dataTransfer.files);
              }}
              className={`shrink-0 border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              }`}
            >
              <p className="text-sm text-muted-foreground">
                Sleep een afbeelding hierheen of klik op "Uploaden"
              </p>
            </div>

            {/* File grid */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : filteredUploadedFiles?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>
                    {searchQuery
                      ? "Geen afbeeldingen gevonden."
                      : "Nog geen afbeeldingen geüpload."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {filteredUploadedFiles?.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => setSelectedUrl(file.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedUrl === file.url
                          ? "border-primary ring-2 ring-primary ring-offset-2"
                          : "border-transparent hover:border-muted-foreground/50"
                      }`}
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {selectedUrl === file.url && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary rounded-full p-1">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="assets" className="flex-1 overflow-hidden flex flex-col mt-4 space-y-4">
            {/* Search and Category Filter */}
            <div className="flex gap-4 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken op bestandsnaam..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle categorieën</SelectItem>
                  {assetCategories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Asset files grid */}
            <div className="flex-1 overflow-y-auto">
              {filteredAssetFiles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Geen afbeeldingen gevonden.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {filteredAssetFiles.map((file) => (
                    <div
                      key={file.name}
                      onClick={() => setSelectedUrl(file.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedUrl === file.url
                          ? "border-primary ring-2 ring-primary ring-offset-2"
                          : "border-transparent hover:border-muted-foreground/50"
                      }`}
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/50">
                        <Badge variant="secondary" className="text-[10px]">
                          {file.category}
                        </Badge>
                      </div>
                      {selectedUrl === file.url && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary rounded-full p-1">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 shrink-0">
          <Button variant="outline" onClick={handleCancel}>
            Annuleren
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedUrl}>
            Selecteren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
