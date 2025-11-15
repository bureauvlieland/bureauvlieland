export const About = () => {
  return (
    <section id="over-ons" className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-center">
            Over Bureau Vlieland
          </h2>
          <div className="space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
            <p>
              Bureau Vlieland is gespecialiseerd in het organiseren van professionele groepsevenementen op het prachtige 
              Waddeneiland Vlieland. Onder leiding van Erwin Soolsma brengen we jarenlange ervaring en lokale kennis samen 
              om unieke programma's te creëren.
            </p>
            <p>
              Of het nu gaat om een eendaagse teambuilding, een meerdaags incentive programma of een zakelijke bijeenkomst 
              met bijzondere catering - wij verzorgen de complete organisatie. Van de eerste planning tot en met de uitvoering 
              ter plaatse, met aandacht voor detail en persoonlijke service.
            </p>
            <p>
              Door onze sterke banden met lokale ondernemers, gidsen en cateraars kunnen we authentieke ervaringen bieden 
              die het unieke karakter van Vlieland perfect weerspiegelen. Elk programma wordt op maat gemaakt en afgestemd 
              op uw specifieke wensen en doelstellingen.
            </p>
          </div>
          
          <div className="mt-12 p-8 bg-accent-soft rounded-xl border border-border">
            <h3 className="text-2xl font-bold text-foreground mb-4">Wat maakt ons uniek?</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>Lokale expertise en jarenlange ervaring op Vlieland</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>Complete ontzorging van A tot Z</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>Samenwerking met de beste lokale partners</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>Programma's op maat voor elk budget en groepsgrootte</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
