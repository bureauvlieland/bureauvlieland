import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ForWho = () => {
  return (
    <section id="voor-wie" className="py-16 sm:py-20 lg:py-24 bg-accent-soft">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Voor wie wij werken
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            We werken voor groepen die begrijpen dat een goede dag of een goed weekend op Vlieland ontstaat door regie,
            ervaring en lokale kennis. Niet voor iedereen – wel voor groepen waarbij kwaliteit centraal staat.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl mb-3">Groepen waar wij goed bij passen</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Zakelijke teams (teamdagen, heidagen, meerdaagse retreats)
                </li>
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Organisaties met een duidelijk doel of thema voor hun programma
                </li>
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Familie- en vriendengroepen die kwaliteit boven "zo goedkoop mogelijk" zetten
                </li>
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Groepen die één regiepartij willen voor programma, regie en catering
                </li>
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Programma's met een realistisch budget waarin een bureaufee logisch past
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl mb-3">Wat wij bewust niet doen</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-3">
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Losse excursies of standaard dagjes uit
                </li>
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Alleen "even wat leuks regelen" zonder regierol
                </li>
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Jacht op de laagste prijs zonder oog voor kwaliteit
                </li>
                <li className="text-sm text-foreground pl-4 relative">
                  <span className="absolute left-0">–</span>
                  Massaprogramma's die niet passen bij de schaal van Vlieland
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                In die gevallen is het sneller en voordeliger om rechtstreeks te boeken bij ondernemers op Vlieland.
                Dat adviseren we dan ook gewoon.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
