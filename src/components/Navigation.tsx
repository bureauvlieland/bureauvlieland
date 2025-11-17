import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/logo.jpg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();


  return (
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
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/diensten"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Diensten
            </Link>
            <Link
              to="/voor-wie"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Voor wie
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Programma's <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border">
                <DropdownMenuItem asChild>
                  <Link to="/programmas" className="cursor-pointer">
                    Transformatieve Programma's
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/voorbeeldprogrammas" className="cursor-pointer">
                    Voorbeeldprogramma's
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              to="/catering"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Catering
            </Link>
            <Link
              to="/over-ons"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Over ons
            </Link>
            <Link to="/contact">
              <Button
                variant="default"
                className="bg-primary hover:bg-primary/90"
              >
                Contact
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-foreground"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              <Link
                to="/diensten"
                onClick={() => setIsMenuOpen(false)}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-accent-soft rounded-md transition-colors"
              >
                Diensten
              </Link>
              <Link
                to="/voor-wie"
                onClick={() => setIsMenuOpen(false)}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-accent-soft rounded-md transition-colors"
              >
                Voor wie
              </Link>
              <div className="px-4 py-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Programma's</p>
                <Link
                  to="/programmas"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent-soft rounded-md transition-colors"
                >
                  Transformatieve Programma's
                </Link>
                <Link
                  to="/voorbeeldprogrammas"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent-soft rounded-md transition-colors"
                >
                  Voorbeeldprogramma's
                </Link>
              </div>
              <Link
                to="/catering"
                onClick={() => setIsMenuOpen(false)}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-accent-soft rounded-md transition-colors"
              >
                Catering
              </Link>
              <Link
                to="/over-ons"
                onClick={() => setIsMenuOpen(false)}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-accent-soft rounded-md transition-colors"
              >
                Over ons
              </Link>
              <Link
                to="/contact"
                onClick={() => setIsMenuOpen(false)}
                className="mx-4"
              >
                <Button
                  variant="default"
                  className="bg-primary hover:bg-primary/90 w-full"
                >
                  Contact
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
