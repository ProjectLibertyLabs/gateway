# Deploying Gateway Services on AWS EC2

This guide provides step-by-step instructions to deploy the Gateway services on AWS EC2 instances using Docker Swarm and Kubernetes. It also includes Terraform examples to automate the deployments in a cloud-agnostic manner.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: Deploying with Docker Swarm](#part-1-deploying-with-docker-swarm)
   - [1.1 Setting Up AWS EC2 Instances](#11-setting-up-aws-ec2-instances)
   - [1.2 Installing Docker Swarm](#12-installing-docker-swarm)
   - [1.3 Deploying Gateway Services](#13-deploying-gateway-services)
3. [Part 2: Deploying with Kubernetes](#part-2-deploying-with-kubernetes)
   - [2.1 Setting Up AWS EC2 Instances](#21-setting-up-aws-ec2-instances)
   - [2.2 Installing Kubernetes Cluster](#22-installing-kubernetes-cluster)
   - [2.3 Deploying Gateway Services](#23-deploying-gateway-services)
4. [Part 3: Automating with Terraform](#part-3-automating-with-terraform)
   - [3.1 Terraform Configuration](#31-terraform-configuration)
   - [3.2 Provisioning Resources](#32-provisioning-resources)
   - [3.3 Deploying with Terraform](#33-deploying-with-terraform)

---

## Prerequisites

- **AWS Account**: Access to create EC2 instances.
- **AWS CLI**: Installed and configured with appropriate permissions.
- **Terraform**: Installed on your local machine.
- **SSH Key Pair**: For accessing EC2 instances.
- **Basic Knowledge**: Familiarity with Docker, Kubernetes, and Terraform.

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

#### Step 2: Configure SSH Access

- Attach your SSH key pair to the instances.
- Note the public IP addresses for each instance.

### 1.2 Installing Docker Swarm

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
sudo docker swarm join-token worker
```

On each worker node, run the join command provided, e.g.:

```bash
sudo docker swarm join --token <token> <manager-node-ip>:2377
```

### 1.3 Deploying Gateway Services

#### Step 1: Clone the Gateway Repository

On the manager node:

```bash
git clone https://github.com/ProjectLibertyLabs/gateway.git
cd gateway
```

#### Step 2: Deploy the Stack

```bash
sudo docker stack deploy -c docker-compose.yml gateway
```

#### Step 3: Verify the Deployment

```bash
sudo docker stack services gateway
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

#### Step 2: Create Kubernetes Deployment and Service Files

Create a `deployment.yaml` and `service.yaml` based on the Docker images specified in the `docker-compose.yml` from the repository.

Example `deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gateway
  template:
    metadata:
      labels:
        app: gateway
    spec:
      containers:
      - name: gateway
        image: projectlibertylabs/gateway:latest
        ports:
        - containerPort: 80
```

Example `service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: gateway-service
spec:
  type: NodePort
  selector:
    app: gateway
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
```

#### Step 3: Deploy to Kubernetes

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

#### Step 4: Verify the Deployment

```bash
kubectl get deployments
kubectl get pods
kubectl get services
```

---

## Part 3: Automating with Terraform

### 3.1 Terraform Configuration

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

# Conclusion

This guide walked you through deploying the Gateway services using Docker Swarm and Kubernetes on AWS EC2 instances. It also provided Terraform examples to automate the infrastructure provisioning in a cloud-agnostic way. By following these steps, you can set up and manage your microservices deployment efficiently.
