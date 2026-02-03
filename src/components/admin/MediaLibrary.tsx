import { useState, useCallback } from "react";
import { useMediaFiles, useUploadMedia, useDeleteMedia, MediaFile } from "@/hooks/useMediaLibrary";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Upload, Trash2, ImageIcon, Copy, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface MediaLibraryProps {
  onSelect?: (file: MediaFile) => void;
  selectable?: boolean;
}

export const MediaLibrary = ({ onSelect, selectable = false }: MediaLibraryProps) => {
  const { toast } = useToast();
  const { data: files, isLoading, error } = useMediaFiles();
  const uploadMedia = useUploadMedia();
  const deleteMedia = useDeleteMedia();

  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [deleteFile, setDeleteFile] = useState<MediaFile | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const filteredFiles = files?.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const uploadPromises = Array.from(fileList).map(async (file) => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Ongeldig bestandstype",
          description: `${file.name} is geen afbeelding.`,
          variant: "destructive",
        });
        return null;
      }

      try {
        await uploadMedia.mutateAsync(file);
        return file.name;
      } catch (error: any) {
        toast({
          title: "Upload mislukt",
          description: error.message || `Kon ${file.name} niet uploaden.`,
          variant: "destructive",
        });
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      toast({
        title: "Upload geslaagd",
        description: `${successCount} afbeelding${successCount > 1 ? "en" : ""} geüpload.`,
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteFile) return;

    try {
      await deleteMedia.mutateAsync(deleteFile.name);
      toast({
        title: "Verwijderd",
        description: `${deleteFile.name} is verwijderd.`,
      });
      setDeleteFile(null);
    } catch (error: any) {
      toast({
        title: "Verwijderen mislukt",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Er ging iets mis bij het laden van de mediabibliotheek.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Upload */}
      <div className="flex gap-4">
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
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={uploadMedia.isPending}
          />
          <Button disabled={uploadMedia.isPending}>
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
      >
        <ImageIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Sleep afbeeldingen hierheen of klik op "Uploaden"
        </p>
      </div>

      {/* File grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : filteredFiles?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? "Geen afbeeldingen gevonden." : "Nog geen afbeeldingen geüpload."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredFiles?.map((file) => (
            <Card
              key={file.id}
              className={`group overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary ${
                selectable ? "hover:shadow-lg" : ""
              }`}
              onClick={() => {
                if (selectable && onSelect) {
                  onSelect(file);
                } else {
                  setPreviewFile(file);
                }
              }}
            >
              <CardContent className="p-0 relative">
                <div className="aspect-square">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                  <div className="w-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate font-medium">
                      {file.name}
                    </p>
                    <p className="text-xs text-white/70">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {!selectable && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyUrl(file.url);
                      }}
                    >
                      {copiedUrl === file.url ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteFile(file);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="w-full max-h-[60vh] object-contain"
                />
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{formatFileSize(previewFile.size)}</span>
                {previewFile.createdAt && (
                  <span>
                    {format(new Date(previewFile.createdAt), "d MMMM yyyy, HH:mm", {
                      locale: nl,
                    })}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Input value={previewFile.url} readOnly className="flex-1" />
                <Button onClick={() => copyUrl(previewFile.url)}>
                  {copiedUrl === previewFile.url ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Kopieer URL
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Afbeelding verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{deleteFile?.name}" wilt verwijderen? Dit kan
              niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMedia.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Verwijderen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
