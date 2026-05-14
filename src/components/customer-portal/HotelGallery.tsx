import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, ImageIcon, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transformImageUrl, buildSrcSet } from "@/lib/supabaseImage";

interface HotelGalleryProps {
  images: { url: string; alt?: string }[];
  accommodationName: string;
}

export const HotelGallery = ({ images, accommodationName }: HotelGalleryProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error("Fullscreen toggle failed", e);
    }
  };

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[16/6] w-full rounded-lg border border-dashed bg-muted/40 flex flex-col items-center justify-center text-muted-foreground gap-2">
        <ImageIcon className="h-8 w-8" />
        <p className="text-sm">Nog geen foto's beschikbaar van {accommodationName}.</p>
        <p className="text-xs">De accommodatie voegt deze binnenkort toe.</p>
      </div>
    );
  }

  const close = () => setOpenIndex(null);
  const prev = () =>
    setOpenIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  const next = () =>
    setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, images.length]);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <img
              src={transformImageUrl(img.url, { width: 400, quality: 70 })}
              srcSet={buildSrcSet(img.url, [200, 400, 600, 800], { quality: 70 })}
              sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
              alt={img.alt || `${accommodationName} foto ${i + 1}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Dialog open={openIndex !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-5xl p-0 bg-background border-0 [&>button]:hidden">
          {openIndex !== null && (
            <div ref={containerRef} className="relative bg-black">
              <img
                src={transformImageUrl(images[openIndex].url, { width: 1600, quality: 85, resize: "contain" })}
                srcSet={buildSrcSet(images[openIndex].url, [800, 1200, 1600, 2000], { quality: 85, resize: "contain" })}
                sizes="100vw"
                alt={images[openIndex].alt || `${accommodationName} foto ${openIndex + 1}`}
                decoding="async"
                className={isFullscreen ? "w-screen h-screen object-contain bg-black" : "w-full max-h-[85vh] object-contain bg-black"}
              />
              <Button
                size="icon"
                variant="secondary"
                onClick={toggleFullscreen}
                className="absolute top-2 right-12 h-9 w-9 rounded-full"
                aria-label={isFullscreen ? "Volledig scherm verlaten" : "Volledig scherm"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => {
                  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                  close();
                }}
                className="absolute top-2 right-2 h-9 w-9 rounded-full"
                aria-label="Sluiten"
              >
                <X className="h-4 w-4" />
              </Button>
              {images.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full"
                    aria-label="Vorige"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full"
                    aria-label="Volgende"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs bg-background/80 px-2 py-1 rounded">
                    {openIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
