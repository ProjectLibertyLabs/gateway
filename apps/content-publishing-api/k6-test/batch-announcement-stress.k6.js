import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { Trend, Counter } from 'k6/metrics';
import {
  createRealisticBatchData,
  createMultipartBatchData,
  BATCH_SCENARIOS,
  createErrorScenarios,
  BATCH_CONSTANTS,
} from './helpers.js';

const BASE_URL = 'http://localhost:3010';

// Stress test configuration
export const options = {
  scenarios: {
    // Ramp-up phase
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 3 },
        { duration: '30s', target: 5 },
        { duration: '30s', target: 10 },
      ],
      gracefulRampDown: '30s',
    },

    // Sustained load phase
    sustained_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      startTime: '2m',
    },

    // Spike testing
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 2,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 50,
      stages: [
        { duration: '30s', target: 10 }, // Ramp up
        { duration: '1m', target: 25 }, // Spike
        { duration: '30s', target: 3 }, // Ramp down
      ],
      startTime: '5m',
    },

    // Burst testing
    burst_test: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 15,
      maxVUs: 25,
      startTime: '7m',
    },
  },

  thresholds: {
    // Overall performance thresholds
    checks: ['rate>=0.90'],
    http_req_duration: ['avg<15000', 'p(95)<30000', 'p(99)<60000'],
    http_req_failed: ['rate<0.10'],
    http_reqs: ['rate>=50'],

    // Error rate thresholds by scenario
    'http_req_failed{scenario:ramp_up}': ['rate<0.05'],
    'http_req_failed{scenario:sustained_load}': ['rate<0.08'],
    'http_req_failed{scenario:spike_test}': ['rate<0.15'],
    'http_req_failed{scenario:burst_test}': ['rate<0.20'],
  },

  noConnectionReuse: true,
  // Add connection settings to handle EOF errors
  // Increase timeouts to handle file uploads
};

// Custom metrics for tracking
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');
const responseTime = new Trend('response_time');

export default function () {
  const scenario = __ENV.SCENARIO || 'stress';

  // Test v2 batch announcement with different scenarios
  group('v2/batchAnnouncement - Stress Testing', () => {
    const scenarios = ['small', 'medium', 'large', 'mixed'];
    const selectedScenario = scenarios[randomIntBetween(0, scenarios.length - 1)];

    const url = `${BASE_URL}/v2/content/batchAnnouncement`;
    const batchData = createRealisticBatchData(BATCH_SCENARIOS[selectedScenario].fileCount, {
      fileSize: BATCH_SCENARIOS[selectedScenario].fileSize,
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    const request = http.post(url, JSON.stringify(batchData), params);

    // Track metrics
    if (request.status === 202) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
    responseTime.add(request.timings.duration);

    check(request, {
      'v2 stress - status is 202': (r) => r.status === 202,
      'v2 stress - response time < 20s': (r) => r.timings.duration < 20000,
      'v2 stress - has response body': (r) => r.body.length > 0,
    });

    sleep(randomIntBetween(2, 8));
  });

  // Test v3 batch announcement with multipart form data
  group('v3/batchAnnouncement - Multipart Stress', () => {
    const fileCount = randomIntBetween(1, 3); // Keep small to avoid overwhelming
    const formData = createMultipartBatchData(fileCount, { fileSize: 'sm' });

    const url = `${BASE_URL}/v3/content/batchAnnouncement`;

    // No need to set Content-Type header - k6 will set it automatically for multipart
    const request = http.post(url, formData);

    // Track metrics
    if (request.status === 202) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
    responseTime.add(request.timings.duration);

    check(request, {
      'v3 multipart stress - status is 202': (r) => r.status === 202,
      'v3 multipart stress - response time < 40s': (r) => r.timings.duration < 40000,
      'v3 multipart stress - has referenceId': (r) => {
        try {
          const response = JSON.parse(r.body);
          return response.referenceId !== undefined;
        } catch {
          return false;
        }
      },
    });

    sleep(randomIntBetween(10, 20)); // Longer sleep for file uploads
  });

  // Test concurrent batch processing
  group('Concurrent Batch Processing - Stress', () => {
    const concurrentCount = randomIntBetween(3, 10);
    const responses = [];
    let totalDuration = 0;
    let successCount = 0;

    for (let i = 0; i < concurrentCount; i++) {
      const url = `${BASE_URL}/v2/content/batchAnnouncement`;
      const batchData = createRealisticBatchData(randomIntBetween(1, 3), { fileSize: 'sm' });
      const params = {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      };

      const response = http.post(url, JSON.stringify(batchData), params);
      responses.push(response);

      // Track metrics for concurrent requests
      if (response.status === 202) {
        successfulRequests.add(1);
        successCount++;
      } else {
        failedRequests.add(1);
      }
      responseTime.add(response.timings.duration);
      totalDuration += response.timings.duration;
    }

    check(responses, {
      'concurrent stress - all successful': (r) => successCount === concurrentCount,
      'concurrent stress - avg response time < 25s': (r) => {
        const avgTime = totalDuration / concurrentCount;
        return avgTime < 25000;
      },
    });

    sleep(randomIntBetween(3, 8));
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
        Accept: 'application/json',
      },
    };

    const request = http.post(url, JSON.stringify(body), params);

    check(request, {
      'error stress - appropriate error status': (r) => r.status >= 400 && r.status < 500,
      'error stress - response time < 5s': (r) => r.timings.duration < 5000,
    });

    sleep(randomIntBetween(1, 3));
  });

  // Test large batch processing (v2)
  group('Large Batch Processing - Stress', () => {
    const url = `${BASE_URL}/v2/content/batchAnnouncement`;
    const batchData = createRealisticBatchData(10, { fileSize: 'lg' });
    const params = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    const request = http.post(url, JSON.stringify(batchData), params);

    check(request, {
      'large batch stress - status is 202': (r) => r.status === 202,
      'large batch stress - response time < 60s': (r) => r.timings.duration < 60000,
    });

    sleep(randomIntBetween(10, 20));
  });

  // Test large file uploads (v3)
  group('Large File Uploads - Stress', () => {
    const url = `${BASE_URL}/v3/content/batchAnnouncement`;
    const formData = createMultipartBatchData(1, { fileSize: 'md' }); // Use medium size to avoid overwhelming

    const request = http.post(url, formData);

    check(request, {
      'large file upload stress - status is 202': (r) => r.status === 202,
      'large file upload stress - response time < 60s': (r) => r.timings.duration < 60000,
    });

    sleep(randomIntBetween(15, 25)); // Longer sleep for large file uploads
  });

  // Test maximum batch limits
  group('Maximum Batch Limits - Stress', () => {
    const url = `${BASE_URL}/v2/content/batchAnnouncement`;
    const maxBatchData = createRealisticBatchData(BATCH_CONSTANTS.MAX_FILES_PER_BATCH, { fileSize: 'sm' });
    const params = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
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
        Accept: 'application/json',
      },
    };

    const request = http.post(url, JSON.stringify(warmupData), params);
    if (request.status !== 202) {
      console.warn(`Warmup request ${i} failed with status ${request.status}`);
    }
  }

  return {
    startTime: new Date().toISOString(),
    testType: 'stress',
  };
}

// Teardown function for stress test
export function teardown(data) {
  console.log('Completing batch announcement stress test...');
  console.log(`Test started at: ${data.startTime}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);

  // Note: Custom metrics are handled in handleSummary
  console.log('Test completed. Check the summary for detailed metrics.');
}

// Custom metrics tracking
export function handleSummary(data) {
  const testStartTime = new Date().toISOString();
  const testEndTime = new Date().toISOString();

  console.log('\n' + '='.repeat(80));
  console.log('BATCH ANNOUNCEMENT STRESS TEST SUMMARY');
  console.log('='.repeat(80));

  console.log(`Test Type: batch-announcement-stress`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Test started at: ${testStartTime}`);
  console.log(`Test completed at: ${testEndTime}`);
  console.log('');

  // Get metrics from data
  const successfulCount = data.metrics.successful_requests?.values?.count || 0;
  const failedCount = data.metrics.failed_requests?.values?.count || 0;
  const avgResponseTime = data.metrics.response_time?.values?.avg || 0;
  const totalRequests = successfulCount + failedCount;
  const successRate = totalRequests > 0 ? ((successfulCount / totalRequests) * 100).toFixed(2) : '0.00';

  // Basic summary
  console.log('BASIC METRICS');
  console.log('-'.repeat(40));
  console.log(`Total successful requests: ${successfulCount}`);
  console.log(`Total failed requests: ${failedCount}`);
  console.log(`Total requests: ${totalRequests}`);
  console.log(`Success rate: ${successRate}%`);
  console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
  console.log('');

  // Detailed HTTP metrics
  console.log('HTTP METRICS');
  console.log('-'.repeat(40));
  if (data.metrics.http_req_duration) {
    const duration = data.metrics.http_req_duration.values;
    console.log(`HTTP Request Duration:`);
    console.log(`  Average: ${duration.avg?.toFixed(2)}ms`);
    console.log(`  Median: ${duration.med?.toFixed(2)}ms`);
    console.log(`  P95: ${duration['p(95)']?.toFixed(2)}ms`);
    console.log(`  P99: ${duration['p(99)']?.toFixed(2)}ms`);
    console.log(`  Min: ${duration.min?.toFixed(2)}ms`);
    console.log(`  Max: ${duration.max?.toFixed(2)}ms`);
  }

  if (data.metrics.http_reqs) {
    const reqs = data.metrics.http_reqs.values;
    console.log(`HTTP Requests:`);
    console.log(`  Rate: ${reqs.rate?.toFixed(2)} req/s`);
    console.log(`  Count: ${reqs.count}`);
  }

  if (data.metrics.http_req_failed) {
    const failed = data.metrics.http_req_failed.values;
    console.log(`HTTP Request Failures:`);
    console.log(`  Rate: ${failed.rate?.toFixed(2)} failed/s`);
    console.log(`  Percentage: ${((failed.rate / (data.metrics.http_reqs?.values?.rate || 1)) * 100).toFixed(2)}%`);
  }
  console.log('');

  if (
    (!data.thresholds?.passed || data.thresholds.passed.length === 0) &&
    (!data.thresholds?.failed || data.thresholds.failed.length === 0)
  ) {
    console.log('No thresholds defined');
  }
  console.log('');
  console.log('='.repeat(80));
  console.log('SUMMARY COMPLETE');
  console.log('='.repeat(80) + '\n');

  // Return empty object to prevent file generation
  return {};
}
