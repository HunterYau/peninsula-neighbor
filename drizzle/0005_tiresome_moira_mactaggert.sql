CREATE TABLE `map_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`kind` text NOT NULL,
	`category` text NOT NULL,
	`area` text NOT NULL,
	`title` text NOT NULL,
	`details` text NOT NULL,
	`lat` text NOT NULL,
	`lng` text NOT NULL,
	`observed` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`reviewed` text,
	FOREIGN KEY (`author`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `map_reports_status_idx` ON `map_reports` (`kind`,`status`,`observed`);--> statement-breakpoint
CREATE TABLE `map_source_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`checked` text NOT NULL
);
