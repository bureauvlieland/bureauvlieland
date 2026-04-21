import { Button } from "@/components/ui/button";
import { Menu, ChevronDown, Phone } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MegaDropdown, navItems } from "./navigation/MegaDropdown";
import { MobileNav } from "./navigation/MobileNav";

const programmasItems = [
  { label: "Voorbeeldprogramma's", href: "/voorbeeldprogrammas" },
  { label: "Bouwstenen", href: "/bouwstenen" },
  { label: "Aangesloten partners", href: "/partners" },
];

// All hrefs covered by the MegaDropdown
const megaDropdownHrefs = [
  ...navItems.voorBedrijvenItems.map((i) => i.href),
  ...navItems.voorPriveItems.map((i) => i.href),
  ...navItems.extraItems.map((i) => i.href),
];

const programmasHrefs = programmasItems.map((i) => i.href);

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

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMegaOpen, setIsMegaOpen] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const megaClass = useNavItemClass(megaDropdownHrefs);
  const logiesClass = useSingleNavClass("/logies-vlieland");
  const programmasClass = useNavItemClass(programmasHrefs);
  const overOnsClass = useSingleNavClass("/over-ons");
  const contactClass = useSingleNavClass("/contact");

  const openMega = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setIsMegaOpen(true);
  }, []);

  const closeMega = useCallback(() => {
    closeTimer.current = setTimeout(() => setIsMegaOpen(false), 150);
  }, []);

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
            <div className="hidden lg:flex items-center gap-4">
              {/* Ons aanbod - Mega Dropdown (hover) */}
              <div
                ref={megaRef}
                className="relative"
                onMouseEnter={openMega}
                onMouseLeave={closeMega}
              >
                <button
                  onClick={() => setIsMegaOpen((v) => !v)}
                  className={`${megaClass} flex items-center gap-1`}
                >
                  Ons aanbod
                  <ChevronDown className={`h-4 w-4 transition-transform ${isMegaOpen ? "rotate-180" : ""}`} />
                </button>
                {isMegaOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-card border border-border rounded-lg shadow-lg z-50">
                    <MegaDropdown onNavigate={() => setIsMegaOpen(false)} />
                  </div>
                )}
              </div>

              {/* Logies */}
              <Link to="/logies-vlieland" className={logiesClass}>
                Logies
              </Link>

              {/* Programma's Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className={`${programmasClass} flex items-center gap-1`}>
                  Programma's <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-card border-border min-w-[200px]">
                  {programmasItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link to={item.href} className="cursor-pointer">
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Over ons */}
              <Link to="/over-ons" className={overOnsClass}>
                Over ons
              </Link>

              {/* Contact */}
              <Link to="/contact" className={contactClass}>
                Contact
              </Link>

              {/* Phone link */}
              <a
                href="tel:0562700208"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden xl:inline">0562 700 208</span>
              </a>

              {/* CTA */}
              <Link to="/programma-samenstellen">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Vraag uw offerte aan
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
