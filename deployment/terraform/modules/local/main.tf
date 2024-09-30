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
