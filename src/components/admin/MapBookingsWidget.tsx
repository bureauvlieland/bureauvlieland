import { useMapBookings } from "@/hooks/useMapActivities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";

export const MapBookingsWidget = () => {
  const { data: bookings, isLoading } = useMapBookings(5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            MAP Boekingen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!bookings || bookings.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Ticket className="h-4 w-4" />
          Recente MAP boekingen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {bookings.map((booking: any) => (
            <div
              key={booking.id}
              className="flex items-center justify-between p-2.5 rounded-lg border"
            >
              <div>
                <p className="font-medium text-sm">{booking.activity_name}</p>
                <p className="text-xs text-muted-foreground">
                  {booking.customer_name} · {booking.number_of_adults + booking.number_of_children} pers.
                  {booking.partners?.name && ` · ${booking.partners.name}`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <Badge
                  variant={booking.booking_status === "confirmed" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {booking.booking_status === "confirmed"
                    ? "Bevestigd"
                    : booking.booking_status === "failed"
                    ? "Mislukt"
                    : booking.booking_status}
                </Badge>
                <p className="text-xs text-muted-foreground mt-0.5">
                  € {Number(booking.commission_amount).toFixed(2).replace(".", ",")} commissie
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
