variable "node_count" {
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

resource "aws_instance" "nodes" {
  count                       = var.node_count
  ami                         = "ami-0e84e211558a022c0" # Replace with a valid AMI ID
  instance_type               = "t2.micro"
  subnet_id                   = data.aws_subnet.liberty-stage-vpc-public-us-east-2a.id
  vpc_security_group_ids      = [data.aws_security_group.launch-wizard-4.id]
  associate_public_ip_address = true
  key_name                    = "mso-us-east-2"

  tags = {
    Name = "gateway-node"
  }

  provisioner "remote-exec" {
    inline = var.orchestration == "docker_swarm" ? [
      "sudo apt-get update",
      "sudo apt-get install -y docker.io",
      "sudo docker swarm init --advertise-addr ${self.private_ip}"
      ] : [
      "sudo apt-get update",
      "sudo apt-get install -y kubeadm",
      "sudo kubeadm init"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/mso-us-east-2.pem")
      host        = self.public_ip
    }
  }
}
