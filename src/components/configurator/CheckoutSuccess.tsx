import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, ExternalLink } from "lucide-react";
import type { CartItemDetail, BuildingBlock } from "@/types/buildingBlock";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";

interface CheckoutSuccessProps {
  customerToken: string;
  cartItems: CartItemDetail[];
}

export const CheckoutSuccess = ({ customerToken, cartItems }: CheckoutSuccessProps) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();

  useEffect(() => {
    if (countdown <= 0) {
      navigate(`/mijn-programma/${customerToken}`);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, customerToken, navigate]);

  const selfArrangedBlocks = cartItems
    .map((item) => getBlockById(allBlocks, item.blockId))
    .filter((b): b is BuildingBlock => !!b && b.block_type === "self_arranged");

  return (
    <div className="max-w-lg mx-auto py-12 text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-display font-semibold mb-2">Aanvraag verzonden!</h2>
      <p className="text-muted-foreground mb-6">
        Check je inbox voor de bevestigingsmail met alle details.
      </p>

      <p className="text-sm text-muted-foreground mb-4">
        U wordt automatisch doorgestuurd naar uw programmapagina in{" "}
        <span className="font-semibold text-foreground">{countdown}</span>{" "}
        {countdown === 1 ? "seconde" : "seconden"}...
      </p>

      <Button
        onClick={() => navigate(`/mijn-programma/${customerToken}`)}
        className="gap-2"
      >
        Direct bekijken
        <ArrowRight className="h-4 w-4" />
      </Button>

      {selfArrangedBlocks.length > 0 && (
        <div className="w-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mt-8 text-left">
          <p className="font-medium text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Zelf te regelen
          </p>
          <ul className="space-y-2">
            {selfArrangedBlocks.map((block) => (
              <li key={block.id}>
                {block.external_url ? (
                  <a
                    href={block.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    → {block.name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    → {block.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
