# Account Service Overview

Account Service is a service enabling easy interaction with [DSNP](https://dsnp.org/) accounts on [Frequency](https://docs.frequency.xyz/). Accounts are identified by the Frequency MSA Id.

## Key Features

- **Account creation using [SIWF](https://github.com/ProjectLibertyLabs/siwf)**
  - Includes behind the scenes delegation to the provider
- **Get User and Provider Account(s)**
- **Handle (aka username) claiming**
  - Create
  - Change
- **Keys Handling**
  - Add keys to an account
  - Get keys
- **Get delegation info for an MSA Id**
- **Easy integration with Web3 wallets**

## Running the Account Service

For information on running the Account Service, please refer to the [Account Service Documentation](https://projectlibertylabs.github.io/gateway/Run/AccountService/RunAccountService.html).

## Detailed Documentation

For more detailed information about the Account Service, including setup, configuration, and API documentation, please refer to the [Account Service Documentation](https://projectlibertylabs.github.io/gateway/Build/AccountService/AccountService.html).

## 🚀 REST API Docs

- [REST API](https://projectlibertylabs.github.io/account-service)

### Environment Variables

The Account Service depends on specific environment variables to function correctly. These variables are used to configure the service and are required for the service to run. Please refer to the [Account Service Configuration](https://projectlibertylabs.github.io/gateway/Build/AccountService/AccountService.html#configuration) documentation for a complete list of required environment variables.
