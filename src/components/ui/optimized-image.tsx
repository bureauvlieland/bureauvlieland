import { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  webpSrc?: string;
  alt: string;
  priority?: boolean;
  className?: string;
}

/**
 * OptimizedImage component with WebP support and lazy loading.
 * Uses <picture> element for format fallback.
 * Set priority=true for above-the-fold images (LCP).
 */
export const OptimizedImage = ({
  src,
  webpSrc,
  alt,
  priority = false,
  className,
  ...props
}: OptimizedImageProps) => {
  // Generate WebP path if not provided (assumes .webp version exists)
  const webpSource = webpSrc || (src ? src.replace(/\.(jpg|jpeg|png)$/i, ".webp") : undefined);

  return (
    <picture>
      {webpSource && (
        <source srcSet={webpSource} type="image/webp" />
      )}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        className={cn(className)}
        {...props}
      />
    </picture>
  );
};
