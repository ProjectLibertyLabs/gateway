import { BadRequestException, Injectable, InternalServerErrorException, Logger, Query } from '@nestjs/common';
import { Graph, EnvironmentInterface, EnvironmentType } from '@dsnp/graph-sdk';
import { u8aToHex, u8aWrapBytes } from '@polkadot/util';
import { HexString } from '@polkadot/util/types';
import { BlockchainService } from '#account-lib/blockchain/blockchain.service';
import { BlockchainConstants } from '#account-lib/blockchain/blockchain-constants';
import { ConfigService } from '#account-lib/config/config.service';
import {
  AddNewGraphKeyPayloadRequest,
  ItemActionType,
  ItemizedSignaturePayloadDto,
} from '#account-lib/types/dtos/graphs.request.dto';

@Injectable()
export class GraphsService {
  private readonly logger: Logger;

  private readonly graphKeySchemaId: number;

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(this.constructor.name);
    const environmentType = this.configService.graphEnvironmentType;
    const environment: EnvironmentInterface = { environmentType: EnvironmentType[environmentType] };
    const graphState = new Graph(environment);
    // there might be a better way to get this schema id but for now we are stuck to get it from graph-sdk
    this.graphKeySchemaId = graphState.getGraphConfig(environment).graphPublicKeySchemaId;
    graphState.freeGraphState();
  }

  async getAddingNewKeyPayload(msaId: string, newKey: HexString): Promise<AddNewGraphKeyPayloadRequest> {
    try {
      const expiration = await this.getExpiration();
      const schemaId = this.graphKeySchemaId;
      const itemizedStorage = await this.blockchainService.getItemizedStorage(msaId, schemaId);
      if (
        itemizedStorage.items
          .toArray()
          .find((i) => i.payload.length > 0 && u8aToHex(i.payload).toLowerCase() === newKey.toLowerCase())
      ) {
        throw new BadRequestException('Requested key already exists!');
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

      const encodedPayload = u8aToHex(
        u8aWrapBytes(this.blockchainService.createItemizedSignaturePayloadV2Type(payload).toU8a()),
      );
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

  private async getExpiration(): Promise<number> {
    const lastFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
    // standard expiration in SIWF is 10 minutes
    return lastFinalizedBlockNumber + 600 / BlockchainConstants.SECONDS_PER_BLOCK;
  }
}
