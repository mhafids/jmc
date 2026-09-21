import {
  mysqlTable,
  varchar,
  text,
  int,
  tinyint,
  smallint,
  date,
  time,
  decimal,
  timestamp,
  boolean,
  json,
  unique,
  index,
  foreignKey,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

export const roles = mysqlTable('roles', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  code: varchar('code', { length: 50 }).unique(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const modules = mysqlTable('modules', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  code: varchar('code', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  path: varchar('path', { length: 255 }).notNull(),
  orderNo: int('order_no').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const rolePermissions = mysqlTable(
  'role_permissions',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    roleId: varchar('role_id', { length: 36 })
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    moduleId: varchar('module_id', { length: 36 })
      .notNull()
      .references(() => modules.id, { onDelete: 'cascade' }),
    canAccess: boolean('can_access').default(false).notNull(),
    canCreate: boolean('can_create').default(false).notNull(),
    readScope: varchar('read_scope', { length: 10 }).default('no').notNull(),
    updateScope: varchar('update_scope', { length: 10 }).default('no').notNull(),
    deleteScope: varchar('delete_scope', { length: 10 }).default('no').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    unique('role_permissions_role_module_unique').on(table.roleId, table.moduleId),
    index('idx_role_permissions_role_id').on(table.roleId),
    index('idx_role_permissions_module_id').on(table.moduleId),
  ]
);

export const users = mysqlTable(
  'users',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    employeeId: varchar('employee_id', { length: 36 }),
    roleId: varchar('role_id', { length: 36 })
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    username: varchar('username', { length: 100 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    cellphone: varchar('cellphone', { length: 20 }).unique(),
    password: varchar('password', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    jobTitle: varchar('job_title', { length: 100 }),
    department: varchar('department', { length: 100 }),
    isActive: boolean('is_active').default(true).notNull(),
    passwordChangedAt: timestamp('password_changed_at'),
    lastLoginAt: timestamp('last_login_at'),
    rememberToken: varchar('remember_token', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('idx_users_role_id').on(table.roleId),
    index('idx_users_employee_id').on(table.employeeId),
    index('idx_users_username').on(table.username),
    index('idx_users_email').on(table.email),
  ]
);

export const loginOtps = mysqlTable(
  'login_otps',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    otpCode: varchar('otp_code', { length: 10 }).notNull(),
    otpHash: varchar('otp_hash', { length: 255 }),
    channel: varchar('channel', { length: 20 }).default('email').notNull(),
    sentTo: varchar('sent_to', { length: 255 }),
    purpose: varchar('purpose', { length: 50 }).default('LOGIN').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    verifiedAt: timestamp('verified_at'),
    isUsed: boolean('is_used').default(false).notNull(),
    attempts: int('attempts').default(0).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_login_otps_user_id').on(table.userId),
    index('idx_login_otps_expires_at').on(table.expiresAt),
  ]
);

export const otpVerifications = loginOtps;

export const userSessions = mysqlTable(
  'user_sessions',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    isRememberMe: boolean('is_remember_me').default(false).notNull(),
    lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    loggedOutAt: timestamp('logged_out_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_user_sessions_user_id').on(table.userId),
    index('idx_user_sessions_token').on(table.sessionToken),
  ]
);

export const provinces = mysqlTable(
  'provinces',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    code: varchar('code', { length: 20 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_provinces_code').on(table.code),
  ]
);

export const regencies = mysqlTable(
  'regencies',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    provinceId: varchar('province_id', { length: 36 })
      .notNull()
      .references(() => provinces.id, { onDelete: 'restrict' }),
    code: varchar('code', { length: 20 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_regencies_province_id').on(table.provinceId),
    index('idx_regencies_code').on(table.code),
  ]
);

export const districts = mysqlTable(
  'districts',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    regencyId: varchar('regency_id', { length: 36 })
      .notNull()
      .references(() => regencies.id, { onDelete: 'restrict' }),
    code: varchar('code', { length: 20 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_districts_regency_id').on(table.regencyId),
    index('idx_districts_code').on(table.code),
  ]
);

export const departments = mysqlTable(
  'departments',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    sortOrder: int('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_departments_code').on(table.code),
  ]
);

export const positions = mysqlTable(
  'positions',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    positionType: varchar('position_type', { length: 30 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_positions_code').on(table.code),
  ]
);

export const employees = mysqlTable(
  'employees',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    nip: varchar('nip', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    phone: varchar('phone', { length: 20 }),
    photoPath: varchar('photo_path', { length: 255 }),
    birthPlace: varchar('birth_place', { length: 100 }),
    birthDate: date('birth_date'),
    maritalStatus: varchar('marital_status', { length: 20 }),
    childrenCount: int('children_count').default(0).notNull(),
    joinedAt: date('joined_at').notNull(),
    positionId: varchar('position_id', { length: 36 })
      .notNull()
      .references(() => positions.id, { onDelete: 'restrict' }),
    departmentId: varchar('department_id', { length: 36 })
      .notNull()
      .references(() => departments.id, { onDelete: 'restrict' }),
    employmentType: varchar('employment_type', { length: 30 }).notNull(),
    gender: varchar('gender', { length: 10 }).notNull(),
    districtId: varchar('district_id', { length: 36 })
      .references(() => districts.id, { onDelete: 'set null' }),
    fullAddress: text('full_address'),
    distanceKm: decimal('distance_km', { precision: 6, scale: 2 }).default('0.00').notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    createdBy: varchar('created_by', { length: 36 })
      .references(() => users.id, { onDelete: 'set null' }),
    updatedBy: varchar('updated_by', { length: 36 })
      .references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('idx_employees_nip').on(table.nip),
    index('idx_employees_email').on(table.email),
    index('idx_employees_position_id').on(table.positionId),
    index('idx_employees_department_id').on(table.departmentId),
    index('idx_employees_district_id').on(table.districtId),
    index('idx_employees_status').on(table.status),
  ]
);

export const employeeEducations = mysqlTable(
  'employee_educations',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    employeeId: varchar('employee_id', { length: 36 })
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    educationLevel: varchar('education_level', { length: 20 }).notNull(),
    schoolName: varchar('school_name', { length: 255 }).notNull(),
    graduationYear: smallint('graduation_year').notNull(),
    sortOrder: int('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_employee_educations_employee_id').on(table.employeeId),
  ]
);

export const attendanceImports = mysqlTable(
  'attendance_imports',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    filePath: varchar('file_path', { length: 255 }).notNull(),
    periodYear: smallint('period_year').notNull(),
    periodMonth: tinyint('period_month').notNull(),
    status: varchar('status', { length: 20 }).default('queued').notNull(),
    totalRows: int('total_rows').default(0).notNull(),
    processedRows: int('processed_rows').default(0).notNull(),
    errorMessage: text('error_message'),
    importedBy: varchar('imported_by', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_attendance_imports_period').on(table.periodYear, table.periodMonth),
    index('idx_attendance_imports_imported_by').on(table.importedBy),
  ]
);

export const attendances = mysqlTable(
  'attendances',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    employeeId: varchar('employee_id', { length: 36 })
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    attendanceImportId: varchar('attendance_import_id', { length: 36 }),
    attendanceDate: date('attendance_date').notNull(),
    checkinAt: time('checkin_at'),
    checkoutAt: time('checkout_at'),
    checkinLocation: varchar('checkin_location', { length: 255 }),
    checkoutLocation: varchar('checkout_location', { length: 255 }),
    attendanceType: varchar('attendance_type', { length: 30 }).default('hadir').notNull(),
    durationHours: decimal('duration_hours', { precision: 4, scale: 2 }).default('0.00').notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    verificationStatus: varchar('verification_status', { length: 20 }).default('valid').notNull(),
    verifiedByRole: varchar('verified_by_role', { length: 50 }),
    remarks: text('remarks'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: 'fk_attendances_import_id',
      columns: [table.attendanceImportId],
      foreignColumns: [attendanceImports.id],
    }).onDelete('set null'),
    unique('attendances_employee_date_unique').on(table.employeeId, table.attendanceDate),
    index('idx_attendances_employee_id').on(table.employeeId),
    index('idx_attendances_date').on(table.attendanceDate),
    index('idx_attendances_status').on(table.status),
  ]
);

export const attendanceSummaries = mysqlTable(
  'attendance_summaries',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    employeeId: varchar('employee_id', { length: 36 })
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    periodYear: smallint('period_year').notNull(),
    periodMonth: tinyint('period_month').notNull(),
    hadir: decimal('hadir', { precision: 4, scale: 1 }).default('0.0').notNull(),
    cuti: decimal('cuti', { precision: 4, scale: 1 }).default('0.0').notNull(),
    izin: decimal('izin', { precision: 4, scale: 1 }).default('0.0').notNull(),
    sakit: decimal('sakit', { precision: 4, scale: 1 }).default('0.0').notNull(),
    hadirLate: int('hadir_late').default(0).notNull(),
    unpaidLeave: decimal('unpaid_leave', { precision: 4, scale: 1 }).default('0.0').notNull(),
    hadirUnpaidLeave: decimal('hadir_unpaid_leave', { precision: 4, scale: 1 }).default('0.0').notNull(),
    statusHadir: varchar('status_hadir', { length: 20 }).default('Terpenuhi').notNull(),
    calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    unique('attendance_summaries_emp_period_unique').on(table.employeeId, table.periodYear, table.periodMonth),
    index('idx_attendance_summaries_emp').on(table.employeeId),
    index('idx_attendance_summaries_period').on(table.periodYear, table.periodMonth),
  ]
);

export const transportAllowanceSettings = mysqlTable(
  'transport_allowance_settings',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    baseFare: decimal('base_fare', { precision: 12, scale: 2 }).notNull(),
    effectiveStart: date('effective_start').notNull(),
    minKm: decimal('min_km', { precision: 6, scale: 2 }).default('0.00').notNull(),
    maxKm: decimal('max_km', { precision: 6, scale: 2 }),
    isActive: boolean('is_active').default(true).notNull(),
    createdBy: varchar('created_by', { length: 36 })
      .references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_transport_settings_active').on(table.isActive),
    index('idx_transport_settings_effective').on(table.effectiveStart),
  ]
);

export const transportAllowancePeriods = mysqlTable(
  'transport_allowance_periods',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    periodYear: smallint('period_year').notNull(),
    periodMonth: tinyint('period_month').notNull(),
    totalRecipients: int('total_recipients').default(0).notNull(),
    totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).default('0.00').notNull(),
    status: varchar('status', { length: 20 }).default('draft').notNull(),
    calculatedBy: varchar('calculated_by', { length: 36 })
      .references(() => users.id, { onDelete: 'set null' }),
    calculatedAt: timestamp('calculated_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    unique('transport_periods_year_month_unique').on(table.periodYear, table.periodMonth),
    index('idx_transport_periods_status').on(table.status),
  ]
);

export const transportAllowanceDetails = mysqlTable(
  'transport_allowance_details',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    transportAllowancePeriodId: varchar('transport_allowance_period_id', { length: 36 })
      .notNull(),
    employeeId: varchar('employee_id', { length: 36 })
      .notNull(),
    baseFare: decimal('base_fare', { precision: 12, scale: 2 }).notNull(),
    originalKm: decimal('original_km', { precision: 6, scale: 2 }).notNull(),
    roundedKm: int('rounded_km').notNull(),
    attendanceDays: int('attendance_days').notNull(),
    nominal: decimal('nominal', { precision: 15, scale: 2 }).notNull(),
    eligibilityStatus: varchar('eligibility_status', { length: 20 }).default('eligible').notNull(),
    calculationNote: text('calculation_note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: 'fk_trans_dtl_period_id',
      columns: [table.transportAllowancePeriodId],
      foreignColumns: [transportAllowancePeriods.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'fk_trans_dtl_emp_id',
      columns: [table.employeeId],
      foreignColumns: [employees.id],
    }).onDelete('cascade'),
    unique('transport_details_period_emp_unique').on(table.transportAllowancePeriodId, table.employeeId),
    index('idx_transport_details_period_id').on(table.transportAllowancePeriodId),
    index('idx_transport_details_employee_id').on(table.employeeId),
  ]
);

export const activityLogs = mysqlTable(
  'activity_logs',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: varchar('user_id', { length: 36 })
      .references(() => users.id, { onDelete: 'set null' }),
    moduleCode: varchar('module_code', { length: 100 }).notNull(),
    action: varchar('action', { length: 30 }).notNull(),
    description: text('description'),
    subjectId: varchar('subject_id', { length: 36 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    oldValues: json('old_values'),
    newValues: json('new_values'),
    url: varchar('url', { length: 255 }),
    method: varchar('method', { length: 10 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_activity_logs_user_id').on(table.userId),
    index('idx_activity_logs_module').on(table.moduleCode),
    index('idx_activity_logs_created_at').on(table.createdAt),
  ]
);

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  permissions: many(rolePermissions),
}));

export const modulesRelations = relations(modules, ({ many }) => ({
  permissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  module: one(modules, {
    fields: [rolePermissions.moduleId],
    references: [modules.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  employee: one(employees, {
    fields: [users.employeeId],
    references: [employees.id],
  }),
  sessions: many(userSessions),
  otps: many(loginOtps),
  activityLogs: many(activityLogs),
  importedAttendances: many(attendanceImports),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const loginOtpsRelations = relations(loginOtps, ({ one }) => ({
  user: one(users, {
    fields: [loginOtps.userId],
    references: [users.id],
  }),
}));

export const provincesRelations = relations(provinces, ({ many }) => ({
  regencies: many(regencies),
}));

export const regenciesRelations = relations(regencies, ({ one, many }) => ({
  province: one(provinces, {
    fields: [regencies.provinceId],
    references: [provinces.id],
  }),
  districts: many(districts),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  regency: one(regencies, {
    fields: [districts.regencyId],
    references: [regencies.id],
  }),
  employees: many(employees),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
}));

export const positionsRelations = relations(positions, ({ many }) => ({
  employees: many(employees),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.id],
    references: [users.employeeId],
  }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  position: one(positions, {
    fields: [employees.positionId],
    references: [positions.id],
  }),
  district: one(districts, {
    fields: [employees.districtId],
    references: [districts.id],
  }),
  creator: one(users, {
    fields: [employees.createdBy],
    references: [users.id],
  }),
  updater: one(users, {
    fields: [employees.updatedBy],
    references: [users.id],
  }),
  educations: many(employeeEducations),
  attendances: many(attendances),
  attendanceSummaries: many(attendanceSummaries),
  transportAllowanceDetails: many(transportAllowanceDetails),
}));

export const employeeEducationsRelations = relations(employeeEducations, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeEducations.employeeId],
    references: [employees.id],
  }),
}));

export const attendanceImportsRelations = relations(attendanceImports, ({ one, many }) => ({
  importer: one(users, {
    fields: [attendanceImports.importedBy],
    references: [users.id],
  }),
  attendances: many(attendances),
}));

export const attendancesRelations = relations(attendances, ({ one }) => ({
  employee: one(employees, {
    fields: [attendances.employeeId],
    references: [employees.id],
  }),
  attendanceImport: one(attendanceImports, {
    fields: [attendances.attendanceImportId],
    references: [attendanceImports.id],
  }),
}));

export const attendanceSummariesRelations = relations(attendanceSummaries, ({ one }) => ({
  employee: one(employees, {
    fields: [attendanceSummaries.employeeId],
    references: [employees.id],
  }),
}));

export const transportAllowanceSettingsRelations = relations(transportAllowanceSettings, ({ one }) => ({
  creator: one(users, {
    fields: [transportAllowanceSettings.createdBy],
    references: [users.id],
  }),
}));

export const transportAllowancePeriodsRelations = relations(transportAllowancePeriods, ({ one, many }) => ({
  calculator: one(users, {
    fields: [transportAllowancePeriods.calculatedBy],
    references: [users.id],
  }),
  details: many(transportAllowanceDetails),
}));

export const transportAllowanceDetailsRelations = relations(transportAllowanceDetails, ({ one }) => ({
  period: one(transportAllowancePeriods, {
    fields: [transportAllowanceDetails.transportAllowancePeriodId],
    references: [transportAllowancePeriods.id],
  }),
  employee: one(employees, {
    fields: [transportAllowanceDetails.employeeId],
    references: [employees.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));
