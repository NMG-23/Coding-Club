import { db } from "../db";
import { challenges, solves, submissions } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  updateScoresAfterSolve
} from "../services/leaderboard";
import { canSubmit } from "./event.service";
import {
  NotFoundError,
  ConflictError,
  EventStateError,
  AppError,
} from "../utils/errors";

function calculateDynamicScore(initial: number, min: number, decay: number, solves: number) {
  return Math.max(initial - solves * decay, min);
}

/**
 * Submit a flag for a challenge.
 * Returns the result (correct/incorrect) and, if correct, the updated score info.
 */
export async function submitFlag(
  userId: string,
  teamId: string | null,
  challengeId: string,
  submittedFlag: string
): Promise<{
  correct: boolean;
  message: string;
  points?: number;
  firstBlood?: boolean;
}> {
  // 1. Check event state
  const { allowed, reason } = await canSubmit();
  if (!allowed) {
    throw new EventStateError(reason!);
  }

  // 2. Fetch the challenge
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(and(eq(challenges.id, challengeId), eq(challenges.isActive, true)));

  if (!challenge) {
    throw new NotFoundError("Challenge");
  }

  // 3. Check if already solved by this user
  const [existingSolve] = await db
    .select({ id: solves.id })
    .from(solves)
    .where(and(eq(solves.userId, userId), eq(solves.challengeId, challengeId)));

  if (existingSolve) {
    throw new ConflictError("You have already solved this challenge");
  }

  // 4. Check max attempts (if set)
  if (challenge.maxAttempts) {
    const [attemptCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(and(eq(submissions.userId, userId), eq(submissions.challengeId, challengeId)));

    if (attemptCount.count >= challenge.maxAttempts) {
      throw new AppError(403, "Maximum attempts reached for this challenge", "MAX_ATTEMPTS");
    }
  }

  // 5. Verify the flag
  const isCorrect = await Bun.password.verify(submittedFlag.trim(), challenge.flagHash);

  // 6. Always record the submission (audit trail)
  await db.insert(submissions).values({
    userId,
    challengeId,
    teamId,
    submittedFlag: submittedFlag.trim(),
    isCorrect,
  });

  if (!isCorrect) {
    return { correct: false, message: "Incorrect flag. Try again!" };
  }

  // 7. If correct — record the solve
  let firstBlood = false;

  // Check if this is the first solve (first blood)
  if (challenge.solveCount === 0) {
    firstBlood = true;
  }

  // Increment solve count atomically
  await db
    .update(challenges)
    .set({ solveCount: sql`${challenges.solveCount} + 1` })
    .where(eq(challenges.id, challengeId));

  // Insert solve record
  await db.insert(solves).values({
    userId,
    challengeId,
    teamId,
  });

  // 8. Recalculate scores in memory
  await updateScoresAfterSolve(challengeId);

  // Calculate the new point value for the response
  const newSolveCount = challenge.solveCount + 1;
  const currentPoints = calculateDynamicScore(
    challenge.initialPoints,
    challenge.minPoints,
    challenge.decay,
    newSolveCount
  );

  return {
    correct: true,
    message: firstBlood
      ? "🩸 FIRST BLOOD! Congratulations!"
      : "Correct flag! Well done!",
    points: currentPoints,
    firstBlood,
  };
}

/**
 * Get the current dynamic point value for a challenge.
 */
export function getChallengePoints(challenge: {
  initialPoints: number;
  minPoints: number;
  decay: number;
  solveCount: number;
}): number {
  return calculateDynamicScore(
    challenge.initialPoints,
    challenge.minPoints,
    challenge.decay,
    challenge.solveCount
  );
}
