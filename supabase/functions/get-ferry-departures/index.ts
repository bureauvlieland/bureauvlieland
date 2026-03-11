import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portFrom = "H", portTo = "V", date } = await req.json();

    const validPorts = ["H", "V", "T"];
    if (!validPorts.includes(portFrom) || !validPorts.includes(portTo)) {
      return new Response(JSON.stringify({ error: "Invalid port code. Use H, V, or T." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get("DOEKSEN_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let url = `https://api.rederij-doeksen.nl/departures/${portFrom}/${portTo}/availability`;
    if (date) {
      url += `?date=${encodeURIComponent(date)}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `ApiKey ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Doeksen API error: ${response.status}`, errorText);
      return new Response(JSON.stringify({ error: "Failed to fetch departures", status: response.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error in get-ferry-departures:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
