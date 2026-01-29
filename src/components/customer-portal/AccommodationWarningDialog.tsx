import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BedDouble, ArrowRight, UserCheck } from "lucide-react";

interface AccommodationWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueWithAccommodation: () => void;
  onContinueWithout: () => void;
}

export const AccommodationWarningDialog = ({
  open,
  onOpenChange,
  onContinueWithAccommodation,
  onContinueWithout,
}: AccommodationWarningDialogProps) => {
  const [selectedOption, setSelectedOption] = useState<"arrange" | "self" | null>(null);

  const handleContinue = () => {
    if (selectedOption === "arrange") {
      onContinueWithAccommodation();
    } else if (selectedOption === "self") {
      onContinueWithout();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <BedDouble className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-left">
              U heeft nog geen logies geselecteerd
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            Voor een meerdaags programma adviseren wij om eerst de accommodatie vast te leggen. 
            Wilt u dat wij dit voor u regelen?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedOption || undefined}
            onValueChange={(value) => setSelectedOption(value as "arrange" | "self")}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
              <RadioGroupItem value="arrange" id="arrange" className="mt-1" />
              <Label htmlFor="arrange" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-primary" />
                  <span className="font-medium">Logies laten regelen via Bureau Vlieland</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Wij vragen vrijblijvend offertes aan bij geschikte accommodaties.
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
              <RadioGroupItem value="self" id="self" className="mt-1" />
              <Label htmlFor="self" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Doorgaan zonder logies</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  U regelt de accommodatie zelf of heeft dit al geregeld.
                </p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedOption}
          >
            Verder
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
