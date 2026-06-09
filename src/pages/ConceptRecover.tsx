import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";

const STORAGE_KEY = "bureauvlieland_program_draft";

type Status = "loading" | "success" | "expired" | "notfound" | "error";

const ConceptRecover = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) {
      setStatus("notfound");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-program-draft", {
          method: "GET",
          // @ts-expect-error - functions.invoke supports query via path in some versions; fallback to fetch
        });
        let payload: any = data?.payload;

        // Fallback: direct fetch with query param if invoke didn't carry it through
        if (!payload && !error) {
          const url = `https://blhspuifehausilnzwio.supabase.co/functions/v1/get-program-draft?token=${encodeURIComponent(token)}`;
          const r = await fetch(url, {
            headers: {
              apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaHNwdWlmZWhhdXNpbG56d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMTM0NDAsImV4cCI6MjA3ODg4OTQ0MH0.shiugYb4lLf9KHksbfLx5bZYgtvfoGPSoWUyl3dONRI",
            },
          });
          if (r.status === 404) { setStatus("notfound"); return; }
          if (r.status === 410) { setStatus("expired"); return; }
          if (!r.ok) { setStatus("error"); return; }
          const j = await r.json();
          payload = j.payload;
        }

        if (!payload || !Array.isArray(payload.cartItems)) {
          setStatus("notfound");
          return;
        }

        const draftData = {
          cartItems: payload.cartItems,
          numberOfPeople: payload.numberOfPeople ?? 10,
          selectedDates: payload.selectedDates ?? [],
          manualOrder: payload.manualOrder ?? false,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
        setStatus("success");
        // Small delay so user sees confirmation
        setTimeout(() => navigate("/programma-samenstellen", { replace: true }), 800);
      } catch (e) {
        console.error("draft recovery error", e);
        setStatus("error");
      }
    })();
  }, [token, navigate]);

  return (
    <>
      <Helmet>
        <title>Programma herstellen — Bureau Vlieland</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4">
          {status === "loading" && (
            <>
              <h1 className="text-2xl font-serif">Programma wordt opgehaald…</h1>
              <p className="text-muted-foreground">Een ogenblik geduld.</p>
            </>
          )}
          {status === "success" && (
            <>
              <h1 className="text-2xl font-serif">Programma hersteld</h1>
              <p className="text-muted-foreground">U wordt nu doorgestuurd…</p>
            </>
          )}
          {status === "expired" && (
            <>
              <h1 className="text-2xl font-serif">Link verlopen</h1>
              <p className="text-muted-foreground">Deze herstel-link is niet meer geldig. U kunt een nieuw programma samenstellen.</p>
              <Link to="/programma-samenstellen" className="inline-block mt-2 underline">Nieuw programma starten</Link>
            </>
          )}
          {status === "notfound" && (
            <>
              <h1 className="text-2xl font-serif">Programma niet gevonden</h1>
              <p className="text-muted-foreground">Deze herstel-link bestaat niet of is al gebruikt op een ander apparaat.</p>
              <Link to="/programma-samenstellen" className="inline-block mt-2 underline">Nieuw programma starten</Link>
            </>
          )}
          {status === "error" && (
            <>
              <h1 className="text-2xl font-serif">Er ging iets mis</h1>
              <p className="text-muted-foreground">Probeer het later opnieuw of neem contact met ons op.</p>
              <Link to="/" className="inline-block mt-2 underline">Terug naar home</Link>
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default ConceptRecover;
