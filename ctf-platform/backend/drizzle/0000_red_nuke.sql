CREATE TABLE `challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`difficulty` text NOT NULL,
	`initial_points` integer DEFAULT 500 NOT NULL,
	`min_points` integer DEFAULT 100 NOT NULL,
	`decay` integer DEFAULT 20 NOT NULL,
	`flag_hash` text NOT NULL,
	`hints` text DEFAULT '[]',
	`files` text DEFAULT '[]',
	`is_active` integer DEFAULT true NOT NULL,
	`max_attempts` integer,
	`solve_count` integer DEFAULT 0 NOT NULL,
	`author_name` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`scoreboard_freeze_time` integer,
	`is_active` integer DEFAULT false NOT NULL,
	`frozen_leaderboard_snapshot` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `solves` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`challenge_id` text NOT NULL,
	`team_id` text,
	`solved_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_solves_user_challenge` ON `solves` (`user_id`,`challenge_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_solves_team_challenge` ON `solves` (`team_id`,`challenge_id`);--> statement-breakpoint
CREATE INDEX `idx_solves_solved_at` ON `solves` (`solved_at`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`challenge_id` text NOT NULL,
	`team_id` text,
	`submitted_flag` text NOT NULL,
	`is_correct` integer NOT NULL,
	`submitted_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_submissions_user_id` ON `submissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_submissions_challenge_id` ON `submissions` (`challenge_id`);--> statement-breakpoint
CREATE INDEX `idx_submissions_team_id` ON `submissions` (`team_id`);--> statement-breakpoint
CREATE INDEX `idx_submissions_submitted_at` ON `submissions` (`submitted_at`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`invite_code` text NOT NULL,
	`captain_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_name_unique` ON `teams` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `teams_invite_code_unique` ON `teams` (`invite_code`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'player' NOT NULL,
	`team_id` text,
	`is_banned` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_team_id` ON `users` (`team_id`);