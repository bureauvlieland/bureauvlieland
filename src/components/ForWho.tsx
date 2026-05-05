import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Briefcase, Building2, ArrowRight, Handshake, Target, Sparkles, Shield, Compass, CheckCircle2, Info } from "lucide-react";

export const ForWho = () => {
  return (
    <>
      {/* Intro Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-accent-soft relative overflow-hidden">
        <div className="absolute top-10 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
          <div className="mb-12 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Voor wie wij werken
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We werken voor groepen die begrijpen dat een goede dag of een goed weekend op Vlieland ontstaat door
              goede voorbereiding, ervaring en de juiste lokale partners. Groepen waarbij kwaliteit centraal staat.
            </p>
          </div>

          {/* Positief blok - prominent */}
          <div className="mb-8">
            <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl">Dit is waar wij goed in zijn</CardTitle>
                </div>
                <p className="text-muted-foreground text-sm">
                  Wij werken het beste met groepen die deze waarden delen
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-background/80 border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Zakelijke teams</h4>
                      <p className="text-sm text-muted-foreground">Teamdagen, heidagen en meerdaagse retreats met een helder doel</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-background/80 border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Compass className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Duidelijke doelen</h4>
                      <p className="text-sm text-muted-foreground">Organisaties met een helder thema of doel voor hun programma</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-background/80 border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Volledige ontzorging</h4>
                      <p className="text-sm text-muted-foreground">Eén partij, één factuur — programma, begeleiding én catering geregeld</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-background/80 border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Kwaliteitsbewust</h4>
                      <p className="text-sm text-muted-foreground">Een realistisch budget waarin lokale kwaliteit past</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Negatief blok - compact en subtiel */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/30">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Goed om te weten:</span> Wij nemen bewust geen losse excursies of standaard dagjes uit aan. 
                Voor eenvoudige arrangementen of als budget leidend is, adviseren wij rechtstreeks contact op te nemen met ondernemers op Vlieland.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bedrijven & Teams Section */}
      <section id="bedrijven" className="py-16 sm:py-20 lg:py-24 bg-background scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-primary uppercase tracking-wide">Doelgroep</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-6">
                Bedrijven & teams
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Voor bedrijven en teams die meer willen dan een standaard uitje. Of het nu gaat om een eendaags 
                teamuitje, een tweedaagse met overnachting of een complete bedrijfsreis – wij zorgen voor een 
                programma dat past bij jullie team en doelstellingen.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Teambuilding met échte impact op samenwerking</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Volledig ontzorgd: van boot tot borrel</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Flexibele programma's voor kleine en grote teams</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Professionele begeleiding op de dag zelf</span>
                </li>
              </ul>
              <div className="flex flex-wrap gap-4">
                <Link to="/bedrijfsuitje-vlieland">
                  <Button>
                    Bekijk bedrijfsuitjes
                  </Button>
                </Link>
                <Link to="/teamuitje-vlieland">
                  <Button variant="outline">
                    Teamuitje organiseren
                  </Button>
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <Card className="border-border">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2">Ideaal voor</h3>
                  <p className="text-sm text-muted-foreground">
                    Afdelingen, projectteams, volledige organisaties, startups en scale-ups die investeren in hun mensen.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2">Populaire formats</h3>
                  <p className="text-sm text-muted-foreground">
                    Eendaagse teamdagen, tweedaagse met overnachting, kick-offs en afsluitingen, 
                    seizoensuitjes en jubilea.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2">Groepsgrootte</h3>
                  <p className="text-sm text-muted-foreground">
                    Van 10 tot 150 personen. Voor grotere groepen overleggen we graag over de mogelijkheden.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Management & Directie Section */}
      <section id="management" className="py-16 sm:py-20 lg:py-24 bg-accent-soft scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 space-y-4">
              <Card className="border-border">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2">Focus & verdieping</h3>
                  <p className="text-sm text-muted-foreground">
                    Weg van de waan van de dag. Op Vlieland is er ruimte om écht na te denken, 
                    zonder onderbrekingen of afleidingen.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2">Discretie & kwaliteit</h3>
                  <p className="text-sm text-muted-foreground">
                    Exclusieve locaties, hoogwaardige catering en volledige privacy. 
                    Alles afgestemd op de verwachtingen van directieniveau.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2">Flexibele invulling</h3>
                  <p className="text-sm text-muted-foreground">
                    Van puur werkinhoudelijke sessies tot programma's met ruimte voor ontspanning en verbinding.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-primary uppercase tracking-wide">Doelgroep</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-6">
                Management & directie
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Voor directieteams, managementgroepen en besturen die in alle rust willen werken aan 
                strategie, visie of onderlinge samenwerking. Vlieland biedt de perfecte afzondering 
                voor heisessies en strategiedagen.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Strategiesessies zonder onderbrekingen</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">MT-dagen met ruimte voor reflectie</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Visietrajecten in een inspirerende omgeving</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Bestuursvergaderingen met toegevoegde waarde</span>
                </li>
              </ul>
              <div className="flex flex-wrap gap-4">
                <Link to="/heisessie-vlieland">
                  <Button>
                    Heisessie organiseren
                  </Button>
                </Link>
                <Link to="/meerdaags-bedrijfsuitje-vlieland">
                  <Button variant="outline">
                    Meerdaags programma
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Organisaties & Instellingen Section */}
      <section id="organisaties" className="py-16 sm:py-20 lg:py-24 bg-background scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-primary uppercase tracking-wide">Doelgroep</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-6">
                Organisaties & instellingen
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Voor zorginstellingen, onderwijsorganisaties, overheden, stichtingen en verenigingen 
                die een bijzonder programma zoeken. Wij begrijpen de specifieke context en verwachtingen 
                van non-profit en publieke organisaties.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Programma's passend bij maatschappelijke doelen</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Ervaring met grotere en diverse groepen</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Transparante prijsopbouw voor aanbestedingen</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Aandacht voor inclusiviteit en toegankelijkheid</span>
                </li>
              </ul>
              <div className="flex flex-wrap gap-4">
                <Link to="/zakelijk-evenement-vlieland">
                  <Button>
                    Evenement organiseren
                  </Button>
                </Link>
                <Link to="/programma-op-maat">
                  <Button variant="outline">
                    Liever maatwerk?
                  </Button>
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <Card className="border-border">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2">Voorbeelden</h3>
                  <p className="text-sm text-muted-foreground">
                    Ziekenhuizen, scholen, gemeenten, provincies, zorginstellingen, 
                    woningcorporaties, brancheverenigingen en goede doelen.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2">Type programma's</h3>
                  <p className="text-sm text-muted-foreground">
                    Teamdagen, personeelsuitjes, vrijwilligersdagen, bestuursweekenden, 
                    congressen en netwerkbijeenkomsten.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2">Onze aanpak</h3>
                  <p className="text-sm text-muted-foreground">
                    Altijd in overleg, met oog voor budget, samenstelling van de groep 
                    en de specifieke wensen van jullie organisatie.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Evenementenbureaus & Trainers Section */}
      <section id="partners" className="py-16 sm:py-20 lg:py-24 bg-accent-soft scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 space-y-4">
              <Card className="border-border">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2">Lokale logistiek</h3>
                  <p className="text-sm text-muted-foreground">
                    Accommodatiebeheer, reserveringen, transport op het eiland, 
                    fietsen en materiaalverhuur – wij regelen het.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2">Catering & horeca</h3>
                  <p className="text-sm text-muted-foreground">
                    Van ontbijt tot diner, van strandborrel tot walking dinner. 
                    Onze cateringpartners kennen het eiland en leveren kwaliteit.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2">White-label uitvoering</h3>
                  <p className="text-sm text-muted-foreground">
                    Jullie naam, onze handen. Wij werken op de achtergrond 
                    zodat jullie relatie met de klant centraal blijft.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Handshake className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-primary uppercase tracking-wide">Samenwerking</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-6">
                Evenementenbureaus & trainers
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Wil je als evenementenbureau, trainer of coach jouw klanten of deelnemers naar 
                Vlieland brengen? Bureau Vlieland is je betrouwbare lokale partner. Wij leveren 
                de kennis, logistiek en uitvoering – jullie de inhoud en de klant.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Lokale kennis van locaties, leveranciers en mogelijkheden</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Coördinatie en begeleiding op de dag zelf</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Geen overhead van eigen kantoor op het eiland nodig</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Flexibele samenwerking: per project of structureel</span>
                </li>
              </ul>
              <div className="flex flex-wrap gap-4">
                <Link to="/samenwerken">
                  <Button>
                    Ontdek samenwerking
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline">
                    Neem contact op
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
