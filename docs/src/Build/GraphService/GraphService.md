# Graph Service

The Graph Service manages the social graphs, including follow/unfollow actions, blocking users, and other social interactions. It allows applications to maintain and query the social connections between users on the Frequency network.

## **API Reference**

- [REST API](./Api.md) (<a target="_blank" href="https://projectlibertylabs.github.io/gateway/graph">Full docs</a>)
- [Webhooks](./Webhooks.md) (<a target="_blank" href="https://projectlibertylabs.github.io/gateway/graph/webhooks.html">Full docs</a>)


## **Configuration**

{{#include ../../../../developer-docs/graph/ENVIRONMENT.md:2:}}


## **Best Practices**

- **Data Integrity**: Ensure the integrity of social graph data by implementing robust validation checks.
- **Efficient Queries**: Optimize queries to handle large social graphs efficiently.
- **User Privacy**: Protect user privacy by ensuring that graph data is only accessible to authorized entities.
