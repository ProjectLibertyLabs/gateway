# Blockchain Basics

## Overview of Blockchain Principles for Social Applications

Blockchain technology is a decentralized ledger system where data is stored across multiple nodes, ensuring transparency, security, and immutability.

## Reading the Blockchain

### RPCs, Universal State, Finalized vs Non-Finalized

- **RPCs (Remote Procedure Calls):** RPCs are used to interact with the blockchain network. They allow users to query the blockchain state, submit transactions, and perform other operations by sending requests to nodes in the network.

- **Universal State:** The blockchain maintains a universal state that is agreed upon by all participating nodes. This state includes all the data and transactions that have been validated and confirmed.

- **Finalized vs Non-Finalized:**
  - **Finalized Transactions:** Once a transaction is confirmed and included in a block, it is considered finalized. Finalized transactions are immutable and cannot be changed or reverted.
  - **Non-Finalized Transactions:** Transactions that have been submitted to the network but not yet included in a block are considered non-finalized. They are pending confirmation and can still be altered or rejected.

## Writing Changes to the Blockchain

### Transactions

- Transactions are the primary means of updating the blockchain state. They can involve transferring tokens, or executing other predefined operations.

### Nonces

- Each transaction includes a nonce, a unique number that prevents replay attacks. The nonce ensures that each transaction is processed only once and in the correct order.

### Finalization

- Finalization is the process of confirming and adding a transaction to a block. Once a transaction is included in a block and the block is finalized, the transaction becomes immutable.

### Block Time

- Block time refers to the interval at which new blocks are added to the blockchain. It determines the speed at which transactions are confirmed and finalized. Shorter block times lead to faster transaction confirmations but can increase the risk of network instability.

## Why Blockchain

- **Decentralization:** Eliminates the need for a central authority, ensuring that users have control over their data and interactions.
- **Transparency:** All transactions are recorded on a public ledger, providing visibility into the operations of social platforms.
- **Security:** Advanced cryptographic methods secure user data and interactions, making it difficult for malicious actors to tamper with information.
- **Immutability:** Once data is recorded on the blockchain, it cannot be altered, ensuring the integrity of user posts, messages, and other social interactions.
- **User Empowerment:** Users can own their data and have the ability to move freely between different platforms without losing their social connections or content.

## Interoperability Between Frequency Social Apps

Frequency enables seamless interaction and data sharing between different social dapps built on its platform. This interoperability is facilitated by:

- **Standardized Protocols:** Frequency uses the Decentralized Social Networking Protocol (DSNP), an open web3 protocol that ensures compatibility between different social dapps.
- **Common Data Structures:** By using standardized data structures for user profiles, messages, and other social interactions, Frequency ensures that data can be easily shared and interpreted across different applications.
- **Interoperable APIs:** Frequency provides a set of REST APIs that allow developers to build applications capable of interacting with each other, ensuring a cohesive user experience across the ecosystem.
- **User Control:** Users can switch between different social dapps without losing their social connections or content, ensuring continuity and control over their digital presence.

By leveraging these principles and infrastructures, Frequency provides a robust platform for developing decentralized social applications that are secure, scalable, and user-centric.
