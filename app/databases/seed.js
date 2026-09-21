import 'dotenv/config';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { uuidv7 } from 'uuidv7';
import { db, poolConnection } from './drizzle.js';
import * as schema from './schema.js';

async function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16);
  return argon2.hash(plainPassword, {
    type: argon2.argon2id,
    salt,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function runSeed() {
  console.log('🚀 Memulai proses seeding database lengkap (Real-World Enterprise Case)...');

  try {
    console.log('📦 1. Seeding Roles...');
    const rolesData = [
      {
        id: uuidv7(),
        code: 'superadmin',
        name: 'Superadmin',
        description:
          'Pengelola sistem utama dengan hak akses teknis menyeluruh, manajemen user, log audit IT, dan konfigurasi master sistem.',
      },
      {
        id: uuidv7(),
        code: 'manager_hrd',
        name: 'Manager HRD',
        description:
          'Pimpinan eksekutif Divisi SDM / HRD. Berhak memantau dasbor analitik, melihat seluruh profil pegawai, monitoring presensi harian, dan ringkasan tunjangan transport.',
      },
      {
        id: uuidv7(),
        code: 'admin_hrd',
        name: 'Admin HRD',
        description:
          'Staff operasional HRD yang mengelola data kepegawaian (CRUD), verifikasi koreksi absensi, impor fingerprint, dan kelola tarif tunjangan transport.',
      },
    ];

    const roleMap = new Map();
    for (const r of rolesData) {
      await db.insert(schema.roles).values(r).onDuplicateKeyUpdate({
        set: { code: r.code, description: r.description, updatedAt: new Date() },
      });
      const existing = await db.query.roles?.findFirst?.({
        where: (tbl, { eq }) => eq(tbl.name, r.name),
      });
      roleMap.set(r.name, existing ? existing.id : r.id);
      roleMap.set(r.code, existing ? existing.id : r.id);
    }
    console.log('   ✅ Roles seeded.');

    console.log('📦 2. Seeding Modules...');
    const modulesData = [
      { id: uuidv7(), code: 'AUTH', name: 'Login / Logout', path: '/login', orderNo: 1 },
      { id: uuidv7(), code: 'ROLES', name: 'Kelola Role', path: '/user/role', orderNo: 2 },
      { id: uuidv7(), code: 'USERS', name: 'Kelola User', path: '/user/manage', orderNo: 3 },
      { id: uuidv7(), code: 'MY_PROFILE', name: 'My Profile', path: '/profile', orderNo: 4 },
      { id: uuidv7(), code: 'DASHBOARD', name: 'Dashboard', path: '/', orderNo: 5 },
      { id: uuidv7(), code: 'EMPLOYEES', name: 'Modul Data Pegawai', path: '/pegawai', orderNo: 6 },
      { id: uuidv7(), code: 'ATTENDANCES', name: 'Modul Presensi', path: '/presensi', orderNo: 7 },
      { id: uuidv7(), code: 'TRANSPORT_ALLOWANCES', name: 'Modul Tunjangan Transport', path: '/tunjangan/transport', orderNo: 8 },
      { id: uuidv7(), code: 'TRANSPORT_SETTINGS', name: 'Setting Tunjangan Transport', path: '/tunjangan/setting', orderNo: 9 },
      { id: uuidv7(), code: 'ACTIVITY_LOGS', name: 'Modul Log Aktivitas', path: '/log', orderNo: 10 },
    ];

    const moduleMap = new Map();
    for (const m of modulesData) {
      await db.insert(schema.modules).values(m).onDuplicateKeyUpdate({
        set: { name: m.name, path: m.path, orderNo: m.orderNo, updatedAt: new Date() },
      });
      const existing = await db.query.modules?.findFirst?.({
        where: (tbl, { eq }) => eq(tbl.code, m.code),
      });
      moduleMap.set(m.code, existing ? existing.id : m.id);
    }
    console.log('   ✅ Modules seeded.');

    console.log('📦 3. Seeding Role Permissions...');
    const superadminId = roleMap.get('Superadmin');
    const managerHrdId = roleMap.get('Manager HRD');
    const adminHrdId = roleMap.get('Admin HRD');

    const permissions = [
      { roleId: superadminId, moduleCode: 'AUTH', canAccess: true, canCreate: false, readScope: 'no', updateScope: 'no', deleteScope: 'no', notes: null },
      { roleId: managerHrdId, moduleCode: 'AUTH', canAccess: true, canCreate: false, readScope: 'no', updateScope: 'no', deleteScope: 'no', notes: null },
      { roleId: adminHrdId, moduleCode: 'AUTH', canAccess: true, canCreate: false, readScope: 'no', updateScope: 'no', deleteScope: 'no', notes: null },

      { roleId: superadminId, moduleCode: 'ROLES', canAccess: true, canCreate: false, readScope: 'all', updateScope: 'no', deleteScope: 'no', notes: 'Hanya melihat daftar master role' },

      { roleId: superadminId, moduleCode: 'USERS', canAccess: true, canCreate: true, readScope: 'all', updateScope: 'all', deleteScope: 'all', notes: 'Dilarang menghapus akun sendiri (userId != currentUser.id)' },

      { roleId: superadminId, moduleCode: 'MY_PROFILE', canAccess: true, canCreate: false, readScope: 'own', updateScope: 'own', deleteScope: 'no', notes: 'Hanya melihat dan memperbarui profil akun sendiri' },
      { roleId: managerHrdId, moduleCode: 'MY_PROFILE', canAccess: true, canCreate: false, readScope: 'own', updateScope: 'own', deleteScope: 'no', notes: 'Hanya melihat dan memperbarui profil akun sendiri' },
      { roleId: adminHrdId, moduleCode: 'MY_PROFILE', canAccess: true, canCreate: false, readScope: 'own', updateScope: 'own', deleteScope: 'no', notes: 'Hanya melihat dan memperbarui profil akun sendiri' },

      { roleId: superadminId, moduleCode: 'DASHBOARD', canAccess: true, canCreate: false, readScope: 'all', updateScope: 'no', deleteScope: 'no', notes: 'Tampilan Dashboard Metrik Sistem & Audit IT' },
      { roleId: managerHrdId, moduleCode: 'DASHBOARD', canAccess: true, canCreate: false, readScope: 'all', updateScope: 'no', deleteScope: 'no', notes: 'Tampilan Dashboard Ringkasan Eksekutif & Statistik Kehadiran Pegawai' },
      { roleId: adminHrdId, moduleCode: 'DASHBOARD', canAccess: true, canCreate: false, readScope: 'all', updateScope: 'no', deleteScope: 'no', notes: 'Tampilan Dashboard Operasional Harian & Shortcut Input' },

      { roleId: managerHrdId, moduleCode: 'EMPLOYEES', canAccess: true, canCreate: false, readScope: 'all', updateScope: 'no', deleteScope: 'no', notes: 'Melihat seluruh daftar dan detail data kepegawaian' },
      { roleId: adminHrdId, moduleCode: 'EMPLOYEES', canAccess: true, canCreate: true, readScope: 'all', updateScope: 'all', deleteScope: 'all', notes: 'Dilarang menghapus pegawai yang terhubung ke role Superadmin' },

      { roleId: superadminId, moduleCode: 'ATTENDANCES', canAccess: false, canCreate: false, readScope: 'no', updateScope: 'no', deleteScope: 'no', notes: 'Superadmin dilarang mengakses modul Presensi' },
      { roleId: managerHrdId, moduleCode: 'ATTENDANCES', canAccess: true, canCreate: false, readScope: 'all', updateScope: 'no', deleteScope: 'no', notes: 'Monitoring dan rekap presensi seluruh pegawai' },
      { roleId: adminHrdId, moduleCode: 'ATTENDANCES', canAccess: true, canCreate: true, readScope: 'all', updateScope: 'all', deleteScope: 'all', notes: 'Entri, verifikasi koreksi, dan validasi absensi harian' },

      { roleId: managerHrdId, moduleCode: 'TRANSPORT_ALLOWANCES', canAccess: true, canCreate: false, readScope: 'own', updateScope: 'no', deleteScope: 'no', notes: 'Melihat kalkulasi tunjangan transport untuk dirinya sendiri' },
      { roleId: adminHrdId, moduleCode: 'TRANSPORT_ALLOWANCES', canAccess: true, canCreate: false, readScope: 'own', updateScope: 'no', deleteScope: 'no', notes: 'Melihat kalkulasi tunjangan transport untuk dirinya sendiri' },

      { roleId: adminHrdId, moduleCode: 'TRANSPORT_SETTINGS', canAccess: true, canCreate: true, readScope: 'all', updateScope: 'all', deleteScope: 'all', notes: 'Kelola rate per kilometer, tanggal efektif, dan batas jarak minimal/maksimal' },

      { roleId: superadminId, moduleCode: 'ACTIVITY_LOGS', canAccess: true, canCreate: false, readScope: 'all', updateScope: 'no', deleteScope: 'no', notes: 'Membaca seluruh log audit aktivitas user sistem' },
    ];

    for (const p of permissions) {
      const moduleId = moduleMap.get(p.moduleCode);
      if (!moduleId || !p.roleId) continue;

      await db.insert(schema.rolePermissions).values({
        id: uuidv7(),
        roleId: p.roleId,
        moduleId: moduleId,
        canAccess: p.canAccess,
        canCreate: p.canCreate,
        readScope: p.readScope,
        updateScope: p.updateScope,
        deleteScope: p.deleteScope,
        notes: p.notes,
      }).onDuplicateKeyUpdate({
        set: {
          canAccess: p.canAccess,
          canCreate: p.canCreate,
          readScope: p.readScope,
          updateScope: p.updateScope,
          deleteScope: p.deleteScope,
          notes: p.notes,
          updatedAt: new Date(),
        },
      });
    }
    console.log('   ✅ Role Permissions seeded.');

    console.log('📦 4. Seeding Departments & Positions...');
    const departmentsData = [
      { id: uuidv7(), code: 'HRD', name: 'Human Resources & General Affairs', sortOrder: 1 },
      { id: uuidv7(), code: 'IT', name: 'Information Technology & Engineering', sortOrder: 2 },
      { id: uuidv7(), code: 'FIN', name: 'Finance, Accounting & Tax', sortOrder: 3 },
      { id: uuidv7(), code: 'OPS', name: 'Operations & Supply Chain', sortOrder: 4 },
      { id: uuidv7(), code: 'MKT', name: 'Marketing & Strategic Business', sortOrder: 5 },
    ];

    const departmentMap = new Map();
    for (const d of departmentsData) {
      await db.insert(schema.departments).values(d).onDuplicateKeyUpdate({
        set: { name: d.name, sortOrder: d.sortOrder, updatedAt: new Date() },
      });
      const existing = await db.query.departments?.findFirst?.({
        where: (tbl, { eq }) => eq(tbl.code, d.code),
      });
      departmentMap.set(d.code, existing ? existing.id : d.id);
    }

    const positionsData = [
      { id: uuidv7(), code: 'DIR_HR', name: 'Head of Human Resources', positionType: 'manager' },
      { id: uuidv7(), code: 'MGR_HR', name: 'HR Operations Manager', positionType: 'manager' },
      { id: uuidv7(), code: 'SPEC_PAYROLL', name: 'Compensation & Benefits Specialist', positionType: 'staff' },
      { id: uuidv7(), code: 'OFF_RECRUIT', name: 'Talent Acquisition & People Officer', positionType: 'staff' },
      { id: uuidv7(), code: 'LEAD_DEV', name: 'Lead Software Architect', positionType: 'manager' },
      { id: uuidv7(), code: 'SR_ENG', name: 'Senior Fullstack Engineer', positionType: 'staff' },
      { id: uuidv7(), code: 'JR_DEV', name: 'Junior Backend Developer', positionType: 'staff' },
      { id: uuidv7(), code: 'INTERN_HR', name: 'HR People Intern', positionType: 'magang' },
    ];

    const positionMap = new Map();
    for (const pos of positionsData) {
      await db.insert(schema.positions).values(pos).onDuplicateKeyUpdate({
        set: { name: pos.name, positionType: pos.positionType, updatedAt: new Date() },
      });
      const existing = await db.query.positions?.findFirst?.({
        where: (tbl, { eq }) => eq(tbl.code, pos.code),
      });
      positionMap.set(pos.code, existing ? existing.id : pos.id);
    }
    console.log('   ✅ Departments & Positions seeded.');

    console.log('📦 5. Seeding Master Wilayah (DIY & Jawa Tengah)...');
    const provincesData = [
      { id: uuidv7(), code: '34', name: 'D.I. Yogyakarta' },
      { id: uuidv7(), code: '33', name: 'Jawa Tengah' },
      { id: uuidv7(), code: '31', name: 'DKI Jakarta' },
    ];

    const provinceMap = new Map();
    for (const prv of provincesData) {
      await db.insert(schema.provinces).values(prv).onDuplicateKeyUpdate({
        set: { name: prv.name, updatedAt: new Date() },
      });
      const existing = await db.query.provinces?.findFirst?.({
        where: (tbl, { eq }) => eq(tbl.code, prv.code),
      });
      provinceMap.set(prv.code, existing ? existing.id : prv.id);
    }

    const diyId = provinceMap.get('34');
    const jatengId = provinceMap.get('33');

    const regenciesData = [
      { id: uuidv7(), provinceId: diyId, code: '3471', name: 'Kota Yogyakarta' },
      { id: uuidv7(), provinceId: diyId, code: '3404', name: 'Kabupaten Sleman' },
      { id: uuidv7(), provinceId: diyId, code: '3402', name: 'Kabupaten Bantul' },
      { id: uuidv7(), provinceId: jatengId, code: '3310', name: 'Kabupaten Klaten' },
      { id: uuidv7(), provinceId: jatengId, code: '3308', name: 'Kabupaten Magelang' },
    ];

    const regencyMap = new Map();
    for (const reg of regenciesData) {
      await db.insert(schema.regencies).values(reg).onDuplicateKeyUpdate({
        set: { name: reg.name, updatedAt: new Date() },
      });
      const existing = await db.query.regencies?.findFirst?.({
        where: (tbl, { eq }) => eq(tbl.code, reg.code),
      });
      regencyMap.set(reg.code, existing ? existing.id : reg.id);
    }

    const slemanId = regencyMap.get('3404');
    const yogyaId = regencyMap.get('3471');
    const bantulId = regencyMap.get('3402');
    const klatenId = regencyMap.get('3310');

    const districtsData = [
      { id: uuidv7(), regencyId: slemanId, code: '340407', name: 'Depok' },
      { id: uuidv7(), regencyId: slemanId, code: '340408', name: 'Mlati' },
      { id: uuidv7(), regencyId: slemanId, code: '340409', name: 'Gamping' },
      { id: uuidv7(), regencyId: yogyaId, code: '347101', name: 'Danurejan' },
      { id: uuidv7(), regencyId: yogyaId, code: '347104', name: 'Gondokusuman' },
      { id: uuidv7(), regencyId: bantulId, code: '340201', name: 'Kasihan' },
      { id: uuidv7(), regencyId: klatenId, code: '331001', name: 'Prambanan' },
    ];

    const districtMap = new Map();
    for (const dist of districtsData) {
      await db.insert(schema.districts).values(dist).onDuplicateKeyUpdate({
        set: { name: dist.name, updatedAt: new Date() },
      });
      const existing = await db.query.districts?.findFirst?.({
        where: (tbl, { eq }) => eq(tbl.code, dist.code),
      });
      districtMap.set(dist.code, existing ? existing.id : dist.id);
    }
    console.log('   ✅ Master Wilayah seeded.');

    console.log('📦 6. Seeding Employees & Education History...');
    const depokDistId = districtMap.get('340407');
    const gondokusumanDistId = districtMap.get('347104');
    const kasihanDistId = districtMap.get('340201');
    const prambananDistId = districtMap.get('331001');

    const employeesData = [
      {
        nip: '198801152010121001',
        name: 'Bramantyo Wicaksono, S.Kom.',
        email: 'bramantyo.it@perusahaan.co.id',
        phone: '081234567890',
        birthPlace: 'Yogyakarta',
        birthDate: '1988-01-15',
        maritalStatus: 'married',
        childrenCount: 2,
        joinedAt: '2015-03-01',
        positionId: positionMap.get('LEAD_DEV'),
        departmentId: departmentMap.get('IT'),
        employmentType: 'tetap',
        gender: 'male',
        districtId: depokDistId,
        fullAddress: 'Jl. Kaliurang KM 5.5, Gg. Pandega Marta No. 12, Depok, Sleman',
        distanceKm: '7.50',
        status: 'active',
        educations: [
          { educationLevel: 'S1', schoolName: 'Universitas Gadjah Mada - Ilmu Komputer', graduationYear: 2010, sortOrder: 1 },
          { educationLevel: 'SMA/SMK', schoolName: 'SMA Negeri 3 Yogyakarta', graduationYear: 2006, sortOrder: 2 },
        ],
      },
      {
        nip: '199004222013052002',
        name: 'Dr. Anindita Saraswati, M.Psi.',
        email: 'anindita.hrd@perusahaan.co.id',
        phone: '081234567891',
        birthPlace: 'Surakarta',
        birthDate: '1990-04-22',
        maritalStatus: 'married',
        childrenCount: 1,
        joinedAt: '2017-08-15',
        positionId: positionMap.get('DIR_HR'),
        departmentId: departmentMap.get('HRD'),
        employmentType: 'tetap',
        gender: 'female',
        districtId: gondokusumanDistId,
        fullAddress: 'Jl. Sagan Timur No. 45, Terban, Gondokusuman, Yogyakarta',
        distanceKm: '4.20',
        status: 'active',
        educations: [
          { educationLevel: 'S3', schoolName: 'Universitas Indonesia - Psikologi Industri & Organisasi', graduationYear: 2021, sortOrder: 1 },
          { educationLevel: 'S2', schoolName: 'Universitas Gadjah Mada - Magister Psikologi Profesi', graduationYear: 2015, sortOrder: 2 },
          { educationLevel: 'S1', schoolName: 'Universitas Negeri Sebelas Maret - Psikologi', graduationYear: 2012, sortOrder: 3 },
        ],
      },
      {
        nip: '199407102018011003',
        name: 'Dimas Pratama, S.E.',
        email: 'dimas.pratama@perusahaan.co.id',
        phone: '081234567892',
        birthPlace: 'Bantul',
        birthDate: '1994-07-10',
        maritalStatus: 'single',
        childrenCount: 0,
        joinedAt: '2019-02-01',
        positionId: positionMap.get('SPEC_PAYROLL'),
        departmentId: departmentMap.get('HRD'),
        employmentType: 'tetap',
        gender: 'male',
        districtId: kasihanDistId,
        fullAddress: 'Perumahan Tirtonirmolo Asri Blok B-7, Kasihan, Bantul',
        distanceKm: '11.80',
        status: 'active',
        educations: [
          { educationLevel: 'S1', schoolName: 'Universitas Islam Indonesia - Manajemen SDM', graduationYear: 2016, sortOrder: 1 },
          { educationLevel: 'SMA/SMK', schoolName: 'SMA Negeri 1 Bantul', graduationYear: 2012, sortOrder: 2 },
        ],
      },
      {
        nip: '199611282020082004',
        name: 'Siti Rahmayani, S.Tr.',
        email: 'siti.rahmayani@perusahaan.co.id',
        phone: '081234567893',
        birthPlace: 'Klaten',
        birthDate: '1996-11-28',
        maritalStatus: 'single',
        childrenCount: 0,
        joinedAt: '2021-06-01',
        positionId: positionMap.get('OFF_RECRUIT'),
        departmentId: departmentMap.get('HRD'),
        employmentType: 'kontrak',
        gender: 'female',
        districtId: prambananDistId,
        fullAddress: 'Jl. Raya Jogja-Solo KM 16, Bugisan, Prambanan, Klaten',
        distanceKm: '18.40',
        status: 'active',
        educations: [
          { educationLevel: 'D3', schoolName: 'Politeknik Negeri Semarang - Administrasi Bisnis', graduationYear: 2018, sortOrder: 1 },
          { educationLevel: 'SMA/SMK', schoolName: 'SMK Negeri 1 Klaten', graduationYear: 2015, sortOrder: 2 },
        ],
      },
      {
        nip: '199203142016021005',
        name: 'Hendra Wijaya, S.Psi.',
        email: 'hendra.wijaya@perusahaan.co.id',
        phone: '081234567894',
        birthPlace: 'Magelang',
        birthDate: '1992-03-14',
        maritalStatus: 'married',
        childrenCount: 1,
        joinedAt: '2016-02-01',
        positionId: positionMap.get('MGR_HR'),
        departmentId: departmentMap.get('HRD'),
        employmentType: 'tetap',
        gender: 'male',
        districtId: depokDistId,
        fullAddress: 'Condongcatur, Depok, Sleman',
        distanceKm: '8.00',
        status: 'inactive',
        educations: [
          { educationLevel: 'S1', schoolName: 'Universitas Sanata Dharma - Psikologi', graduationYear: 2014, sortOrder: 1 },
        ],
      },
      {
        nip: '199705122022011006',
        name: 'Rian Firmansyah, S.Kom.',
        email: 'rian.firmansyah@perusahaan.co.id',
        phone: '081234567895',
        birthPlace: 'Semarang',
        birthDate: '1997-05-12',
        maritalStatus: 'single',
        childrenCount: 0,
        joinedAt: '2022-01-10',
        positionId: positionMap.get('SR_ENG'),
        departmentId: departmentMap.get('IT'),
        employmentType: 'tetap',
        gender: 'male',
        districtId: depokDistId,
        fullAddress: 'Jl. Wahid Hasyim No. 88, Caturtunggal, Depok, Sleman',
        distanceKm: '6.20',
        status: 'active',
        educations: [
          { educationLevel: 'S1', schoolName: 'Universitas Amikom Yogyakarta - Informatika', graduationYear: 2019, sortOrder: 1 },
        ],
      },
    ];

    const employeeMap = new Map();
    for (const emp of employeesData) {
      const { educations, ...empFields } = emp;
      const empId = uuidv7();

      await db.insert(schema.employees).values({
        id: empId,
        ...empFields,
      }).onDuplicateKeyUpdate({
        set: {
          name: empFields.name,
          phone: empFields.phone,
          positionId: empFields.positionId,
          departmentId: empFields.departmentId,
          districtId: empFields.districtId,
          fullAddress: empFields.fullAddress,
          distanceKm: empFields.distanceKm,
          status: empFields.status,
          updatedAt: new Date(),
        },
      });

      const existingEmp = await db.query.employees?.findFirst?.({
        where: (tbl, { eq }) => eq(tbl.nip, emp.nip),
      });
      const resolvedEmpId = existingEmp ? existingEmp.id : empId;
      employeeMap.set(emp.nip, resolvedEmpId);
      employeeMap.set(emp.email, resolvedEmpId);

      for (const edu of educations) {
        await db.insert(schema.employeeEducations).values({
          id: uuidv7(),
          employeeId: resolvedEmpId,
          educationLevel: edu.educationLevel,
          schoolName: edu.schoolName,
          graduationYear: edu.graduationYear,
          sortOrder: edu.sortOrder,
        });
      }
    }
    console.log('   ✅ Employees & Education records seeded.');

    console.log('📦 7. Seeding Users (Linked to Employees with Argon2 password)...');
    const defaultPassword = 'Password123!';

    const usersData = [
      {
        roleId: superadminId,
        employeeNip: '198801152010121001',
        name: 'Bramantyo Wicaksono, S.Kom.',
        username: 'superadmin',
        email: 'bramantyo.it@perusahaan.co.id',
        cellphone: '081234567890',
        jobTitle: 'Lead Systems Architect & Security Officer',
        department: 'Information Technology',
        isActive: true,
        lastLoginAt: new Date(Date.now() - 3600 * 1000 * 2),
      },
      {
        roleId: managerHrdId,
        employeeNip: '199004222013052002',
        name: 'Dr. Anindita Saraswati, M.Psi.',
        username: 'manager.hrd',
        email: 'anindita.hrd@perusahaan.co.id',
        cellphone: '081234567891',
        jobTitle: 'Vice President of People & Culture',
        department: 'Human Resources & Organization Development',
        isActive: true,
        lastLoginAt: new Date(Date.now() - 3600 * 1000 * 24),
      },
      {
        roleId: adminHrdId,
        employeeNip: '199407102018011003',
        name: 'Dimas Pratama, S.E.',
        username: 'admin.hrd',
        email: 'dimas.pratama@perusahaan.co.id',
        cellphone: '081234567892',
        jobTitle: 'People Operations & Payroll Specialist',
        department: 'Human Resources',
        isActive: true,
        lastLoginAt: new Date(Date.now() - 3600 * 1000 * 5),
      },
      {
        roleId: adminHrdId,
        employeeNip: '199611282020082004',
        name: 'Siti Rahmayani, S.Tr.',
        username: 'siti.hrd',
        email: 'siti.rahmayani@perusahaan.co.id',
        cellphone: '081234567893',
        jobTitle: 'Talent Acquisition & Employee Relations Officer',
        department: 'Human Resources',
        isActive: true,
        lastLoginAt: new Date(Date.now() - 3600 * 1000 * 48),
      },
      {
        roleId: adminHrdId,
        employeeNip: '199203142016021005',
        name: 'Hendra Wijaya, S.Psi.',
        username: 'hendra.hrd',
        email: 'hendra.wijaya@perusahaan.co.id',
        cellphone: '081234567894',
        jobTitle: 'HR Operations Associate (Deactivated)',
        department: 'Human Resources',
        isActive: false,
        lastLoginAt: new Date(Date.now() - 3600 * 1000 * 24 * 30),
      },
    ];

    const seededUserMap = new Map();
    for (const u of usersData) {
      const hashedPassword = await hashPassword(defaultPassword);
      const employeeId = employeeMap.get(u.employeeNip) || null;

      await db.insert(schema.users).values({
        id: uuidv7(),
        employeeId: employeeId,
        roleId: u.roleId,
        name: u.name,
        username: u.username,
        email: u.email,
        cellphone: u.cellphone,
        password: hashedPassword,
        status: u.isActive ? 'active' : 'inactive',
        jobTitle: u.jobTitle,
        department: u.department,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
      }).onDuplicateKeyUpdate({
        set: {
          employeeId: employeeId,
          name: u.name,
          email: u.email,
          cellphone: u.cellphone,
          password: hashedPassword,
          status: u.isActive ? 'active' : 'inactive',
          jobTitle: u.jobTitle,
          department: u.department,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt,
          updatedAt: new Date(),
        },
      });

      const existingUser = await db.query.users?.findFirst?.({
        where: (tbl, { eq }) => eq(tbl.username, u.username),
      });
      if (existingUser) {
        seededUserMap.set(u.username, existingUser.id);
      }
      console.log(`   👤 User seeded: ${u.username} (${u.name}) -> Employee: [${u.employeeNip}]`);
    }

    const superadminUserId = seededUserMap.get('superadmin');
    const adminHrdUserId = seededUserMap.get('admin.hrd');

    console.log('📦 8. Seeding Transport Allowance Settings...');
    const settingsData = [
      {
        id: uuidv7(),
        baseFare: '2500.00',
        effectiveStart: '2026-01-01',
        minKm: '3.00',
        maxKm: '30.00',
        isActive: true,
        createdBy: adminHrdUserId,
      },
    ];

    for (const st of settingsData) {
      await db.insert(schema.transportAllowanceSettings).values(st);
    }
    console.log('   ✅ Transport Allowance Settings seeded (Rp 2.500/km, min 3km, max 30km).');

    console.log('📦 9. Seeding Attendance Logs, Imports & Monthly Summaries (August N-1 & September)...');

    const importAugId = uuidv7();
    await db.insert(schema.attendanceImports).values({
      id: importAugId,
      originalFilename: 'LOG_PRESENSI_AGUSTUS_2026.xlsx',
      filePath: '/uploads/attendance/2026/08/presensi_aug2026.xlsx',
      periodYear: 2026,
      periodMonth: 8,
      status: 'completed',
      totalRows: 88,
      processedRows: 88,
      importedBy: adminHrdUserId || superadminUserId,
    });

    const activeEmpList = [
      { nip: '198801152010121001', distanceKm: 7.50 },
      { nip: '199004222013052002', distanceKm: 4.20 },
      { nip: '199407102018011003', distanceKm: 11.80 },
      { nip: '199611282020082004', distanceKm: 18.40 },
      { nip: '199705122022011006', distanceKm: 6.20 },
    ];

    const augWorkDates = [
      '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
      '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14',
      '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21',
      '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28',
      '2026-08-31',
    ];

    for (const empInfo of activeEmpList) {
      const empId = employeeMap.get(empInfo.nip);
      if (!empId) continue;

      let hadirCount = 0.0;
      let cutiCount = 0.0;
      let izinCount = 0.0;
      let sakitCount = 0.0;
      let lateCount = 0;

      for (let idx = 0; idx < augWorkDates.length; idx++) {
        const dateStr = augWorkDates[idx];
        let type = 'hadir';
        let checkin = '07:55:00';
        let checkout = '17:05:00';
        let checkinLoc = 'Gedung Utama';
        let checkoutLoc = 'Gedung Utama';
        let duration = '8.00';
        let status = 'approved';
        let verifRole = 'HRD';
        let remarks = 'Hadir tepat waktu';

        if (empInfo.nip === '198801152010121001') {
          if (idx === 1) {
            checkinLoc = 'Gedung Utama';
            checkoutLoc = 'Gedung A';
            duration = '0.00';
            status = 'rejected';
            remarks = 'Check-in di Gedung Utama, Check-out di Gedung A (Lokasi berbeda)';
          } else if (idx === 5) {
            type = 'cuti';
            checkin = null;
            checkout = null;
            duration = '0.00';
            cutiCount += 1.0;
            remarks = 'Cuti tahunan disetujui';
          } else {
            hadirCount += 1.0;
          }
        } else if (empInfo.nip === '199611282020082004') {
          if (idx === 3) {
            checkin = '08:25:00';
            checkout = '17:30:00';
            duration = '8.00';
            lateCount++;
            hadirCount += 0.5;
            remarks = 'Keterlambatan > 15 menit (Dihitung 0.5 hari kerja)';
          } else if (idx === 10) {
            type = 'izin';
            checkin = null;
            checkout = null;
            duration = '0.00';
            izinCount += 1.0;
            remarks = 'Izin keperluan keluarga mendesak';
          } else {
            hadirCount += 1.0;
          }
        } else if (empInfo.nip === '199004222013052002') {
          if (idx === 8) {
            type = 'sakit';
            checkin = null;
            checkout = null;
            duration = '0.00';
            sakitCount += 1.0;
            remarks = 'Surat keterangan dokter terlampir';
          } else {
            hadirCount += 1.0;
          }
        } else {
          hadirCount += 1.0;
        }

        await db.insert(schema.attendances).values({
          id: uuidv7(),
          employeeId: empId,
          attendanceImportId: importAugId,
          attendanceDate: dateStr,
          checkinAt: checkin,
          checkoutAt: checkout,
          checkinLocation: checkinLoc,
          checkoutLocation: checkoutLoc,
          attendanceType: type,
          durationHours: duration,
          status: status,
          verificationStatus: status === 'approved' ? 'valid' : 'invalid',
          verifiedByRole: verifRole,
          remarks: remarks,
        }).onDuplicateKeyUpdate({
          set: {
            attendanceType: type,
            checkinAt: checkin,
            checkoutAt: checkout,
            checkinLocation: checkinLoc,
            checkoutLocation: checkoutLoc,
            durationHours: duration,
            status: status,
            remarks: remarks,
            updatedAt: new Date(),
          },
        });
      }

      const statusHadirStr = hadirCount >= 19.0 ? 'Terpenuhi' : 'Tidak terpenuhi';
      await db.insert(schema.attendanceSummaries).values({
        id: uuidv7(),
        employeeId: empId,
        periodYear: 2026,
        periodMonth: 8,
        hadir: hadirCount.toFixed(1),
        cuti: cutiCount.toFixed(1),
        izin: izinCount.toFixed(1),
        sakit: sakitCount.toFixed(1),
        hadirLate: lateCount,
        unpaidLeave: '0.0',
        hadirUnpaidLeave: '0.0',
        statusHadir: statusHadirStr,
        calculatedAt: new Date(),
      }).onDuplicateKeyUpdate({
        set: {
          hadir: hadirCount.toFixed(1),
          cuti: cutiCount.toFixed(1),
          izin: izinCount.toFixed(1),
          sakit: sakitCount.toFixed(1),
          hadirLate: lateCount,
          statusHadir: statusHadirStr,
          updatedAt: new Date(),
        },
      });
    }

    const sepWorkDates = [
      '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04',
      '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11',
      '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18',
    ];

    const importSepId = uuidv7();
    await db.insert(schema.attendanceImports).values({
      id: importSepId,
      originalFilename: 'LOG_FINGERPRINT_SEPTEMBER_2026_WEEK1-3.xlsx',
      filePath: '/uploads/attendance/2026/09/fingerprint_sep2026.xlsx',
      periodYear: 2026,
      periodMonth: 9,
      status: 'completed',
      totalRows: 60,
      processedRows: 60,
      importedBy: adminHrdUserId || superadminUserId,
    });

    for (const empInfo of activeEmpList) {
      const empId = employeeMap.get(empInfo.nip);
      if (!empId) continue;

      let hadirCount = 0.0;
      let cutiCount = 0.0;
      let sakitCount = 0.0;
      let lateCount = 0;

      for (let idx = 0; idx < sepWorkDates.length; idx++) {
        const dateStr = sepWorkDates[idx];
        let type = 'hadir';
        let checkin = '07:55:00';
        let checkout = '17:05:00';
        let checkinLoc = 'Gedung Utama';
        let checkoutLoc = 'Gedung Utama';
        let duration = '8.00';
        let status = 'approved';

        if (empInfo.nip === '199611282020082004' && idx === 4) {
          checkin = '08:25:00';
          checkout = '17:30:00';
          lateCount++;
          hadirCount += 0.5;
        } else if (empInfo.nip === '199407102018011003' && idx === 7) {
          type = 'cuti';
          checkin = null;
          checkout = null;
          duration = '0.00';
          cutiCount += 1.0;
        } else if (empInfo.nip === '199004222013052002' && idx === 10) {
          type = 'sakit';
          checkin = null;
          checkout = null;
          duration = '0.00';
          sakitCount += 1.0;
        } else {
          hadirCount += 1.0;
        }

        await db.insert(schema.attendances).values({
          id: uuidv7(),
          employeeId: empId,
          attendanceImportId: importSepId,
          attendanceDate: dateStr,
          checkinAt: checkin,
          checkoutAt: checkout,
          checkinLocation: checkinLoc,
          checkoutLocation: checkoutLoc,
          attendanceType: type,
          durationHours: duration,
          status: status,
          verificationStatus: 'valid',
          verifiedByRole: 'Admin HRD',
          remarks: type === 'cuti' ? 'Cuti tahunan disetujui' : (type === 'sakit' ? 'Surat dokter terlampir' : 'Hadir tepat waktu'),
        }).onDuplicateKeyUpdate({
          set: { attendanceType: type, checkinAt: checkin, checkoutAt: checkout, updatedAt: new Date() },
        });
      }

      await db.insert(schema.attendanceSummaries).values({
        id: uuidv7(),
        employeeId: empId,
        periodYear: 2026,
        periodMonth: 9,
        hadir: hadirCount.toFixed(1),
        cuti: cutiCount.toFixed(1),
        izin: '0.0',
        sakit: sakitCount.toFixed(1),
        hadirLate: lateCount,
        unpaidLeave: '0.0',
        hadirUnpaidLeave: '0.0',
        statusHadir: hadirCount >= 19.0 ? 'Terpenuhi' : 'Tidak terpenuhi',
        calculatedAt: new Date(),
      }).onDuplicateKeyUpdate({
        set: {
          hadir: hadirCount.toFixed(1),
          cuti: cutiCount.toFixed(1),
          sakit: sakitCount.toFixed(1),
          hadirLate: lateCount,
          statusHadir: hadirCount >= 19.0 ? 'Terpenuhi' : 'Tidak terpenuhi',
          updatedAt: new Date(),
        },
      });
    }
    console.log('   ✅ Daily Attendances & Monthly Attendance Summaries seeded.');

    console.log('📦 10. Seeding Monthly Transport Allowance Calculation Batch...');
    const periodId = uuidv7();
    const baseFareNominal = 2500;

    const allowanceRecipients = [
      { nip: '198801152010121001', rawKm: 7.50, roundedKm: 8, days: 14 },
      { nip: '199004222013052002', rawKm: 4.20, roundedKm: 4, days: 13 },
      { nip: '199407102018011003', rawKm: 11.80, roundedKm: 12, days: 13 },
      { nip: '199611282020082004', rawKm: 18.40, roundedKm: 18, days: 14 },
    ];

    let grandTotalAmount = 0;
    const detailInserts = [];

    for (const r of allowanceRecipients) {
      const empId = employeeMap.get(r.nip);
      if (!empId) continue;

      const employeeTotal = r.roundedKm * baseFareNominal * r.days;
      grandTotalAmount += employeeTotal;

      detailInserts.push({
        id: uuidv7(),
        transportAllowancePeriodId: periodId,
        employeeId: empId,
        baseFare: `${baseFareNominal}.00`,
        originalKm: `${r.rawKm.toFixed(2)}`,
        roundedKm: r.roundedKm,
        attendanceDays: r.days,
        nominal: `${employeeTotal}.00`,
        eligibilityStatus: 'eligible',
        calculationNote: `Perhitungan otomatis: ${r.roundedKm} km x Rp ${baseFareNominal.toLocaleString('id-ID')} x ${r.days} hari hadir`,
      });
    }

    await db.insert(schema.transportAllowancePeriods).values({
      id: periodId,
      periodYear: 2026,
      periodMonth: 9,
      totalRecipients: allowanceRecipients.length,
      totalAmount: `${grandTotalAmount}.00`,
      status: 'calculated',
      calculatedBy: adminHrdUserId,
      calculatedAt: new Date(),
    }).onDuplicateKeyUpdate({
      set: {
        totalRecipients: allowanceRecipients.length,
        totalAmount: `${grandTotalAmount}.00`,
        status: 'calculated',
        calculatedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const existingPeriod = await db.query.transportAllowancePeriods?.findFirst?.({
      where: (tbl, { and: andOp, eq: eqOp }) => andOp(eqOp(tbl.periodYear, 2026), eqOp(tbl.periodMonth, 9)),
    });
    const resolvedPeriodId = existingPeriod ? existingPeriod.id : periodId;

    for (const det of detailInserts) {
      det.transportAllowancePeriodId = resolvedPeriodId;
      await db.insert(schema.transportAllowanceDetails).values(det).onDuplicateKeyUpdate({
        set: {
          baseFare: det.baseFare,
          originalKm: det.originalKm,
          roundedKm: det.roundedKm,
          attendanceDays: det.attendanceDays,
          nominal: det.nominal,
          eligibilityStatus: det.eligibilityStatus,
          calculationNote: det.calculationNote,
          updatedAt: new Date(),
        },
      });
    }
    console.log(`   ✅ Transport Allowance Period seeded (Total: Rp ${grandTotalAmount.toLocaleString('id-ID')}).`);

    console.log('📦 11. Seeding Audit Activity Logs & Active Session...');
    const auditLogsData = [
      {
        userId: superadminUserId,
        moduleCode: 'AUTH',
        action: 'login',
        description: 'User superadmin berhasil login ke sistem web admin melalui 2FA OTP.',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36',
        url: '/api/auth/verify-otp',
        method: 'POST',
      },
      {
        userId: adminHrdUserId,
        moduleCode: 'ATTENDANCES',
        action: 'import',
        description: 'Admin HRD mengimpor batch file presensi: LOG_FINGERPRINT_SEPTEMBER_2026_WEEK1-3.xlsx',
        ipAddress: '192.168.1.104',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/130.0',
        url: '/api/attendance/import',
        method: 'POST',
      },
      {
        userId: adminHrdUserId,
        moduleCode: 'TRANSPORT_ALLOWANCES',
        action: 'create',
        description: 'Kalkulasi batch tunjangan transport periode September 2026 dijalankan untuk 4 pegawai.',
        ipAddress: '192.168.1.104',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/130.0',
        url: '/api/transport/calculate',
        method: 'POST',
      },
      {
        userId: superadminUserId,
        moduleCode: 'ROLES',
        action: 'read',
        description: 'Superadmin membuka halaman matriks hak akses peran.',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36',
        url: '/api/roles',
        method: 'GET',
      },
    ];

    for (const log of auditLogsData) {
      await db.insert(schema.activityLogs).values({
        id: uuidv7(),
        ...log,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 3600 * 1000 * 12)),
      });
    }

    if (superadminUserId) {
      await db.insert(schema.userSessions).values({
        id: uuidv7(),
        userId: superadminUserId,
        sessionToken: crypto.randomBytes(32).toString('hex'),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36',
        isRememberMe: true,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 86400 * 1000),
      });

      await db.insert(schema.loginOtps).values({
        id: uuidv7(),
        userId: superadminUserId,
        email: 'bramantyo.it@perusahaan.co.id',
        otpCode: '8492',
        purpose: 'LOGIN',
        channel: 'email',
        sentTo: 'bramantyo.it@perusahaan.co.id',
        expiresAt: new Date(Date.now() - 1000 * 60),
        isUsed: true,
        attempts: 1,
      });
    }
    console.log('   ✅ Audit Logs & Session seeded.');

    console.log('\n🎉 ========================================================');
    console.log('✨ SELURUH SEEDING DATABASE REAL-WORLD CASE SELESAI SUKSES! ✨');
    console.log('========================================================');
    console.log('Credentials Default Pengujian:');
    console.log('1. Superadmin : username: "superadmin"   | password: "Password123!"');
    console.log('2. Manager HRD: username: "manager.hrd"  | password: "Password123!"');
    console.log('3. Admin HRD  : username: "admin.hrd"    | password: "Password123!"');
    console.log('========================================================\n');
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat proses seeding:', error);
    process.exitCode = 1;
  } finally {
    await poolConnection.end();
  }
}

runSeed();