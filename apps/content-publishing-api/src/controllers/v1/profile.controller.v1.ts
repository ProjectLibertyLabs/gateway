import { Body, Controller, HttpCode, Logger, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiService } from '../../api.service';
import { ProfileDto, AnnouncementResponseDto, AssetIncludedRequestDto } from '#types/dtos/content-publishing';
import { AnnouncementTypeName } from '#types/enums';
import { MsaIdDto } from '#types/dtos/common';

@Controller('v1/profile')
@ApiTags('v1/profile')
export class ProfileControllerV1 {
  private readonly logger: Logger;

  constructor(private apiService: ApiService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Put(':msaId')
  @ApiOperation({ summary: "Update a user's Profile" })
  @HttpCode(202)
  // @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  async profile(@Param() { msaId }: MsaIdDto, @Body() profileDto: ProfileDto): Promise<AnnouncementResponseDto> {
    const metadata = await this.apiService.validateAssetsAndFetchMetadata(profileDto as AssetIncludedRequestDto);
    return this.apiService.enqueueRequest(AnnouncementTypeName.PROFILE, msaId, profileDto, metadata);
  }
}
