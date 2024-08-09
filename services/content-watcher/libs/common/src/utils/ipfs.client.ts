// ipfs.service.ts

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { extension as getExtension } from 'mime-types';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { randomUUID } from 'crypto';
import { AppConfigService } from '../config/config.service';
import { base32 } from 'multiformats/bases/base32';

export interface FilePin {
  cid: string;
  cidBytes: Uint8Array;
  fileName: string;
  size: number;
  hash: string;
}

@Injectable()
export class IpfsService {
  logger: Logger;

  constructor(private readonly configService: AppConfigService) {
    this.logger = new Logger(IpfsService.name);
  }

  private async ipfsPinBuffer(filename: string, contentType: string, fileBuffer: Buffer): Promise<FilePin> {
    const ipfsAdd = `${this.configService.ipfsEndpoint}/api/v0/add`;
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename,
      contentType,
    });

    const ipfsAuthUser = this.configService.ipfsBasicAuthUser;
    const ipfsAuthSecret = this.configService.ipfsBasicAuthSecret;
    const ipfsAuth =
      ipfsAuthUser && ipfsAuthSecret
        ? `Basic ${Buffer.from(`${ipfsAuthUser}:${ipfsAuthSecret}`).toString('base64')}`
        : '';

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`,
      Accept: '*/*',
      Connection: 'keep-alive',
      authorization: ipfsAuth,
    };

    const response = await axios.post(ipfsAdd, form, { headers });

    const { data } = response;
    if (!data || !data.Hash || !data.Size) {
      throw new Error(`Unable to pin file: ${filename}`);
    }
    const cid = CID.parse(data.Hash).toV1();

    this.logger.debug(`Pinned file: ${filename} with size: ${data.Size} and cid: ${cid}`);

    return {
      cid: cid.toString(),
      cidBytes: cid.bytes,
      fileName: data.Name,
      size: data.Size,
      hash: '',
    };
  }

  public async ipfsPin(mimeType: string, file: Buffer, calculateDsnpHash = true): Promise<FilePin> {
    const fileName = calculateDsnpHash ? await this.ipfsHashBuffer(file) : randomUUID().toString();
    const extension = getExtension(mimeType);
    if (extension === false) {
      throw new Error(`unknown mimetype: ${mimeType}`);
    }
    const ipfs = await this.ipfsPinBuffer(`${fileName}.${extension}`, mimeType, file);
    return { ...ipfs, hash: calculateDsnpHash ? fileName : '' };
  }

  /**
   * returns pinned file
   * if the file does not exist the request will time out, so it is recommended to always check existence before calling
   * the cat endpoint
   * @param cid
   * @param checkExistence
   * @returns buffer of the data if exists and an empty buffer if not
   */
  public async getPinned(cid: string, checkExistence = true): Promise<Buffer> {
    if (checkExistence && !(await this.isPinned(cid))) {
      return Promise.resolve(Buffer.alloc(0));
    }
    const ipfsGet = `${this.configService.ipfsEndpoint}/api/v0/cat?arg=${cid}`;
    const ipfsAuthUser = this.configService.ipfsBasicAuthUser;
    const ipfsAuthSecret = this.configService.ipfsBasicAuthSecret;
    const ipfsAuth =
      ipfsAuthUser && ipfsAuthSecret
        ? `Basic ${Buffer.from(`${ipfsAuthUser}:${ipfsAuthSecret}`).toString('base64')}`
        : '';

    const headers = {
      Accept: '*/*',
      Connection: 'keep-alive',
      authorization: ipfsAuth,
    };

    const response = await axios.post(ipfsGet, null, { headers, responseType: 'arraybuffer' });

    const { data } = response;
    return data;
  }

  public async isPinned(cid: string): Promise<boolean> {
    const parsedCid = CID.parse(cid);
    const v0Cid = parsedCid.toV0().toString();
    const ipfsGet = `${this.configService.ipfsEndpoint}/api/v0/pin/ls?type=all&quiet=true&arg=${v0Cid}`;
    const ipfsAuthUser = this.configService.ipfsBasicAuthUser;
    const ipfsAuthSecret = this.configService.ipfsBasicAuthSecret;
    const ipfsAuth =
      ipfsAuthUser && ipfsAuthSecret
        ? `Basic ${Buffer.from(`${ipfsAuthUser}:${ipfsAuthSecret}`).toString('base64')}`
        : '';

    const headers = {
      Accept: '*/*',
      Connection: 'keep-alive',
      authorization: ipfsAuth,
    };

    const response = await axios.post(ipfsGet, null, { headers, responseType: 'json' }).catch((error) => {
      // when pid does not exist this call returns 500 which is not great
      if (error.response && error.response.status !== 500) {
        this.logger.error(error.toJSON());
      }
    });
    return response && response.data && JSON.stringify(response.data).indexOf(v0Cid) >= 0;
  }

  public async ipfsHashBuffer(fileBuffer: Buffer): Promise<string> {
    // Hash with sha256
    // Encode with base32
    this.logger.debug(`Hashing file buffer with length: ${fileBuffer.length}`);
    const hash = await sha256.digest(fileBuffer);
    return base32.encode(hash.bytes);
  }

  public ipfsUrl(cid: string): string {
    if (this.configService.ipfsGatewayUrl.includes('[CID]')) {
      return this.configService.ipfsGatewayUrl.replace('[CID]', cid);
    }
    return `${this.configService.ipfsGatewayUrl}/ipfs/${cid}`;
  }
}
