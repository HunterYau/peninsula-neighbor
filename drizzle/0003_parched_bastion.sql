CREATE TABLE `content_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`reviewed` text,
	`reviewer` text
);
--> statement-breakpoint
CREATE TABLE `hour_verifications` (
	`hour` text PRIMARY KEY NOT NULL,
	`organization` text NOT NULL,
	`status` text DEFAULT 'linked' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`requested` text,
	`verified` text,
	`verifier` text,
	FOREIGN KEY (`hour`) REFERENCES `hours`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`verifier`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `hour_verifications_org_idx` ON `hour_verifications` (`organization`);--> statement-breakpoint
CREATE TABLE `member_settings` (
	`user` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organization_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`organization` text NOT NULL,
	`evidence` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`reviewed` text,
	FOREIGN KEY (`user`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `claims_user_org_idx` ON `organization_claims` (`user`,`organization`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`reviewed` text,
	`reviewer` text,
	FOREIGN KEY (`author`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`status`);