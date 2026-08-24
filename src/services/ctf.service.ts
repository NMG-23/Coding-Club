/**
 * CORE CTF BUSINESS LOGIC (Service Layer)
 * 
 * FUTURE EXPANSION:
 * - This service handles all heavy lifting (login, flag submissions, scoring).
 * - If you move to MySQL/Postgres, Drizzle's syntax here (`eq`, `and`, `db.insert`) remains exactly the same!
 *   You won't need to rewrite any of this business logic, just the schema definitions.
 * - For advanced CTFs, you might want to implement Dynamic Scoring (where a challenge's points decrease 
 *   as more teams solve it). You can add a CRON job or a hook inside `submitFlag()` that recalculates 
 *   points in the `solves` table based on `count(solves)`.
 */
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { teams, sessions, challenges, submissions, solves, eventConfig, events } from '../db/schema';

export class CtfService {
  async login(teamName: string, leaderName: string, ipAddress: string, userAgent: string) {
    const nameNorm = teamName.trim().toLowerCase();
    const leaderNorm = leaderName.trim().toLowerCase();

    // The frontend only passes teamName and leaderName. We find the active event first.
    const activeEvent = await db.select().from(events).where(eq(events.isActive, true)).limit(1).get();
    if (!activeEvent) {
      throw new Error('No active CTF event currently running');
    }

    const teamRecord = await db.select().from(teams).where(
      and(
        sql`lower(team_name) = ${nameNorm}`,
        sql`lower(leader_name) = ${leaderNorm}`,
        eq(teams.eventId, activeEvent.id)
      )
    ).get();

    if (!teamRecord) throw new Error('Login failed');
    if (teamRecord.status === 'banned') throw new Error('Login failed');

    if (teamRecord.activeSessionId) {
      const activeSession = await db.select().from(sessions).where(eq(sessions.id, teamRecord.activeSessionId)).get();
      if (activeSession && activeSession.expiresAt.getTime() > Date.now()) {
        throw new Error('Login failed');
      }
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12); // 12 hours

    await db.insert(sessions).values({
      id: sessionId,
      teamId: teamRecord.id,
      createdAt: new Date(),
      expiresAt,
      ipAddress,
      userAgent
    });

    await db.update(teams).set({ activeSessionId: sessionId }).where(eq(teams.id, teamRecord.id));
    return { sessionId, teamId: teamRecord.id, teamName: teamRecord.teamName, eventId: teamRecord.eventId };
  }

  async validateSession(sessionId: string) {
    const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
    if (!session || session.expiresAt.getTime() < Date.now()) return null;
    const team = await db.select().from(teams).where(eq(teams.id, session.teamId)).get();
    if (team?.activeSessionId !== sessionId) return null;
    return team;
  }

  async checkEventStatus(eventId: number) {
    const config = await db.select().from(eventConfig).where(eq(eventConfig.eventId, eventId)).limit(1).get();
    const event = await db.select().from(events).where(eq(events.id, eventId)).get();
    
    if (!event) return { isPaused: true, isEnded: true, scoreboardFrozen: false };
    if (!config) return { isPaused: event.isActive ? false : true, isEnded: !event.isActive, scoreboardFrozen: false };
    
    // Check if the event has started or ended based on current time
    // We convert Date objects to timestamps (.getTime()) to compare against Date.now()
    const now = Date.now();
    let isStarted = true;
    if (event.startTime && now < event.startTime.getTime()) isStarted = false;
    let isEnded = false;
    if (event.endTime && now > event.endTime.getTime()) isEnded = true;

    return {
      isPaused: config.isPaused || !isStarted,
      isEnded,
      scoreboardFrozen: config.scoreboardFrozen
    };
  }

  async submitFlag(teamId: number, challengeId: number, flag: string) {
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).get();
    if (!team) throw new Error('Team not found');

    const eventStatus = await this.checkEventStatus(team.eventId);
    if (eventStatus.isPaused || eventStatus.isEnded) {
      throw new Error('CTF is currently paused or ended');
    }

    const challenge = await db.select().from(challenges).where(and(eq(challenges.id, challengeId), eq(challenges.isActive, true))).get();
    if (!challenge) throw new Error('Challenge not found');
    
    if (challenge.eventId !== team.eventId) {
      throw new Error('Challenge does not belong to your event');
    }

    const submittedNorm = flag.trim().toLowerCase();
    const expectedNorm = challenge.serverSideFlag.trim().toLowerCase();
    const isCorrect = submittedNorm === expectedNorm;
    const now = new Date();

    await db.insert(submissions).values({
      teamId,
      challengeId,
      submittedFlag: flag.trim(),
      isCorrect,
      submittedAt: now
    });

    let firstBlood = false;

    if (isCorrect) {
      // Check if the team has already solved this challenge
      const existingSolve = await db.select().from(solves).where(and(eq(solves.teamId, teamId), eq(solves.challengeId, challengeId))).get();
      if (!existingSolve) {
        // If they haven't, check if ANY team has solved it. If no one has, it's a first blood!
        const anySolve = await db.select().from(solves).where(eq(solves.challengeId, challengeId)).limit(1).get();
        if (!anySolve) firstBlood = true;
        
        // Insert the solve. We use .onConflictDoNothing() in case two requests from the same team arrive at the exact same millisecond
        await db.insert(solves).values({
          teamId, challengeId, points: challenge.points, solvedAt: now
        }).onConflictDoNothing();
      }
    }

    return { isCorrect, firstBlood, challengeName: challenge.title, eventId: team.eventId };
  }

  async getLeaderboard(eventId: number, adminView = false) {
    const eventStatus = await this.checkEventStatus(eventId);
    const allTeams = await db.select({ id: teams.id, name: teams.teamName }).from(teams).where(eq(teams.eventId, eventId));
    
    // We only need solves for challenges in this event.
    // Or we can just get solves for teams in this event, since a team can only belong to one event.
    const eventTeamIds = allTeams.map(t => t.id);
    let allSolves: typeof solves.$inferSelect[] = [];
    
    if (eventTeamIds.length > 0) {
      // In SQLite IN clause is limited, but for 500-600 teams it's fine. 
      // For safer approach, join queries:
      allSolves = await db.select({
        id: solves.id,
        teamId: solves.teamId,
        challengeId: solves.challengeId,
        points: solves.points,
        solvedAt: solves.solvedAt
      })
      .from(solves)
      .innerJoin(teams, eq(solves.teamId, teams.id))
      .where(eq(teams.eventId, eventId));
    }
    
    const scores = new Map<number, { score: number, lastSolve: number, name: string }>();
    for (const team of allTeams) {
      scores.set(team.id, { score: 0, lastSolve: 0, name: team.name });
    }

    for (const solve of allSolves) {
      const ts = scores.get(solve.teamId);
      if (ts) {
        ts.score += solve.points;
        const solveTime = solve.solvedAt.getTime();
        if (solveTime > ts.lastSolve) ts.lastSolve = solveTime;
      }
    }

    // Convert the Map back to an array for the frontend
    const leaderboard = Array.from(scores.values())
      .filter(t => t.score > 0)
      .sort((a, b) => {
        // Sort descending by score (highest score first)
        if (b.score !== a.score) return b.score - a.score;
        
        // Tie-breaker: Sort ascending by lastSolve time. 
        // A smaller timestamp means they reached that score earlier, so they get the higher rank.
        return a.lastSolve - b.lastSolve;
      });

    if (eventStatus.scoreboardFrozen && !adminView) {
      return { frozen: true };
    }

    return { frozen: eventStatus.scoreboardFrozen, leaderboard };
  }
}

export const ctfService = new CtfService();
