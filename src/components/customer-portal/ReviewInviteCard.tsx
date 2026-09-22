import { Link } from "react-router-dom";
import { MessageSquareHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Na afloop van het programma in het klantportaal (docs/plan-reviews-oogsten.md,
 * fase 4): de uitnodiging voor de eigen beoordelingspagina, of een bedankje
 * met de weg naar Google als de beoordeling al is ingevuld.
 */
interface ReviewInviteCardProps {
  reviewToken: string | null | undefined;
  /** De ingevulde beoordeling van deze klant, als die er is. */
  review: { created_at: string; google_clicked_at: string | null } | null | undefined;
}

export const ReviewInviteCard = ({ reviewToken, review }: ReviewInviteCardProps) => {
  if (!reviewToken) return null;
  const to = `/beoordeling/${reviewToken}`;
  const klaar = Boolean(review?.google_clicked_at);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <MessageSquareHeart className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">{review ? "Bedankt voor uw beoordeling" : "Hoe was het op Vlieland?"}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {review
                ? klaar
                  ? "Uw beoordeling staat bij uw programma. Dank dat u hem ook op Google deelde."
                  : "Uw beoordeling staat bij uw programma. Deelt u hem ook op Google? Dat kan vanaf uw beoordelingspagina."
                : "Twee minuten van uw tijd helpen ons beter te worden en helpen andere groepen bij hun keuze."}
            </p>
          </div>
        </div>
        {!klaar && (
          <Button asChild variant={review ? "outline" : "default"} className="shrink-0">
            <Link to={to}>{review ? "Naar uw beoordeling" : "Deel uw ervaring"}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
