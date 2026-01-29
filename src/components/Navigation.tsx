import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);

  const toggleMobileDropdown = (dropdown: string) => {
    setOpenMobileDropdown(openMobileDropdown === dropdown ? null : dropdown);
  };

  const voorBedrijvenItems = [
    { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland", highlight: true },
    { label: "Meerdaags bedrijfsuitje", href: "/meerdaags-bedrijfsuitje-vlieland" },
    { label: "Teambuilding", href: "/teamuitje-vlieland" },
    { label: "Heisessie", href: "/heisessie-vlieland" },
    { label: "Zakelijk evenement", href: "/zakelijk-evenement-vlieland" },
    { label: "Incentive reis", href: "/incentive-reis-vlieland" },
  ];

  const priveItems = [
    { label: "Trouwen op Vlieland", href: "/trouwen-op-vlieland" },
    { label: "Groepsweekend", href: "/groepsweekend-vlieland" },
    { label: "Jubileum vieren", href: "/jubileum-vlieland" },
    { label: "Familieweekend", href: "/familieweekend-vlieland" },
  ];

  const overOnsItems = [
    { label: "Over Bureau Vlieland", href: "/over-ons" },
    { label: "Samenwerken", href: "/samenwerken" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-to-content">
        Ga naar hoofdinhoud
      </a>
      
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="hover:opacity-80 transition-opacity"
          >
            <img src={logo} alt="Bureau Vlieland" className="h-12 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-5">
            {/* Voor bedrijven Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1">
                Voor bedrijven <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border min-w-[220px]">
                {voorBedrijvenItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link 
                      to={item.href} 
                      className={`cursor-pointer ${item.highlight ? 'font-semibold text-foreground' : ''}`}
                    >
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Privé & Trouwen Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Voor privé & trouwen <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border min-w-[200px]">
                {priveItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link to={item.href} className="cursor-pointer">
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Direct links */}
            <Link
              to="/programma-samenstellen"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Programma samenstellen
            </Link>

            <Link
              to="/logies-vlieland"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Logies
            </Link>

            {/* Over ons Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Over ons <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border min-w-[180px]">
                {overOnsItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link to={item.href} className="cursor-pointer">
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Right side buttons */}
            <Link to="/contact">
              <Button
                variant="outline"
                size="sm"
              >
                Contact
              </Button>
            </Link>
            <Link to="/programma-samenstellen">
              <Button
                variant="default"
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Programma samenstellen
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-foreground"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              {/* CTA First on Mobile */}
              <Link
                to="/programma-samenstellen"
                onClick={() => setIsMenuOpen(false)}
                className="mx-4 mb-4"
              >
                <Button
                  variant="default"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 w-full"
                >
                  Programma samenstellen
                </Button>
              </Link>

              {/* Voor bedrijven Dropdown Mobile */}
              <div className="px-4">
                <button
                  onClick={() => toggleMobileDropdown('bedrijven')}
                  className="flex items-center justify-between w-full py-2 font-semibold text-foreground"
                >
                  <span>Voor bedrijven</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openMobileDropdown === 'bedrijven' ? 'rotate-180' : ''}`} />
                </button>
                {openMobileDropdown === 'bedrijven' && (
                  <div className="pl-4 pb-2 space-y-1">
                    {voorBedrijvenItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`block py-2 text-sm transition-colors ${item.highlight ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Privé & Trouwen Dropdown Mobile */}
              <div className="px-4">
                <button
                  onClick={() => toggleMobileDropdown('prive')}
                  className="flex items-center justify-between w-full py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Voor privé & trouwen</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openMobileDropdown === 'prive' ? 'rotate-180' : ''}`} />
                </button>
                {openMobileDropdown === 'prive' && (
                  <div className="pl-4 pb-2 space-y-1">
                    {priveItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Direct links Mobile */}
              <Link
                to="/programma-samenstellen"
                onClick={() => setIsMenuOpen(false)}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Programma samenstellen
              </Link>

              <Link
                to="/logies-vlieland"
                onClick={() => setIsMenuOpen(false)}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Logies
              </Link>

              {/* Over ons Dropdown Mobile */}
              <div className="px-4">
                <button
                  onClick={() => toggleMobileDropdown('overons')}
                  className="flex items-center justify-between w-full py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Over ons</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openMobileDropdown === 'overons' ? 'rotate-180' : ''}`} />
                </button>
                {openMobileDropdown === 'overons' && (
                  <div className="pl-4 pb-2 space-y-1">
                    {overOnsItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to="/contact"
                onClick={() => setIsMenuOpen(false)}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
        )}
        </nav>
      </header>
    </>
  );
};
