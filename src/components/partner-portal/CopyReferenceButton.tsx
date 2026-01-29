import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyReferenceButtonProps {
  reference: string;
  size?: "sm" | "icon";
  className?: string;
}

export const CopyReferenceButton = ({
  reference,
  size = "icon",
  className,
}: CopyReferenceButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleCopy}
      className={cn(
        "h-6 w-6 p-0",
        copied && "text-green-600",
        className
      )}
      title={copied ? "Gekopieerd!" : "Kopieer referentienummer"}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
};
