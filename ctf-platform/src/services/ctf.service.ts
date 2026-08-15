import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { teams, sessions, challenges, submissions, solves, eventConfig } from '../db/schema';

export class CtfService {
  async login(teamName: string, leaderName: string, ipAddress: string, userAgent: string) {
    const nameNorm = teamName.trim().toLowerCase();
    const leaderNorm = leaderName.trim().toLowerCase();

    const teamRecord = await db.select().from(teams).where(
      sql`lower(team_name) = ${nameNorm} AND lower(leader_name) = ${leaderNorm}`
    ).get();

    if (!teamRecord) throw new Error('Invalid credentials');
    if (teamRecord.status === 'banned') throw new Error('Team is banned');

    if (teamRecord.activeSessionId) {
      const activeSession = await db.select().from(sessions).where(eq(sessions.id, teamRecord.activeSessionId)).get();
      if (activeSession && activeSession.expiresAt > Date.now()) {
        throw new Error('Active session already in progress');
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
    return { sessionId, teamId: teamRecord.id, teamName: teamRecord.teamName };
  }

  async validateSession(sessionId: string) {
    const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
    if (!session || session.expiresAt < Date.now()) return null;
    const team = await db.select().from(teams).where(eq(teams.id, session.teamId)).get();
    if (team?.activeSessionId !== sessionId) return null;
    return team;
  }

  async checkEventStatus() {
    const config = await db.select().from(eventConfig).limit(1).get();
    if (!config) return { isPaused: true, isEnded: true, scoreboardFrozen: false };
    const now = Date.now();
    let isStarted = true;
    if (config.startTime && now < config.startTime) isStarted = false;
    let isEnded = false;
    if (config.endTime && now > config.endTime) isEnded = true;

    return {
      isPaused: config.isPaused || !isStarted,
      isEnded,
      scoreboardFrozen: config.scoreboardFrozen
    };
  }

  async submitFlag(teamId: number, challengeId: number, flag: string) {
    const eventStatus = await this.checkEventStatus();
    if (eventStatus.isPaused || eventStatus.isEnded) {
      throw new Error('CTF is currently paused or ended');
    }

    const challenge = await db.select().from(challenges).where(and(eq(challenges.id, challengeId), eq(challenges.isActive, true))).get();
    if (!challenge) throw new Error('Challenge not found');

    const isCorrect = challenge.serverSideFlag === flag.trim();
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
      const existingSolve = await db.select().from(solves).where(and(eq(solves.teamId, teamId), eq(solves.challengeId, challengeId))).get();
      if (!existingSolve) {
        const anySolve = await db.select().from(solves).where(eq(solves.challengeId, challengeId)).limit(1).get();
        if (!anySolve) firstBlood = true;
        await db.insert(solves).values({
          teamId, challengeId, points: challenge.points, solvedAt: now
        }).onConflictDoNothing();
      }
    }

    return { isCorrect, firstBlood, challengeName: challenge.title };
  }

  async getLeaderboard(adminView = false) {
    const eventStatus = await this.checkEventStatus();
    const allTeams = await db.select({ id: teams.id, name: teams.teamName }).from(teams);
    const allSolves = await db.select().from(solves);
    
    const scores = new Map<number, { score: number, lastSolve: number, name: string }>();
    for (const team of allTeams) {
      scores.set(team.id, { score: 0, lastSolve: 0, name: team.name });
    }

    for (const solve of allSolves) {
      const ts = scores.get(solve.teamId);
      if (ts) {
        ts.score += solve.points;
        if (solve.solvedAt > ts.lastSolve) ts.lastSolve = solve.solvedAt;
      }
    }

    const leaderboard = Array.from(scores.values())
      .filter(t => t.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.lastSolve - b.lastSolve;
      });

    return { frozen: eventStatus.scoreboardFrozen, leaderboard };
  }
}

export const ctfService = new CtfService();
