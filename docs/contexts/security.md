A. Security
1. Password hashing: use argon2
2. Sanitasi input : use zod
3. Proteksi SQL Injection/XSS/CSRF
4. Role-Based Access Control (RBAC) & Strict UI Action Security:
   - Pengguna hanya dapat mengakses halaman dan melakukan aksi (Create, Read, Update, Delete) sesuai wewenang role yang tersimpan di database.
   - Strict UI Action: Tombol aksi mutating (misal: tombol edit pada tabel atau tombol "Edit Hak Akses") wajib disembunyikan (*hidden*) jika pengguna tidak memiliki wewenang update/edit.
   - Strict Navigation Guard: Halaman edit wewenang tidak boleh dimasuki oleh pengguna tanpa izin edit wewenang.
   - Strict Backend Mutating Guard: Endpoint mutating (PUT/POST/DELETE) wajib memvalidasi wewenang spesifik di sisi server dan mengembalikan HTTP 403 Forbidden bila tidak berhak.