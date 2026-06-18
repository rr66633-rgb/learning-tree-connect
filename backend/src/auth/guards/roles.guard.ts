import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const tenantId = request.headers['x-tenant-id'] || request.query?.tenantId;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!tenantId) {
      // Check if user is super admin
      const tenantUser = await this.prisma.tenantUser.findFirst({
        where: { userId, role: 'SUPER_ADMIN' },
      });
      if (tenantUser) return true;
      throw new ForbiddenException('Tenant ID is required');
    }

    const tenantUser = await this.prisma.tenantUser.findFirst({
      where: {
        userId,
        tenantId,
        role: { in: requiredRoles as any },
      },
    });

    if (!tenantUser) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    // Attach tenant context to request
    request.tenantId = tenantId;
    request.userRole = tenantUser.role;

    return true;
  }
}
