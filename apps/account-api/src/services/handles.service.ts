import { Injectable, NotFoundException } from '@nestjs/common';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { HandleResponseDto } from '#types/dtos/account/accounts.response.dto';
import * as BlockchainConstants from '#types/constants/blockchain-constants';
import { HandleRequestDto } from '#types/dtos/account';
import { u8aToHex, u8aWrapBytes } from '@polkadot/util';
import { getKeypairTypeFromRequestAddress, verifySignature } from '#utils/common/signature.util';
import { pino, Logger } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';
import {
  createClaimHandlePayload as createEthereumClaimHandlePayload,
  verifySignature as verifyEthereumSignature,
} from '@frequency-chain/ethereum-utils';
import { HexString } from '@polkadot/util/types';

@Injectable()
export class HandlesService {
  private readonly logger: Logger;

  constructor(private blockchainService: BlockchainRpcQueryService) {
    this.logger = pino(getBasicPinoOptions(HandlesService.name));
  }

  async getHandle(msaId: string): Promise<HandleResponseDto | null> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      return this.blockchainService.getHandleForMsa(msaId);
    }
    throw new NotFoundException(`Invalid msaId ${msaId}`);
  }

  async getExpiration(): Promise<number> {
    const lastFinalizedBlockNumber = await this.blockchainService.getLatestBlockNumber();
    // standard expiration in SIWF is 10 minutes
    return lastFinalizedBlockNumber + 600 / BlockchainConstants.SECONDS_PER_BLOCK;
  }

  encodePayload(payload: HandleRequestDto['payload']) {
    return this.blockchainService.createClaimHandPayloadType(payload.baseHandle, payload.expiration);
  }

  verifyHandleRequestSignature(request: HandleRequestDto): boolean {
    const keyType = getKeypairTypeFromRequestAddress(request.accountId);
    if (keyType === 'sr25519') {
      const encodedPayload = u8aToHex(u8aWrapBytes(this.encodePayload(request.payload).toU8a()));
      return verifySignature(encodedPayload, request.proof, request.accountId).isValid;
    }
    if (!(keyType === 'ethereum')) {
      this.logger.error(`Unsupported key type: ${keyType}`);
      return false;
    }
    const ethereumPayload = createEthereumClaimHandlePayload(request.payload.baseHandle, request.payload.expiration);
    return verifyEthereumSignature(
      request.accountId as HexString,
      request.proof,
      ethereumPayload,
      this.blockchainService.chainType,
    );
  }
}
