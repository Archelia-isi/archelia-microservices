export interface UserPermissions {
  allowedStores?: string[];
  apps?: Record<string, { view: boolean; write: boolean }>;
}

export interface UserState {
  id: string;
  username: string;
  role: string;
  displayName: string;
  isRoot?: boolean;
  permissions?: UserPermissions;
}

export const getUser = (): UserState | null => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr) as UserState;
  } catch (e) {
    return null;
  }
};

export const canViewApp = (appId: string, store: string = 'RETAIL'): boolean => {
  const user = getUser();
  if (!user) return false;

  // Root/Master vede tutto
  if (user.role === 'MASTER' || user.isRoot) {
    return true;
  }

  // Verifica permessi store se non è Master
  if (user.permissions?.allowedStores && !user.permissions.allowedStores.includes(store)) {
    return false;
  }

  // Se i permessi app non sono specificati e l'utente è un ADMIN, può vedere tutto
  if (user.role === 'ADMIN' && (!user.permissions?.apps || Object.keys(user.permissions.apps).length === 0)) {
    return true;
  }

  // Permessi limitati (Operatori, Visitatori, o Admin limitati)
  const appPerms = user.permissions?.apps?.[appId];
  
  // Eccezione: os-settings potrebbe essere sempre visibile per fargli cambiare store? 
  // O magari nascondiamo os-settings agli operatori che non ne hanno accesso.
  if (appId === 'os-settings' && user.role !== 'VIEWER') {
     // magari diamo accesso base alle impostazioni OS per tutti tranne i viewer?
     // o seguiamo rigorosamente il json?
     // Seguiamo rigorosamente il json.
  }

  return !!appPerms?.view;
};

export const canWriteApp = (appId: string): boolean => {
  const user = getUser();
  if (!user) return false;

  if (user.role === 'MASTER' || user.isRoot) {
    return true;
  }

  if (user.role === 'ADMIN' && (!user.permissions?.apps || Object.keys(user.permissions.apps).length === 0)) {
    return true;
  }

  const appPerms = user.permissions?.apps?.[appId];
  return !!appPerms?.write;
};
