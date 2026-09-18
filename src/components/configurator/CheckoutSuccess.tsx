import { ExternalLink } from "lucide-react";
import type { CartItemDetail, BuildingBlock } from "@/types/buildingBlock";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import { RESPONSE_TIME } from "@/content/promises";
import { Notice, SuccessScreen } from "@/components/system";

interface CheckoutSuccessProps {
  customerToken: string;
  cartItems: CartItemDetail[];
}

export const CheckoutSuccess = ({ customerToken, cartItems }: CheckoutSuccessProps) => {
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();

  const selfArrangedBlocks = cartItems
    .map((item) => getBlockById(allBlocks, item.blockId))
    .filter((b): b is BuildingBlock => !!b && b.block_type === "self_arranged");

  return (
    <SuccessScreen
      title="Uw aanvraag is verstuurd"
      intro={`Controleer uw inbox voor de bevestigingsmail met alle details. ${RESPONSE_TIME.sentence} Op uw programmapagina ziet u de stand van zaken en kunt u het programma nog aanpassen.`}
      primary={{ label: "Bekijk uw programmapagina", to: `/mijn-programma/${customerToken}` }}
      secondary={{ label: "Terug naar de homepage", to: "/" }}
    >
      {selfArrangedBlocks.length > 0 && (
        <Notice tone="warning" title="Zelf te regelen" icon={<ExternalLink className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />}>
          <ul className="mt-1 space-y-1">
            {selfArrangedBlocks.map((block) => (
              <li key={block.id}>
                {block.external_url ? (
                  <a
                    href={block.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-2"
                  >
                    {block.name}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : (
                  <span>{block.name}</span>
                )}
              </li>
            ))}
          </ul>
        </Notice>
      )}
    </SuccessScreen>
  );
};
