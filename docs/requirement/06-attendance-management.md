# 06. Modul Presensi (Attendance Management)

Dokumen ini memuat spesifikasi kebutuhan fungsional, analisis bisnis & logika kalkulasi kehadiran, pemetaan antarmuka (UI) Nuxt 3 / Tabler, integrasi skema basis data relasional, spesifikasi RESTful API standar HTTP status codes, serta analisa komprehensif dan rekomendasi arsitektur untuk **Modul Presensi (Poin 7 Dokumen Requirement Bisnis)**.

---

## 1. Ringkasan Kebutuhan Bisnis (Requirement Point 7)

Modul Presensi digunakan untuk memantau, mencatat, dan merekap kehadiran seluruh pegawai secara otomatis dan terverifikasi.

Modul ini memiliki **dua (2) halaman utama**:
1. **Halaman List Pegawai / Rekap Presensi** (`/presensi`) *(Tampil secara default ketika modul presensi dibuka)*.
   - Menampilkan tabel rekap presensi pegawai per bulan.
   - **Default periode**: Data rekap presensi yang tampil secara default adalah **N-1 bulan berjalan (alias 1 bulan sebelumnya)**.
   - Dilengkapi fitur: **Download Template Excel** dan **Import Excel** untuk memasukkan log absensi mentah secara batch melalui proses latar belakang (*background job/queue*).
2. **Halaman Detail Presensi Pegawai** (`/presensi/detail/[employeeId]` atau `/presensi/[id]`).
   - Menampilkan catatan kehadiran harian (*daily logs*) dari pegawai terpilih dalam satu bulan kalender beserta status verifikasi, durasi kerja aktual, dan catatan izin/cuti.

---

### Matriks Wewenang & Hak Akses (RBAC)

Mengacu pada dokumen matriks hak akses [01-Role-access.md](file:///c:/Users/mastr/Documents/projectfreelancer/prototipe-jmc-admin-ui-nuxt/docs/requirement/01-Role-access.md):

| No | Modul / Sub-Fitur | Path Route Nuxt | Superadmin | Manager HRD | Admin HRD | Deskripsi Wewenang & Scope |
|:---:|:---|:---|:---:|:---:|:---:|:---|
| 1. | **Rekap Presensi (List Pegawai)** | `/presensi` | **-** (403) | **RO** (`read: All`) | **CRUD / Batch** (`read: All`, `create: All`, `update: All`) | Melihat rekap bulanan (N-1), filter periode, download template Excel, dan mengunggah berkas Excel log absensi. |
| 2. | **Detail Presensi Harian** | `/presensi/[id]` | **-** (403) | **RO** (`read: All`) | **CRUD / Approval** | Melihat log harian pegawai, jam check-in/out, lokasi gedung, serta melakukan verifikasi/koreksi kehadiran. |

> [!NOTE]
> - **Superadmin**: Dilarang mengakses modul presensi (`can_access = false`, HTTP `403 Forbidden`). Superadmin tidak diperuntukkan mengelola maupun tercatat pada data presensi.
> - **Admin HRD**: Memiliki kewenangan operasional penuh (CRUD) termasuk impor batch file Excel absensi dan persetujuan verifikasi presensi.
> - **Manager HRD**: Memiliki akses peninjauan dan monitoring kehadiran seluruh pegawai (Read-Only) guna keperluan evaluasi kinerja berkala.

---

## 2. Aturan Bisnis & Algoritma Perhitungan Presensi

Berdasarkan spesifikasi resmi dokumen requirement bisnis poin 7, perhitungan presensi pegawai wajib mematuhi ketentuan-ketentuan logis berikut:

### A. Lokasi dan Validasi Gedung Kantor (Building Geofence Matching)
1. Perusahaan memiliki **3 lokasi gedung kantor resmi**:
   - **Gedung Utama**
   - **Gedung A**
   - **Gedung B**
2. Presensi mencatat waktu (*timestamp*) dan lokasi (*office location / GPS geofence*).
3. **Aturan Validasi Lokasi Check-in & Check-out**:
   - Setiap pegawai **wajib melakukan presensi masuk (*check-in*) dan presensi pulang (*check-out*) di lokasi gedung yang sama**.
   - **Konsekuensi Pelanggaran**: Apabila seorang pegawai melakukan *check-in* dan *check-out* di lokasi gedung yang berbeda (misalnya *check-in* di Gedung Utama, namun *check-out* di Gedung A), maka **kehadirannya TIDAK AKAN TERHITUNG MASUK** (status kehadiran harian menjadi `"Tidak terpenuhi"`, durasi efektif = `0.00` jam).

---

### B. Jam Kerja Reguler, Istirahat, & Ambang Batas Keterlambatan (Late Tolerance)
1. **Jam Kerja Standar**: Bersifat *fix hours* dari pukul **08.00 s/d 17.00 WIB** (total rentang 9 jam kotor).
2. **Jam Istirahat Resmi**: Pukul **12.00 s/d 13.00 WIB** (durasi 1 jam, tidak dihitung sebagai jam kerja efektif).
3. **Minimal Jam Kerja Normal**: Minimal jam kerja bersih adalah **8 jam**. Kurang dari 8 jam, maka status kehadirannya menjadi **"Tidak terpenuhi"**.
4. **Aturan Toleransi Keterlambatan**:
   - **Keterlambatan $\le$ 15 Menit** (Jam *check-in* $\le$ **08.15 WIB**):
     - Dihitung **masuk penuh (*full day*)**, asalkan memenuhi minimal 8 jam kerja dan *checkout* $\ge$ 17.00 WIB.
   - **Keterlambatan $>$ 15 Menit** (Jam *check-in* $>$ **08.15 WIB**):
     - Hanya dihitung **masuk setengah hari (*half day*)**, namun durasi kerja minimal harus **tetap 8 jam**.
     - Apabila total durasi kerja kurang dari 8 jam, maka **dihitung tidak masuk kerja** (status `"Tidak terpenuhi"`).

---

### C. Penentuan Status Harian & Pengaruh ke Durasi Bulanan
1. Status Kehadiran Harian terdiri dari:
   - `"Terpenuhi"`: Memenuhi syarat lokasi (gedung sama), jam kerja $\ge$ 8 jam, dan absensi disetujui. Durasi kehadiran bertambah sesuai jam kerja riil.
   - `"Tidak terpenuhi"`: Melanggar aturan lokasi beda gedung, jam kerja $< 8$ jam, atau ditolak verifikator.
2. **Aturan Akumulasi**:
   - Jika status kehadiran harian adalah **"Tidak terpenuhi"**, maka durasi kehadiran harian **dianggap 0 (nol)** dan **TIDAK MENAMBAH total durasi kehadiran dalam 1 bulan**, serta tidak menambah hitungan hari hadir fisik (`hadir` pada rekap bulanan).

---

### D. Rekap Status Hadir Bulanan (Monthly Presence Quota)
- Pada tabel rekap pegawai bulanan:
  - Nilai kolom **Hadir, Cuti, Kuota Cuti, Izin, Kuota Izin, Unpaid Leave, Kuota Unpaid Leave** disajikan dalam tipe data **Number dengan 1 digit di belakang koma** (contoh: `21.0`, `1.5`, `0.5`).
  - Kolom **Status Hadir** menghasilkan nilai:
    - `"Terpenuhi"`: Mengindikasikan kuota minimal kehadiran bulanan telah terpenuhi (misal ambang batas 19 hari kerja terpenuhi).
    - `"Tidak terpenuhi"`: Mengindikasikan kuota minimal kehadiran bulanan tidak terpenuhi.

---

### E. Diagram Alur Evaluasi Kehadiran Harian

```mermaid
flowchart TD
    Start([Log Presensi Harian Masuk]) --> CheckLoc{Lokasi Checkin == Checkout?}
    CheckLoc -- Beda Lokasi --> FailLoc[Status: 'Tidak terpenuhi'<br/>Durasi Dihitung: 0.00 Jam<br/>Alasan: Lokasi checkin & checkout berbeda]
    
    CheckLoc -- Lokasi Sama --> CalcGross[Hitung Rentang Checkout - Checkin]
    CalcGross --> DeductBreak[Kurangi Jam Istirahat 12.00-13.00: 1 Jam]
    
    DeductBreak --> CheckLate{Checkin <= 08:15:00?}
    
    CheckLate -- "Ya (<= 15 Menit)" --> CheckDur8A{Durasi Bersih >= 8.00 Jam?}
    CheckDur8A -- Ya --> PassFull[Status: 'Terpenuhi'<br/>Kategori: Hadir Full Day<br/>Durasi: Efektif Jam Kerja]
    CheckDur8A -- Tidak --> FailDurA[Status: 'Tidak terpenuhi'<br/>Durasi Dihitung: 0.00 Jam<br/>Alasan: Durasi kerja < 8 jam]
    
    CheckLate -- "Tidak (> 15 Menit)" --> CheckDur8B{Durasi Bersih >= 8.00 Jam?}
    CheckDur8B -- Ya --> PassHalf[Status: 'Terpenuhi'<br/>Kategori: Hadir Half Day (0.5 Hari)<br/>Durasi: Efektif Jam Kerja]
    CheckDur8B -- Tidak --> FailDurB[Status: 'Tidak terpenuhi'<br/>Durasi Dihitung: 0.00 Jam<br/>Alasan: Terlambat > 15 mnt & jam kerja < 8 jam]
    
    PassFull --> Verif{Verifikasi HRD / Lead?}
    PassHalf --> Verif
    FailLoc --> EndState([Simpan ke Database attendances])
    FailDurA --> EndState
    FailDurB --> EndState
    
    Verif -- "Disetujui (Approved)" --> FinalOK[Verifikasi: Disetujui<br/>Akumulasi ke Summary Bulanan]
    Verif -- "Ditolak (Rejected)" --> FinalReject[Verifikasi: Ditolak<br/>Durasi Dihitung: 0.00 Jam]
    
    FinalOK --> EndState
    FinalReject --> EndState
```

---

## 3. Pemetaan Metadata Tabel Antarmuka (UI Template Bawaan Nuxt 3)

Tata letak, tombol aksi, modal, dan kolom tabel diimplementasikan sesuai template antarmuka bawaan Nuxt 3 / Tabler tanpa mengubah tata letak standar:

### A. Halaman List Pegawai / Rekap Presensi (`app/pages/presensi/index.vue`)

#### 1. Header Toolbar & Aksi
- **Filter Periode Bulan & Tahun**: Secara default terisi **N-1 bulan berjalan** (misal saat ini September 2026, default adalah Agustus 2026).
- **Tombol Download Template Excel**: Mengunduh berkas format impor `.xlsx` (`Template_Presensi_JMC.xlsx`) yang berisi struktur kolom: NIP, Tanggal, Jam Masuk, Jam Pulang, Lokasi Masuk, Lokasi Pulang, Keterangan.
- **Tombol Import Excel**: Membuka modal dialog unggah file presensi.
  - Alur proses impor:
    1. User mengunggah berkas Excel sesuai format template.
    2. Sistem memvalidasi ekstensi dan struktur berkas, lalu menjalankan pemrosesan rekapitulasi presensi melalui **background job / background process**.
    3. Setelah proses rekap selesai, sistem otomatis me-refresh halaman (*reactive refresh*) dan mengupdate data tabel rekapitulasi.
- **Search Box**: Pencarian nama pegawai atau NIP.

#### 2. Metadata Tabel Rekap Presensi
Sesuai ketetapan dokumen requirement:

| No | Nama Kolom Header | Tipe Data & Format | Sumber Kolom DB | Keterangan & Deskripsi Tampilan |
|:---:|:---|:---|:---|:---|
| 1. | **No. Urut** | `number` | Index baris | Nomor urut baris (1, 2, 3, ...). |
| 2. | **Nama** | `string` | `employees.name` | Nama lengkap pegawai bersangkutan. |
| 3. | **Jabatan** | `string` | `positions.name` | Nama jabatan / posisi pegawai. |
| 4. | **Hadir** | `decimal(4,1)` | `attendance_summaries.hadir` | Jumlah hari hadir fisik, menampung 1 digit di belakang koma (misal: `21.0` atau `20.5`). |
| 5. | **Status Hadir** | `badge / string` | `attendance_summaries.status_hadir` | Nilai `"Terpenuhi"` (hijau) atau `"Tidak terpenuhi"` (merah). Mengindikasikan apakah kuota minimal kehadiran telah terpenuhi. |
| 6. | **Cuti** | `decimal(4,1)` | `attendance_summaries.cuti` | Jumlah hari cuti yang diambil (1 digit di belakang koma, misal: `2.0`). |
| 7. | **Kuota Cuti** | `decimal(4,1)` | `employee_leave_balances` / hitungan | Sisa / total kuota cuti tahunan pegawai (1 digit di belakang koma, misal: `12.0`). |
| 8. | **Izin** | `decimal(4,1)` | `attendance_summaries.izin` | Jumlah hari izin yang diajukan (1 digit di belakang koma, misal: `1.0`). |
| 9. | **Kuota Izin** | `decimal(4,1)` | Batas kebijakan | Kuota toleransi izin bulanan/tahunan (1 digit di belakang koma, misal: `3.0`). |
| 10. | **Unpaid Leave** | `decimal(4,1)` | `attendance_summaries.unpaid_leave` | Jumlah hari cuti di luar tanggungan (1 digit di belakang koma, misal: `0.0`). |
| 11. | **Kuota Unpaid leave** | `decimal(4,1)` | Batas kebijakan | Kuota izin tanpa gaji yang diizinkan (1 digit di belakang koma, misal: `5.0`). |
| 12. | **Aksi** | Tombol Action | - | Tombol View / Icon mata untuk **Membuka detail presensi pegawai** (`/presensi/[employeeId]`). |

---

### B. Halaman Detail Presensi Harian (`app/pages/presensi/[id].vue`)

Menampilkan rekap presensi pegawai terpilih pada bulan yang ditentukan dengan tabel rincian harian:

#### Metadata Tabel Presensi Harian:

| No | Nama Kolom Header | Tipe Data & Format | Sumber Kolom DB | Keterangan & Deskripsi Tampilan |
|:---:|:---|:---|:---|:---|
| 1. | **Tgl** | `date` (`YYYY-MM-DD` / `DD MMM YYYY`) | `attendances.attendance_date` | Tanggal hari kerja bersangkutan. |
| 2. | **Lokasi checkin** | `string` | `attendances.checkin_location` | Nilai: `"Gedung Utama"`, `"Gedung A"`, `"Gedung B"`. |
| 3. | **Kehadiran** | `string` / `badge` | `attendances.attendance_type` | Nilai: `"Hadir"`, `"Cuti"`, `"Izin"`, atau `"Sakit"`. |
| 4. | **Durasi (Hadir)** | `decimal(4,1)` | `attendances.duration_hours` | Durasi kerja bersih (1 digit di belakang koma, contoh: `8.0`). |
| 5. | **Status** | `string` / `badge` | Hitungan aturan bisnis | `"Terpenuhi"` atau `"Tidak terpenuhi"`. Jika tidak terpenuhi, durasi dianggap 0 dan tidak menambah total durasi dalam 1 bulan. |
| 6. | **Verifikasi** | `string` / `badge` | `attendances.status` | Nilai: `"Disetujui"` (*approved*) atau `"Ditolak"` (*rejected*). |
| 7. | **Verifikator** | `string` | `attendances.verified_by_role` | Peran penyetujui: `"Lead"`, `"Manager"`, atau `"HRD"`. |
| 8. | **Keterangan** | `text` | `attendances.remarks` | Catatan alasan izin, surat dokter sakit, atau catatan keterlambatan. |

---

## 4. Korelasi Skema Database (Database Architecture & Consistency)

Struktur tabel mengacu pada skema Drizzle ORM di [schema.js](file:///c:/Users/mastr/Documents/projectfreelancer/prototipe-jmc-admin-ui-nuxt/app/databases/schema.js) (Modul 5: Presensi) yang berelasi erat dengan data kepegawaian dan tunjangan transport:

```mermaid
erDiagram
    employees ||--o{ attendances : "records daily attendance"
    employees ||--o{ attendance_summaries : "has monthly summary"
    attendance_imports ||--o{ attendances : "populates"
    users ||--o{ attendance_imports : "uploads"
    attendance_summaries ||--o| transport_allowance_details : "feeds hadir days"

    attendance_imports {
        varchar(36) id PK "UUIDv7"
        varchar(255) original_filename "Nama File Excel Mentah"
        varchar(255) file_path "Lokasi Penyimpanan File"
        smallint period_year "Tahun"
        tinyint period_month "Bulan (1-12)"
        varchar(20) status "'queued' | 'processing' | 'completed' | 'failed'"
        int total_rows "Total Baris Data"
        int processed_rows "Baris Berhasil Dihitung"
        text error_message "Log Error Jika Gagal"
        varchar(36) imported_by FK "-> users.id"
        timestamp created_at
        timestamp updated_at
    }

    attendances {
        varchar(36) id PK "UUIDv7"
        varchar(36) employee_id FK "-> employees.id"
        varchar(36) attendance_import_id FK "Nullable -> attendance_imports.id"
        date attendance_date "Tanggal Presensi"
        time checkin_at "Jam Masuk (08:00)"
        time checkout_at "Jam Pulang (17:00)"
        varchar(255) checkin_location "'Gedung Utama' | 'Gedung A' | 'Gedung B'"
        varchar(255) checkout_location "'Gedung Utama' | 'Gedung A' | 'Gedung B'"
        varchar(30) attendance_type "'hadir' | 'sakit' | 'izin' | 'cuti' | 'tanpa_keterangan'"
        decimal(4,2) duration_hours "Durasi Jam Kerja Bersih (1 digit desimal)"
        varchar(20) status "'approved' | 'rejected' | 'pending'"
        varchar(20) verification_status "Status Verifikasi"
        varchar(50) verified_by_role "'Lead' | 'Manager' | 'HRD'"
        text remarks "Keterangan Tambahan"
        timestamp created_at
        timestamp updated_at
    }

    attendance_summaries {
        varchar(36) id PK "UUIDv7"
        varchar(36) employee_id FK "-> employees.id"
        smallint period_year "Tahun Periode"
        tinyint period_month "Bulan Periode (1-12)"
        decimal(4,1) hadir "Akumulasi Hari Hadir Fisik (1 digit desimal)"
        decimal(4,1) cuti "Hari Cuti"
        decimal(4,1) izin "Hari Izin"
        decimal(4,1) sakit "Hari Sakit"
        int hadir_late "Jumlah Kali Terlambat"
        decimal(4,1) unpaid_leave "Hari Tanpa Gaji"
        decimal(4,1) hadir_unpaid_leave
        varchar(20) status_hadir "'Terpenuhi' | 'Tidak terpenuhi'"
        timestamp calculated_at "Waktu Terakhir Dihitung"
        timestamp created_at
        timestamp updated_at
    }
```

### Jaminan Integritas & Constraint:
1. `UNIQUE(employee_id, attendance_date)` pada tabel `attendances` menjamin satu pegawai hanya memiliki 1 catatan per hari kalender.
2. `UNIQUE(employee_id, period_year, period_month)` pada tabel `attendance_summaries` mencegah terjadinya agregasi ganda pada periode yang sama.
3. Keterkaitan dengan Modul Tunjangan Transport: Nilai `attendance_summaries.hadir` dikonsumsi langsung oleh `transport_allowance_details.attendance_days` sebagai faktor pengali utama formula tunjangan transport.

---

## 5. Standar Spesifikasi Endpoint RESTful API

Sesuai aturan ketat pada [GEMINI.md](file:///c:/Users/mastr/Documents/projectfreelancer/prototipe-jmc-admin-ui-nuxt/GEMINI.md), seluruh endpoint API wajib mematuhi standar HTTP status code dan **DILARANG membungkus respons error di dalam status 200 OK**:

### 1. Rekap Presensi Pegawai Bulanan (N-1 Default)
- **Endpoint**: `GET /api/v1/attendances/summaries`
- **Query Parameters**:
  - `year`: Tahun (default: tahun dari N-1 bulan berjalan, misal: `2026`).
  - `month`: Bulan 1-12 (default: N-1 bulan berjalan, misal jika bulan ini 9 maka default: `8`).
  - `search`: Pencarian nama atau jabatan.
  - `page`: Nomor halaman (default: `1`).
  - `limit`: Jumlah data per halaman (default: `10`).
- **Response Headers**: `Content-Type: application/json`
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "period": {
      "year": 2026,
      "month": 8,
      "is_default_n_minus_1": true
    },
    "data": [
      {
        "no": 1,
        "employee_id": "018e11a1-0001-7000-8000-000000000001",
        "nama": "Bramantyo Wicaksono",
        "jabatan": "System Analyst",
        "hadir": 21.0,
        "status_hadir": "Terpenuhi",
        "cuti": 1.0,
        "kuota_cuti": 12.0,
        "izin": 0.0,
        "kuota_izin": 3.0,
        "unpaid_leave": 0.0,
        "kuota_unpaid_leave": 5.0
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 1
    }
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: Token sesi tidak valid atau telah kedaluwarsa.
  - `403 Forbidden`: Superadmin mencoba mengakses endpoint ini.

---

### 2. Detail Presensi Harian Pegawai
- **Endpoint**: `GET /api/v1/attendances/employees/:employeeId`
- **Query Parameters**: `?year=2026&month=8`
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "employee": {
      "id": "018e11a1-0001-7000-8000-000000000001",
      "nip": "198801152010121001",
      "nama": "Bramantyo Wicaksono",
      "jabatan": "System Analyst"
    },
    "data": [
      {
        "id": "018e44b1-...",
        "tgl": "2026-08-03",
        "lokasi_checkin": "Gedung Utama",
        "lokasi_checkout": "Gedung Utama",
        "kehadiran": "Hadir",
        "checkin_at": "07:55:00",
        "checkout_at": "17:05:00",
        "durasi_hadir": 8.0,
        "status": "Terpenuhi",
        "verifikasi": "Disetujui",
        "verifikator": "HRD",
        "keterangan": "Hadir tepat waktu"
      },
      {
        "id": "018e44b2-...",
        "tgl": "2026-08-04",
        "lokasi_checkin": "Gedung Utama",
        "lokasi_checkout": "Gedung A",
        "kehadiran": "Hadir",
        "checkin_at": "08:00:00",
        "checkout_at": "17:00:00",
        "durasi_hadir": 0.0,
        "status": "Tidak terpenuhi",
        "verifikasi": "Ditolak",
        "verifikator": "HRD",
        "keterangan": "Check-in di Gedung Utama, Check-out di Gedung A (Lokasi berbeda)"
      }
    ]
  }
  ```
- **Error Codes**: `404 Not Found` (Pegawai tidak ditemukan).

---

### 3. Download Template Excel Impor
- **Endpoint**: `GET /api/v1/attendances/template`
- **Response `200 OK`**: Mengembalikan file streaming binary `.xlsx` (*spreadsheet*) dengan header `Content-Disposition: attachment; filename="Template_Presensi_JMC.xlsx"`.

---

### 4. Upload & Background Import File Excel Presensi
- **Endpoint**: `POST /api/v1/attendances/import`
- **Headers**: `Content-Type: multipart/form-data`
- **Body**:
  - `file`: Berkas spreadsheet `.xlsx` atau `.csv`.
  - `period_year`: Tahun periode (contoh: `2026`).
  - `period_month`: Bulan periode (contoh: `8`).
- **Authorization**: Khusus `Admin HRD` (`403 Forbidden` untuk Manager HRD dan Superadmin).
- **Response `202 Accepted`**:
  *(Menggunakan HTTP status standar 202 Accepted untuk menandai bahwa berkas telah diterima dan sedang diproses di background)*
  ```json
  {
    "status": "processing",
    "message": "File presensi berhasil diunggah dan sedang diproses di background",
    "import_job": {
      "id": "018e55c1-...",
      "filename": "LOG_PRESENSI_AGUSTUS_2026.xlsx",
      "status": "queued",
      "total_rows": 240
    }
  }
  ```
- **Response `400 Bad Request`**: Format ekstensi file bukan Excel/CSV, atau header kolom tidak valid.
- **Response `422 Unprocessable Entity`**: Form payload tidak menyertakan file atau tahun/bulan.

---

### 5. Cek Status Background Process Impor (Polling / Event)
- **Endpoint**: `GET /api/v1/attendances/import/:jobId/status`
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "018e55c1-...",
      "job_status": "completed",
      "total_rows": 240,
      "processed_rows": 240,
      "failed_rows": 0,
      "error_message": null
    }
  }
  ```

---

## 6. Analisa Kuat & Saran Peningkatan (Tanpa Merubah Template Nuxt)

Melalui peninjauan mendalam pada kode sumber antarmuka, arsitektur data, dan aturan bisnis, kami menyusun analisa kritis serta saran peningkatan tanpa merubah template bawaan yang ada:

### 1. Otomasi Periode Default N-1 Bulan Berjalan
- **Analisa Kuat**:
  - Sesuai spesifikasi, saat halaman dibuka pertama kali, sistem menampilkan data rekap bulan N-1. Jika saat ini bulan Januari, maka N-1 adalah Desember tahun sebelumnya.
  - Sering terjadi *bug* pergantian tahun (*off-by-one year*) pada kalkulasi bulan N-1 jika hanya menggunakan formula `currentMonth - 1`.
- **Saran Solusi**:
  - Gunakan helper utility:
    ```javascript
    const now = new Date();
    const defaultDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const defaultYear = defaultDate.getFullYear();
    const defaultMonth = defaultDate.getMonth() + 1;
    ```
  - Hal ini menjamin jika sekarang **Januari 2027**, maka default yang dimuat adalah **Desember 2026** secara mulus tanpa kegagalan filter.

---

### 2. Indikator Visual Background Process pada Tombol Import Excel
- **Analisa Kuat**:
  - Spesifikasi menyatakan: *"Aplikasi akan merekap absensi melalui background proses. Proses rekap selesai, sistem akan merefresh halaman dan mengupdate data rekap pada table."*
  - Jika user tidak diberikan feedback visual bahwa proses impor sedang berjalan di latar belakang, user berpotensi mengklik upload berkali-kali atau bingung kenapa tabel belum langsung berubah.
- **Saran Solusi (Mempertahankan Template Bawaan)**:
  - Gunakan kelas bawaan Tabler `btn-loading` pada tombol import atau tampilkan *Toast Notification* Tabler di pojok kanan bawah:
    > ℹ️ *"Sedang memproses 240 data presensi di latar belakang... Halaman akan otomatis diperbarui."*
  - Gunakan composable `useIntervalPoll` atau WebSocket/SSE ringan yang memantau endpoint status job impor. Saat status berubah menjadi `completed`, panggil fungsi bawaan Nuxt `refresh()` secara otomatis.

---

### 3. Penanganan Toleransi Format Jam & Lokasi Gedung (Data Normalization)
- **Analisa Kuat**:
  - Pada log absensi mesin fingerprint atau Excel, string gedung sering kali bervariasi (contoh: `"GEDUNG UTAMA"`, `"gedung_utama"`, `"Gedung-A"`, atau terdapat spasi ekstra).
  - Jika dicocokkan dengan *strict equality* (`===`), data absensi karyawan berisiko dianggap melanggar aturan lokasi dan berubah menjadi `"Tidak terpenuhi"` secara keliru.
- **Saran Solusi**:
  - Lakukan normalisasi string (*trim* & *case-insensitive parsing*) di backend sebelum mengevaluasi aturan validasi lokasi gedung.
  - Sediakan dropdown pilihan tetap (*enum*) pada form manual: `['Gedung Utama', 'Gedung A', 'Gedung B']`.

---

### 4. Konsistensi Tipe Data Desimal (1 Digit di Belakang Koma)
- **Analisa Kuat**:
  - Dokumen mensyaratkan nilai kolom Hadir, Cuti, Izin, dan Unpaid Leave bertipe **Number yang menampung 1 digit di belakang koma** (contoh: `21.5`).
  - Skema database di `attendance_summaries` sebelumnya menggunakan tipe `int('hadir')`. Tipe integer ini akan memotong (*truncate*) desimal kehadiran setengah hari (`0.5`) akibat keterlambatan $> 15$ menit.
- **Saran Solusi**:
  - Gunakan tipe data `decimal('hadir', { precision: 4, scale: 1 })` di Drizzle ORM atau pastikan formatter tampilan (`formatDecimal(value, 1)`) selalu menampilkan 1 digit di belakang koma (misal `21.0` jika bilangan bulat, `21.5` jika ada setengah hari).
  - Ini menjaga konsistensi antara aturan bisnis toleransi keterlambatan (*half day*) dengan tampilan tabel rekapitulasi.

---

### 5. Audit Trail & Transparansi Kolom Status
- **Analisa Kuat**:
  - Penolakan kehadiran harian akibat beda lokasi atau durasi $< 8$ jam berdampak signifikan terhadap nominal tunjangan transport bulanan pegawai. Pegawai dan HRD berpotensi mengajukan komplain jika tidak ada alasan yang jelas.
- **Saran Solusi (Tanpa Merubah Kolom Tabel)**:
  - Manfaatkan atribut bawaan HTML `title` atau Tabler Tooltip pada teks badge `"Tidak terpenuhi"` di tabel harian.
  - Contoh: `<span class="badge bg-danger-lt" title="Lokasi checkin (Gedung Utama) berbeda dengan checkout (Gedung A)">Tidak terpenuhi</span>`.
  - Informasi alasan kegagalan langsung tersaji transparan saat di-hover tanpa merusak tata letak tabel bawaan.

---

## 7. Kriteria Penerimaan (Acceptance Criteria)

- **AC-AT-01**: Halaman `/presensi` saat pertama kali dimuat secara otomatis menampilkan data rekapitulasi **N-1 bulan berjalan** (satu bulan sebelum bulan aktif saat ini).
- **AC-AT-02**: Halaman rekapitulasi presensi memuat tabel lengkap dengan kolom: No. Urut, Nama, Jabatan, Hadir, Status Hadir, Cuti, Kuota Cuti, Izin, Kuota Izin, Unpaid Leave, Kuota Unpaid leave, dan Tombol View.
- **AC-AT-03**: Seluruh kolom numerik presensi (Hadir, Cuti, Kuota Cuti, Izin, Kuota Izin, Unpaid Leave, Kuota Unpaid leave) ditampilkan dengan format **1 digit di belakang koma** (misal: `21.0`).
- **AC-AT-04**: Tombol *Download Template* mengunduh file `.xlsx` dengan struktur kolom presensi baku.
- **AC-AT-05**: Tombol *Import Excel* menerima berkas unggahan dan menjalankannya melalui *background job*, serta otomatis me-refresh tabel rekapitulasi setelah proses impor tuntas.
- **AC-AT-06**: Tombol View pada setiap baris pegawai mengarahkan pengguna ke halaman detail presensi pegawai (`/presensi/[employeeId]`).
- **AC-AT-07**: Tabel detail presensi harian memuat kolom: Tgl, Lokasi checkin, Kehadiran, Durasi (Hadir), Status, Verifikasi, Verifikator, dan Keterangan.
- **AC-AT-08**: Pegawai yang melakukan *check-in* dan *check-out* di gedung berbeda otomatis berstatus `"Tidak terpenuhi"`, dengan durasi efektif dihitung 0 jam.
- **AC-AT-09**: Jam kerja dasar adalah 08.00 - 17.00 dengan istirahat 12.00 - 13.00 (bersih 8 jam). Keterlambatan $\le 15$ menit dihitung penuh, sedangkan keterlambatan $> 15$ menit hanya dihitung *half day* (asalkan durasi kerja total $\ge 8$ jam). Jika durasi total $< 8$ jam, dihitung tidak masuk kerja (`"Tidak terpenuhi"`).
- **AC-AT-10**: Jika status harian `"Tidak terpenuhi"`, durasi kehadiran bernilai 0 dan tidak menambah akumulasi durasi kehadiran bulanan.
- **AC-AT-11**: Hak akses mematuhi matriks RBAC: Superadmin dilarang mengakses (HTTP 403), Manager HRD Read-Only (HTTP 200), dan Admin HRD memiliki akses penuh CRUD & Import (HTTP 200 / 202).
- **AC-AT-12**: Seluruh respon API tunduk pada aturan `GEMINI.md` dengan status code standar HTTP (200, 202, 400, 401, 403, 404, 422).
