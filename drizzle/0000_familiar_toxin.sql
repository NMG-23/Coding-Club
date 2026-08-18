CREATE TABLE `challenges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`difficulty` text NOT NULL,
	`points` integer NOT NULL,
	`server_side_flag` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`start_time` integer,
	`end_time` integer,
	`is_paused` integer DEFAULT true NOT NULL,
	`scoreboard_frozen` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `solves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`challenge_id` integer NOT NULL,
	`points` integer NOT NULL,
	`solved_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_challenge_unq` ON `solves` (`team_id`,`challenge_id`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`challenge_id` integer NOT NULL,
	`submitted_flag` text NOT NULL,
	`is_correct` integer NOT NULL,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_name` text NOT NULL,
	`leader_name` text NOT NULL,
	`members` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`active_session_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_team_name_unique` ON `teams` (`team_name`);