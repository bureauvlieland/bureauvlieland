import { addDays } from "date-fns";
import type { ProgramTemplate } from "@/types/programTemplate";
import type { CartItemDetail } from "@/types/buildingBlock";

interface CartContextForLoader {
  clearCart: () => void;
  setSelectedDate: (date: Date | undefined) => void;
  addDate: (date: Date) => boolean;
  addToCart: (blockId: string, dayIndex?: number) => boolean;
  updateItem: (blockId: string, updates: Partial<CartItemDetail>) => void;
  setNumberOfPeople: (count: number) => void;
}

/**
 * Load a template into the cart
 * @param template - The template to load (with items)
 * @param cart - Cart context functions
 * @param startDate - The first date of the program
 * @param numberOfPeople - Number of participants (preserved from wizard)
 */
export const loadTemplateToCart = (
  template: ProgramTemplate,
  cart: CartContextForLoader,
  startDate: Date,
  numberOfPeople: number
): void => {
  // 1. Clear current cart
  cart.clearCart();

  // 2. Set number of people
  cart.setNumberOfPeople(numberOfPeople);

  // 3. Add dates based on template duration
  for (let i = 0; i < template.duration_days; i++) {
    const date = addDays(startDate, i);
    if (i === 0) {
      cart.setSelectedDate(date);
    } else {
      cart.addDate(date);
    }
  }

  // 4. Add all template items to cart with correct day and time
  if (template.items) {
    // Sort by day_index and sort_order to maintain proper order
    const sortedItems = [...template.items].sort((a, b) => {
      if (a.day_index !== b.day_index) return a.day_index - b.day_index;
      return a.sort_order - b.sort_order;
    });

    for (const item of sortedItems) {
      const added = cart.addToCart(item.block_id, item.day_index);
      
      if (added && item.preferred_time) {
        cart.updateItem(item.block_id, {
          preferredTime: item.preferred_time,
          notes: item.notes || "",
        });
      }
    }
  }
};

/**
 * Calculate indicative total price for a template
 */
export const calculateTemplatePrice = (
  template: ProgramTemplate,
  numberOfPeople: number
): number | null => {
  if (!template.items || template.items.length === 0) {
    return template.indicative_price_pp 
      ? template.indicative_price_pp * numberOfPeople 
      : null;
  }

  let total = 0;
  let hasAnyPrice = false;

  for (const item of template.items) {
    if (item.block?.price_adult) {
      hasAnyPrice = true;
      total += item.block.price_adult * numberOfPeople;
    }
  }

  return hasAnyPrice ? total : null;
};
