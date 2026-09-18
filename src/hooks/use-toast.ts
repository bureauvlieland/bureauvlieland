import type { MouseEvent, ReactNode } from "react";
import { toast as sonnerToast } from "sonner";

/**
 * Eén toastsysteem: alle meldingen lopen via sonner (`<Toaster />` in App.tsx).
 *
 * Dit bestand houdt de oude shadcn-API in stand (`toast({ title, description,
 * variant })` en `useToast()`), zodat de bestaande aanroepen niet hoeven te
 * veranderen, maar rendert via sonner in plaats van via de radix-toaster die
 * hier tot fase 0 van het ontwerpsysteem naast draaide. Zie
 * docs/plan-design-systeem.md.
 */

export type ToastVariant = "default" | "destructive";

export interface ToastAction {
  label: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

export interface ToastOptions {
  id?: string | number;
  title?: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  /** Milliseconden; zonder waarde geldt de standaard van sonner. */
  duration?: number;
  action?: ToastAction;
}

function toast({ id, title, description, variant, duration, action }: ToastOptions) {
  const message = title ?? description ?? "";
  const options = {
    id,
    description: title ? description : undefined,
    duration,
    action,
  };
  const toastId =
    variant === "destructive" ? sonnerToast.error(message, options) : sonnerToast(message, options);

  return {
    id: toastId,
    dismiss: () => sonnerToast.dismiss(toastId),
    update: (next: ToastOptions) => toast({ ...next, id: toastId }),
  };
}

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
  };
}

export { useToast, toast };
