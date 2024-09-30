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
  node_count    = var.node_count
  orchestration = var.orchestration
  count         = var.cloud_provider == "aws" ? 1 : 0
}

module "local_infrastructure" {
  source        = "./modules/local"
  node_count    = var.node_count
  orchestration = var.orchestration
  count         = var.cloud_provider == "local" ? 1 : 0
}

provider "aws" {
  region = "us-east-2"
}
