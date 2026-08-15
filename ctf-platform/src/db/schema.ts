import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  startTime: integer('start_time', { mode: 'timestamp_ms' }),
  endTime: integer('end_time', { mode: 'timestamp_ms' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const teams = sqliteTable('teams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  teamName: text('team_name').notNull(),
  leaderName: text('leader_name').notNull(),
  members: text('members').notNull(),
  status: text('status', { enum: ['active', 'banned'] }).default('active').notNull(),
  activeSessionId: text('active_session_id'),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false),
}, (t) => ({
  unqName: uniqueIndex('team_name_event_id_idx').on(t.eventId, t.teamName)
}));

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

export const challenges = sqliteTable('challenges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  options: text('options'), // JSON string array of options: ["Option A", "Option B", "Option C", "Option D"]
  category: text('category').notNull(),
  difficulty: text('difficulty').notNull(),
  points: integer('points').notNull(),
  serverSideFlag: text('server_side_flag').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
});

export const submissions = sqliteTable('submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id, { onDelete: 'cascade' }),
  submittedFlag: text('submitted_flag').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }).notNull(),
});

export const solves = sqliteTable('solves', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id, { onDelete: 'cascade' }),
  points: integer('points').notNull(),
  solvedAt: integer('solved_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  unq: uniqueIndex('team_challenge_unq').on(t.teamId, t.challengeId),
}));

export const eventConfig = sqliteTable('event_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  isPaused: integer('is_paused', { mode: 'boolean' }).default(true).notNull(),
  scoreboardFrozen: integer('scoreboard_frozen', { mode: 'boolean' }).default(false).notNull(),
});
