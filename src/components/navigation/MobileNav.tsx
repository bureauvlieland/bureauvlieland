import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navItems } from "./MegaDropdown";

const overOnsItems = [
  { label: "Over Bureau Vlieland", href: "/over-ons" },
  { label: "Samenwerken", href: "/samenwerken" },
  { label: "Contact", href: "/contact" },
];

interface MobileNavProps {
  onClose: () => void;
}

export const MobileNav = ({ onClose }: MobileNavProps) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggle = (key: string) =>
    setOpenDropdown(openDropdown === key ? null : key);

  return (
    <div className="lg:hidden py-4 border-t border-border">
      <div className="flex flex-col gap-2">
        {/* CTA */}
        <Link to="/programma-samenstellen" onClick={onClose} className="mx-4 mb-4">
          <Button variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90 w-full">
            Start uw programma
          </Button>
        </Link>

        {/* Bel ons */}
        <a
          href="tel:0562700208"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground"
        >
          <Phone className="h-4 w-4" />
          0562 700 208
        </a>

        {/* Ons aanbod accordion */}
        <div className="px-4">
          <button
            onClick={() => toggle("aanbod")}
            className="flex items-center justify-between w-full py-2 font-semibold text-foreground"
          >
            <span>Ons aanbod</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === "aanbod" ? "rotate-180" : ""}`} />
          </button>
          {openDropdown === "aanbod" && (
            <div className="pl-4 pb-2 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Voor bedrijven
                </p>
                {navItems.voorBedrijvenItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onClose}
                    className={`block py-2 text-sm transition-colors ${
                      item.highlight ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Voor privé
                </p>
                {navItems.voorPriveItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onClose}
                    className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-border pt-2">
                {navItems.extraItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onClose}
                    className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Logies */}
        <Link
          to="/logies-vlieland"
          onClick={onClose}
          className="text-left px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          Logies
        </Link>

        {/* Inspiratie */}
        <Link
          to="/voorbeeldprogrammas"
          onClick={onClose}
          className="text-left px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          Inspiratie
        </Link>

        {/* Over ons accordion */}
        <div className="px-4">
          <button
            onClick={() => toggle("overons")}
            className="flex items-center justify-between w-full py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Over ons</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === "overons" ? "rotate-180" : ""}`} />
          </button>
          {openDropdown === "overons" && (
            <div className="pl-4 pb-2 space-y-1">
              {overOnsItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
