# Gateway Architecture

## Authentication

What does it mean for DSNP/Frequency?

- **Web2 APIs:** Typically use OAuth, API keys, or session tokens for authentication.
- **Frequency APIs:** Utilize JWT tokens and cryptographic signatures for secure authentication, ensuring user identity and data integrity.

- SIWF/SIWA
- Session Management
- Account Service


## Data Storage

- **Web2 APIs:** Data is stored in centralized databases managed by the service provider.
- **Frequency APIs:** Data is stored on the decentralized blockchain (metadata) and off-chain storage (payload), ensuring transparency and user control.

- IPFS
- Blockchain
- Local/Application Data

- Details on storage for each service

## Application / Middleware

- Hooking up all the microservices
- Here is where your custom code goes!


### Standard Services

## Redis

// TODO
- Why Redis
-

### BullMQ

- What does this add to Redis?

## Kubo IPFS

// TODO

## Frequency

// TODO / Smaller and direct to docs.frequency.xyz

### Detailed Explanation of the Frequency Infrastructure

Frequency is designed to support scalable, economical, and ethical decentralized social applications (dapps). Its infrastructure is built around three core economic models:

### Delegation Model:

- Shifts the complexity and transaction fees from end users to providers (third-party applications and services).
- Users can delegate tasks to providers without needing to hold tokens, while maintaining the ability to revoke delegation at any time.
- Ensures that users, especially those from varying socioeconomic backgrounds, can participate without barriers.

### Capacity Staking Model:

- Utilizes a stake-based leasing system to manage costs for sending messages and transactions on the blockchain.
- Capacity is replenishable, allowing businesses to make an initial investment that continues to yield benefits over time.
- Two types of staking: Maximized Capacity Staking (for efficient capacity generation) and Rewards Capacity Staking (for governance participation and periodic rewards).

### Data Transaction Model:

- Differentiates between financial transactions and data-focused transactions, optimizing for non-financial use cases like social media.
- Splits data into metadata (on-chain) and payload (off-chain), balancing security, availability, and cost.
- Supports batching of transactions to improve efficiency and reduce costs.

### Key Components:

- **Message Source Accounts (MSAs):** Allow users to delegate message sending to providers while maintaining authorship verification.
- **Providers:** Entities that interact directly with Frequency on behalf of users, handling transaction complexity and fees.
- **Governance:** Users can participate in governance to influence the evolution of the ecosystem.
