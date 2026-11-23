import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/client.js';

export const ROLES_KEY = 'roles';

/** Only these roles may call the route, e.g. `@Roles('admin', 'staff')`. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
