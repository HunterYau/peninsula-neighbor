CREATE TABLE `discoveries` (
	`id` text PRIMARY KEY NOT NULL,
	`dedupe` text NOT NULL,
	`source` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`area` text NOT NULL,
	`location` text NOT NULL,
	`starts` text NOT NULL,
	`ends` text NOT NULL,
	`category` text NOT NULL,
	`cost` text DEFAULT 'Check organizer' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`checked` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discoveries_dedupe_idx` ON `discoveries` (`dedupe`);--> statement-breakpoint
CREATE INDEX `discoveries_ends_idx` ON `discoveries` (`ends`);--> statement-breakpoint
CREATE TABLE `discovery_checks` (
	`source` text PRIMARY KEY NOT NULL,
	`attempted` text NOT NULL,
	`succeeded` text,
	`state` text NOT NULL,
	`note` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sightings` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`area` text NOT NULL,
	`location` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`expires` text NOT NULL,
	FOREIGN KEY (`author`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sightings_expires_idx` ON `sightings` (`expires`);