import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, X, Share, Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY_PREFIX = "bv_pwa_install_dismissed_";

interface InstallPwaBannerProps {
  /** Stable identifier (token) zodat dismissal per programma onthouden wordt */
  programToken?: string;
  /** Alleen tonen tijdens evenement of vlak ervoor */
  visible?: boolean;
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const InstallPwaBanner = ({ programToken, visible = true }: InstallPwaBannerProps) => {
  const isMobile = useIsMobile();
  const [dismissed, setDismissed] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const storageKey = STORAGE_KEY_PREFIX + (programToken ?? "default");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-ignore — iOS Safari
      window.navigator.standalone === true;
    setIsStandalone(!!standalone);

    const ua = window.navigator.userAgent || "";
    setIsIos(/iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS/i.test(ua));

    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [storageKey]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* noop */
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => null);
    setDeferredPrompt(null);
    handleDismiss();
  };

  if (!visible || !isMobile || isStandalone || dismissed) return null;
  // Op niet-iOS hebben we de install-prompt nodig; iOS toont handleiding
  if (!isIos && !deferredPrompt) return null;

  return (
    <div className="sticky bottom-16 left-0 right-0 z-40 px-3 pb-2 md:hidden">
      <div className="rounded-xl border bg-primary/5 backdrop-blur shadow-lg p-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <Smartphone className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Snelle toegang tijdens uw verblijf</p>
            {isIos ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Tik op{" "}
                <Share className="inline h-3 w-3 align-text-bottom" /> en kies{" "}
                <span className="font-medium">"Zet op beginscherm"</span>
                <Plus className="inline h-3 w-3 align-text-bottom ml-0.5" />.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Voeg dit programma toe aan uw beginscherm.
              </p>
            )}
            {!isIos && deferredPrompt && (
              <Button size="sm" className="mt-2 h-7 text-xs" onClick={handleInstall}>
                Toevoegen aan beginscherm
              </Button>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={handleDismiss}
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
