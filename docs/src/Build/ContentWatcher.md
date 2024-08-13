# Content Watcher Service

The Content Watcher Service monitors and retrieves the latest feed state, including content updates, reactions, and other user interactions on the Frequency network. It ensures that applications can stay up-to-date with the latest content and user activity.

## API Reference

[Open Full API Reference Page](https://projectlibertylabs.github.io/gateway/content-watcher)
{{#swagger-embed ../services/content-watcher/swagger.json}}


## Configuration

{{#markdown-embed ../services/content-watcher/ENVIRONMENT.md 2}}

## Best Practices

- **Efficient Polling**: Implement efficient polling mechanisms to minimize load on the service.
- **Webhook Security**: Secure webhooks by verifying the source of incoming requests.
- **Rate Limiting**: Apply rate limiting to prevent abuse and ensure fair usage of the service.
