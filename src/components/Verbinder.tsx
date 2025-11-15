import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import cyclingImage from "@/assets/cycling-group.jpg";

export const Verbinder = () => {
  return (
    <section id="verbinder" className="py-16 sm:py-20 lg:py-24 bg-accent-soft relative overflow-hidden">
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <img
        src={cyclingImage}
        alt="Groepsactiviteit fietsen door de natuur van Vlieland"
        className="absolute inset-0 w-full h-full object-cover opacity-5"
      />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Verbinder en liaison voor projecten op Vlieland
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            Naast programma's voor groepen werkt Bureau Vlieland ook als verbinder en liaison voor overheden, organisaties
            en initiatieven die iets op Vlieland willen realiseren. In die rol werkt Erwin op het snijvlak van eiland en beleid.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <Card className="border-border">
            <CardHeader>
              <Badge className="w-fit mb-3 bg-accent-soft text-primary border-0 uppercase tracking-widest text-xs">
                Verbinder
              </Badge>
              <CardTitle className="text-xl mb-3">Tussen eiland en beleid</CardTitle>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Erwin staat met één been in het dorp en één been in projecten en samenwerkingen rond de Waddeneilanden.
                Zo helpen we partijen elkaar te vinden en ideeën te vertalen naar werkbare plannen op Vlieland.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Betrokken bij projecten als Het Wad Gaat Om, Waddentafel en Regiodeal Waddeneilanden
                </li>
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Verbinding tussen overheden, organisaties en lokale ondernemers
                </li>
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Lokale vertaling van beleidsplannen naar haalbare acties
                </li>
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Begeleiding van initiatieven die bijdragen aan de leefbaarheid van Vlieland
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <Badge className="w-fit mb-3 bg-accent-soft text-primary border-0 uppercase tracking-widest text-xs">
                Programma's die versterken
              </Badge>
              <CardTitle className="text-xl mb-3">Niet alleen organiseren, maar ook bijdragen</CardTitle>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Voor ons is een goed programma meer dan een strak schema. Het moet kloppen voor de groep én voor
                het eiland. Daarom kiezen we voor programma's die rust, respect voor natuur en eerlijke samenwerking
                met lokale partijen centraal zetten.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Programma's die de schaal en het ritme van Vlieland respecteren
                </li>
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Ruimte voor natuur, cultuur en het echte eilandleven
                </li>
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Samenwerking met lokale gidsen, ondernemers en organisaties
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
