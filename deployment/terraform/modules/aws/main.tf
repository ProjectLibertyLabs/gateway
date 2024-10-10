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

# 1. IAM Policy
resource "aws_iam_policy" "ssm_parameter_store_policy" {
  name        = "SSMParameterStorePolicy"
  description = "Policy to allow EC2 instances to get and put SSM parameters"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:PutParameter"
        ]
        Resource = "arn:aws:ssm:us-east-2:${data.aws_caller_identity.current.account_id}:parameter/*"
      }
    ]
  })
}

# 2. IAM Role
resource "aws_iam_role" "ec2_role" {
  name = "EC2SSMRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Attach custom SSM policy
resource "aws_iam_role_policy_attachment" "ssm_policy_attachment" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.ssm_parameter_store_policy.arn
}

# Optionally attach managed policies
resource "aws_iam_role_policy_attachment" "ec2_managed_policy_attachment" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess"
}

# 3. Instance Profile
resource "aws_iam_instance_profile" "ec2_instance_profile" {
  name = "EC2SSMInstanceProfile"
  role = aws_iam_role.ec2_role.name
}
resource "aws_instance" "swarm" {
  count                       = var.swarm_manager_node_count + var.swarm_worker_node_count
  ami                         = "ami-0e84e211558a022c0" # Replace with a valid AMI ID
  instance_type               = "t2.micro"
  iam_instance_profile        = aws_iam_instance_profile.ec2_instance_profile.name
  subnet_id                   = data.aws_subnet.liberty-stage-vpc-public-us-east-2a.id
  vpc_security_group_ids      = [data.aws_security_group.launch-wizard-4.id]
  associate_public_ip_address = true
  key_name                    = "mso-us-east-2"

  tags = {
    Name = "gateway-node-${count.index}"
  }

  user_data = templatefile("${path.module}/user-data.tftpl", {
    node_number = count.index
    node_name = "gateway-node-${count.index}"
    WORKER_TOKEN = ""
    MANGER_TOKEN = ""
    SWARM_MANAGER_NODE_COUNT    = var.swarm_manager_node_count
  })

}
