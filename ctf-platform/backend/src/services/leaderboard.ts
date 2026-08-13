import { db } from "../db";
import { users, teams, challenges, solves, events } from "../db/schema";
import { eq, sum, desc } from "drizzle-orm";

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
}

// In-memory state
let userScores: Record<string, number> = {};
let teamScores: Record<string, number> = {};
let cachedUserLeaderboard: (LeaderboardEntry & { rank: number })[] = [];
let cachedTeamLeaderboard: (LeaderboardEntry & { rank: number })[] = [];

/**
 * Rebuilds the in-memory leaderboard completely from the SQLite database.
 * Used on server start.
 */
export async function rebuildLeaderboard() {
  console.log("[Leaderboard] Rebuilding in-memory state from database...");
  
  userScores = {};
  teamScores = {};
  
  // 1. Get all active challenges and their current point values
  const allChallenges = await db.select().from(challenges);
  const pointsMap = new Map(allChallenges.map((c) => [c.id, calculateCurrentPoints(c)]));

  // 2. Calculate User Scores
  const allUsers = await db.select({ id: users.id, name: users.username, teamId: users.teamId }).from(users).where(eq(users.role, "player"));
  
  for (const user of allUsers) {
    const userSolves = await db.select({ challengeId: solves.challengeId }).from(solves).where(eq(solves.userId, user.id));
    let score = 0;
    for (const solve of userSolves) {
      score += pointsMap.get(solve.challengeId) || 0;
    }
    userScores[user.id] = score;
  }

  // 3. Calculate Team Scores
  const allTeams = await db.select({ id: teams.id, name: teams.name }).from(teams);
  
  for (const team of allTeams) {
    const teamSolves = await db.select({ challengeId: solves.challengeId }).from(solves).where(eq(solves.teamId, team.id));
    let score = 0;
    // ensure unique challenges only for a team
    const uniqueChallengeIds = [...new Set(teamSolves.map(s => s.challengeId))];
    for (const cid of uniqueChallengeIds) {
      score += pointsMap.get(cid) || 0;
    }
    teamScores[team.id] = score;
  }
  
  refreshCachedLeaderboards(allUsers, allTeams);
  console.log("[Leaderboard] Rebuild complete.");
}

function refreshCachedLeaderboards(
  allUsers: { id: string, name: string }[], 
  allTeams: { id: string, name: string }[]
) {
  // Sort users
  cachedUserLeaderboard = allUsers
    .map(u => ({ id: u.id, name: u.name, score: userScores[u.id] || 0 }))
    .sort((a, b) => b.score - a.score)
    .map((u, index) => ({ ...u, rank: index + 1 }));

  // Sort teams
  cachedTeamLeaderboard = allTeams
    .map(t => ({ id: t.id, name: t.name, score: teamScores[t.id] || 0 }))
    .sort((a, b) => b.score - a.score)
    .map((t, index) => ({ ...t, rank: index + 1 }));
}

function calculateCurrentPoints(challenge: any) {
  const points = challenge.initialPoints - challenge.solveCount * challenge.decay;
  return Math.max(points, challenge.minPoints);
}

/**
 * Called when a new solve occurs. Updates memory state and returns the new full leaderboard.
 */
export async function updateScoresAfterSolve(challengeId: string) {
  // Simple but less efficient: just rebuild. 
  // Since this is local dev without docker, standard sqlite rebuilding is fast enough for <600 users.
  await rebuildLeaderboard();
}

/**
 * Returns the top N users
 */
export async function getTopUsers(limit = 100) {
  return cachedUserLeaderboard.slice(0, limit);
}

/**
 * Returns the top N teams
 */
export async function getTopTeams(limit = 100) {
  return cachedTeamLeaderboard.slice(0, limit);
}

/**
 * Get a specific user's rank and score
 */
export async function getUserRank(userId: string) {
  const entry = cachedUserLeaderboard.find(u => u.id === userId);
  return entry ? { rank: entry.rank, score: entry.score } : { rank: null, score: 0 };
}

export async function getUserScore(userId: string) {
  return userScores[userId] || 0;
}

/**
 * Get a specific team's rank and score
 */
export async function getTeamRank(teamId: string) {
  const entry = cachedTeamLeaderboard.find(t => t.id === teamId);
  return entry ? { rank: entry.rank, score: entry.score } : { rank: null, score: 0 };
}

export async function getTeamScore(teamId: string) {
  return teamScores[teamId] || 0;
}

export async function freezeLeaderboard(eventId: string) {
  const snapshot = {
    users: await getTopUsers(100),
    teams: await getTopTeams(100)
  };
  
  await db.update(events)
    .set({ frozenLeaderboardSnapshot: JSON.stringify(snapshot) })
    .where(eq(events.id, eventId));
    
  return snapshot;
}

export async function getFrozenLeaderboard() {
  const activeEvent = await db.select().from(events).where(eq(events.isActive, true)).limit(1);
  if (!activeEvent.length || !activeEvent[0].frozenLeaderboardSnapshot) return { users: [], teams: [] };
  return JSON.parse(activeEvent[0].frozenLeaderboardSnapshot);
}

