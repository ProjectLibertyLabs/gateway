// ipfs.service.ts

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { extension as getExtension } from 'mime-types';
import { CID } from 'multiformats/cid';
import { blake2b256 as hasher } from '@multiformats/blake2/blake2b';
import { create } from 'multiformats/hashes/digest';
import { randomUUID } from 'crypto';
import { base58btc } from 'multiformats/bases/base58';
import { ConfigService } from '../../../../apps/api/src/config/config.service';

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

  constructor(private readonly configService: ConfigService) {
    this.logger = new Logger(IpfsService.name);
  }

  private async ipfsPinBuffer(filename: string, contentType: string, fileBuffer: Buffer): Promise<FilePin> {
    const ipfsAdd = `${this.configService.getIpfsEndpoint()}/api/v0/add`;
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename,
      contentType,
    });

    const ipfsAuthUser = this.configService.getIpfsBasicAuthUser();
    const ipfsAuthSecret = this.configService.getIpfsBasicAuthSecret();
    const ipfsAuth = ipfsAuthUser && ipfsAuthSecret ? `Basic ${Buffer.from(`${ipfsAuthUser}:${ipfsAuthSecret}`).toString('base64')}` : '';

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

  public async ipfsPin(mimeType: string, file: Buffer, calculateDsnpHash: boolean = true): Promise<FilePin> {
    const fileName = calculateDsnpHash ? await this.ipfsHashBuffer(file) : randomUUID().toString();
    const extension = getExtension(mimeType);
    if (extension === false) {
      throw new Error(`unknown mimetype: ${mimeType}`);
    }
    const ipfs = await this.ipfsPinBuffer(`${fileName}.${extension}`, mimeType, file);
    return { ...ipfs, hash: calculateDsnpHash ? fileName : '' };
  }

  // TODO: bugfix: when the cid does not exist the endpoint will get stuck indefinitely
  public async getPinned(cid: string): Promise<Buffer> {
    const ipfsGet = `${this.configService.getIpfsEndpoint()}/api/v0/cat?arg=${cid}`;
    const ipfsAuthUser = this.configService.getIpfsBasicAuthUser();
    const ipfsAuthSecret = this.configService.getIpfsBasicAuthSecret();
    const ipfsAuth = ipfsAuthUser && ipfsAuthSecret ? `Basic ${Buffer.from(`${ipfsAuthUser}:${ipfsAuthSecret}`).toString('base64')}` : '';

    const headers = {
      Accept: '*/*',
      Connection: 'keep-alive',
      authorization: ipfsAuth,
    };

    const response = await axios.post(ipfsGet, null, { headers, responseType: 'arraybuffer' });

    const { data } = response;
    return data;
  }

  private async ipfsHashBuffer(fileBuffer: Buffer): Promise<string> {
    this.logger.debug(`Hashing file buffer with length: ${fileBuffer.length}`);
    const hashed = await hasher.digest(fileBuffer);
    const hash = create(hasher.code, hashed.bytes);
    return base58btc.encode(hash.bytes);
  }

  public ipfsUrl(cid: string): string {
    if (this.configService.getIpfsGatewayUrl().includes('[CID]')) {
      return this.configService.getIpfsGatewayUrl().replace('[CID]', cid);
    }
    return `${this.configService.getIpfsGatewayUrl()}/ipfs/${cid}`;
  }
}
