# Running Gateway Services

In this section, you will find instructions to help you quickly set up Gateway Services. After testing your application with Gateway Services in your local environment, you can proceed to more advanced deployment options.

Every deployment and production environment is unique. Therefore, we recommend testing your application in a staging environment before deploying it to production. The guides in this section will assist you in getting started with the basics of deploying Gateway Services in various environments, including AWS, Kubernetes, and more.

Look for the Quick Start guide in the Run Gateway Services section to get started with Gateway Services in less than 5 minutes.

<div class="button-links">

[Run Gateway Services](./GatewayServices/RunGatewayServices.md)

</div>

## Deployment Quick Reference

Refer to the following sections to get a quick overview of the minimum requirements for deploying individual Gateway Services in different environments.

### Gateway Service Common Requirements

The following environment variables are common to all Gateway Services. This snippet from the `docker-compose.yaml` file details the `x-common-environment` section that is required and shared across all services. Each service will have its own environment variables in addition to these common variables. Environment variables defined with the `${NAME}` syntax read their values from the shell `env`, e.g. `export NAME=VALUE`. See below for more details.

```yaml
  FREQUENCY_API_WS_URL: ${FREQUENCY_API_WS_URL:-wss://0.rpc.testnet.amplica.io}
  SIWF_NODE_RPC_URL: ${SIWF_NODE_RPC_URL:-https://0.rpc.testnet.amplica.io}
  REDIS_URL: 'redis://redis:6379'
  PROVIDER_ID: ${PROVIDER_ID:-1}
  PROVIDER_ACCOUNT_SEED_PHRASE: ${PROVIDER_ACCOUNT_SEED_PHRASE:-//Alice}
  WEBHOOK_FAILURE_THRESHOLD: 3
  WEBHOOK_RETRY_INTERVAL_SECONDS: 10
  HEALTH_CHECK_MAX_RETRIES: 4
  HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: 10
  HEALTH_CHECK_SUCCESS_THRESHOLD: 10
  CAPACITY_LIMIT: '{"type":"percentage", "value":80}'
  SIWF_URL: 'https://projectlibertylabs.github.io/siwf/v1/ui'
  IPFS_ENDPOINT: ${IPFS_ENDPOINT:-http://ipfs:5001}
  IPFS_GATEWAY_URL: ${IPFS_GATEWAY_URL:-https://ipfs.io/ipfs/[CID]}
  IPFS_BASIC_AUTH_USER: ${IPFS_BASIC_AUTH_USER:-""}
  IPFS_BASIC_AUTH_SECRET: ${IPFS_BASIC_AUTH_SECRET:-""}
  QUEUE_HIGH_WATER: 1000
  CHAIN_ENVIRONMENT: 'dev'
```

Each service requires connection to a Redis instance. The `REDIS_URL` environment variable is set to `redis://redis:6379` by default. If you are using a different Redis instance, you can set the `REDIS_URL` environment variable to the appropriate connection string.

Each service also requires a docker network (or equivalent) to connect to any other containers. The default network is set to `gateway_net`. If you are using a different network, you can edit the `networks:` environment variable in the `docker-compose.yaml` to the appropriate network name.

Some services require a connection to an IPFS instance. See the [IPFS Setup Guide](./IPFS.md) for more information.

See the [docker-compose.yaml](https://github.com/projectlibertylabs/gateway/blob/main/deployment/swarm/docker-compose.yaml) for examples of redis and ipfs services.

### Account Service

- Docker image: `projectlibertylabs/account-service`
- Dependencies: Redis
- API Ports: `3000`
- Inter-Service Ports: `3001, 6379, 9944`
- Docker Compose Services
  - account-service-api `command: account-api`
  - account-service-worker `command: account-worker`
- Environment Variables: [Account Service Environment Variables](https://github.com/projectlibertylabs/gateway/blob/main/developer-docs/account/ENVIRONMENT.md)
- Account Service Specific Environment Variables:

```yaml
  BLOCKCHAIN_SCAN_INTERVAL_SECONDS: 1
  TRUST_UNFINALIZED_BLOCKS: 'true'
  WEBHOOK_BASE_URL: 'http://your-app.com:${ACCOUNT_WEBHOOK_PORT:-3001}/webhooks/account-service'
  GRAPH_ENVIRONMENT_TYPE: 'Mainnet'
  CACHE_KEY_PREFIX: 'account:'
  SIWF_V2_URI_VALIDATION: 'localhost'
```

### Graph Service

- Docker image: `projectlibertylabs/graph-service`
- Dependencies: Redis, IPFS
- API Ports: `3000`
- Inter-Service Ports: `6379, 9944`
- Docker Compose Services
  - graph-service-api `START_PROCESS: graph-api`
  - graph-service-worker `START_PROCESS: graph-worker`
- Environment Variables: [Graph Service Environment Variables](https://github.com/projectlibertylabs/gateway/blob/main/developer-docs/graph/ENVIRONMENT.md)
- Graph Service Specific Environment Variables:

```yaml
  DEBOUNCE_SECONDS: 10
  GRAPH_ENVIRONMENT_TYPE: 'Mainnet'
  RECONNECTION_SERVICE_REQUIRED: 'false'
  CACHE_KEY_PREFIX: 'graph:'
  AT_REST_ENCRYPTION_KEY_SEED: 'This should get injected as a secret'
```

### Content Publishing Service

- Docker image: `projectlibertylabs/content-publishing-service`
- Dependencies: Redis, IPFS
- API Ports: `3000`
- Inter-Service Ports: `6379, 9944`
- Docker Compose Services
  - content-publishing-service-api `START_PROCESS: content-publishing-api`
  - content-publishing-service-worker `START_PROCESS: content-publishing-worker`
- Environment Variables: [Content Publishing Service Environment Variables](https://github.com/projectlibertylabs/gateway/blob/main/developer-docs/content-publishing/ENVIRONMENT.md)
- Content Publishing Specific Environment Variables:

```yaml
  START_PROCESS: content-publishing-api
  FILE_UPLOAD_MAX_SIZE_IN_BYTES: 500000000
  FILE_UPLOAD_COUNT_LIMIT: 10
  ASSET_EXPIRATION_INTERVAL_SECONDS: 300
  BATCH_INTERVAL_SECONDS: 12
  BATCH_MAX_COUNT: 1000
  ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS: 5
  CACHE_KEY_PREFIX: 'content-publishing:'
```

### Content Watcher Service

- Docker image: `projectlibertylabs/content-watcher-service`
- Dependencies: Redis, IPFS
- API Ports: `3000`
- Inter-Service Ports: `6379, 9944`
- Docker Compose
  - content-watcher-service
- Environment Variables: [Content Watcher Service Environment Variables](https://github.com/projectlibertylabs/gateway/blob/main/developer-docs/content-watcher/ENVIRONMENT.md)
- Content Watcher Specific Environment Variables:

```yaml
  STARTING_BLOCK: 759882
  BLOCKCHAIN_SCAN_INTERVAL_SECONDS: 6
  WEBHOOK_FAILURE_THRESHOLD: 4
  CACHE_KEY_PREFIX: 'content-watcher:'
```

## Other Deployment Guides

- [Configuring and Managing Scalability](./Scalability.md)
- [Deployment on AWS](./Deployment.md)
- [Deployment with Kubernetes](./Kubernetes.md)
- [Monitoring with AWS CloudWatch](./Monitoring.md)
- [NGINX Ingress](./Nginx.md)
- [Securing API Access with NGINX and Load Balancers](./Security.md)
- [Setting up IPFS](./IPFS.md)
- [Vault Integration](./Vault.md)
