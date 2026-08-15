import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const teams = sqliteTable('teams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamName: text('team_name').notNull().unique(),
  leaderName: text('leader_name').notNull(),
  members: text('members').notNull(),
  status: text('status', { enum: ['active', 'banned'] }).default('active').notNull(),
  activeSessionId: text('active_session_id'),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

export const challenges = sqliteTable('challenges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  difficulty: text('difficulty').notNull(),
  points: integer('points').notNull(),
  serverSideFlag: text('server_side_flag').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
});

export const submissions = sqliteTable('submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('team_id').notNull().references(() => teams.id),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  submittedFlag: text('submitted_flag').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }).notNull(),
});

export const solves = sqliteTable('solves', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('team_id').notNull().references(() => teams.id),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  points: integer('points').notNull(),
  solvedAt: integer('solved_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  unq: uniqueIndex('team_challenge_unq').on(t.teamId, t.challengeId),
}));

export const eventConfig = sqliteTable('event_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startTime: integer('start_time', { mode: 'timestamp_ms' }),
  endTime: integer('end_time', { mode: 'timestamp_ms' }),
  isPaused: integer('is_paused', { mode: 'boolean' }).default(true).notNull(),
  scoreboardFrozen: integer('scoreboard_frozen', { mode: 'boolean' }).default(false).notNull(),
});
