import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { 
  createRealisticBatchData, 
  createMultipartBatchData, 
  BATCH_SCENARIOS,
  createPerformanceChecks,
  createErrorScenarios,
  BATCH_CONSTANTS
} from './batch-helpers.js';

const BASE_URL = 'http://localhost:3000';

// Stress test configuration
export const options = {
  scenarios: {
    // Ramp-up phase
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '30s', target: 25 },
        { duration: '30s', target: 50 },
      ],
      gracefulRampDown: '30s',
    },
    
    // Sustained load phase
    sustained_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
      startTime: '2m',
    },
    
    // Spike testing
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 200,
      stages: [
        { duration: '30s', target: 50 }, // Ramp up
        { duration: '1m', target: 100 }, // Spike
        { duration: '30s', target: 10 }, // Ramp down
      ],
      startTime: '5m',
    },
    
    // Burst testing
    burst_test: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 50,
      maxVUs: 100,
      startTime: '7m',
    },
  },
  
  thresholds: {
    // Overall performance thresholds
    checks: ['rate>=0.90'],
    http_req_duration: ['avg<15000', 'p(95)<30000', 'p(99)<60000'],
    http_req_failed: ['rate<0.10'],
    http_reqs: ['rate>=50'],
    
    // Specific endpoint thresholds
    'v2_batch_announcement_duration': ['avg<10000', 'p(95)<20000'],
    'v3_batch_announcement_duration': ['avg<20000', 'p(95)<40000'],
    'concurrent_batch_duration': ['avg<15000', 'p(95)<25000'],
    
    // Error rate thresholds
    'http_req_failed{scenario:ramp_up}': ['rate<0.05'],
    'http_req_failed{scenario:sustained_load}': ['rate<0.08'],
    'http_req_failed{scenario:spike_test}': ['rate<0.15'],
    'http_req_failed{scenario:burst_test}': ['rate<0.20'],
  },
  
  noConnectionReuse: true,
};

// Global variables for tracking
let successfulRequests = 0;
let failedRequests = 0;
let totalResponseTime = 0;

export default function () {
  const scenario = __ENV.SCENARIO || 'stress';
  
  // Test v2 batch announcement with different scenarios
  group('v2/batchAnnouncement - Stress Testing', () => {
    const scenarios = ['small', 'medium', 'large', 'mixed'];
    const selectedScenario = scenarios[randomIntBetween(0, scenarios.length - 1)];
    
    const url = `${BASE_URL}/v2/content/batchAnnouncement`;
    const batchData = createRealisticBatchData(
      BATCH_SCENARIOS[selectedScenario].fileCount,
      { fileSize: BATCH_SCENARIOS[selectedScenario].fileSize }
    );
    
    const params = { 
      headers: { 
        'Content-Type': 'application/json', 
        Accept: 'application/json' 
      } 
    };
    
    const request = http.post(url, JSON.stringify(batchData), params);
    
    // Track metrics
    if (request.status === 202) {
      successfulRequests++;
    } else {
      failedRequests++;
    }
    totalResponseTime += request.timings.duration;
    
    check(request, {
      'v2 stress - status is 202': (r) => r.status === 202,
      'v2 stress - response time < 20s': (r) => r.timings.duration < 20000,
      'v2 stress - has response body': (r) => r.body.length > 0,
    });
    
    sleep(randomIntBetween(1, 5));
  });

  // Test v3 multipart batch announcement
  group('v3/batchAnnouncement - Multipart Stress', () => {
    const fileCount = randomIntBetween(1, 5);
    const formData = createMultipartBatchData(fileCount, { fileSize: 'md' });
    const url = `${BASE_URL}/v3/content/batchAnnouncement`;
    const params = { 
      headers: { 
        'Content-Type': 'multipart/form-data' 
      } 
    };
    
    const request = http.post(url, formData, params);
    
    // Track metrics
    if (request.status === 202) {
      successfulRequests++;
    } else {
      failedRequests++;
    }
    totalResponseTime += request.timings.duration;
    
    check(request, {
      'v3 stress - status is 202': (r) => r.status === 202,
      'v3 stress - response time < 40s': (r) => r.timings.duration < 40000,
      'v3 stress - has referenceId': (r) => {
        try {
          const response = JSON.parse(r.body);
          return response.referenceId !== undefined;
        } catch {
          return false;
        }
      },
    });
    
    sleep(randomIntBetween(3, 10));
  });

  // Test concurrent batch processing
  group('Concurrent Batch Processing - Stress', () => {
    const concurrentCount = randomIntBetween(3, 10);
    const promises = [];
    
    for (let i = 0; i < concurrentCount; i++) {
      const url = `${BASE_URL}/v2/content/batchAnnouncement`;
      const batchData = createRealisticBatchData(
        randomIntBetween(1, 3),
        { fileSize: 'sm' }
      );
      const params = { 
        headers: { 
          'Content-Type': 'application/json', 
          Accept: 'application/json' 
        } 
      };
      
      promises.push(http.asyncRequest('POST', url, JSON.stringify(batchData), params));
    }
    
    const responses = Promise.all(promises);
    
    // Track metrics for concurrent requests
    responses.forEach(response => {
      if (response.status === 202) {
        successfulRequests++;
      } else {
        failedRequests++;
      }
      totalResponseTime += response.timings.duration;
    });
    
    check(responses, {
      'concurrent stress - all successful': (r) => r.every(response => response.status === 202),
      'concurrent stress - avg response time < 25s': (r) => {
        const avgTime = r.reduce((sum, response) => sum + response.timings.duration, 0) / r.length;
        return avgTime < 25000;
      },
    });
    
    sleep(randomIntBetween(2, 6));
  });

  // Test edge cases and error scenarios
  group('Error Scenarios - Stress', () => {
    const errorScenarios = createErrorScenarios();
    const scenarioNames = Object.keys(errorScenarios);
    const selectedScenario = scenarioNames[randomIntBetween(0, scenarioNames.length - 1)];
    
    const url = `${BASE_URL}/v2/content/batchAnnouncement`;
    const body = errorScenarios[selectedScenario];
    const params = { 
      headers: { 
        'Content-Type': 'application/json', 
        Accept: 'application/json' 
      } 
    };
    
    const request = http.post(url, JSON.stringify(body), params);
    
    check(request, {
      'error stress - appropriate error status': (r) => r.status >= 400 && r.status < 500,
      'error stress - response time < 5s': (r) => r.timings.duration < 5000,
    });
    
    sleep(randomIntBetween(1, 3));
  });

  // Test large file uploads
  group('Large File Uploads - Stress', () => {
    const url = `${BASE_URL}/v3/content/batchAnnouncement`;
    const formData = createMultipartBatchData(1, { fileSize: 'lg' });
    const params = { 
      headers: { 
        'Content-Type': 'multipart/form-data' 
      } 
    };
    
    const request = http.post(url, formData, params);
    
    check(request, {
      'large file stress - status is 202': (r) => r.status === 202,
      'large file stress - response time < 60s': (r) => r.timings.duration < 60000,
    });
    
    sleep(randomIntBetween(10, 20));
  });

  // Test maximum batch limits
  group('Maximum Batch Limits - Stress', () => {
    const url = `${BASE_URL}/v2/content/batchAnnouncement`;
    const maxBatchData = createRealisticBatchData(
      BATCH_CONSTANTS.MAX_FILES_PER_BATCH,
      { fileSize: 'sm' }
    );
    const params = { 
      headers: { 
        'Content-Type': 'application/json', 
        Accept: 'application/json' 
      } 
    };
    
    const request = http.post(url, JSON.stringify(maxBatchData), params);
    
    check(request, {
      'max batch stress - status is 202': (r) => r.status === 202,
      'max batch stress - response time < 30s': (r) => r.timings.duration < 30000,
    });
    
    sleep(randomIntBetween(5, 15));
  });
}

// Setup function for stress test
export function setup() {
  console.log('Starting batch announcement stress test...');
  
  // Health check
  const healthCheck = http.get(`${BASE_URL}/healthz`);
  if (healthCheck.status !== 200) {
    throw new Error('Service is not healthy for stress testing');
  }
  
  // Warm up the service
  console.log('Warming up the service...');
  for (let i = 0; i < 10; i++) {
    const warmupData = createRealisticBatchData(1, { fileSize: 'sm' });
    const url = `${BASE_URL}/v2/content/batchAnnouncement`;
    const params = { 
      headers: { 
        'Content-Type': 'application/json', 
        Accept: 'application/json' 
      } 
    };
    
    const request = http.post(url, JSON.stringify(warmupData), params);
    if (request.status !== 202) {
      console.warn(`Warmup request ${i} failed with status ${request.status}`);
    }
  }
  
  return { 
    startTime: new Date().toISOString(),
    testType: 'stress'
  };
}

// Teardown function for stress test
export function teardown(data) {
  console.log('Completing batch announcement stress test...');
  console.log(`Test started at: ${data.startTime}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);
  console.log(`Total successful requests: ${successfulRequests}`);
  console.log(`Total failed requests: ${failedRequests}`);
  console.log(`Average response time: ${totalResponseTime / (successfulRequests + failedRequests)}ms`);
  
  // Calculate success rate
  const totalRequests = successfulRequests + failedRequests;
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
  console.log(`Success rate: ${successRate.toFixed(2)}%`);
}

// Custom metrics tracking
export function handleSummary(data) {
  return {
    'batch-announcement-stress-summary.json': JSON.stringify({
      testType: 'batch-announcement-stress',
      timestamp: new Date().toISOString(),
      metrics: {
        http_req_duration: data.metrics.http_req_duration,
        http_req_failed: data.metrics.http_req_failed,
        http_reqs: data.metrics.http_reqs,
        checks: data.metrics.checks,
      },
      thresholds: {
        passed: data.thresholds.passed,
        failed: data.thresholds.failed,
      },
      custom: {
        successfulRequests,
        failedRequests,
        totalResponseTime,
        successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      }
    }, null, 2),
  };
}
