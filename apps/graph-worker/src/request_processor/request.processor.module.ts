import { Module } from '@nestjs/common';
import { RequestProcessorService } from './request.processor.service';
import { GraphStateManager } from '#graph-lib/services/graph-state-manager';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { EncryptionService } from '#graph-lib/services/encryption.service';

@Module({
  imports: [BlockchainModule],
  providers: [RequestProcessorService, GraphStateManager, EncryptionService],
  exports: [RequestProcessorService],
})
export class RequestProcessorModule {}
