import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAddQuoteExtra, useUpdateQuoteExtra } from '@/hooks/useQuoteExtras';
import { toast } from 'sonner';
import type { 
  AccommodationQuoteExtra, 
  ExtraCategory, 
  ExtraPricingType,
  EXTRA_CATEGORY_LABELS 
} from '@/types/accommodationExtras';

const formSchema = z.object({
  name: z.string().min(1, 'Naam is verplicht'),
  description: z.string().optional(),
  category: z.enum(['fb', 'facilities', 'transport', 'other']).optional(),
  pricing_type: z.enum(['per_person', 'fixed']),
  unit_price: z.number().min(0, 'Prijs moet positief zijn'),
  quantity: z.number().int().min(1, 'Aantal moet minimaal 1 zijn'),
  vat_rate: z.number().min(0).max(100),
  price_includes_vat: z.boolean(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddQuoteExtraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  numberOfGuests: number;
  editingExtra?: AccommodationQuoteExtra | null;
}

export function AddQuoteExtraDialog({
  open,
  onOpenChange,
  quoteId,
  numberOfGuests,
  editingExtra,
}: AddQuoteExtraDialogProps) {
  const addExtra = useAddQuoteExtra();
  const updateExtra = useUpdateQuoteExtra();
  const isEditing = !!editingExtra;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: undefined,
      pricing_type: 'per_person',
      unit_price: 0,
      quantity: numberOfGuests,
      vat_rate: 9,
      price_includes_vat: true,
      notes: '',
    },
  });

  // Reset form when dialog opens/closes or when editingExtra changes
  useEffect(() => {
    if (open) {
      if (editingExtra) {
        form.reset({
          name: editingExtra.name,
          description: editingExtra.description || '',
          category: editingExtra.category as ExtraCategory | undefined,
          pricing_type: editingExtra.pricing_type as ExtraPricingType,
          unit_price: editingExtra.unit_price,
          quantity: editingExtra.quantity,
          vat_rate: editingExtra.vat_rate,
          price_includes_vat: editingExtra.price_includes_vat,
          notes: editingExtra.notes || '',
        });
      } else {
        form.reset({
          name: '',
          description: '',
          category: undefined,
          pricing_type: 'per_person',
          unit_price: 0,
          quantity: numberOfGuests,
          vat_rate: 9,
          price_includes_vat: true,
          notes: '',
        });
      }
    }
  }, [open, editingExtra, numberOfGuests, form]);

  const pricingType = form.watch('pricing_type');
  const unitPrice = form.watch('unit_price');
  const quantity = form.watch('quantity');

  const calculatedTotal = pricingType === 'fixed' 
    ? unitPrice 
    : unitPrice * quantity;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && editingExtra) {
        await updateExtra.mutateAsync({
          id: editingExtra.id,
          quoteId,
          updates: {
            name: values.name,
            description: values.description || null,
            category: values.category || null,
            pricing_type: values.pricing_type,
            unit_price: values.unit_price,
            quantity: values.quantity,
            vat_rate: values.vat_rate,
            price_includes_vat: values.price_includes_vat,
            notes: values.notes || null,
          },
        });
        toast.success('Extra bijgewerkt');
      } else {
        await addExtra.mutateAsync({
          quote_id: quoteId,
          name: values.name,
          description: values.description || null,
          category: values.category || null,
          pricing_type: values.pricing_type,
          unit_price: values.unit_price,
          quantity: values.quantity,
          vat_rate: values.vat_rate,
          price_includes_vat: values.price_includes_vat,
          notes: values.notes || null,
        });
        toast.success('Extra toegevoegd');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Fout bij bijwerken' : 'Fout bij toevoegen');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Extra bewerken' : 'Extra toevoegen'}</DialogTitle>
          <DialogDescription>
            Voeg een extra dienst toe aan deze offerte, zoals catering of parkeren.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              placeholder="bijv. Lunch, 3-gangendiner, Parkeren"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Omschrijving</Label>
            <Textarea
              id="description"
              placeholder="Optionele details..."
              rows={2}
              {...form.register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categorie</Label>
            <Select
              value={form.watch('category') || ''}
              onValueChange={(value) => form.setValue('category', value as ExtraCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fb">🍽️ F&B</SelectItem>
                <SelectItem value="facilities">🏢 Faciliteiten</SelectItem>
                <SelectItem value="transport">🚗 Transport</SelectItem>
                <SelectItem value="other">📦 Overig</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Prijstype</Label>
            <RadioGroup
              value={form.watch('pricing_type')}
              onValueChange={(value) => form.setValue('pricing_type', value as ExtraPricingType)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="per_person" id="per_person" />
                <Label htmlFor="per_person" className="font-normal">Per persoon</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="font-normal">Vast bedrag</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_price">
                Prijs {pricingType === 'per_person' ? 'per persoon' : '(totaal)'}
              </Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                {...form.register('unit_price', { valueAsNumber: true })}
              />
            </div>

            {pricingType === 'per_person' && (
              <div className="space-y-2">
                <Label htmlFor="quantity">Aantal personen</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  {...form.register('quantity', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vat_rate">BTW %</Label>
              <Select
                value={form.watch('vat_rate').toString()}
                onValueChange={(value) => form.setValue('vat_rate', parseFloat(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="21">21%</SelectItem>
                  <SelectItem value="9">9%</SelectItem>
                  <SelectItem value="0">0%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="price_includes_vat"
                checked={form.watch('price_includes_vat')}
                onCheckedChange={(checked) => form.setValue('price_includes_vat', !!checked)}
              />
              <Label htmlFor="price_includes_vat" className="font-normal">
                Prijs incl. BTW
              </Label>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Totaal</span>
              <span className="text-lg font-bold text-primary">
                {formatPrice(calculatedTotal)}
              </span>
            </div>
            {pricingType === 'per_person' && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatPrice(unitPrice)} × {quantity} personen
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button 
              type="submit" 
              disabled={addExtra.isPending || updateExtra.isPending}
            >
              {addExtra.isPending || updateExtra.isPending 
                ? 'Bezig...' 
                : isEditing 
                  ? 'Opslaan' 
                  : 'Toevoegen'
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
