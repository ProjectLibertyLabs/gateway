import { FilesUploadDto, UploadResponseDtoV2 } from '#types/dtos/content-publishing';
import { Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiService } from '../../api.service';
// eslint-disable-next-line import/no-extraneous-dependencies
import Busboy from 'busboy';
import { Request, Response } from 'express';
import apiConfig, { IContentPublishingApiConfig } from '../../api.config';
import { IFileResponse, IUploadResponse } from '#types/interfaces/content-publishing';
import { SkipInterceptors } from '#utils/decorators/skip-interceptors.decorator';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller({ version: '2', path: 'asset' })
@ApiTags('v2/asset')
export class AssetControllerV2 {
  constructor(
    private readonly apiService: ApiService,
    @Inject(apiConfig.KEY) private readonly config: IContentPublishingApiConfig,
    @InjectPinoLogger(AssetControllerV2.name) private readonly logger: PinoLogger,
  ) {}

  @Post('upload')
  @SkipInterceptors()
  @HttpCode(202)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload asset files' })
  @ApiBody({
    description: 'Asset files',
    type: FilesUploadDto,
  })
  @ApiResponse({ status: '2XX', type: UploadResponseDtoV2 })
  async uploadFile(@Req() req: Request, @Res({ passthrough: true }) _res: Response): Promise<IUploadResponse> {
    req.on('end', () => this.logger.trace('Request ended'));
    req.on('close', () => this.logger.trace('Request closed'));
    req.on('aborted', () => this.logger.trace('Request aborted'));
    this.logger.trace(`uploadFile: expect Header Content-length: ${req.headers['content-length']}`);

    const fileProcessingPromises: Promise<IFileResponse>[] = [];
    const busboy = Busboy({ headers: req.headers });
    let resolveResponse: (val: IUploadResponse) => void;
    const result = new Promise<IUploadResponse>((resolve) => {
      resolveResponse = resolve;
    });
    let fileIndex = 0;

    busboy.on('file', (_fieldname, fileStream, fileinfo) => {
      fileIndex += 1;
      this.logger.trace(`on file event: ${fileinfo.filename} is truncated: ${fileStream.truncated}`);
      fileStream.on('end', () => {
        this.logger.trace(`Finished writing ${fileinfo.filename}`);
      });
      if (fileIndex > this.config.fileUploadCountLimit) {
        fileStream.resume(); // Make sure we consume the entire file stream so the rest of the request can be processed
        fileProcessingPromises.push(Promise.resolve({ error: 'Max file upload count per request exceeded' }));
        return;
      }

      fileProcessingPromises.push(
        this.apiService.uploadStreamedAsset(fileStream, fileinfo.filename, fileinfo.mimeType),
      );
    });

    busboy.on('finish', async () => {
      const results = await Promise.all(fileProcessingPromises);
      resolveResponse({ files: results });
    });

    busboy.on('error', (error: any) => {
      this.logger.error(error, `Busboy error`);
    });

    req.pipe(busboy);

    return result;
  }
}
