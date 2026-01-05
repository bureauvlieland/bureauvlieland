import { Link } from "react-router-dom";

const PositioningBlock = () => {
  return (
    <section className="py-16 md:py-20 bg-muted/50 border-y border-border/50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6">
            Wat wij bewust niet doen
          </h3>
          
          <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
            <p>
              Wij organiseren geen losse excursies of standaard dagjes uit. 
              Ook nemen wij geen opdrachten aan waarbij het alleen gaat om "even iets leuks regelen", 
              zonder dat wij de regie voeren over het geheel.
            </p>
            
            <p>
              Bureau Vlieland werkt niet vanuit prijsconcurrentie en jaagt niet op de laagste prijs 
              ten koste van kwaliteit. Daarnaast organiseren wij geen massaprogramma's die niet 
              passen bij de schaal en het karakter van Vlieland.
            </p>
            
            <p>
              In situaties waarin een losse activiteit of eenvoudige reservering beter past, 
              adviseren wij juist om rechtstreeks contact op te nemen met lokale ondernemers op Vlieland. 
              Dat doen we graag en zonder voorbehoud. Lees meer over{" "}
              <Link to="/over-ons" className="text-primary hover:underline font-medium">
                wie wij zijn en hoe wij werken
              </Link>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export { PositioningBlock };
