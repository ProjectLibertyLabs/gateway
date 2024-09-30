variable "node_count" {
  description = "Number of nodes to create"
  type = number
  default = 1
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
