# Dokumentasi Schema Database: Sistem Informasi Mini (HR & Presensi)

Dokumen ini merinci rancangan dan translasi ERD (*Entity Relationship Diagram*) **"Sistem Informasi Mini - Tes Teknis Programmer Middle/Senior"** ke dalam skema basis data relasional (MySQL/MariaDB + Drizzle ORM).

Desain ini dibuat agar:
1. **Mudah Diimplementasikan**: Penamaan field konsisten, pemetaan tipe data jelas, dan struktur modular.
2. **Model Murah / Ringan (Resource-Friendly)**: Menggunakan tipe data optimal (misal `varchar` terukur, `date`, `time`, boolean/tinyint, decimal untuk rupiah), indexing strategis pada Foreign Key dan pencarian umum tanpa over-indexing.
3. **Mudah Dipahami**: Dikelompokkan per domain/modul bisnis (RBAC, Organisasi, Kepegawaian, Presensi, Tunjangan Transport, Log).

---

## 1. Ikhtisar Arsitektur ERD & Domain Modul

ERD terdiri dari 16 tabel yang terbagi menjadi 6 domain:

```
+-----------------------------------------------------------------------------------+
| 1. RBAC & Akses       : roles, modules, role_permissions                          |
| 2. Auth & Akun        : users, login_otps, user_sessions                          |
| 3. Master Organisasi  : departments, positions, provinces, regencies, districts   |
| 4. Kepegawaian (HR)   : employees, employee_educations                            |
| 5. Presensi           : attendances, attendance_imports, attendance_summaries     |
| 6. Tunjangan Transport: transport_allowance_settings, transport_allowance_periods, |
|                         transport_allowance_details                               |
| 7. Audit & Log        : activity_logs                                             |
+-----------------------------------------------------------------------------------+
```

---

## 2. Rincian Skema per Tabel & Modul

### Modul 1: RBAC (Role-Based Access Control)

#### 1. `roles`
Menyimpan peran/tingkatan pengguna sistem.
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `code`: `varchar(50)` (UNIQUE, NOT NULL) — contoh: `superadmin`, `hrd_manager`, `hrd_admin`
- `name`: `varchar(100)` (NOT NULL) — label display
- `description`: `text` (NULL)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

#### 2. `modules`
Daftar modul/menu aplikasi yang diatur hak aksesnya.
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `code`: `varchar(100)` (UNIQUE, NOT NULL) — contoh: `dashboard`, `employees`, `attendance`, `transport_allowance`
- `name`: `varchar(255)` (NOT NULL)
- `path`: `varchar(255)` (NULL) — route path / URL
- `sort_order`: `int` (DEFAULT 0)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

#### 3. `role_permissions`
Matriks hak akses (CRUD & Scoping) per peran per modul.
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `role_id`: `varchar(36)` (FK -> `roles.id`, ON DELETE CASCADE)
- `module_id`: `varchar(36)` (FK -> `modules.id`, ON DELETE CASCADE)
- `can_access`: `boolean` (DEFAULT false) — Hak buka halaman
- `can_create`: `boolean` (DEFAULT false) — Hak buat data baru
- `read_scope`: `varchar(10)` (DEFAULT 'no') — Pilihan: `'no'`, `'all'`, `'own'`
- `update_scope`: `varchar(10)` (DEFAULT 'no') — Pilihan: `'no'`, `'all'`, `'own'`
- `delete_scope`: `varchar(10)` (DEFAULT 'no') — Pilihan: `'no'`, `'all'`, `'own'`
- `created_at`: `timestamp`
- `updated_at`: `timestamp`
- **Constraint / Index**: `UNIQUE(role_id, module_id)`

---

### Modul 2: User Account & Authentication

#### 4. `users`
Akun login ke dalam sistem web admin.
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `employee_id`: `varchar(36)` (FK -> `employees.id`, NULL, ON DELETE SET NULL)
- `role_id`: `varchar(36)` (FK -> `roles.id`, ON DELETE RESTRICT)
- `name`: `varchar(255)` (NOT NULL)
- `username`: `varchar(100)` (UNIQUE, NOT NULL)
- `email`: `varchar(255)` (UNIQUE, NULL)
- `cellphone`: `varchar(20)` (UNIQUE, NULL)
- `password`: `varchar(255)` (NOT NULL, Argon2 / Bcrypt Hash)
- `status`: `varchar(20)` (DEFAULT 'active') — `'active'`, `'inactive'`
- `password_changed_at`: `timestamp` (NULL)
- `last_login_at`: `timestamp` (NULL)
- `remember_token`: `varchar(100)` (NULL)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`
- `deleted_at`: `timestamp` (NULL - soft delete)

#### 5. `login_otps`
Verifikasi kode OTP saat otentikasi 2FA / Login.
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `user_id`: `varchar(36)` (FK -> `users.id`, ON DELETE CASCADE)
- `otp_hash`: `varchar(255)` (NOT NULL) — Hash dari OTP
- `channel`: `varchar(20)` (DEFAULT 'email') — `'email'` / `'whatsapp'`
- `sent_to`: `varchar(255)` (NOT NULL) — target email/nomor HP
- `expires_at`: `timestamp` (NOT NULL)
- `verified_at`: `timestamp` (NULL)
- `is_used`: `boolean` (DEFAULT false)
- `attempts`: `int` (DEFAULT 0)
- `ip_address`: `varchar(45)` (NULL)
- `user_agent`: `text` (NULL)
- `created_at`: `timestamp`

#### 6. `user_sessions`
Pencatatan token sesi aktif pengguna.
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `user_id`: `varchar(36)` (FK -> `users.id`, ON DELETE CASCADE)
- `session_token`: `varchar(255)` (UNIQUE, NOT NULL)
- `remember_me`: `boolean` (DEFAULT false)
- `ip_address`: `varchar(45)` (NULL)
- `user_agent`: `text` (NULL)
- `last_activity_at`: `timestamp` (NOT NULL)
- `expires_at`: `timestamp` (NOT NULL)
- `logged_out_at`: `timestamp` (NULL)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

---

### Modul 3: Master Data Wilayah & Organisasi

#### 7. `provinces`
- `id`: `varchar(36)` / `varchar(10)` (Primary Key, misal kode BPS Kemendagri)
- `code`: `varchar(20)` (UNIQUE, NOT NULL)
- `name`: `varchar(100)` (NOT NULL)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

#### 8. `regencies` (Kabupaten / Kota)
- `id`: `varchar(36)` / `varchar(10)` (Primary Key)
- `province_id`: `varchar(36)` (FK -> `provinces.id`, ON DELETE RESTRICT)
- `code`: `varchar(20)` (UNIQUE, NOT NULL)
- `name`: `varchar(100)` (NOT NULL)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

#### 9. `districts` (Kecamatan)
- `id`: `varchar(36)` / `varchar(10)` (Primary Key)
- `regency_id`: `varchar(36)` (FK -> `regencies.id`, ON DELETE RESTRICT)
- `code`: `varchar(20)` (UNIQUE, NOT NULL)
- `name`: `varchar(100)` (NOT NULL)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

#### 10. `departments`
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `code`: `varchar(50)` (UNIQUE, NOT NULL)
- `name`: `varchar(100)` (NOT NULL)
- `sort_order`: `int` (DEFAULT 0)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

#### 11. `positions` (Jabatan)
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `code`: `varchar(50)` (UNIQUE, NOT NULL)
- `name`: `varchar(100)` (NOT NULL)
- `position_type`: `varchar(30)` (NOT NULL) — contoh: `'manager'`, `'staff'`, `'magang'`
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

---

### Modul 4: Data Karyawan (Employees)

#### 12. `employees`
Profil induk karyawan perusahaan.
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `nip`: `varchar(50)` (UNIQUE, NOT NULL) — Nomor Induk Pegawai
- `name`: `varchar(255)` (NOT NULL)
- `email`: `varchar(255)` (UNIQUE, NOT NULL)
- `phone`: `varchar(20)` (NULL)
- `photo_path`: `varchar(255)` (NULL)
- `birth_place`: `varchar(100)` (NULL)
- `birth_date`: `date` (NULL)
- `marital_status`: `varchar(20)` (NULL) — `'single'`, `'married'`, `'divorced'`
- `children_count`: `int` (DEFAULT 0)
- `joined_at`: `date` (NOT NULL)
- `position_id`: `varchar(36)` (FK -> `positions.id`, ON DELETE RESTRICT)
- `department_id`: `varchar(36)` (FK -> `departments.id`, ON DELETE RESTRICT)
- `employment_type`: `varchar(30)` (NOT NULL) — `'pns'`, `'pppk'`, `'tetap'`, `'kontrak'`, `'magang'`
- `gender`: `varchar(10)` (NOT NULL) — `'male'`, `'female'`
- `district_id`: `varchar(36)` (FK -> `districts.id`, NULL, ON DELETE SET NULL)
- `full_address`: `text` (NULL)
- `distance_km`: `decimal(6,2)` (DEFAULT 0) — Jarak rumah ke kantor (dasar tunjangan transport)
- `status`: `varchar(20)` (DEFAULT 'active') — `'active'`, `'inactive'`
- `created_by`: `varchar(36)` (FK -> `users.id`, NULL)
- `updated_by`: `varchar(36)` (FK -> `users.id`, NULL)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`
- `deleted_at`: `timestamp` (NULL - soft delete)

#### 13. `employee_educations`
Riwayat pendidikan formal karyawan.
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `employee_id`: `varchar(36)` (FK -> `employees.id`, ON DELETE CASCADE)
- `education_level`: `varchar(20)` (NOT NULL) — `'SMA/SMK'`, `'D3'`, `'S1'`, `'S2'`, `'S3'`
- `school_name`: `varchar(255)` (NOT NULL)
- `graduation_year`: `smallint` / `int` (NOT NULL)
- `sort_order`: `int` (DEFAULT 0)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

---

### Modul 5: Presensi (Attendance)

#### 14. `attendance_imports`
Batch import file log absensi (Excel/CSV dari mesin fingerprint/face recognition).
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `original_filename`: `varchar(255)` (NOT NULL)
- `file_path`: `varchar(255)` (NOT NULL)
- `period_year`: `smallint` (NOT NULL)
- `period_month`: `tinyint` (NOT NULL)
- `status`: `varchar(20)` (DEFAULT 'queued') — `'queued'`, `'processing'`, `'completed'`, `'failed'`
- `total_rows`: `int` (DEFAULT 0)
- `processed_rows`: `int` (DEFAULT 0)
- `error_message`: `text` (NULL)
- `imported_by`: `varchar(36)` (FK -> `users.id`, ON DELETE RESTRICT)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

#### 15. `attendances`
Data kehadiran harian karyawan.
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `employee_id`: `varchar(36)` (FK -> `employees.id`, ON DELETE CASCADE)
- `attendance_import_id`: `varchar(36)` (FK -> `attendance_imports.id`, NULL, ON DELETE SET NULL)
- `attendance_date`: `date` (NOT NULL)
- `checkin_at`: `time` / `datetime` (NULL)
- `checkout_at`: `time` / `datetime` (NULL)
- `checkin_location`: `varchar(255)` (NULL) — koordinat GPS / info kantor
- `checkout_location`: `varchar(255)` (NULL)
- `attendance_type`: `varchar(30)` (DEFAULT 'hadir') — `'hadir'`, `'sakit'`, `'izin'`, `'cuti'`, `'tanpa_keterangan'`
- `duration_hours`: `decimal(4,2)` (DEFAULT 0) — Durasi jam kerja
- `status`: `varchar(20)` (DEFAULT 'pending') — `'approved'`, `'rejected'`, `'pending'`
- `verification_status`: `varchar(20)` (DEFAULT 'valid')
- `verified_by_role`: `varchar(50)` (NULL)
- `remarks`: `text` (NULL)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`
- **Constraint / Index**: `UNIQUE(employee_id, attendance_date)`

#### 16. `attendance_summaries`
Agregasi bulanan kehadiran untuk keperluan payroll & tunjangan.
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `employee_id`: `varchar(36)` (FK -> `employees.id`, ON DELETE CASCADE)
- `period_year`: `smallint` (NOT NULL)
- `period_month`: `tinyint` (NOT NULL)
- `hadir`: `int` (DEFAULT 0)
- `cuti`: `int` (DEFAULT 0)
- `izin`: `int` (DEFAULT 0)
- `sakit`: `int` (DEFAULT 0)
- `hadir_late`: `int` (DEFAULT 0) — keterlambatan
- `unpaid_leave`: `int` (DEFAULT 0)
- `hadir_unpaid_leave`: `int` (DEFAULT 0)
- `status_hadir`: `varchar(20)` (DEFAULT 'memenuhi')
- `calculated_at`: `timestamp` (NOT NULL)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`
- **Constraint / Index**: `UNIQUE(employee_id, period_year, period_month)`

---

### Modul 6: Tunjangan Transport (Transport Allowance)

#### 17. `transport_allowance_settings`
Master tarif besaran tunjangan berdasarkan jarak tempuh (km).
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `base_fare`: `decimal(12,2)` (NOT NULL) — Nilai dasar nominal
- `effective_start`: `date` (NOT NULL)
- `min_km`: `decimal(6,2)` (NOT NULL DEFAULT 0) — Batas minimal km
- `max_km`: `decimal(6,2)` (NULL) — Batas maksimal km (NULL jika tak terbatas)
- `is_active`: `boolean` (DEFAULT true)
- `created_by`: `varchar(36)` (FK -> `users.id`, NULL)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

#### 18. `transport_allowance_periods`
Periode perhitungan batch tunjangan transport per bulan.
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `period_year`: `smallint` (NOT NULL)
- `period_month`: `tinyint` (NOT NULL)
- `total_recipients`: `int` (DEFAULT 0) — Jumlah karyawan penerima
- `total_amount`: `decimal(15,2)` (DEFAULT 0) — Total akumulasi rupiah
- `status`: `varchar(20)` (DEFAULT 'draft') — `'draft'`, `'calculated'`, `'locked'`
- `calculated_by`: `varchar(36)` (FK -> `users.id`, NULL)
- `calculated_at`: `timestamp` (NULL)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`
- **Constraint / Index**: `UNIQUE(period_year, period_month)`

#### 19. `transport_allowance_details`
Rincian nominal tunjangan yang diterima masing-masing karyawan per periode.
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `transport_allowance_period_id`: `varchar(36)` (FK -> `transport_allowance_periods.id`, ON DELETE CASCADE)
- `employee_id`: `varchar(36)` (FK -> `employees.id`, ON DELETE CASCADE)
- `base_fare`: `decimal(12,2)` (NOT NULL)
- `original_km`: `decimal(6,2)` (NOT NULL) — Jarak dari `employees.distance_km`
- `rounded_km`: `int` (NOT NULL) — Jarak setelah pembulatan aturan sistem
- `attendance_days`: `int` (NOT NULL) — Diambil dari jumlah hadir bulan tsb
- `nominal`: `decimal(15,2)` (NOT NULL) — `rounded_km * base_fare * attendance_days`
- `eligibility_status`: `varchar(20)` (DEFAULT 'eligible') — `'eligible'`, `'not_eligible'`
- `calculation_note`: `text` (NULL)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`
- **Constraint / Index**: `UNIQUE(transport_allowance_period_id, employee_id)`

---

### Modul 7: Log Aktivitas Sistem (Audit Trail)

#### 20. `activity_logs`
Mencatat seluruh aksi pengguna untuk keamanan dan pelacakan riwayat.
- `id`: `varchar(36)` (UUID v7 / Primary Key)
- `user_id`: `varchar(36)` (FK -> `users.id`, NULL, ON DELETE SET NULL)
- `module_code`: `varchar(100)` (NOT NULL) — Kode modul yang diakses
- `action`: `varchar(30)` (NOT NULL) — `'login'`, `'logout'`, `'create'`, `'read'`, `'update'`, `'delete'`, `'export'`, `'import'`
- `description`: `text` (NULL) — Keterangan aksi (cth: "Mengubah data karyawan NIP 12345")
- `subject_id`: `varchar(36)` (NULL) — ID record yang diubah
- `ip_address`: `varchar(45)` (NULL)
- `user_agent`: `text` (NULL)
- `old_values`: `json` (NULL) — Snapshot nilai sebelum update
- `new_values`: `json` (NULL) — Snapshot nilai sesudah update
- `url`: `varchar(255)` (NULL)
- `method`: `varchar(10)` (NULL) — `GET`, `POST`, `PUT`, `DELETE`
- `created_at`: `timestamp` (DEFAULT NOW())

---

## 3. Strategi Implementasi Murah & Ringan (Cost-Effective & High Performance)

1. **Efisiensi Tipe Data**:
   - Primary Key menggunakan `varchar(36)` UUID v7 (urutan waktu terindeks teratur dan tidak menyebabkan disk fragmentation seperti UUID v4 acak).
   - Angka tahun (`smallint`), bulan (`tinyint`), boolean (`tinyint(1)` / `boolean`), pecahan nominal menggunakan `decimal(12,2)` atau `decimal(15,2)` untuk presisi rupiah tanpa floating point error.
   - Status menggunakan `varchar(20)` atau `varchar(30)` standar untuk fleksibilitas tanpa perlu sering `ALTER TABLE` tipe enum.

2. **Indexing Kritis**:
   - Index pada setiap Foreign Key (`role_id`, `employee_id`, `department_id`, dll).
   - Index pencarian unik: `username`, `email`, `nip`, `code`.
   - Index filter komposit yang sering dipakai di query:
     - `attendances(employee_id, attendance_date)`
     - `transport_allowance_details(transport_allowance_period_id, employee_id)`
     - `activity_logs(user_id, created_at)`

3. **Soft Delete**:
   - Diterapkan pada data master krusial (`users`, `employees`) menggunakan kolom `deleted_at`, sehingga integritas riwayat presensi masa lalu tidak hilang jika karyawan keluar.
