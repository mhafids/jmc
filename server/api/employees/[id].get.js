import { eq, or, isNull, and, sql } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireEmployeeAccess } from '~~/server/utils/employee-auth-guard.js';
import { checkRateLimit } from '~~/server/utils/rate-limiter.js';

export default defineEventHandler(async (event) => {
  await requireEmployeeAccess(event, 'read');

  const clientIp = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';
  checkRateLimit(`emp_detail:${clientIp}`, 120, 60000);

  const identifier = getRouterParam(event, 'id');
  if (!identifier) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Parameter ID atau NIP pegawai diperlukan.',
    });
  }

  const employeeData = await db
    .select({
      id: schema.employees.id,
      nip: schema.employees.nip,
      name: schema.employees.name,
      email: schema.employees.email,
      phone: schema.employees.phone,
      photoPath: schema.employees.photoPath,
      birthPlace: schema.employees.birthPlace,
      birthDate: schema.employees.birthDate,
      maritalStatus: schema.employees.maritalStatus,
      childrenCount: schema.employees.childrenCount,
      joinedAt: schema.employees.joinedAt,
      employmentType: schema.employees.employmentType,
      gender: schema.employees.gender,
      fullAddress: schema.employees.fullAddress,
      distanceKm: schema.employees.distanceKm,
      status: schema.employees.status,
      districtId: schema.employees.districtId,
      districtName: schema.districts.name,
      regencyId: schema.regencies.id,
      regencyName: schema.regencies.name,
      provinceId: schema.provinces.id,
      provinceName: schema.provinces.name,
      positionId: schema.employees.positionId,
      positionName: schema.positions.name,
      departmentId: schema.employees.departmentId,
      departmentName: schema.departments.name,
      age: sql`TIMESTAMPDIFF(YEAR, ${schema.employees.birthDate}, CURDATE())`,
      yearsOfService: sql`TIMESTAMPDIFF(YEAR, ${schema.employees.joinedAt}, CURDATE())`,
      monthsOfService: sql`TIMESTAMPDIFF(MONTH, ${schema.employees.joinedAt}, CURDATE()) % 12`,
    })
    .from(schema.employees)
    .leftJoin(schema.positions, eq(schema.employees.positionId, schema.positions.id))
    .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.id))
    .leftJoin(schema.districts, eq(schema.employees.districtId, schema.districts.id))
    .leftJoin(schema.regencies, eq(schema.districts.regencyId, schema.regencies.id))
    .leftJoin(schema.provinces, eq(schema.regencies.provinceId, schema.provinces.id))
    .where(
      and(
        isNull(schema.employees.deletedAt),
        or(eq(schema.employees.id, identifier), eq(schema.employees.nip, identifier))
      )
    );

  const emp = employeeData[0];
  if (!emp) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found: Data pegawai tidak ditemukan.',
    });
  }

  const educations = await db
    .select({
      id: schema.employeeEducations.id,
      educationLevel: schema.employeeEducations.educationLevel,
      schoolName: schema.employeeEducations.schoolName,
      graduationYear: schema.employeeEducations.graduationYear,
      sortOrder: schema.employeeEducations.sortOrder,
    })
    .from(schema.employeeEducations)
    .where(eq(schema.employeeEducations.employeeId, emp.id))
    .orderBy(schema.employeeEducations.sortOrder);

  return {
    success: true,
    data: {
      ...emp,
      educations,
    },
  };
});
