import { FilesUploadDto, UploadResponseDto } from '#types/dtos/content-publishing';
import { Controller, HttpCode, HttpStatus, Inject, Logger, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiService } from '../../api.service';
// eslint-disable-next-line import/no-extraneous-dependencies
import Busboy from 'busboy';
import { Request, Response } from 'express';
import apiConfig, { IContentPublishingApiConfig } from '../../api.config';
import { IFileResponse, IUploadResponse } from '#types/interfaces/content-publishing';
import { SkipInterceptors } from '#utils/decorators/skip-interceptors.decorator';

@Controller({ version: '2', path: 'asset' })
@ApiTags('v2/asset')
export class AssetControllerV2 {
  private readonly logger: Logger;

  constructor(
    private readonly apiService: ApiService,
    @Inject(apiConfig.KEY) private readonly config: IContentPublishingApiConfig,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  // eslint-disable-next-line class-methods-use-this
  @Post('timeout')
  @HttpCode(200)
  async doTimeout(): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 5000);
    });
  }

  @Post('upload')
  @SkipInterceptors()
  @HttpCode(202)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload asset files' })
  @ApiBody({
    description: 'Asset files',
    type: FilesUploadDto,
  })
  @ApiResponse({ status: '2XX', type: UploadResponseDto })
  async uploadFile(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<IUploadResponse> {
    const busboy = Busboy({ headers: req.headers });

    const fileProcessingPromises: Promise<IFileResponse>[] = [];
    let resolveRepsonse: (val: IUploadResponse) => void;
    const result = new Promise<IUploadResponse>((resolve) => {
      resolveRepsonse = resolve;
    });
    let fileIndex = 0;

    busboy.on('file', (_fieldname, fileStream, fileinfo) => {
      fileIndex += 1;
      if (fileIndex > this.config.fileUploadCountLimit) {
        fileStream.resume();
        fileProcessingPromises.push(Promise.resolve({ error: 'Max file upload count per request execeeded' }));
        return;
      }

      fileProcessingPromises.push(
        this.apiService.uploadStreamedAsset(fileStream, fileinfo.filename, fileinfo.mimeType),
      );
    });

    busboy.on('finish', async () => {
      const results = await Promise.all(fileProcessingPromises);
      resolveRepsonse({ files: results });
    });

    busboy.on('error', (error: any) => {
      this.logger.error('Busboy error: ', error);
    });

    req.pipe(busboy);

    // res.status(HttpStatus.ACCEPTED);
    return result;
  }
}
