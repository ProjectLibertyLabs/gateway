# Content Watcher Service

### **Overview**

The Content Watcher Service monitors and retrieves the latest feed state, including content updates, reactions, and other user interactions on the Frequency network. It ensures that applications can stay up-to-date with the latest content and user activity.

### **API Reference:**

⚠️{embed swagger here}


### Configuration

ℹ️ Feel free to adjust your environment variables to taste.
This application recognizes the following environment variables:

| Name                           | Description                                                                                                                          |          Range/Type           | Required? | Default |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------: | :-------: | :-----: |
| `API_PORT`                     | HTTP port that the application listens on                                                                                            |         1025 - 65535          |           |  3000   |
| `FREQUENCY_HTTP_URL`           | Blockchain node address for the SiwF UI (must be resolvable from a browser)                                                          |         http(s): URL          |     Y     |         |
| `FREQUENCY_URL`                | Blockchain node address                                                                                                              |    http(s): or ws(s): URL     |     Y     |         |
| `PROVIDER_ACCOUNT_SEED_PHRASE` | Seed phrase for provider MSA control key                                                                                             |            string             |     Y     |         |
| `PROVIDER_ID`                  | Provider MSA ID                                                                                                                      |            integer            |     Y     |         |
| `CHAIN_ENVIRONMENT`            | What type of chain we're connected to                                                                                                | dev\|rococo\|testnet\|mainnet |     Y     |         |
| `IPFS_GATEWAY_URL`             | IPFS gateway domain URL. If set, will replace the 'protocol://domain:port' portion of content URLs loaded from the chain             |         URL template          |           |         |
| `IPFS_UA_GATEWAY_URL`          | IPFS gateway domain URL (user-agent resolvable). If set, will override IPFS_GATEWAY_URL in the auth response sent to the user-agent. |         URL template          |           |         |
| `SIWF_DOMAIN`                  | Domain to be used in SIWF login payloads                                                                                             |            string             |     Y     |         |
| `SIWF_URL`                     | URL for the SIgn-in with Frequency UI                                                                                                |              URL              |     Y     |         |

### Best Practices

- **Efficient Polling**: Implement efficient polling mechanisms to minimize load on the service.
- **Webhook Security**: Secure webhooks by verifying the source of incoming requests.
- **Rate Limiting**: Apply rate limiting to prevent abuse and ensure fair usage of the service.
