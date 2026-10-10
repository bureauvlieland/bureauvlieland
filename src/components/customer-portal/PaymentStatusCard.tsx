import { Notice } from "@/components/system";
import type { ProgramRequestItem } from "@/types/programRequest";

interface PaymentStatusCardProps {
  items: ProgramRequestItem[];
  termsAcceptedAt: string;
}

/** Waar de facturen staan na ondertekenen: één melding (klantportaal fase 3a). */
export const PaymentStatusCard = ({ items }: PaymentStatusCardProps) => {
  const confirmedItems = items.filter((item) => item.status !== "cancelled" && item.quoted_price);
  const executedItems = confirmedItems.filter((item) => item.executed_at);

  const allExecuted = confirmedItems.length > 0 && executedItems.length >= confirmedItems.length;
  const someExecuted = executedItems.length > 0 && !allExecuted;

  if (allExecuted) {
    return (
      <Notice tone="success" title="Alle onderdelen zijn uitgevoerd">
        Bureau Vlieland stelt de facturen op. U ontvangt ze per e-mail.
      </Notice>
    );
  }
  if (someExecuted) {
    return (
      <Notice tone="info" title={`${executedItems.length} van ${confirmedItems.length} onderdelen uitgevoerd`}>
        De facturen volgen zodra alle onderdelen zijn uitgevoerd.
      </Notice>
    );
  }
  return (
    <Notice tone="info" title="Facturen volgen na afloop">
      Bureau Vlieland stelt de facturen op na uw programma en stuurt ze per e-mail.
    </Notice>
  );
};
