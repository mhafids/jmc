export const manajemenRole = [
  {
    id: "superadmin-role-id",
    role: "Superadmin",
    deskripsi: "Pengelola sistem utama dengan hak akses teknis menyeluruh, manajemen user, log aktivitas, dan konfigurasi master.",
  },
  {
    id: "manager-hrd-role-id",
    role: "Manager HRD",
    deskripsi: "Pimpinan eksekutif Divisi SDM / HRD. Berhak memantau dasbor analitik, melihat seluruh data pegawai, presensi harian, dan tunjangan transport.",
  },
  {
    id: "admin-hrd-role-id",
    role: "Admin HRD",
    deskripsi: "Staff operasional HRD yang mengelola transaksi harian, input data kepegawaian, verifikasi presensi, dan pengaturan tarif tunjangan.",
  },
];

export const hakAksesMatriks = {
  Superadmin: [
    { no: 1, modul: "Login / Logout", canAksesMenu: true, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "CRUD: - (Y)" },
    { no: 2, modul: "Kelola Role", canAksesMenu: true, canCreateMenu: false, read: "All", update: "-", delete: "-", notes: "Hanya melihat daftar master role" },
    { no: 3, modul: "Kelola User", canAksesMenu: true, canCreateMenu: true, read: "All", update: "All", delete: "All", notes: "Kecuali menghapus data dirinya" },
    { no: 4, modul: "My Profile", canAksesMenu: true, canCreateMenu: false, read: "Own", update: "Own", delete: "-", notes: "Hanya profil akun sendiri" },
    { no: 5, modul: "Dashboard", canAksesMenu: true, canCreateMenu: false, read: "All", update: "-", delete: "-", notes: "Sesuai wewenang Superadmin" },
    { no: 6, modul: "Data Pegawai", canAksesMenu: false, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "Tidak Ada Akses" },
    { no: 7, modul: "Presensi", canAksesMenu: false, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "Tidak Diperuntukkan (X)" },
    { no: 8, modul: "Tunjangan Transport", canAksesMenu: false, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "Tidak Ada Akses" },
    { no: 9, modul: "Setting Tunjangan", canAksesMenu: false, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "Tidak Ada Akses" },
    { no: 10, modul: "Modul Log", canAksesMenu: true, canCreateMenu: false, read: "All", update: "-", delete: "-", notes: "Membaca seluruh log audit aktivitas" },
  ],
  "Manager HRD": [
    { no: 1, modul: "Login / Logout", canAksesMenu: true, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "CRUD: - (Y)" },
    { no: 2, modul: "Kelola Role", canAksesMenu: false, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "Tidak Ada Akses" },
    { no: 3, modul: "Kelola User", canAksesMenu: false, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "Tidak Ada Akses" },
    { no: 4, modul: "My Profile", canAksesMenu: true, canCreateMenu: false, read: "Own", update: "Own", delete: "-", notes: "Hanya profil akun sendiri" },
    { no: 5, modul: "Dashboard", canAksesMenu: true, canCreateMenu: false, read: "All", update: "-", delete: "-", notes: "Sesuai wewenang Manager HRD" },
    { no: 6, modul: "Data Pegawai", canAksesMenu: true, canCreateMenu: false, read: "All", update: "-", delete: "-", notes: "Melihat seluruh data pegawai" },
    { no: 7, modul: "Presensi", canAksesMenu: true, canCreateMenu: false, read: "All", update: "-", delete: "-", notes: "Monitoring dan rekap presensi pegawai" },
    { no: 8, modul: "Tunjangan Transport", canAksesMenu: true, canCreateMenu: false, read: "Own", update: "-", delete: "-", notes: "Melihat tunjangan transport dirinya" },
    { no: 9, modul: "Setting Tunjangan", canAksesMenu: false, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "Tidak Ada Akses" },
    { no: 10, modul: "Modul Log", canAksesMenu: false, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "Tidak Ada Akses" },
  ],
  "Admin HRD": [
    { no: 1, modul: "Login / Logout", canAksesMenu: true, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "CRUD: - (Y)" },
    { no: 2, modul: "Kelola Role", canAksesMenu: false, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "Tidak Ada Akses" },
    { no: 3, modul: "Kelola User", canAksesMenu: false, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "Tidak Ada Akses" },
    { no: 4, modul: "My Profile", canAksesMenu: true, canCreateMenu: false, read: "Own", update: "Own", delete: "-", notes: "Hanya profil akun sendiri" },
    { no: 5, modul: "Dashboard", canAksesMenu: true, canCreateMenu: false, read: "All", update: "-", delete: "-", notes: "Sesuai wewenang Admin HRD" },
    { no: 6, modul: "Data Pegawai", canAksesMenu: true, canCreateMenu: true, read: "All", update: "All", delete: "All", notes: "Kecuali pegawai dengan role Superadmin" },
    { no: 7, modul: "Presensi", canAksesMenu: true, canCreateMenu: true, read: "All", update: "All", delete: "All", notes: "Entri & validasi absensi harian" },
    { no: 8, modul: "Tunjangan Transport", canAksesMenu: true, canCreateMenu: false, read: "Own", update: "-", delete: "-", notes: "Melihat tunjangan transport dirinya" },
    { no: 9, modul: "Setting Tunjangan", canAksesMenu: true, canCreateMenu: true, read: "All", update: "All", delete: "All", notes: "Kelola rate & aturan tunjangan" },
    { no: 10, modul: "Modul Log", canAksesMenu: false, canCreateMenu: false, read: "-", update: "-", delete: "-", notes: "Tidak Ada Akses" },
  ],
};

export const hakAkses = hakAksesMatriks["Superadmin"];
