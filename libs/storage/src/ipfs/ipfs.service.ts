// ipfs.service.ts

import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CID } from 'multiformats/cid';
import ipfsConfig, { IIpfsConfig } from './ipfs.config';
import FormData from 'form-data';
import { randomUUID } from 'crypto';
import { extension as getExtension } from 'mime-types';

import { FilePin } from '#storage/ipfs/pin.interface';
import { calculateDsnpMultiHash } from '#utils/common/common.utils';

export interface IpfsBlockStatResponse {
  Key?: string;
  Size?: number;
  Message?: string;
  Code?: number;
  Type?: string;
}

@Injectable()
export class IpfsService {
  logger: Logger;

  constructor(@Inject(ipfsConfig.KEY) private readonly config: IIpfsConfig) {
    this.logger = new Logger(IpfsService.name);
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
    const ipfsGet = `${this.config.ipfsEndpoint}/api/v0/cat?arg=${cid}`;
    const ipfsAuthUser = this.config.ipfsBasicAuthUser;
    const ipfsAuthSecret = this.config.ipfsBasicAuthSecret;
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

  public async getInfo(cid: string, checkExistence = true): Promise<IpfsBlockStatResponse> {
    if (checkExistence && !(await this.isPinned(cid))) {
      return Promise.resolve({ Message: 'Requested resource does not exist', Type: 'error' });
    }

    const ipfsGet = `${this.config.ipfsEndpoint}/api/v0/block/stat?arg=${cid}`;
    const ipfsAuthUser = this.config.ipfsBasicAuthUser;
    const ipfsAuthSecret = this.config.ipfsBasicAuthSecret;
    const ipfsAuth =
      ipfsAuthUser && ipfsAuthSecret
        ? `Basic ${Buffer.from(`${ipfsAuthUser}:${ipfsAuthSecret}`).toString('base64')}`
        : '';

    const headers = { Accept: '*/*', Connection: 'keep-alive', authorization: ipfsAuth };

    const response = await axios.post(ipfsGet, null, { headers, responseType: 'json' });
    this.logger.debug(`IPFS response: ${JSON.stringify(response.data)}`);
    return response.data as IpfsBlockStatResponse;
  }

  public async isPinned(cid: string): Promise<boolean> {
    const parsedCid = CID.parse(cid);
    const v0Cid = parsedCid.toV0().toString();
    const ipfsGet = `${this.config.ipfsEndpoint}/api/v0/pin/ls?type=all&quiet=true&arg=${v0Cid}`;
    const ipfsAuthUser = this.config.ipfsBasicAuthUser;
    const ipfsAuthSecret = this.config.ipfsBasicAuthSecret;
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

  public async ipfsPin(mimeType: string, file: Buffer, calculateDsnpHash = true): Promise<FilePin> {
    const fileName = calculateDsnpHash ? await calculateDsnpMultiHash(file) : randomUUID().toString();
    let extension = getExtension(mimeType);
    // NOTE: 'application/vnd.apache.parquet' has been officially accepted by IANA, but the 'mime-db' package has not been updated
    if (extension === false) {
      if (mimeType === 'application/vnd.apache.parquet') {
        extension = 'parquet';
      } else {
        throw new Error(`unknown mimetype: ${mimeType}`);
      }
    }
    const ipfs = await this.ipfsPinBuffer(`${fileName}.${extension}`, mimeType, file);
    return { ...ipfs, hash: calculateDsnpHash ? fileName : '' };
  }

  private async ipfsPinBuffer(filename: string, contentType: string, fileBuffer: Buffer): Promise<FilePin> {
    const ipfsAdd = `${this.config.ipfsEndpoint}/api/v0/add`;
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename,
      contentType,
    });

    const ipfsAuthUser = this.config.ipfsBasicAuthUser;
    const ipfsAuthSecret = this.config.ipfsBasicAuthSecret;
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

    this.logger.log('Making IPFS pinning request: ', ipfsAdd, headers);

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
}
