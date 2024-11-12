# Running Gateway Services

## Prerequisites

To run this project, you need:

- [Docker](https://docs.docker.com/get-docker/)

## Quick Start

### Clone the repository

```sh
  git clone github.com/ProjectLibertyLabs/gateway.git
  cd gateway
```

### Run the following command to configure and start the selected services

```sh
  ./start.sh
```

`start.sh` will guide you through the configuration process to start the services. It will ask a few questions and set the defaults intelligently. The following steps will be taken, and the resulting environment variables will be used by Docker to configure the services:

1. If `./start.sh` has previously been run:

   - Press Enter to use the previously saved parameters, or `n` to start the configuration process fresh.
   - If you choose to use the previous saved environment, the selected services will be started with the previously saved parameters immediately.

2. Press `Enter` to use the published Gateway Services containers (Recommended), or type `n` to build the containers locally. If you choose to build the containers locally, you may be interested in viewing the Developer Docs for each service which will have further instructions on running the services locally:

   - [Account Service](https://github.com/ProjectLibertyLabs/gateway/blob/main/developer-docs/account/README.md)
   - [Graph Service](https://github.com/ProjectLibertyLabs/gateway/blob/main/developer-docs/graph/README.md)
   - [Content Publishing Service](https://github.com/ProjectLibertyLabs/gateway/blob/main/developer-docs/content-publishing/README.md)
   - [Content Watcher Service](https://github.com/ProjectLibertyLabs/gateway/blob/main/developer-docs/content-watcher/README.md)

3. Press `Enter` to connect to Frequency Paseo Testnet (Recommended), or type `n` to connect to a local Frequency node.

4. Select the Gateway Services you want to start by answering `y` or `n` for each service:

   - **Account Service**: Manages user accounts and authentication.
   - **Graph Service**: Handles the creation and querying of social graphs.
   - **Content Publishing Service**: Manages the publishing and distribution of content.
   - **Content Watcher Service**: Monitors the chain for content announcements (new content, updates, etc).

5. Choose the Frequency API Websocket URL for the selected services. The default will be set to the network chosen in step 3.

6. Choose the Sign In With Frequency RPC URL for the selected services. The default will be set to the network chosen in step 3.

7. Enter a Provider ID. See the links provided by `start.sh` for more information on Provider IDs.

8. Enter the seed phrase for the Provider ID. This will be used to sign transactions before sending them to the Frequency blockchain.

9. Choose to configure an IPFS Pinning Service or use the default IPFS container. See the [IPFS Setup Guide](https://projectlibertylabs.github.io/gateway/Run/IPFS.html) for more information.

10. The configuration will be saved to `$HOME/.projectliberty/.env.gateway-dev` for future use.
(NOTE: you can store multiple project profiles stored as `$HOME/.projectliberty/.env.<profile-name>` and access them by running the initial command as `./start.sh -n <profile-name>`)

11. `start.sh` uses `docker compose` to start the selected services with the provided configuration. It will print out how to access the services once they are running.

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

For more information on environment variables, see [ENVIRONMENT.md](https://github.com/ProjectLibertyLabs/gateway/blob/main/developer-docs/account/ENVIRONMENT.md).
