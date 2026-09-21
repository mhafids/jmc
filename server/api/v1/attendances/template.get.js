import * as XLSX from 'xlsx';
import { requireAttendanceAccess } from '~~/server/utils/attendance-auth-guard.js';

export default defineEventHandler(async (event) => {
  await requireAttendanceAccess(event, 'read');

  const headers = [
    'NIP',
    'Tanggal',
    'Jam Masuk',
    'Jam Pulang',
    'Lokasi Masuk',
    'Lokasi Pulang',
    'Keterangan',
  ];

  const sampleData = [
    {
      'NIP': '198801152010121001',
      'Tanggal': '2026-08-03',
      'Jam Masuk': '07:55',
      'Jam Pulang': '17:05',
      'Lokasi Masuk': 'Gedung Utama',
      'Lokasi Pulang': 'Gedung Utama',
      'Keterangan': 'Hadir tepat waktu',
    },
    {
      'NIP': '199611282020082004',
      'Tanggal': '2026-08-03',
      'Jam Masuk': '08:25',
      'Jam Pulang': '17:30',
      'Lokasi Masuk': 'Gedung A',
      'Lokasi Pulang': 'Gedung A',
      'Keterangan': 'Terlambat > 15 menit',
    },
    {
      'NIP': '199407102018011003',
      'Tanggal': '2026-08-04',
      'Jam Masuk': '',
      'Jam Pulang': '',
      'Lokasi Masuk': '',
      'Lokasi Pulang': '',
      'Keterangan': 'Cuti',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });

  worksheet['!cols'] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 30 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Presensi');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  setHeader(event, 'Content-Disposition', 'attachment; filename="Template_Presensi_JMC.xlsx"');

  return buffer;
});
