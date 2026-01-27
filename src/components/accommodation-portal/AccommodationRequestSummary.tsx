import { format, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Calendar, Users, Building2, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { AccommodationRequest } from '@/types/accommodation';
import { ACCOMMODATION_TYPES, LOCATION_PREFERENCES } from '@/types/accommodation';

interface AccommodationRequestSummaryProps {
  request: AccommodationRequest;
}

export function AccommodationRequestSummary({ request }: AccommodationRequestSummaryProps) {
  const arrivalDate = new Date(request.arrival_date);
  const departureDate = new Date(request.departure_date);
  const nights = differenceInDays(departureDate, arrivalDate);

  const accommodationType = ACCOMMODATION_TYPES.find((t) => t.value === request.accommodation_type);
  
  const locationLabels = request.location_preference
    .map((loc) => LOCATION_PREFERENCES.find((l) => l.value === loc)?.label)
    .filter(Boolean);

  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">
                {format(arrivalDate, 'd MMMM', { locale: nl })} - {format(departureDate, 'd MMMM yyyy', { locale: nl })}
              </p>
              <p className="text-sm text-muted-foreground">
                {nights} {nights === 1 ? 'nacht' : 'nachten'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">{request.number_of_guests} gasten</p>
              {request.room_count && (
                <p className="text-sm text-muted-foreground">
                  {request.room_count} kamers gewenst
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">
                {accommodationType?.icon} {accommodationType?.label || 'Geen voorkeur'}
              </p>
              <p className="text-sm text-muted-foreground">
                {accommodationType?.description}
              </p>
            </div>
          </div>

          {locationLabels.length > 0 && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Locatievoorkeur</p>
                <p className="text-sm text-muted-foreground">
                  {locationLabels.join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>

        {request.special_requests && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Bijzondere wensen:</span>{' '}
              {request.special_requests}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
