# Account Service

The Account Service provides functionalities related to user accounts on the Frequency network.
It includes endpoints for managing user authentication, account details, delegation, keys, and handles.

## API Reference

- [REST API](./Api.md) (<a target="_blank" href="https://projectlibertylabs.github.io/gateway/account">Full docs</a>)
- [Webhooks](./Webhooks.md) (<a target="_blank" href="https://projectlibertylabs.github.io/gateway/account/webhooks.html">Full docs</a>)

## Configuration

{{#include ../../../../developer-docs/account/ENVIRONMENT.md:2:}}

## Best Practices

- **Secure Authentication**: Always use secure methods (e.g., JWT tokens) for authentication to protect user data.
- **Validate Inputs**: Ensure all input data is validated to prevent injection attacks and other vulnerabilities.
- **Rate Limiting**: Implement rate limiting to protect the service from abuse and ensure fair usage.
