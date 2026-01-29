import { supabase } from "@/integrations/supabase/client";
import { createAutoTodo, autoTodoTitles, resolveAutoTodo } from "./autoTodoCreator";
import { isWithinInterval, parseISO } from "date-fns";

interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: Array<{
    itemId: string;
    itemName: string;
    partnerId: string;
    partnerName: string;
    activityDate: string;
    unavailabilityPeriod: {
      start_date: string;
      end_date: string;
      reason: string | null;
    };
  }>;
}

/**
 * Check if any items in a request conflict with partner unavailability
 */
export async function checkRequestConflicts(requestId: string): Promise<ConflictCheckResult> {
  const result: ConflictCheckResult = {
    hasConflicts: false,
    conflicts: [],
  };

  try {
    // Get request with items
    const { data: request, error: requestError } = await supabase
      .from("program_requests")
      .select(`
        id,
        selected_dates
      `)
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      console.error("Error fetching request:", requestError);
      return result;
    }

    const { data: items, error: itemsError } = await supabase
      .from("program_request_items")
      .select("id, block_name, provider_id, provider_name, day_index, proposed_date")
      .eq("request_id", requestId)
      .neq("status", "cancelled");

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
      return result;
    }

    if (!items || items.length === 0) return result;

    // Get unique partner IDs
    const partnerIds = [...new Set(items.map((item) => item.provider_id))];

    // Fetch unavailability for all involved partners
    const { data: unavailability, error: unavailabilityError } = await supabase
      .from("partner_unavailability")
      .select("*")
      .in("partner_id", partnerIds);

    if (unavailabilityError) {
      console.error("Error fetching unavailability:", unavailabilityError);
      return result;
    }

    if (!unavailability || unavailability.length === 0) return result;

    // Parse request dates
    const selectedDates = Array.isArray(request.selected_dates)
      ? request.selected_dates.map(String)
      : [];

    // Check each item
    for (const item of items) {
      // Determine the activity date
      let activityDate: Date | null = null;

      if (item.proposed_date) {
        activityDate = parseISO(item.proposed_date);
      } else if (selectedDates[item.day_index]) {
        activityDate = parseISO(selectedDates[item.day_index]);
      } else if (selectedDates[0]) {
        // Fallback to first date + day_index
        const baseDate = parseISO(selectedDates[0]);
        activityDate = new Date(baseDate);
        activityDate.setDate(activityDate.getDate() + item.day_index);
      }

      if (!activityDate) continue;

      // Check against unavailability periods
      const partnerUnavailability = unavailability.filter(
        (u) => u.partner_id === item.provider_id
      );

      for (const period of partnerUnavailability) {
        const startDate = parseISO(period.start_date);
        const endDate = parseISO(period.end_date);

        if (isWithinInterval(activityDate, { start: startDate, end: endDate })) {
          result.hasConflicts = true;
          result.conflicts.push({
            itemId: item.id,
            itemName: item.block_name,
            partnerId: item.provider_id,
            partnerName: item.provider_name,
            activityDate: activityDate.toISOString().split("T")[0],
            unavailabilityPeriod: {
              start_date: period.start_date,
              end_date: period.end_date,
              reason: period.reason,
            },
          });
          break; // One conflict per item is enough
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Error checking conflicts:", error);
    return result;
  }
}

/**
 * Check for conflicts and create auto-todos if needed
 */
export async function checkAndCreateConflictTodos(requestId: string): Promise<void> {
  const { hasConflicts, conflicts } = await checkRequestConflicts(requestId);

  if (!hasConflicts) return;

  // Create an auto-todo for each conflict
  for (const conflict of conflicts) {
    await createAutoTodo({
      type: "availability_conflict",
      requestId,
      partnerId: conflict.partnerId,
      itemId: conflict.itemId,
      title: autoTodoTitles.availability_conflict(conflict.partnerName, conflict.itemName),
      description: `${conflict.partnerName} is niet beschikbaar op ${conflict.activityDate}. Reden: ${conflict.unavailabilityPeriod.reason || "Niet opgegeven"}`,
      priority: "high",
    });
  }
}

/**
 * Check for new conflicts when a partner adds unavailability
 * This should be called when a new unavailability period is created
 */
export async function checkConflictsForNewUnavailability(
  partnerId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  try {
    // Find active requests with items for this partner that might be affected
    const { data: items, error: itemsError } = await supabase
      .from("program_request_items")
      .select(`
        id,
        block_name,
        provider_id,
        provider_name,
        day_index,
        proposed_date,
        request_id,
        program_requests!inner (
          id,
          selected_dates,
          status
        )
      `)
      .eq("provider_id", partnerId)
      .not("status", "in", "(cancelled,declined)");

    if (itemsError || !items || items.length === 0) return;

    const unavailStart = parseISO(startDate);
    const unavailEnd = parseISO(endDate);

    for (const item of items) {
      const request = item.program_requests as unknown as {
        id: string;
        selected_dates: unknown;
        status: string;
      };

      if (!request || request.status === "cancelled") continue;

      const selectedDates = Array.isArray(request.selected_dates)
        ? request.selected_dates.map(String)
        : [];

      // Determine activity date
      let activityDate: Date | null = null;

      if (item.proposed_date) {
        activityDate = parseISO(item.proposed_date);
      } else if (selectedDates[item.day_index]) {
        activityDate = parseISO(selectedDates[item.day_index]);
      } else if (selectedDates[0]) {
        const baseDate = parseISO(selectedDates[0]);
        activityDate = new Date(baseDate);
        activityDate.setDate(activityDate.getDate() + item.day_index);
      }

      if (!activityDate) continue;

      // Check if this date falls within the new unavailability
      if (isWithinInterval(activityDate, { start: unavailStart, end: unavailEnd })) {
        await createAutoTodo({
          type: "availability_conflict",
          requestId: request.id,
          partnerId: item.provider_id,
          itemId: item.id,
          title: autoTodoTitles.availability_conflict(item.provider_name, item.block_name),
          description: `${item.provider_name} heeft een nieuwe blokkering toegevoegd (${startDate} - ${endDate}) die conflict veroorzaakt met activiteit op ${activityDate.toISOString().split("T")[0]}`,
          priority: "high",
        });
      }
    }
  } catch (error) {
    console.error("Error checking conflicts for new unavailability:", error);
  }
}

/**
 * Resolve conflict todo when the conflict is resolved (e.g., item cancelled or rescheduled)
 */
export async function resolveConflictTodo(itemId: string): Promise<void> {
  await resolveAutoTodo("availability_conflict", itemId);
}
