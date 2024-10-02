import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import ShortUniqueId from 'short-unique-id';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: Logger;

  private readonly uid: ShortUniqueId;

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {
    this.logger = new Logger(this.constructor.name);
    this.uid = new ShortUniqueId({ length: 20 });
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const errorReference = this.uid.rnd();
    if (exception instanceof InternalServerErrorException || !(exception instanceof HttpException)) {
      // @ts-ignore
      this.logger.error(`ErrorReference [${errorReference}] : ${exception.stack}`);
    } else {
      this.logger.error(`ErrorReference [${errorReference}] : ${exception}`);
    }

    const httpStatus = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody =
      exception instanceof HttpException
        ? this.extractErrorResponse(exception.getResponse())
        : {
            message: 'Internal server error',
          };

    const extendedBody = {
      statusCode: httpStatus,
      errorReference,
      ...responseBody,
    };

    this.logger.debug(JSON.stringify(extendedBody));

    httpAdapter.reply(ctx.getResponse(), extendedBody, httpStatus);
  }

  // eslint-disable-next-line class-methods-use-this
  extractErrorResponse(response: object | String): object {
    if (typeof response === 'string') {
      return {
        message: response,
      };
    }
    return response;
  }
}
