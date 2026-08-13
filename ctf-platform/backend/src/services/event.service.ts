import { db } from "../db";
import { events } from "../db/schema";
import { eq, and } from "drizzle-orm";

export type EventState = "pre-event" | "active" | "frozen" | "ended";

/**
 * Get the currently active event and determine its state.
 */
export async function getActiveEvent() {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.isActive, true))
    .limit(1);

  return event || null;
}

/**
 * Determine the current state of an event based on timestamps.
 */
export function getEventState(event: typeof events.$inferSelect): EventState {
  const now = new Date();

  if (now < event.startTime) return "pre-event";
  if (now > event.endTime) return "ended";
  if (event.scoreboardFreezeTime && now >= event.scoreboardFreezeTime) return "frozen";
  return "active";
}

/**
 * Check if submissions are currently allowed.
 */
export async function canSubmit(): Promise<{ allowed: boolean; reason?: string }> {
  const event = await getActiveEvent();

  if (!event) {
    // No active event — allow submissions (practice mode)
    return { allowed: true };
  }

  const state = getEventState(event);

  switch (state) {
    case "pre-event":
      return { allowed: false, reason: "The event has not started yet" };
    case "active":
    case "frozen":
      // During freeze, submissions are still accepted and scored,
      // just the public leaderboard is frozen
      return { allowed: true };
    case "ended":
      return { allowed: false, reason: "The event has ended" };
  }
}

/**
 * Check if the leaderboard should show frozen data.
 */
export async function isLeaderboardFrozen(): Promise<{
  frozen: boolean;
  eventId?: string;
}> {
  const event = await getActiveEvent();

  if (!event) return { frozen: false };

  const state = getEventState(event);

  if (state === "frozen") {
    return { frozen: true, eventId: event.id };
  }

  return { frozen: false };
}
