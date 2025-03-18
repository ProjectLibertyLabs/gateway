import { SKIP_INTERCEPTOR_KEY } from '#utils/decorators/skip-interceptors.decorator';
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, RequestTimeoutException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  timeoutMs: number;

  /**
   *
   * @param timeoutMs
   * @param reflector (optional; must be supplied in order for this interceptor to honor the @SkipInterceptor() decorator)
   */
  constructor(
    timeoutMs: number,
    private readonly reflector?: Reflector,
  ) {
    this.timeoutMs = timeoutMs;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if `@SkipInterceptor()` is applied
    if (this.reflector) {
      const isSkipped = this.reflector.get<boolean>(SKIP_INTERCEPTOR_KEY, context.getHandler());

      if (isSkipped) {
        console.log('🚀 Skipping global interceptor for this route');
        return next.handle(); // Skip global interceptor logic
      }
    }
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException());
        }
        return throwError(() => err);
      }),
    );
  }
}
