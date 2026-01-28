import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  Calendar, 
  Building2, 
  CheckCircle, 
  Clock,
  BedDouble,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";

interface CommissionItem {
  id: string;
  type: "activity" | "accommodation";
  name: string;
  customerName: string;
  customerCompany: string | null;
  date: string;
  proformaAmountExclVat: number;
  proformaCommission: number;
  proformaDeadline: string;
  commissionPercentage: number;
  quotedAmountInclVat: number;
  vatRate: number;
}

interface ConfirmCommissionCardProps {
  items: CommissionItem[];
  onConfirm: (itemId: string, type: "activity" | "accommodation", deviation?: {
    actualAmount: number;
    reason: string;
  }) => Promise<boolean>;
}

export const ConfirmCommissionCard = ({ items, onConfirm }: ConfirmCommissionCardProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationType, setConfirmationType] = useState<"confirm" | "deviation">("confirm");
  const [deviationAmount, setDeviationAmount] = useState("");
  const [deviationReason, setDeviationReason] = useState("");

  if (items.length === 0) {
    return null;
  }

  const handleSubmit = async (item: CommissionItem) => {
    setIsSubmitting(true);
    try {
      let success = false;
      if (confirmationType === "confirm") {
        success = await onConfirm(item.id, item.type);
      } else {
        const amount = parseFloat(deviationAmount);
        if (isNaN(amount) || amount <= 0) {
          return;
        }
        success = await onConfirm(item.id, item.type, {
          actualAmount: amount,
          reason: deviationReason,
        });
      }
      if (success) {
        setExpandedId(null);
        setConfirmationType("confirm");
        setDeviationAmount("");
        setDeviationReason("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDaysRemaining = (deadline: string) => {
    const days = differenceInDays(parseISO(deadline), new Date());
    return Math.max(0, days);
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          Commissie-opgave bevestigen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const isExpanded = expandedId === item.id;
          const daysRemaining = getDaysRemaining(item.proformaDeadline);

          return (
            <div 
              key={item.id} 
              className="bg-white rounded-lg border p-4"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      {item.type === "accommodation" ? (
                        <><BedDouble className="h-3 w-3" /> Logies</>
                      ) : (
                        "Activiteit"
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {item.customerCompany || item.customerName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(item.date), "d MMM yyyy", { locale: nl })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3 text-amber-600" />
                    <span className={daysRemaining <= 2 ? "text-red-600 font-medium" : "text-muted-foreground"}>
                      {daysRemaining === 0 
                        ? "Vandaag deadline" 
                        : `Nog ${daysRemaining} dag${daysRemaining !== 1 ? "en" : ""}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Deadline: {format(parseISO(item.proformaDeadline), "d MMM", { locale: nl })}
                  </p>
                </div>
              </div>

              {/* Financial summary */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Geoffreerd incl. BTW:</span>
                  </div>
                  <div className="text-right font-medium">
                    €{item.quotedAmountInclVat.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bedrag excl. BTW:</span>
                  </div>
                  <div className="text-right">
                    €{item.proformaAmountExclVat.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Commissie ({item.commissionPercentage}%):</span>
                  </div>
                  <div className="text-right font-semibold text-primary">
                    €{item.proformaCommission.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Action buttons / Form */}
              {!isExpanded ? (
                <div className="mt-4 flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setConfirmationType("confirm");
                      handleSubmit(item);
                    }}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Bedrag klopt
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setExpandedId(item.id);
                      setConfirmationType("deviation");
                    }}
                  >
                    Afwijking melden
                  </Button>
                </div>
              ) : (
                <div className="mt-4 space-y-4 border-t pt-4">
                  <RadioGroup 
                    value={confirmationType} 
                    onValueChange={(v) => setConfirmationType(v as "confirm" | "deviation")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="confirm" id={`confirm-${item.id}`} />
                      <Label htmlFor={`confirm-${item.id}`}>Bedrag klopt - geen afwijkingen</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="deviation" id={`deviation-${item.id}`} />
                      <Label htmlFor={`deviation-${item.id}`}>Werkelijk gefactureerd bedrag afwijkend</Label>
                    </div>
                  </RadioGroup>

                  {confirmationType === "deviation" && (
                    <div className="space-y-3 pl-6">
                      <div>
                        <Label htmlFor={`amount-${item.id}`}>Bedrag excl. BTW</Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                          <Input
                            id={`amount-${item.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={deviationAmount}
                            onChange={(e) => setDeviationAmount(e.target.value)}
                            placeholder="0,00"
                            className="pl-7"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`reason-${item.id}`}>Toelichting</Label>
                        <Textarea
                          id={`reason-${item.id}`}
                          value={deviationReason}
                          onChange={(e) => setDeviationReason(e.target.value)}
                          placeholder="Reden voor afwijking..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleSubmit(item)}
                      disabled={isSubmitting || (confirmationType === "deviation" && (!deviationAmount || parseFloat(deviationAmount) <= 0))}
                    >
                      Bevestigen
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setExpandedId(null);
                        setConfirmationType("confirm");
                        setDeviationAmount("");
                        setDeviationReason("");
                      }}
                    >
                      Annuleren
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
