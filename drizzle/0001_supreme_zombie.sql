ALTER TABLE `attendances` DROP FOREIGN KEY `attendances_attendance_import_id_attendance_imports_id_fk`;
--> statement-breakpoint
ALTER TABLE `transport_allowance_details` DROP FOREIGN KEY `transport_allowance_details_transport_allowance_period_id_transport_allowance_periods_id_fk`;
--> statement-breakpoint
ALTER TABLE `transport_allowance_details` DROP FOREIGN KEY `transport_allowance_details_employee_id_employees_id_fk`;
--> statement-breakpoint
ALTER TABLE `attendances` ADD CONSTRAINT `fk_attendances_import_id` FOREIGN KEY (`attendance_import_id`) REFERENCES `attendance_imports`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transport_allowance_details` ADD CONSTRAINT `fk_trans_dtl_period_id` FOREIGN KEY (`transport_allowance_period_id`) REFERENCES `transport_allowance_periods`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transport_allowance_details` ADD CONSTRAINT `fk_trans_dtl_emp_id` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;