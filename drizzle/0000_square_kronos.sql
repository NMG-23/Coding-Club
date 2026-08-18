CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`start_time` integer,
	`end_time` integer,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "team_id", "created_at", "expires_at", "ip_address", "user_agent") SELECT "id", "team_id", "created_at", "expires_at", "ip_address", "user_agent" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_solves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`challenge_id` integer NOT NULL,
	`points` integer NOT NULL,
	`solved_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_solves`("id", "team_id", "challenge_id", "points", "solved_at") SELECT "id", "team_id", "challenge_id", "points", "solved_at" FROM `solves`;--> statement-breakpoint
DROP TABLE `solves`;--> statement-breakpoint
ALTER TABLE `__new_solves` RENAME TO `solves`;--> statement-breakpoint
CREATE UNIQUE INDEX `team_challenge_unq` ON `solves` (`team_id`,`challenge_id`);--> statement-breakpoint
CREATE TABLE `__new_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`challenge_id` integer NOT NULL,
	`submitted_flag` text NOT NULL,
	`is_correct` integer NOT NULL,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_submissions`("id", "team_id", "challenge_id", "submitted_flag", "is_correct", "submitted_at") SELECT "id", "team_id", "challenge_id", "submitted_flag", "is_correct", "submitted_at" FROM `submissions`;--> statement-breakpoint
DROP TABLE `submissions`;--> statement-breakpoint
ALTER TABLE `__new_submissions` RENAME TO `submissions`;--> statement-breakpoint
DROP INDEX `teams_team_name_unique`;--> statement-breakpoint
ALTER TABLE `teams` ADD `event_id` integer NOT NULL REFERENCES events(id);--> statement-breakpoint
ALTER TABLE `teams` ADD `is_verified` integer DEFAULT false;--> statement-breakpoint
CREATE UNIQUE INDEX `team_name_event_id_idx` ON `teams` (`event_id`,`team_name`);--> statement-breakpoint
ALTER TABLE `challenges` ADD `event_id` integer NOT NULL REFERENCES events(id);--> statement-breakpoint
ALTER TABLE `event_config` ADD `event_id` integer NOT NULL REFERENCES events(id);--> statement-breakpoint
ALTER TABLE `event_config` DROP COLUMN `start_time`;--> statement-breakpoint
ALTER TABLE `event_config` DROP COLUMN `end_time`;