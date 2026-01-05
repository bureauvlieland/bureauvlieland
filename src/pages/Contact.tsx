import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin } from "lucide-react";
import erwinImage from "@/assets/erwin-profile.jpg";
import { Helmet } from "react-helmet";

const Contact = () => {
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Contact - Bureau Vlieland</title>
        <meta name="description" content="Neem contact op met Erwin Soolsma van Bureau Vlieland voor jouw bedrijfsevenement op Vlieland. Telefonisch, per e-mail of kom langs op het eiland." />
      </Helmet>
      
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative py-16 sm:py-20 lg:py-24 bg-gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-12 lg:mb-16">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                Neem Contact Op
              </h1>
              <p className="text-lg sm:text-xl text-primary-foreground/90 max-w-2xl mx-auto">
                Benieuwd naar de mogelijkheden? Neem vrijblijvend contact met ons op voor een passend programma
              </p>
            </div>

            {/* Contact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
              <Card className="border-primary-foreground/20 bg-card/10 backdrop-blur-sm text-primary-foreground">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary-foreground/20 flex items-center justify-center mb-4">
                    <Phone className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-primary-foreground">Telefonisch</CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    <a href="tel:0562700208" className="hover:underline">
                      0562 700 208
                    </a>
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-primary-foreground/20 bg-card/10 backdrop-blur-sm text-primary-foreground">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary-foreground/20 flex items-center justify-center mb-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-primary-foreground">E-mail</CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    <a href="mailto:hallo@bureauvlieland.nl" className="hover:underline break-all">
                      hallo@bureauvlieland.nl
                    </a>
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-primary-foreground/20 bg-card/10 backdrop-blur-sm text-primary-foreground">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary-foreground/20 flex items-center justify-center mb-4">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-primary-foreground">Adres</CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    Sikkelduin 11<br />
                    8899 CG Vlieland
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="text-center mt-12">
              <Button
                size="lg"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-medium text-base px-8"
                onClick={() => window.location.href = 'mailto:hallo@bureauvlieland.nl'}
              >
                Stuur ons een bericht
              </Button>
            </div>
          </div>
        </section>

        {/* Personal Touch Section */}
        <section className="py-16 sm:py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-8 text-center">
                Je hebt te maken met Erwin
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                  <img
                    src={erwinImage}
                    alt="Erwin Soolsma, oprichter van Bureau Vlieland"
                    className="w-full h-auto rounded-xl shadow-medium object-cover aspect-[3/4]"
                    loading="lazy"
                  />
                </div>
                <div className="md:col-span-2 bg-accent-soft rounded-xl border border-border p-8">
                  <h3 className="text-2xl font-semibold text-foreground mb-4">
                    Erwin Soolsma
                  </h3>
                  <p className="text-base text-foreground leading-relaxed mb-4">
                    Ik ben geboren op Vlieland en werk al jaren op het snijvlak van ondernemen, evenementen, 
                    leefbaarheid en samenwerking op het eiland. Bureau Vlieland is mijn manier om groepen en 
                    projecten te verbinden met wat Vlieland echt te bieden heeft.
                  </p>
                  <p className="text-base text-foreground leading-relaxed mb-4">
                    Door mijn werk voor ondernemers, de lokale krant, vrijwilligersinitiatieven en projecten rond 
                    leefbaarheid heb ik een breed netwerk op Vlieland. Dat gebruik ik om programma's te maken die 
                    passen bij het dorp, de natuur en de mensen die hier wonen.
                  </p>
                  <p className="text-base text-foreground leading-relaxed">
                    Bij Bureau Vlieland ben je verzekerd van persoonlijk contact en maatwerk. Ik denk graag met 
                    je mee over het perfecte programma voor jouw groep.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
