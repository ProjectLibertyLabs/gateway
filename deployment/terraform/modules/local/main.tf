variable "orchestration" {
  type = string
}

resource "null_resource" "local_nodes" {

  provisioner "local-exec" {
    command = "echo 'Node Local Node: Orchestration with ${var.orchestration}'"
  }
}
