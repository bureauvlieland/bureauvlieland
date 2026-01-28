import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useCreateBuildingBlock,
  useUpdateBuildingBlock,
  useDeleteBuildingBlock,
  useUploadBlockImage,
} from "@/hooks/useBuildingBlocks";
import { Loader2, Trash2 } from "lucide-react";
import type { BuildingBlock } from "@/types/buildingBlock";
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

const formSchema = z.object({
  id: z.string().min(1, "ID is verplicht").regex(/^[a-z0-9-]+$/, "Alleen kleine letters, cijfers en koppeltekens"),
  name: z.string().min(1, "Naam is verplicht"),
  description: z.string().optional(),
  short_description: z.string().max(100, "Maximaal 100 tekens").optional(),
  category: z.enum(["activiteiten", "catering", "vervoer"]),
  block_type: z.enum(["bureau", "partner", "self_arranged"]),
  provider_id: z.string().optional(),
  min_people: z.coerce.number().nullable().optional(),
  max_people: z.coerce.number().nullable().optional(),
  duration: z.string().optional(),
  price_adult: z.coerce.number().nullable().optional(),
  price_adult_note: z.string().optional(),
  price_type: z.enum(["per_person", "total", "per_hour", "per_day", "on_request"]),
  price_child: z.coerce.number().nullable().optional(),
  price_child_note: z.string().optional(),
  price_child_min_age: z.coerce.number().optional(),
  price_child_max_age: z.coerce.number().optional(),
  price_pet: z.coerce.number().nullable().optional(),
  price_pet_note: z.string().optional(),
  is_from_price: z.boolean(),
  price_display_override: z.string().optional(),
  price_includes_vat: z.boolean(),
  vat_rate: z.coerce.number(),
  external_url: z.string().url().optional().or(z.literal("")),
  image_url: z.string().optional(),
  image_asset: z.string().optional(),
  is_published: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.coerce.number(),
  seasonal_notes: z.string().optional(),
  tags: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface BuildingBlockSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: BuildingBlock | null;
}

export const BuildingBlockSheet = ({ open, onOpenChange, block }: BuildingBlockSheetProps) => {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isEditing = !!block;
  
  const createBlock = useCreateBuildingBlock();
  const updateBlock = useUpdateBuildingBlock();
  const deleteBlock = useDeleteBuildingBlock();
  const uploadImage = useUploadBlockImage();
  
  // Fetch partners for dropdown
  const { data: partners } = useQuery({
    queryKey: ["partners-for-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      name: "",
      description: "",
      short_description: "",
      category: "activiteiten",
      block_type: "partner",
      provider_id: "",
      min_people: null,
      max_people: null,
      duration: "",
      price_adult: null,
      price_adult_note: "p.p.",
      price_type: "per_person",
      price_child: null,
      price_child_note: "",
      price_child_min_age: 4,
      price_child_max_age: 12,
      price_pet: null,
      price_pet_note: "",
      is_from_price: false,
      price_display_override: "",
      price_includes_vat: true,
      vat_rate: 21,
      external_url: "",
      image_url: "",
      image_asset: "",
      is_published: false,
      is_active: true,
      sort_order: 0,
      seasonal_notes: "",
      tags: "",
    },
  });
  
  // Reset form when block changes
  useEffect(() => {
    if (block) {
      form.reset({
        id: block.id,
        name: block.name,
        description: block.description || "",
        short_description: block.short_description || "",
        category: block.category,
        block_type: block.block_type,
        provider_id: block.provider_id || "",
        min_people: block.min_people,
        max_people: block.max_people,
        duration: block.duration || "",
        price_adult: block.price_adult,
        price_adult_note: block.price_adult_note || "p.p.",
        price_type: block.price_type || "per_person",
        price_child: block.price_child,
        price_child_note: block.price_child_note || "",
        price_child_min_age: block.price_child_min_age ?? 4,
        price_child_max_age: block.price_child_max_age ?? 12,
        price_pet: block.price_pet,
        price_pet_note: block.price_pet_note || "",
        is_from_price: block.is_from_price ?? false,
        price_display_override: block.price_display_override || "",
        price_includes_vat: block.price_includes_vat ?? true,
        vat_rate: block.vat_rate ?? 21,
        external_url: block.external_url || "",
        image_url: block.image_url || "",
        image_asset: block.image_asset || "",
        is_published: block.is_published ?? false,
        is_active: block.is_active ?? true,
        sort_order: block.sort_order ?? 0,
        seasonal_notes: block.seasonal_notes || "",
        tags: block.tags?.join(", ") || "",
      });
    } else {
      form.reset({
        id: "",
        name: "",
        description: "",
        short_description: "",
        category: "activiteiten",
        block_type: "partner",
        provider_id: "",
        min_people: null,
        max_people: null,
        duration: "",
        price_adult: null,
        price_adult_note: "p.p.",
        price_type: "per_person",
        price_child: null,
        price_child_note: "",
        price_child_min_age: 4,
        price_child_max_age: 12,
        price_pet: null,
        price_pet_note: "",
        is_from_price: false,
        price_display_override: "",
        price_includes_vat: true,
        vat_rate: 21,
        external_url: "",
        image_url: "",
        image_asset: "",
        is_published: false,
        is_active: true,
        sort_order: 0,
        seasonal_notes: "",
        tags: "",
      });
    }
  }, [block, form]);
  
  const onSubmit = async (data: FormData) => {
    try {
      // Convert tags string to array
      const tagsArray = data.tags
        ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
      
      const submitData = {
        ...data,
        tags: tagsArray,
      };
      
      if (isEditing) {
        await updateBlock.mutateAsync({ id: block.id, updates: submitData });
        toast({
          title: "Bouwsteen bijgewerkt",
          description: `${data.name} is succesvol opgeslagen.`,
        });
      } else {
        await createBlock.mutateAsync(submitData as any);
        toast({
          title: "Bouwsteen aangemaakt",
          description: `${data.name} is succesvol toegevoegd.`,
        });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || "Er ging iets mis bij het opslaan.",
        variant: "destructive",
      });
    }
  };
  
  const handleDelete = async () => {
    if (!block) return;
    
    try {
      await deleteBlock.mutateAsync(block.id);
      toast({
        title: "Bouwsteen verwijderd",
        description: `${block.name} is verwijderd.`,
      });
      setDeleteDialogOpen(false);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || "Er ging iets mis bij het verwijderen.",
        variant: "destructive",
      });
    }
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const blockId = form.getValues("id");
    if (!blockId) {
      toast({
        title: "Fout",
        description: "Vul eerst een ID in voor de bouwsteen.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const url = await uploadImage.mutateAsync({ blockId, file });
      form.setValue("image_url", url);
      toast({
        title: "Afbeelding geüpload",
        description: "De afbeelding is succesvol opgeslagen.",
      });
    } catch (error: any) {
      toast({
        title: "Upload mislukt",
        description: error.message || "Er ging iets mis bij het uploaden.",
        variant: "destructive",
      });
    }
  };
  
  const isPending = createBlock.isPending || updateBlock.isPending;
  
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {isEditing ? "Bouwsteen bewerken" : "Nieuwe bouwsteen"}
            </SheetTitle>
            <SheetDescription>
              {isEditing
                ? "Pas de details van deze bouwsteen aan."
                : "Voeg een nieuwe bouwsteen toe aan de configurator."}
            </SheetDescription>
          </SheetHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
              <Tabs defaultValue="general">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">Algemeen</TabsTrigger>
                  <TabsTrigger value="pricing">Prijzen</TabsTrigger>
                  <TabsTrigger value="media">Media</TabsTrigger>
                </TabsList>
                
                {/* General Tab */}
                <TabsContent value="general" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID (slug)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            disabled={isEditing}
                            placeholder="zeehondentocht"
                          />
                        </FormControl>
                        <FormDescription>
                          Unieke identifier, alleen kleine letters en koppeltekens
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Naam</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Zeehondentocht" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="short_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Korte beschrijving</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Max 100 tekens" maxLength={100} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beschrijving</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categorie</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="activiteiten">Activiteiten</SelectItem>
                              <SelectItem value="catering">Catering</SelectItem>
                              <SelectItem value="vervoer">Vervoer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="block_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="bureau">Bureau Vlieland</SelectItem>
                              <SelectItem value="partner">Partner</SelectItem>
                              <SelectItem value="self_arranged">Zelf regelen</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="provider_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Partner</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)} 
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer partner..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Geen partner</SelectItem>
                            {partners?.map((partner) => (
                              <SelectItem key={partner.id} value={partner.id}>
                                {partner.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duur</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="2-3 uur" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="min_people"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min. personen</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value ?? ""} 
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="max_people"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max. personen</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              value={field.value ?? ""} 
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="external_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Externe URL (voor zelf regelen)</FormLabel>
                        <FormControl>
                          <Input {...field} type="url" placeholder="https://..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="seasonal_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seizoensnotities</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Alleen april-september" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="strand, water, groep" />
                        </FormControl>
                        <FormDescription>
                          Komma-gescheiden tags voor filtering
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Pricing Tab */}
                <TabsContent value="pricing" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="price_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prijstype</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="per_person">Per persoon</SelectItem>
                            <SelectItem value="total">Totaalprijs</SelectItem>
                            <SelectItem value="per_hour">Per uur</SelectItem>
                            <SelectItem value="per_day">Per dag</SelectItem>
                            <SelectItem value="on_request">Op aanvraag</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="is_from_price"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Vanaf-prijs</FormLabel>
                          <FormDescription>
                            Toon "vanaf" voor de prijs
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">BTW Instellingen</h4>
                    <FormField
                      control={form.control}
                      name="price_includes_vat"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Prijs is inclusief BTW</FormLabel>
                            <FormDescription>
                              Typisch voor partnerprijzen
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="vat_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>BTW Tarief</FormLabel>
                          <Select 
                            onValueChange={(val) => field.onChange(Number(val))} 
                            value={String(field.value)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="21">21% (standaard)</SelectItem>
                              <SelectItem value="9">9% (voedsel/boeken)</SelectItem>
                              <SelectItem value="0">0% (vrijgesteld)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Volwassenen</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price_adult"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prijs (€)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                {...field}
                                value={field.value ?? ""} 
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="price_adult_note"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notitie</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="p.p." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Kinderen</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price_child"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prijs (€)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                {...field}
                                value={field.value ?? ""} 
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="price_child_note"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notitie</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="4-12 jaar" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price_child_min_age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min. leeftijd</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="price_child_max_age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max. leeftijd</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Huisdieren</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price_pet"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prijs (€)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                {...field}
                                value={field.value ?? ""} 
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="price_pet_note"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notitie</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="honden" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <FormField
                    control={form.control}
                    name="price_display_override"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prijs override (optioneel)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Prijs op aanvraag" />
                        </FormControl>
                        <FormDescription>
                          Overschrijft de berekende prijsweergave
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Media Tab */}
                <TabsContent value="media" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="image_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Afbeelding URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-2">
                    <FormLabel>Upload afbeelding</FormLabel>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadImage.isPending}
                      />
                      {uploadImage.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                  </div>
                  
                  {form.watch("image_url") && (
                    <div className="rounded-lg overflow-hidden border">
                      <img
                        src={form.watch("image_url")}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  
                  <Separator />
                  
                  <FormField
                    control={form.control}
                    name="image_asset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fallback asset (bestandsnaam)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="seal-tour.jpg" />
                        </FormControl>
                        <FormDescription>
                          Lokaal asset bestand als backup
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
              
              <Separator />
              
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name="is_published"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Gepubliceerd</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Actief</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel className="!mt-0">Volgorde:</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          className="w-20"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-between pt-4">
                {isEditing && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Verwijderen
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Annuleren
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isEditing ? "Opslaan" : "Toevoegen"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bouwsteen verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{block?.name}" wilt verwijderen? 
              De bouwsteen wordt gedeactiveerd en is niet meer zichtbaar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
