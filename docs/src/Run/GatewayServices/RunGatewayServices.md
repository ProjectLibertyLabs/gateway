# Running Frequency Developer Gateway Services

Gateway Services v1.5+ includes 7 microservices with SIWF v2 authentication support, W3C Verifiable Credentials, and enhanced scalability through dedicated worker services.

## **Prerequisites**

To run this project, you need:

- [Docker](https://docs.docker.com/get-docker/)
- [Node.js](https://nodejs.org) (v22 or higher recommended, for local development)

## **Quick Start**

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
   - [Content Publishing Service](https://github.com/ProjectLibertyLabs/gateway/blob/main/developer-docs/content-publishing/README.md)
   - [Content Watcher Service](https://github.com/ProjectLibertyLabs/gateway/blob/main/developer-docs/content-watcher/README.md)

3. Press `Enter` to connect to Frequency Paseo Testnet (Recommended), or type `n` to connect to a local Frequency node.

4. Select the Gateway Services you want to start by answering `y` or `n` for each service:

   - **Account Service** (API + Worker): Manages user accounts and authentication with SIWF v2.
   - **Content Publishing Service** (API + Worker): Manages the publishing and distribution of content.
   - **Content Watcher Service**: Monitors the chain for content announcements (new content, updates, etc).

   Note: Each service (except Content Watcher) includes both an API and a Worker component for improved scalability.

5. Choose the Frequency API Websocket URL for the selected services. The default will be set to the network chosen in step 3.

6. Choose the Sign In With Frequency RPC URL for the selected services. The default will be set to the network chosen in step 3.
   - For Testnet Paseo: `wss://0.rpc.testnet.amplica.io`
   - This is used for SIWF v2 authentication with Frequency Access

7. Enter a Provider ID. See the links provided by `start.sh` for more information on Provider IDs.
   - Register as a Provider at the [Provider Dashboard](https://provider.frequency.xyz/)

8. Enter the seed phrase for the Provider ID. This will be used to sign transactions before sending them to the Frequency blockchain.

9. Choose to configure an IPFS Pinning Service or use the default IPFS container. See the [IPFS Setup Guide](https://projectlibertylabs.github.io/gateway/Run/IPFS.html) for more information.

10. The configuration will be saved to `$HOME/.projectliberty/.env.gateway-dev` for future use.
(NOTE: you can store multiple project profiles stored as `$HOME/.projectliberty/.env.<profile-name>` and access them by running the initial command as `./start.sh -n <profile-name>`)

11. `start.sh` uses `docker compose` to start the selected services with the provided configuration. It will print out how to access the services once they are running.

```sh
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔗💠📡                                                                                              │
│ 🔗💠📡  The selected services are running.                                                          │
│ 🔗💠📡  You can access the Gateway at the following local addresses:                                │
│ 🔗💠📡                                                                                              │
│ 🔗💠📡      * account-service:                                                                      │
│ 🔗💠📡          - API:                    http://localhost:3013                                     │
│ 🔗💠📡          - Queue management:       http://localhost:3013/queues                              │
│ 🔗💠📡          - Swagger UI:             http://localhost:3013/docs/swagger                        │
│ 🔗💠📡          - Health check:           http://localhost:3013/healthz                             │
│ 🔗💠📡          - Prometheus metrics:     http://localhost:3013/metrics                             │
│ 🔗💠📡          - Mock Webhook:           http://mock-webhook-logger:3001/webhooks/account-service  │
│ 🔗💠📡            (View log messages in docker)                                                     │
│ 🔗💠📡                                                                                              │
│ 🔗💠📡                                                                                              │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## **Environment Variables**

For information on environment variables, see the Build page for your selected service:

- [Account Service](../../Build/AccountService/AccountService.html)
- [Content Publishing Service](../../Build/ContentPublishing/ContentPublishing.html)
- [Content Watcher Service](../../Build/ContentWatcher/ContentWatcher.html)
