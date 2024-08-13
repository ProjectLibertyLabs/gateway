# Account Service

The Account Service provides functionalities related to user accounts on the Frequency network.
It includes endpoints for managing user authentication, account details, delegation, keys, and handles.

## API Reference

[Open Direct API Reference Page](https://projectlibertylabs.github.io/gateway/account)
{{#swagger-embed ../services/account/swagger.json}}


## Configuration

ℹ️ Feel free to adjust your environment variables to taste.
This application recognizes the following environment variables:

| Name                                      | Description                                                                                                                                                                       |            Range/Type            | Required? | Default  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------: | :-------: | :------: |
| `API_PORT`                                | HTTP port that the application listens on                                                                                                                                         |           1025 - 65535           |           |   3000   |
| `BLOCKCHAIN_SCAN_INTERVAL_SECONDS`        | How many seconds to delay between successive scans of the chain for new content (after end of chain is reached)                                                                   |               > 0                |           |    12    |
| `CACHE_KEY_PREFIX`                        | Prefix to use for Redis cache keys                                                                                                                                                |              string              |           | account: |
| `CAPACITY_LIMIT`                          | Maximum amount of provider capacity this app is allowed to use (per epoch) type: 'percentage' 'amount' value: number (may be percentage, ie '80', or absolute amount of capacity) | JSON [(example)](./env.template) |     Y     |          |
| `FREQUENCY_HTTP_URL`                      | Blockchain node address resolvable from the client browser                                                                                                                        |           http(s): URL           |     Y     |          |
| `FREQUENCY_URL`                           | Blockchain node address                                                                                                                                                           |      http(s): or ws(s): URL      |     Y     |          |
| `HEALTH_CHECK_MAX_RETRIES`                | Number of `/health` endpoint failures allowed before marking the provider webhook service down                                                                                    |               >= 0               |           |    20    |
| `HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS` | Number of seconds to retry provider webhook `/health` endpoint when failing                                                                                                       |               > 0                |           |    64    |
| `HEALTH_CHECK_SUCCESS_THRESHOLD`          | Minimum number of consecutive successful calls to the provider webhook `/health` endpoint before it is marked up again                                                            |               > 0                |           |    10    |
| `PROVIDER_ACCESS_TOKEN`                   | An optional bearer token authentication to the provider webhook                                                                                                                   |              string              |           |          |
| `PROVIDER_ACCOUNT_SEED_PHRASE`            | Seed phrase for provider MSA control key                                                                                                                                          |              string              |     Y     |          |
| `PROVIDER_ID`                             | Provider MSA ID                                                                                                                                                                   |             integer              |     Y     |          |
| `REDIS_URL`                               | Connection URL for Redis                                                                                                                                                          |               URL                |     Y     |          |
| `TRUST_UNFINALIZED_BLOCKS`                | Whether to examine blocks that have not been finalized when tracking extrinsic completion                                                                                         |             boolean              |           |  false   |
| `WEBHOOK_BASE_URL`                        | Base URL for provider webhook endpoints                                                                                                                                           |               URL                |     Y     |          |
| `WEBHOOK_FAILURE_THRESHOLD`               | Number of failures allowing in the provider webhook before the service is marked down                                                                                             |               > 0                |           |    3     |
| `WEBHOOK_RETRY_INTERVAL_SECONDS`          | Number of seconds between provider webhook retry attempts when failing                                                                                                            |               > 0                |           |    10    |


## Best Practices

- **Secure Authentication**: Always use secure methods (e.g., JWT tokens) for authentication to protect user data.
- **Validate Inputs**: Ensure all input data is validated to prevent injection attacks and other vulnerabilities.
- **Rate Limiting**: Implement rate limiting to protect the service from abuse and ensure fair usage.
