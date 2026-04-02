import {
  Controller,
  HttpCode,
  Post,
  Inject,
  HttpStatus,
  Req,
  Res,
  BadRequestException,
  InternalServerErrorException,
  Body,
  PayloadTooLargeException,
  UnprocessableEntityException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import Busboy from 'busboy';
import {
  FilesUploadDto,
  BatchAnnouncementResponseDto,
  AnnouncementResponseDto,
  OnChainContentDtoV2,
} from '#types/dtos/content-publishing';
import { ApiService } from '../../api.service';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { SkipInterceptors } from '#utils/decorators/skip-interceptors.decorator';
import { IBatchAnnouncement, IFileResponse, ISuccessfulUpload } from '#types/interfaces/content-publishing';
import { VALID_BATCH_MIME_TYPES_REGEX } from '#validation';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller({ version: '3', path: 'content' })
@ApiTags('v3/content')
export class ContentControllerV3 {
  constructor(
    @Inject(apiConfig.KEY) private readonly appConfig: IContentPublishingApiConfig,
    private readonly apiService: ApiService,
    private readonly blockchainService: BlockchainRpcQueryService,
    @InjectPinoLogger(ContentControllerV3.name) private readonly logger: PinoLogger,
  ) {}

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
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation errors (no files, mismatched schema IDs, etc.)',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - all uploads failed or batch creation failed',
    type: BatchAnnouncementResponseDto,
  })
  async postUploadBatchAnnouncement(
    @Req() req: Request,
    @Res({ passthrough: true }) _res: Response,
  ): Promise<BatchAnnouncementResponseDto> {
    // Initialize busboy
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

    // Initialize variables
    let fileIndex = 0;
    let resolveResponse: (val: BatchAnnouncementResponseDto) => void;

    const schemaIds: number[] = [];
    const fileProcessingPromises: Promise<IFileResponse>[] = [];
    const result = new Promise<BatchAnnouncementResponseDto>((resolve) => {
      resolveResponse = resolve;
    });

    busboy.on('field', (fieldname, value) => {
      // Handle schemaId field
      if (fieldname === 'schemaId') {
        schemaIds.push(parseInt(value, 10));
      } else {
        throw new BadRequestException(`Unexpected field: ${fieldname}`);
      }
    });

    busboy.on('file', async (_fieldname, fileStream, fileinfo) => {
      // Handle file upload
      fileIndex += 1;
      if (fileIndex > this.appConfig.fileUploadCountLimit) {
        fileStream.resume(); // Make sure we consume the entire file stream
        throw new BadRequestException('Max file upload count per request exceeded');
      }

      // Upload file to IPFS
      fileProcessingPromises.push(
        this.apiService.uploadStreamedAsset(
          fileStream,
          fileinfo.filename,
          fileinfo.mimeType,
          VALID_BATCH_MIME_TYPES_REGEX,
        ),
      );
    });

    busboy.on('finish', async () => {
      // Handle finish event, which is emitted when all files have been streamed to IPFS
      try {
        // Validate finish event
        if (fileIndex === 0) {
          throw new BadRequestException('No files provided in the request');
        }
        if (schemaIds.length !== fileIndex) {
          throw new BadRequestException('Number of schema IDs does not match number of files');
        }

        let hasFailedUploads = false;
        const uploadResults = await Promise.allSettled(fileProcessingPromises);

        // Initialize response files
        const responseFiles: IBatchAnnouncement[] = [];
        const successfulUploads: ISuccessfulUpload[] = [];

        // Process upload results, filtering successful uploads
        uploadResults.forEach((uploadResult, index) => {
          if (uploadResult.status === 'fulfilled' && !!uploadResult.value.cid && !uploadResult.value.error) {
            successfulUploads.push({ uploadResult: uploadResult.value, originalIndex: index });
            // Placeholder - will be filled after batch creation
            responseFiles.push({ cid: uploadResult.value.cid });
          } else {
            hasFailedUploads = true;
            const error =
              uploadResult.status === 'rejected'
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

  @Post('on-chain')
  @ApiOperation({ summary: 'Create on-chain content for a given schema' })
  @HttpCode(202)
  @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: BadRequestException })
  @ApiResponse({ status: HttpStatus.PAYLOAD_TOO_LARGE, type: PayloadTooLargeException})
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, type: UnprocessableEntityException })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: UnauthorizedException })
  async postOnChainContent(@Body() contentDto: OnChainContentDtoV2) {
    const { msaId, intentName, schemaId: providedSchemaId } = contentDto;
    if (!providedSchemaId && !intentName) {
      throw new BadRequestException('Either schemaId or intentName must be provided');
    }
    let schemaId = providedSchemaId;

    if (intentName) {
      const intents = await this.blockchainService.getIntentsByName([intentName]);
      if (intents.length === 0) {
        throw new BadRequestException(`"${intentName}" not a registered Intent`);
      }

      if (intents[0].schemaIds.length === 0) {
        throw new BadRequestException(`Intent "${intentName}" has no associated schemas`);
      }

      if (schemaId && !intents[0].schemaIds.includes(schemaId)) {
        throw new BadRequestException(`Schema ${schemaId} is not associated with intent "${intentName}"`);
      }

      if (!schemaId) {
        schemaId = intents[0].schemaIds[intents[0].schemaIds.length - 1];
      }
    }

    const api = await this.blockchainService.getApi();

    // Check the payload size.
    // POTENTIAL OPTIMIZATIONS:
    //     1. (strlen - 2) / 2 + 2 (hex minus '0x' => bytes, plus 2 for SCALE length prefix of max payload size 3k)
    //     2. Buffer.from(hexstr) to get bytes, plus 2 for SCALE length prefix
    // This method is most accurate, though, and withstands any constant max payload changes on the chain (if max payload were to increase to > 16,383)
    const bytes = this.blockchainService.createType('Bytes', contentDto.payload);
    if (bytes.encodedLength > api.consts.messages.messagesMaxPayloadSizeBytes.toNumber()) {
      throw new PayloadTooLargeException('Message payload too large');
    }
    const schemaInfo = await this.blockchainService.getSchema(schemaId);
    if (!schemaInfo) {
      throw new UnprocessableEntityException(`Schema ${schemaId} not found`);
    }
    if (!schemaInfo.payloadLocation.isOnChain) {
      throw new UnprocessableEntityException('Schema payload location invalid for on-chain content');
    }
    // Check Intent grants if publishing on behalf of a user
    const onBehalfOf = !msaId ? undefined : typeof msaId === 'number' ? msaId.toString() : msaId;
    if (onBehalfOf) {
      if (
        !(await this.blockchainService.checkCurrentDelegation(
          onBehalfOf,
          schemaInfo.intentId,
          this.appConfig.providerId,
        ))
      ) {
        throw new UnauthorizedException('Provider not delegated for intent by user');
      }
    }
    return this.apiService.enqueueContent(
      onBehalfOf,
      { ...contentDto, schemaId },
      schemaInfo.intentId.toNumber(),
    ) as Promise<AnnouncementResponseDto>;
  }
}
