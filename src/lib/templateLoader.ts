import { addDays } from "date-fns";
import type { ProgramTemplate } from "@/types/programTemplate";
import type { CartItemDetail } from "@/types/buildingBlock";

const SKIP_BLOCK_IDS = new Set(["boot-enkel-heen", "boot-enkel-terug", "fiets-huur"]);

const FERRY_HEEN_ID = "boot-enkel-heen";
const FERRY_TERUG_ID = "boot-enkel-terug";
const FIETS_ID = "fiets-huur";

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

  // 4. Add mandatory items (ferry + bike) — without preset times so the user picks via Doeksen API
  const lastDay = Math.max(0, template.duration_days - 1);
  cart.addToCart(FERRY_HEEN_ID, 0);
  cart.addToCart(FERRY_TERUG_ID, lastDay);
  cart.addToCart(FIETS_ID, 0);

  // 5. Add all non-mandatory template items to cart with correct day and time
  if (template.items) {
    const sortedItems = [...template.items].sort((a, b) => {
      if (a.day_index !== b.day_index) return a.day_index - b.day_index;
      return a.sort_order - b.sort_order;
    });

    for (const item of sortedItems) {
      // Skip mandatory blocks — already added above
      if (SKIP_BLOCK_IDS.has(item.block_id)) continue;

      const added = cart.addToCart(item.block_id, item.day_index);
      
      if (added) {
        if (item.preferred_time) {
          cart.updateItem(item.block_id, {
            preferredTime: item.preferred_time,
            notes: item.notes || "",
          });
        } else if (item.notes) {
          cart.updateItem(item.block_id, { notes: item.notes });
        }
      }
    }
  }
};
