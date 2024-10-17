# Frequency Gateway - Vault Integration

This guide describes how to set up and integrate HashiCorp Vault for managing and securely storing secrets used by the Frequency Gateway services. The integration allows sensitive data such as API tokens, account seed phrases, and credentials to be securely managed through Vault, rather than hardcoding them in Kubernetes manifests.

## Prerequisites

1. [Vault](https://www.vaultproject.io/) installed and running.
2. [Kubernetes](https://kubernetes.io/docs) cluster (with Frequency Gateway deployed).
3. [Helm](https://helm.sh/docs/intro/install/) installed (for deploying Vault and Frequency Gateway).
4. Vault configured with Kubernetes authentication.

## Table of Contents

- [Frequency Gateway - Vault Integration](#frequency-gateway---vault-integration)
  - [Prerequisites](#prerequisites)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Vault Setup](#2-vault-setup)
    - [2.1 Enable Key-Value (KV) Secret Engine](#21-enable-key-value-kv-secret-engine)
    - [2.2 Create Secrets](#22-create-secrets)
    - [2.3 Set Up Kubernetes Authentication](#23-set-up-kubernetes-authentication)
  - [3. Integrating Vault with Frequency Gateway](#3-integrating-vault-with-frequency-gateway)
    - [3.1 Helm Configuration](#31-helm-configuration)
    - [3.2 Creating External Secret and Secret Store](#32-creating-external-secret-and-secret-store)
    - [3.3 Handling Single-Value Secrets](#33-handling-single-value-secrets)
  - [4. Accessing Secrets](#4-accessing-secrets)
    - [4.1 Using CLI](#41-using-cli)
  - [5. Troubleshooting](#5-troubleshooting)
  - [6. References](#6-references)

---

## 1. Overview

Vault is used to manage and securely inject secrets into the Frequency Gateway services, such as:

- **account-service**: Stores provider access tokens and account seed phrases.
- **content-publishing-service**: Manages IPFS authentication secrets.
- **content-watcher-service**: Handles watcher credentials and IPFS secrets.
- **graph-service**: Manages provider access tokens and account details.

## 2. Vault Setup

### 2.1 Enable Key-Value (KV) Secret Engine

To store secrets in Vault, you must first enable the KV secret engine. You can do this with the following command:

```bash
vault secrets enable -path=secret kv
```

### 2.2 Create Secrets

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

### 2.3 Set Up Kubernetes Authentication

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

## 3. Integrating Vault with Frequency Gateway

### 3.1 Helm Configuration

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

Deploy or upgrade the Frequency Gateway Helm chart with:

```bash
helm upgrade --install frequency-gateway ./helm/frequency-gateway -f values.yaml
```

### 3.2 Creating External Secret and Secret Store

To securely connect Kubernetes resources with Vault, you need to use the **External Secrets** and **Secret Store**. This allows Kubernetes services to dynamically fetch secrets from Vault.

1. **Create a Secret Store:**

   Create a `SecretStore` resource to configure how Kubernetes connects to Vault.

   Example configuration for Vault backend:

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
         path: "secret"
         version: "v2"
         auth:
           tokenSecretRef:
             name: vault-token
             key: root
   ```

   Apply the `SecretStore` configuration:

   ```bash
    kubectl apply -f secret-store.yaml
   ```

2. **Create the External Secret:**

   Example Helm template for `ExternalSecret` resources:

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

### 3.3 Handling Single-Value Secrets

For single-value secrets, use the `ExternalSecret` configuration to point to a specific key.

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

## 4. Accessing Secrets

Once Vault is integrated, services in the Frequency Gateway will automatically retrieve secrets at runtime.

### 4.1 Using CLI

To manually retrieve secrets using the Vault CLI:

```bash
vault kv get secret/frequency-gateway/account
vault kv get secret/frequency-gateway/content-publishing
vault kv get secret/frequency-gateway/content-watcher
vault kv get secret/frequency-gateway/graph
```

To retrieve specific fields:

```bash
vault kv get -field=PROVIDER_ACCESS_TOKEN secret/frequency-gateway/account
```

## 5. Troubleshooting

- **Vault Access Errors:** Ensure that the Kubernetes authentication method is correctly configured, and the service accounts are bound to the appropriate Vault roles.
- **Secrets Not Being Retrieved:** Double-check your `values.yaml` file for correct Vault paths and the service’s configuration for secret access.

For more information, refer to the [Vault documentation](https://www.vaultproject.io/docs).

## 6. References

- [Accessing Secrets](https://www.digitalocean.com/community/tutorials/how-to-access-vault-secrets-inside-of-kubernetes-using-external-secrets-operator-eso#prerequisites)
- [Best Practices for Vault](https://www.digitalocean.com/community/tutorials/how-to-securely-manage-secrets-with-hashicorp-vault-on-ubuntu-20-04)
