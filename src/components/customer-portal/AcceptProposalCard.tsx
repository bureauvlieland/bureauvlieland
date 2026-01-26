import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Check, X, Calendar, Users, Euro, Clock, Timer, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { type ProgramRequestItem } from "@/types/programRequest";
import { getBlockImage } from "@/lib/buildingBlockUtils";
import type { BuildingBlock } from "@/types/buildingBlock";

interface AcceptProposalCardProps {
  item: ProgramRequestItem;
  selectedDates: Date[];
  onAccept: (itemId: string) => Promise<boolean>;
  onCancel: (itemId: string) => Promise<boolean>;
  isLoading?: boolean;
}

export const AcceptProposalCard = ({
  item,
  selectedDates,
  onAccept,
  onCancel,
  isLoading = false,
}: AcceptProposalCardProps) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const currentDate = selectedDates[item.day_index];
  
  const imageUrl = getBlockImage({
    image_url: item.image_url,
    image_asset: item.image_asset,
  } as BuildingBlock);

  const handleAccept = async () => {
    setIsAccepting(true);
    await onAccept(item.id);
    setIsAccepting(false);
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    await onCancel(item.id);
    setIsCancelling(false);
    setShowCancelDialog(false);
  };

  return (
    <>
      <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
              <img
                src={imageUrl}
                alt={item.block_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{item.block_name}</CardTitle>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-0">
                  Wacht op jouw akkoord
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{item.provider_name}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Partner confirmation details */}
          <div className="bg-background rounded-lg p-4 space-y-3 border">
            <p className="text-sm font-medium text-foreground">
              {item.provider_name} heeft bevestigd:
            </p>
            
            <div className="grid gap-2 text-sm">
              {currentDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(currentDate, "EEEE d MMMM yyyy", { locale: nl })}</span>
                  {item.preferred_time && (
                    <span className="text-muted-foreground">om {item.preferred_time}</span>
                  )}
                </div>
              )}
              
              {item.duration && (
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span>{item.duration}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Voor uw groep</span>
              </div>
            </div>

            {/* Quoted price */}
            {item.quoted_price && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-green-600" />
                  <span className="text-xl font-bold text-green-700 dark:text-green-400">
                    €{item.quoted_price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm text-muted-foreground">(incl. BTW)</span>
                </div>
              </div>
            )}

            {/* Partner notes */}
            {item.quoted_notes && (
              <p className="text-sm text-muted-foreground italic pt-2 border-t">
                "{item.quoted_notes}"
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={handleAccept} 
              disabled={isLoading || isAccepting || isCancelling}
              className="flex-1"
            >
              {isAccepting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Akkoord
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              disabled={isLoading || isAccepting || isCancelling}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Annuleren
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Door akkoord te gaan bevestigt u de prijs en details voor deze activiteit.
          </p>
        </CardContent>
      </Card>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activiteit annuleren?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{item.block_name}" wilt annuleren? De aanbieder wordt hiervan op de hoogte gesteld.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Terug</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ja, annuleren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
