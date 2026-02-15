import { FietsverhuurBanner } from "@/components/FietsverhuurBanner";
import { BootticketBanner } from "@/components/BootticketBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface ExtrasSectionProps {
  variant?: "default" | "compact";
}

export const ExtrasSection = ({ variant = "default" }: ExtrasSectionProps) => {
  if (variant === "compact") {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Extra's
        </h3>
        <FietsverhuurBanner variant="compact" />
        <BootticketBanner variant="compact" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Extra's
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FietsverhuurBanner />
        <BootticketBanner />
      </CardContent>
    </Card>
  );
};
