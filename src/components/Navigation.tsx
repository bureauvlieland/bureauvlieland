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

  const dienstenItems = [
    { label: "Overzicht diensten", href: "/diensten", isOverview: true },
    { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland", highlight: true },
    { label: "Teamuitje Vlieland", href: "/teamuitje-vlieland" },
    { label: "Meerdaags bedrijfsuitje", href: "/meerdaags-bedrijfsuitje-vlieland" },
    { label: "Heisessie Vlieland", href: "/heisessie-vlieland" },
    { label: "Zakelijk evenement Vlieland", href: "/zakelijk-evenement-vlieland" },
    { label: "Incentive reis Vlieland", href: "/incentive-reis-vlieland" },
    { label: "Trouwen op Vlieland", href: "/trouwen-op-vlieland" },
  ];

  const voorWieItems = [
    { label: "Overzicht voor wie", href: "/voor-wie", isOverview: true },
    { label: "Bedrijven & teams", href: "/voor-wie#bedrijven" },
    { label: "Management & directie", href: "/voor-wie#management" },
    { label: "Organisaties & instellingen", href: "/voor-wie#organisaties" },
    { label: "Evenementenbureaus & trainers", href: "/voor-wie#partners" },
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
            {/* Diensten Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Diensten <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border min-w-[220px]">
                {dienstenItems.map((item, index) => (
                  <DropdownMenuItem key={item.href} asChild className={item.isOverview ? 'border-b border-border mb-1' : ''}>
                    <Link 
                      to={item.href} 
                      className={`cursor-pointer ${item.highlight ? 'font-semibold text-foreground' : ''} ${item.isOverview ? 'text-muted-foreground text-sm' : ''}`}
                    >
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Voor wie Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Voor wie <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border">
                {voorWieItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild className={item.isOverview ? 'border-b border-border mb-1' : ''}>
                    <Link to={item.href} className={`cursor-pointer ${item.isOverview ? 'text-muted-foreground text-sm' : ''}`}>
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bouwstenen - direct link */}
            <Link
              to="/bouwstenen"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Bouwstenen
            </Link>

            <Link
              to="/catering"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Catering
            </Link>
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

              {/* Diensten Dropdown Mobile */}
              <div className="px-4">
                <button
                  onClick={() => toggleMobileDropdown('diensten')}
                  className="flex items-center justify-between w-full py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Diensten</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openMobileDropdown === 'diensten' ? 'rotate-180' : ''}`} />
                </button>
                {openMobileDropdown === 'diensten' && (
                  <div className="pl-4 pb-2 space-y-1">
                    {dienstenItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`block py-2 text-sm transition-colors ${item.isOverview ? 'text-muted-foreground border-b border-border pb-3 mb-2' : ''} ${item.highlight ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Voor wie Dropdown Mobile */}
              <div className="px-4">
                <button
                  onClick={() => toggleMobileDropdown('voorwie')}
                  className="flex items-center justify-between w-full py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Voor wie</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openMobileDropdown === 'voorwie' ? 'rotate-180' : ''}`} />
                </button>
                {openMobileDropdown === 'voorwie' && (
                  <div className="pl-4 pb-2 space-y-1">
                    {voorWieItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`block py-2 text-sm transition-colors ${item.isOverview ? 'text-muted-foreground border-b border-border pb-3 mb-2' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Bouwstenen - direct link Mobile */}
              <Link
                to="/bouwstenen"
                onClick={() => setIsMenuOpen(false)}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Bouwstenen
              </Link>

              <Link
                to="/catering"
                onClick={() => setIsMenuOpen(false)}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Catering
              </Link>
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
