import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";

export const Contact = () => {
  return (
    <section id="contact" className="py-16 sm:py-20 lg:py-24 bg-gradient-hero text-primary-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Neem Contact Op
          </h2>
          <p className="text-base sm:text-lg text-primary-foreground/90 max-w-2xl mx-auto">
            Benieuwd naar de mogelijkheden? Neem vrijblijvend contact met ons op voor een passend programma
          </p>
        </div>

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
  );
};
