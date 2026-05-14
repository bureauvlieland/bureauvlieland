import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HotelGalleryProps {
  images: { url: string; alt?: string }[];
  accommodationName: string;
}

export const HotelGallery = ({ images, accommodationName }: HotelGalleryProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const close = () => setOpenIndex(null);
  const prev = () =>
    setOpenIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  const next = () =>
    setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));

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
              src={img.url}
              alt={img.alt || `${accommodationName} foto ${i + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Dialog open={openIndex !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-5xl p-0 bg-background border-0 [&>button]:hidden">
          {openIndex !== null && (
            <div className="relative">
              <img
                src={images[openIndex].url}
                alt={images[openIndex].alt || `${accommodationName} foto ${openIndex + 1}`}
                className="w-full max-h-[85vh] object-contain bg-black"
              />
              <Button
                size="icon"
                variant="secondary"
                onClick={close}
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
