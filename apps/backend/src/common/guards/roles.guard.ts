import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/users/user.entity';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();

    // Super-Admin darf immer alles
    if (user.role === UserRole.SUPER_ADMIN) return true;

    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole) throw new ForbiddenException('Keine Berechtigung für diese Aktion');
    return true;
  }
}
