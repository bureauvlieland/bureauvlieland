import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFerryDepartures, type FerryDeparture } from "@/hooks/useFerryDepartures";
import { Ship, ArrowRight, ExternalLink, Users, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

interface FerryScheduleCardProps {
  date?: string; // ISO date string, defaults to today
  className?: string;
}

const PORT_LABELS: Record<string, string> = {
  H: "Harlingen",
  V: "Vlieland",
  T: "Terschelling",
};

function DepartureRow({ dep }: { dep: FerryDeparture }) {
  const departureTime = dep.departureTime?.slice(11, 16) || "";
  const arrivalTime = dep.arrivalTime?.slice(11, 16) || "";

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="font-mono font-semibold text-foreground w-12 text-center">{departureTime}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      <span className="font-mono text-muted-foreground w-12 text-center">{arrivalTime}</span>
      <span className="text-sm text-muted-foreground truncate flex-1">{dep.vehicleName}</span>
      {dep.via && (
        <Badge variant="outline" className="text-xs flex-shrink-0">via {dep.via}</Badge>
      )}
      {dep.remainingPersonCapacity !== null && dep.remainingPersonCapacity !== undefined && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <Users className="h-3 w-3" />
          {dep.remainingPersonCapacity}
        </span>
      )}
      {dep.isBookable === false && (
        <Badge variant="destructive" className="text-xs flex-shrink-0">Vol</Badge>
      )}
    </div>
  );
}

function RouteSection({
  from,
  to,
  date,
}: {
  from: string;
  to: string;
  date?: string;
}) {
  const { data, isLoading, error } = useFerryDepartures({ from, to, date });

  return (
    <div>
      <h4 className="text-sm font-medium text-foreground mb-2">
        {PORT_LABELS[from]} → {PORT_LABELS[to]}
      </h4>
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}
      {error && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Dienstregeling niet beschikbaar
        </p>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">Geen afvaarten gevonden</p>
      )}
      {data && data.length > 0 && (
        <div>
          {data.map((dep, i) => (
            <DepartureRow key={i} dep={dep} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FerryScheduleCard({ date, className }: FerryScheduleCardProps) {
  const displayDate = date
    ? format(parseISO(date), "EEE d MMMM", { locale: nl })
    : format(new Date(), "EEE d MMMM", { locale: nl });

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ship className="h-4 w-4" />
            Veerboot Rederij Doeksen
          </CardTitle>
          <a
            href="https://www.rederij-doeksen.nl"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              Boeken <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
        </div>
        <p className="text-sm text-muted-foreground capitalize">{displayDate}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <RouteSection from="H" to="V" date={date} />
        <RouteSection from="V" to="H" date={date} />
      </CardContent>
    </Card>
  );
}
