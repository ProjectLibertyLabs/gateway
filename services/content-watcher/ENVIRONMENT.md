# Environment Variables

This application recognizes the following environment variables:

| Name                               | Description                                                                                                     |       Range/Type       | Required? |     Default      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- | :--------------------: | :-------: | :--------------: |
| `API_PORT`                         | HTTP port that the application listens on                                                                       |      1025 - 65535      |           |       3000       |
| `BLOCKCHAIN_SCAN_INTERVAL_SECONDS` | How many seconds to delay between successive scans of the chain for new content (after end of chain is reached) |          > 0           |           |        12        |
| `CACHE_KEY_PREFIX`                 | Prefix to use for Redis cache keys                                                                              |         string         |           | content-watcher: |
| `FREQUENCY_URL`                    | Blockchain node address                                                                                         | http(s): or ws(s): URL |     Y     |                  |
| `IPFS_BASIC_AUTH_SECRET`           | If required for read requests, put Infura auth token here, or leave blank for default Kubo RPC                  |         string         |     N     |      blank       |
| `IPFS_BASIC_AUTH_USER`             | If required for read requests, put Infura Project ID here, or leave blank for default Kubo RPC                  |         string         |     N     |      blank       |
| `IPFS_ENDPOINT`                    | URL to IPFS endpoint                                                                                            |          URL           |     Y     |                  |
| `IPFS_GATEWAY_URL`                 | IPFS gateway URL. '[CID]' is a token that will be replaced with an actual content ID                            |      URL template      |     Y     |                  |
| `QUEUE_HIGH_WATER`                 | Max number of jobs allowed on the '' before blockchain scan will be paused to allow queue to drain              |         >= 100         |           |       1000       |
| `REDIS_URL`                        | Connection URL for Redis                                                                                        |          URL           |     Y     |
| `STARTING_BLOCK`                   | Block number from which the service will start scanning the chain                                               |          > 0           |           |        1         |
| `WEBHOOK_FAILURE_THRESHOLD`        | Number of failures allowing in the provider webhook before the service is marked down                           |          > 0           |           |        3         |
| `WEBHOOK_RETRY_INTERVAL_SECONDS`   | Number of seconds between provider webhook retry attempts when failing                                          |          > 0           |           |        10        |
