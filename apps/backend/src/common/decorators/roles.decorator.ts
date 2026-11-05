import { SetMetadata } from '@nestjs/common';
import { RolEmpleado } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolEmpleado[]) => SetMetadata(ROLES_KEY, roles);
