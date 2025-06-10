import { Body, Controller, HttpCode, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiService } from '../../api.service';
import { ProfileDto, AnnouncementResponseDto, AssetIncludedRequestDto } from '#types/dtos/content-publishing';
import { AnnouncementTypeName } from '#types/enums';
import { MsaIdDto } from '#types/dtos/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller({ version: '1', path: 'profile' })
@ApiTags('v1/profile')
export class ProfileControllerV1 {
  constructor(
    private apiService: ApiService,
    @InjectPinoLogger(ProfileControllerV1.name) private readonly logger: PinoLogger,
  ) {}

  @Put(':msaId')
  @ApiOperation({ summary: "Update a user's Profile" })
  @HttpCode(202)
  async profile(@Param() { msaId }: MsaIdDto, @Body() profileDto: ProfileDto): Promise<AnnouncementResponseDto> {
    const metadata = await this.apiService.validateAssetsAndFetchMetadata(profileDto as AssetIncludedRequestDto);
    return this.apiService.enqueueRequest(AnnouncementTypeName.PROFILE, msaId, profileDto, metadata);
  }
}
