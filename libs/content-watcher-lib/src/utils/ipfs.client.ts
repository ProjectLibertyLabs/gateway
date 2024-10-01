// ipfs.service.ts

import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CID } from 'multiformats/cid';
import ipfsConfig, { IIpfsConfig } from '#content-watcher-lib/ipfs/ipfs.config';

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
}
