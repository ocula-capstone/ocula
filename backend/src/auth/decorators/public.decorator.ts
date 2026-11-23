import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route that works without logging in, e.g. login or the health check. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
