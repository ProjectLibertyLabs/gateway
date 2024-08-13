# Gateway Architecture

![Gateway Application Microservice Diagram](./gateway_arch-TopLevelServices.drawio.png)

## Authentication

Gateway and Frequency provide authentication, but not session management.
Using cryptographic signatures, you will get proof the user is without passwords or other complex identity systems to implement.
Your application still must manage sessions as is best for your custom needs.

### What does it mean for Applications?

- **Web2 APIs:** Typically use OAuth, API keys, or session tokens for authentication.
- **Frequency APIs:** Utilize cryptographic signatures for secure authentication, ensuring user identity and data integrity.

#### SIWF/SIWA

[Sign-In With Frequency (SIWF)](https://github.com/ProjectLibertyLabs/siwf) and [Sign-In With Access (SIWA)](https://frequencyaccess.com/) are methods for authenticating users in the Frequency ecosystem. SIWF allows users to authenticate using their Frequency accounts, providing a secure and decentralized way to manage identities.

- **SIWF Implementation:** Users sign in using their Web3 wallets, which generate cryptographic signatures for authentication. This process eliminates the need for traditional usernames and passwords, enhancing security and user privacy.

#### Account Service

The Account Service in Gateway handles user account management, including creating accounts, managing keys, and delegating permissions. This service replaces traditional user models with decentralized identities and provides a robust framework for user authentication and authorization.

## Data Storage

### What does it mean for Frequency?

- **Web2 APIs:** Data is stored in centralized databases managed by the service provider.
- **Frequency APIs:** Data is stored on the decentralized blockchain (metadata) and off-chain storage (payload), ensuring transparency and user control.

#### IPFS

[InterPlanetary File System (IPFS)](https://ipfs.io) is a decentralized storage solution used in the Frequency ecosystem to store large data payloads off-chain. IPFS provides a scalable and resilient way to manage data, ensuring that it is accessible and verifiable across the network.

- **Usage in Gateway:** Content Publishing Service uses IPFS to store user-generated content such as images, videos, and documents. The metadata associated with this content is stored on the blockchain, while the actual files are stored on IPFS, ensuring decentralization and availability.

#### Blockchain

The [Frequency](https://www.frequency.xyz) blockchain stores metadata and transaction records, providing a secure and user controlled data store. This ensures that all interactions are transparent and traceable, enhancing trust in the system.

- **Usage in Gateway:** Metadata for user actions, such as content publication, follows/unfollows, and other social interactions, are stored on the blockchain. This ensures that all actions are verifiable and under user control.

#### Local/Application Data

For efficiency and performance, certain data may be stored locally or within application-specific storage systems. This allows for quick access and manipulation of frequently used data while ensuring that critical information remains secure on the blockchain.

## Application / Middleware

### Hooking Up All the Microservices

Gateway is designed to support a modular and microservices-based approach. Each service (e.g., Account Service, Graph Service, Content Publishing Service) operates independently but can interact through well-defined APIs.

### Here is Where Your Custom Code Goes!

Developers can integrate their custom code within this modular framework, extending the functionality of the existing services or creating new services that interact with the Frequency ecosystem.

### Standard Services Gateway Uses

## Redis

[Redis](https://redis.io) is a key-value store used for caching and fast data retrieval. It is often employed in microservices architectures to manage state and session data efficiently.

- **Why Redis:** Redis provides low-latency access to frequently used data, making it ideal for applications that require real-time performance.
- **Usage in Gateway:** Redis can be used to cache frequently accessed data, manage session states, and optimize database queries.

### BullMQ

[BullMQ](https://bullmq.io) is a Node.js library for creating robust job queues with Redis.

- **What does this add to Redis?**: BullMQ enhances Redis by providing a reliable and scalable way to manage background jobs and task queues, ensuring that tasks are processed efficiently and reliably.
- **Usage in Gateway:** BullMQ can be used to handle background processing tasks such as sending notifications, processing user actions, and managing content updates.

## IPFS Kubo API

[Kubo](https://docs.ipfs.tech/install/command-line/) is an IPFS implementation and standard API designed for high performance and scalability.

- **Usage in Gateway:** Kubo IPFS is used to manage the storage and retrieval of large files in the Frequency ecosystem, ensuring that data is decentralized and accessible.
