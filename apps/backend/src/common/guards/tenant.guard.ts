import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../modules/users/user.entity';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super-Admins dürfen alles
    if (user.role === UserRole.SUPER_ADMIN) return true;

    const paramTenantId = request.params?.tenantId;
    if (paramTenantId && paramTenantId !== user.tenantId) {
      throw new ForbiddenException('Zugriff auf fremden Mandanten nicht erlaubt');
    }
    return true;
  }
}
