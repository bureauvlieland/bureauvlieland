import logo from "@/assets/logo.jpg";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <img src={logo} alt="Bureau Vlieland" className="h-16 w-auto mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Professionele evenementenorganisatie op het mooiste Waddeneiland van Nederland.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Contact</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Sikkelduin 11</p>
              <p>8899 CG Vlieland</p>
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
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Diensten</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Eendaagse programma's</li>
              <li>Meerdaagse events</li>
              <li>Lokale catering</li>
              <li>Teambuilding activiteiten</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Online Boeken</h4>
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
                <a href="https://linnenverhuurvlieland.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Linnenverhuur
                </a>
              </li>
              <li>
                <a href="https://boeking.mijnactiviteitenplanner.nl/activiteiten-vlieland" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Losse activiteiten
                </a>
              </li>
            </ul>
            
            <h4 className="font-semibold text-foreground mb-4 mt-6">Vakantiewoningen</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="https://voorondervlieland.nl/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Vooronder Vlieland
                </a>
              </li>
              <li>
                <a href="https://noordkaapvlieland.nl/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Noordkaap Vlieland
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Bureau Vlieland. Alle rechten voorbehouden.</p>
            <Link 
              to="/algemene-voorwaarden" 
              className="hover:text-primary transition-colors"
            >
              Algemene Voorwaarden
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
