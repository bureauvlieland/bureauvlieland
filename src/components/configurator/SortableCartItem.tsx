import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { CartItemDetails } from "./CartItemDetails";
import { type BuildingBlock, type CartItemDetail } from "@/data/configuratorMockData";

interface SortableCartItemProps {
  id: string;
  block: BuildingBlock;
  item: CartItemDetail;
  onUpdate: (updates: Partial<CartItemDetail>) => void;
  onRemove: () => void;
}

export const SortableCartItem = ({
  id,
  block,
  item,
  onUpdate,
  onRemove,
}: SortableCartItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-1"
    >
      <button
        className="mt-4 p-1 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <CartItemDetails
          block={block}
          item={item}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
};
