import { computed } from 'vue';
import { useAuth } from './useAuth.js';

export const usePermission = () => {
  const { user, isAuthenticated } = useAuth();

  const isSuperadmin = computed(() => {
    const role = (user.value?.roleName || '').toLowerCase();
    return role.includes('superadmin');
  });

  const getModulePermission = (moduleCode) => {
    if (!moduleCode) return null;
    return user.value?.permissions?.[moduleCode] || null;
  };

  const canAccess = (moduleCode) => {
    if (!isAuthenticated.value || !user.value) return false;

    const perm = getModulePermission(moduleCode);
    if (perm !== null && perm !== undefined) {
      return Boolean(perm.canAccess);
    }
    return isSuperadmin.value;
  };

  const checkAction = (moduleCode, actionType) => {
    if (!isAuthenticated.value || !user.value) return false;

    const perm = getModulePermission(moduleCode);
    if (!perm || !perm.canAccess) return false;

    switch (actionType) {
      case 'create':
        return Boolean(perm.canCreate);
      case 'read':
        return perm.readScope === 'all' || perm.readScope === 'own';
      case 'readAll':
        return perm.readScope === 'all';
      case 'readOwn':
        return perm.readScope === 'own';
      case 'update':
        return perm.updateScope === 'all' || perm.updateScope === 'own';
      case 'updateAll':
        return perm.updateScope === 'all';
      case 'updateOwn':
        return perm.updateScope === 'own';
      case 'delete':
        return perm.deleteScope === 'all' || perm.deleteScope === 'own';
      case 'deleteAll':
        return perm.deleteScope === 'all';
      case 'deleteOwn':
        return perm.deleteScope === 'own';
      default:
        return false;
    }
  };

  const canCreate = (moduleCode) => checkAction(moduleCode, 'create');
  const canRead = (moduleCode) => checkAction(moduleCode, 'read');
  const canUpdate = (moduleCode) => checkAction(moduleCode, 'update');
  const canDelete = (moduleCode) => checkAction(moduleCode, 'delete');

  return {
    isSuperadmin,
    canAccess,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    getModulePermission,
  };
};
