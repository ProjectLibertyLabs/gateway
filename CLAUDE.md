# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Frequency Developer Gateway** - a NestJS monorepo containing microservices that bridge Web2 and Web3 development by abstracting complex blockchain interactions with the Frequency network.

### Architecture

**Monorepo Structure:**

- **Apps** (9 services): Independent microservices with API endpoints and background workers
- **Libs** (16 libraries): Shared functionality and utilities

**Core Services:**

- **Account** (`account-api` + `account-worker`): User account management, authentication via Sign In With Frequency
- **Content Publishing** (`content-publishing-api` + `content-publishing-worker`): Content creation, file upload, IPFS storage, blockchain publishing
- **Content Watcher** (`content-watcher`): Blockchain monitoring for content changes

**Key Libraries:**

- **blockchain**: Polkadot API integration, Frequency chain interactions
- **queue**: BullMQ job processing with Redis
- **cache**: Redis caching layer
- **storage**: IPFS and file storage management
- **types**: Shared TypeScript definitions, DTOs, interfaces

## Development Commands

### Building

```bash
# Build all services
npm run build

# Build specific services
npm run build:account
npm run build:content-publishing
npm run build:content-watcher
npm run build:libs
```

### Running Services

```bash
# Start individual services in development mode
npm run start:account-api:dev
npm run start:content-publishing-api:dev
npm run start:content-watcher:dev

# Start workers
npm run start:account-worker:dev
npm run start:content-publishing-worker:dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests for specific services
npm run test:account
npm run test:content-publishing
npm run test:content-watcher
npm run test:libs

# Run specific library tests
npm run test:libs:blockchain
npm run test:libs:queue
npm run test:libs:storage

# Run E2E tests
npm run test:e2e:account
npm run test:e2e:content-publishing

# Run single test file
jest path/to/test.spec.ts
```

### Linting and Formatting

```bash
# Lint all code
npm run lint

# Lint specific services
npm run lint:account
npm run lint:content-publishing
npm run lint:libs

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Spell check
npm run spellcheck
```

### OpenAPI Documentation Generation

```bash
# Generate all OpenAPI specs
npm run generate:openapi

# Generate for specific services
npm run generate:openapi:account
npm run generate:openapi:content-publishing

# Generate Swagger UI documentation
npm run generate:swagger-ui
```

### Load Testing

```bash
# Run k6 load tests
npm run test:k6:account
npm run test:k6:content-publishing

# Run specific scenarios
SCENARIO=light k6 run apps/content-publishing-api/k6-test/batch-announcement-load.k6.js
```

## Architecture Patterns

### Import Path Aliases

Uses `#` prefix for internal module resolution:

- `#account-api/*` → `apps/account-api/src/*`
- `#content-publishing-lib/*` → `libs/content-publishing-lib/src/*`
- `#blockchain` → `libs/blockchain/src`
- `#queue` → `libs/queue/src`
- `#types` → `libs/types/src`
- `#validation` → `libs/types/src/validation`

### Queue Architecture

Each service uses BullMQ with Redis for background job processing:

**Content Publishing Queues:**

- `REQUEST_QUEUE_NAME`: Incoming announcement requests
- `ASSET_QUEUE_NAME`: File upload processing
- `BATCH_QUEUE_NAME`: Batching announcements for efficiency
- `PUBLISH_QUEUE_NAME`: Publishing to blockchain

**Queue Processing Flow:**

1. API receives request → enqueues job
2. Worker processes job → transforms data
3. Publishes to blockchain via batch transactions
4. Monitors transaction status

### Service Communication

- **API Layer**: REST endpoints with OpenAPI/Swagger documentation
- **Worker Layer**: Background job processors using BullMQ
- **Blockchain Layer**: Polkadot API integration for Frequency chain
- **Storage Layer**: IPFS for content, Redis for caching, file system for temporary storage

### Configuration Management

- Environment-specific `.env` files for each service
- Template files in `env-files/` directory
- Joi validation schemas for configuration
- Service-specific config modules in each app

### Database/Storage Architecture

- **No traditional database** - leverages blockchain as source of truth
- **Redis**: Caching, job queues, temporary data storage
- **IPFS**: Persistent content storage
- **Blockchain**: Permanent record storage on Frequency chain

## Testing Architecture

### Test Structure

- **Unit tests**: `.spec.ts` files alongside source code
- **E2E tests**: `.e2e-spec.ts` files in each app's test directory
- **Load tests**: k6 scripts in each app's `k6-test/` directory
- **Mocks**: Shared mocks in `__mocks__/` directory

### Module Path Mapping

Jest configuration maps `#` aliases to actual paths, matching TypeScript configuration.

## Key Development Practices

### Error Handling

- Use NestJS HTTP exceptions (`BadRequestException`, `InternalServerErrorException`)
- Blockchain errors are wrapped and handled gracefully
- Queue job failures use exponential backoff retry strategies

### Logging

- Uses Pino logger with structured JSON output
- Set `PRETTY=true` for human-readable development logs
- Log levels: `error`, `warn`, `info`, `debug`, `trace`

### Capacity Management

- Services check Frequency blockchain capacity before operations
- Automatic pausing/resuming of queues based on capacity
- Graceful handling of capacity exhaustion

### Transaction Monitoring

- All blockchain transactions are monitored for finality
- Status tracking via Redis with transaction hash keys
- Automatic cleanup of completed/failed transactions

## File Organization Patterns

### Apps Structure

```
apps/[service-name]/
├── src/
│   ├── controllers/     # REST API endpoints
│   ├── services/        # Business logic
│   ├── [feature]/       # Feature-specific modules
│   ├── interfaces/      # Service-specific interfaces
│   ├── *.config.ts      # Configuration schemas
│   └── main.ts          # Application entry point
├── test/               # E2E tests
└── k6-test/           # Load tests
```

### Libs Structure

```
libs/[lib-name]/
├── src/
│   ├── *.service.ts    # Shared services
│   ├── interfaces/     # TypeScript interfaces
│   ├── dtos/          # Data transfer objects
│   ├── enums/         # Shared enumerations
│   └── index.ts       # Public API exports
└── tsconfig.lib.json  # Library-specific TypeScript config
```

This architecture enables independent development and deployment of each microservice while sharing common functionality through well-defined library boundaries.
