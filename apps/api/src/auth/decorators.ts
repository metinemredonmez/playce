import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const IS_PUBLIC = 'playce:public';
export const MIN_ROLE = 'playce:min-role';

/** Girişsiz erişilebilir. Geçerli token gelirse kullanıcı yine de tanınır (kişiselleştirme için). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** En az bu rol gerekir (USER < EDITOR < MODERATOR < ADMIN < SUPERADMIN). */
export const Roles = (min: Role) => SetMetadata(MIN_ROLE, min);

export type AuthUser = {
  id: string;
  role: Role;
  /** X-Admin-Key ile gelen geçiş dönemi isteklerinde null */
  sessionId: string | null;
};

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user as AuthUser | undefined,
);

const RANK: Record<Role, number> = { USER: 0, EDITOR: 1, MODERATOR: 2, ADMIN: 3, SUPERADMIN: 4 };

export function hasRole(role: Role, min: Role) {
  return RANK[role] >= RANK[min];
}
