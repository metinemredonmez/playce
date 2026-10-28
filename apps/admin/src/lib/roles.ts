export type Role = 'USER' | 'EDITOR' | 'MODERATOR' | 'ADMIN' | 'SUPERADMIN';

const RANK: Record<Role, number> = { USER: 0, EDITOR: 1, MODERATOR: 2, ADMIN: 3, SUPERADMIN: 4 };

/** API'deki hasRole ile aynı sıra: USER < EDITOR < MODERATOR < ADMIN < SUPERADMIN */
export function hasRole(role: Role, min: Role) {
  return RANK[role] >= RANK[min];
}

export const ROLE_LABEL: Record<Role, string> = {
  USER: 'Kullanıcı',
  EDITOR: 'Editör',
  MODERATOR: 'Moderatör',
  ADMIN: 'Admin',
  SUPERADMIN: 'Süper admin',
};
