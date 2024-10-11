variable "swarm_manager_node_count" {
  type = number
}

variable "swarm_worker_node_count" {
  type = number
}

variable "orchestration" {
  type = string
}

# # Use existing subnet
data "aws_subnet" "liberty-stage-vpc-public-us-east-2a" {
  filter {
    name   = "tag:Name"
    values = ["liberty-stage-vpc-public-us-east-2a"]
  }
}

# # Use existing security group created by IAM EC2 console
data "aws_security_group" "launch-wizard-4" {
  filter {
    name  = "group-name"
    values = ["launch-wizard-4"]
  }
}

data "aws_caller_identity" "current" {}
resource "aws_instance" "swarm" {
  count                       = var.swarm_manager_node_count + var.swarm_worker_node_count
  ami                         = "ami-0e84e211558a022c0" # Replace with a valid AMI ID
  instance_type               = "t2.micro"
  iam_instance_profile        = "gateway_parameter_storerole"
  subnet_id                   = data.aws_subnet.liberty-stage-vpc-public-us-east-2a.id
  vpc_security_group_ids      = [data.aws_security_group.launch-wizard-4.id]
  associate_public_ip_address = true
  key_name                    = "mso-us-east-2"

  tags = {
    Name = "gateway-node-${count.index}"
  }

  user_data = templatefile("${path.module}/user-data-swarm.tftpl", {
    node_number = count.index
    node_name = "gateway-node-${count.index}"
    WORKER_TOKEN = ""
    MANGER_TOKEN = ""
    SWARM_MANAGER_NODE_COUNT    = var.swarm_manager_node_count
  })

}
