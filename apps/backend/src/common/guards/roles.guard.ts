import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolEmpleado } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolEmpleado[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.rol) {
      throw new ForbiddenException({
        codigo: 'FORBIDDEN',
        mensaje: 'No tienes permisos para acceder a este recurso.',
      });
    }

    const hasRole = requiredRoles.includes(user.rol);
    if (!hasRole) {
      throw new ForbiddenException({
        codigo: 'ROL_INSUFICIENTE',
        mensaje: `Acceso restringido. Se requiere uno de los roles: [${requiredRoles.join(', ')}]. Tu rol actual es: ${user.rol}.`,
      });
    }

    return true;
  }
}
