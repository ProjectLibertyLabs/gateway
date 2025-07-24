import { CustomTransportStrategy } from '@nestjs/microservices';

export class KeepAliveStrategy implements CustomTransportStrategy {
  private closing = false;

  wait() {
    if (!this.closing) {
      setTimeout(() => this.wait(), 1000);
    }
  }

  listen(callback: (error?: any) => void) {
    this.wait();
    // Notify NestJS that the microservice is ready
    callback();
  }

  close() {
    this.closing = true;
  }
}
