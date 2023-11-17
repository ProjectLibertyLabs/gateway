# Content Watcher

Content Watcher is a service that watches for events on Frequency and produces DSNP content to respective output channels.

## Table of Contents

- [Content Watcher](#content-watcher)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
    - [Clone the Repository](#clone-the-repository)
    - [Run a full e2e test](#run-a-full-e2e-test)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Docker:** Content Watcher is designed to run in a Docker environment. Make sure Docker is installed on your system.

## Getting Started

Follow these steps to set up and run Content Watcher:

### Clone the Repository

1. Clone the Content Watcher repository to your local machine:

   ```bash
   git clone https://github.com/amplicalabls/content-watcher-service.git
   ```

### Run a full e2e test

1. Run the following make command to spin up the entire stack:

   ```bash
   make test-start-services
   ```

   This will setup the following services:

    - **Frequency:** A local instance of Frequency will be with default as instant sealing mode.
    - **Redis:** A local instance of Redis will be spun up and configured to be used by content publishing and content watcher services.
    - **Kubo IPFS:** A local instance of IPFS will be spun up and configured to be used for content publishing and retrieval.
    - **Content Publishing API**: A local instance of the content publishing API will be used to publish content to IPFS and Frequency for content watcher tests.
    - **Content Publishing Worker**: A local instance of the content publishing worker will be used to publish content to IPFS and Frequency for content watcher tests via dedicated processors.

   Following setup scenarios will be run while stack is brought up:

   - **Chain Setup Scenario**: A provider with MSA=1 will be created with some users accounts along with delegation to provider. Capacity will be staked to MSA=1 to enable provider to publish content on behalf of users.
   - **DSNP Schemas**: DSNP schemas will be registered on Frequency.
   - **Publish some example content**: Some example content will be published to IPFS and Frequency. Check out [Content Publishing BullBoard](http://0.0.0.0:3001/queues) to see the progress of content publishing.

2. Run the following make command to run the content watcher tests:

   ```bash
    make test-e2e
    ```

3. Alternatively, create .env file, run `nest start api` to content watcher as standalone, register a webhook with content watcher using [swagger](http://0.0.0.0:3000/api/docs/swagger#) and try some api to scan content.
