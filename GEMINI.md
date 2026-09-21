<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## Standard HTTP Status Codes Rule

Semua endpoint API dan penanganan error/respons jaringan **WAJIB** mematuhi standar HTTP status code dan **TIDAK BOLEH DIUBAH / DICUSTOMIZE SECARA SEMBARANG**:
- `200 OK`: Permintaan sukses (GET, PUT, update status).
- `201 Created`: Pembuatan resource baru berhasil (POST).
- `204 No Content`: Penghapusan berhasil tanpa body respons (DELETE).
- `400 Bad Request`: Validasi input gagal, pelanggaran aturan bisnis (misal: mencoba menghapus akun diri sendiri, format username salah).
- `401 Unauthorized`: Sesi tidak valid, token kedaluwarsa, atau sesi telah dibatalkan (misal: akun dinonaktifkan).
- `403 Forbidden`: Pengguna tidak memiliki hak akses/role yang sesuai (misal: non-Superadmin mengakses modul user).
- `404 Not Found`: Data/resource yang diminta tidak ditemukan.
- `409 Conflict`: Konflik data unik (misal: username sudah terdaftar).
- `422 Unprocessable Entity`: Validasi payload form gagal di level skema.
- `429 Too Many Requests`: Melebihi batas pemanggilan API (Rate Limiting).
- `500 Internal Server Error`: Kesalahan sistem internal server.

Dilarang membungkus error di dalam status `200 OK` (seperti `{ status: 200, error: true }`) atau mengubah makna kode status standar HTTP.
