import { Inject, Injectable } from '@nestjs/common';
import ipfsConfig, { IIpfsConfig } from './ipfs.config';
import httpCommonConfig, { IHttpCommonConfig } from '#config/http-common.config';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class IpfsClusterService {
  private readonly gatewayUrl: string;

  constructor(
    @Inject(ipfsConfig.KEY) private readonly config: IIpfsConfig,
    @Inject(httpCommonConfig.KEY) private readonly httpConfig: IHttpCommonConfig,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
    this.gatewayUrl = this.config.ipfsGatewayUrl; // Use existing gateway URL
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

  public async getFile(cid: string): Promise<any> {
    const url = `${this.config.ipfsEndpoint}/cat?arg=${cid}`;
    return this.makeRequest(url, { method: 'GET' });
  }

  public async pinFile(cid: string): Promise<any> {
    const url = `${this.config.ipfsEndpoint}/pins/${cid}`;
    return this.makeRequest(url, { method: 'PUT' });
  }

  public async checkPinStatus(cid: string): Promise<any> {
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
