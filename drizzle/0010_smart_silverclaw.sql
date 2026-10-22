ALTER TABLE `reports` ADD `note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD `reviewed` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `reviewer` text REFERENCES profiles(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `reports_status_created_idx` ON `reports` (`status`,`created`);