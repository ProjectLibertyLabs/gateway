# Monitoring Frequency-Gateway with AWS CloudWatch

This guide explains how to set up monitoring for the Frequency-Gateway application using AWS CloudWatch for logging and metrics collection. CloudWatch offers in-depth metrics for system performance, container health, and more through Container Insights. For further details on CloudWatch setup, see the [AWS CloudWatch Agent on Kubernetes documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-CloudWatch-Agent.html).

## **Prerequisites**

1. **CloudWatch Agent**: [Install the CloudWatch Agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-metrics.html) in your Kubernetes cluster, typically as a DaemonSet, to ensure metrics are collected from each node.
2. **IAM Roles**: Ensure your cluster has the required permissions to write metrics and logs to AWS CloudWatch. Use [IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html) for service accounts or AWS IAM roles to attach permissions.

---

## **Step 1: Define CloudWatch Configuration in `values.yaml`**

Customize your Helm chart's `values.yaml` file to enable CloudWatch and specify required parameters. Example:

```yaml
cloudwatch:
  enabled: true
  region: "us-east-1"
  cluster_name: "MyCluster"
  collection_interval: 60
  enhanced_container_insights: true
  flush_interval: 5
```

### Step 2: Create the CloudWatch ConfigMap

The ConfigMap defines the JSON configuration for the CloudWatch agent. The following Helm template dynamically generates the ConfigMap based on values in `values.yaml`:

```yaml
{{- if .Values.cloudwatch.enabled }}
apiVersion: v1
kind: ConfigMap
metadata:
  name: cwagent-config
  namespace: amazon-cloudwatch
data:
  cwagentconfig.json: |
    {
      "agent": {
        "region": "{{ .Values.cloudwatch.region }}"
      },
      "logs": {
        "metrics_collected": {
          "kubernetes": {
            "cluster_name": "{{ .Values.cloudwatch.cluster_name }}",
            "metrics_collection_interval": {{ .Values.cloudwatch.collection_interval }},
            "enhanced_container_insights": {{ .Values.cloudwatch.enhanced_container_insights }}
          }
        },
        "force_flush_interval": {{ .Values.cloudwatch.flush_interval }}
      }
    }
{{- end }}
```

This configuration focuses on Kubernetes cluster-level insights, collecting metrics on an interval and enabling enhanced container insights.

### Step 3: Deploy the ConfigMap

1. **Apply the ConfigMap** with the configuration to the `amazon-cloudwatch` namespace in your Kubernetes cluster.
2. Restart the CloudWatch agent pods to load the updated configuration.

### Step 4: View Logs and Metrics in CloudWatch

After deploying the CloudWatch agent with the ConfigMap, access CloudWatch to view real-time logs and metrics under your designated log group and cluster name. For more specific metrics and alerts, refer to AWS documentation for configuring CloudWatch Alarms and Dashboards.

---

For further configuration details, refer to the AWS documentation for the [CloudWatch Agent on Kubernetes](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-CloudWatch-Agent.html).
