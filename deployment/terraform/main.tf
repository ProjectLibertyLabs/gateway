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
module "aws_infrastructure" {
  source        = "./modules/aws"
  orchestration = var.orchestration
  count         = var.cloud_provider == "aws" ? 1 : 0
  swarm_manager_node_count = var.swarm_manager_node_count
  swarm_worker_node_count = var.swarm_worker_node_count
}

module "local_infrastructure" {
  source        = "./modules/local"
  orchestration = var.orchestration
  count         = var.cloud_provider == "local" ? 1 : 0
}

provider "aws" {
  region = "us-east-2"
}
