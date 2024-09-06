import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GraphReconnectionService } from './graph.reconnection.processor.service';

@Module({
  imports: [EventEmitterModule],
  providers: [GraphReconnectionService],
  exports: [GraphReconnectionService],
})
export class GraphReconnectionModule {}
