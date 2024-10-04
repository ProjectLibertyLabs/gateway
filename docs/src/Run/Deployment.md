# Deployment

## Local Deployment Prototyping

This guide provides step-by-step instructions to set up a 3-node Docker Swarm cluster using Quickemu on macOS, with Terraform configurations that are cloud-provider agnostic and support both Docker Swarm and Kubernetes as orchestration methods.

Once you have a working local deployment, you can extend the Terraform configuration to deploy to cloud providers like AWS, GCP, or Azure.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Install Quickemu on macOS](#install-quickemu-on-macos)
3. [Create and Configure Virtual Machines Using Quickemu](#create-and-configure-virtual-machines-using-quickemu)
4. [Install Docker on Each VM](#install-docker-on-each-vm)
5. [Initialize Docker Swarm](#initialize-docker-swarm)
6. [Deploy a Stack](#deploy-a-stack)
7. [Set Up Terraform Configuration](#set-up-terraform-configuration)
    - [Overview](#overview)
    - [Define Variables](#define-variables)
    - [Create Cloud-Provider Agnostic Modules](#create-cloud-provider-agnostic-modules)
    - [Switch Between Orchestration Methods](#switch-between-orchestration-methods)
8. [Conclusion](#conclusion)

---

## Prerequisites

- A macOS system with administrative privileges.
- An internet connection.
- Basic knowledge of the command line and SSH.
- [Homebrew](https://brew.sh/) installed on your macOS.

## Install Quickemu on macOS

Quickemu allows you to easily create and manage virtual machines (VMs).

1. **Update Homebrew:**

    ```bash
    brew update
    ```

2. **Install Quickemu:**

    See the [Quickemu Installation Guide](https://github.com/quickemu-project/quickemu/wiki/01-Installation#install-on-macos) for the latest instructions.

    **NOTE:** `quickget` currently has a bug on macOS, the hash validation fails. A PR has been submitted to fix this issue. Until the PR is merged, you manually download the desired `.iso` for the OS you want to install.

## Create and Configure Virtual Machines Using Quickemu

We will create three Ubuntu Server VMs to serve as Docker Swarm nodes.

1. **Create a Directory for VMs:**

    ```bash
    mkdir ~/quickemu-vms
    cd ~/quickemu-vms
    ```

2. **Download Ubuntu Server ISO:**

    ```bash
    wget -O ubuntu-server.iso https://releases.ubuntu.com/20.04/ubuntu-20.04-live-server-amd64.iso
    ```

3. **Create VM Configurations:**

    Create a configuration file for each VM (`vm1.conf`, `vm2.conf`, `vm3.conf`). Here is an example for `vm1.conf`:

    ```ini
    #!./quickemu --vm
    guest_os="linux"
    iso="ubuntu-server-22.04/ubuntu-22.04.5-live-server-amd64.iso"
    disk_img="ubuntu-server-22.04/vm2.qcow2"
    disk_size="10G"
    ram="4G"
    tpm="on"
    cpu_cores="2"
    ssh_port="22230"
    ```

    Repeat this step for `vm2.conf` and `vm3.conf`, changing the `disk` parameter accordingly (`vm2.qcow2`, `vm3.qcow2`).

4. **Launch and Install Ubuntu Server on Each VM:**

    For each VM, run:

    ```bash
    quickemu --vm vm1.conf
    ```

    Here you will see output from Quickemu describing the VM. Note this information for later use. Here's an example:

    ```bash
    ❯ quickemu --vm manager0-vm.conf

    Quickemu 4.9.6 using /opt/homebrew/bin/qemu-system-x86_64 v9.1.0
    - Host:     macOS 15.0 running Darwin 24.0.0 Work-M2-Pro
    - CPU:      Apple M2 Pro
    - CPU VM:   qemu64, 1 Socket(s), 4 Core(s), 1 Thread(s)
    - RAM VM:   4G RAM
    - BOOT:     EFI (Linux), OVMF (/opt/homebrew/opt/qemu/share/qemu/edk2-x86_64-code.fd), SecureBoot (off).
    - Disk:     ubuntu-server-22.04/manager0.qcow2 (10G)
                Just created, booting from ubuntu-server-22.04/ubuntu-22.04.5-live-server-amd64.iso
    - Boot ISO: ubuntu-server-22.04/ubuntu-22.04.5-live-server-amd64.iso
    - Display:  COCOA, virtio-vga, GL (off), VirGL (off) @ (1280 x 800)
    - Sound:    intel-hda (hda-micro)
    - ssh:      On host:  ssh user@localhost -p 22221
    - WebDAV:   On guest: dav://localhost:9843/
    - 9P:       On guest: sudo mount -t 9p -o trans=virtio,version=9p2000.L,msize=104857600 Public-username ~/Public
    - smbd:     On guest: smb://10.0.2.4/qemu
    - TPM:      ubuntu-server-22.04/manager0-vm.swtpm-sock (97349)
    - Network:  User (virtio-net)
    - Monitor:  On host:  socat -,echo=0,icanon=0 unix-connect:ubuntu-server-22.04/manager0-vm-monitor.socket
    - Serial:   On host:  socat -,echo=0,icanon=0 unix-connect:ubuntu-server-22.04/manager0-vm-serial.socket
    - Process:  Started manager0-vm.conf as manager0-vm (97352)

    ```

    Follow the on-screen instructions to install Ubuntu Server. Ensure that:

    - SSH is installed and enabled.
    - Choose Ubuntu Server (minimized) installation.
    - Configure and note the username and password.
    - Optionally Import SSH keys.
    - Choose docker from the Featured Server Snaps.

    Repeat for `vm2.conf` and `vm3.conf`.

## Install Docker on Each VM

1. **SSH into Each VM:**

    ```bash
    ssh user@vm1_ip_address
    ```

    Replace `user` with your Ubuntu username and `vm1_ip_address` with the VM's IP.

## Initialize Docker Swarm

1. **Initialize Swarm on Manager Node (`vm1`):**

    ```bash
    docker swarm init --advertise-addr vm1_ip_address
    ```

    This command will output a `docker swarm join` command with a token.

2. **Join Worker Nodes (`vm2` and `vm3`):**

    On each worker node, run the join command provided by the manager:

    ```bash
    docker swarm join --token SWMTKN-1-xxxxxx vm1_ip_address:2377
    ```

3. **Verify Nodes on Manager:**

    ```bash
    docker node ls
    ```

    You should see all three nodes listed.

## Deploy a Stack

1. **Create a `docker-compose.yml` File on the Manager Node:**

    ```yaml
    version: '3'
    services:
      web:
        image: nginx:alpine
        ports:
          - "80:80"
        deploy:
          replicas: 3
          restart_policy:
            condition: on-failure
    ```

2. **Deploy the Stack:**

    ```bash
    docker stack deploy -c docker-compose.yml mystack
    ```

3. **Verify the Deployment:**

    ```bash
    docker stack services mystack
    ```

## Set Up Terraform Configuration

### Overview

We'll create a Terraform configuration that is cloud-provider agnostic and supports switching between Docker Swarm and Kubernetes. While Terraform can't manage Quickemu VMs directly, the configuration will provide a basis for deploying to various cloud providers or for future local automation enhancements.

### Define Variables

Create a `variables.tf` file:

```hcl
variable "cloud_provider" {
  type        = string
  default     = "local"
  description = "Cloud provider to use. Options: 'local', 'aws', 'gcp', 'azure'"
}

variable "orchestration" {
  type        = string
  default     = "docker_swarm"
  description = "Orchestration method. Options: 'docker_swarm', 'kubernetes'"
}

variable "node_count" {
  type        = number
  default     = 3
  description = "Number of nodes to provision"
}
```

### Create Cloud-Provider Agnostic Modules

We'll use modules to abstract away cloud-provider-specific configurations.

1. **Directory Structure:**

    ```bash
    terraform-gateway/
    ├── main.tf
    ├── variables.tf
    └── modules/
        ├── aws/
        ├── azure/
        ├── gcp/
        └── local/
    ```

2. **Main Terraform Configuration (`main.tf`):**

    ```hcl
    terraform {
      required_version = ">= 0.12"
    }

    # Conditional module loading based on cloud provider
    module "infrastructure" {
      source        = "./modules/${var.cloud_provider}"
      node_count    = var.node_count
      orchestration = var.orchestration
    }
    ```

3. **Local Module (`modules/local/main.tf`):**

    Since Terraform can't manage Quickemu directly, we'll use `null_resource` to simulate resource creation.

    ```hcl
    variable "node_count" {
      type = number
    }

    variable "orchestration" {
      type = string
    }

    resource "null_resource" "local_nodes" {
      count = var.node_count

      provisioner "local-exec" {
        command = "echo 'Node ${count.index + 1}: Orchestration with ${var.orchestration}'"
      }
    }
    ```

### Switch Between Orchestration Methods

Within each module, use conditionals to switch between Docker Swarm and Kubernetes.

1. **Example for AWS Module (`modules/aws/main.tf`):**

    ```hcl
    variable "node_count" {
      type = number
    }

    variable "orchestration" {
      type = string
    }

    resource "aws_instance" "nodes" {
      count         = var.node_count
      ami           = "ami-0abcdef1234567890"  # Replace with a valid AMI ID
      instance_type = "t2.micro"

      provisioner "remote-exec" {
        inline = var.orchestration == "docker_swarm" ? [
          "sudo apt-get update",
          "sudo apt-get install -y docker.io",
          "sudo docker swarm init --advertise-addr ${self.private_ip}"
        ] : [
          "sudo apt-get update",
          "sudo apt-get install -y kubeadm",
          "sudo kubeadm init"
        ]

        connection {
          type        = "ssh"
          user        = "ubuntu"
          private_key = file("~/.ssh/id_rsa")
          host        = self.public_ip
        }
      }
    }
    ```

2. **Usage in `main.tf`:**

    ```hcl
    provider "aws" {
      region = "us-west-2"
    }
    ```

3. **Switching Orchestration:**

    Change the `orchestration` variable in `variables.tf` to `"kubernetes"` or `"docker_swarm"` as needed.

### Note on Cloud Providers

- **AWS:** Use the AWS provider and specify AMI IDs, instance types, and security groups.
- **GCP:** Use the Google Cloud provider with appropriate machine images and configurations.
- **Azure:** Use the Azure provider and define resource groups, virtual machines, and networks.

Each module under `modules/` should contain the necessary configurations specific to that cloud provider.

## Conclusion

By following this guide, you've set up a 3-node Docker Swarm cluster using Quickemu on macOS and created a Terraform configuration that's both cloud-provider agnostic and flexible with orchestration methods. While the local deployment requires manual steps due to Quickemu's limitations with Terraform, the provided Terraform configurations offer a solid foundation for cloud deployments and future automation enhancements.

---

**References:**

- Quickemu Installation: [Quickemu Wiki](https://github.com/quickemu-project/quickemu/wiki/01-Installation#install-on-macos)
- Terraform Documentation: [Terraform by HashiCorp](https://www.terraform.io/docs)
