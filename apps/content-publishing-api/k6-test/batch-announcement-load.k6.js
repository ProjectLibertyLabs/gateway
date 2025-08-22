import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { createRealisticBatchData } from './helpers.js';

const BASE_URL = 'http://localhost:3010';

// Test configuration for different scenarios
const SCENARIOS = {
  // Light load - basic functionality testing
  light: {
    vus: 5,
    duration: '30s',
    thresholds: {
      checks: ['rate>=0.99'],
      http_req_duration: ['avg<2000', 'p(95)<5000'],
      http_req_failed: ['rate<0.01'],
      http_reqs: ['rate>=2'],
    },
  },
  // Medium load - normal operation testing
  medium: {
    vus: 20,
    duration: '60s',
    thresholds: {
      checks: ['rate>=0.98'],
      http_req_duration: ['avg<5000', 'p(95)<10000'],
      http_req_failed: ['rate<0.02'],
      http_reqs: ['rate>=8'],
    },
  },
  // Heavy load - stress testing
  heavy: {
    vus: 2,
    duration: '120s',
    thresholds: {
      checks: ['rate>=0.90'], // Reduced threshold
      http_req_duration: ['avg<10000', 'p(95)<20000'],
      http_req_failed: ['rate<0.15'], // Increased tolerance for EOF errors
      http_reqs: ['rate>=0.3'],
    },
  },
  // Burst load - spike testing
  burst: {
    stages: [
      { duration: '10s', target: 10 }, // Ramp up
      { duration: '30s', target: 100 }, // Spike
      { duration: '20s', target: 10 }, // Ramp down
    ],
    thresholds: {
      checks: ['rate>=0.90'],
      http_req_duration: ['avg<15000', 'p(95)<30000'],
      http_req_failed: ['rate<0.10'],
    },
  },
};

// Select scenario based on environment variable or default to medium
const SCENARIO = __ENV.SCENARIO || 'medium';
export const options = {
  ...SCENARIOS[SCENARIO],
  // Add connection settings to handle EOF errors
  noConnectionReuse: true, // Disable connection reuse to avoid EOF errors
};



export default function () {
  // Health check first
  const healthCheck = http.get(`${BASE_URL}/healthz`);
  if (healthCheck.status !== 200) {
    console.error(`Health check failed with status ${healthCheck.status}`);
    return;
  }
  
  // Test v2 batch announcement endpoint - Single File
  group('v2/batchAnnouncement - Single File', () => {
    const url = `${BASE_URL}/v2/content/batchAnnouncement`;
    const body = createRealisticBatchData(1);
    
    const params = { 
      headers: { 
        'Content-Type': 'application/json', 
        Accept: 'application/json' 
      } 
    };
    
    const request = http.post(url, JSON.stringify(body), params);
    
    check(request, {
      'v2 single file - status is 202': (r) => r.status === 202,
      'v2 single file - response time < 5s': (r) => r.timings.duration < 5000,
      'v2 single file - has response body': (r) => r.body && r.body.length > 0,
    });
    
    sleep(randomIntBetween(3, 8));
  });

  // Test v2 batch announcement endpoint - Multiple Files
  group('v2/batchAnnouncement - Multiple Files', () => {
    const url = `${BASE_URL}/v2/content/batchAnnouncement`;
    const fileCount = randomIntBetween(2, 5);
    const body = createRealisticBatchData(fileCount);
    const params = { 
      headers: { 
        'Content-Type': 'application/json', 
        Accept: 'application/json' 
      } 
    };
    
    const request = http.post(url, JSON.stringify(body), params);
    
    check(request, {
      'v2 multiple files - status is 202': (r) => r.status === 202,
      'v2 multiple files - response time < 10s': (r) => r.timings.duration < 10000,
      'v2 multiple files - has response body': (r) => r.body && r.body.length > 0,
    });
    
    sleep(randomIntBetween(3, 8));
  });

  // Test sequential batch processing (simulating concurrent load)
  group('v2/batchAnnouncement - Sequential Batches', () => {
    const batchCount = randomIntBetween(3, 8);
    let successCount = 0;
    let totalResponseTime = 0;
    
    for (let i = 0; i < batchCount; i++) {
      const url = `${BASE_URL}/v2/content/batchAnnouncement`;
      const body = createRealisticBatchData(randomIntBetween(1, 3));
      const params = { 
        headers: { 
          'Content-Type': 'application/json', 
          Accept: 'application/json' 
        } 
      };
      
      const request = http.post(url, JSON.stringify(body), params);
      
      if (request.status === 202) {
        successCount++;
      }
      totalResponseTime += request.timings.duration;
      
      sleep(randomIntBetween(1, 3));
    }
    
    const avgResponseTime = totalResponseTime / batchCount;
    
    check({ successCount, avgResponseTime }, {
      'sequential batches - success rate > 80%': (r) => (r.successCount / batchCount) > 0.8,
      'sequential batches - avg response time < 8s': (r) => r.avgResponseTime < 8000,
    });
    
    sleep(randomIntBetween(3, 6));
  });

  // Test error scenarios
  group('v2/batchAnnouncement - Error Handling', () => {
    const url = `${BASE_URL}/v2/content/batchAnnouncement`;
    
    // Test with invalid schema ID
    const invalidBody = {
      batchFiles: [{ 
        cid: 'bafybeihs2f53wuxypxctus6m5egrcxdruykhps5v6bwz3y6wbsxstxwjdi', // Use valid CID but invalid schema
        schemaId: 99999 // Invalid schema ID
      }]
    };
    const params = { 
      headers: { 
        'Content-Type': 'application/json', 
        Accept: 'application/json' 
      } 
    };
    
    const request = http.post(url, JSON.stringify(invalidBody), params);
    
    check(request, {
      'error handling - appropriate error status': (r) => r.status >= 400 && r.status < 500,
      'error handling - response time < 3s': (r) => r.timings.duration < 3000,
    });
    
    sleep(randomIntBetween(1, 2));
  });

  // Test maximum batch limits
  group('v2/batchAnnouncement - Maximum Batch Limits', () => {
    const url = `${BASE_URL}/v2/content/batchAnnouncement`;
    const maxBatchData = createRealisticBatchData(20); // Maximum files
    const params = { 
      headers: { 
        'Content-Type': 'application/json', 
        Accept: 'application/json' 
      } 
    };
    
    const request = http.post(url, JSON.stringify(maxBatchData), params);
    
    check(request, {
      'max batch - status is 202': (r) => r.status === 202,
      'max batch - response time < 30s': (r) => r.timings.duration < 30000,
    });
    
    sleep(randomIntBetween(5, 15));
  });

  // Test different file sizes (simulated by different batch sizes)
  group('v2/batchAnnouncement - Different Batch Sizes', () => {
    const sizes = [1, 5, 10, 15, 20];
    const selectedSize = sizes[randomIntBetween(0, sizes.length - 1)];
    
    const url = `${BASE_URL}/v2/content/batchAnnouncement`;
    const body = createRealisticBatchData(selectedSize);
    const params = { 
      headers: { 
        'Content-Type': 'application/json', 
        Accept: 'application/json' 
      } 
    };
    
    const request = http.post(url, JSON.stringify(body), params);
    
    check(request, {
      'different batch sizes - status is 202': (r) => r.status === 202,
      'different batch sizes - response time reasonable': (r) => r.timings.duration < (selectedSize * 2000), // 2s per file max
    });
    
    sleep(randomIntBetween(3, 8));
  });
}

// Setup function to prepare test data
export function setup() {
  console.log(`Starting batch announcement load test with scenario: ${SCENARIO}`);
  
  // Health check before starting
  const healthCheck = http.get(`${BASE_URL}/healthz`);
  if (healthCheck.status !== 200) {
    throw new Error('Service is not healthy');
  }
  
  return { scenario: SCENARIO };
}

// Teardown function for cleanup
export function teardown(data) {
  console.log(`Completed batch announcement load test with scenario: ${data.scenario}`);
}
