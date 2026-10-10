import { FileText } from "lucide-react";
import { Pill } from "@/components/system";
import { isBillingComplete } from "@/lib/billingDetails";
import { BillingDetailsCard } from "./BillingDetailsCard";
import { PriceSummaryCard } from "./PriceSummaryCard";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";
import type { FeeStructureSet } from "@/types/pricing";

interface CompactBillingSectionProps {
  program: {
    billing_company_name?: string;
    billing_kvk_number?: string;
    billing_vat_number?: string;
    billing_address_street?: string;
    billing_address_postal?: string;
    billing_address_city?: string;
    billing_country?: string;
    billing_contact_name?: string;
    billing_contact_email?: string;
    billing_reference?: string;
  };
  items: ProgramRequestItem[];
  numberOfPeople: number;
  numberOfDays?: number;
  termsAccepted: boolean;
  selectedAccommodationQuote?: AccommodationQuote;
  onEditBilling: () => void;
  invoicingMode?: string;
  billingLinesByItem?: Record<string, any[]>;
  blockVatRates?: Record<string, number>;
  accommodationExtrasByQuoteId?: Record<string, any[]>;
  /** Per-project uitgesloten automatische kostenposten. */
  excludedFees?: string[] | null;
  /** Feestructuur van dit project (snapshot) — zelfde als de admin-factuur. */
  feeStructure?: FeeStructureSet | null;
  requestDate?: string | null;
  arrivalDate?: string | null;
  revisionFeesTotal?: number;
}

export const CompactBillingSection = ({
  program,
  items,
  numberOfPeople,
  numberOfDays,
  termsAccepted,
  selectedAccommodationQuote,
  onEditBilling,
  invoicingMode,
  billingLinesByItem,
  blockVatRates,
  accommodationExtrasByQuoteId,
  excludedFees,
  feeStructure,
  requestDate,
  arrivalDate,
  revisionFeesTotal,
}: CompactBillingSectionProps) => {
  const billingComplete = isBillingComplete(program);

  const extrasOverride = selectedAccommodationQuote && accommodationExtrasByQuoteId
    ? accommodationExtrasByQuoteId[selectedAccommodationQuote.id]
    : undefined;

  return (
    <div id="billing" className="scroll-mt-20 space-y-4">
      {/* Section header */}
      <div className="flex flex-wrap items-center gap-2">
        <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">Facturatie en kosten</h2>
        <Pill tone={billingComplete ? "success" : "warning"}>{billingComplete ? "Compleet" : "Aanvullen"}</Pill>
      </div>

      {/* Billing details card */}
      <BillingDetailsCard program={program as any} onEdit={onEditBilling} />

      {/* Price summary / cost specification */}
      <PriceSummaryCard
        items={items}
        numberOfPeople={numberOfPeople}
        numberOfDays={numberOfDays}
        termsAccepted={termsAccepted}
        selectedAccommodationQuote={selectedAccommodationQuote}
        invoicingMode={invoicingMode}
        billingLinesByItem={billingLinesByItem}
        blockVatRates={blockVatRates}
        accommodationExtrasOverride={extrasOverride}
        excludedFees={excludedFees}
        feeStructure={feeStructure}
        requestDate={requestDate}
        arrivalDate={arrivalDate}
        revisionFeesTotal={revisionFeesTotal}
      />
    </div>
  );
};
