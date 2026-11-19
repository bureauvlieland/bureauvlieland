import { Mail } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * "Factuur mailen": opent de mailclient met de inkoop-inbox, ons
 * referentienummer in het onderwerp en de onderdelen in de tekst
 * (`buildInvoiceMailto`). De partner voegt alleen de pdf toe.
 */
export const InvoiceMailButton = ({ href, size = "sm", variant = "default", label = "Factuur mailen", disabled }: { href: string; size?: ButtonProps["size"]; variant?: ButtonProps["variant"]; label?: string; disabled?: boolean }) =>
  disabled ? (
    <Button size={size} variant={variant} disabled>
      <Mail className="mr-1.5 h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  ) : (
    <Button asChild size={size} variant={variant}>
      <a href={href}>
        <Mail className="mr-1.5 h-4 w-4" aria-hidden="true" />
        {label}
      </a>
    </Button>
  );
