import type { ReactNode } from "react";

/**
 * Een sectie in een sheet of formulier van het partnerportaal (fase 3 en
 * 4): een kleine kop, optioneel een hulpzin, en de velden eronder op
 * `FormField`. Vervangt de tabs en de losse `h4`'s in de sheets.
 */
export const SheetSection = ({ title, help, children }: { title: string; help?: ReactNode; children: ReactNode }) => (
  <section className="space-y-3">
    <div>
      <h3 className="font-medium">{title}</h3>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
    {children}
  </section>
);

/** Dezelfde selectstijl als `Input`, voor een native `<select>` in een `FormField`. */
export const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
