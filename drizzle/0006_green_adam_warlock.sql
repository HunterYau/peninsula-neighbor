CREATE TABLE `onboarding` (
	`user` text PRIMARY KEY NOT NULL,
	`completed` text NOT NULL,
	`skipped` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
