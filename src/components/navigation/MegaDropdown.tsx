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
  { label: "Onze werkwijze", href: "/diensten" },
  { label: "Aangesloten partners", href: "/partners" },
  { label: "Samenwerken", href: "/samenwerken" },
  { label: "Contact", href: "/contact" },
];

export const ProgrammasMega = ({ onNavigate }: MegaDropdownProps) => {
  return (
    <div className="grid grid-cols-[1.2fr_1fr] gap-6 p-6 min-w-[600px]">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Begin hier
        </h3>
        <div className="space-y-2">
          {beginHier.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className="group flex items-start gap-3 rounded-md p-3 transition-colors hover:bg-accent hover:text-accent-foreground border border-transparent hover:border-border"
              >
                {Icon && (
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                )}
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="border-l border-border pl-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Verken het aanbod
        </h3>
        <div className="space-y-1">
          {verkenItems.map((item) => (
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
