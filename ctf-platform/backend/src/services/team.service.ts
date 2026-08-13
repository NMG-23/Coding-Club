import { db } from "../db";
import { teams, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError, ConflictError, ForbiddenError, AppError } from "../utils/errors";

/**
 * Generate a random 8-character invite code.
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No O/0/I/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a new team. The creator becomes the captain.
 */
export async function createTeam(userId: string, teamName: string) {
  // Check if user is already on a team
  const [user] = await db
    .select({ teamId: users.teamId })
    .from(users)
    .where(eq(users.id, userId));

  if (user?.teamId) {
    throw new ConflictError("You are already on a team. Leave your current team first.");
  }

  // Check team name uniqueness
  const [existing] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.name, teamName));

  if (existing) {
    throw new ConflictError("Team name already taken");
  }

  const inviteCode = generateInviteCode();

  const [team] = await db
    .insert(teams)
    .values({
      name: teamName,
      captainId: userId,
      inviteCode,
    })
    .returning();

  // Update user's teamId
  await db.update(users).set({ teamId: team.id }).where(eq(users.id, userId));

  return team;
}

/**
 * Join a team using an invite code.
 */
export async function joinTeam(userId: string, inviteCode: string) {
  // Check if user is already on a team
  const [user] = await db
    .select({ teamId: users.teamId })
    .from(users)
    .where(eq(users.id, userId));

  if (user?.teamId) {
    throw new ConflictError("You are already on a team. Leave your current team first.");
  }

  // Find team by invite code
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.inviteCode, inviteCode.toUpperCase()));

  if (!team) {
    throw new NotFoundError("Team with that invite code");
  }

  // Check team size (max 4 members)
  const members = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.teamId, team.id));

  if (members.length >= 4) {
    throw new AppError(400, "Team is full (max 4 members)", "TEAM_FULL");
  }

  // Join the team
  await db.update(users).set({ teamId: team.id }).where(eq(users.id, userId));

  return team;
}

/**
 * Leave current team. If captain leaves, promote the next member or disband.
 */
export async function leaveTeam(userId: string) {
  const [user] = await db
    .select({ teamId: users.teamId })
    .from(users)
    .where(eq(users.id, userId));

  if (!user?.teamId) {
    throw new AppError(400, "You are not on a team", "NOT_ON_TEAM");
  }

  const teamId = user.teamId;

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId));

  if (!team) {
    throw new NotFoundError("Team");
  }

  // Remove user from team
  await db.update(users).set({ teamId: null }).where(eq(users.id, userId));

  // Check remaining members
  const remainingMembers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.teamId, teamId));

  if (remainingMembers.length === 0) {
    // No members left — disband team
    await db.delete(teams).where(eq(teams.id, teamId));
  } else if (team.captainId === userId) {
    // Captain left — promote first remaining member
    await db
      .update(teams)
      .set({ captainId: remainingMembers[0].id })
      .where(eq(teams.id, teamId));
  }

  return { message: "Left team successfully" };
}

/**
 * Get team details with members.
 */
export async function getTeamWithMembers(teamId: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId));

  if (!team) {
    throw new NotFoundError("Team");
  }

  const members = await db
    .select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .where(eq(users.teamId, teamId));

  return { ...team, members };
}
