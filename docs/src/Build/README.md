# Services

<div class="button-links">
  <a href="./AccountService/AccountService.html">Account Service</a>
  <a href="./ContentPublishing.html">Content Publisher Service</a>
  <a href="./GraphService/GraphService.html">Graph Service</a>
  <a href="./ContentWatcher/ContentWatcher.html">Content Watcher Service</a>
</div>

{{#svg-embed ./src/TopLevel.svg Gateway Application Microservice Diagram}}

## Account Service

The Account Service enables easy interaction with accounts on Frequency.
Accounts are defined as an `msaId` (64-bit identifier) and can contain additional information such as a handle, keys, and more.

- Account authentication and creation using [SIWF](https://github.com/ProjectLibertyLabs/siwf)
- Delegation management
- User Handle creation and retrieval
- User key retrieval and management

See [Account Service Details & API Reference](./AccountService/README)

## Graph Service

The Graph Service enables easy interaction with social graphs on Frequency.
Each Graph connection on Frequency can be private or public and can be unidirectional (a follow) or bidirectional (double opt-in friend connection).

- Fetch user graph
- Update delegated user graphs
- Watch graphs for external updates

See [Graph Service Details & API Reference](./GraphService)

## Content Publishing Service

The Content Publishing Service enables the creation of new content-related activity on Frequency.

- Create posts to publicly broadcast
- Create replies to posts
- Create reactions to posts
- Create updates to existing content
- Request deletion of content
- Store and attach media with [IPFS](https://ipfs.tech)

See [Content Publishing Service Details & API Reference](./ContentPublishing)

## Content Watcher Service

The Content Watcher Service enables client applications to process content found on Frequency by registering for webhook notifications, triggered when relevant content is found, eliminating the need to interact with the chain for new content.

- Parses and validates Frequency content
- Filterable webhooks
- Scanning control

See [Content Watcher Service Details & API Reference](./ContentWatcher)
