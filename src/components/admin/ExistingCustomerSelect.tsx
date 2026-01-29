import { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Search, UserPlus, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface ExistingCustomer {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string | null;
  program_count: number;
}

interface ExistingCustomerSelectProps {
  onSelect: (customer: ExistingCustomer | null) => void;
  selectedEmail?: string;
}

export const ExistingCustomerSelect = ({
  onSelect,
  selectedEmail,
}: ExistingCustomerSelectProps) => {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<ExistingCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      // Get unique customers from program_requests with their program count
      const { data, error } = await supabase
        .from("program_requests")
        .select("customer_name, customer_email, customer_phone, customer_company")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by email to get unique customers with counts
      const customerMap = new Map<string, ExistingCustomer>();
      
      data?.forEach((row) => {
        const existing = customerMap.get(row.customer_email);
        if (existing) {
          existing.program_count += 1;
          // Keep most recent data
        } else {
          customerMap.set(row.customer_email, {
            customer_name: row.customer_name,
            customer_email: row.customer_email,
            customer_phone: row.customer_phone,
            customer_company: row.customer_company,
            program_count: 1,
          });
        }
      });

      // Sort by program count (most frequent first)
      const sortedCustomers = Array.from(customerMap.values()).sort(
        (a, b) => b.program_count - a.program_count
      );

      setCustomers(sortedCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.customer_name.toLowerCase().includes(query) ||
        c.customer_email.toLowerCase().includes(query) ||
        c.customer_company?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const selectedCustomer = customers.find((c) => c.customer_email === selectedEmail);

  const handleSelect = (customer: ExistingCustomer) => {
    onSelect(customer);
    setOpen(false);
  };

  const handleNewCustomer = () => {
    onSelect(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 py-2"
        >
          {selectedCustomer ? (
            <div className="flex items-center gap-2 text-left">
              <div className="flex-1">
                <span className="font-medium">{selectedCustomer.customer_name}</span>
                {selectedCustomer.customer_company && (
                  <span className="text-muted-foreground ml-1.5">
                    ({selectedCustomer.customer_company})
                  </span>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                {selectedCustomer.program_count}x
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4" />
              Zoek bestaande klant of voeg nieuwe toe...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Zoek op naam, e-mail of bedrijf..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Laden..." : "Geen klanten gevonden."}
            </CommandEmpty>
            
            <CommandGroup heading="Nieuwe klant">
              <CommandItem onSelect={handleNewCustomer} className="gap-2">
                <UserPlus className="h-4 w-4" />
                <span>Nieuwe klant invoeren</span>
              </CommandItem>
            </CommandGroup>

            {filteredCustomers.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Bestaande klanten">
                  {filteredCustomers.slice(0, 10).map((customer) => (
                    <CommandItem
                      key={customer.customer_email}
                      value={customer.customer_email}
                      onSelect={() => handleSelect(customer)}
                      className="flex items-start gap-3 py-3"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 mt-0.5 shrink-0",
                          selectedEmail === customer.customer_email
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {customer.customer_name}
                          </span>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {customer.program_count} {customer.program_count === 1 ? "programma" : "programma's"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {customer.customer_email}
                        </div>
                        {customer.customer_company && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {customer.customer_company}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                  {filteredCustomers.length > 10 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                      +{filteredCustomers.length - 10} meer resultaten, verfijn je zoekopdracht
                    </div>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
