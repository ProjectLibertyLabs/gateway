# Making Decentrialized Social Easy

Get started building on Decentralized Social as easy as deploying a Web2 API.

## Build What You Want

Gateway offers a suite of tools you can pick and choose to build the best for your users.

<!-- Add more visual elements to the services -->

- Add decentralized authentication and onboarding workflows
- Connect your users with their universal social graph
- Read, write, and interact with social media content
- More coming...

## Web2 API Simplicity with Decentralized Power

- Build your applications faster
- Own your infrastructure
- OpenAPI/Swagger out of the box
- Optimized Docker images

## Basic Architecture

Gateway provides a simple API to interact with the Frequency social layers of identity, graph, content, and more.

![Gateway Application Layer Diagram](./gateway_arch-Layer.drawio.png)

Each microservice is a different building block.
These microservices are 100% independent of each other, so use only what you want.

![Gateway Application Microservice Diagram](./gateway_arch-TopLevelServices.drawio.png)

## Key Microservices

### Account Service

Account Service is a service enabling easy interaction with accounts on Frequency.
Accounts are defined as an `msaId` (a 64 bit identifier) and can contain additional information such as a handle, keys, and more.

- Account authentication and creation using [SIWF](https://github.com/ProjectLibertyLabs/siwf)
- Delegation management
- User Handle creation and retrieval
- User key retrieval and management

### Graph Service

The Graph Service is a service enabling easy interaction with social graphs on Frequency.
Each Graph connection on Frequency can be private or public and can be unidirectional (a follow) or bidiectional (double opt-in friend connection).

- Fetch user graph
- Update delegated user graphs
- Watch graphs for external updates

### Content Publishing Service

The Content Publishing Service is a service enabling the creation of new content related activity on Frequency.

- Create posts to be broadcast publicly
- Create replies to posts
- Create reactions to posts
- Create updates to existing content
- Request deletion of content
- Media attachement storage with [IPFS](https://ipfs.tech)

### Content Watcher Service

The Content Watcher Service is a service enabling processing external content from Frequency.
Feed content through your custom webhooks to connect to the larger ecosystem of content.

- Parses and validates Frequency content
- Filterable webhooks
- Scanning control

## Get Started

<div class="button-links">
  <a href="./Fundamentals/">Fundamentals</a>
  <a href="./GettingStarted/">Quick Start Tutorial</a>
  <a href="./Build/">Build</a>
  <a href="./Run/">Run</a>
</div>
