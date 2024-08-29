import { FilesUploadDto, UploadResponseDto } from '#content-publishing-lib/dtos';
import { DSNP_VALID_MIME_TYPES } from '#content-publishing-lib/dtos/validation.dto';
import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  ParseFilePipeBuilder,
  Put,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiService } from '../../api.service';

@Controller('v1/asset')
@ApiTags('v1/asset')
export class AssetControllerV1 {
  private readonly logger: Logger;

  constructor(private apiService: ApiService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Put('upload')
  @UseInterceptors(FilesInterceptor('files'))
  @HttpCode(202)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload asset files' })
  @ApiBody({
    description: 'Asset files',
    type: FilesUploadDto,
  })
  @ApiResponse({ status: '2XX', type: UploadResponseDto })
  async assetUpload(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: DSNP_VALID_MIME_TYPES,
        })
        // TODO: add a validator to check overall uploaded size
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    files: // eslint-disable-next-line no-undef
    Express.Multer.File[],
  ): Promise<UploadResponseDto> {
    return this.apiService.addAssets(files);
  }
}
