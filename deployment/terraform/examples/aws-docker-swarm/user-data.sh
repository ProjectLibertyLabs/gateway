#!/bin/bash
set -xe

# Install Docker
sudo apt-get update
sudo apt-get install docker -y docker.io
sudo usermod -aG docker ec2-user
sudo systemctl enable docker
sudo systemctl start docker

echo ${node_number}

if [[ "${node_number}" == "0" ]]; then
    # Initialize swarm and generate tokens
    sudo docker swarm init --advertise-addr $(hostname -i):2377
    export MANAGER_TOKEN=$(docker swarm join-token manager | grep token | xargs echo -n)
    export WORKER_TOKEN=$(docker swarm join-token worker | grep token | xargs echo -n)

    # Store tokens securely (e.g., AWS SSM Parameter Store)
    echo "Storing Manager Token [$MANAGER_TOKEN]"
    echo "Storing Worker Token [$WORKER_TOKEN]"
    aws ssm put-parameter --region us-east-2 --name '/swarm/token/manager' --type String --overwrite --value "$MANAGER_TOKEN"
    aws ssm put-parameter --region us-east-2 --name '/swarm/token/worker' --type String --overwrite --value "$WORKER_TOKEN"
else
    # Retrieve tokens securely (e.g., AWS SSM Parameter Store)
    WORKER_TOKEN=$(aws ssm get-parameter --region us-east-2 --name '/swarm/token/manager' --query 'Parameter.Value' --output text)
    eval "${WORKER_TOKEN}"
    sleep 5
fi

echo "Swarm initialization completed."
