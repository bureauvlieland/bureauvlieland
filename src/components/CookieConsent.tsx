import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { z } from "zod";

const CookiePreferencesSchema = z.object({
  necessary: z.boolean(),
  analytics: z.boolean(),
  marketing: z.boolean(),
});

type CookiePreferences = z.infer<typeof CookiePreferencesSchema>;

const defaultPreferences: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShowBanner(true);
      return;
    }
    
    try {
      const parsed = JSON.parse(consent);
      const validated = CookiePreferencesSchema.parse(parsed);
      setPreferences(validated);
      applyCookiePreferences(validated);
    } catch (error) {
      console.warn("Invalid cookie preferences, resetting:", error);
      localStorage.removeItem("cookie-consent");
      setShowBanner(true);
    }
  }, []);

  const applyCookiePreferences = (prefs: CookiePreferences) => {
    // Google Tag Manager - Analytics
    if (prefs.analytics && window.dataLayer) {
      window.dataLayer.push({
        event: 'cookie_consent_analytics',
        analytics_consent: 'granted'
      });
    }

    // Marketing cookies
    if (prefs.marketing && window.dataLayer) {
      window.dataLayer.push({
        event: 'cookie_consent_marketing',
        marketing_consent: 'granted'
      });
    }
  };

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem("cookie-consent", JSON.stringify(prefs));
    setPreferences(prefs);
    applyCookiePreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
  };

  const acceptNecessary = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
    });
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom-5">
      <Card className="max-w-4xl mx-auto shadow-medium border-2">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={acceptNecessary}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-xl sm:text-2xl pr-8">Cookie Voorkeuren</CardTitle>
          <CardDescription>
            Wij gebruiken cookies om uw ervaring op onze website te verbeteren en te analyseren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showSettings ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bureau Vlieland gebruikt cookies om de website goed te laten werken, om uw voorkeuren te onthouden, 
                en om inzicht te krijgen in hoe bezoekers onze website gebruiken. U kunt zelf kiezen welke cookies u accepteert.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={acceptAll} className="flex-1">
                  Accepteer alle cookies
                </Button>
                <Button onClick={acceptNecessary} variant="outline" className="flex-1">
                  Alleen noodzakelijk
                </Button>
                <Button
                  onClick={() => setShowSettings(true)}
                  variant="outline"
                  className="flex-1"
                >
                  Instellingen
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
                  <Checkbox
                    checked={preferences.necessary}
                    disabled
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium leading-none">
                      Noodzakelijke cookies (verplicht)
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Deze cookies zijn nodig om de website te laten functioneren en kunnen niet worden uitgeschakeld.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
                  <Checkbox
                    checked={preferences.analytics}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, analytics: checked as boolean })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium leading-none">
                      Analytische cookies
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Helpen ons te begrijpen hoe bezoekers de website gebruiken via Google Analytics.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
                  <Checkbox
                    checked={preferences.marketing}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, marketing: checked as boolean })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium leading-none">
                      Marketing cookies
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Worden gebruikt om advertenties relevanter te maken voor u en uw interesses.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={saveCustomPreferences} className="flex-1">
                  Voorkeuren opslaan
                </Button>
                <Button
                  onClick={() => setShowSettings(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Terug
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Meer informatie over ons cookiebeleid vindt u in onze{" "}
                <a href="/algemene-voorwaarden" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  algemene voorwaarden
                </a>
                .
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

declare global {
  interface Window {
    dataLayer: any[];
  }
}
