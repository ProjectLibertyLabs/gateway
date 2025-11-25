import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { ApiService } from '#content-publishing-api/api.service';
import { ContentControllerV1 } from '#content-publishing-api/controllers/v1/content.controller.v1';
import { ItemizedSignaturePayloadDto } from '#types/dtos/account';
import { AccountIdDto } from '#types/dtos/common';
import { AnnouncementResponseDto } from '#types/dtos/content-publishing';
import { HcpRequestTypeName } from '#types/enums';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller({ version: '1', path: 'hcp' })
@ApiTags('v1/hcp')
export class HcpControllerV1 {
  constructor(
    private readonly apiService: ApiService,
    private readonly blockchainService: BlockchainRpcQueryService,
    @InjectPinoLogger(ContentControllerV1.name) private readonly logger: PinoLogger,
  ) {}

  @Post(':accountId/addHcpPublicKey')
  @HttpCode(HttpStatus.ACCEPTED)
  async addHcpPublicKey(
    @Param() { accountId }: AccountIdDto,
    @Body() payload: ItemizedSignaturePayloadDto,
  ): Promise<AnnouncementResponseDto> {
    // there could be some other validation here, perhaps checking that
    // accountId exists.
    const api = await this.blockchainService.getApi();
    const res = await api.query.msa.publicKeyToMsaId(accountId);
    if (res.isNone) {
      throw new NotFoundException(`MSA ID for account ${accountId} not found`);
    }
    return this.apiService.enqueueHcpRequest(HcpRequestTypeName.ADD_HCP_PUBLIC_KEY, accountId, payload);
  }
}
