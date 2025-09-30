#!/usr/bin/env node

/**
 * Simple IPFS Cluster Demo (Plain JavaScript)
 *
 * This is a simplified version that runs directly with Node.js
 * without requiring TypeScript compilation.
 *
 * Usage: node ipfs-cluster-demo-simple.js
 */

const fs = require('fs');

// Configuration
const config = {
  mode: 'cluster',
  clusterEndpoint: process.env.CLUSTER_ENDPOINT || 'http://localhost:9094',
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:8083/ipfs/[CID]',
  basicAuthUser: process.env.IPFS_BASIC_AUTH_USER || '',
  basicAuthSecret: process.env.IPFS_BASIC_AUTH_SECRET || '',
};

class SimpleIpfsClusterClient {
  constructor(clientConfig) {
    this.config = clientConfig;
  }

  getAuthHeaders() {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (this.config.basicAuthUser && this.config.basicAuthSecret) {
      const auth = Buffer.from(`${this.config.basicAuthUser}:${this.config.basicAuthSecret}`).toString('base64');
      headers.Authorization = `Basic ${auth}`;
    }

    return headers;
  }

  async makeRequest(url, options = {}) {
    const defaultHeaders = this.getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return response.arrayBuffer();
  }

  // Get cluster version
  async getVersion() {
    const url = `${this.config.clusterEndpoint}/version`;
    return this.makeRequest(url, { method: 'GET' });
  }

  // Add file to cluster
  async addFile(content, filename) {
    const url = `${this.config.clusterEndpoint}/add?pin=true&stream-channels=false`;

    // Create form data
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const formData = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      'Content-Type: application/octet-stream',
      '',
      content.toString('binary'),
      `--${boundary}--`,
    ].join('\r\n');

    return this.makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: formData,
    });
  }

  // Get pinned file content - demonstrates gateway behavior with multiple strategies
  async getPinned(cid) {
    console.log(`🔍 Attempting to retrieve content for CID: ${cid}`);
    
    // Strategy 1: Try IPFS Gateway (most common for content retrieval)
    await this.tryGatewayRetrieval(cid);
    
    // Strategy 2: Try multiple cluster API endpoints
    return this.tryClusterRetrieval(cid);
  }

  async tryGatewayRetrieval(cid) {
    const gatewayUrl = this.getGatewayUrl(cid);
    console.log(`🌐 Strategy 1: IPFS Gateway - ${gatewayUrl}`);
    
    try {
      // First check if gateway is even accessible
      const healthCheck = await fetch(gatewayUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      if (healthCheck.ok) {
        // Gateway responded, now try to get content
        const response = await fetch(gatewayUrl, {
          method: 'GET',
          headers: {
            Accept: '*/*',
            'User-Agent': 'IPFS-Cluster-Demo/1.0',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout for content
        });
        
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          console.log(`✅ Gateway success: Retrieved ${buffer.byteLength} bytes`);
          return Buffer.from(buffer);
        }
        console.log(`⚠️  Gateway returned ${response.status}: ${response.statusText}`);
      } else {
        console.log(`⚠️  Gateway health check failed: ${healthCheck.status}`);
      }
    } catch (error) {
      if (error.name === 'TimeoutError') {
        console.log(`⏰ Gateway timeout: Content may still be propagating`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`🔌 Gateway connection refused: Is IPFS gateway running on ${gatewayUrl.split('/')[2]}?`);
      } else {
        console.log(`❌ Gateway failed: ${error.message}`);
      }
    }
    
    throw new Error('Gateway retrieval failed');
  }

  async tryClusterRetrieval(cid) {
    console.log(`🏗️  Strategy 2: IPFS Cluster API fallback`);
    
    // Try different cluster endpoints
    const clusterEndpoints = [
      // IPFS-compatible endpoint
      { url: `${this.config.clusterEndpoint}/api/v0/cat`, method: 'POST', params: `arg=${cid}` },
      // Direct cluster endpoint
      { url: `${this.config.clusterEndpoint}/pins/${cid}`, method: 'GET', params: '' },
    ];
    
    for (const endpoint of clusterEndpoints) {
      try {
        console.log(`   🔄 Trying: ${endpoint.method} ${endpoint.url}${endpoint.params ? '?' + endpoint.params : ''}`);
        
        const url = endpoint.params ? `${endpoint.url}?${endpoint.params}` : endpoint.url;
        const response = await this.makeRequest(url, { method: endpoint.method });
        
        if (response) {
          console.log(`✅ Cluster API success via ${endpoint.method} ${endpoint.url}`);
          return Buffer.from(response);
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint.method} ${endpoint.url} failed: ${error.message}`);
        continue;
      }
    }
    
    throw new Error('All cluster API endpoints failed');
  }

  // Check if file is pinned
  async isPinned(cid) {
    try {
      const url = `${this.config.clusterEndpoint}/pins/${cid}`;
      await this.makeRequest(url, { method: 'GET' });
      return true;
    } catch (error) {
      if (error.message.includes('404')) {
        return false;
      }
      throw error;
    }
  }

  // Get gateway URL for a CID
  getGatewayUrl(cid) {
    return this.config.gatewayUrl.replace('[CID]', cid);
  }

  // Check if content exists in gateway
  async existsInGateway(cid) {
    try {
      const response = await fetch(this.getGatewayUrl(cid), {
        method: 'HEAD',
        headers: {
          'Cache-Control': 'only-if-cached',
        },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Diagnostic function to check cluster and gateway connectivity
  async diagnoseConnectivity() {
    console.log('\n🔍 === Connectivity Diagnostics ===');
    
    // Check cluster API
    console.log('\n1️⃣  IPFS Cluster API Check:');
    try {
      const version = await this.getVersion();
      console.log(`   ✅ Cluster API accessible: ${JSON.stringify(version)}`);
    } catch (error) {
      console.log(`   ❌ Cluster API failed: ${error.message}`);
      console.log(`   🔧 Check if IPFS Cluster is running on ${this.config.clusterEndpoint}`);
    }
    
    // Check gateway connectivity
    console.log('\n2️⃣  IPFS Gateway Check:');
    const testUrl = this.config.gatewayUrl.replace('[CID]', 'test');
    try {
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      console.log(`   ✅ Gateway responds: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`   ❌ Gateway unreachable: ${error.message}`);
      console.log(`   🔧 Check if IPFS Gateway is running on ${testUrl.split('/').slice(0, 3).join('/')}`);
    }
    
    // Check network configuration
    console.log('\n3️⃣  Configuration Check:');
    console.log(`   📡 Cluster Endpoint: ${this.config.clusterEndpoint}`);
    console.log(`   🌐 Gateway URL Template: ${this.config.gatewayUrl}`);
    console.log(`   🔑 Authentication: ${this.config.basicAuthUser ? 'Enabled' : 'Disabled'}`);
    
    return true;
  }
}

// Function to demonstrate gateway behavior with different scenarios
async function demoGatewayBehavior(client) {
  console.log('\n🔍 === IPFS Gateway Behavior Demo ===\n');

  // Test 1: Try to access a well-known IPFS hash
  console.log('📋 Test 1: Accessing well-known content...');
  const wellKnownCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'; // "hello world"
  try {
    const content = await client.getPinned(wellKnownCid);
    console.log(`✅ Well-known content retrieved: "${content.toString().trim()}"`);
  } catch (error) {
    console.log(`ℹ️  Well-known content not available: ${error.message}`);
  }

  // Test 2: Try to access non-existent content
  console.log('\n📋 Test 2: Accessing non-existent content...');
  const nonExistentCid = 'QmThisDoesNotExistAnywhere123456789012345678901234';
  try {
    await client.getPinned(nonExistentCid);
    console.log('✅ Somehow found non-existent content (unexpected!)');
  } catch (error) {
    console.log(`✅ Expected behavior - non-existent content failed: ${error.message}`);
  }

  // Test 3: Check different gateway endpoints
  console.log('\n📋 Test 3: Testing gateway connectivity...');
  const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
  const gateways = [
    client.getGatewayUrl(testCid),
    `http://localhost:8080/ipfs/${testCid}`, // Standard IPFS gateway
    `https://ipfs.io/ipfs/${testCid}`, // Public gateway
  ];

  for (const gatewayUrl of gateways) {
    try {
      console.log(`   Trying: ${gatewayUrl}`);
      const response = await fetch(gatewayUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      console.log(`   ✅ ${response.status} - Gateway responsive`);
    } catch (error) {
      console.log(`   ❌ Gateway failed: ${error.message}`);
    }
  }
}

// Main demo function
async function runDemo() {
  console.log('🚀 IPFS Cluster Demo Starting...\n');

  const client = new SimpleIpfsClusterClient(config);

  try {
    // 0. Run connectivity diagnostics
    await client.diagnoseConnectivity();
    
    // 1. Check cluster version
    console.log('\n📋 Checking cluster version...');
    const version = await client.getVersion();
    console.log(`✅ Cluster version: ${JSON.stringify(version, null, 2)}\n`);

    // 2. Create demo content
    const demoContent = Buffer.from(`Hello IPFS Cluster from JavaScript! 
Generated at: ${new Date().toISOString()}
Random ID: ${Math.random().toString(36).substring(7)}`);

    const filename = `demo-js-${Date.now()}.txt`;
    console.log(`📁 Adding file: ${filename}`);
    console.log(`📄 Content: ${demoContent.toString()}\n`);

    // 3. Add file to cluster
    const addResult = await client.addFile(demoContent, filename);
    console.log(`✅ File added to cluster:`);
    console.log(JSON.stringify(addResult, null, 2));

    // Extract CID from different possible response formats
    let cid;
    if (Array.isArray(addResult) && addResult.length > 0) {
      // IPFS Cluster returns an array of objects
      cid = addResult[0].cid;
    } else if (addResult.cid) {
      // Handle nested CID format: { cid: { '/': 'hash' } } or { cid: 'hash' }
      cid = addResult.cid['/'] || addResult.cid;
    } else if (addResult.Hash) {
      // Handle IPFS format: { Hash: 'hash' }
      cid = addResult.Hash;
    } else {
      throw new Error('Could not extract CID from response');
    }
    console.log(`🔗 CID: ${cid}\n`);

    // 4. Check pin status
    console.log('📌 Checking pin status...');
    const isPinned = await client.isPinned(cid);
    console.log(`✅ Is pinned: ${isPinned}\n`);

    // 5. Retrieve content with retry logic
    console.log('📥 Retrieving content from cluster...');
    let retrievedContent;
    try {
      retrievedContent = await client.getPinned(cid);
      console.log(`✅ Retrieved content: ${retrievedContent.toString()}\n`);
    } catch (error) {
      console.log(`⚠️  Content retrieval failed: ${error.message}`);
      console.log(`ℹ️  This is common immediately after upload. Reasons:`);
      console.log(`   - Content may still be propagating through the network`);
      console.log(`   - Gateway might not be connected to cluster nodes`);
      console.log(`   - Cluster replication might still be in progress`);
      console.log(`📝 Continuing demo - this doesn't indicate a critical failure\n`);
      
      // Set a placeholder for the demo to continue
      retrievedContent = Buffer.from('Content retrieval failed - see above');
    }

    // 6. Check gateway
    console.log('🌐 Checking gateway availability...');
    const gatewayUrl = client.getGatewayUrl(cid);
    console.log(`🔗 Gateway URL: ${gatewayUrl}`);

    // Wait for propagation
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });

    const existsInGateway = await client.existsInGateway(cid);
    console.log(`✅ Available in gateway: ${existsInGateway}\n`);

    // 7. Save results
    const results = {
      timestamp: new Date().toISOString(),
      filename,
      cid,
      content: demoContent.toString(),
      gatewayUrl,
      isPinned,
      existsInGateway,
      clusterResponse: addResult,
      config: {
        clusterEndpoint: config.clusterEndpoint,
        gatewayUrl: config.gatewayUrl,
        hasAuth: !!(config.basicAuthUser && config.basicAuthSecret),
      },
    };

    const resultsFile = `demo-results-js-${Date.now()}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`💾 Results saved to: ${resultsFile}`);

    // Run additional gateway behavior demo
    await demoGatewayBehavior(client);

    console.log('\n🎉 Demo completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - File: ${filename}`);
    console.log(`   - CID: ${cid}`);
    console.log(`   - Pinned: ${isPinned}`);
    console.log(`   - Gateway: ${gatewayUrl}`);
    console.log(`   - Results: ${resultsFile}`);

    // Educational content about IPFS Cluster Gateway behavior
    console.log(`\n📚 === IPFS Cluster Gateway Behavior Explained ===`);
    console.log(`\n🔍 What happens when a gateway node doesn't have a file:`);
    console.log(`   1. 🏠 Local Check: Gateway checks local storage first`);
    console.log(`   2. 🌐 DHT Lookup: Queries Distributed Hash Table to find peers with content`);
    console.log(`   3. 📡 Network Retrieval: Fetches from other IPFS nodes in the network`);
    console.log(`   4. 💾 Caching: May cache content locally for future requests`);
    console.log(`   5. ⏰ Timeout: Returns error if no peers have content or network issues occur`);
    
    console.log(`\n🎯 IPFS Cluster Advantages:`);
    console.log(`   • 🔄 Content Replication: Files are stored on multiple nodes`);
    console.log(`   • 🚀 High Availability: If one node is down, others can serve content`);
    console.log(`   • ⚡ Load Distribution: Requests can be served from nearest/fastest node`);
    console.log(`   • 🛡️  Redundancy: Protection against single points of failure`);
    
    console.log(`\n⚠️  Common Issues and Solutions:`);
    console.log(`   • 404 Not Found: Content may not be pinned or network partitioned`);
    console.log(`   • 405 Method Not Allowed: Check if using correct HTTP method (GET vs POST)`);
    console.log(`   • Slow Response: Node may be fetching from remote peers`);
    console.log(`   • Timeout: Network connectivity issues or content not available`);
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Ensure IPFS Cluster is running on localhost:9094');
    console.error('   2. Ensure IPFS Gateway is running on localhost:8080');
    console.error('   3. Check authentication credentials if required');
    console.error('   4. Verify network connectivity');
    console.error(`   5. Current config: ${JSON.stringify(config, null, 2)}`);

    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  runDemo();
}

module.exports = { SimpleIpfsClusterClient, config };
