import { Controller, Get, HttpStatus, Logger } from '@nestjs/common';

@Controller('api')
export class ApiController {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  // eslint-disable-next-line class-methods-use-this
  @Get('health')
  health() {
    return {
      status: HttpStatus.OK,
    };
  }
}
