import { HcpService } from '#account-api/services/hcp.service';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { ApiService } from '#content-publishing-api/api.service';
import { HcpPublishAllRequestDto } from '#types/dtos/account';
import { AccountIdDto } from '#types/dtos/common';
import { AnnouncementResponseDto } from '#types/dtos/content-publishing';
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
    private readonly hcpService: HcpService,
    @InjectPinoLogger(HcpControllerV1.name) private readonly logger: PinoLogger,
  ) {}

  ///
  ///
  @Post(':accountId/publishAll')
  @HttpCode(HttpStatus.ACCEPTED)
  async publishAll(
    @Param() { accountId }: AccountIdDto,
    @Body() payload: HcpPublishAllRequestDto,
  ): Promise<AnnouncementResponseDto> {
    // check that the accountId has an MSA on chain as a fast, early failure.
    // it's not necessary to deserialize the payload to verify the id matches.
    this.hcpService.verifyAccountHasMsa(accountId.toString());
    // FA will check access control as soon as symmetric key is requested,
    // so ensure that there is no delay in a payWithCapacityBatchAll call.
  }
}
