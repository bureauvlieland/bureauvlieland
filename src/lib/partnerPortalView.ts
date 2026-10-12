import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Settings,
  Receipt,
  Package,
  BookOpen,
  BedDouble,
  UtensilsCrossed,
  DoorOpen,
  CalendarDays,
  UserCircle,
  ClipboardList,
  ScrollText,
} from "lucide-react";
import type { PartnerInfo } from "./partnerPortalContext";
import type { PartnerDashboardData } from "@/types/partner";

/** Opmaaklogica van de schil van het partnerportaal, los van de componenten (fase 1). */

/** De profielsterkte als één status (fase 1): onder 50 "kan niet" ontbreken te veel velden, onder 80 "u bent aan zet". */
export const profileStrengthTone = (score: number): "success" | "warning" | "danger" =>
  score >= 80 ? "success" : score >= 50 ? "warning" : "danger";

export type MenuItem = { title: string; url: string; icon: LucideIcon };
export type MenuGroup = { label: string; items: MenuItem[] };

/** De zijbalk per partnertype: Werk, Administratie, Account. */
export function partnerMenu(partner: Pick<PartnerInfo, "partner_type" | "map_tenant_slug">, urlSuffix: string): MenuGroup[] {
  const isActivityPartner = partner.partner_type === "activity_provider" || partner.partner_type === "both" || !partner.partner_type;
  const isAccommodationPartner = partner.partner_type === "accommodation" || partner.partner_type === "both";
  const hasMapIntegration = Boolean(partner.map_tenant_slug);

  const werk: MenuItem[] = [
    { title: "Werkbank", url: `/partner/werkbank${urlSuffix}`, icon: ClipboardList },
    { title: "Projecten", url: `/partner/projecten${urlSuffix}`, icon: LayoutDashboard },
    ...(hasMapIntegration ? [{ title: "Planning", url: `/partner/planning${urlSuffix}`, icon: CalendarDays }] : []),
    ...(isActivityPartner ? [{ title: "Aanbod", url: `/partner/aanbod${urlSuffix}`, icon: Package }] : []),
    ...(isAccommodationPartner
      ? [
          { title: "Logies", url: `/partner/logies${urlSuffix}`, icon: BedDouble },
          { title: "Kamersoorten", url: `/partner/kamersoorten${urlSuffix}`, icon: DoorOpen },
          { title: "Logies-extra's", url: `/partner/extras${urlSuffix}`, icon: UtensilsCrossed },
        ]
      : []),
  ];
  const administratie: MenuItem[] = [{ title: "Facturatie", url: `/partner/facturatie${urlSuffix}`, icon: Receipt }];
  const account: MenuItem[] = [
    { title: "Mijn profiel", url: `/partner/profiel${urlSuffix}`, icon: UserCircle },
    { title: "Instellingen", url: `/partner/instellingen${urlSuffix}`, icon: Settings },
    { title: "Handleidingen", url: `/partner/handleidingen${urlSuffix}`, icon: BookOpen },
    { title: "Afspraken", url: `/partner/afspraken${urlSuffix}`, icon: ScrollText },
  ];
  return [
    { label: "Werk", items: werk },
    { label: "Administratie", items: administratie },
    { label: "Account", items: account },
  ];
}


/** Facturen zonder pdf: onderdelen en logies samen (de banner op de werkbank). */
export const countMissingPdf = (data: PartnerDashboardData): number =>
  (data.items?.filter((i) => i.invoiced_number && !i.invoiced_file_path).length ?? 0) +
  (data.accommodationQuotes ?? []).filter((q) => q.invoiced_number && !q.invoiced_file_path).length;
