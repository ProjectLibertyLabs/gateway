# Content Publisher

<!-- TABLE OF CONTENTS -->

# 📗 Table of Contents

- [📖 About the Project](#about-project)
- [🔍 Application Architecture](#application-architecture)
  - [Overview](#overview)
  - [Architecture Diagram](#architecture-diagram)
  - [🛠 Built With](#-built-with)
  - [References](#references)
- [🚀 Live OpenAPI Docs](#-live-docs)
- [💻 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [CLone](#clone)
  - [Configuration](#configure-the-application)
  - [Auxiliary services](#starting-auxiliary-services)
  - [Running the application](#start-the-application-services)
- [Local Interface](#local-interfaces)
  - [Swagger UI](#swagger-ui)
  - [BullMQ UI](#bullmq-management-interface)
- [🤝 Contributing](#-contributing)
- [🙏 Acknowledgements](#-acknowledgements)
- [📝 License](#-license)

<!-- PROJECT DESCRIPTION -->

# Content Publishing Service <a name="about-project"></a>

The Content Publishing Service is part of the "Social Gateway" collection of services that provides a familiar REST API to allow uploading content and publishing announcements to the Frequency chain. The service handles all of the necessary blockchain interaction and allows clients to interact using a familiar, web2-friendly interface.

## Application Architecture

### Overview

The Content Publishing Service consists of two applications: an API controller, and one (or more) Worker processes. The API and Worker processes communicate via a shared BullMQ message queue. The API controller handles incoming requests and enqueues content publishing tasks for the Worker(s).

#### Architecture Diagram
See a more detailed architectural diagram [here](./docs/diagram.png)

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

### 🛠 Built With

The Content Publishing Service is built as a Node.js app using the NestJS framework.

### References

- [API Documentation](https://amplicalabs.github.io/content-publishing-service/)
- [GitHub](https://github.com/AmplicaLabs/content-publishing-service)

<!-- LIVE Docs -->

## 🚀 Live API Docs

- [Live Docs](https://amplicalabs.github.io/content-publishing-service/)

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

<!-- GETTING STARTED -->

## 💻 Getting Started

This guide is tailored for developers working in the code base for the Content Publishing Service itself. For a more tutorial tailored more for developers wanting to deploy the Content Publishing Service as part of the broader Social Gateway in order to develop their own Social Gateway app, visit [Live Docs](https://amplicalabs.github.io/gateway/).

To prepare and run a local instance of the Content Publishing Service for local development, follow the guide below.

### Prerequisites

In order to work in this project you need:

- A Node.js/Typescript development environment
- [Docker](https://www.docker.com) or Docker-compatible container system for running Gateway Services
    - (note, Docker is not strictly required; all of the services described below may be installed or built & run locally, but that is outside the scope of this guide)

### Clone

Clone this repository to your desired folder:

```sh
  git clone git@github.com:AmplicaLabs/content-publishing-service.git
  cd content-publishing-service
```

### Configure the application
Use the provided [env.template](./env.template) file to create an initial environment for the application, and edit as desired. Additional documentation on the complete set of environment variables is provided in the [ENVIRONMENT.md](./ENVIRONMENT.md) file.

For running the application under Docker, copy the environment template to `.env.docker.dev`; for running bare-metal, copy to `.env`.

### Starting auxiliary services

Start the required auxiliary services (Frequency node, Redis, IPFS) using the following command:

```sh
docker compose up -d frequency redis ipfs
```

### Start the application services

Each of the application services may be run either under Docker or bare-metal, depending on your preferred development workflow. The instructions are the same for running both the API service and the worker service; simply substitute "api" or "worker" for the "<service>" tag in the commands below.

#### Running bare metal
```sh
npm run start:<service>::dev
```

#### Running under Docker
```sh
docker compose up [-d] content-publishing-service-<service>
```

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

<!-- LOCAL INTERFACES -->

## Local Interfaces
### Swagger UI
A Swagger UI connected to the locally-running API controller is available when the application is running (substitute the appropriate port if running on a different port via the `API_PORT` environment variable):
[http://localhost:3000/api/docs/swagger](http://localhost:3000/api/docs/swagger)

### BullMQ Management Interface
There is also a built-in UI for viewing & managing tasks in the BullMQ instance, available when the local API controller is running. It is accessed at [http://localhost:3000/queues](http://localhost:3000/queues)

<!-- CONTRIBUTING -->

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

- [Contributing Guidelines](./CONTRIBUTING.md)
- [Open Issues](https://github.com/AmplicaLabs/content-publishing-service/issues)

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

<!-- ACKNOWLEDGEMENTS -->

## 🙏 Acknowledgements

Thank you to [Frequency](https://www.frequency.xyz) for assistance and documentation making this possible.

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

<!-- LICENSE -->

## 📝 License

This project is [Apache 2.0](./LICENSE) licensed.

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>
````
