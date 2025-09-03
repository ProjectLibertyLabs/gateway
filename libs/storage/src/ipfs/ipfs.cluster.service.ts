import { Inject, Injectable } from '@nestjs/common';
import ipfsConfig, { IIpfsConfig } from './ipfs.config';
import httpCommonConfig, { IHttpCommonConfig } from '#config/http-common.config';
import { PinoLogger } from 'nestjs-pino';
import { CID, FilesStatResult } from 'kubo-rpc-client';

@Injectable()
export class IpfsClusterService {
  private readonly gatewayUrl: string;

  constructor(
    @Inject(ipfsConfig.KEY) private readonly config: IIpfsConfig,
    @Inject(httpCommonConfig.KEY) private readonly httpConfig: IHttpCommonConfig,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
    this.gatewayUrl = this.config.ipfsGatewayUrl;
  }

  public async getVersion(): Promise<any> {
    const url = `${this.config.ipfsEndpoint}/version`;
    return this.makeRequest(url, { method: 'GET' });
  }

  public async addFile(content: Buffer, filename: string): Promise<any> {
    const url = `${this.config.ipfsEndpoint}/add?pin=true&stream-channels=false`;
    const formData = IpfsClusterService.createFormData(content, filename);
    return this.makeRequest(url, {
      method: 'POST',
      body: formData.body,
      headers: formData.headers,
    });
  }

  public async getPinned(cid: string): Promise<Buffer> {
    const response = await this.getFile(cid);
    if (response instanceof Buffer) {
      return response;
    }
    // If response is text/json, convert to buffer
    return Buffer.from(typeof response === 'string' ? response : JSON.stringify(response));
  }

  private async getFile(cid: string): Promise<any> {
    const url = `${this.config.ipfsEndpoint}/cat?arg=${cid}`;
    return this.makeRequest(url, { method: 'GET' });
  }

  public async pinFile(cid: string): Promise<any> {
    const url = `${this.config.ipfsEndpoint}/pins/${cid}`;
    return this.makeRequest(url, { method: 'PUT' });
  }

  /**
   * Get file info from IPFS Cluster
   */
  public async getInfoFromCluster(cid: string): Promise<FilesStatResult> {
    try {
      // Check pin status to get basic info
      const pinStatus = await this.checkPinStatus(cid);
      this.logger.debug(`IPFS Cluster pin status: ${JSON.stringify(pinStatus)}`);

      // Convert cluster response to FilesStatResult format
      // Note: IPFS Cluster API may not provide all the same fields as IPFS files.stat
      // We'll provide what we can and use sensible defaults for missing fields
      return {
        cid: CID.parse(cid),
        size: pinStatus.size || 0,
        cumulativeSize: pinStatus.size || 0,
        type: 'file', // Default type
        blocks: 1, // Default blocks
        withLocality: false, // Default locality
        local: true, // Assume local if pinned
        sizeLocal: pinStatus.size || 0,
      } as FilesStatResult;
    } catch (err: any) {
      this.logger.error(`IPFS Cluster stats error: ${err.message}`);
      throw new Error('Requested resource not found');
    }
  }

  /**
   * Pin a stream to IPFS Cluster and return FilePin result
   */
  public async pinStream(stream: any): Promise<any> {
    // Convert stream to buffer for cluster API
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      stream.on('data', (chunk: any) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      stream.on('end', async () => {
        try {
          const fileBuffer = Buffer.concat(chunks);
          const filename = `stream-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const result = await this.pinBuffer(filename, fileBuffer);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', reject);
    });
  }

  /**
   * Pin a buffer with filename to IPFS Cluster and return FilePin result
   */
  public async pinBuffer(filename: string, fileBuffer: Buffer): Promise<any> {
    const result = await this.addFile(fileBuffer, filename);

    // Convert cluster response to FilePin format
    // Note: Adjust this based on your actual cluster API response format
    return {
      cid: result.cid || result.hash,
      cidBytes: result.cidBytes || Buffer.from([]), // May need adjustment
      fileName: filename,
      size: result.size || fileBuffer.length,
      hash: '',
    };
  }

  /**
   * Check if a CID is pinned in the cluster
   */
  public async isPinned(cid: string): Promise<boolean> {
    try {
      const pinStatus = await this.checkPinStatus(cid);
      // Check if the pin status indicates it's pinned
      return pinStatus && (pinStatus.status === 'pinned' || pinStatus.status === 'pinning');
    } catch (err: any) {
      // If CID is not found, it's not pinned
      if (err.message?.includes('not found') || err.message?.includes('404')) {
        return false;
      }
      throw err;
    }
  }

  private async checkPinStatus(cid: string): Promise<any> {
    const url = `${this.config.ipfsEndpoint}/pins/${cid}`;
    return this.makeRequest(url, { method: 'GET' });
  }

  /**
   * Enhanced HTTP request method that integrates with configuration
   */
  private async makeRequest(
    url: string,
    options: RequestInit = {},
  ): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
    error?: string;
    stack?: string;
  }> {
    try {
      const headers = {
        Authorization: `Basic ${Buffer.from(
          `${this.config.ipfsBasicAuthUser}:${this.config.ipfsBasicAuthSecret}`,
        ).toString('base64')}`,
        ...options.headers,
      };

      this.logger.debug(`Making ${options.method || 'GET'} request to: ${url}`);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: this.createTimeoutSignal(),
      });

      const contentType = response.headers.get('content-type') || '';
      let data;

      // Enhanced content-type detection
      if (IpfsClusterService.isJsonResponse(contentType)) {
        data = await response.json();
      } else if (IpfsClusterService.isBinaryResponse(contentType, url)) {
        // Handle binary content (images, videos, etc.)
        data = await response.arrayBuffer();
      } else {
        // Handle text content
        data = await response.text();
      }

      this.logger.debug(`Request completed with status: ${response.status}`);

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      };
    } catch (error: any) {
      this.logger.error(`Request failed: ${error?.message}`);
      return {
        status: 0,
        statusText: 'Request Failed',
        headers: {},
        data: null,
        error: error?.message || 'Unknown error',
        stack: error?.stack,
      };
    }
  }

  /**
   * Create a timeout signal for requests
   */
  private createTimeoutSignal(): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, this.httpConfig.httpResponseTimeoutMS);
    return controller.signal;
  }

  /**
   * Create multipart form data for file uploads
   */
  private static createFormData(
    content: string | Buffer,
    filename = 'file.txt',
  ): { body: string; headers: Record<string, string> } {
    const boundary = `----formdata-boundary-${Math.random().toString(36)}`;
    const contentString = content instanceof Buffer ? content.toString() : content;

    const formData = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      'Content-Type: text/plain',
      '',
      contentString,
      `--${boundary}--`,
    ].join('\r\n');

    return {
      body: formData,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
    };
  }

  /**
   * Determine if response should be parsed as JSON
   */
  private static isJsonResponse(contentType: string): boolean {
    return (
      contentType.includes('application/json') || contentType.includes('text/json') || contentType.includes('+json')
    );
  }

  /**
   * Determine if response contains binary content
   */
  private static isBinaryResponse(contentType: string, url: string): boolean {
    // Check content-type for binary formats
    const binaryTypes = [
      'image/',
      'video/',
      'audio/',
      'application/octet-stream',
      'application/pdf',
      'application/zip',
    ];

    if (binaryTypes.some((type) => contentType.includes(type))) {
      return true;
    }

    // Check URL patterns for IPFS content retrieval
    const binaryEndpoints = ['/cat', '/ipfs/'];
    return binaryEndpoints.some((endpoint) => url.includes(endpoint));
  }
}
