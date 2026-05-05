import { Button } from "@/components/ui/button";
import { Menu, ChevronDown } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  ProgrammasMega,
  VoorWieMega,
  OverOnsDropdown,
  navItems,
} from "./navigation/MegaDropdown";
import { MobileNav } from "./navigation/MobileNav";

const programmasHrefs = [
  "/programma-samenstellen",
  "/voorbeeldprogrammas",
  "/bouwstenen",
  "/catering",
  "/evenementen",
  "/activiteiten-boeken",
];

const voorWieHrefs = [
  ...navItems.voorBedrijvenItems.map((i) => i.href),
  ...navItems.voorPriveItems.map((i) => i.href),
];

const overOnsHrefs = navItems.overOnsItems.map((i) => i.href);

function useNavItemClass(hrefs: string[]) {
  const { pathname } = useLocation();
  const isActive = hrefs.some((h) => pathname === h || pathname.startsWith(h + "/"));
  return isActive
    ? "text-sm font-medium text-primary border-b-2 border-primary pb-0.5"
    : "text-sm text-muted-foreground hover:text-foreground transition-colors";
}

function useSingleNavClass(href: string) {
  const { pathname } = useLocation();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  return isActive
    ? "text-sm font-medium text-primary border-b-2 border-primary pb-0.5"
    : "text-sm text-muted-foreground hover:text-foreground transition-colors";
}

type DropdownKey = "programmas" | "voorwie" | "overons" | null;

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const programmasClass = useNavItemClass(programmasHrefs);
  const overnachtenClass = useSingleNavClass("/logies-vlieland");
  const voorWieClass = useNavItemClass(voorWieHrefs);
  const overOnsClass = useNavItemClass(overOnsHrefs);

  const open = useCallback((key: Exclude<DropdownKey, null>) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpenDropdown(key);
  }, []);

  const close = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 150);
  }, []);

  const renderDropdown = (
    key: Exclude<DropdownKey, null>,
    label: string,
    className: string,
    Content: React.ComponentType<{ onNavigate?: () => void }>,
  ) => (
    <div
      className="relative"
      onMouseEnter={() => open(key)}
      onMouseLeave={close}
    >
      <button
        onClick={() => setOpenDropdown(openDropdown === key ? null : key)}
        className={`${className} flex items-center gap-1`}
      >
        {label}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${openDropdown === key ? "rotate-180" : ""}`}
        />
      </button>
      {openDropdown === key && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-card border border-border rounded-lg shadow-lg z-50">
          <Content onNavigate={() => setOpenDropdown(null)} />
        </div>
      )}
    </div>
  );

  return (
    <>
      <a href="#main-content" className="skip-to-content">
        Ga naar hoofdinhoud
      </a>

      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <img src={logo} alt="Bureau Vlieland" className="h-12 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-5">
              {renderDropdown("programmas", "Programma's", programmasClass, ProgrammasMega)}

              <Link to="/logies-vlieland" className={overnachtenClass}>
                Overnachten
              </Link>

              {renderDropdown("voorwie", "Voor wie", voorWieClass, VoorWieMega)}

              {renderDropdown("overons", "Over ons", overOnsClass, OverOnsDropdown)}

              {/* CTA */}
              <Link to="/programma-samenstellen">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Stel zelf uw programma samen
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="lg:hidden p-2 text-foreground"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Navigation Sheet */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0">
          <SheetTitle className="sr-only">Navigatiemenu</SheetTitle>
          <MobileNav onClose={() => setIsMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};
