import type { ProgramRequestItem } from "@/types/programRequest";

export interface TimeSlot {
  itemId: string;
  itemName: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
}

/**
 * Eén bron van waarheid voor de "actieve" tijd van een programma-onderdeel.
 * Volgorde: confirmed_time → proposed_time → preferred_time.
 * Gebruik dit overal in admin/customer/partner-weergaven (Fase 4b).
 */
export interface ItemWithTimes {
  confirmed_time?: string | null;
  proposed_time?: string | null;
  preferred_time?: string | null;
}
export const getEffectiveTime = (item: ItemWithTimes): string | null => {
  return item.confirmed_time || item.proposed_time || item.preferred_time || null;
};

/**
 * Parse duration string to minutes
 * Examples: "2 uur" → 120, "1,5 uur" → 90, "30 min" → 30, "1 uur 30 min" → 90
 */
export const parseDuration = (duration: string | null): number => {
  if (!duration) return 60; // Default 1 hour

  let totalMinutes = 0;

  // Match hours: "2 uur", "1,5 uur", "1.5 u"
  const hourMatch = duration.match(/(\d+[,.]?\d*)\s*(uur|u\b)/i);
  if (hourMatch) {
    totalMinutes += Math.round(parseFloat(hourMatch[1].replace(",", ".")) * 60);
  }

  // Match minutes: "30 min", "45 m"
  const minMatch = duration.match(/(\d+)\s*(min|m\b)/i);
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1]);
  }

  return totalMinutes || 60;
};

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
export const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
};

/**
 * Convert minutes since midnight to "HH:MM" format
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

/**
 * Add minutes to a time string, return new time string
 */
export const addMinutesToTime = (time: string, minutesToAdd: number): string => {
  const currentMinutes = parseTimeToMinutes(time);
  return minutesToTime(currentMinutes + minutesToAdd);
};

/**
 * Check if two time ranges overlap
 * Ranges are [start, end) - end is exclusive
 */
export const timeRangesOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean => {
  return start1 < end2 && start2 < end1;
};

/**
 * Get blocked time slots from items on a specific day
 * Returns array of occupied time slots with 30 minute margin
 */
export const getBlockedTimeSlots = (
  items: ProgramRequestItem[],
  dayIndex: number,
  excludeItemId: string,
  marginMinutes: number = 30
): TimeSlot[] => {
  return items
    .filter(
      (item) =>
        item.day_index === dayIndex &&
        item.id !== excludeItemId &&
        item.status !== "cancelled" &&
        item.status !== "unavailable" &&
        (item.confirmed_time || item.proposed_time || item.preferred_time)
    )
    .map((item) => {
      // Priority: confirmed_time > proposed_time > preferred_time
      const startTime = item.confirmed_time || item.proposed_time || item.preferred_time;
      if (!startTime || startTime === "flexibel") return null;

      const durationMinutes = parseDuration(item.duration);
      const startMinutes = parseTimeToMinutes(startTime);
      const endMinutes = startMinutes + durationMinutes + marginMinutes;

      return {
        itemId: item.id,
        itemName: item.block_name,
        startTime,
        endTime: minutesToTime(endMinutes),
        startMinutes,
        endMinutes,
      };
    })
    .filter((slot): slot is TimeSlot => slot !== null);
};

/**
 * Check if a proposed time conflicts with blocked slots
 */
export const hasTimeConflict = (
  proposedTime: string,
  duration: string | null,
  blockedSlots: TimeSlot[],
  marginMinutes: number = 30
): TimeSlot | null => {
  const proposedStart = parseTimeToMinutes(proposedTime);
  const durationMinutes = parseDuration(duration);
  const proposedEnd = proposedStart + durationMinutes + marginMinutes;

  for (const slot of blockedSlots) {
    if (timeRangesOverlap(proposedStart, proposedEnd, slot.startMinutes, slot.endMinutes)) {
      return slot;
    }
  }

  return null;
};

/**
 * Generate all time slots (30 min increments from 08:00 to 22:00)
 */
export const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 8; hour <= 22; hour++) {
    for (const minutes of [0, 30]) {
      if (hour === 22 && minutes === 30) continue; // Skip 22:30
      slots.push(`${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
    }
  }
  return slots;
};

/**
 * Check if a specific time slot is blocked
 */
export const isTimeSlotBlocked = (
  time: string,
  duration: string | null,
  blockedSlots: TimeSlot[],
  marginMinutes: number = 30
): boolean => {
  const startMinutes = parseTimeToMinutes(time);
  const durationMinutes = parseDuration(duration);
  const endMinutes = startMinutes + durationMinutes + marginMinutes;

  for (const slot of blockedSlots) {
    if (timeRangesOverlap(startMinutes, endMinutes, slot.startMinutes, slot.endMinutes)) {
      return true;
    }
  }
  return false;
};

/**
 * Generate available time slots (30 min increments from 08:00 to 22:00)
 * Excludes blocked slots
 */
export const getAvailableTimeSlots = (
  blockedSlots: TimeSlot[],
  duration: string | null,
  marginMinutes: number = 30
): string[] => {
  const availableSlots: string[] = [];
  const durationMinutes = parseDuration(duration);

  // Generate slots from 08:00 to 22:00 in 30 min increments
  for (let hour = 8; hour <= 22; hour++) {
    for (const minutes of [0, 30]) {
      if (hour === 22 && minutes === 30) continue; // Skip 22:30

      const time = `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      const startMinutes = parseTimeToMinutes(time);
      const endMinutes = startMinutes + durationMinutes + marginMinutes;

      // Check if this slot conflicts with any blocked slot
      let isAvailable = true;
      for (const slot of blockedSlots) {
        if (timeRangesOverlap(startMinutes, endMinutes, slot.startMinutes, slot.endMinutes)) {
          isAvailable = false;
          break;
        }
      }

      if (isAvailable) {
        availableSlots.push(time);
      }
    }
  }

  return availableSlots;
};

// Minimal item interface for partner conflict checking (subset of ProgramRequestItem)
export interface PartnerConflictItem {
  id: string;
  day_index: number;
  block_name: string;
  confirmed_time: string | null;
  proposed_time: string | null;
  preferred_time?: string | null;
  duration: string | null;
  status: string;
}

/**
 * Get blocked time slots from partner items (simplified version for partner portal)
 */
export const getBlockedTimeSlotsFromPartnerItems = (
  items: PartnerConflictItem[],
  dayIndex: number,
  excludeItemId: string,
  marginMinutes: number = 30
): TimeSlot[] => {
  return items
    .filter(
      (item) =>
        item.day_index === dayIndex &&
        item.id !== excludeItemId &&
        item.status !== "cancelled" &&
        item.status !== "unavailable" &&
        (item.confirmed_time || item.proposed_time || item.preferred_time)
    )
    .map((item) => {
      // Priority: confirmed_time > proposed_time > preferred_time
      const startTime = item.confirmed_time || item.proposed_time || item.preferred_time;
      if (!startTime || startTime === "flexibel") return null;

      const durationMinutes = parseDuration(item.duration);
      const startMinutes = parseTimeToMinutes(startTime);
      const endMinutes = startMinutes + durationMinutes + marginMinutes;

      return {
        itemId: item.id,
        itemName: item.block_name,
        startTime,
        endTime: minutesToTime(endMinutes),
        startMinutes,
        endMinutes,
      };
    })
    .filter((slot): slot is TimeSlot => slot !== null)
    .sort((a, b) => a.startMinutes - b.startMinutes);
};
