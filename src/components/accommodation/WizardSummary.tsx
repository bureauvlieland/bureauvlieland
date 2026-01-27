import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Home, MapPin, Euro } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import type { AccommodationWizardData } from "@/types/accommodation";
import { ACCOMMODATION_TYPES, LOCATION_PREFERENCES, BUDGET_RANGES } from "@/types/accommodation";

interface WizardSummaryProps {
  formData: AccommodationWizardData;
  currentStep: number;
}

export const WizardSummary = ({ formData, currentStep }: WizardSummaryProps) => {
  const nights = formData.arrival_date && formData.departure_date
    ? differenceInDays(formData.departure_date, formData.arrival_date)
    : 0;

  const accommodationType = ACCOMMODATION_TYPES.find(t => t.value === formData.accommodation_type);
  const budgetLabel = BUDGET_RANGES.find(b => b.value === formData.budget_range)?.label;
  const locationLabels = formData.location_preference
    .map(loc => LOCATION_PREFERENCES.find(l => l.value === loc)?.label)
    .filter(Boolean);

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          📋 Uw aanvraag
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dates */}
        {formData.arrival_date && formData.departure_date && (
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {format(formData.arrival_date, "d MMM", { locale: nl })} - {format(formData.departure_date, "d MMM yyyy", { locale: nl })}
              </p>
              <p className="text-xs text-muted-foreground">
                {nights} {nights === 1 ? "nacht" : "nachten"}
              </p>
            </div>
          </div>
        )}

        {/* Guests */}
        {formData.number_of_guests > 0 && (
          <div className="flex items-start gap-3">
            <Users className="w-4 h-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{formData.number_of_guests} personen</p>
              {currentStep >= 3 && formData.room_count > 0 && (
                <p className="text-xs text-muted-foreground">
                  ±{formData.room_count} kamers
                </p>
              )}
            </div>
          </div>
        )}

        {/* Accommodation Type */}
        {currentStep >= 2 && accommodationType && (
          <div className="flex items-start gap-3">
            <Home className="w-4 h-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {accommodationType.icon} {accommodationType.label}
              </p>
            </div>
          </div>
        )}

        {/* Location */}
        {currentStep >= 4 && locationLabels.length > 0 && (
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Locatie</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {locationLabels.map((label, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Budget */}
        {currentStep >= 4 && budgetLabel && (
          <div className="flex items-start gap-3">
            <Euro className="w-4 h-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{budgetLabel}</p>
            </div>
          </div>
        )}

        {/* Facilities */}
        {currentStep >= 4 && formData.facilities_required.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Gewenste faciliteiten:</p>
            <div className="flex flex-wrap gap-1">
              {formData.facilities_required.slice(0, 4).map((facility, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {facility}
                </Badge>
              ))}
              {formData.facilities_required.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{formData.facilities_required.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Contact info preview */}
        {currentStep >= 5 && formData.customer_name && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Contactpersoon:</p>
            <p className="text-sm font-medium">{formData.customer_name}</p>
            {formData.customer_company && (
              <p className="text-xs text-muted-foreground">{formData.customer_company}</p>
            )}
          </div>
        )}

        {/* Price hint */}
        <div className="pt-3 mt-3 border-t bg-muted/30 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
          <p className="text-xs text-muted-foreground">
            💡 Gemiddelde prijs op Vlieland: €75 - €120 p.p.p.n.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
