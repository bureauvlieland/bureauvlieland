import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => scrollToSection("hero")}
            className="text-xl font-bold tracking-wide uppercase text-primary hover:text-primary/80 transition-colors"
          >
            Bureau Vlieland
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("diensten")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Diensten
            </button>
            <button
              onClick={() => scrollToSection("programmas")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Programma's
            </button>
            <button
              onClick={() => scrollToSection("over-ons")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Over Ons
            </button>
            <Button
              onClick={() => scrollToSection("contact")}
              variant="default"
              className="bg-primary hover:bg-primary/90"
            >
              Contact
            </Button>
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
              <button
                onClick={() => scrollToSection("diensten")}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-accent-soft rounded-md transition-colors"
              >
                Diensten
              </button>
              <button
                onClick={() => scrollToSection("programmas")}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-accent-soft rounded-md transition-colors"
              >
                Programma's
              </button>
              <button
                onClick={() => scrollToSection("over-ons")}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-accent-soft rounded-md transition-colors"
              >
                Over Ons
              </button>
              <Button
                onClick={() => scrollToSection("contact")}
                variant="default"
                className="bg-primary hover:bg-primary/90"
              >
                Contact
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
