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

  // Root/Master/Admin vede tutto di default
  if (user.role === 'MASTER' || user.role === 'ADMIN' || user.isRoot) {
    const explicitPerm = user.permissions?.apps?.[appId];
    if (explicitPerm && explicitPerm.view === false) return false;
    return true;
  }

  // Verifica permessi store se non è Master/Admin
  if (user.permissions?.allowedStores && !user.permissions.allowedStores.includes(store)) {
    return false;
  }

  // Permessi limitati (Operatori, Visitatori)
  const appPerms = user.permissions?.apps?.[appId];

  // Nuove app B2B: se l'utente ha già accesso a b2b_users e il permesso non è ancora stato salvato nel JSON, eredita la visibilità
  if (appPerms === undefined && ['ai_sdr_b2b', 'b2b_discounts', 'b2b_catalog_builder'].includes(appId)) {
    return !!user.permissions?.apps?.['b2b_users']?.view;
  }

  return !!appPerms?.view;
};

export const canWriteApp = (appId: string): boolean => {
  const user = getUser();
  if (!user) return false;

  if (user.role === 'MASTER' || user.role === 'ADMIN' || user.isRoot) {
    const explicitPerm = user.permissions?.apps?.[appId];
    if (explicitPerm && explicitPerm.write === false) return false;
    return true;
  }

  const appPerms = user.permissions?.apps?.[appId];
  if (appPerms === undefined && ['ai_sdr_b2b', 'b2b_discounts', 'b2b_catalog_builder'].includes(appId)) {
    return user.role !== 'VIEWER' && !!user.permissions?.apps?.['b2b_users']?.write;
  }
  return !!appPerms?.write;
};
