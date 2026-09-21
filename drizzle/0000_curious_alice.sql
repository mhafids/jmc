CREATE TABLE `activity_logs` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`module_code` varchar(100) NOT NULL,
	`action` varchar(30) NOT NULL,
	`description` text,
	`subject_id` varchar(36),
	`ip_address` varchar(45),
	`user_agent` text,
	`old_values` json,
	`new_values` json,
	`url` varchar(255),
	`method` varchar(10),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance_imports` (
	`id` varchar(36) NOT NULL,
	`original_filename` varchar(255) NOT NULL,
	`file_path` varchar(255) NOT NULL,
	`period_year` smallint NOT NULL,
	`period_month` tinyint NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'queued',
	`total_rows` int NOT NULL DEFAULT 0,
	`processed_rows` int NOT NULL DEFAULT 0,
	`error_message` text,
	`imported_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance_summaries` (
	`id` varchar(36) NOT NULL,
	`employee_id` varchar(36) NOT NULL,
	`period_year` smallint NOT NULL,
	`period_month` tinyint NOT NULL,
	`hadir` int NOT NULL DEFAULT 0,
	`cuti` int NOT NULL DEFAULT 0,
	`izin` int NOT NULL DEFAULT 0,
	`sakit` int NOT NULL DEFAULT 0,
	`hadir_late` int NOT NULL DEFAULT 0,
	`unpaid_leave` int NOT NULL DEFAULT 0,
	`hadir_unpaid_leave` int NOT NULL DEFAULT 0,
	`status_hadir` varchar(20) NOT NULL DEFAULT 'memenuhi',
	`calculated_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_summaries_emp_period_unique` UNIQUE(`employee_id`,`period_year`,`period_month`)
);
--> statement-breakpoint
CREATE TABLE `attendances` (
	`id` varchar(36) NOT NULL,
	`employee_id` varchar(36) NOT NULL,
	`attendance_import_id` varchar(36),
	`attendance_date` date NOT NULL,
	`checkin_at` time,
	`checkout_at` time,
	`checkin_location` varchar(255),
	`checkout_location` varchar(255),
	`attendance_type` varchar(30) NOT NULL DEFAULT 'hadir',
	`duration_hours` decimal(4,2) NOT NULL DEFAULT '0.00',
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`verification_status` varchar(20) NOT NULL DEFAULT 'valid',
	`verified_by_role` varchar(50),
	`remarks` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendances_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendances_employee_date_unique` UNIQUE(`employee_id`,`attendance_date`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` varchar(36) NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `districts` (
	`id` varchar(36) NOT NULL,
	`regency_id` varchar(36) NOT NULL,
	`code` varchar(20) NOT NULL,
	`name` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `districts_id` PRIMARY KEY(`id`),
	CONSTRAINT `districts_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `employee_educations` (
	`id` varchar(36) NOT NULL,
	`employee_id` varchar(36) NOT NULL,
	`education_level` varchar(20) NOT NULL,
	`school_name` varchar(255) NOT NULL,
	`graduation_year` smallint NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_educations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` varchar(36) NOT NULL,
	`nip` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(20),
	`photo_path` varchar(255),
	`birth_place` varchar(100),
	`birth_date` date,
	`marital_status` varchar(20),
	`children_count` int NOT NULL DEFAULT 0,
	`joined_at` date NOT NULL,
	`position_id` varchar(36) NOT NULL,
	`department_id` varchar(36) NOT NULL,
	`employment_type` varchar(30) NOT NULL,
	`gender` varchar(10) NOT NULL,
	`district_id` varchar(36),
	`full_address` text,
	`distance_km` decimal(6,2) NOT NULL DEFAULT '0.00',
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_nip_unique` UNIQUE(`nip`),
	CONSTRAINT `employees_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `login_otps` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`otp_code` varchar(10) NOT NULL,
	`otp_hash` varchar(255),
	`channel` varchar(20) NOT NULL DEFAULT 'email',
	`sent_to` varchar(255),
	`purpose` varchar(50) NOT NULL DEFAULT 'LOGIN',
	`expires_at` timestamp NOT NULL,
	`verified_at` timestamp,
	`is_used` boolean NOT NULL DEFAULT false,
	`attempts` int NOT NULL DEFAULT 0,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `login_otps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modules` (
	`id` varchar(36) NOT NULL,
	`code` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`path` varchar(255) NOT NULL,
	`order_no` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `modules_id` PRIMARY KEY(`id`),
	CONSTRAINT `modules_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` varchar(36) NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`position_type` varchar(30) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`),
	CONSTRAINT `positions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `provinces` (
	`id` varchar(36) NOT NULL,
	`code` varchar(20) NOT NULL,
	`name` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provinces_id` PRIMARY KEY(`id`),
	CONSTRAINT `provinces_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `regencies` (
	`id` varchar(36) NOT NULL,
	`province_id` varchar(36) NOT NULL,
	`code` varchar(20) NOT NULL,
	`name` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `regencies_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` varchar(36) NOT NULL,
	`role_id` varchar(36) NOT NULL,
	`module_id` varchar(36) NOT NULL,
	`can_access` boolean NOT NULL DEFAULT false,
	`can_create` boolean NOT NULL DEFAULT false,
	`read_scope` varchar(10) NOT NULL DEFAULT 'no',
	`update_scope` varchar(10) NOT NULL DEFAULT 'no',
	`delete_scope` varchar(10) NOT NULL DEFAULT 'no',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permissions_role_module_unique` UNIQUE(`role_id`,`module_id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(36) NOT NULL,
	`code` varchar(50),
	`name` varchar(100) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_code_unique` UNIQUE(`code`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `transport_allowance_details` (
	`id` varchar(36) NOT NULL,
	`transport_allowance_period_id` varchar(36) NOT NULL,
	`employee_id` varchar(36) NOT NULL,
	`base_fare` decimal(12,2) NOT NULL,
	`original_km` decimal(6,2) NOT NULL,
	`rounded_km` int NOT NULL,
	`attendance_days` int NOT NULL,
	`nominal` decimal(15,2) NOT NULL,
	`eligibility_status` varchar(20) NOT NULL DEFAULT 'eligible',
	`calculation_note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transport_allowance_details_id` PRIMARY KEY(`id`),
	CONSTRAINT `transport_details_period_emp_unique` UNIQUE(`transport_allowance_period_id`,`employee_id`)
);
--> statement-breakpoint
CREATE TABLE `transport_allowance_periods` (
	`id` varchar(36) NOT NULL,
	`period_year` smallint NOT NULL,
	`period_month` tinyint NOT NULL,
	`total_recipients` int NOT NULL DEFAULT 0,
	`total_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`calculated_by` varchar(36),
	`calculated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transport_allowance_periods_id` PRIMARY KEY(`id`),
	CONSTRAINT `transport_periods_year_month_unique` UNIQUE(`period_year`,`period_month`)
);
--> statement-breakpoint
CREATE TABLE `transport_allowance_settings` (
	`id` varchar(36) NOT NULL,
	`base_fare` decimal(12,2) NOT NULL,
	`effective_start` date NOT NULL,
	`min_km` decimal(6,2) NOT NULL DEFAULT '0.00',
	`max_km` decimal(6,2),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transport_allowance_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` text,
	`is_remember_me` boolean NOT NULL DEFAULT false,
	`last_activity_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`logged_out_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_session_token_unique` UNIQUE(`session_token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`employee_id` varchar(36),
	`role_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`username` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`cellphone` varchar(20),
	`password` varchar(255) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`job_title` varchar(100),
	`department` varchar(100),
	`is_active` boolean NOT NULL DEFAULT true,
	`password_changed_at` timestamp,
	`last_login_at` timestamp,
	`remember_token` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_cellphone_unique` UNIQUE(`cellphone`)
);
--> statement-breakpoint
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_imports` ADD CONSTRAINT `attendance_imports_imported_by_users_id_fk` FOREIGN KEY (`imported_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_summaries` ADD CONSTRAINT `attendance_summaries_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_attendance_import_id_attendance_imports_id_fk` FOREIGN KEY (`attendance_import_id`) REFERENCES `attendance_imports`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `districts` ADD CONSTRAINT `districts_regency_id_regencies_id_fk` FOREIGN KEY (`regency_id`) REFERENCES `regencies`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_educations` ADD CONSTRAINT `employee_educations_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_position_id_positions_id_fk` FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_department_id_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_district_id_districts_id_fk` FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `login_otps` ADD CONSTRAINT `login_otps_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `regencies` ADD CONSTRAINT `regencies_province_id_provinces_id_fk` FOREIGN KEY (`province_id`) REFERENCES `provinces`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_module_id_modules_id_fk` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transport_allowance_details` ADD CONSTRAINT `transport_allowance_details_transport_allowance_period_id_transport_allowance_periods_id_fk` FOREIGN KEY (`transport_allowance_period_id`) REFERENCES `transport_allowance_periods`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transport_allowance_details` ADD CONSTRAINT `transport_allowance_details_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transport_allowance_periods` ADD CONSTRAINT `transport_allowance_periods_calculated_by_users_id_fk` FOREIGN KEY (`calculated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transport_allowance_settings` ADD CONSTRAINT `transport_allowance_settings_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_activity_logs_user_id` ON `activity_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_activity_logs_module` ON `activity_logs` (`module_code`);--> statement-breakpoint
CREATE INDEX `idx_activity_logs_created_at` ON `activity_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_attendance_imports_period` ON `attendance_imports` (`period_year`,`period_month`);--> statement-breakpoint
CREATE INDEX `idx_attendance_imports_imported_by` ON `attendance_imports` (`imported_by`);--> statement-breakpoint
CREATE INDEX `idx_attendance_summaries_emp` ON `attendance_summaries` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_summaries_period` ON `attendance_summaries` (`period_year`,`period_month`);--> statement-breakpoint
CREATE INDEX `idx_attendances_employee_id` ON `attendances` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_attendances_date` ON `attendances` (`attendance_date`);--> statement-breakpoint
CREATE INDEX `idx_attendances_status` ON `attendances` (`status`);--> statement-breakpoint
CREATE INDEX `idx_departments_code` ON `departments` (`code`);--> statement-breakpoint
CREATE INDEX `idx_districts_regency_id` ON `districts` (`regency_id`);--> statement-breakpoint
CREATE INDEX `idx_districts_code` ON `districts` (`code`);--> statement-breakpoint
CREATE INDEX `idx_employee_educations_employee_id` ON `employee_educations` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_nip` ON `employees` (`nip`);--> statement-breakpoint
CREATE INDEX `idx_employees_email` ON `employees` (`email`);--> statement-breakpoint
CREATE INDEX `idx_employees_position_id` ON `employees` (`position_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_department_id` ON `employees` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_district_id` ON `employees` (`district_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_status` ON `employees` (`status`);--> statement-breakpoint
CREATE INDEX `idx_login_otps_user_id` ON `login_otps` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_login_otps_expires_at` ON `login_otps` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_positions_code` ON `positions` (`code`);--> statement-breakpoint
CREATE INDEX `idx_provinces_code` ON `provinces` (`code`);--> statement-breakpoint
CREATE INDEX `idx_regencies_province_id` ON `regencies` (`province_id`);--> statement-breakpoint
CREATE INDEX `idx_regencies_code` ON `regencies` (`code`);--> statement-breakpoint
CREATE INDEX `idx_role_permissions_role_id` ON `role_permissions` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_role_permissions_module_id` ON `role_permissions` (`module_id`);--> statement-breakpoint
CREATE INDEX `idx_transport_details_period_id` ON `transport_allowance_details` (`transport_allowance_period_id`);--> statement-breakpoint
CREATE INDEX `idx_transport_details_employee_id` ON `transport_allowance_details` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_transport_periods_status` ON `transport_allowance_periods` (`status`);--> statement-breakpoint
CREATE INDEX `idx_transport_settings_active` ON `transport_allowance_settings` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_transport_settings_effective` ON `transport_allowance_settings` (`effective_start`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_user_id` ON `user_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_token` ON `user_sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `idx_users_role_id` ON `users` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_users_employee_id` ON `users` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_users_username` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);