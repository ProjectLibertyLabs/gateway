// ipfs.service.ts

import { Inject, Injectable, Logger } from '@nestjs/common';
import ipfsConfig, { getIpfsCidPlaceholder, IIpfsConfig } from './ipfs.config';
import { randomUUID } from 'crypto';
import { extension as getExtension } from 'mime-types';
import { FilePin } from '#storage/ipfs/pin.interface';
import { calculateDsnpMultiHash, calculateIncrementalDsnpMultiHash } from '#utils/common/common.utils';
import { createKuboRPCClient, KuboRPCClient, CID, FilesStatResult, FilesStatOptions } from 'kubo-rpc-client';
import httpCommonConfig, { IHttpCommonConfig } from '#config/http-common.config';
import { Readable } from 'stream';

@Injectable()
export class IpfsService {
  private readonly ipfs: KuboRPCClient;

  private readonly gatewayUrl: string;

  private readonly logger: Logger;

  constructor(
    @Inject(ipfsConfig.KEY) config: IIpfsConfig,
    @Inject(httpCommonConfig.KEY) private readonly httpConfig: IHttpCommonConfig,
  ) {
    this.logger = new Logger(IpfsService.name);
    this.gatewayUrl = config.ipfsGatewayUrl;
    this.ipfs = createKuboRPCClient({
      url: config.ipfsEndpoint,
      timeout: httpConfig.httpResponseTimeoutMS,
      headers: {
        Authorization:
          config.ipfsBasicAuthUser && config.ipfsBasicAuthSecret
            ? `Basic ${Buffer.from(`${config.ipfsBasicAuthUser}:${config.ipfsBasicAuthSecret}`).toString('base64')}`
            : '',
        Accept: '*/*',
        Connection: 'keep-alive',
      },
    });
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
    if (checkExistence && !(await this.existsInLocalGateway(cid))) {
      return Promise.resolve(Buffer.alloc(0));
    }
    const bytesIter = this.ipfs.cat(cid);
    const chunks = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const chunk of bytesIter) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  public async getInfoFromLocalNode(cid: string): Promise<FilesStatResult> {
    this.logger.debug(`Requesting IPFS stats for ${cid}`);
    // Specify 'offline: true' to return immediately with an error
    // if the file is not in the local node's cache.
    // (The 'kubo-rpc-client' package doesn't include the 'offline' property,
    // but it's one of the root Kubo CLI options that are all supported:
    // https://docs.ipfs.tech/reference/kubo/cli/#ipfs
    // Alternatively, could use the 'timeout' property to return an error
    // after the specified timeout)
    try {
      const response = await this.ipfs.files.stat(`/ipfs/${CID.parse(cid)}`, { offline: true } as FilesStatOptions);
      this.logger.debug(`IPFS response: ${JSON.stringify(response)}`);
      return response;
    } catch (err: any) {
      this.logger.error(err?.message || err);
      throw new Error('Requested resource not found');
    }
  }

  public async existsInLocalGateway(cid: string): Promise<boolean> {
    this.logger.debug(`Requesting HEAD for ${cid}`);
    const response = await fetch(getIpfsCidPlaceholder(cid, this.gatewayUrl), {
      method: 'HEAD',
      headers: {
        'Cache-Control': 'only-if-cached',
      },
    });
    return response && response.status === 200;
  }

  public async isPinned(cid: string): Promise<boolean> {
    const parsedCid = CID.parse(cid);
    const v0Cid = parsedCid.toV0().toString();

    this.logger.verbose(`Requesting pin info from IPFS for ${cid} (${v0Cid})`);
    try {
      const r = this.ipfs.pin.ls({ paths: v0Cid, type: 'all' });
      // eslint-disable-next-line no-restricted-syntax
      for await (const pin of r) {
        if (pin.cid.toString() === v0Cid) {
          return true;
        }
      }
    } catch (err: any) {
      if (err?.message.includes('not pinned')) {
        return false;
      }

      throw err;
    }

    return false;
  }

  public async getDsnpMultiHash(cid: string, checkExistence = true): Promise<string | null> {
    if (checkExistence && !(await this.existsInLocalGateway(cid))) {
      this.logger.warn(`Requested DSNP multihash of ${cid}, but resource does not exist`);
      return null;
    }

    this.logger.debug(`Requesting IPFS resource ${cid} for hashing`);
    const bytes = this.ipfs.cat(cid);
    return calculateIncrementalDsnpMultiHash(bytes);
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
    this.logger.log(`Making IPFS pinning request for ${filename} (${contentType})`);

    try {
      const result = await this.ipfs.add(fileBuffer, {
        cidVersion: 0,
        hashAlg: 'sha2-256',
        pin: true,
      });
      this.logger.debug(`Pinned file: ${filename} with size: ${result.size} and cid: ${result.cid}`);
      return {
        cid: result.cid.toV1().toString(),
        cidBytes: result.cid.bytes,
        fileName: result.path,
        size: result.size,
        hash: '',
      };
    } catch (err: any) {
      throw new Error(`Unable to pin file: ${err?.message}`);
    }
  }

  public async ipfsPinStream(stream: Readable): Promise<FilePin> {
    this.logger.verbose(`Making IPFS pinning request for uploaded content`);

    try {
      const result = await this.withConnectionCheck(() =>
        this.ipfs.add({ path: randomUUID(), content: stream }, { cidVersion: 0, hashAlg: 'sha2-256', pin: true }),
      );
      const cid = result.cid.toV1();
      this.logger.debug(`Pinned file: ${result.path} with size ${result.size} and CID: ${cid.toString()}`);
      return {
        cid: cid.toString(),
        cidBytes: cid.bytes,
        fileName: result.path,
        size: result.size,
        hash: '',
      };
    } catch (err: any) {
      throw new Error(`Unable to pin file: ${err?.message}`);
    }
  }

  /**
   * Ensures the IPFS node is reachable before executing an API call.
   * Supports both Promise-based and AsyncIterable-based functions.
   * Necessary because kubo-rpc-client doesn't support a connection-timeout
   * in case the node is unreachable, down, etc.
   * (Note, would require a similar solution even if using Axios directly)
   */
  private withConnectionCheck<T>(fn: () => T | Promise<T>): Promise<T> | T {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      this.logger.error('IPFS node API call timed out');
      controller.abort();
    }, this.httpConfig.httpResponseTimeoutMS);

    // ✅ Use `version()` as a lightweight connectivity check
    return this.ipfs
      .version({ signal: controller.signal })
      .catch(() => {
        throw new Error(`Failed to connect to IPFS node within ${this.httpConfig.httpResponseTimeoutMS}ms`);
      })
      .then(() => {
        this.logger.debug('IPFS connection attempt succeeded, clearing timeout');
        clearTimeout(timeout);
        return fn();
      })
      .finally(() => clearTimeout(timeout));
  }
}
