variable "swarm_manager_node_count" {
  description = "Number of manager nodes to create"
  type = number
  default = 1
}

variable "swarm_worker_node_count" {
  description = "Number of worker nodes to create"
  type = number
  default = 2
}

variable "orchestration" {
  description = "Type of orchestration to use (docker_swarm or kubernetes)"
  type = string
  default = "docker_swarm"
}

variable "cloud_provider" {
  description = "The cloud provider to use for the infrastructure module"
  type    = string
  default = "aws"
}

variable "aws_access_key_id" {
  description = "AWS access key ID"
  type        = string
  sensitive   = true
}

variable "aws_secret_access_key" {
  description = "AWS secret access key"
  type        = string
  sensitive   = true
}

