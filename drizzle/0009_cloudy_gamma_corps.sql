CREATE TABLE `activity_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`listing` text,
	`data` text NOT NULL,
	`starts` text,
	`ends` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_plans_user_listing_idx` ON `activity_plans` (`user`,`listing`);--> statement-breakpoint
CREATE INDEX `activity_plans_user_starts_idx` ON `activity_plans` (`user`,`starts`);