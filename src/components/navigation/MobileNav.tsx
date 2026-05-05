import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navItems } from "./MegaDropdown";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MobileNavProps {
  onClose: () => void;
}

export const MobileNav = ({ onClose }: MobileNavProps) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>("programmas");
  const { pathname } = useLocation();

  const toggle = (key: string) =>
    setOpenDropdown(openDropdown === key ? null : key);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const isGroupActive = (hrefs: string[]) => hrefs.some((h) => isActive(h));

  const topLevelClass = (active: boolean) =>
    `text-base font-medium transition-colors ${active ? "text-primary" : "text-foreground"}`;

  const subItemClass = (href: string) =>
    `block py-2.5 text-sm transition-colors ${isActive(href) ? "text-primary font-medium" : "text-muted-foreground"}`;

  const voorWieHrefs = [
    ...navItems.voorBedrijvenItems.map((i) => i.href),
    ...navItems.voorPriveItems.map((i) => i.href),
  ];

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="flex flex-col gap-1 py-6 px-2">
        {/* Primary CTA */}
        <div className="px-2 mb-6">
          <Link to="/programma-samenstellen" onClick={onClose}>
            <Button
              variant="default"
              className="bg-accent text-accent-foreground hover:bg-accent/90 w-full"
            >
              Stel zelf uw programma samen
            </Button>
          </Link>
        </div>

        {/* Programma's */}
        <div className="px-2">
          <button
            onClick={() => toggle("programmas")}
            className={`flex items-center justify-between w-full py-3 ${topLevelClass(false)}`}
          >
            <span>Programma's</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === "programmas" ? "rotate-180" : ""}`} />
          </button>
          {openDropdown === "programmas" && (
            <div className="pl-4 pb-2 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Begin hier
                </p>
                {navItems.beginHier.map((item) => (
                  <Link key={item.href} to={item.href} onClick={onClose} className={subItemClass(item.href)}>
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-border pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Verken het aanbod
                </p>
                {navItems.verkenItems.map((item) => (
                  <Link key={item.href} to={item.href} onClick={onClose} className={subItemClass(item.href)}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Overnachten */}
        <Link
          to="/logies-vlieland"
          onClick={onClose}
          className={`px-2 py-3 ${topLevelClass(isActive("/logies-vlieland"))}`}
        >
          Overnachten
        </Link>

        {/* Voor wie */}
        <div className="px-2">
          <button
            onClick={() => toggle("voorwie")}
            className={`flex items-center justify-between w-full py-3 ${topLevelClass(isGroupActive(voorWieHrefs))}`}
          >
            <span>Voor wie</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === "voorwie" ? "rotate-180" : ""}`} />
          </button>
          {openDropdown === "voorwie" && (
            <div className="pl-4 pb-2 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Voor bedrijven
                </p>
                {navItems.voorBedrijvenItems.map((item) => (
                  <Link key={item.href} to={item.href} onClick={onClose} className={subItemClass(item.href)}>
                    {item.label}
                  </Link>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Voor privé
                </p>
                {navItems.voorPriveItems.map((item) => (
                  <Link key={item.href} to={item.href} onClick={onClose} className={subItemClass(item.href)}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Over ons */}
        <div className="px-2">
          <button
            onClick={() => toggle("overons")}
            className={`flex items-center justify-between w-full py-3 ${topLevelClass(isGroupActive(navItems.overOnsItems.map((i) => i.href)))}`}
          >
            <span>Over ons</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === "overons" ? "rotate-180" : ""}`} />
          </button>
          {openDropdown === "overons" && (
            <div className="pl-4 pb-2">
              {navItems.overOnsItems.map((item) => (
                <Link key={item.href} to={item.href} onClick={onClose} className={subItemClass(item.href)}>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sitemap link */}
        <Link
          to="/sitemap"
          onClick={onClose}
          className="px-2 py-3 text-sm text-muted-foreground"
        >
          Sitemap
        </Link>
      </div>
    </ScrollArea>
  );
};
