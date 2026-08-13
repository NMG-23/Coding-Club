import { Elysia, t } from "elysia";
import {
  getTopUsers,
  getTopTeams,
  getFrozenLeaderboard,
  freezeLeaderboard,
  rebuildLeaderboard,
} from "../services/leaderboard";
import { isLeaderboardFrozen } from "../services/event.service";
import { db } from "../db";
import { users, teams } from "../db/schema";
import { eq } from "drizzle-orm";

// Track connected WebSocket clients for broadcasting
const LEADERBOARD_TOPIC = "leaderboard";

/**
 * WebSocket handler for real-time leaderboard updates.
 *
 * Clients connect to /ws/leaderboard and receive:
 * - Current leaderboard on connect
 * - Updated leaderboard on every solve
 * - First-blood announcements
 */
export const wsLeaderboard = new Elysia()
  .ws("/ws/leaderboard", {
    open(ws) {
      // Subscribe to leaderboard updates
      ws.subscribe(LEADERBOARD_TOPIC);

      // Send current leaderboard state immediately
      sendCurrentLeaderboard(ws);
    },

    close(ws) {
      ws.unsubscribe(LEADERBOARD_TOPIC);
    },

    message(ws, message) {
      // Clients don't send meaningful messages, but handle pings
      if (typeof message === "object" && message !== null && "type" in message) {
        const msg = message as { type: string };
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      }
    },
  });

/**
 * Send the current leaderboard snapshot to a single client.
 */
async function sendCurrentLeaderboard(ws: any) {
  try {
    const { frozen, eventId } = await isLeaderboardFrozen();

    if (frozen && eventId) {
      const snapshot = await getFrozenLeaderboard();
      if (snapshot) {
        ws.send(
          JSON.stringify({
            type: "leaderboard:update",
            data: snapshot,
            frozen: true,
          })
        );
        return;
      }
    }

    const topUsers = await getTopUsers(50);
    const topTeams = await getTopTeams(50);

    // Enrich with names
    const enrichedUsers = await enrichEntries(topUsers, "user");
    const enrichedTeams = await enrichEntries(topTeams, "team");

    ws.send(
      JSON.stringify({
        type: "leaderboard:update",
        data: {
          users: enrichedUsers,
          teams: enrichedTeams,
        },
        frozen: false,
      })
    );
  } catch (err) {
    console.error("[WS] Error sending leaderboard:", err);
  }
}

/**
 * Broadcast updated leaderboard to all connected clients.
 * Called from the submission service after a correct solve.
 */
export async function broadcastLeaderboardUpdate(server: any) {
  try {
    const { frozen, eventId } = await isLeaderboardFrozen();

    if (frozen && eventId) {
      // During freeze, broadcast the frozen snapshot (no live updates)
      const snapshot = await getFrozenLeaderboard();
      if (snapshot) {
        server.publish(
          LEADERBOARD_TOPIC,
          JSON.stringify({
            type: "leaderboard:update",
            data: snapshot,
            frozen: true,
          })
        );
        return;
      }
    }

    const topUsers = await getTopUsers(50);
    const topTeams = await getTopTeams(50);

    const enrichedUsers = await enrichEntries(topUsers, "user");
    const enrichedTeams = await enrichEntries(topTeams, "team");

    server.publish(
      LEADERBOARD_TOPIC,
      JSON.stringify({
        type: "leaderboard:update",
        data: {
          users: enrichedUsers,
          teams: enrichedTeams,
        },
        frozen: false,
      })
    );
  } catch (err) {
    console.error("[WS] Error broadcasting leaderboard:", err);
  }
}

/**
 * Broadcast a first-blood announcement.
 */
export function broadcastFirstBlood(
  server: any,
  username: string,
  teamName: string | null,
  challengeTitle: string,
  points: number
) {
  server.publish(
    LEADERBOARD_TOPIC,
    JSON.stringify({
      type: "first-blood",
      data: {
        username,
        teamName,
        challengeTitle,
        points,
        timestamp: Date.now(),
      },
    })
  );
}

/**
 * Enrich leaderboard entries with display names.
 */
async function enrichEntries(
  entries: { id: string; score: number }[],
  type: "user" | "team"
) {
  const enriched = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    let name = "Unknown";

    if (type === "user") {
      const [user] = await db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, entry.id));
      name = user?.username || "Unknown";
    } else {
      const [team] = await db
        .select({ name: teams.name })
        .from(teams)
        .where(eq(teams.id, entry.id));
      name = team?.name || "Unknown";
    }

    enriched.push({
      id: entry.id,
      name,
      score: entry.score,
      rank: enriched.length + 1,
    });
  }
  return enriched;
}
