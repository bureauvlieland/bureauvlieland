import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Pencil, CheckCircle, AlertCircle } from "lucide-react";
import { BillingDetailsCard } from "./BillingDetailsCard";
import { InvoiceProvidersCard } from "./InvoiceProvidersCard";
import { PriceSummaryCard } from "./PriceSummaryCard";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";

interface CompactBillingSectionProps {
  program: {
    billing_company_name?: string;
    billing_kvk_number?: string;
    billing_vat_number?: string;
    billing_address_street?: string;
    billing_address_postal?: string;
    billing_address_city?: string;
    billing_contact_name?: string;
    billing_contact_email?: string;
    billing_reference?: string;
  };
  items: ProgramRequestItem[];
  numberOfPeople: number;
  termsAccepted: boolean;
  selectedAccommodationQuote?: AccommodationQuote;
  onEditBilling: () => void;
  invoicingMode?: string;
}

export const CompactBillingSection = ({
  program,
  items,
  numberOfPeople,
  termsAccepted,
  selectedAccommodationQuote,
  onEditBilling,
  invoicingMode,
}: CompactBillingSectionProps) => {
  const billingComplete = !!(
    program.billing_company_name &&
    program.billing_address_street &&
    program.billing_address_postal &&
    program.billing_address_city &&
    program.billing_contact_name
  );

  return (
    <div id="billing" className="scroll-mt-20 space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Facturatie & Kosten</h2>
        </div>
        {billingComplete ? (
          <div className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Gegevens compleet</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span>Gegevens invullen</span>
          </div>
        )}
      </div>

      {/* Billing details card */}
      <BillingDetailsCard program={program as any} onEdit={onEditBilling} />

      {/* Invoice providers */}
      <InvoiceProvidersCard
        items={items}
        selectedAccommodationQuote={selectedAccommodationQuote}
        numberOfPeople={numberOfPeople}
        invoicingMode={invoicingMode}
      />

      {/* Price summary */}
      <PriceSummaryCard
        items={items}
        numberOfPeople={numberOfPeople}
        termsAccepted={termsAccepted}
        selectedAccommodationQuote={selectedAccommodationQuote}
        invoicingMode={invoicingMode}
      />
    </div>
  );
};
