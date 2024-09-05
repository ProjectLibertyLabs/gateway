import { BadRequestException, Injectable, InternalServerErrorException, Logger, Query } from '@nestjs/common';
import { BlockchainService } from '#lib/blockchain/blockchain.service';
import { BlockchainConstants } from '#lib/blockchain/blockchain-constants';
import {
  AddNewGraphKeyPayloadRequest,
  ItemActionType,
  ItemizedSignaturePayloadDto
} from '#lib/types/dtos/graphs.request.dto';
import { Graph, EnvironmentInterface, EnvironmentType } from '@dsnp/graph-sdk';
import { ConfigService } from '#lib/config';
import { ItemizedStoragePageResponse } from '@frequency-chain/api-augment/interfaces';
import { u8aToHex, u8aWrapBytes } from '@polkadot/util';
import { HexString } from '@polkadot/util/types';

@Injectable()
export class GraphsService {
  private readonly logger: Logger;

  private readonly environment: EnvironmentInterface; // Environment details

  private readonly graphKeySchemaId: number;

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(this.constructor.name);
    const environmentType = this.configService.graphEnvironmentType;
    this.environment = { environmentType: EnvironmentType[environmentType] };
    const graphState = new Graph(this.environment);
    this.graphKeySchemaId = graphState.getGraphConfig(this.environment).graphPublicKeySchemaId;
    graphState.freeGraphState();
  }

  async getAddingNewKeyPayload(msaId: string, newKey: HexString): Promise<AddNewGraphKeyPayloadRequest> {
    try {
      const expiration = await this.getExpiration();
      const schemaId = this.getGraphKeySchemaId();
      const itemizedStorage = await this.getItemizedStorage(msaId, schemaId);
      if (
        itemizedStorage.items
          .toArray()
          .find((i) => i.payload.length > 0 && u8aToHex(i.payload).toLowerCase() === newKey.toLowerCase())
      ) {
        throw new BadRequestException('Added key already exists!');
      }
      const payload: ItemizedSignaturePayloadDto = {
        expiration,
        schemaId,
        targetHash: itemizedStorage.content_hash.toNumber(),
        actions: [
          {
            type: ItemActionType.ADD_ITEM,
            encodedPayload: newKey,
          },
        ],
      };

      const encodedPayload = u8aToHex(u8aWrapBytes(this.encodePayload(payload).toU8a()));
      return {
        payload,
        encodedPayload,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create add key payload.');
    }
  }

  private getGraphKeySchemaId(): number {
    return this.graphKeySchemaId;
  }

  private async getItemizedStorage(msaId: string, schemaId: number): Promise<ItemizedStoragePageResponse> {
    return this.blockchainService.getItemizedStorage(msaId, schemaId);
  }

  private async getExpiration(): Promise<number> {
    const lastFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
    // standard expiration in SIWF is 10 minutes
    return lastFinalizedBlockNumber + 600 / BlockchainConstants.SECONDS_PER_BLOCK;
  }

  private encodePayload(payload: ItemizedSignaturePayloadDto) {
    return this.blockchainService.createItemizedSignaturePayloadV2Type(payload);
  }
}
