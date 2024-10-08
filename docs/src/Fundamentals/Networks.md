# Frequency Networks

## Mainnet

The Frequency Mainnet is the primary, production-level network where real transactions and interactions occur. It is fully secure and operational, designed to support live applications and services. Users and developers interact with the Mainnet for all production activities, ensuring that all data and transactions are immutable and transparent.

### Key Features:

- **High Security:** Enhanced security protocols to protect user data and transactions.
- **Immutability:** Once data is written to the Mainnet, it cannot be altered.
- **Decentralization:** Fully decentralized network ensuring no single point of control.
- **Real Transactions:** All transactions on the Mainnet are real and involve actual tokens.

### URLs

- **Public Mainnet RPC URLs**
  - `0.rpc.frequency.xyz`
  - `1.rpc.frequency.xyz`
- [Polkadot.js Block Explorer](https://polkadot.js.org/apps/?rpc=wss%3A%2F%2F1.rpc.frequency.xyz#/explorer)

## Testnet

The Frequency Testnet is a testing environment that mirrors the Mainnet. It allows developers to test their applications and services in a safe environment without risking real tokens. The Testnet is crucial for identifying and fixing issues before deploying to the Mainnet.

### Key Features:

- **Safe Testing:** Enables developers to test applications without real-world consequences.
- **Simulated Environment:** Mirrors the Mainnet to provide realistic testing conditions.
- **No Real Tokens:** Uses test tokens instead of real tokens, eliminating financial risk.
- **Frequent Updates:** Regularly updated to incorporate the latest features and fixes for testing purposes.

### URLs

- **Testnet RPC URL**
  - `0.rpc.testnet.amplica.io`
- [Polkadot.js Block Explorer](https://polkadot.js.org/apps/?rpc=wss%3A%2F%2F0.rpc.testnet.amplica.io#/explorer)
- [Testnet Token Faucet](https://faucet.testnet.frequency.xyz)

## Local

The Local network setup is a private, local instance of the Frequency blockchain that developers can run on their own machines. It is used for development, debugging, and testing in a controlled environment. The Local network setup provides the flexibility to experiment with new features and configurations without affecting the Testnet or Mainnet.

### Key Features:

- **Local Development:** Allows developers to work offline and test changes quickly.
- **Customizable:** Developers can configure the Local network to suit their specific needs.
- **Isolation:** Isolated from the Mainnet and Testnet, ensuring that testing does not interfere with live networks.
- **Rapid Iteration:** Facilitates rapid development and iteration, allowing for quick testing and debugging.

### URLs

- **Local Node:** Typically run on `http://localhost:9933` or a similar local endpoint depending on the setup.
- **Documentation:** [Frequency Docs](https://docs.frequency.xyz/)
- **GitHub Repository:** [Frequency GitHub](https://github.com/frequency-chain/frequency)
- **Project Website:** [Frequency Website](https://www.frequency.xyz/)

## Using Polkadot.js Explorer

To interact with the Frequency networks using the Polkadot.js Explorer, follow these steps:

1. **Open Polkadot.js Explorer:**

   - Go to [Polkadot.js Explorer](https://polkadot.js.org/apps/#/explorer).

2. **Select Frequency Network:**

   - Click on the network selection dropdown at the top left corner of the page.
   - Choose "POLKADOT & PARACHAINS -> Frequency Polkadot Parachain" for the main network.
   - Choose "TEST PASEO & PARACHAINS -> Frequency Paseo Parachain" for the test network.
   - For local development, connect to your local node by selecting "DEVELOPMENT -> Local Node or Custom Endpoint" and entering the URL of your local node (e.g., `http://localhost:9933`).

3. **Connect Your Wallet:**
   - Ensure your Polkadot-supported wallet is connected.
   - You will be able to see and interact with your accounts and transactions on the selected Frequency network.

By using these steps, you can easily switch between the different Frequency networks and manage your blockchain activities efficiently.
