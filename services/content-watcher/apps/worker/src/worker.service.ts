import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkerService {
  // eslint-disable-next-line class-methods-use-this
  getHello(): string {
    return 'Hello World from Worker!';
  }
}
