CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`post` text,
	`host` text NOT NULL,
	`guest` text NOT NULL,
	`title` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	`host_read` text DEFAULT '' NOT NULL,
	`guest_read` text DEFAULT '' NOT NULL,
	`closed_by` text,
	FOREIGN KEY (`post`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`host`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`guest`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_post_guest_idx` ON `conversations` (`post`,`guest`);--> statement-breakpoint
CREATE INDEX `conversation_host_idx` ON `conversations` (`host`);--> statement-breakpoint
CREATE INDEX `conversation_guest_idx` ON `conversations` (`guest`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation` text NOT NULL,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`conversation`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversation`,`created`);