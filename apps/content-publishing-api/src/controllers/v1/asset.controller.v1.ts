import { FilesUploadDto, UploadResponseDto } from '#types/dtos/content-publishing';
import { DSNP_VALID_MIME_TYPES } from '#types/dtos/content-publishing/validation';
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
import { SkipInterceptors } from '#utils/decorators/skip-interceptors.decorator';

@Controller({ version: '1', path: 'asset' })
@ApiTags('v1/asset')
export class AssetControllerV1 {
  private readonly logger: Logger;

  constructor(private apiService: ApiService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Put('upload')
  @SkipInterceptors()
  @UseInterceptors(FilesInterceptor('files'))
  @HttpCode(202)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload asset files [deprecated; use `POST /v2/asset/upload` instead', deprecated: true })
  @ApiResponse({ status: 400, description: 'Bad request, eg too many files or file too large' })
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
