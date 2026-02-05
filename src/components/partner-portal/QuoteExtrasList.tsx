import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuoteExtras, useDeleteQuoteExtra } from '@/hooks/useQuoteExtras';
import { AddQuoteExtraDialog } from './AddQuoteExtraDialog';
import { toast } from 'sonner';
import type { AccommodationQuoteExtra } from '@/types/accommodationExtras';
import { 
  EXTRA_CATEGORY_ICONS, 
  calculateExtraTotal, 
  calculateExtrasTotal 
} from '@/types/accommodationExtras';

interface QuoteExtrasListProps {
  quoteId: string;
  numberOfGuests: number;
  partnerId: string;
  readOnly?: boolean;
}

export function QuoteExtrasList({ quoteId, numberOfGuests, partnerId, readOnly = false }: QuoteExtrasListProps) {
  const { data: extras = [], isLoading } = useQuoteExtras(quoteId);
  const deleteExtra = useDeleteQuoteExtra();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<AccommodationQuoteExtra | null>(null);
  const [deletingExtra, setDeletingExtra] = useState<AccommodationQuoteExtra | null>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const handleDelete = async () => {
    if (!deletingExtra) return;
    
    try {
      await deleteExtra.mutateAsync({ id: deletingExtra.id, quoteId });
      toast.success('Extra verwijderd');
      setDeletingExtra(null);
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const getCategoryIcon = (category: string | null) => {
    if (!category) return '📦';
    return EXTRA_CATEGORY_ICONS[category as keyof typeof EXTRA_CATEGORY_ICONS] || '📦';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Extra diensten & arrangementen</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Laden...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Extra diensten & arrangementen</CardTitle>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Extra
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {extras.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Geen extra's toegevoegd. Voeg optionele diensten toe zoals catering, parkeren of faciliteiten.
            </p>
          ) : (
            <>
              {extras.map((extra) => (
                <div
                  key={extra.id}
                  className="flex items-start justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{getCategoryIcon(extra.category)}</span>
                      <span className="font-medium">{extra.name}</span>
                    </div>
                    {extra.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {extra.description}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {extra.pricing_type === 'fixed' ? (
                        <>Vast bedrag: {formatPrice(extra.unit_price)}</>
                      ) : (
                        <>
                          {formatPrice(extra.unit_price)} p.p. × {extra.quantity} = {formatPrice(calculateExtraTotal(extra))}
                        </>
                      )}
                    </p>
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingExtra(extra)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingExtra(extra)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm font-medium">Subtotaal extra's</span>
                <span className="font-semibold">{formatPrice(calculateExtrasTotal(extras))}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <AddQuoteExtraDialog
        open={addDialogOpen || !!editingExtra}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setEditingExtra(null);
          }
        }}
        quoteId={quoteId}
        numberOfGuests={numberOfGuests}
        partnerId={partnerId}
        editingExtra={editingExtra}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingExtra} onOpenChange={() => setDeletingExtra(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extra verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{deletingExtra?.name}" wilt verwijderen?
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
}
