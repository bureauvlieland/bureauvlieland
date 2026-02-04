import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

interface PartnerOnboardingStatsProps {
  total: number;
  notInvited: number;
  pendingActivation: number;
  active: number;
}

export function PartnerOnboardingStats({
  total,
  notInvited,
  pendingActivation,
  active,
}: PartnerOnboardingStatsProps) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <span className="font-medium">{total}</span>
            <span className="text-slate-500">totaal</span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-slate-400" />
            <span className="font-medium">{notInvited}</span>
            <span className="text-slate-500">niet uitgenodigd</span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="font-medium">{pendingActivation}</span>
            <span className="text-slate-500">wacht op activatie</span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-medium">{active}</span>
            <span className="text-slate-500">actief</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
