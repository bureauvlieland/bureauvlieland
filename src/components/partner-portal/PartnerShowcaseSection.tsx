import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SHOWCASE_PARTNER_NAME_PATTERNS } from "@/lib/partnerShowcase";

interface ShowcasePartner {
  id: string;
  name: string;
  image_url: string | null;
  about_text: string | null;
  partner_type: string | null;
}

export const PartnerShowcaseSection = () => {
  const [partners, setPartners] = useState<ShowcasePartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const orFilter = SHOWCASE_PARTNER_NAME_PATTERNS.map(
        (p) => `name.ilike.%${p}%`,
      ).join(",");
      const { data } = await supabase
        .from("partners_public")
        .select("id, name, image_url, about_text, partner_type")
        .or(orFilter)
        .eq("is_public", true)
        .limit(4);
      setPartners((data ?? []) as ShowcasePartner[]);
      setIsLoading(false);
    })();
  }, []);

  if (isLoading || partners.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Zo doen anderen het
        </h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Deze partners hebben hun profiel en aanbod compleet ingevuld. Bekijk hoe zij
        zich presenteren — het is een goede maatstaf voor uw eigen pagina.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {partners.map((p) => (
          <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex">
              <div className="w-28 h-28 shrink-0 bg-muted">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-display text-muted-foreground">
                    {p.name.charAt(0)}
                  </div>
                )}
              </div>
              <CardContent className="p-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    voorbeeld
                  </Badge>
                </div>
                {p.about_text && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {p.about_text}
                  </p>
                )}
                <a
                  href={`/partners`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  Bekijk publieke pagina
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};
