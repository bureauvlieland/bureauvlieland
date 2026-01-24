import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getBlockById, type CartItemDetail, type BuildingBlock } from "@/data/configuratorMockData";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, Clock, ArrowRight, Loader2, AlertCircle, Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface SharedProgramData {
  cart_items: CartItemDetail[];
  number_of_people: number;
  selected_date: string | null;
  created_at: string;
  expires_at: string;
}

const SharedProgram = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const { toast } = useToast();
  const { addToCart, setNumberOfPeople, setSelectedDate } = useCart();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [program, setProgram] = useState<SharedProgramData | null>(null);
  const [blocks, setBlocks] = useState<BuildingBlock[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const fetchProgram = async () => {
      if (!shareCode) {
        setError("Geen programmacode gevonden");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('shared_programs')
          .select('*')
          .eq('share_code', shareCode)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Programma niet gevonden of verlopen");
          setLoading(false);
          return;
        }

        // Type assertion for cart_items from JSONB
        const cartItemsData = data.cart_items as unknown as CartItemDetail[];
        
        setProgram({
          cart_items: cartItemsData,
          number_of_people: data.number_of_people,
          selected_date: data.selected_date,
          created_at: data.created_at,
          expires_at: data.expires_at,
        });

        // Resolve blocks
        const resolvedBlocks = cartItemsData
          .map((item) => getBlockById(item.blockId))
          .filter(Boolean) as BuildingBlock[];
        setBlocks(resolvedBlocks);
      } catch (err) {
        console.error('Error fetching shared program:', err);
        setError("Er ging iets mis bij het laden van het programma");
      } finally {
        setLoading(false);
      }
    };

    fetchProgram();
  }, [shareCode]);

  const handleImportToCart = () => {
    if (!program) return;
    
    setIsImporting(true);
    
    // Clear existing and import
    let addedCount = 0;
    program.cart_items.forEach((item) => {
      const added = addToCart(item.blockId);
      if (added) addedCount++;
    });

    setNumberOfPeople(program.number_of_people);
    if (program.selected_date) {
      setSelectedDate(new Date(program.selected_date));
    }

    setIsImporting(false);

    toast({
      title: "Programma geladen",
      description: `${addedCount} items toegevoegd aan je programma.`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Programma laden...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-2">Programma niet gevonden</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link to="/programma-samenstellen">
              <Button>
                Stel je eigen programma samen
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!program) return null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Gedeeld Programma | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navigation />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 print:mb-4">
          <h1 className="text-3xl font-display font-bold mb-2">
            Vlieland Programma
          </h1>
          <p className="text-muted-foreground">
            Samengesteld via Bureau Vlieland
          </p>
        </div>

        {/* Program details */}
        <div className="grid md:grid-cols-3 gap-4 mb-8 print:mb-4">
          <Card className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Aantal personen</p>
              <p className="font-semibold">{program.number_of_people}</p>
            </div>
          </Card>
          
          <Card className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Datum</p>
              <p className="font-semibold">
                {program.selected_date 
                  ? format(new Date(program.selected_date), "d MMMM yyyy", { locale: nl })
                  : "Nog te bepalen"}
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Activiteiten</p>
              <p className="font-semibold">{blocks.length} items</p>
            </div>
          </Card>
        </div>

        {/* Activities list */}
        <Card className="mb-8 print:shadow-none print:border">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Programma onderdelen</h2>
          </div>
          <div className="divide-y">
            {blocks.map((block, index) => {
              const cartItem = program.cart_items.find((item) => item.blockId === block.id);
              return (
                <div key={block.id} className="p-4 flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium">{block.name}</h3>
                        <p className="text-sm text-muted-foreground">{block.provider}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">{block.priceIndication}</p>
                        {block.priceNote && (
                          <p className="text-xs text-muted-foreground">{block.priceNote}</p>
                        )}
                      </div>
                    </div>
                    {cartItem?.preferredTime && (
                      <p className="text-sm text-primary mt-1">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {cartItem.preferredTime}
                      </p>
                    )}
                    {cartItem?.notes && (
                      <p className="text-sm text-muted-foreground mt-1 italic">
                        "{cartItem.notes}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Actions - hidden in print */}
        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <Button onClick={handleImportToCart} disabled={isImporting} className="flex-1">
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Laad in mijn programma
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Afdrukken
          </Button>
        </div>

        {/* Info text */}
        <p className="text-sm text-muted-foreground text-center mt-6 print:hidden">
          Wil je dit programma aanpassen of aanvragen? Laad het in je eigen programma.
        </p>
      </main>

      <Footer />

      {/* Print styles */}
      <style>{`
        @media print {
          nav, footer, .print\\:hidden { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default SharedProgram;