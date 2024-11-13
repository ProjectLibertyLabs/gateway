# Deploying Gateway Services on AWS EC2

This guide provides example step-by-step instructions to deploy the Gateway services on AWS EC2 instances using Docker Swarm and Kubernetes. You may have to modify these instructions based on your actual AWS configuration. These instructions are provided as a general guide and may also be adapted for other cloud providers. Part 3 also includes Terraform examples to automate the deployments in a cloud-agnostic manner.

## Table of Contents

- [Deploying Gateway Services on AWS EC2](#deploying-gateway-services-on-aws-ec2)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Part 1: Deploying with Docker Swarm](#part-1-deploying-with-docker-swarm)
    - [1.1 Setting Up AWS EC2 Instances](#11-setting-up-aws-ec2-instances)
      - [Step 1: Launch EC2 Instances](#step-1-launch-ec2-instances)
      - [Step 2: Configure SSH Access](#step-2-configure-ssh-access)
    - [1.2 Installing Docker Swarm](#12-installing-docker-swarm)
      - [Step 1: Update Packages](#step-1-update-packages)
      - [Step 2: Install Docker Engine](#step-2-install-docker-engine)
      - [Step 3: Initialize Swarm on Manager Node](#step-3-initialize-swarm-on-manager-node)
      - [Step 4: Join Worker Nodes to Swarm](#step-4-join-worker-nodes-to-swarm)
    - [1.3 Deploying Gateway Services](#13-deploying-gateway-services)
      - [Step 1: Clone the Gateway Repository](#step-1-clone-the-gateway-repository)
      - [Step 2: Deploy the Stack](#step-2-deploy-the-stack)
      - [Step 3: Verify the Deployment](#step-3-verify-the-deployment)
  - [Part 2: Deploying with Kubernetes](#part-2-deploying-with-kubernetes)
    - [2.1 Setting Up AWS EC2 Instances](#21-setting-up-aws-ec2-instances)
      - [Step 1: Launch EC2 Instances](#step-1-launch-ec2-instances-1)
    - [2.2 Installing Kubernetes Cluster](#22-installing-kubernetes-cluster)
      - [Step 1: Update Packages](#step-1-update-packages-1)
      - [Step 2: Disable Swap](#step-2-disable-swap)
      - [Step 3: Install Docker](#step-3-install-docker)
      - [Step 4: Install Kubernetes Components](#step-4-install-kubernetes-components)
      - [Step 5: Initialize Kubernetes Master](#step-5-initialize-kubernetes-master)
      - [Step 6: Install a Pod Network (Weave Net)](#step-6-install-a-pod-network-weave-net)
      - [Step 7: Join Worker Nodes](#step-7-join-worker-nodes)
    - [2.3 Deploying Gateway Services](#23-deploying-gateway-services)
      - [Step 1: Clone the Gateway Repository](#step-1-clone-the-gateway-repository-1)
      - [Step 2: Kubernetes Deployment and Service Files](#step-2-kubernetes-deployment-and-service-files)
      - [Step 2.1: Prepare Helm Chart](#step-21-prepare-helm-chart)
      - [Step 3: Deploy with Helm](#step-3-deploy-with-helm)
      - [Step 4: Verify the Deployment](#step-4-verify-the-deployment)
  - [Part 3: Automating with Terraform](#part-3-automating-with-terraform)
    - [3.1 Terraform Configuration](#31-terraform-configuration)
      - [Step 1: Create Directory Structure](#step-1-create-directory-structure)
      - [Step 2: Initialize Terraform Configuration](#step-2-initialize-terraform-configuration)
    - [3.2 Provisioning Resources](#32-provisioning-resources)
      - [Step 1: Initialize Terraform](#step-1-initialize-terraform)
      - [Step 2: Plan the Deployment](#step-2-plan-the-deployment)
      - [Step 3: Apply the Deployment](#step-3-apply-the-deployment)
    - [3.3 Deploying with Terraform](#33-deploying-with-terraform)
      - [Option 1: Use Provisioners (Not Recommended for Complex Configurations)](#option-1-use-provisioners-not-recommended-for-complex-configurations)
      - [Option 2: Use Configuration Management Tools](#option-2-use-configuration-management-tools)
  - [Conclusion](#conclusion)

---

## Prerequisites

- **AWS Account**: Access to create EC2 instances.
- [**AWS CLI**](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) configured with your AWS credentials and appropriate permissions.
- [**Terraform**](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli) installed on your local machine.
- [**SSH Key Pair**](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html) for accessing EC2 instances.
- **Basic Knowledge**: Familiarity with [Docker](https://docs.docker.com/get-started/), [Kubernetes](https://kubernetes.io/docs/tutorials/kubernetes-basics/), and [Terraform](https://www.terraform.io/intro/index.html).

---

## Part 1: Deploying with Docker Swarm

### 1.1 Setting Up AWS EC2 Instances

#### Step 1: Launch EC2 Instances

- **AMI**: Use the latest Ubuntu Server LTS.
- **Instance Type**: `t2.medium` or higher.
- **Number of Instances**: At least 3 (1 manager, 2 workers).
- **Security Group**:
  - Allow SSH (port 22).
  - Allow Docker Swarm ports:
    - TCP 2376 (Docker daemon).
    - TCP/UDP 7946 (communication among nodes).
    - UDP 4789 (overlay network traffic).
    - TCP 2377 (Swarm manager communication).
  - Allow Gateway service ports (Note: This will depend on your Swarm mappings, default starts at 30000)
    - TCP 30000-32767 (Swarm mode routing mesh).
    - OR specific ports for each service, see `SERVICE_PORT_X` in [docker-compose-swarm.yaml](../../../deployment/swarm/docker-compose.yaml)

#### Step 2: Configure SSH Access

- Attach your SSH key pair to the instances.
- Note the public IP addresses for each instance.

### 1.2 Installing Docker Swarm

Log in to each EC2 instance (or other cloud instances) using SSH.

#### Step 1: Update Packages

```bash
sudo apt-get update
```

#### Step 2: Install Docker Engine

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

#### Step 3: Initialize Swarm on Manager Node

On the manager node:

```bash
sudo docker swarm init --advertise-addr <manager-node-ip>
```

#### Step 4: Join Worker Nodes to Swarm

On the manager node, get the join token:

```bash
>sudo docker swarm join-token worker

docker swarm join --token SWMTKN-1-1tbk3g4qxoshrnzmx6a3fzoz9yyf6wxtaca33xwnt2fykd95et-1je480mao8ubve9xesiq3dym2 <manager-node-ip>:2377
```

Save the join token for later use.
On each worker node, run the join command provided, e.g.:

```bash
sudo docker swarm join --token <token> <manager-node-ip>:2377 --advertise-addr <worker-node-ip>
```

Once you have your entire Swarm cluster set up, check the status on the manager node:

```bash
sudo docker node ls
ID                            HOSTNAME           STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
q2lq4y0tzuwbrb17kddignc0p     ip-10-173-10-61    Ready     Active                          27.3.1
6j201nmxjf54zwhjya0xxbl3d *   ip-10-173-10-112   Ready     Active         Leader           24.0.7
ylett3pu2wz1p4heo1vdhz20w     ip-10-173-11-194   Ready     Active                          27.3.1
```

### 1.3 Deploying Gateway Services

#### Step 1: Clone the Gateway Repository

```bash
git clone https://github.com/ProjectLibertyLabs/gateway.git
cd gateway/deployment/swarm
```

#### Step 2: Deploy the Stack

The repo includes an example [docker-compose-swarm.yaml](https://github.com/projectlibertylabs/gateway/blob/main/deployment/swarm/docker-compose-swarm.yaml) file for deploying the Gateway services on Docker Swarm.
Edit the file to set the correct environment variables and service ports.
Take note of the number of replicas for each service. The default is set to 3.

```bash
sudo docker stack deploy -c docker-compose-swarm.yaml gateway
```

#### Step 3: Verify the Deployment

```bash
>sudo docker service ls

ID             NAME                             MODE         REPLICAS   IMAGE                                       PORTS
y3bkq23881md   gateway_account-service-api      replicated   3/3        projectlibertylabs/account-service:latest   *:30000->3000/tcp
yp455xvoa9gz   gateway_account-service-worker   replicated   3/3        projectlibertylabs/account-service:latest
y263ft5sbvhz   gateway_redis                    replicated   3/3        redis:latest                                *:30001->6379/tcp
```

This stack was deployed without setting the `SERVICE_PORT_X` environment variables, so the default port mappings (30000, 30001) are used.

#### Step 4: Debugging and other useful commands

If you encounter issues, you can check the logs of the services on the manager node. The manager node will show the logs for all replicas of a service.

```bash
docker service logs gateway_account-service-api
docker service logs gateway_account-service-worker
```

In order to update the stack, edit the docker-compose-swarm.yaml file and use the following command:

```bash
sudo docker stack deploy -c docker-compose-swarm.yaml gateway
```

In order to remove the stack, use the following command:

```bash
sudo docker stack rm gateway
```

You can also check the logs on a specific worker node, by logging in to that worker node and running:

```bash
docker ps
docker logs <container-id>
```

---

## Part 2: Deploying with Kubernetes

### 2.1 Setting Up AWS EC2 Instances

#### Step 1: Launch EC2 Instances

- **AMI**: Use the latest Ubuntu Server LTS.
- **Instance Type**: `t2.medium` or higher.
- **Number of Instances**: At least 3 (1 master, 2 nodes).
- **Security Group**:
  - Allow SSH (port 22).
  - Allow Kubernetes ports:
    - TCP 6443 (API server).
    - TCP 2379-2380 (etcd server client API).
    - TCP 10250 (kubelet API).
    - TCP 10251 (kube-scheduler).
    - TCP 10252 (kube-controller-manager).
    - TCP/UDP 30000-32767 (NodePort Services).

### 2.2 Installing Kubernetes Cluster

#### Step 1: Update Packages

On all nodes:

```bash
sudo apt-get update
```

#### Step 2: Disable Swap

```bash
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

#### Step 3: Install Docker

```bash
sudo apt-get install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
```

#### Step 4: Install Kubernetes Components

```bash
sudo apt-get install -y apt-transport-https curl
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
```

Add Kubernetes repository:

```bash
cat <<EOF | sudo tee /etc/apt/sources.list.d/kubernetes.list
deb http://apt.kubernetes.io/ kubernetes-xenial main
EOF
```

Install `kubeadm`, `kubelet`, and `kubectl`:

```bash
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

#### Step 5: Initialize Kubernetes Master

On the master node:

```bash
sudo kubeadm init --apiserver-advertise-address=<master-node-ip> --pod-network-cidr=192.168.0.0/16
```

Set up local `kubectl`:

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

#### Step 6: Install a Pod Network (Weave Net)

```bash
kubectl apply -f "https://cloud.weave.works/k8s/net?k8s-version=$(kubectl version | base64 | tr -d '\n')"
```

#### Step 7: Join Worker Nodes

On the master node, get the join command:

```bash
kubeadm token create --print-join-command
```

On each worker node, run the join command:

```bash
sudo kubeadm join <master-node-ip>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
```

### 2.3 Deploying Gateway Services

#### Step 1: Clone the Gateway Repository

On the master node:

```bash
git clone https://github.com/ProjectLibertyLabs/gateway.git
cd gateway
```

#### Step 2: Kubernetes Deployment and Service Files

Here we will follow [modified instructions from the Kubernetes documentation](kubernetes.md) to deploy the Frequency Gateway using Helm.

Refer to the section "5. Deploying Frequency Gateway" in `kubernetes.md` for detailed steps on a local Kubernetes cluster.

---

#### Step 2.1: Prepare Helm Chart

An example Helm chart (for example, [`frequency-gateway`](https://github.com/ProjectLibertyLabs/gateway/blob/main/deployment/k8s);

Make sure your `values.yaml` contains the correct configuration for NodePorts and services.

**Sample [`values.yaml`](https://github.com/ProjectLibertyLabs/gateway/blob/main/deployment/k8s/frequency-gateway/values.yaml) Excerpt:**

Things to consider:

- `FREQUENCY_URL` - URL of the Frequency Chain API
- `REDIS_URL` - URL of the Redis server
- `IPFS_ENDPOINT`: IPFS endpoint for pinning content
- `IPFS_GATEWAY_URL`: IPFS gateway URL for fetching content
- `PROVIDER_ACCOUNT_SEED_PHRASE` - Seed phrase for the provider account
- `PROVIDER_ID` - MSA ID of the provider account

```yaml
service:
  type: NodePort
  account:
    port: 8080
    targetPort: http-account
    deploy: true <--- Set to true to deploy
  contentPublishing:
    port: 8081
    targetPort: http-publishing
    deploy: true
  contentWatcher:
    port: 8082
    targetPort: http-watcher
    deploy: true
  graph:
    port: 8083
    targetPort: http-graph
    deploy: true
```

---

#### Step 3: Deploy with Helm

Deploy gateway with Helm:

```bash
helm install frequency-gateway deployment/k8s/frequency-gateway/
```

Once deployed, verify that your Helm release is deployed:

```bash
helm list
```

You should see the status as `deployed`.

---

#### Step 4: Verify the Deployment

```bash
kubectl get deployments
kubectl get pods
kubectl get services
```

---

## Part 3: Automating with Terraform

### 3.1 Terraform Configuration

Terraform can automate the provisioning of cloud compute resources. This repo includes example Terraform configurations for deploying EC2 instances on AWS, using Docker Swarm or Kubernetes for orchestration.

```bash
terraform/examples/
├── aws-docker-swarm
│   ├── main.tf
│   ├── variables.tf
│   ├── user-data.sh
│   └── outputs.tf
└── aws-k8s-cluster
    ├── main.tf
    ├── variables.tf
    ├── user-data.tftpl
    └── outputs.tf
```

#### Step 1: Create Directory Structure

```bash
mkdir terraform-deployment
cd terraform-deployment
```

#### Step 2: Initialize Terraform Configuration

Create a `main.tf` file with the following content:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "app_server" {
  ami           = "ami-0c94855ba95c71c99" # Ubuntu Server 18.04 LTS (replace with latest)
  instance_type = "t2.medium"
  count         = 3

  key_name               = "your-key-pair"
  vpc_security_group_ids = [aws_security_group.instance.id]

  tags = {
    Name = "AppServer-${count.index}"
  }
}

resource "aws_security_group" "instance" {
  name        = "instance-sg"
  description = "Allow SSH and required ports"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Add additional ingress rules as needed
}

output "instance_ips" {
  value = aws_instance.app_server.*.public_ip
}
```

### 3.2 Provisioning Resources

#### Step 1: Initialize Terraform

```bash
terraform init
```

#### Step 2: Plan the Deployment

```bash
terraform plan
```

#### Step 3: Apply the Deployment

```bash
terraform apply
```

### 3.3 Deploying with Terraform

While Terraform can provision infrastructure, deploying applications and configuring services like Docker Swarm or Kubernetes requires additional tooling or scripting.

#### Option 1: Use Provisioners (Not Recommended for Complex Configurations)

You can use Terraform provisioners to run scripts on the instances after they are created.

Example:

```hcl
resource "aws_instance" "app_server" {
  # ... (previous configuration)

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y docker.io",
      # Additional commands
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/your-private-key.pem")
      host        = self.public_ip
    }
  }
}
```

#### Option 2: Use Configuration Management Tools

For more complex setups, consider using tools like Ansible, Chef, or Puppet in conjunction with Terraform.

---

## Conclusion

This guide walked you through deploying the Gateway services using Docker Swarm and Kubernetes on AWS EC2 instances. It also provided Terraform examples to automate the infrastructure provisioning in a cloud-agnostic way. By following these steps, you can set up and manage your microservices deployment efficiently.
