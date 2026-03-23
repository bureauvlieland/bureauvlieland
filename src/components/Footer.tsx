import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-8">
          {/* Column 1: Logo & Contact */}
          <div className="space-y-6">
            <div>
              <img src={logo} alt="Bureau Vlieland" className="h-16 w-auto mb-4" loading="lazy" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Professionele evenementenorganisatie op het mooiste Waddeneiland van Nederland.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3">Contact</h4>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p>Sikkelduin 11, 8899 CG Vlieland</p>
                <p>
                  <a href="tel:0562700208" className="hover:text-primary transition-colors">
                    0562 700 208
                  </a>
                </p>
                <p>
                  <a href="mailto:hallo@bureauvlieland.nl" className="hover:text-primary transition-colors">
                    hallo@bureauvlieland.nl
                  </a>
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <a 
                  href="https://www.instagram.com/bureau_vlieland/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a 
                  href="https://www.facebook.com/bureauvlieland/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                  aria-label="Facebook"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Voor bedrijven */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Voor bedrijven</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/bedrijfsuitje-vlieland" className="hover:text-primary transition-colors">
                  Bedrijfsuitje Vlieland
                </Link>
              </li>
              <li>
                <Link to="/meerdaags-bedrijfsuitje-vlieland" className="hover:text-primary transition-colors">
                  Meerdaags bedrijfsuitje
                </Link>
              </li>
              <li>
                <Link to="/teamuitje-vlieland" className="hover:text-primary transition-colors">
                  Teambuilding
                </Link>
              </li>
              <li>
                <Link to="/heisessie-vlieland" className="hover:text-primary transition-colors">
                  Heisessie Vlieland
                </Link>
              </li>
              <li>
                <Link to="/zakelijk-evenement-vlieland" className="hover:text-primary transition-colors">
                  Zakelijk evenement
                </Link>
              </li>
              <li>
                <Link to="/incentive-reis-vlieland" className="hover:text-primary transition-colors">
                  Incentive reis
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Privé & trouwen */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Privé & trouwen</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/trouwen-op-vlieland" className="hover:text-primary transition-colors">
                  Trouwen op Vlieland
                </Link>
              </li>
              <li>
                <Link to="/groepsweekend-vlieland" className="hover:text-primary transition-colors">
                  Groepsweekend
                </Link>
              </li>
              <li>
                <Link to="/jubileum-vlieland" className="hover:text-primary transition-colors">
                  Jubileum vieren
                </Link>
              </li>
              <li>
                <Link to="/familieweekend-vlieland" className="hover:text-primary transition-colors">
                  Familieweekend
                </Link>
              </li>
            </ul>

            <h4 className="font-semibold text-foreground mb-4 mt-8">Over ons</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/over-ons" className="hover:text-primary transition-colors">
                  Over Bureau Vlieland
                </Link>
              </li>
              <li>
                <Link to="/samenwerken" className="hover:text-primary transition-colors">
                  Samenwerken
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Aan de slag */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Direct aan de slag</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/programma-samenstellen" className="hover:text-primary transition-colors font-medium text-foreground">
                  Programma samenstellen
                </Link>
              </li>
              <li>
                <Link to="/logies-vlieland" className="hover:text-primary transition-colors">
                  Logies regelen
                </Link>
              </li>
              <li>
                <Link to="/catering" className="hover:text-primary transition-colors">
                  Catering
                </Link>
              </li>
              <li>
                <Link to="/programma-samenstellen?mode=maatwerk" className="hover:text-primary transition-colors">
                  Maatwerk aanvragen
                </Link>
              </li>
            </ul>

            <h4 className="font-semibold text-foreground mb-4 mt-8">Online boeken</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="https://verhuur.bureauvlieland.nl/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Materiaalbeheer & verhuur
                </a>
              </li>
              <li>
                <a href="https://bureauvlieland.fietsreserveren.nl/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Fietsverhuur
                </a>
              </li>
              <li>
                <a href="https://boeking.mijnactiviteitenplanner.nl/activiteiten-vlieland" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Losse activiteiten
                </a>
              </li>
            </ul>

            <h4 className="font-semibold text-foreground mb-4 mt-8">Onze horeca</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="https://cafeboven.nl" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Café Boven
                </a>
              </li>
              <li>
                <a href="https://olivavlieland.nl" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Oliva Vlieland
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Bureau Vlieland. Alle rechten voorbehouden.</p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link to="/partner/login" className="hover:text-primary transition-colors">
                Partner Login
              </Link>
              <a 
                href="https://norisksoftware.nl/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Technologie Partner: NORISK Software
              </a>
              <Link to="/algemene-voorwaarden" className="hover:text-primary transition-colors">
                Algemene Voorwaarden
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
