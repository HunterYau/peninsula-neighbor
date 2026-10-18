CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post` text NOT NULL,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`post`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `comments_post_idx` ON `comments` (`post`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`area` text NOT NULL,
	`location` text NOT NULL,
	`starts` text NOT NULL,
	`ends` text NOT NULL,
	`category` text NOT NULL,
	`access` text DEFAULT '' NOT NULL,
	`capacity` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`author`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_starts_idx` ON `events` (`starts`);--> statement-breakpoint
CREATE TABLE `hours` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`org` text NOT NULL,
	`date` text NOT NULL,
	`minutes` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `hours_user_idx` ON `hours` (`user`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`area` text NOT NULL,
	`topic` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created` text NOT NULL,
	`expires` text NOT NULL,
	FOREIGN KEY (`author`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `posts_created_idx` ON `posts` (`created`);--> statement-breakpoint
CREATE INDEX `posts_author_idx` ON `posts` (`author`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`user` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`area` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`until` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter` text NOT NULL,
	`target` text NOT NULL,
	`kind` text NOT NULL,
	`reason` text NOT NULL,
	`created` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`reporter`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rsvps` (
	`event` text NOT NULL,
	`user` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`event`, `user`),
	FOREIGN KEY (`event`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
