# k6 Load and Stress Testing

This document provides comprehensive information about the k6 load and stress testing setup for the Frequency Developer Gateway microservices.

## Overview

The Gateway project includes extensive k6 load and stress testing capabilities across all microservices. These tests help ensure the reliability, performance, and scalability of the Gateway services under various load conditions.

## Prerequisites

Before running k6 tests, ensure you have:

1. **k6 installed**: Download from [k6.io](https://k6.io/docs/getting-started/installation/)
2. **Gateway services running**: Use `./start.sh` to start all services locally
3. **Node.js (v18+)**: Required for generating test data and running helper scripts

## Port Configuration

The Gateway services use different ports when running in Docker containers:

| Service | Internal Port | External Port (Docker) | Purpose |
|---------|---------------|------------------------|---------|
| Content Publishing API | 3000 | 3010 | Main API endpoints |
| Content Publishing Worker | 3000 | 3020 | Background processing |
| Content Watcher | 3000 | 3011 | Content monitoring |
| Graph API | 3000 | 3012 | Social graph operations |
| Graph Worker | 3000 | 3022 | Background processing |
| Account API | 3000 | 3013 | Account management |

**Note**: The k6 tests are configured to target the appropriate ports:
- **Standard tests** (health checks, v1 endpoints) target port 3000
- **v2 batch announcement tests** target port 3010 (Docker external port)
- **File upload tests** target port 3000 (internal container port)

## Available Test Suites

### Account Service (`apps/account-api/k6-test/`)

| Test File | Description | Purpose |
|-----------|-------------|---------|
| `health-check.k6.js` | Basic health check endpoint testing | Verify service availability |
| `new-sign-up.k6.js` | User registration flow testing | Test account creation performance |
| `account-service-load.k6.js` | Comprehensive API load testing | Full service load testing (currently skipped) |
| `signups.gen.js` | Generated test data | Pre-generated signup payloads |

**Key Features:**
- Test data generation with `npm run generate:signup`
- Realistic signup payloads to avoid blockchain interaction
- Health check validation before main tests

### Content Publishing Service (`apps/content-publishing-api/k6-test/`)

| Test File | Description | Purpose | Port |
|-----------|-------------|---------|------|
| `health-check.k6.js` | Basic health check endpoint testing | Verify service availability | 3000 |
| `script.k6.js` | Standard API load testing | General service performance | 3000 |
| `batch-announcement-load.k6.js` | Batch content publishing load testing | Test batch announcement performance | 3010 |
| `batch-announcement-stress.k6.js` | Advanced stress testing | Comprehensive stress scenarios | 3010 |
| `script_sm_files.k6.js` | Small file upload testing | Test small file handling | 3000 |
| `script_md_files.k6.js` | Medium file upload testing | Test medium file handling | 3000 |
| `script_lg_files.k6.js` | Large file upload testing | Test large file handling | 3000 |

**Key Features:**
- Multiple load scenarios (light, medium, heavy, burst)
- File size-specific testing
- Realistic batch data generation
- Comprehensive stress testing with multiple phases

**Port Configuration:**
- **Port 3000**: Standard API endpoints (v1), health checks, and file upload tests
- **Port 3010**: v2 and v3 batch announcement endpoints (mapped from Docker container port)

### Content Watcher Service (`apps/content-watcher/k6-test/`)

| Test File | Description | Purpose |
|-----------|-------------|---------|
| `health-check.k6.js` | Basic health check endpoint testing | Verify service availability |

**Key Features:**
- Simple health check validation
- Service availability testing

### Graph Service (`apps/graph-api/k6-test/`)

| Test File | Description | Purpose |
|-----------|-------------|---------|
| `health-check.k6.js` | Basic health check endpoint testing | Verify service availability |
| `script.js` | Standard API load testing | General service performance |

**Key Features:**
- Social graph operation testing
- Relationship management performance testing

## Test Scenarios

### Load Testing Scenarios

The content publishing service includes predefined load testing scenarios:

#### Light Load
- **VUs**: 5
- **Duration**: 30s
- **Purpose**: Basic functionality testing
- **Thresholds**: 99% success rate, <2s avg response time

#### Medium Load
- **VUs**: 20
- **Duration**: 60s
- **Purpose**: Normal operation testing
- **Thresholds**: 98% success rate, <5s avg response time

#### Heavy Load
- **VUs**: 200
- **Duration**: 120s
- **Purpose**: Stress testing
- **Thresholds**: 90% success rate, <10s avg response time

#### Burst Load
- **Stages**: Ramp up → Spike → Ramp down
- **Purpose**: Spike testing
- **Thresholds**: 90% success rate, <15s avg response time

### Stress Testing Phases

The stress testing includes multiple phases:

1. **Ramp-up Phase**: Gradual increase from 1 to 10 VUs over 90s
2. **Sustained Load**: Constant 10 VUs for 2 minutes
3. **Spike Testing**: Arrival rate testing with up to 25 requests/second
4. **Burst Testing**: High-intensity burst of 50 requests/second for 1 minute

## Running Tests

### Basic Health Check
```bash
cd apps/[service-name]/k6-test
k6 run health-check.k6.js
```

### Load Testing with Specific Scenario
```bash
cd apps/content-publishing-api/k6-test
SCENARIO=heavy k6 run batch-announcement-load.k6.js
```

### Stress Testing
```bash
cd apps/content-publishing-api/k6-test
k6 run batch-announcement-stress.k6.js
```

### File Size Testing
```bash
cd apps/content-publishing-api/k6-test
k6 run script_sm_files.k6.js  # Small files
k6 run script_md_files.k6.js  # Medium files
k6 run script_lg_files.k6.js  # Large files
```

## Test Data Generation

### Account Service
```bash
cd apps/account-api/k6-test
npm run generate:signup
```

This generates 100 valid signup payloads in `signups.gen.js` to avoid blockchain interaction during testing.

### Content Publishing Service
The service includes helper functions in `helpers.js` for generating realistic test data:
- `createRealisticBatchData()`: Creates realistic batch announcement data
- `createMultipartBatchData()`: Creates multipart form data for file uploads
- Various file size scenarios and error conditions

## Configuration Options

### Environment Variables

- `SCENARIO`: Select load testing scenario (light, medium, heavy, burst)
- `BASE_URL`: Override default service URL (defaults to localhost)

### k6 Options

Each test file includes configurable options:
- Virtual Users (VUs)
- Test duration
- Performance thresholds
- Connection settings
- Custom metrics

## Performance Thresholds

### Standard Thresholds
- **Success Rate**: ≥90-99% depending on scenario
- **Response Time**: <2-15s average depending on scenario
- **Error Rate**: <1-20% depending on scenario
- **Request Rate**: Varies by test type

### Custom Metrics
- Successful requests counter
- Failed requests counter
- Response time trends
- Scenario-specific error rates

## CI/CD Integration

The project includes CI/CD tools in `tools/ci-k6/` for automated testing:
- Chain setup scripts for testnet testing
- Automated test execution
- Performance reporting

## Troubleshooting

### Debug Mode
Run tests with verbose output:
```bash
k6 run --verbose health-check.k6.js
```

For more information about k6, visit the [official documentation](https://k6.io/docs/).
