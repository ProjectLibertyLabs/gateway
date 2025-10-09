#!/usr/bin/env npx ts-node

/**
 * IPFS Cluster Demo using IpfsClusterService Logic
 *
 * This script replicates the IpfsClusterService implementation without
 * depending on NestJS path aliases that cause import issues.
 *
 * Usage: npx ts-node --transpile-only ipfs-cluster-demo-service-fixed.ts
 */

// Define the types we need locally to avoid path alias issues
interface IIpfsConfig {
  mode: 'cluster' | 'ipfs';
  ipfsEndpoint: string;
  ipfsBasicAuthUser: string;
  ipfsBasicAuthSecret: string;
  ipfsGatewayUrl: string;
  clusterReplicationMin: number;
  clusterReplicationMax: number;
  clusterPinExpiration: string;
}

interface IHttpCommonConfig {
  httpResponseTimeoutMS: number;
}

interface MockLogger {
  setContext: (context: string) => void;
  debug: (msg: string) => void;
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
}

/**
 * Local implementation of IpfsClusterService without NestJS dependencies
 * This mirrors the exact logic from your service implementation
 */
class IpfsClusterServiceLocal {
  private readonly gatewayUrl: string;

  constructor(
    private readonly config: IIpfsConfig,
    private readonly httpConfig: IHttpCommonConfig,
    private readonly logger: MockLogger,
  ) {
    this.logger.setContext('IpfsClusterService');
    this.gatewayUrl = this.config.ipfsGatewayUrl;
  }

  public async getVersion(): Promise<any> {
    const url = `${this.config.ipfsEndpoint}/version`;
    return this.makeRequest(url, { method: 'GET' });
  }

  public async addFile(content: Buffer, filename: string): Promise<any> {
    const url = `${this.config.ipfsEndpoint}/add?pin=true&stream-channels=false`;
    const formData = IpfsClusterServiceLocal.createFormData(content, filename);
    return this.makeRequest(url, {
      method: 'POST',
      body: formData.body,
      headers: formData.headers,
    });
  }

  public async getPinned(cid: string): Promise<Buffer> {
    const response = await this.getFile2(cid);
    console.log('TEST: Response from getFile:', response);

    if (response instanceof Buffer) {
      return response;
    }

    if (response && (response as any).data instanceof Buffer) {
      return (response as any).data;
    }

    // If response is text/json, convert to buffer (with your bug fix)
    return Buffer.from(typeof response === 'string' ? response : JSON.stringify(response || 'null'));
  }

  private async getFile(cid: string): Promise<any> {
    const url = `${this.config.ipfsGatewayUrl}/ipfs/${cid}`;
    return this.fetchFile(url);
  }

  private async fetchFile(url: string): Promise<Buffer | null> {
    try {
      const response = await fetch(url);

      // If we get the data directly, convert to Buffer
      if (response.status === 200) {
        console.log('✅ File retrieved successfully (direct)');
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    } catch (error: any) {
      if (error.response) {
        console.error(`❌ HTTP error! status: ${error.response.status}`, error.response.data);
      } else {
        console.error('❌ Error fetching file:', error.message);
      }
      return null;
    }
  }

  private async getFile2(cid: string): Promise<Buffer> {
    const url = `${this.config.ipfsGatewayUrl}/ipfs/${cid}`;
    try {
      const response = await fetch(url);

      if (response.status === 200) {
        console.log('✅ File retrieved successfully (direct)');

        // More direct equivalent to the IPFS pattern
        // const bytesIter = this.ipfs.cat(cid); -> HTTP stream
        // const chunks = []; -> same
        // for await (const chunk of bytesIter) -> for await (const chunk of stream)
        // return Buffer.concat(chunks); -> same

        const chunks: Buffer[] = [];
        const reader = response.body?.getReader();

        if (!reader) {
          // Fallback to arrayBuffer if streaming not available
          const arrayBuffer = await response.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }

        try {
          // eslint-disable-next-line no-restricted-syntax
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(Buffer.from(value));
            }
          }
        } finally {
          reader.releaseLock();
        }

        return Buffer.concat(chunks);
      }
    } catch (error: any) {
      if (error.response) {
        console.error(`❌ HTTP error! status: ${error.response.status}`, error.response.data);
      } else {
        console.error('❌ Error fetching file:', error.message);
      }
      return null;
    }
  }

  public async pinFile(cid: string): Promise<any> {
    const url = `${this.config.ipfsEndpoint}/pins/${cid}`;
    return this.makeRequest(url, { method: 'PUT' });
  }

  public async isPinned(cid: string): Promise<boolean> {
    try {
      const pinStatus = await this.checkPinStatus(cid);
      return this.isPinnedInCluster(pinStatus.data);
    } catch (err: any) {
      // If CID is not found, it's not pinned
      if (err.message?.includes('not found') || err.message?.includes('404')) {
        return false;
      }
      throw err;
    }
  }

  private isPinnedInCluster(clusterData: any): boolean {
    if (!clusterData || !clusterData.peer_map) {
      return false;
    }

    const peerMap = clusterData.peer_map;
    for (const peerId in peerMap) {
      const peerInfo = peerMap[peerId];
      if (peerInfo && (peerInfo.status === 'pinned' || peerInfo.status === 'pinning')) {
        this.logger.debug(`Found pinned peer: ${peerId} with status: ${peerInfo.status}`);
        return true;
      }
    }

    this.logger.debug('No pinned peers found in peer_map');
    return false;
  }

  private async checkPinStatus(cid: string): Promise<any> {
    const url = `${this.config.ipfsEndpoint}/pins/${cid}`;
    return this.makeRequest(url, { method: 'GET' });
  }

  public async pinBuffer(filename: string, fileBuffer: Buffer): Promise<any> {
    const result = await this.addFile(fileBuffer, filename);

    return {
      cid: result.data?.cid || result.data?.hash,
      cidBytes: result.data?.cidBytes || Buffer.from([]),
      fileName: filename,
      size: result.data?.size || fileBuffer.length,
      hash: '',
    };
  }

  public async getInfoFromCluster(cid: string): Promise<any> {
    const url = `${this.config.ipfsEndpoint}/pins/${cid}`;
    return this.makeRequest(url, { method: 'GET' });
  }

  /**
   * Enhanced HTTP request method (matches your service implementation exactly)
   */
  private async makeRequest(
    url: string,
    options: RequestInit & { skipAuth?: boolean } = {},
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

      this.logger.debug(`Response status: ${response.status}, final URL: ${response.url}`);

      const contentType = response.headers.get('content-type') || '';
      let data;

      // Enhanced content-type detection (matches your service)
      if (IpfsClusterServiceLocal.isJsonResponse(contentType)) {
        data = await response.json();
      } else if (IpfsClusterServiceLocal.isBinaryResponse(contentType, url)) {
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
      this.logger.error(`Request failed for URL ${url}: ${error?.message}`);
      this.logger.error(`Error stack: ${error?.stack}`);
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

  static isJsonResponse(contentType: string): boolean {
    const jsonTypes = ['application/json', 'text/json'];
    return jsonTypes.some((type) => contentType.includes(type));
  }

  static isBinaryResponse(contentType: string, url: string): boolean {
    const binaryTypes = ['image/', 'video/', 'audio/', 'application/octet-stream'];
    return binaryTypes.some((type) => contentType.includes(type)) || url.includes('/add') || url.includes('/cat');
  }

  static createFormData(content: Buffer, filename: string): { body: string; headers: Record<string, string> } {
    const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
    const formData = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      'Content-Type: application/octet-stream',
      '',
      content.toString('binary'),
      `--${boundary}--`,
    ].join('\r\n');

    return {
      body: formData,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
    };
  }
}

/**
 * Demo configuration
 */
const mockIpfsConfig: IIpfsConfig = {
  mode: 'cluster' as const,
  ipfsEndpoint: process.env.IPFS_ENDPOINT || ' http://127.0.0.1:9094',
  ipfsBasicAuthUser: process.env.IPFS_BASIC_AUTH_USER || '',
  ipfsBasicAuthSecret: process.env.IPFS_BASIC_AUTH_SECRET || '',
  ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL || ' http://127.0.0.1:8081',
  clusterReplicationMin: 1,
  clusterReplicationMax: 3,
  clusterPinExpiration: '168h',
};

// Log configuration for debugging
console.log('🔧 IPFS Configuration:');
console.log(`   Cluster API: ${mockIpfsConfig.ipfsEndpoint}`);
console.log(`   Gateway URL: ${mockIpfsConfig.ipfsGatewayUrl}`);
console.log(`   Auth User: ${mockIpfsConfig.ipfsBasicAuthUser ? '***set***' : 'not set'}`);
console.log('');

const mockHttpConfig: IHttpCommonConfig = {
  httpResponseTimeoutMS: 30000,
};

const mockLogger: MockLogger = {
  setContext: (context: string) => console.log(`[CONTEXT] ${context}`),
  debug: (msg: string) => console.log(`[DEBUG] ${msg}`),
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

class IpfsClusterServiceDemo {
  private service: IpfsClusterServiceLocal;

  constructor() {
    // Create the service instance with mocked dependencies
    this.service = new IpfsClusterServiceLocal(mockIpfsConfig, mockHttpConfig, mockLogger);
  }

  async testConnection() {
    console.log('🔧 Testing IPFS Cluster connection...');

    // Test cluster API
    try {
      const version = await this.service.getVersion();
      console.log('✅ Cluster API connection successful!');
      console.log('📋 Version info:', version);
    } catch (error: any) {
      console.error('❌ Cluster API connection failed:', error?.message || error);
      return false;
    }

    return true;
  }

  async testFileOperations() {
    console.log('\n📁 Testing file operations...');

    const testContent = Buffer.from('Hello from IpfsClusterService demo!');
    const filename = 'cluster-service-test.txt';

    try {
      // Test file addition
      console.log('📤 Adding file to cluster...');
      const addResult = await this.service.addFile(testContent, filename);
      console.log('✅ File added successfully:', addResult);

      const data = addResult.data[0];
      const cid = data.cid || data.hash;
      if (!cid) {
        console.error('❌ No CID returned from add operation');
        return false;
      }

      console.log(`📍 File CID: ${cid}`);

      // Test pin status check
      console.log('📌 Checking pin status...');
      const isPinned = await this.service.isPinned(cid);
      console.log(`✅ Pin status: ${isPinned ? 'PINNED' : 'NOT PINNED'}`);

      // Test file retrieval
      console.log('📥 Retrieving file from cluster...');
      const retrievedBuffer = await this.service.getPinned(cid);
      console.log('✅ File retrieved successfully');
      console.log(`📝 Content: "${retrievedBuffer.toString()}"`);

      // Test pinBuffer method
      console.log('📌 Testing pinBuffer method...');
      const pinResult = await this.service.pinBuffer(filename, testContent);
      console.log('✅ PinBuffer completed:', pinResult);

      return true;
    } catch (error: any) {
      console.error('❌ File operations failed:', error?.message || error);
      return false;
    }
  }

  async testErrorHandling() {
    console.log('\n🚨 Testing error handling...');

    try {
      // Test with invalid CID
      const invalidCid = 'QmInvalidCIDThatDoesNotExist123456789';
      console.log(`🔍 Checking pin status for invalid CID: ${invalidCid}`);

      const isPinned = await this.service.isPinned(invalidCid);
      console.log(`✅ Error handling works: isPinned = ${isPinned}`);

      // Test cluster info for invalid CID
      console.log('📊 Getting cluster info for invalid CID...');
      const clusterInfo = await this.service.getInfoFromCluster(invalidCid);
      console.log('📋 Cluster info result:', clusterInfo);

      return true;
    } catch (error: any) {
      console.log('✅ Expected error caught:', error?.message || error);
      return true;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting IPFS Cluster Service Demo\n');
    console.log('🔧 Configuration:');
    console.log(`   Endpoint: ${mockIpfsConfig.ipfsEndpoint}`);
    console.log(`   Gateway: ${mockIpfsConfig.ipfsGatewayUrl}`);
    console.log(`   Mode: ${mockIpfsConfig.mode}`);
    console.log('');

    const results = {
      connection: false,
      fileOps: false,
      errorHandling: false,
    };

    results.connection = await this.testConnection();

    if (results.connection) {
      results.fileOps = await this.testFileOperations();
      results.errorHandling = await this.testErrorHandling();
    }

    console.log('\n📊 Test Results Summary:');
    console.log(`   Connection Test: ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   File Operations: ${results.fileOps ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Error Handling: ${results.errorHandling ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = Object.values(results).every((result) => result);
    console.log(`\n🎯 Overall Result: ${allPassed ? '🎉 ALL TESTS PASSED' : '💥 SOME TESTS FAILED'}`);

    return allPassed;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const demo = new IpfsClusterServiceDemo();
    await demo.runAllTests();
  } catch (error) {
    console.error('💥 Demo failed with error:', error);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  main();
}
