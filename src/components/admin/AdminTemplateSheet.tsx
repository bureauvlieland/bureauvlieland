import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useDeleteTemplateItem,
  useUpdateTemplateItem,
  useTemplateWithItems,
} from "@/hooks/useProgramTemplates";
import { Loader2, Trash2, Plus, Clock, GripVertical } from "lucide-react";
import type { ProgramTemplate, ProgramTemplateItem } from "@/types/programTemplate";
import { getBlockImage } from "@/lib/buildingBlockUtils";
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
import { AddTemplateItemDialog } from "./AddTemplateItemDialog";

// Sortable item row component
const SortableTemplateItem = ({ 
  item, 
  onDelete, 
  isDeleting 
}: { 
  item: ProgramTemplateItem; 
  onDelete: (id: string) => void; 
  isDeleting: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg group"
    >
      <GripVertical 
        className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" 
        {...attributes}
        {...listeners}
      />
      
      {item.block && (
        <div className="h-10 w-14 rounded overflow-hidden bg-muted flex-shrink-0">
          <img
            src={getBlockImage(item.block)}
            alt={item.block.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {item.block?.name || item.block_id}
        </p>
        {item.preferred_time && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {item.preferred_time}
          </p>
        )}
      </div>
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onDelete(item.id)}
        disabled={isDeleting}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
};

const formSchema = z.object({
  id: z.string().min(1, "ID is verplicht").regex(/^[a-z0-9-]+$/, "Alleen kleine letters, cijfers en koppeltekens"),
  name: z.string().min(1, "Naam is verplicht"),
  description: z.string().optional(),
  short_description: z.string().max(100, "Maximaal 100 tekens").optional(),
  duration_days: z.coerce.number().min(1).max(7),
  target_group: z.string().optional(),
  image_url: z.string().optional(),
  indicative_price_pp: z.coerce.number().nullable().optional(),
  is_published: z.boolean(),
  sort_order: z.coerce.number(),
});

type FormData = z.infer<typeof formSchema>;

interface AdminTemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ProgramTemplate | null;
}

export const AdminTemplateSheet = ({ open, onOpenChange, template }: AdminTemplateSheetProps) => {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const isEditing = !!template;
  
  // Fetch live template data when editing (for real-time item updates)
  const { data: liveTemplate } = useTemplateWithItems(isEditing ? template?.id : null);
  const currentTemplate = liveTemplate || template;
  
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const deleteItem = useDeleteTemplateItem();
  const updateItem = useUpdateTemplateItem();
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      name: "",
      description: "",
      short_description: "",
      duration_days: 1,
      target_group: "",
      image_url: "",
      indicative_price_pp: null,
      is_published: false,
      sort_order: 0,
    },
  });
  
  // Reset form when template changes
  useEffect(() => {
    if (template) {
      form.reset({
        id: template.id,
        name: template.name,
        description: template.description || "",
        short_description: template.short_description || "",
        duration_days: template.duration_days,
        target_group: template.target_group || "",
        image_url: template.image_url || "",
        indicative_price_pp: template.indicative_price_pp,
        is_published: template.is_published,
        sort_order: template.sort_order,
      });
    } else {
      form.reset({
        id: "",
        name: "",
        description: "",
        short_description: "",
        duration_days: 1,
        target_group: "",
        image_url: "",
        indicative_price_pp: null,
        is_published: false,
        sort_order: 0,
      });
    }
  }, [template, form]);
  
  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await updateTemplate.mutateAsync({ id: template.id, updates: data });
        toast({
          title: "Template bijgewerkt",
          description: `${data.name} is succesvol opgeslagen.`,
        });
      } else {
        await createTemplate.mutateAsync(data as any);
        toast({
          title: "Template aangemaakt",
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
    if (!template) return;
    
    try {
      await deleteTemplate.mutateAsync(template.id);
      toast({
        title: "Template verwijderd",
        description: `${template.name} is verwijderd.`,
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
  
  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem.mutateAsync(itemId);
      toast({
        title: "Bouwsteen verwijderd",
        description: "De bouwsteen is verwijderd uit de template.",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || "Er ging iets mis bij het verwijderen.",
        variant: "destructive",
      });
    }
  };
  
  const handleAddItem = (dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    setAddItemDialogOpen(true);
  };
  
  const isPending = createTemplate.isPending || updateTemplate.isPending;
  
  // Group items by day - use currentTemplate for live data
  const itemsByDay: Record<number, ProgramTemplateItem[]> = {};
  const durationDays = form.watch("duration_days");
  for (let i = 0; i < durationDays; i++) {
    itemsByDay[i] = currentTemplate?.items?.filter(item => item.day_index === i)
      .sort((a, b) => {
        if (a.preferred_time && b.preferred_time) {
          return a.preferred_time.localeCompare(b.preferred_time);
        }
        return (a.sort_order || 0) - (b.sort_order || 0);
      }) || [];
  }
  
  const handleDragEnd = async (event: DragEndEvent, dayIndex: number) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const dayItems = itemsByDay[dayIndex];
    if (!dayItems) return;
    
    const oldIndex = dayItems.findIndex(i => i.id === active.id);
    const newIndex = dayItems.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    
    const reordered = [...dayItems];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].sort_order !== i) {
        await updateItem.mutateAsync({ id: reordered[i].id, updates: { sort_order: i } });
      }
    }
  };
  
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {isEditing ? "Template bewerken" : "Nieuwe template"}
            </SheetTitle>
            <SheetDescription>
              {isEditing
                ? "Pas de details en het programma aan."
                : "Maak een nieuw voorbeeldprogramma aan."}
            </SheetDescription>
          </SheetHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
              <Tabs defaultValue="general">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="general">Algemeen</TabsTrigger>
                  <TabsTrigger value="program" disabled={!isEditing}>
                    Programma {isEditing && `(${currentTemplate?.items?.length || 0})`}
                  </TabsTrigger>
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
                            placeholder="eilanddag-compleet"
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
                          <Input {...field} placeholder="Eilanddag Compleet" />
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
                      name="duration_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duur (dagen)</FormLabel>
                          <Select 
                            onValueChange={(v) => field.onChange(parseInt(v))} 
                            value={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 dag</SelectItem>
                              <SelectItem value="2">2 dagen</SelectItem>
                              <SelectItem value="3">3 dagen</SelectItem>
                              <SelectItem value="4">4 dagen</SelectItem>
                              <SelectItem value="5">5 dagen</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="target_group"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Doelgroep</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecteer..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="bedrijf">Bedrijven</SelectItem>
                              <SelectItem value="familie">Families</SelectItem>
                              <SelectItem value="vrienden">Vriendengroepen</SelectItem>
                              <SelectItem value="algemeen">Algemeen</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="indicative_price_pp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Indicatieve prijs p.p. (€)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value ?? ""} 
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="75"
                            />
                          </FormControl>
                          <FormDescription>Optioneel</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="sort_order"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Volgorde</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <FormField
                    control={form.control}
                    name="is_published"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Gepubliceerd</FormLabel>
                          <FormDescription>
                            Zichtbaar voor klanten in de configurator
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
                </TabsContent>
                
                {/* Program Tab */}
                <TabsContent value="program" className="space-y-4 mt-4">
                  {!isEditing ? (
                    <p className="text-muted-foreground text-sm">
                      Sla de template eerst op om bouwstenen toe te voegen.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {Array.from({ length: durationDays }).map((_, dayIndex) => (
                        <div key={dayIndex} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium flex items-center gap-2">
                              <Badge variant="outline">Dag {dayIndex + 1}</Badge>
                              <span className="text-muted-foreground text-sm">
                                ({itemsByDay[dayIndex]?.length || 0} items)
                              </span>
                            </h4>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddItem(dayIndex)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Toevoegen
                            </Button>
                          </div>
                          
                          {itemsByDay[dayIndex]?.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic py-2">
                              Nog geen bouwstenen voor deze dag
                            </p>
                          ) : (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(event) => handleDragEnd(event, dayIndex)}
                            >
                              <SortableContext
                                items={itemsByDay[dayIndex]?.map(i => i.id) || []}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {itemsByDay[dayIndex]?.map((item) => (
                                    <SortableTemplateItem
                                      key={item.id}
                                      item={item}
                                      onDelete={handleDeleteItem}
                                      isDeleting={deleteItem.isPending}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          )}
                          
                          {dayIndex < durationDays - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              <Separator />
              
              <div className="flex justify-between">
                {isEditing && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={deleteTemplate.isPending}
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
                    {isEditing ? "Opslaan" : "Aanmaken"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Template verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{template?.name}" wilt verwijderen? 
              Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Add Item Dialog */}
      {currentTemplate && (
        <AddTemplateItemDialog
          open={addItemDialogOpen}
          onOpenChange={setAddItemDialogOpen}
          templateId={currentTemplate.id}
          dayIndex={selectedDayIndex}
          durationDays={durationDays}
          
        />
      )}
    </>
  );
};
