import { FilesUploadDto, UploadResponseDto } from '#types/dtos/content-publishing';
import { DSNP_VALID_MIME_TYPES } from '#types/dtos/content-publishing/validation';
import { Controller, HttpCode, HttpException, HttpStatus, Logger, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiService } from '../../api.service';
import { createHash } from 'crypto';
import { PassThrough } from 'stream';
// eslint-disable-next-line import/no-extraneous-dependencies
import Busboy, { FileInfo } from 'busboy';
import { Request, Response } from 'express';
import { IpfsService } from '#storage';

@Controller({ version: '2', path: 'asset' })
@ApiTags('v2/asset')
export class AssetControllerV2 {
  private readonly logger: Logger;

  constructor(
    private apiService: ApiService,
    private readonly ipfs: IpfsService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post('upload')
  @HttpCode(202)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload asset files' })
  @ApiBody({
    description: 'Asset files',
    type: FilesUploadDto,
  })
  @ApiResponse({ status: '2XX', type: UploadResponseDto })
  async uploadFile(@Req() req: Request, @Res() res: Response): Promise<void> {
    const busboy = Busboy({ headers: req.headers });
    const metadata: Record<string, any> = {}; // Store parsed fields

    let fileProcessed = false; // Ensure we handle one file at a time

    // ✅ 1. Validate metadata fields
    busboy.on('field', (fieldname, value) => {
      if (fieldname in metadata) return;
      metadata[fieldname] = value;
    });

    busboy.on('file', async (_fieldname: string, fileStream, info: FileInfo) => {
      if (fileProcessed) {
        throw new HttpException('Only one file allowed per request', HttpStatus.BAD_REQUEST);
        // return res.status(400).json({ error: 'Only one file allowed per request', details: errors });
      }
      fileProcessed = true;

      try {
        this.logger.verbose(`Processing file: ${info.filename}`);

        // ✅ 2. Validate metadata using class-validator
        metadata.filename = info.filename; // Ensure filename is included
        // const dto = Object.assign(new UploadMetadataDto(), metadata);
        // const errors = await validate(dto);

        // if (errors.length > 0) {
        //   throw new HttpException('Invalid metadata', HttpStatus.BAD_REQUEST);
        //   // return res.status(400).json({ error: 'Invalid metadata', details: errors });
        // }

        // ✅ 3. Validate file (size, MIME type)
        if (!DSNP_VALID_MIME_TYPES.test(info.mimeType)) {
          throw new HttpException('Unsupported file type', HttpStatus.BAD_REQUEST);
          // return res.status(400).json({ error: 'Unsupported file type' });
        }

        // ✅ 4. Process file (Upload to IPFS & Compute Hash)
        const passThrough1 = new PassThrough();
        const passThrough2 = new PassThrough();

        fileStream.pipe(passThrough1);
        fileStream.pipe(passThrough2);

        const ipfsUploadPromise = this.ipfs.ipfsPinStream(passThrough1);
        const hash = createHash('sha256');
        passThrough2.on('data', (chunk) => hash.update(chunk));

        const hashPromise = new Promise<string>((resolve) => {
          passThrough2.on('end', () => resolve(hash.digest('hex')));
        });

        const [ipfsResult, _fileHash] = await Promise.all([ipfsUploadPromise, hashPromise]);

        // ✅ 5. Store metadata (simulated DB insert)
        // console.log('Metadata stored:', storedMetadata);

        // ✅ 6. Return custom response
        res.json({
          assetIds: [ipfsResult.cid],
        });
      } catch (error) {
        console.error('Error processing file upload:', error);
        res.status(500).json({ error: 'Failed to upload file to IPFS' });
      }
    });

    busboy.on('finish', () => {
      console.log('Upload process finished');
    });

    req.pipe(busboy);
  }
}
