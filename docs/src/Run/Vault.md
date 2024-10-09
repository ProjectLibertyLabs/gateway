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
    - [Creating External Secret and Secret Store](#creating-external-secret-and-secret-store)
    - [Handling Single-Value Secrets](#handling-single-value-secrets)
  - [Accessing Secrets](#accessing-secrets)
    - [Using CLI](#using-cli)
  - [Troubleshooting](#troubleshooting)
  - [References](#references)

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

Great suggestion! Here's the extended section that includes details about creating the External Secret and Secret Store, and how to handle single-value secrets as discussed earlier.

---

## Integrating Vault with Frequency Gateway

### Helm Configuration

Update your `values.yaml` file to enable Vault integration for Frequency Gateway deployment. Here’s an example configuration:

```yaml
vault:
  enabled: true  # Enable Vault integration
  address: "http://vault.default.svc.cluster.local:8200"
  role: "frequency-gateway-role"
  tokenSecretName: "vault-token"
  tokenSecret: "root"
  secretsPath: "secret/data/frequency-gateway"
```

For each service (e.g., `account-service`, `content-publishing-service`) in the Frequency Gateway, add a similar configuration to the `values.yaml` file.

Ensure similar configurations are added for other services such as `content-publishing`, `content-watcher`, and `graph`.

Deploy or upgrade the Frequency Gateway Helm chart with:

```bash
helm upgrade --install frequency-gateway ./helm/frequency-gateway -f values.yaml
```

### Creating External Secret and Secret Store

To securely connect Kubernetes resources with Vault, you need to use the **External Secrets** and **Secret Store**. This allows Kubernetes services to dynamically fetch secrets from Vault.

1. **Create the External Secret:**

   External Secrets map secrets stored in Vault to Kubernetes secrets, allowing services to access them.

   Here's a Helm template for creating multiple `ExternalSecret` resources for different services (e.g., `account-service`, `content-publishing-service`, etc.):

   ```yaml
   {{- if .Values.vault.enabled }}

   apiVersion: external-secrets.io/v1beta1
   kind: ExternalSecret
   metadata:
     name: account-secret
   spec:
     backendType: vault
     vault:
       server: "{{ .Values.vault.address }}"
       path: "{{ .Values.vault.secretsPath }}/account"
       version: "v2"
       auth:
         tokenSecretRef:
           name: "{{ .Values.vault.tokenSecretName }}"
           key: "{{ .Values.vault.tokenSecret }}"

     data:
       - key: PROVIDER_ACCESS_TOKEN
         name: PROVIDER_ACCESS_TOKEN
       - key: PROVIDER_ACCOUNT_SEED_PHRASE
         name: PROVIDER_ACCOUNT_SEED_PHRASE

   ---
   apiVersion: external-secrets.io/v1beta1
   kind: ExternalSecret
   metadata:
     name: content-publishing-secret
   spec:
     backendType: vault
     vault:
       server: "{{ .Values.vault.address }}"
       path: "{{ .Values.vault.secretsPath }}/content-publishing"
       version: "v2"
       auth:
         tokenSecretRef:
           name: "{{ .Values.vault.tokenSecretName }}"
           key: "{{ .Values.vault.tokenSecret }}"

     data:
       - key: IPFS_BASIC_AUTH_USER
         name: IPFS_BASIC_AUTH_USER
       - key: IPFS_BASIC_AUTH_SECRET
         name: IPFS_BASIC_AUTH_SECRET
       - key: PROVIDER_ACCOUNT_SEED_PHRASE
         name: PROVIDER_ACCOUNT_SEED_PHRASE

   ---
   apiVersion: external-secrets.io/v1beta1
   kind: ExternalSecret
   metadata:
     name: graph-secret
   spec:
     backendType: vault
     vault:
       server: "{{ .Values.vault.address }}"
       path: "{{ .Values.vault.secretsPath }}/graph"
       version: "v2"
       auth:
         tokenSecretRef:
           name: "{{ .Values.vault.tokenSecretName }}"
           key: "{{ .Values.vault.tokenSecret }}"

     data:
       - key: PROVIDER_ACCESS_TOKEN
         name: PROVIDER_ACCESS_TOKEN
       - key: PROVIDER_ACCOUNT_SEED_PHRASE
         name: PROVIDER_ACCOUNT_SEED_PHRASE

   {{- end }}
   ```

2. **Create a Secret Store:**

   If you are using the **External Secrets Operator (ESO)**, you will need to create a `SecretStore` resource to configure how Kubernetes connects to Vault.

   Here’s an example configuration for the Vault backend:

   ```yaml
   apiVersion: external-secrets.io/v1beta1
   kind: SecretStore
   metadata:
     name: vault-secret-store
     namespace: default
   spec:
     provider:
       vault:
         server: "{{ .Values.vault.address }}"
         path: "{{ .Values.vault.secretsPath }}"
         version: "v2"
         auth:
           tokenSecretRef:
             name: "{{ .Values.vault.tokenSecretName }}"
             key: "{{ .Values.vault.tokenSecret }}"
   ```

   The `SecretStore` defines how Kubernetes communicates with Vault and how it retrieves secrets dynamically based on the configurations in `ExternalSecret` resources.

### Handling Single-Value Secrets

If you only need to retrieve a single value from Vault, you can adjust the ExternalSecret configuration to point to a specific key directly.

For example, if you only want to retrieve `PROVIDER_ACCESS_TOKEN` for the `account-service`, the ExternalSecret can be simplified as follows:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: account-secret
spec:
  backendType: vault
  vault:
    server: "{{ .Values.vault.address }}"
    path: "{{ .Values.vault.secretsPath }}/account"
    version: "v2"
    auth:
      tokenSecretRef:
        name: "{{ .Values.vault.tokenSecretName }}"
        key: "{{ .Values.vault.tokenSecret }}"
  data:
    - key: PROVIDER_ACCESS_TOKEN
      name: PROVIDER_ACCESS_TOKEN
```

In this example, only `PROVIDER_ACCESS_TOKEN` will be fetched from Vault and made available as a Kubernetes secret.

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

## References

- [Accessing Secrets](https://www.digitalocean.com/community/tutorials/how-to-access-vault-secrets-inside-of-kubernetes-using-external-secrets-operator-eso#prerequisites)
- [Best Practices for Vault](https://www.digitalocean.com/community/tutorials/how-to-securely-manage-secrets-with-hashicorp-vault-on-ubuntu-20-04)
