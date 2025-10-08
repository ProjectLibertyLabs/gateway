# IPFS Setup Guide

This guide will walk you through the steps required to set up and configure an IPFS (InterPlanetary File System) node, manage ingress and egress traffic, and explore third-party pinning services. IPFS is a distributed file system that enables decentralized data storage and sharing across peer-to-peer networks.

## Table of Contents

- [IPFS Setup Guide](#ipfs-setup-guide)
  - [**Table of Contents**](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [1. Installing IPFS](#1-installing-ipfs)
    - [1.1. IPFS Desktop](#11-ipfs-desktop)
    - [1.2. IPFS Daemon](#12-ipfs-daemon)
      - [To install go-ipfs](#to-install-go-ipfs)
  - [2. Setting Up IPFS Node](#2-setting-up-ipfs-node)
    - [2.1. Initialize IPFS](#21-initialize-ipfs)
    - [2.2. Starting the IPFS Daemon](#22-starting-the-ipfs-daemon)
  - [3. IPFS Ingress and Egress](#3-ipfs-ingress-and-egress)
    - [3.1. Managing Ingress Traffic](#31-managing-ingress-traffic)
    - [3.2. Managing Egress Traffic](#32-managing-egress-traffic)
  - [4. Using Third-Party Pinning Services](#4-using-third-party-pinning-services)
    - [4.1. Pinata](#41-pinata)
    - [4.2. Web3.Storage](#42-web3storage)
    - [4.3. Filebase](#43-filebase)
  - [5. Verifying and Managing IPFS Node](#5-verifying-and-managing-ipfs-node)
  - [Conclusion](#conclusion)

## Prerequisites

Make sure you have installed the following:

- **Ubuntu 20.04+** (or any other Linux distribution).
- [**Go**](https://go.dev/doc/install) installed for building IPFS from source.
- [**npm**](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) installed for installing IPFS packages.

You can also run IPFS on **Windows** or **MacOS**. Refer to the [official IPFS installation guide](https://docs.ipfs.io/install/) for details.

---

## **1. Installing IPFS**

There are two primary ways to install IPFS:

### 1.1. IPFS Desktop

For a graphical interface, IPFS Desktop is a user-friendly option available for **Windows**, **MacOS**, and **Linux**. Download from the [IPFS Desktop page](https://docs.ipfs.tech/install/ipfs-desktop/).

### 1.2. IPFS Daemon

For a more advanced, command-line interface, you can install **go-ipfs** (the official IPFS implementation) on any Unix-based system.

#### To install go-ipfs

```bash
wget https://dist.ipfs.io/go-ipfs/v0.12.2/go-ipfs_v0.12.2_linux-amd64.tar.gz
tar -xvzf go-ipfs_v0.12.2_linux-amd64.tar.gz
cd go-ipfs
sudo bash install.sh
```

Verify the installation:

```bash
ipfs --version
```

---

## **2. Setting Up IPFS Node**

### 2.1. Initialize IPFS

Once installed, initialize your IPFS repository:

```bash
ipfs init
```

This sets up your local IPFS repository, where data will be stored.

### 2.2. Starting the IPFS Daemon

To start your node:

```bash
ipfs daemon
```

Your node is now running and part of the global IPFS network. By default, it listens on **localhost:5001/api/v0** for API access and serves content through **localhost:8080**.

---

## **3. IPFS Ingress and Egress**

### 3.1. Managing Ingress Traffic

Ingress refers to incoming traffic or requests for files stored on your node. You can configure your IPFS node to handle specific network interfaces and protocols for managing this traffic. By default, IPFS allows ingress through all public interfaces.

For secure or limited access, consider using **IPFS gateways** or configuring **Nginx** or **Traefik** to act as reverse proxies. Example using Nginx:

```nginx
server {
  listen 80;
  server_name example.com;

  location / {
    proxy_pass http://127.0.0.1:8080; # IPFS local HTTP Gateway
    proxy_set_header Host $host;
  }
}
```

You can find more details about reverse proxy configuration in [Nginx documentation](https://nginx.org/en/docs/) or [Traefik documentation](https://doc.traefik.io/traefik/).

### 3.2. Managing Egress Traffic

Egress refers to outgoing traffic, including requests your node makes to the IPFS network for files it doesn't have locally. You can limit this traffic by adjusting your node's **bandwidth profile**:

```bash
ipfs config profile apply lowpower
```

For a more detailed network configuration, refer to [IPFS's networking documentation](https://docs.ipfs.tech/how-to/default-profile/#available-profiles).

---

## **4. Using Third-Party Pinning Services**

Pinning services allow you to store and replicate content across multiple IPFS nodes, ensuring data persists even if your local node goes offline.

Here are some popular services:

### 4.1. Pinata

[Pinata](https://pinata.cloud/) is one of the most widely used IPFS pinning services. It offers simple integration and a user-friendly interface for managing your pinned content.

To use Pinata:

1. Create an account at Pinata.
2. Get your API key from the dashboard.
3. Use the Pinata API or integrate it directly with your IPFS node for automated pinning.

### 4.2. Web3.Storage

[Web3.Storage](https://web3.storage/) provides free decentralized storage using IPFS and Filecoin. It's an excellent solution for developers working in the Web3 space.

To use Web3.Storage:

1. Sign up at [web3.storage](https://web3.storage).
2. Use the Web3.Storage client or API to interact with your pinned data.

### 4.3. Filebase

[Filebase](https://filebase.com/) offers an S3-compatible interface for storing files on IPFS. It simplifies managing large-scale IPFS deployments with a more familiar cloud-based experience.

To use Filebase:

1. Create a free account on Filebase.
2. Configure your IPFS client to connect to Filebase using their API.

---

## **5. Verifying and Managing IPFS Node**

To ensure your IPFS node is running correctly, check the status of your node:

```bash
ipfs id
```

This command returns your node's Peer ID, which you can share so others may access your content.

You can also monitor your node's performance:

```bash
ipfs stats bitswap
```

For additional management tasks like **peer discovery**, **publishing content**, and **garbage collection**, refer to the [IPFS documentation](https://docs.ipfs.io/).

---

## **Conclusion**

By following this guide, you've successfully set up an IPFS node, configured ingress and egress, and learned about third-party pinning services for enhanced data availability. With IPFS, you are now part of a decentralized network for distributed storage and sharing.

For more advanced configurations or integrating IPFS with your services, consider exploring additional features such as **IPFS Cluster** for node orchestration or **Filecoin** for long-term decentralized storage.
