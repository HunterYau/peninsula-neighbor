CREATE TABLE `ask_chats` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`title` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`deleted` text,
	FOREIGN KEY (`user`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ask_chats_user_updated_idx` ON `ask_chats` (`user`,`updated`);