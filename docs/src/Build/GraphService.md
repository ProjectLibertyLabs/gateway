# Graph Service

### **Overview**

The Graph Service manages the social graphs, including follow/unfollow actions, blocking users, and other social interactions. It allows applications to maintain and query the social connections between users on the Frequency network.

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

- **Data Integrity**: Ensure the integrity of social graph data by implementing robust validation checks.
- **Efficient Queries**: Optimize queries to handle large social graphs efficiently.
- **User Privacy**: Protect user privacy by ensuring that graph data is only accessible to authorized entities.
