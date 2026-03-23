import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navItems } from "./MegaDropdown";
import { ScrollArea } from "@/components/ui/scroll-area";

const overOnsItems = [
  { label: "Over Bureau Vlieland", href: "/over-ons" },
  { label: "Samenwerken", href: "/samenwerken" },
  { label: "Contact", href: "/contact" },
];

const megaDropdownHrefs = [
  ...navItems.voorBedrijvenItems.map((i) => i.href),
  ...navItems.voorPriveItems.map((i) => i.href),
  ...navItems.extraItems.map((i) => i.href),
];

const overOnsHrefs = overOnsItems.map((i) => i.href);

interface MobileNavProps {
  onClose: () => void;
}

export const MobileNav = ({ onClose }: MobileNavProps) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { pathname } = useLocation();

  const toggle = (key: string) =>
    setOpenDropdown(openDropdown === key ? null : key);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const isGroupActive = (hrefs: string[]) =>
    hrefs.some((h) => isActive(h));

  const topLevelClass = (active: boolean) =>
    `text-base font-medium transition-colors ${active ? "text-primary" : "text-foreground"}`;

  const subItemClass = (href: string) =>
    `block py-2.5 text-sm transition-colors ${isActive(href) ? "text-primary font-medium" : "text-muted-foreground"}`;

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="flex flex-col gap-1 py-6 px-2">
        {/* CTA + Bel ons */}
        <div className="flex flex-col gap-2 px-2 mb-6">
          <Link to="/programma-samenstellen" onClick={onClose}>
            <Button variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90 w-full">
              Start uw programma
            </Button>
          </Link>
          <a href="tel:0562700208">
            <Button variant="outline" className="w-full gap-2">
              <Phone className="h-4 w-4" />
              0562 700 208
            </Button>
          </a>
        </div>

        {/* Ons aanbod accordion */}
        <div className="px-2">
          <button
            onClick={() => toggle("aanbod")}
            className={`flex items-center justify-between w-full py-3 ${topLevelClass(isGroupActive(megaDropdownHrefs))}`}
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
                    className={subItemClass(item.href)}
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
                    className={subItemClass(item.href)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              {navItems.extraItems.length > 0 && (
                <div className="border-t border-border pt-2">
                  {navItems.extraItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className={subItemClass(item.href)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Logies */}
        <Link
          to="/logies-vlieland"
          onClick={onClose}
          className={`px-2 py-3 ${topLevelClass(isActive("/logies-vlieland"))}`}
        >
          Logies
        </Link>

        {/* Inspiratie */}
        <Link
          to="/voorbeeldprogrammas"
          onClick={onClose}
          className={`px-2 py-3 ${topLevelClass(isActive("/voorbeeldprogrammas"))}`}
        >
          Inspiratie
        </Link>

        {/* Over ons accordion */}
        <div className="px-2">
          <button
            onClick={() => toggle("overons")}
            className={`flex items-center justify-between w-full py-3 ${topLevelClass(isGroupActive(overOnsHrefs))}`}
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
                  className={subItemClass(item.href)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
};
