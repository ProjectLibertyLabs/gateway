import { SetMetadata } from '@nestjs/common';

/**
 * Defines a decorator that can be applied to a controller endpoint that will cause it
 * to skip other controller- or global-level interceptors.
 *
 * NOTE: Only works in conjunction with custom interceptors that have been written specifically
 * to honor the SKIP_INTERCEPTOR metadata.
 */
export const SKIP_INTERCEPTOR_KEY = 'SKIP_INTERCEPTOR';
export const SkipInterceptors = () => SetMetadata(SKIP_INTERCEPTOR_KEY, true);
