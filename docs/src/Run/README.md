# Running  Frequency Developer Gateway Services

In this section, you will find instructions to help you quickly set up Gateway Services. After testing your application with Gateway Services in your local environment, you can proceed to more advanced deployment options.

Every deployment and production environment is unique. Therefore, we recommend testing your application in a staging environment before deploying it to production. The guides in this section will assist you in getting started with the basics of deploying Gateway Services in various environments, including AWS, Kubernetes, and more.

Look for the Quick Start guide in the Run Gateway Services section to get started with Gateway Services in less than 5 minutes.

<div class="button-links-outlined">
  <a href="./GatewayServices/RunGatewayServices.md">Running Frequency Developer Gateway Services</a>
</div>

## ** *DevOps Deployment Quick Reference* **

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
  IPFS_ENDPOINT: ${IPFS_ENDPOINT:-http://ipfs:5001/api/v0}
  IPFS_GATEWAY_URL: ${IPFS_GATEWAY_URL:-https://ipfs.io/ipfs/[CID]}
  IPFS_BASIC_AUTH_USER: ${IPFS_BASIC_AUTH_USER:-""}
  IPFS_BASIC_AUTH_SECRET: ${IPFS_BASIC_AUTH_SECRET:-""}
  QUEUE_HIGH_WATER: 1000
```

Each service requires connection to a Redis instance. The `REDIS_URL` environment variable is set to `redis://redis:6379` by default. If you are using a different Redis instance, you can set the `REDIS_URL` environment variable to the appropriate connection string.

Each service also requires a docker network (or equivalent) to connect to any other containers. The default network is set to `gateway-net`. If you are using a different network, you can edit the `networks:` environment variable in the `docker-compose.yaml` to the appropriate network name.

Some services require a connection to an IPFS instance. See the [IPFS Setup Guide](./IPFS.md) for more information.

See the [docker-compose-swarm.yaml](https://github.com/projectlibertylabs/gateway/blob/main/deployment/swarm/docker-compose-swarm.yaml) for examples of redis and ipfs services.

---
<br />

| **Account Service**            | **Details**                                                                                       |
|--------------------------------|---------------------------------------------------------------------------------------------------|
| **Docker Image**               | `projectlibertylabs/account-service`                                                              |
| **Dependencies**               | Redis                                                                                             |
| **API Ports**                  | `3000`                                                                                            |
| **Inter-Service Ports**        | `3001, 6379, 9944`                                                                                |
| **Docker Compose Services**    | account-service-api `command: account-api`                                                        |
|                                | account-service-worker `command: account-worker`                                                  |
| **Required Variables**         | [Account Service Environment Variables](https://github.com/projectlibertylabs/gateway/blob/main/developer-docs/account/ENVIRONMENT.md) |
|                                | BLOCKCHAIN_SCAN_INTERVAL_SECONDS                                                                  |
|                                | TRUST_UNFINALIZED_BLOCKS                                                                          |
|                                | WEBHOOK_BASE_URL                                                                                  |
|                                | GRAPH_ENVIRONMENT_TYPE                                                                            |
|                                | CACHE_KEY_PREFIX                                                                                  |
|                                | SIWF_V2_URI_VALIDATION                                                                            |

<br />

| **Graph Service**              | **Details**                                                                                       |
|--------------------------------|---------------------------------------------------------------------------------------------------|
| **Docker Image**               | `projectlibertylabs/graph-service`                                                                |
| **Dependencies**               | Redis                                                                                       |
| **API Ports**                  | `3000`                                                                                            |
| **Inter-Service Ports**        | `6379, 9944`                                                                                      |
| **Docker Compose Services**    | graph-service-api `START_PROCESS: graph-api`                                                      |
|                                | graph-service-worker `START_PROCESS: graph-worker`                                                |
| **Required Variables**         | [Graph Service Environment Variables](https://github.com/projectlibertylabs/gateway/blob/main/developer-docs/graph/ENVIRONMENT.md) |
|                                | DEBOUNCE_SECONDS                                                                                  |
|                                | GRAPH_ENVIRONMENT_TYPE                                                                            |
|                                | RECONNECTION_SERVICE_REQUIRED                                                                     |
|                                | CACHE_KEY_PREFIX                                                                                  |
|                                | AT_REST_ENCRYPTION_KEY_SEED                                                                       |

<br />

| **Content Publishing Service** | **Details**                                                                                       |
|--------------------------------|---------------------------------------------------------------------------------------------------|
| **Docker Image**               | `projectlibertylabs/content-publishing-service`                                                   |
| **Dependencies**               | Redis, IPFS                                                                                       |
| **API Ports**                  | `3000`                                                                                            |
| **Inter-Service Ports**        | `6379, 9944`                                                                                      |
| **Docker Compose Services**    | content-publishing-service-api `START_PROCESS: content-publishing-api`                            |
|                                | content-publishing-service-worker `START_PROCESS: content-publishing-worker`                      |
| **Required Variables**         | [Content Publishing Service Environment Variables](https://github.com/projectlibertylabs/gateway/blob/main/developer-docs/content-publishing/ENVIRONMENT.md) |
|                                | START_PROCESS                                                                                     |
|                                | FILE_UPLOAD_MAX_SIZE_IN_BYTES                                                                     |
|                                | FILE_UPLOAD_COUNT_LIMIT                                                                           |
|                                | ASSET_EXPIRATION_INTERVAL_SECONDS                                                                 |
|                                | BATCH_INTERVAL_SECONDS                                                                            |
|                                | BATCH_MAX_COUNT                                                                                   |
|                                | ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS                                                           |
|                                | CACHE_KEY_PREFIX                                                                                  |

<br />

| **Content Watcher Service**    | **Details**                                                                                       |
|--------------------------------|---------------------------------------------------------------------------------------------------|
| **Docker Image**               | `projectlibertylabs/content-watcher-service`                                                      |
| **Dependencies**               | Redis, IPFS                                                                                       |
| **API Ports**                  | `3000`                                                                                            |
| **Inter-Service Ports**        | `6379, 9944`                                                                                      |
| **Docker Compose Services**    | content-watcher-service                                                                           |
| **Required Variables**         | [Content Watcher Service Environment Variables](https://github.com/projectlibertylabs/gateway/blob/main/developer-docs/content-watcher/ENVIRONMENT.md) |
|                                | STARTING_BLOCK                                                                                    |
|                                | BLOCKCHAIN_SCAN_INTERVAL_SECONDS                                                                  |
|                                | WEBHOOK_FAILURE_THRESHOLD                                                                         |
|                                | CACHE_KEY_PREFIX                                                                                  |

<br />

## **Other Deployment Guides**

- [Configuring and Managing Scalability](./Scalability.md)
- [Deployment on AWS](./Deployment.md)
- [Deployment with Kubernetes](./Kubernetes.md)
- [Monitoring with AWS CloudWatch](./Monitoring.md)
- [NGINX Ingress](./Nginx.md)
- [Redis Configuration Guide](./Redis.md)
- [Securing API Access with NGINX and Load Balancers](./Security.md)
- [Setting up IPFS](./IPFS.md)
- [Vault Integration](./Vault.md)
