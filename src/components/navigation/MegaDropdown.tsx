import { Link } from "react-router-dom";
import {
  Sparkles,
  MessageSquareHeart,
  ArrowRight,
  Compass,
  BedDouble,
  UtensilsCrossed,
  PartyPopper,
  Lightbulb,
  ClipboardList,
} from "lucide-react";

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

// "Wat we organiseren" — four categories the customer recognises.
// "Bouwstenen" lives under the customer-friendly label "Activiteiten".
const watWeOrganiserenItems: NavItem[] = [
  {
    label: "Activiteiten",
    href: "/bouwstenen",
    description: "Inspiratie: alle activiteiten op een rij",
    icon: Compass,
    highlight: true,
  },
  {
    label: "Overnachten",
    href: "/logies-vlieland",
    description: "Hotels, groepsaccommodaties en kamperen",
    icon: BedDouble,
  },
  {
    label: "Catering",
    href: "/catering",
    description: "Van lunch tot diner, op locatie of in onze horeca",
    icon: UtensilsCrossed,
  },
  {
    label: "Evenementen",
    href: "/evenementen",
    description: "Zakelijke evenementen en bijzondere gelegenheden",
    icon: PartyPopper,
  },
];

// "Inspiratie" — oriëntatie, geen directe aanvraag.
const inspiratieItems: NavItem[] = [
  {
    label: "Voorbeeldprogramma's",
    href: "/voorbeeldprogrammas",
    description: "Kant-en-klare programma's van eerdere groepen",
    icon: Sparkles,
  },
  {
    label: "Bedrijfsuitje ideeën",
    href: "/bedrijfsuitje-ideeen-vlieland",
    description: "Inspiratie voor uw volgende bedrijfsuitje",
    icon: Lightbulb,
  },
  {
    label: "Onze werkwijze",
    href: "/onze-werkwijze",
    description: "Zo werkt een aanvraag bij Bureau Vlieland",
    icon: ClipboardList,
  },
  {
    label: "Programma op maat",
    href: "/programma-op-maat",
    description: "Liever dat wij het voor u uitwerken? Vraag maatwerk aan",
    icon: MessageSquareHeart,
  },
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

const renderIconCard = (item: NavItem, onNavigate?: () => void) => {
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
};

export const ProgrammasMega = ({ onNavigate }: MegaDropdownProps) => {
  return (
    <div className="bg-card p-6 w-[420px] rounded-lg">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
        Wat we organiseren
      </h3>
      <div className="space-y-1.5">
        {watWeOrganiserenItems.map((item) => renderIconCard(item, onNavigate))}
      </div>
    </div>
  );
};

export const InspiratieDropdown = ({ onNavigate }: MegaDropdownProps) => {
  return (
    <div className="bg-card p-6 w-[420px] rounded-lg">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
        Inspiratie & oriëntatie
      </h3>
      <div className="space-y-1.5">
        {inspiratieItems.map((item) => renderIconCard(item, onNavigate))}
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
  watWeOrganiserenItems,
  inspiratieItems,
  voorBedrijvenItems,
  voorPriveItems,
  overOnsItems,
};
