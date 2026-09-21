export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/api/')) return;

  const loginRoutes = ['/login', '/auth/login'];
  const isLoginPage = loginRoutes.includes(to.path);

  const tokenCookie = useCookie('auth_token');
  const { user, fetchUser } = useAuth();

  if (!tokenCookie.value) {
    user.value = null;

    if (!isLoginPage) {
      return navigateTo('/login?reason=unauthenticated');
    }
    return;
  }

  if (!user.value) {
    const fetched = await fetchUser();

    if (!fetched) {
      tokenCookie.value = null;
      if (!isLoginPage) {
        return navigateTo('/login?reason=unauthenticated');
      }
      return;
    }
  }

  if (user.value && isLoginPage) {
    return navigateTo('/');
  }

  const isSuperadmin = (user.value?.roleName || '').toLowerCase().startsWith('superadmin');

  const routeModuleMapping = [
    { prefix: '/user/role', moduleCode: 'ROLES' },
    { prefix: '/user/manage', moduleCode: 'USERS' },
    { prefix: '/pegawai', moduleCode: 'EMPLOYEES' },
    { prefix: '/presensi', moduleCode: 'ATTENDANCES' },
    { prefix: '/attendance', moduleCode: 'ATTENDANCES' },
    { prefix: '/tunjangan/setting', moduleCode: 'TRANSPORT_SETTINGS' },
    { prefix: '/tunjangan/transport', moduleCode: 'TRANSPORT_ALLOWANCES' },
    { prefix: '/log', moduleCode: 'ACTIVITY_LOGS' },
  ];

  for (const item of routeModuleMapping) {
    if (to.path === item.prefix || to.path.startsWith(item.prefix + '/')) {
      const perm = user.value?.permissions?.[item.moduleCode];
      const isAllowedByPath = user.value?.allowedPaths?.some?.((p) => p === item.prefix || to.path.startsWith(p));
      const hasAccess = Boolean(perm?.canAccess || isAllowedByPath);

      if (!hasAccess) {
        return navigateTo(`/?error=forbidden&module=${item.moduleCode.toLowerCase()}`);
      }
      break;
    }
  }
});

