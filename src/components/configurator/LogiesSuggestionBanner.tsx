import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bed } from "lucide-react";
import { format } from "date-fns";
import type { CartItemDetail } from "@/types/buildingBlock";

// Session storage key for passing cart items to accommodation wizard
export const CART_HANDOFF_KEY = "bv_cart_handoff";

export interface CartHandoffData {
  cartItems: CartItemDetail[];
  numberOfPeople: number;
  selectedDates: string[]; // ISO strings
}

interface LogiesSuggestionBannerProps {
  isVisible: boolean;
  selectedDates?: Date[];
  numberOfPeople?: number;
  cartItems?: CartItemDetail[];
}

export const LogiesSuggestionBanner = ({ 
  isVisible, 
  selectedDates = [], 
  numberOfPeople,
  cartItems = []
}: LogiesSuggestionBannerProps) => {
  const navigate = useNavigate();

  if (!isVisible) return null;

  // Build URL with query parameters
  const buildLogiesUrl = () => {
    const params = new URLSearchParams();
    
    if (selectedDates.length > 0) {
      // Sort dates and use first as arrival, last as departure
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      params.set("arrival", format(sortedDates[0], "yyyy-MM-dd"));
      params.set("departure", format(sortedDates[sortedDates.length - 1], "yyyy-MM-dd"));
    }
    
    if (numberOfPeople && numberOfPeople > 0) {
      params.set("guests", numberOfPeople.toString());
    }

    // Flag that cart data is available in sessionStorage
    if (cartItems.length > 0) {
      params.set("fromConfigurator", "true");
    }
    
    const queryString = params.toString();
    return queryString ? `/logies-aanvragen?${queryString}` : "/logies-aanvragen";
  };

  const handleClick = () => {
    // Store cart data in sessionStorage before navigating
    if (cartItems.length > 0) {
      const handoffData: CartHandoffData = {
        cartItems,
        numberOfPeople: numberOfPeople || 20,
        selectedDates: selectedDates.map(d => d.toISOString()),
      };
      sessionStorage.setItem(CART_HANDOFF_KEY, JSON.stringify(handoffData));
    }
    
    navigate(buildLogiesUrl());
  };

  return (
    <div className="bg-accent/50 border border-accent rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <Bed className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-foreground text-sm">
            Meerdaags verblijf geselecteerd
          </p>
          <p className="text-sm text-muted-foreground">
            Wilt u dat wij ook passende logies voor uw groep regelen?
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={handleClick}>
        Logies laten regelen
      </Button>
    </div>
  );
};
