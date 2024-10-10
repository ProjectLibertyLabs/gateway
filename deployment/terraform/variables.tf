#------------------------------------------------------------------------------#
# Required variables
#------------------------------------------------------------------------------#

variable "vpc_id" {
  type        = string
  description = "ID of an existing VPC in which to create the cluster."
}

variable "subnet_id" {
  type        = string
  description = "ID of an existing subnet in which to create the cluster. The subnet must be in the VPC specified in the \"vpc_id\" variable, otherwise an error occurs."
}

variable "public_key_file" {
  type        = string
  description = "Path to the public key file on your local machine. This key pair will allow you to connect to the nodes of the cluster with SSH."
}

variable "private_key_file" {
  type        = string
  description = "Path to the private key file on your local machine. This key pair will allow you to connect to the nodes of the cluster with SSH."
}
variable "cluster_name" {
  type        = string
  description = "Name of the Kubernetes cluster to create. This name will be used in the names and tags of the created AWS resources and for the local kubeconfig file."
}

#------------------------------------------------------------------------------#
# Optional variables
#------------------------------------------------------------------------------#

variable "region" {
  type        = string
  description = "AWS region in which to create the cluster."
  default     = "us-east-2"
}
