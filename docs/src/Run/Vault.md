# Frequency Gateway - Vault Integration

This guide describes how to set up and integrate HashiCorp Vault for managing and securely storing secrets used by the Frequency Gateway services. The integration allows sensitive data such as API tokens, account seed phrases, and credentials to be securely managed through Vault, rather than hardcoding them in Kubernetes manifests.

## Prerequisites

- [Vault](https://www.vaultproject.io/) installed and running
- Kubernetes cluster (with Frequency Gateway deployed)
- Helm installed (for deploying Vault and Frequency Gateway)
- Vault configured with Kubernetes authentication

## Table of Contents

- [Frequency Gateway - Vault Integration](#frequency-gateway---vault-integration)
  - [Prerequisites](#prerequisites)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Vault Setup](#vault-setup)
    - [Enable Key-Value (KV) Secret Engine](#enable-key-value-kv-secret-engine)
    - [Create Secrets](#create-secrets)
    - [Set Up Kubernetes Authentication](#set-up-kubernetes-authentication)
  - [Integrating Vault with Frequency Gateway](#integrating-vault-with-frequency-gateway)
    - [Helm Configuration](#helm-configuration)
  - [Accessing Secrets](#accessing-secrets)
    - [Using CLI](#using-cli)
  - [Troubleshooting](#troubleshooting)

---

## Overview

Vault is used to manage and securely inject secrets into the Frequency Gateway services, such as:

- **account-service**: Stores provider access tokens and account seed phrases.
- **content-publishing-service**: Manages IPFS authentication secrets.
- **content-watcher-service**: Handles watcher credentials and IPFS secrets.
- **graph-service**: Manages provider access tokens and account details.

## Vault Setup

### Enable Key-Value (KV) Secret Engine

To store secrets in Vault, you must first enable the KV secret engine. You can do this with the following command:

```bash
vault secrets enable -path=secret kv
```

### Create Secrets

Vault allows you to store your secrets under a defined path. For the Frequency Gateway, secrets are stored under paths like `secret/data/frequency-gateway/[service-name]`. You can add secrets using the Vault CLI.

For example, to create secrets for the `account` service:

```bash
vault kv put secret/frequency-gateway/account PROVIDER_ACCESS_TOKEN=<your-access-token> PROVIDER_ACCOUNT_SEED_PHRASE=<your-seed-phrase>
```

Similarly, create secrets for other services:

- **Content Publishing Service:**

  ```bash
  vault kv put secret/frequency-gateway/content-publishing IPFS_BASIC_AUTH_USER=<username> IPFS_BASIC_AUTH_SECRET=<password> PROVIDER_ACCOUNT_SEED_PHRASE=<your-seed-phrase>
  ```

- **Content Watcher Service:**

  ```bash
  vault kv put secret/frequency-gateway/content-watcher IPFS_BASIC_AUTH_USER=<username> IPFS_BASIC_AUTH_SECRET=<password>
  ```

- **Graph Service:**

  ```bash
  vault kv put secret/frequency-gateway/graph PROVIDER_ACCESS_TOKEN=<your-access-token> PROVIDER_ACCOUNT_SEED_PHRASE=<your-seed-phrase>
  ```

### Set Up Kubernetes Authentication

To allow your Kubernetes cluster to access secrets in Vault, you need to configure Vault’s Kubernetes authentication method.

1. **Enable Kubernetes Auth Method:**

   ```bash
   vault auth enable kubernetes
   ```

2. **Configure the Kubernetes Auth Method:**

   Get the Kubernetes service account token and CA certificate, then configure Vault with this information:

   ```bash
   vault write auth/kubernetes/config \
     token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
     kubernetes_host="https://<KUBERNETES_HOST>:6443" \
     kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
   ```

3. **Create a Vault Role for Frequency Gateway:**

   Bind the Vault role to the appropriate Kubernetes service accounts, which allows the Frequency Gateway pods to retrieve secrets.

   ```bash
   vault write auth/kubernetes/role/frequency-gateway-role \
     bound_service_account_names=frequency-gateway \
     bound_service_account_namespaces=default \
     policies=default \
     ttl=24h
   ```

## Integrating Vault with Frequency Gateway

### Helm Configuration

Update your `values.yaml` file to enable Vault integration for your Frequency Gateway deployment.

```yaml
vault:
  enabled: true  # Enable Vault integration
  address: "http://vault.default.svc.cluster.local:8200"
  role: "frequency-gateway-role"
  secretsPath: "secret/data/frequency-gateway"
```

The `values.yaml` file will also need to include the `vault` configuration for each service to allow them to retrieve secrets from Vault. Example for the `account-service`:

```yaml
account:
  secret:
    PROVIDER_ACCESS_TOKEN: {{ .Values.vault.enabled | ternary "'vault:/frequency-gateway/account/PROVIDER_ACCESS_TOKEN'" (.Values.account.secret.PROVIDER_ACCESS_TOKEN | b64enc | quote) }}
    PROVIDER_ACCOUNT_SEED_PHRASE: {{ .Values.vault.enabled | ternary "'vault:/frequency-gateway/account/PROVIDER_ACCOUNT_SEED_PHRASE'" (.Values.account.secret.PROVIDER_ACCOUNT_SEED_PHRASE | b64enc | quote) }}
```

Ensure similar configurations are added for other services like `content-publishing`, `content-watcher`, and `graph`.

Deploy or upgrade the Frequency Gateway Helm chart:

```bash
helm upgrade --install frequency-gateway ./helm/frequency-gateway -f values.yaml
```

## Accessing Secrets

Once Vault is integrated, services in the Frequency Gateway will automatically retrieve secrets at runtime.

### Using CLI

You can also manually retrieve secrets using the Vault CLI for troubleshooting or verification:

```bash
vault kv get secret/frequency-gateway/account
vault kv get secret/frequency-gateway/content-publishing
vault kv get secret/frequency-gateway/content-watcher
vault kv get secret/frequency-gateway/graph
```

For specific fields within a secret:

```bash
vault kv get -field=PROVIDER_ACCESS_TOKEN secret/frequency-gateway/account
```

---

## Troubleshooting

- **Vault Access Errors:** Ensure that the Kubernetes authentication method is correctly configured, and the service accounts are bound to the appropriate Vault roles.
- **Secrets Not Being Retrieved:** Double-check your `values.yaml` file for correct Vault paths and the service’s configuration for secret access.

For more information, refer to the [Vault documentation](https://www.vaultproject.io/docs).
