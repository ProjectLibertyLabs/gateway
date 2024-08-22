import { CustomTransportStrategy } from '@nestjs/microservices';

export class KeepAliveStrategy implements CustomTransportStrategy {
  private closing = false;

  wait() {
    if (!this.closing) {
      setTimeout(() => this.wait(), 1000);
    }
  }

  listen() {
    this.wait();
  }

  close() {
    this.closing = true;
  }
}
