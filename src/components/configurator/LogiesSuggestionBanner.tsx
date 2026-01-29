import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bed } from "lucide-react";

interface LogiesSuggestionBannerProps {
  isVisible: boolean;
}

export const LogiesSuggestionBanner = ({ isVisible }: LogiesSuggestionBannerProps) => {
  if (!isVisible) return null;

  return (
    <div className="bg-accent/50 border border-accent rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <Bed className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-foreground text-sm">
            Meerdaags verblijf geselecteerd
          </p>
          <p className="text-sm text-muted-foreground">
            Wilt u dat wij ook passende logies voor uw groep regelen?
          </p>
        </div>
      </div>
      <Link to="/logies-aanvragen" className="shrink-0">
        <Button variant="outline" size="sm">
          Logies laten regelen
        </Button>
      </Link>
    </div>
  );
};
