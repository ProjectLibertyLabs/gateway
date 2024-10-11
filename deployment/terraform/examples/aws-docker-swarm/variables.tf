variable "swarm_manager_node_count" {
  description = "Number of manager nodes to create"
  type        = number
  default     = 0
}

variable "swarm_worker_node_count" {
  description = "Number of worker nodes to create"
  type        = number
  default     = 0
}

variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
  default     = "gateway-k8s-cluster"
}

variable "node_count" {
  description = "Number of Kubernetes nodes to create"
  type        = number
  default     = 3
}

variable "orchestration" {
  description = "Type of orchestration to use (docker_swarm or kubernetes)"
  type        = string
  default     = "kubernetes"
}

variable "cloud_provider" {
  description = "The cloud provider to use for the infrastructure module"
  type        = string
  default     = "aws"
}
