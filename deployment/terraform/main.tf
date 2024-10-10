terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"
}

# Conditional module loading based on cloud provider
# module "aws_infrastructure" {
#   source                   = "./modules/aws"
#   orchestration            = var.orchestration
#   count                    = var.cloud_provider == "aws" ? 1 : 0
#   swarm_manager_node_count = var.swarm_manager_node_count
#   swarm_worker_node_count  = var.swarm_worker_node_count
#   cluster_name         = var.cluster_name
#   node_count           = var.node_count
# }

module "cluster" {
  source    = "weibeld/kubeadm/aws"
  vpc_id    = var.vpc_id
  subnet_id = var.subnet_id
  public_key_file = var.public_key_file
  private_key_file = var.private_key_file
  cluster_name = var.cluster_name
  master_instance_type = "t2.micro"
  worker_instance_type = "t2.micro"
}

# module "local_infrastructure" {
#   source        = "./modules/local"
#   orchestration = var.orchestration
#   count         = var.cloud_provider == "local" ? 1 : 0
# }

provider "aws" {
  region = "us-east-2"
}

# REMOVE: terraform has pruned this provider as not needed
# provider "kubernetes" {
#   config_path = "~/.kube/config"
# }
