import { Link } from "react-router-dom";
import { Sparkles, LayoutGrid, MessageSquareHeart, ArrowRight } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  highlight?: boolean;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface MegaDropdownProps {
  onNavigate?: () => void;
}

// "Begin hier" — 3 conversion tracks
const beginHier: NavItem[] = [
  {
    label: "Stel zelf uw programma samen",
    href: "/programma-samenstellen",
    description: "Kies activiteiten, catering en logies",
    icon: LayoutGrid,
    highlight: true,
  },
  {
    label: "Kies een voorbeeldprogramma",
    href: "/voorbeeldprogrammas",
    description: "Inspiratie van eerdere groepen",
    icon: Sparkles,
  },
  {
    label: "Programma op maat",
    href: "/programma-op-maat",
    description: "Wij stellen het voor u samen",
    icon: MessageSquareHeart,
  },
];

// "Verken het aanbod"
const verkenItems: NavItem[] = [
  { label: "Alle bouwstenen", href: "/bouwstenen" },
  { label: "Catering", href: "/catering" },
  { label: "Evenementen", href: "/evenementen" },
  { label: "Activiteiten boeken", href: "/activiteiten-boeken" },
];

// Voor wie — landings (B2B + B2C)
const voorBedrijvenItems: NavItem[] = [
  { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland", highlight: true },
  { label: "Meerdaags bedrijfsuitje", href: "/meerdaags-bedrijfsuitje-vlieland" },
  { label: "Teambuilding", href: "/teamuitje-vlieland" },
  { label: "Heisessie", href: "/heisessie-vlieland" },
  { label: "Zakelijk evenement", href: "/zakelijk-evenement-vlieland" },
  { label: "Incentive reis", href: "/incentive-reis-vlieland" },
  { label: "Bedrijfsuitje ideeën", href: "/bedrijfsuitje-ideeen-vlieland" },
];

const voorPriveItems: NavItem[] = [
  { label: "Trouwen op Vlieland", href: "/trouwen-op-vlieland" },
  { label: "Groepsweekend", href: "/groepsweekend-vlieland" },
  { label: "Jubileum vieren", href: "/jubileum-vlieland" },
  { label: "Familieweekend", href: "/familieweekend-vlieland" },
];

const overOnsItems: NavItem[] = [
  { label: "Over Bureau Vlieland", href: "/over-ons" },
  { label: "Onze werkwijze", href: "/onze-werkwijze" },
  { label: "Aangesloten partners", href: "/partners" },
  { label: "Samenwerken", href: "/samenwerken" },
  { label: "Contact", href: "/contact" },
];

export const ProgrammasMega = ({ onNavigate }: MegaDropdownProps) => {
  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-0 w-[680px] overflow-hidden rounded-lg">
      <div className="bg-card p-6">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
          Begin hier
        </h3>
        <div className="space-y-1.5">
          {beginHier.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className="group flex items-start gap-3 rounded-lg p-3 transition-all duration-150 hover:bg-primary/5 hover:translate-x-0.5"
              >
                {Icon && (
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-4 w-4" />
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-foreground leading-tight">
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </span>
                  )}
                </span>
                <ArrowRight className="h-4 w-4 mt-1 text-muted-foreground translate-x-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-muted/40 p-6 border-l border-border">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
          Verken het aanbod
        </h3>
        <div className="space-y-0.5">
          {verkenItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className="group flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <span>{item.label}</span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export const VoorWieMega = ({ onNavigate }: MegaDropdownProps) => {
  return (
    <div className="grid grid-cols-2 gap-6 p-6 min-w-[520px]">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Voor bedrijven
        </h3>
        <div className="space-y-1">
          {voorBedrijvenItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                item.highlight ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Voor privé
        </h3>
        <div className="space-y-1">
          {voorPriveItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export const OverOnsDropdown = ({ onNavigate }: MegaDropdownProps) => {
  return (
    <div className="p-2 min-w-[220px]">
      {overOnsItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          onClick={onNavigate}
          className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
};

export const navItems = {
  beginHier,
  verkenItems,
  voorBedrijvenItems,
  voorPriveItems,
  overOnsItems,
};
