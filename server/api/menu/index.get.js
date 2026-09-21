import { eq, isNull, asc } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { verifyJwtToken } from '~~/server/utils/auth.js';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const token = getCookie(event, 'auth_token') || getRequestHeader(event, 'authorization')?.replace('Bearer ', '');

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthenticated',
    });
  }

  const payload = await verifyJwtToken(token, config.authSecret);
  if (!payload || !payload.userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Token invalid or expired',
    });
  }

  const user = await db.query.users?.findFirst?.({
    where: (tbl) => eq(tbl.id, payload.userId),
  });

  if (!user || !user.isActive) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Akun tidak aktif atau tidak ditemukan.',
    });
  }

  const allModules = await db
    .select({
      id: schema.modules.id,
      code: schema.modules.code,
      name: schema.modules.name,
      path: schema.modules.path,
      orderNo: schema.modules.orderNo,
    })
    .from(schema.modules)
    .where(isNull(schema.modules.deletedAt))
    .orderBy(asc(schema.modules.orderNo));

  const userPermissions = await db
    .select({
      moduleId: schema.rolePermissions.moduleId,
      canAccess: schema.rolePermissions.canAccess,
    })
    .from(schema.rolePermissions)
    .where(eq(schema.rolePermissions.roleId, user.roleId));

  const permMap = new Map();
  for (const p of userPermissions) {
    permMap.set(p.moduleId, Boolean(p.canAccess));
  }

  const allowedModules = allModules.filter((m) => {
    if (m.code === 'AUTH' || m.code === 'MY_PROFILE') return false;
    return Boolean(permMap.get(m.id));
  });

  const menu = [];

  const dashboardMod = allowedModules.find((m) => m.code === 'DASHBOARD');
  if (dashboardMod) {
    menu.push({
      code: dashboardMod.code,
      title: dashboardMod.name,
      to: dashboardMod.path || '/',
      icon: 'dashboard',
    });
  }

  const employeeMod = allowedModules.find((m) => m.code === 'EMPLOYEES');
  if (employeeMod) {
    menu.push({
      code: employeeMod.code,
      title: employeeMod.name,
      to: employeeMod.path || '/pegawai',
      icon: 'employee',
    });
  }

  const attendanceMod = allowedModules.find((m) => m.code === 'ATTENDANCES');
  if (attendanceMod) {
    menu.push({
      code: attendanceMod.code,
      title: attendanceMod.name,
      to: attendanceMod.path || '/presensi',
      icon: 'attendance',
    });
  }

  const transportSettingsMod = allowedModules.find((m) => m.code === 'TRANSPORT_SETTINGS');
  const transportAllowancesMod = allowedModules.find((m) => m.code === 'TRANSPORT_ALLOWANCES');
  const tunjanganChildren = [];

  if (transportSettingsMod) {
    tunjanganChildren.push({
      code: transportSettingsMod.code,
      title: transportSettingsMod.name,
      to: transportSettingsMod.path || '/tunjangan/setting',
    });
  }
  if (transportAllowancesMod) {
    tunjanganChildren.push({
      code: transportAllowancesMod.code,
      title: transportAllowancesMod.name,
      to: transportAllowancesMod.path || '/tunjangan/transport',
    });
  }

  if (tunjanganChildren.length > 0) {
    menu.push({
      code: 'GROUP_TUNJANGAN',
      title: 'Tunjangan',
      icon: 'allowance',
      children: tunjanganChildren,
    });
  }

  const rolesMod = allowedModules.find((m) => m.code === 'ROLES');
  const usersMod = allowedModules.find((m) => m.code === 'USERS');
  const userManageChildren = [];

  if (rolesMod) {
    userManageChildren.push({
      code: rolesMod.code,
      title: rolesMod.name,
      to: rolesMod.path || '/user/role',
    });
  }
  if (usersMod) {
    userManageChildren.push({
      code: usersMod.code,
      title: usersMod.name,
      to: usersMod.path || '/user/manage',
    });
  }

  if (userManageChildren.length > 0) {
    menu.push({
      code: 'GROUP_USER_MANAGEMENT',
      title: 'Manajemen User',
      icon: 'user_management',
      children: userManageChildren,
    });
  }

  const logMod = allowedModules.find((m) => m.code === 'ACTIVITY_LOGS');
  if (logMod) {
    menu.push({
      code: logMod.code,
      title: logMod.name,
      to: logMod.path || '/log',
      icon: 'log',
    });
  }

  return {
    success: true,
    data: menu,
  };
});
