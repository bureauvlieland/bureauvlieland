import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Eén containerbreedte-schaal voor de hele site (ontwerpsysteem fase 1,
 * docs/design-systeem.md). Vervangt de acht losse `max-w-*`-breedtes.
 *
 * - `prose`: lopende tekst en formulieren (48rem)
 * - `content`: de meeste secties (64rem)
 * - `wide`: kaartrasters en de navigatie (80rem)
 * - `full`: hero's en de homepage (1400px)
 */
export type ContainerSize = "prose" | "content" | "wide" | "full";

const SIZE_CLASSES: Record<ContainerSize, string> = {
  prose: "max-w-3xl",
  content: "max-w-5xl",
  wide: "max-w-7xl",
  full: "max-w-[1400px]",
};

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  size?: ContainerSize;
  as?: ElementType;
  children?: ReactNode;
}

export const Container = ({ size = "content", as: Tag = "div", className, children, ...rest }: ContainerProps) => (
  <Tag className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", SIZE_CLASSES[size], className)} {...rest}>
    {children}
  </Tag>
);
