# Gateway Architecture

## Authentication

### What does it mean for DSNP/Frequency?

- **Web2 APIs:** Typically use OAuth, API keys, or session tokens for authentication.
- **Frequency APIs:** Utilize JWT tokens and cryptographic signatures for secure authentication, ensuring user identity and data integrity.

#### SIWF/SIWA

Sign-In With Frequency (SIWF) and Sign-In With Acceess (SIWA) are methods for authenticating users in the Frequency ecosystem. SIWF allows users to authenticate using their Frequency accounts, providing a secure and decentralized way to manage identities.

- **SIWF Implementation:** Users sign in using their Web3 wallets, which generate cryptographic signatures for authentication. This process eliminates the need for traditional usernames and passwords, enhancing security and user privacy.

#### Session Management

Managing user sessions in a decentralized environment involves maintaining session states without relying on centralized databases. Frequency utilizes JWT tokens to manage sessions, ensuring that session data is cryptographically secure and verifiable.

#### Account Service

The Account Service in Frequency handles user account management, including creating accounts, managing keys, and delegating permissions. This service replaces traditional user models with decentralized identities and provides a robust framework for user authentication and authorization.

## Data Storage

### What does it mean for DSNP/Frequency?

- **Web2 APIs:** Data is stored in centralized databases managed by the service provider.
- **Frequency APIs:** Data is stored on the decentralized blockchain (metadata) and off-chain storage (payload), ensuring transparency and user control.

#### IPFS

InterPlanetary File System (IPFS) is a decentralized storage solution used in the Frequency ecosystem to store large data payloads off-chain. IPFS provides a scalable and resilient way to manage data, ensuring that it is accessible and verifiable across the network.

- **Usage in Frequency:** Content Publishing Service uses IPFS to store user-generated content such as images, videos, and documents. The metadata associated with this content is stored on the blockchain, while the actual files are stored on IPFS, ensuring decentralization and availability.

#### Blockchain

The Frequency blockchain stores metadata and transaction records, providing a secure and immutable ledger. This ensures that all interactions are transparent and traceable, enhancing trust in the system.

- **Usage in Frequency:** Metadata for user actions, such as content publication, follows/unfollows, and other social interactions, are stored on the blockchain. This ensures that all actions are verifiable and immutable.

#### Local/Application Data

For efficiency and performance, certain data may be stored locally or within application-specific storage systems. This allows for quick access and manipulation of frequently used data while ensuring that critical information remains secure on the blockchain.

### Details on Storage for Each Service

- **Account Service:** Stores user account details, keys, and delegation information.
- **Content Publishing Service:** Manages content metadata on-chain and stores the actual content payloads on IPFS.
- **Content Watcher Service:** Keeps track of content updates and reactions, utilizing a combination of on-chain metadata and off-chain payloads.

## Application / Middleware

### Hooking Up All the Microservices

Frequency's architecture is designed to support a modular and microservices-based approach. Each service (e.g., Account Service, Content Publishing Service) operates independently but can interact through well-defined APIs.

### Here is Where Your Custom Code Goes!

Developers can integrate their custom code within this modular framework, extending the functionality of the existing services or creating new services that interact with the Frequency ecosystem.

### Standard Services

## Redis

Redis is a key-value store used for caching and fast data retrieval. It is often employed in microservices architectures to manage state and session data efficiently.

- **Why Redis:** Redis provides low-latency access to frequently used data, making it ideal for applications that require real-time performance.
- **Usage in Frequency:** Redis can be used to cache frequently accessed data, manage session states, and optimize database queries.

### BullMQ

BullMQ is a Node.js library for creating robust job queues with Redis.

- **What does this add to Redis?**: BullMQ enhances Redis by providing a reliable and scalable way to manage background jobs and task queues, ensuring that tasks are processed efficiently and reliably.
- **Usage in Frequency:** BullMQ can be used to handle background processing tasks such as sending notifications, processing user actions, and managing content updates.

## Kubo IPFS

Kubo is an IPFS implementation designed for high performance and scalability.

- **Usage in Frequency:** Kubo IPFS is used to manage the storage and retrieval of large files in the Frequency ecosystem, ensuring that data is decentralized and accessible.

## Frequency

Frequency is designed to support scalable, economical, and ethical decentralized social applications (dapps). Its infrastructure is built around three core economic models:

### Detailed Explanation of the Frequency Infrastructure

Frequency is designed to support scalable, economical, and ethical decentralized social applications (dapps). Its infrastructure is built around three core economic models:

### Delegation Model

- Shifts the complexity and transaction fees from end users to providers (third-party applications and services).
- Users can delegate tasks to providers without needing to hold tokens, while maintaining the ability to revoke delegation at any time.
- Ensures that users, especially those from varying socioeconomic backgrounds, can participate without barriers.

### Capacity Staking Model

- Utilizes a stake-based leasing system to manage costs for sending messages and transactions on the blockchain.
- Capacity is replenishable, allowing businesses to make an initial investment that continues to yield benefits over time.
- Two types of staking: Maximized Capacity Staking (for efficient capacity generation) and Rewards Capacity Staking (for governance participation and periodic rewards).

### Data Transaction Model

- Differentiates between financial transactions and data-focused transactions, optimizing for non-financial use cases like social media.
- Splits data into metadata (on-chain) and payload (off-chain), balancing security, availability, and cost.
- Supports batching of transactions to improve efficiency and reduce costs.

### Key Components

- **Message Source Accounts (MSAs):** Allow users to delegate message sending to providers while maintaining authorship verification.
- **Providers:** Entities that interact directly with Frequency on behalf of users, handling transaction complexity and fees.
- **Governance:** Users can participate in governance to influence the evolution of the ecosystem.
