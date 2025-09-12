#!/usr/bin/env node

/**
 * Rate Limiting Test Script
 *
 * This script tests the rate limiting functionality of the Account API service.
 * It's designed to run independently and is NOT included in CI.
 *
 * Usage:
 *   node test-scripts/rate-limiting-test.js [options]
 *
 * Options:
 *   --url <url>              Base URL of the service (default: http://localhost:3013)
 *   --endpoint <endpoint>    Endpoint to test (default: /healthz)
 *   --concurrent <number>    Number of concurrent requests (default: 10)
 *   --total <number>         Total number of requests to send (default: 150)
 *   --interval <ms>          Interval between request batches in ms (default: 100)
 *   --verbose                Enable verbose logging
 *
 * Example:
 *   node test-scripts/rate-limiting-test.js --url http://localhost:3001 --total 200 --concurrent 15
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration with defaults
const config = {
  baseUrl: 'http://localhost:3013',
  endpoint: '/healthz',
  concurrentRequests: 10,
  totalRequests: 150,
  intervalMs: 100,
  verbose: false,
  timeout: 5000,
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        config.baseUrl = args[++i];
        break;
      case '--endpoint':
        config.endpoint = args[++i];
        break;
      case '--concurrent':
        config.concurrentRequests = parseInt(args[++i], 10);
        break;
      case '--total':
        config.totalRequests = parseInt(args[++i], 10);
        break;
      case '--interval':
        config.intervalMs = parseInt(args[++i], 10);
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--help':
        console.log(`
Rate Limiting Test Script

Usage: node test-scripts/rate-limiting-test.js [options]

Options:
  --url <url>              Base URL of the service (default: ${config.baseUrl})
  --endpoint <endpoint>    Endpoint to test (default: ${config.endpoint})
  --concurrent <number>    Number of concurrent requests (default: ${config.concurrentRequests})
  --total <number>         Total number of requests to send (default: ${config.totalRequests})
  --interval <ms>          Interval between request batches in ms (default: ${config.intervalMs})
  --verbose                Enable verbose logging

Example:
  node test-scripts/rate-limiting-test.js --url http://localhost:3001 --total 200 --concurrent 15
        `);
        process.exit(0);
        break;
      default:
        console.warn(`Unknown argument: ${args[i]}`);
    }
  }
}

// Make HTTP request
function makeRequest(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const startTime = Date.now();

    const req = client.request(
      urlObj,
      {
        method: 'GET',
        timeout: config.timeout,
        headers: {
          'User-Agent': 'RateLimitTest/1.0',
          Accept: 'application/json',
        },
      },
      (res) => {
        const duration = Date.now() - startTime;
        let body = '';

        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
            duration,
            timestamp: new Date().toISOString(),
          });
        });
      },
    );

    req.on('error', (error) => {
      resolve({
        statusCode: 0,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 0,
        error: 'Request timeout',
        duration: config.timeout,
        timestamp: new Date().toISOString(),
      });
    });

    req.end();
  });
}

// Send batch of concurrent requests
async function sendRequestBatch(batchNumber, requestsInBatch) {
  const url = `${config.baseUrl}${config.endpoint}`;
  const promises = [];

  for (let i = 0; i < requestsInBatch; i++) {
    promises.push(makeRequest(url));
  }

  const results = await Promise.all(promises);

  if (config.verbose) {
    console.log(`\nBatch ${batchNumber} results:`);
    results.forEach((result, index) => {
      console.log(`  Request ${index + 1}: ${result.statusCode} (${result.duration}ms)`);
      if (result.statusCode === 429) {
        console.log(`    Rate limited! Headers:`, result.headers);
      }
    });
  }

  return results;
}

// Analyze results
function analyzeResults(allResults) {
  const statusCounts = {};
  const durations = [];
  let rateLimitedRequests = 0;
  let successfulRequests = 0;
  let errorRequests = 0;

  allResults.forEach((result) => {
    const status = result.statusCode || 'error';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (result.duration) {
      durations.push(result.duration);
    }

    if (result.statusCode === 429) {
      rateLimitedRequests++;
    } else if (result.statusCode >= 200 && result.statusCode < 300) {
      successfulRequests++;
    } else {
      errorRequests++;
    }
  });

  durations.sort((a, b) => a - b);
  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const medianDuration = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0;

  return {
    statusCounts,
    rateLimitedRequests,
    successfulRequests,
    errorRequests,
    totalRequests: allResults.length,
    avgDuration: Math.round(avgDuration),
    medianDuration,
    minDuration: durations[0] || 0,
    maxDuration: durations[durations.length - 1] || 0,
  };
}

// Main test function
async function runRateLimitTest() {
  console.log('🚀 Starting Rate Limiting Test');
  console.log('================================');
  console.log(`Target URL: ${config.baseUrl}${config.endpoint}`);
  console.log(`Concurrent requests per batch: ${config.concurrentRequests}`);
  console.log(`Total requests: ${config.totalRequests}`);
  console.log(`Interval between batches: ${config.intervalMs}ms`);
  console.log(`Verbose logging: ${config.verbose ? 'enabled' : 'disabled'}`);
  console.log('');

  const allResults = [];
  const startTime = Date.now();
  let requestsSent = 0;
  let batchNumber = 1;

  while (requestsSent < config.totalRequests) {
    const requestsInThisBatch = Math.min(config.concurrentRequests, config.totalRequests - requestsSent);

    console.log(
      `📦 Sending batch ${batchNumber} (${requestsInThisBatch} requests)... [${requestsSent + 1}-${requestsSent + requestsInThisBatch}/${config.totalRequests}]`,
    );

    const batchResults = await sendRequestBatch(batchNumber, requestsInThisBatch);
    allResults.push(...batchResults);
    requestsSent += requestsInThisBatch;
    batchNumber++;

    // Quick status update
    const rateLimited = batchResults.filter((r) => r.statusCode === 429).length;
    const successful = batchResults.filter((r) => r.statusCode >= 200 && r.statusCode < 300).length;
    console.log(`   ✅ ${successful} successful, ⚠️  ${rateLimited} rate limited`);

    // Wait before next batch (except for the last batch)
    if (requestsSent < config.totalRequests) {
      await new Promise((resolve) => setTimeout(resolve, config.intervalMs));
    }
  }

  const totalDuration = Date.now() - startTime;

  console.log('\n📊 Test Results');
  console.log('================');

  const analysis = analyzeResults(allResults);

  console.log(`Total requests sent: ${analysis.totalRequests}`);
  console.log(`Total duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
  console.log(`Requests per second: ${(analysis.totalRequests / (totalDuration / 1000)).toFixed(2)}`);
  console.log('');

  console.log('Status Code Distribution:');
  Object.entries(analysis.statusCounts).forEach(([status, count]) => {
    const percentage = ((count / analysis.totalRequests) * 100).toFixed(1);
    const icon = status === '200' ? '✅' : status === '429' ? '⚠️ ' : '❌';
    console.log(`  ${icon} ${status}: ${count} (${percentage}%)`);
  });
  console.log('');

  console.log('Performance Metrics:');
  console.log(`  Average response time: ${analysis.avgDuration}ms`);
  console.log(`  Median response time: ${analysis.medianDuration}ms`);
  console.log(`  Min response time: ${analysis.minDuration}ms`);
  console.log(`  Max response time: ${analysis.maxDuration}ms`);
  console.log('');

  // Rate limiting analysis
  console.log('Rate Limiting Analysis:');
  console.log(`  Successful requests: ${analysis.successfulRequests}`);
  console.log(`  Rate limited requests: ${analysis.rateLimitedRequests}`);
  console.log(`  Error requests: ${analysis.errorRequests}`);

  if (analysis.rateLimitedRequests > 0) {
    console.log(`  ✅ Rate limiting is working! ${analysis.rateLimitedRequests} requests were throttled.`);
  } else {
    console.log(`  ⚠️  No requests were rate limited. Consider increasing the request load or checking configuration.`);
  }

  // Summary
  const successRate = ((analysis.successfulRequests / analysis.totalRequests) * 100).toFixed(1);
  const rateLimitRate = ((analysis.rateLimitedRequests / analysis.totalRequests) * 100).toFixed(1);

  console.log('\n🎯 Summary');
  console.log('===========');
  console.log(`Success rate: ${successRate}%`);
  console.log(`Rate limit rate: ${rateLimitRate}%`);

  if (analysis.rateLimitedRequests > 0) {
    console.log('✅ Rate limiting test PASSED - Rate limiting is functioning correctly!');
  } else {
    console.log('❌ Rate limiting test FAILED - No rate limiting detected!');
    console.log('   Consider:');
    console.log('   - Increasing the number of requests (--total)');
    console.log('   - Increasing concurrent requests (--concurrent)');
    console.log('   - Decreasing the interval between batches (--interval)');
    console.log('   - Checking if rate limiting is properly configured');
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Main execution
if (require.main === module) {
  parseArgs();
  runRateLimitTest().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { runRateLimitTest, config };
