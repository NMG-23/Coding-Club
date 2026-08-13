import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ─── Teams ───────────────────────────────────────────────────────────────────

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").unique().notNull(),
  inviteCode: text("invite_code").unique().notNull(),
  captainId: text("captain_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    username: text("username").unique().notNull(),
    email: text("email").unique().notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").default("player").notNull(), // 'player' | 'admin'
    teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
    isBanned: integer("is_banned", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  },
  (table) => ({
    teamIdIdx: index("idx_users_team_id").on(table.teamId),
  })
);

// ─── Challenges ──────────────────────────────────────────────────────────────

export const challenges = sqliteTable("challenges", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'web' | 'crypto' | 'forensics' | 'osint' | 'misc'
  difficulty: text("difficulty").notNull(), // 'easy' | 'medium' | 'hard'
  initialPoints: integer("initial_points").notNull().default(500),
  minPoints: integer("min_points").notNull().default(100),
  decay: integer("decay").notNull().default(20),
  flagHash: text("flag_hash").notNull(),
  hints: text("hints").default("[]"), // stringified JSON array
  files: text("files").default("[]"), // stringified JSON array
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  maxAttempts: integer("max_attempts"),
  solveCount: integer("solve_count").default(0).notNull(),
  authorName: text("author_name"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// ─── Submissions ──────────────────────────────────────────────────────────────

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    challengeId: text("challenge_id")
      .references(() => challenges.id, { onDelete: "cascade" })
      .notNull(),
    teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
    submittedFlag: text("submitted_flag").notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    submittedAt: integer("submitted_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_submissions_user_id").on(table.userId),
    challengeIdIdx: index("idx_submissions_challenge_id").on(table.challengeId),
    teamIdIdx: index("idx_submissions_team_id").on(table.teamId),
    submittedAtIdx: index("idx_submissions_submitted_at").on(table.submittedAt),
  })
);

// ─── Solves ──────────────────────────────────────────────────────────────────

export const solves = sqliteTable(
  "solves",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    challengeId: text("challenge_id")
      .references(() => challenges.id, { onDelete: "cascade" })
      .notNull(),
    teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
    solvedAt: integer("solved_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  },
  (table) => ({
    userChallengeIdx: uniqueIndex("idx_solves_user_challenge").on(table.userId, table.challengeId),
    teamChallengeIdx: uniqueIndex("idx_solves_team_challenge").on(table.teamId, table.challengeId),
    solvedAtIdx: index("idx_solves_solved_at").on(table.solvedAt),
  })
);

// ─── Events ──────────────────────────────────────────────────────────────────

export const events = sqliteTable("events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  startTime: integer("start_time", { mode: "timestamp" }).notNull(),
  endTime: integer("end_time", { mode: "timestamp" }).notNull(),
  scoreboardFreezeTime: integer("scoreboard_freeze_time", { mode: "timestamp" }),
  isActive: integer("is_active", { mode: "boolean" }).default(false).notNull(),
  frozenLeaderboardSnapshot: text("frozen_leaderboard_snapshot"), // stringified JSON
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  team: one(teams, { fields: [users.teamId], references: [teams.id] }),
  submissions: many(submissions),
  solves: many(solves),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  captain: one(users, { fields: [teams.captainId], references: [users.id] }),
  members: many(users),
  solves: many(solves),
}));

export const challengesRelations = relations(challenges, ({ many }) => ({
  submissions: many(submissions),
  solves: many(solves),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  user: one(users, { fields: [submissions.userId], references: [users.id] }),
  challenge: one(challenges, { fields: [submissions.challengeId], references: [challenges.id] }),
  team: one(teams, { fields: [submissions.teamId], references: [teams.id] }),
}));

export const solvesRelations = relations(solves, ({ one }) => ({
  user: one(users, { fields: [solves.userId], references: [users.id] }),
  challenge: one(challenges, { fields: [solves.challengeId], references: [challenges.id] }),
  team: one(teams, { fields: [solves.teamId], references: [teams.id] }),
}));
