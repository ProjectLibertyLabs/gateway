import { FilesUploadDto, UploadResponseDto } from '#types/dtos/content-publishing';
import { DSNP_VALID_MIME_TYPES_EXTENDED as DSNP_VALID_MIME_TYPES } from '#validation';
import {
  Controller,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
  Put,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiService } from '../../api.service';
import { SkipInterceptors } from '#utils/decorators/skip-interceptors.decorator';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller({ version: '1', path: 'asset' })
@ApiTags('v1/asset')
export class AssetControllerV1 {
  constructor(
    private apiService: ApiService,
    @InjectPinoLogger(AssetControllerV1.name) private readonly logger: PinoLogger,
  ) {}

  @Put('upload')
  @SkipInterceptors()
  @UseInterceptors(FilesInterceptor('files'))
  @HttpCode(202)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload asset files [deprecated; use `POST /v2/asset/upload` instead]', deprecated: true })
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
          // @nestjs/common@10.4.16 added the 'file-type' package, which is imported dynamically as an ESM module.
          // This import breaks under Jest, so we skip it in test mode
          skipMagicNumbersValidation: process.env.NODE_ENV === 'test',
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
