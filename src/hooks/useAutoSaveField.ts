import { useEffect, useRef, useState } from "react";
import { savePartialItemField, type PartialSaveField } from "@/lib/partialItemSave";

export type FieldSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface UseAutoSaveFieldArgs {
  item: {
    id: string;
    pending_added?: boolean | null;
    block_name?: string | null;
    admin_price_notes?: string | null;
    customer_notes?: string | null;
    partner_instructions?: string | null;
  } | null;
  field: PartialSaveField;
  value: string;
  /** Initial value bij mount; auto-save triggert pas na verandering. */
  initialValue: string;
  /** Ms voordat save afgaat na laatste change. */
  debounceMs?: number;
  /** Callback bij succesvolle save (bv. refetch parent). */
  onSaved?: () => void;
  /** Skip auto-save (bv. tijdens initial load). */
  disabled?: boolean;
}

/**
 * Debounced auto-save voor één tekstveld op een program_request_item.
 * Geeft status + tijdstip terug zodat de UI dit kan tonen.
 */
export function useAutoSaveField({
  item,
  field,
  value,
  initialValue,
  debounceMs = 800,
  onSaved,
  disabled,
}: UseAutoSaveFieldArgs) {
  const [status, setStatus] = useState<FieldSaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedValueRef = useRef(initialValue);
  const initialRef = useRef(initialValue);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  // Reset baseline when item changes
  useEffect(() => {
    initialRef.current = initialValue;
    lastSavedValueRef.current = initialValue;
    setStatus("idle");
    setSavedAt(null);
    setError(null);
  }, [item?.id, initialValue]);

  useEffect(() => {
    if (!item || disabled) return;
    if (value === lastSavedValueRef.current) {
      if (status !== "idle" && status !== "saved") setStatus("idle");
      return;
    }
    setStatus("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await savePartialItemField(item, field, value);
        lastSavedValueRef.current = value;
        setSavedAt(new Date());
        setStatus("saved");
        setError(null);
        onSavedRef.current?.();
      } catch (e: any) {
        console.error("autoSave failed:", e);
        setError(e?.message ?? "Opslaan mislukt");
        setStatus("error");
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, item, field, debounceMs, disabled, status]);

  /** Force save now (bv. on blur of sheet-close). Resolves wanneer klaar. */
  const flush = async () => {
    if (!item || disabled) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (value === lastSavedValueRef.current) return;
    setStatus("saving");
    try {
      await savePartialItemField(item, field, value);
      lastSavedValueRef.current = value;
      setSavedAt(new Date());
      setStatus("saved");
      setError(null);
      onSavedRef.current?.();
    } catch (e: any) {
      console.error("autoSave flush failed:", e);
      setError(e?.message ?? "Opslaan mislukt");
      setStatus("error");
    }
  };

  return { status, savedAt, error, flush, isDirty: value !== lastSavedValueRef.current };
}
