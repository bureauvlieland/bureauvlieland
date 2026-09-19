import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Eén veldopmaak voor alle formulieren (ontwerpsysteem fase 2): label met
 * `*` voor verplicht (optioneel wordt nooit gemarkeerd), optioneel een
 * icoon vooraan, hulptekst eronder, en een foutmelding die de hulptekst
 * vervangt. Zet `id`, `aria-invalid` en `aria-describedby` op het veld.
 */
type ControlProps = {
  id?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

interface FormFieldProps {
  label: ReactNode;
  htmlFor: string;
  required?: boolean;
  help?: ReactNode;
  error?: string | null | false;
  /** Icoon links in het veld (16px). */
  leading?: ReactNode;
  className?: string;
  children: ReactElement<ControlProps>;
}

export const FormField = ({ label, htmlFor, required, help, error, leading, className, children }: FormFieldProps) => {
  const helpId = help ? `${htmlFor}-help` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement<ControlProps>(children)
    ? cloneElement(children, {
        id: htmlFor,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        className: cn(
          children.props.className,
          leading && "pl-10",
          error && "border-destructive focus-visible:ring-destructive",
        ),
      })
    : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="flex items-center gap-1">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {leading ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
            {leading}
          </span>
          {control}
        </div>
      ) : (
        control
      )}
      {help && !error && (
        <p id={helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
