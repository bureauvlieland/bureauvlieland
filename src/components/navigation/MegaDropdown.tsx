import { Link } from "react-router-dom";

interface NavItem {
  label: string;
  href: string;
  highlight?: boolean;
}

interface MegaDropdownProps {
  onNavigate?: () => void;
}

const voorBedrijvenItems: NavItem[] = [
  { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland", highlight: true },
  { label: "Meerdaags bedrijfsuitje", href: "/meerdaags-bedrijfsuitje-vlieland" },
  { label: "Teambuilding", href: "/teamuitje-vlieland" },
  { label: "Heisessie", href: "/heisessie-vlieland" },
  { label: "Zakelijk evenement", href: "/zakelijk-evenement-vlieland" },
  { label: "Incentive reis", href: "/incentive-reis-vlieland" },
];

const voorPriveItems: NavItem[] = [
  { label: "Trouwen op Vlieland", href: "/trouwen-op-vlieland" },
  { label: "Groepsweekend", href: "/groepsweekend-vlieland" },
  { label: "Jubileum vieren", href: "/jubileum-vlieland" },
  { label: "Familieweekend", href: "/familieweekend-vlieland" },
];

const extraItems: NavItem[] = [
  { label: "Diensten", href: "/diensten" },
  { label: "Catering", href: "/catering" },
  { label: "Evenementen", href: "/evenementen" },
];

export const MegaDropdown = ({ onNavigate }: MegaDropdownProps) => {
  return (
    <div className="grid grid-cols-2 gap-6 p-6 min-w-[480px]">
      {/* Column 1: Voor bedrijven */}
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

      {/* Column 2: Voor privé */}
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

      {/* Bottom row: Extra services */}
      <div className="col-span-2 border-t border-border pt-3 flex gap-4">
        {extraItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export const navItems = {
  voorBedrijvenItems,
  voorPriveItems,
  extraItems,
};
