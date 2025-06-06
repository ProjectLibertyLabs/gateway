import {
  Body,
  Controller,
  HttpCode,
  Post,
  Inject,
  HttpStatus,
  Req,
  Res,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import Busboy from 'busboy';
import { AnnouncementResponseDto, FilesUploadDto, UploadResponseDtoV2 } from '#types/dtos/content-publishing';
import { ApiService } from '../../api.service';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { SkipInterceptors } from '#utils/decorators/skip-interceptors.decorator';
import { IFileResponse } from '#types/interfaces/content-publishing';
import { IpfsService } from '#storage';

@Controller({ version: '3', path: 'content' })
@ApiTags('v3/content')
export class ContentControllerV3 {
  private readonly logger: Logger;

  constructor(
    @Inject(apiConfig.KEY) private readonly appConfig: IContentPublishingApiConfig,
    private readonly apiService: ApiService,
    private readonly blockchainService: BlockchainRpcQueryService,
    private readonly ipfsService: IpfsService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post('uploadBatchAnnouncement')
  @SkipInterceptors()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload files and create batch announcements',
    description: 'Upload files with their corresponding schema IDs to create batch announcements. Each file must be accompanied by a schemaId field.'
  })
  @ApiBody({
    description: 'Asset files',
    type: FilesUploadDto,
  })
  @ApiResponse({ status: '2XX', type: UploadResponseDtoV2 })
  async postUploadBatchAnnouncement(
    @Req() req: Request,
    @Res({ passthrough: true }) _res: Response,
  ): Promise<AnnouncementResponseDto[]> {
    const busboy = Busboy({ headers: req.headers });

    const fileProcessingPromises: Promise<IFileResponse>[] = [];
    let resolveResponse: (val: AnnouncementResponseDto[]) => void;
    const result = new Promise<AnnouncementResponseDto[]>((resolve) => {
      resolveResponse = resolve;
    });
    let fileIndex = 0;
    const schemaIds: number[] = [];

    busboy.on('field', (fieldname, value) => {
      if (fieldname === 'schemaId') {
        schemaIds.push(parseInt(value, 10));
      }
    });

    busboy.on('file', (_fieldname, fileStream, fileinfo) => {
      fileIndex += 1;
      if (fileIndex > this.appConfig.fileUploadCountLimit) {
        fileStream.resume(); // Make sure we consume the entire file stream
        throw new BadRequestException('Max file upload count per request exceeded');
      }

      fileProcessingPromises.push(
        this.apiService.uploadStreamedAsset(fileStream, fileinfo.filename, fileinfo.mimeType),
      );
    });

    busboy.on('finish', async () => {
      try {
        // Validate schema IDs match file count
        if (schemaIds.length !== fileProcessingPromises.length) {
          throw new BadRequestException('Number of schema IDs does not match number of files');
        }

        // Process uploaded files
        const uploadResults = await Promise.all(fileProcessingPromises);

        // Check for upload errors
        const errors = uploadResults.filter(result => result.error);
        if (errors.length > 0) {
          throw new BadRequestException(errors[0].error || 'File upload failed');
        }

        // Process each file and schema ID pair
        const batchPromises = uploadResults.map((result, index) => {
          if (!result.cid) {
            throw new Error('Missing CID in upload result');
          }
          return this.apiService.enqueueBatchRequest({
            cid: result.cid,
            schemaId: schemaIds[index]
          });
        });

        // Submit all batch requests
        const response = await Promise.all(batchPromises);
        resolveResponse(response);
      } catch (error: unknown) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        this.logger.error('Error processing batches:', error);
        throw new InternalServerErrorException('Failed to process batch announcement');
      }
    });

    busboy.on('error', (error: unknown) => {
      this.logger.error('Busboy error:', error);
      throw new InternalServerErrorException('File upload error');
    });

    req.pipe(busboy);

    return result;
  }
} 