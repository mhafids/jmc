# 05. Modul Data Pegawai (Employee Management)

Dokumen ini memuat spesifikasi kebutuhan fungsional dan teknis modul **Data Pegawai (Employee Management)** yang digunakan untuk pengelolaan data pegawai (menambahkan data baru, merubah data, atau menghapus data) dan terintegrasi langsung dengan rancangan basis data [schema-db.md](file:///c:/Users/mastr/Documents/projectfreelancer/prototipe-jmc-admin-ui-nuxt/docs/contexts/schema-db.md) (Modul 3: Master Organisasi & Modul 4: Data Karyawan) serta mematuhi aturan baku HTTP status code sistem.

---

## 1. Ringkasan Kebutuhan & Ketentuan Umum

Modul Data Pegawai terdiri dari **empat (4) halaman utama**:
1. **Halaman Daftar Pegawai** (`/pegawai`)
2. **Halaman Formulir Tambah Data Baru** (`/pegawai/form`)
3. **Halaman Edit Data Pegawai** (`/pegawai/form/[id]` atau `/pegawai/form/:nip`)
4. **Halaman Detail Pegawai** (`/pegawai/[nipp]` / `/pegawai/:nip`)

### Ketentuan-Ketentuan Umum Modul:
1. **RESTful API & Autentikasi JWT**: Gunakan arsitektur RESTful API murni untuk aksi CRUD data pegawai dengan autentikasi berbasis Bearer JWT Token.
2. **Error & Success Handling**: Berikan handling yang jelas dan ramah pengguna ketika operasi berhasil (notifikasi toast/alert sukses) maupun gagal (feedback error per field atau alert pesan bisnis).
3. **Validasi Backend & Frontend**: Validasi isian formulir wajib dilakukan di backend secara ketat selain validasi reaktif di frontend (mencegah data corrupt atau bypass).
4. **Matriks Hak Akses (RBAC)** ([01-Role-access.md](file:///c:/Users/mastr/Documents/projectfreelancer/prototipe-jmc-admin-ui-nuxt/docs/requirement/01-Role-access.md)):
   - **Admin HRD**: Memiliki wewenang **CRUD Penuh** (`can_create = true`, `read_scope = 'all'`, `update_scope = 'all'`, `delete_scope = 'all'`).
     - *Proteksi Bisnis Khusus*: **Dilarang menghapus data pegawai yang terafiliasi dengan akun ber-role Superadmin** (`user.role != 'superadmin'`).
   - **Manager HRD**: Memiliki wewenang **Read Only** (`read_scope = 'all'`). Tombol Create, Edit, Hapus, dan Bulk Action disembunyikan/dilarang.
   - **Superadmin**: Tidak memiliki akses ke modul kepegawaian (`-`). Akses route diarahkan ke error 403 Forbidden.

---

## 2. Korelasi Skema Database (Modul 3 & 4: Organisasi & Kepegawaian)

Mengacu langsung ke [schema-db.md](file:///c:/Users/mastr/Documents/projectfreelancer/prototipe-jmc-admin-ui-nuxt/docs/contexts/schema-db.md) dan definisi model `app/databases/schema.js`:

```mermaid
erDiagram
    provinces ||--o{ regencies : "contains"
    regencies ||--o{ districts : "contains"
    districts ||--o{ employees : "resides in"
    departments ||--o{ employees : "assigned to"
    positions ||--o{ employees : "holds"
    employees ||--o{ employee_educations : "has education"
    employees ||--o| users : "linked account"
    employees ||--o{ attendances : "records"
    employees ||--o{ transport_allowance_details : "receives"

    employees {
        varchar(36) id PK "UUIDv7"
        varchar(50) nip UK "Nomor Induk Pegawai (min 8 digit)"
        varchar(255) name "Nama Lengkap"
        varchar(255) email UK "Email Pegawai"
        varchar(20) phone "Nomor HP (+62 format)"
        varchar(255) photo_path "Path Foto Pegawai"
        varchar(100) birth_place "Tempat Lahir"
        date birth_date "Tanggal Lahir (DD/MM/YYYY)"
        varchar(20) marital_status "single | married | divorced"
        int children_count "Jumlah Anak (maks 2 digit)"
        date joined_at "Tanggal Masuk Kerja"
        varchar(36) position_id FK "-> positions.id"
        varchar(36) department_id FK "-> departments.id"
        varchar(30) employment_type "pns | pppk | tetap | kontrak | magang"
        varchar(10) gender "male | female"
        varchar(36) district_id FK "-> districts.id (Kecamatan)"
        text full_address "Alamat Lengkap"
        decimal(6,2) distance_km "Jarak rumah-kantor (maks 2 digit integer)"
        varchar(20) status "active | inactive"
        varchar(36) created_by FK "-> users.id"
        varchar(36) updated_by FK "-> users.id"
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at "Soft Delete"
    }

    employee_educations {
        varchar(36) id PK "UUIDv7"
        varchar(36) employee_id FK "-> employees.id"
        varchar(20) education_level "Jenjang (SD/SMP/SMA/D3/S1/S2/S3)"
        varchar(255) school_name "Nama Sekolah / Perguruan Tinggi"
        int graduation_year "Tahun Kelulusan"
        int sort_order "Urutan Tampilan"
        timestamp created_at
        timestamp updated_at
    }

    departments {
        varchar(36) id PK "UUIDv7"
        varchar(50) code UK "HRD, IT, MKT, PROD, dll"
        varchar(100) name "Marketing, HRD, Production, Executive, Commissioner"
        int sort_order
    }

    positions {
        varchar(36) id PK "UUIDv7"
        varchar(50) code UK "MGR, STF, INTERN"
        varchar(100) name "Manager, Staf, Magang, Programmer, System Analyst, Akuntan"
        varchar(30) position_type "manager | staff | magang"
    }
```

---

## 3. Spesifikasi Antarmuka & Fitur Tiap Halaman

### A. Halaman Daftar Pegawai (`/pegawai/index.vue`)
Halaman daftar pegawai menyajikan tabel ringkasan data pegawai dengan ketentuan kolom, filter, paginasi, pencarian, dan tombol aksi:

#### 1. Kolom Tabel:
| No | Nama Kolom | Sortable? | Deskripsi & Format | Pemetaan DB |
|:---:|:---|:---:|:---|:---|
| 1 | **No. Urut** | Tidak | Nomor urut baris sesuai halaman aktif `(page - 1) * perPage + index + 1`. Dilengkapi fitur **Checkbox / Bulk Select**. | - |
| 2 | **NIP** | **Ya** | Nomor Induk Pegawai unik. Teks monospace/tegas. | `employees.nip` |
| 3 | **Nama** | **Ya** | Nama lengkap pegawai disertai thumbnail foto profil mini di sebelah kiri nama. | `employees.name`, `employees.photo_path` |
| 4 | **Jabatan** | **Ya** | Nama jabatan pegawai (contoh: Manager, Staf, Programmer). | `positions.name` |
| 5 | **Tanggal Masuk** | **Ya** | Tanggal mulai bekerja, diformat lokal Indonesia (contoh: `24 Juni 2025` atau `DD MMMM YYYY`). | `employees.joined_at` |
| 6 | **Masa Kerja** | **Ya** | Hasil kalkulasi dinamis durasi dari `joined_at` hingga hari ini (contoh: `2 Tahun 3 Bulan`). | Dihitung dari `employees.joined_at` |
| 7 | **Aksi** | Tidak | Tombol aksi terpadu:<br>• **Tombol Detail** (Ikon File/Eye): Membuka halaman detail pegawai terpilih (`/pegawai/:nip`).<br>• **Tombol Edit** (Ikon Pensil): Membuka halaman ubah data (`/pegawai/form/:id`). *(Hanya Admin HRD)*<br>• **Tombol Download PDF** (Ikon Cloud Download): Mengunduh berkas ringkasan profil pegawai terpilih dalam format PDF.<br>• **Tombol Hapus** (Ikon Sampah): Membuka modal konfirmasi hapus data. *(Hanya Admin HRD; dilarang jika akun pegawai adalah Superadmin)* | - |

#### 2. Fitur Toolbar, Filter, & Tombol Kontrol:
- **Pencarian (Search Bar)**:
  - Kotak input dengan tombol cari (ikon `IconSearch`).
  - Parameter pencarian terpadu (*multi-field query*): mencari kesesuaian pada **NIP**, **Nama Pegawai**, atau **Jabatan**.
- **Filter Data**:
  - **Filter Jabatan**: Pilihan jabatan dalam format *multi-select* atau *searchable dropdown* (`Manager`, `Staf`, `Magang`, `Programmer`, `System Analyst`, `Akuntan`, dsb.).
  - **Filter Masa Kerja**: Dua field input number *min* & *max* berdampingan (contoh: label min `0` - max `5` berarti memfilter masa kerja antara 0 tahun hingga 5 tahun).
  - **Filter Status Kontrak**: Dropdown pilihan status ikatan kerja (`PKWTT / Tetap`, `PKWT / Kontrak`, `Magang`).
- **Tombol Kontrol Atas (Actions Header)**:
  - **Tombol Data Baru / Tambah** (`<NuxtLink to="/pegawai/form">`): Membuka halaman form tambah pegawai baru (Hanya tampil untuk Admin HRD).
  - **Tombol Download Daftar Pegawai (PDF & Excel)**: Tombol export untuk mengunduh seluruh data pegawai yang telah difilter ke dalam file format `.xlsx` (Excel) dan `.pdf`.
- **Fitur Bulk Selection (Pilihan Masal)**:
  - Setiap baris memiliki checkbox seleksi.
  - Terdapat master checkbox di header tabel untuk "Pilih Semua".
  - **Kondisional Bulk Action Toolbar**: Ketika satu atau lebih checkbox pegawai dipilih (*checked*), muncul bilah aksi massal berisi:
    1. **Tombol Aktif / Nonaktif Pegawai**: Dropdown pilihan untuk mengubah status keaktifan semua pegawai yang dipilih sekaligus (`active` atau `inactive`).
    2. **Tombol Hapus Massal (Hapus Data Terpilih)**: Menghapus data pegawai yang ditandai dengan validasi backend (mengecualikan atau menolak jika ada akun ber-role Superadmin di dalamnya).
- **Paginasi (Pagination)**:
  - Komponen navigasi nomor halaman (Previous, nomor 1, 2, 3, ..., Next) dengan informasi ringkas `Menampilkan X - Y dari Z data`.

---

### B. Halaman Tambah & Edit Data Pegawai (`/pegawai/form` & `/pegawai/form/[id]`)
Formulir terbagi ke dalam dua panel kartu (`Data Diri` dan `Data Kepegawaian`) dengan aturan metadata sebagai berikut:

| Metadata / Field | Required? | Aturan Validasi / Format / Tipe Form | Pemetaan Database |
|:---|:---:|:---|:---|
| **Foto Pegawai** | Opsional | **Upload file**.<br>• Hanya format image: `PNG`, `JPEG`, atau `JPG` (maksimal 2MB).<br>• Terdapat preview lingkaran foto profil (`foto-profil`).<br>• Jika belum ada foto, tampilkan image placeholder / default icon avatar. | `employees.photo_path` |
| **NIP** | **Ya** (Wajib) | **Input Text / Number**.<br>• Minimal 8 karakter.<br>• Hanya boleh angka (numerik), tidak boleh ada spasi.<br>• Bersifat **unik** (tidak boleh duplikat). | `employees.nip` |
| **Nama Pegawai** | **Ya** (Wajib) | **Input Text**.<br>• Hanya boleh huruf, angka, spasi, dan tanda petik atas (`'`) untuk mengakomodasi gelar/marga (contoh: *D'Angelo*, *Syafi'i*). | `employees.name` |
| **Email** | **Ya** (Wajib) | **Input Email**.<br>• Mengikuti aturan standar validasi format email (`RFC 5322`).<br>• Bersifat **unik** dalam sistem. | `employees.email` |
| **Nomor HP** | **Ya** (Wajib) | **Input Text**.<br>• Wajib menggunakan format internasional berawalan `+62` (contoh: `+6282218458888`). | `employees.phone` |
| **Tempat Lahir** | **Ya** (Wajib) | **Input Text** (nama kota/kabupaten kelahiran). | `employees.birth_place` |
| **Tanggal Lahir** | **Ya** (Wajib) | **Datepicker / Input Date** dengan format display `DD/MM/YYYY`. | `employees.birth_date` |
| **Usia** | Readonly | **Input Number (Disabled)**.<br>• Terisi secara otomatis seketika pengguna memilih `Tanggal Lahir` (reaktif `onchange`). Nilai dalam satuan tahun. Posisi field disabled/readonly. | Calculated client-side |
| **Alamat - Kecamatan** | **Ya** (Wajib) | **Dropdown Autocomplete**.<br>• Pengguna mengetikkan minimal **3 karakter** nama kecamatan untuk memicu pencarian.<br>• Mengambil data dari master `districts`. | `employees.district_id` |
| **Alamat - Kabupaten** | Readonly | **Autocomplete / Input Disabled**.<br>• Otomatis terisi nama Kabupaten/Kota dari relasi kecamatan yang terpilih. Posisi field disabled. | `regencies.name` via FK |
| **Alamat - Provinsi** | Readonly | **Autocomplete / Input Disabled**.<br>• Otomatis terisi nama Provinsi dari relasi kabupaten/kecamatan yang terpilih. Posisi field disabled. | `provinces.name` via FK |
| **Alamat Lengkap** | **Ya** (Wajib) | **Textarea**.<br>• Detail nama jalan, nomor rumah, RT/RW, kelurahan/desa. | `employees.full_address` |
| **Jarak Rumah - Kantor** | **Ya** (Wajib) | **Input Number Only**.<br>• Maksimal 2 digit integer (nilai 0 - 99 km) dengan toleransi desimal.<br>• Nilai ini menjadi parameter perhitungan tunjangan transport. | `employees.distance_km` |
| **Status Kawin** | **Ya** (Wajib) | **Radio Button**.<br>• Pilihan: `"kawin"` (Menikah) atau `"tidak kawin"` (Belum Menikah/Cerai). | `employees.marital_status` |
| **Jumlah Anak** | **Ya** (Wajib) | **Input Number Only**.<br>• Maksimal 2 digit (contoh: 0 s/d 99). Terkunci 0 jika belum menikah. | `employees.children_count` |
| **Tanggal Masuk** | **Ya** (Wajib) | **Datepicker / Input Date** dengan format `DD/MM/YYYY`. Menentukan hitungan masa kerja. | `employees.joined_at` |
| **Jabatan** | **Ya** (Wajib) | **Dropdown Select**.<br>• Pilihan standar: `Manager`, `Staf`, `Magang` (serta jabatan struktural lainnya). | `employees.position_id` |
| **Departemen** | **Ya** (Wajib) | **Dropdown Select**.<br>• Pilihan standar: `Marketing`, `HRD`, `Production`, `Executive`, `Commissioner`. | `employees.department_id` |
| **Riwayat Pendidikan** | **Ya** (Minimal 1) | **Formulir Dinamis (Repeater)**.<br>• Pengguna dapat menambah baris baru dengan tombol `+ TAMBAH DATA`.<br>• Setiap baris memiliki kolom: **Jenjang** (SD, SMP, SMA/SMK, D3, S1, S2, S3), **Nama Sekolah / Perguruan Tinggi**, **Tahun Lulus** (angka 4 digit).<br>• Terdapat tombol `x` (hapus baris) untuk membuang row terkait. | Tabel relasi `employee_educations` |
| **Status Pegawai** | **Ya** (Wajib) | **Switch Toggle / Radio / Dropdown**.<br>• Nilai: `Aktif` (`active`) atau `Nonaktif` (`inactive`). Default: Aktif. | `employees.status` |

---

### C. Halaman Detail Pegawai (`/pegawai/[nipp]/index.vue`)
- Menggunakan komponen tata letak bawaan Tabler/Nuxt UI yang telah ada (`datagrid-item`, `datagrid-title`, `datagrid-content`).
- Menampilkan seluruh metadata yang diisi pada formulir penambahan data baru:
  1. **Data Diri**: Foto profil, NIP, Nama Lengkap, Email, Nomor HP, Tempat Lahir, Tanggal Lahir, Usia, Status Pernikahan, dan Jumlah Anak.
  2. **Lokasi & Domisili**: Alamat Lengkap, Kecamatan, Kabupaten, Provinsi, dan Jarak Rumah ke Kantor (`distance_km`).
  3. **Riwayat Pendidikan**: Daftar jenjang pendidikan, nama institusi/sekolah, dan tahun kelulusan secara kronologis.
  4. **Data Kepegawaian**: Tanggal Masuk Kerja, Masa Kerja (kalkulasi), Jabatan, Departemen, dan Status Keaktifan (badge aktif/nonaktif).
  5. **Tombol Navigasi**: Tombol *Kembali* ke daftar pegawai dan tombol *Download Ringkasan PDF*.

---

## 4. Spesifikasi API Backend & Standar HTTP Status Code

Semua endpoint modul kepegawaian **WAJIB mematuhi standar HTTP status code baku** dan **DILARANG membungkus status error di dalam kode status 200 OK**:

### 1. `GET /api/employees`
Mengambil daftar pegawai dengan filter, pencarian, paginasi, dan pengurutan (*sorting*).
- **Query Params**: `page`, `per_page`, `search` (NIP/nama/jabatan), `department_id`, `position_id`, `contract_type`, `min_tenure`, `max_tenure`, `sort_by`, `sort_dir`.
- **Status Responses**:
  - `200 OK`: Data pegawai berhasil didapatkan beserta metadata paginasi.
  - `401 Unauthorized`: Token JWT tidak valid atau sesi berakhir.
  - `403 Forbidden`: Role tidak diizinkan mengakses data kepegawaian (misal Superadmin).

### 2. `GET /api/employees/:nip_or_id`
Mengambil data detail profil lengkap satu pegawai beserta relasi riwayat pendidikan dan informasi wilayah.
- **Status Responses**:
  - `200 OK`: Detail pegawai ditemukan.
  - `404 Not Found`: Pegawai dengan NIP/ID tersebut tidak ditemukan.

### 3. `POST /api/employees`
Menambahkan data pegawai baru beserta array riwayat pendidikannya (`employee_educations`).
- **Status Responses**:
  - `201 Created`: Data pegawai dan riwayat pendidikan berhasil tersimpan.
  - `400 Bad Request`: Format data tidak sesuai (misal: NIP kurang dari 8 karakter, ada karakter terlarang pada nama, format nomor HP tidak berawalan `+62`, jarak lebih dari 2 digit).
  - `409 Conflict`: NIP atau Email pegawai sudah terdaftar pada sistem.
  - `422 Unprocessable Entity`: Validasi field wajib gagal (field mandatory kosong).

### 4. `PUT /api/employees/:id`
Memperbarui data profil, jabatan, departemen, alamat, atau status keaktifan pegawai.
- **Status Responses**:
  - `200 OK`: Data pegawai berhasil diperbarui.
  - `400 Bad Request`: Pelanggaran validasi data update.
  - `404 Not Found`: ID Pegawai tidak ditemukan.
  - `409 Conflict`: NIP atau email pengganti bentrok dengan data pegawai lain.

### 5. `DELETE /api/employees/:id`
Menghapus data pegawai menggunakan metode **Soft Delete** (`deleted_at = NOW()`).
- **Aturan Proteksi**: Sistem melakukan join ke tabel `users`. Apabila pegawai tersebut memiliki user login dengan role `superadmin`, sistem menolak penghapusan.
- **Status Responses**:
  - `204 No Content`: Data pegawai berhasil di-soft delete tanpa body respons.
  - `400 Bad Request`: Menghapus pegawai yang terafiliasi dengan role Superadmin (*"Data pegawai terhubung dengan akun Superadmin dan tidak dapat dihapus"*).
  - `403 Forbidden`: Pengguna bukan role Admin HRD.
  - `404 Not Found`: ID Pegawai tidak ditemukan.

### 6. `PATCH /api/employees/bulk-status`
Memperbarui status keaktifan (`active` / `inactive`) secara massal untuk kumpulan ID pegawai yang dipilih pada tabel.
- **Payload**: `{ ids: ["uuid1", "uuid2"], status: "inactive" }`
- **Status Responses**:
  - `200 OK`: Status pegawai terpilih berhasil diperbarui secara massal.
  - `400 Bad Request`: Payload ID kosong atau status tidak valid.

### 7. `POST /api/employees/bulk-delete`
Menghapus data pegawai terpilih secara massal (*bulk soft-delete*).
- **Payload**: `{ ids: ["uuid1", "uuid2"] }`
- **Status Responses**:
  - `200 OK` atau `204 No Content`: Pegawai yang memenuhi syarat berhasil dihapus.
  - `400 Bad Request`: Jika di antara ID yang dipilih terdapat pegawai terafiliasi akun Superadmin.

### 8. `GET /api/employees/export`
Mengunduh laporan daftar pegawai format PDF atau Excel (`?format=excel` atau `?format=pdf`).
- **Status Responses**:
  - `200 OK`: Stream file binary (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` atau `application/pdf`).

### 9. `GET /api/districts/suggest?q=:query`
Mencari data kecamatan (minimal 3 karakter) beserta auto-resolve kabupaten dan provinsinya.
- **Status Responses**:
  - `200 OK`: Array hasil pencarian kecamatan.
  - `429 Too Many Requests`: Melebihi batas pemanggilan API (Rate Limiting).

---

## 5. Analisis GAP & Rekomendasi Teknis (Tanpa Mengubah Template View Nuxt)

Berdasarkan perbandingan antara spesifikasi dokumen soal teknis, skema basis data `schema-db.md`, dan implementasi template view bawaan Nuxt (`app/pages/pegawai/index.vue`, `app/features/DataPegawai/components/PegawaiForm.vue`, `app/pages/pegawai/[nipp]/index.vue`):

### A. Analisis GAP Antarmuka & Data:
1. **Pencarian Kecamatan (Autocomplete vs Plain Select)**:
   - *Kondisi Template Sekarang*: Pada `PegawaiForm.vue`, kecamatan menggunakan tag `<select>` statis biasa (Danurejan, Gedongtengen, dll).
   - *Requirement Dokumen*: Kecamatan harus berupa autocomplete minimal 3 karakter, dan saat dipilih otomatis mengisi Kabupaten dan Provinsi (posisi disabled).
   - *Rekomendasi Implementasi*: Komponen `select` pada template dapat diganti dengan input text autocomplete atau select berbasis remote search tanpa mengubah layout grid bawaan (`col-md-4`).
2. **Hitung Usia Otomatis**:
   - Field `Usia` pada form template sudah memiliki class `readonly`. Diperlukan reactive watcher `watch(birthDate)` yang menghitung `Math.floor((today - birthDate) / 31557600000)` sehingga terisi instan tanpa reload.
3. **Form Riwayat Pendidikan Dinamis**:
   - Template `PegawaiForm.vue` telah memiliki markup tabel dan tombol `TAMBAH DATA` serta icon hapus `IconXboxXFilled`. Diperlukan binding array reaktif `form.educations = [{ education_level: '', school_name: '', graduation_year: '' }]` agar fungsi penambahan baris dan penghapusan baris berfungsi dinamis.
4. **Format Nomor HP Internasional**:
   - Menambahkan input prefix `+62` atau validasi regex `^\+62[0-9]{9,13}$` pada input no HP di template tanpa mengubah struktur class form-control.
5. **Bulk Action Toolbar pada Table**:
   - Checkbox di kolom nomor dan header tabel dihubungkan dengan array `selectedEmployeeIds = ref([])`. Bilah kontrol aktif/nonaktif dan hapus masal muncul secara transisi kondisional (`v-if="selectedEmployeeIds.length > 0"`) di atas card header.
6. **Masa Kerja Dinamis pada Kolom Tabel**:
   - Menggantikan string dummy pada tabel dengan helper pemformat masa kerja: jika `diffYears > 0` tampilkan `X Tahun Y Bulan`, jika di bawah 1 tahun tampilkan `X Bulan`.

---

## 6. Rekomendasi & Best Practices Arsitektur (Approved Recommendations)

Bagian ini memuat saran teknis dan arsitektur yang telah disetujui untuk diimplementasikan tanpa merubah struktur template view Nuxt bawaan:

### 1. Kalkulasi Usia Reaktif Tanpa Server Round-trip
- Field `Usia` pada template `PegawaiForm.vue` telah memiliki atribut `readonly`.
- Kalkulasi usia dilakukan secara instan di sisi klien menggunakan helper / composable reaktif berbasis tanggal lahir:
  ```javascript
  const calculateAge = (dateStr) => {
    if (!dateStr) return 0;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return Math.max(0, age);
  };
  ```
- Reaktivitas ini menjaga performa tanpa memerlukan HTTP request tambahan ke server.

### 2. Penanganan Integritas Data & Sesi saat Soft-Delete Pegawai
- Mengingat pegawai memiliki keterhubungan langsung dengan tabel `users`, `attendances`, dan `transport_allowance_details`:
  - **Otomatis Nonaktifkan Akun & Revoke Sesi**: Saat data pegawai di-soft-delete (`deleted_at = NOW()`), akun login terkait pada tabel `users` otomatis diubah statusnya menjadi `inactive` dan seluruh token sesi aktif pada tabel `user_sessions` langsung dibatalkan (dihapus/di-revoke).
  - **Preservasi Riwayat Finansial & Operasional**: Seluruh data riwayat kehadiran masa lampau (`attendances`) dan rincian tunjangan transport (`transport_allowance_details`) **TIDAK BOLEH dihapus (no cascade delete)** agar integritas laporan historis, kepatuhan audit, dan rekap penggajian tetap utuh.

### 3. Penyimpanan Riwayat Pendidikan Berbasis Transaksi Basis Data (DB Transaction)
- Pada operasi penambahan (`POST /api/employees`) maupun pembaruan (`PUT /api/employees/:id`), data induk pegawai dan nested array riwayat pendidikan (`employee_educations`) wajib dibungkus dalam satu blok transaksi basis data (`db.transaction()`):
  - Jika salah satu baris riwayat pendidikan gagal divalidasi atau terjadi error saat insert/update, seluruh proses di-*rollback* secara otomatis.
  - Menghindari timbulnya *orphan data* atau data pegawai yang tersimpan setengah jadi tanpa riwayat pendidikan.

### 4. Proteksi Anti-Scraping & Enumerasi NIP (Rate Limiting)
- Endpoint detail pegawai `GET /api/employees/:nip_or_id` dilindungi *rate limiter* moderat untuk mencegah skenario penyerang atau pengguna internal melakukan *scraping* / pengumpulan massal seluruh profil dan biodata sensitif karyawan secara terotomatisasi.

### 5. Validasi Keaslian Berkas Foto Profil (Magic Bytes / MIME Sniffing)
- Sistem backend tidak boleh hanya mengandalkan ekstensi nama berkas (misal `.png`, `.jpg`).
- Backend wajib memeriksa header berkas asli (*magic bytes* / content-type sniffing) guna memastikan berkas yang diunggah benar-benar file gambar valid dan aman, mencegah ancaman eksekusi web shell tersembunyi.

---

## 7. Kriteria Penerimaan (Acceptance Criteria)

### A. Kriteria Fungsional UI & Operasional
- **AC-EMP-01**: Admin HRD memiliki hak penuh untuk mengakses daftar, menambah, mengedit, mengunduh, dan menghapus data pegawai. Manager HRD hanya memiliki hak membaca (Read Only) tanpa kontrol aksi.
- **AC-EMP-02**: Kolom tabel memuat No (dengan Checkbox), NIP, Nama (disertai foto), Jabatan, Tanggal Masuk (format ID), Masa Kerja (kalkulasi tahun/bulan), dan tombol Aksi (Detail, Edit, Download PDF, Hapus).
- **AC-EMP-03**: Fitur sorting berfungsi pada kolom NIP, Nama, Jabatan, Tanggal Masuk, dan Masa Kerja.
- **AC-EMP-04**: Toolbar pencarian memproses filter query gabungan terhadap NIP, Nama, atau Jabatan.
- **AC-EMP-05**: Filter Masa Kerja (min-max angka), Filter Jabatan (dropdown/multi-select), dan Filter Status Kontrak (PKWTT/PKWT) memfilter data tabel secara akurat.
- **AC-EMP-06**: Bulk Selection memungkinkan pengguna memilih beberapa baris dan memunculkan tombol pengubah status (Aktif/Nonaktif) serta tombol Hapus Terpilih.
- **AC-EMP-07**: Form Tambah/Edit memvalidasi NIP (minimal 8 angka, tanpa spasi, unik), Nama (hanya huruf, angka, spasi, petik atas), Email (standar email, unik), Nomor HP (format `+62`), dan Jarak Rumah (maksimal 2 digit integer).
- **AC-EMP-08**: Pemilihan Tanggal Lahir secara otomatis menghitung dan mengisi nilai field Usia (disabled/readonly) secara instan di klien tanpa server round-trip.
- **AC-EMP-09**: Form dinamis Riwayat Pendidikan dapat menambah baris baru dan menghapus baris data pendidikan yang diinginkan.
- **AC-EMP-10**: Autocomplete Kecamatan (minimal 3 karakter) secara otomatis menetapkan nilai Kabupaten dan Provinsi dalam kondisi disabled.

### B. Kriteria Keamanan & Integritas Data
- **AC-EMP-SEC-01 (Superadmin Protection)**: Upaya menghapus data pegawai yang memiliki relasi akun dengan role `superadmin` wajib ditolak keras oleh backend dengan kode status `400 Bad Request`.
- **AC-EMP-SEC-02 (Soft Delete Integrity & Session Revocation)**: Penghapusan pegawai bersifat *Soft Delete* (`deleted_at = NOW()`), secara otomatis menonaktifkan akun login terkait di tabel `users`, mencabut seluruh token sesi aktif di `user_sessions`, serta menjaga rekam jejak relasi riwayat kehadiran (`attendances`) dan tunjangan (`transport_allowance_details`) tetap utuh.
- **AC-EMP-SEC-03 (Transactional Consistency)**: Penyimpanan data pegawai dan riwayat pendidikan wajib menggunakan *Database Transaction* untuk menjamin konsistensi data secara atomik.
- **AC-EMP-SEC-04 (Anti-Scraping Rate Limit)**: Endpoint pembacaan data pegawai dilindungi *rate limiting* untuk mencegah enumerasi NIP dan *scraping* data massal.
- **AC-EMP-SEC-05 (File Upload Magic Bytes Validation)**: Upload berkas foto profil tervalidasi menggunakan pemeriksaan *magic bytes* MIME type asli (`image/png`, `image/jpeg`, `image/jpg`) dengan batas ukuran maksimal 2MB.
- **AC-EMP-SEC-06 (Strict HTTP Status Codes)**: Backend tidak boleh membungkus pesan error dengan status `200 OK`. Wajib menerapkan kode status standar baku (`200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, dan `422`).
