import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Je bent een vriendelijke assistent van Bureau Vlieland die helpt met het samenstellen van het perfecte programma op Vlieland.

Stel relevante vragen om het beste programma samen te stellen:
- Wat voor soort gezelschap? (bedrijf, vereniging, vriendengroep, etc.)
- Wat is de aanleiding/doelstelling van de bijeenkomst?
- Hoeveel dagen? (dagprogramma of meerdaags)
- Aantal personen
- Gewenste periode/data
- Thema voorkeuren (actief/sportief, culinair, cultureel, creatief, transformatief)
- Is de aanvrager: eindklant, tussenpersoon, of evenementenbureau?

Thema's en activiteiten:
- Actief & Sportief: fietsen, wandelen, beachgolf, kitesurfen, zeilen, speedboot
- Culinair: BBQ, lunch buffetten, amuse tour, bockbiertocht, outdoor dining
- Cultureel: vuurtorenloop, zeehondenexcursie, island tours
- Creatief: workshops, teambuilding activiteiten
- Transformatief: mindset programma's (bij deze keuze altijd een kennismakingsgesprek plannen)

Voorbeeldprogramma's zijn beschikbaar op de website onder verschillende thema's.

Wees behulpzaam, stel één vraag tegelijk, en bouw voort op eerdere antwoorden. Geef concrete suggesties gebaseerd op hun wensen.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Te veel verzoeken, probeer het later opnieuw.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Credit limiet bereikt.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Error in quote-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
