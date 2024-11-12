<!-- TODO: Update for Builder Track, see: https://github.com/ProjectLibertyLabs/gateway/issues/630 -->
# Running Gateway Services

## Prerequisites

In order to run this project you need:

- [Docker](https://docs.docker.com/get-docker/)

## Quick Start

1. Clone the repository:

```sh
  git clone github.com/ProjectLibertyLabs/gateway.git
  cd gateway
```

2. Run the following command to configure and start the selected services:

```sh
  ./start.sh
```

`start.sh` will guide you through the configuration process to start the selected services. `start.sh` will ask a few questions and try to set the defaults intelligently. The following steps will be taken:

3. If `./start.sh` has previously been run, decide whether to use the previously saved parameters by hitting `Enter` or `n` to start the configuration process fresh. If you choose to use the previous saved environment, the selected services will be started with the previously saved parameters immediately.

4. Choose to use the published Gateway Services containers by hitting `Enter` (Recommended) or build the containers locally by typing `n` and hitting `Enter`. If you choose to build the containers locally, you may be interested in viewing the Developer Docs for each service which will have further instructions on running the services locally:

   - [Account Service](https://github.com/ProjectLibertyLabs/gateway/blob/main/developer-docs/account/README.md)
   - [Graph Service](https://github.com/ProjectLibertyLabs/gateway/blob/main/developer-docs/graph/README.md)
   - [Content Publishing Service](https://github.com/ProjectLibertyLabs/gateway/blob/main/developer-docs/content-publishing/README.md)
   - [Content Watcher Service](https://github.com/ProjectLibertyLabs/gateway/blob/main/developer-docs/content-watcher/README.md)

5. Choose to connect to Frequency Paseo Testnet by hitting `Enter` (Recommended) or connect to a local Frequency node by typing `n` and hitting `Enter`.

6. Select the Gateway Services you want to start by answering `y` or `n` for each service.

7. Select the Frequency API Websocket URL to use for the selected services. The default will be set to the network chosen in step 5.

8. Select the Sign In With Frequency RPC URL to use for the selected services. The default will be set to the network chosen in step 5.

9. Enter a Provider ID. See the links provided by `start.sh` for more information on Provider IDs.

10. Enter the seed phrase for the Provider ID. This will be used to sign transactions before sending them to the Frequency blockchain.

11. Choose to configure an IPFS Pinning Service or use the default IPFS container. See the [IPFS Setup Guide](https://projectlibertylabs.github.io/gateway/Run/IPFS.html) for more information.

12. The configuration will be saved to `$HOME/.projectliberty/.env.gateway-dev` for future use.

13. The selected services will be started with the provided configuration. `start.sh` will print out how to access the services once they are running.

```sh
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔗💠📡                                                                                       │
│ 🔗💠📡  The selected services are running.                                                   │
│ 🔗💠📡  You can access the Gateway at the following local addresses:                         │
│ 🔗💠📡                                                                                       │
│ 🔗💠📡      * account-service:                                                               │
│ 🔗💠📡          - API:              http://localhost:3013                                    │
│ 🔗💠📡          - Queue management: http://localhost:3013/queues                             │
│ 🔗💠📡          - Swagger UI:       http://localhost:3013/docs/swagger                       │
│ 🔗💠📡          - Mock Webhook:     http://mock-webhook-logger:3001/webhooks/account-service │
│ 🔗💠📡            (View log messages in docker)                                              │
│ 🔗💠📡                                                                                       │
│ 🔗💠📡      * graph-service:                                                                 │
│ 🔗💠📡          - API:              http://localhost:3012                                    │
│ 🔗💠📡          - Queue management: http://localhost:3012/queues                             │
│ 🔗💠📡          - Swagger UI:       http://localhost:3012/docs/swagger                       │
│ 🔗💠📡                                                                                       │
│ 🔗💠📡                                                                                       │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Environment Variables

Additional documentation on the complete set of environment variables is provided in the [ENVIRONMENT.md](https://github.com/ProjectLibertyLabs/gateway/blob/main/developer-docs/account/ENVIRONMENT.md) file.
