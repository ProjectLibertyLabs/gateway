import {
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
import { FilesUploadDto, BatchAnnouncementResponseDto } from '#types/dtos/content-publishing';
import { ApiService } from '../../api.service';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { SkipInterceptors } from '#utils/decorators/skip-interceptors.decorator';
import { IFileResponse } from '#types/interfaces/content-publishing';

@Controller({ version: '3', path: 'content' })
@ApiTags('v3/content')
export class ContentControllerV3 {
  private readonly logger: Logger;

  constructor(
    @Inject(apiConfig.KEY) private readonly appConfig: IContentPublishingApiConfig,
    private readonly apiService: ApiService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post('batchAnnouncement')
  @SkipInterceptors()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload files and create batch announcements',
    description:
      'Upload files with their corresponding schema IDs to create batch announcements. Each file must be accompanied by a schemaId field.',
  })
  @ApiBody({
    description: 'Asset files',
    type: FilesUploadDto,
  })
  @ApiResponse({
    status: 200,
    description: 'All files uploaded and batch announcements created successfully',
    type: BatchAnnouncementResponseDto,
  })
  @ApiResponse({
    status: 207,
    description: 'Partial success - some files uploaded successfully, others failed',
    type: BatchAnnouncementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation errors (no files, mismatched schema IDs, etc.)' })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - all uploads failed or batch creation failed',
    type: BatchAnnouncementResponseDto,
  })
  async postUploadBatchAnnouncement(
    @Req() req: Request,
    @Res({ passthrough: true }) _res: Response,
  ): Promise<BatchAnnouncementResponseDto> {
    let fileIndex = 0;
    let resolveResponse: (val: BatchAnnouncementResponseDto) => void;

    let busboy;
    try {
      busboy = Busboy({ headers: req.headers });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Missing Content-Type')) {
        throw new BadRequestException('No files provided in the request');
      }
      throw new InternalServerErrorException('File upload error');
    }
    const fileProcessingPromises: Promise<IFileResponse>[] = [];
    const result = new Promise<BatchAnnouncementResponseDto>((resolve) => {
      resolveResponse = resolve;
    });

    const schemaIds: number[] = [];

    busboy.on('field', (fieldname, value) => {
      if (fieldname === 'schemaId') {
        schemaIds.push(parseInt(value, 10));
      } else {
        throw new BadRequestException(`Unexpected field: ${fieldname}`);
      }
    });

    busboy.on('file', async (_fieldname, fileStream, fileinfo) => {
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
        if (fileIndex === 0) {
          throw new BadRequestException('No files provided in the request');
        }
        if (schemaIds.length !== fileProcessingPromises.length) {
          throw new BadRequestException('Number of schema IDs does not match number of files');
        }

        const uploadResults = await Promise.allSettled(fileProcessingPromises);

        const responseFiles: { referenceId?: string; cid?: string; error?: string }[] = [];
        let hasFailedUploads = false;
        const successfulUploads: { uploadResult: IFileResponse; originalIndex: number }[] = [];

        uploadResults.forEach((uploadResult, index) => {
          if (uploadResult.status === 'fulfilled' && !!uploadResult.value.cid && !uploadResult.value.error) {
            successfulUploads.push({ uploadResult: uploadResult.value, originalIndex: index });
            // Placeholder - will be filled after batch creation
            responseFiles.push({ cid: uploadResult.value.cid });
          } else {
            hasFailedUploads = true;
            const error = uploadResult.status === 'rejected' 
              ? uploadResult.reason?.message || 'Upload failed'
              : uploadResult.value.error || 'Upload failed';
            responseFiles.push({ error });
          }
        });

        // Create batch announcements for successful uploads
        if (successfulUploads.length > 0) {
          const batchPromises = successfulUploads.map(({ uploadResult, originalIndex }) =>
            this.apiService.enqueueBatchRequest({
              cid: uploadResult.cid!,
              schemaId: schemaIds[originalIndex],
            }),
          );

          const batchResults = await Promise.allSettled(batchPromises);

          // Update response files with batch results
          successfulUploads.forEach(({ originalIndex }, batchIndex) => {
            const batchResult = batchResults[batchIndex];
            if (batchResult.status === 'fulfilled') {
              responseFiles[originalIndex].referenceId = batchResult.value.referenceId;
            } else {
              hasFailedUploads = true;
              responseFiles[originalIndex] = {
                cid: responseFiles[originalIndex].cid,
                error: 'Upload to IPFS succeeded, but batch announcement to chain failed',
              };
            }
          });
        }

        const response: BatchAnnouncementResponseDto = {
          files: responseFiles as BatchAnnouncementResponseDto['files'], // Cast to BatchAnnouncementResponseDto['files']
        };

        // Set appropriate HTTP status and return detailed response
        if (hasFailedUploads) {
          if (successfulUploads.length === 0) {
            // All files failed - return 500 Internal Server Error
            _res.status(HttpStatus.INTERNAL_SERVER_ERROR);
          } else {
            // Partial success - return 207 Multi-Status
            // NestJS version 10.4.20 does not support HttpStatus.MULTI_STATUS but 11.0.0 does
            // TODO: update to HttpStatus.MULTI_STATUS when we upgrade to NestJS 11.0.0
            _res.status(207);
          }
        } else {
          // All succeeded - return 202 Accepted
          _res.status(HttpStatus.ACCEPTED);
        }

        resolveResponse(response);
      } catch (error: unknown) {
        // Only throw for validation errors or complete failures
        if (error instanceof BadRequestException) {
          throw error;
        }
        this.logger.error('Error processing batches:', error);
        throw new InternalServerErrorException('Failed to process batch announcement');
      }
    });

    busboy.on('error', (error: unknown) => {
      this.logger.error('Busboy error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Missing Content-Type')) {
        throw new BadRequestException('No files provided in the request');
      }
      throw new InternalServerErrorException('File upload error');
    });

    req.pipe(busboy);

    return result;
  }
}
