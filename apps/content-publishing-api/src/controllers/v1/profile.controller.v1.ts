import { Body, Controller, HttpCode, Logger, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiService } from '../../api.service';
import {
  DsnpUserIdParam,
  ProfileDto,
  AnnouncementResponseDto,
  AssetIncludedRequestDto,
} from '#types/dtos/content-publishing';
import { AnnouncementTypeName } from '#types/enums';

@Controller('v1/profile')
@ApiTags('v1/profile')
export class ProfileControllerV1 {
  private readonly logger: Logger;

  constructor(private apiService: ApiService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Put(':userDsnpId')
  @ApiOperation({ summary: "Update a user's Profile" })
  @HttpCode(202)
  @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  async profile(
    @Param() userDsnpId: DsnpUserIdParam,
    @Body() profileDto: ProfileDto,
  ): Promise<AnnouncementResponseDto> {
    const metadata = await this.apiService.validateAssetsAndFetchMetadata(profileDto as AssetIncludedRequestDto);
    return this.apiService.enqueueRequest(AnnouncementTypeName.PROFILE, userDsnpId.userDsnpId, profileDto, metadata);
  }
}
