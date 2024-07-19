import { Body, Controller, HttpCode, Logger, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiService } from './api.service';
import { AnnouncementResponseDto, AnnouncementTypeDto, AssetIncludedRequestDto, DsnpUserIdParam, ProfileDto } from '../../../libs/common/src';

@Controller('v1/profile')
@ApiTags('v1/profile')
export class ProfileController {
  private readonly logger: Logger;

  constructor(private apiService: ApiService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Put(':userDsnpId')
  @ApiOperation({ summary: "Update a user's Profile" })
  @HttpCode(202)
  async profile(@Param() userDsnpId: DsnpUserIdParam, @Body() profileDto: ProfileDto): Promise<AnnouncementResponseDto> {
    const metadata = await this.apiService.validateAssetsAndFetchMetadata(profileDto as AssetIncludedRequestDto);
    return this.apiService.enqueueRequest(AnnouncementTypeDto.PROFILE, userDsnpId.userDsnpId, profileDto, metadata);
  }
}
