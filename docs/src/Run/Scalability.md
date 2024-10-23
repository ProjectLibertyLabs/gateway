# **Scalability Guide for Frequency Gateway**

This guide explains how to configure and manage scalability using Kubernetes Horizontal Pod Autoscaler (HPA) for Frequency Gateway, ensuring your services scale dynamically based on resource usage.

---

## **Table of Contents**

- [**Scalability Guide for Frequency Gateway**](#scalability-guide-for-frequency-gateway)
  - [**Table of Contents**](#table-of-contents)
  - [**Introduction**](#introduction)
  - [**Prerequisites**](#prerequisites)
  - [**Configuring Horizontal Pod Autoscaler**](#configuring-horizontal-pod-autoscaler)
    - [**Default Autoscaling Settings**](#default-autoscaling-settings)
    - [**Metrics for Autoscaling**](#metrics-for-autoscaling)
    - [**Sample Configuration**](#sample-configuration)
  - [**Resource Limits**](#resource-limits)
  - [**Verifying and Monitoring Autoscaling**](#verifying-and-monitoring-autoscaling)
  - [**Troubleshooting**](#troubleshooting)
    - [HPA Not Scaling Pods](#hpa-not-scaling-pods)
    - [Scaling Too Slowly or Too Aggressively](#scaling-too-slowly-or-too-aggressively)

---

## **Introduction**

Kubernetes Horizontal Pod Autoscaler (HPA) helps scale your deployment based on real-time resource usage (such as CPU and memory). By configuring HPA for the Frequency Gateway, you ensure your services remain available and responsive under varying loads, scaling out when demand increases and scaling down when resources aren't needed.

---

## **Prerequisites**

Before implementing autoscaling, ensure that:

- Kubernetes metrics server is enabled and running (or another resource metrics provider).
- [**Helm**](https://helm.sh/docs/intro/install/) installed for managing Kubernetes applications.
- The deployment for [**Frequency Gateway**](https://github.com/ProjectLibertyLabs/gateway/blob/main/deployment/k8s) is running in your Kubernetes cluster.

---

## **Configuring Horizontal Pod Autoscaler**

### **Default Autoscaling Settings**

In `values.yaml`, autoscaling is controlled with the following parameters:

```yaml
autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 5
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 70
```

- **enabled**: Enable or disable autoscaling.
- **minReplicas**: Minimum number of pod replicas.
- **maxReplicas**: Maximum number of pod replicas.
- **targetCPUUtilizationPercentage**: Average CPU utilization target for triggering scaling.
- **targetMemoryUtilizationPercentage**: Average memory utilization target for triggering scaling.

---

### **Metrics for Autoscaling**

The Kubernetes HPA uses real-time resource consumption to determine whether to increase or decrease the number of pods. Metrics commonly used include:

- **CPU utilization**: Scaling based on CPU usage.
- **Memory utilization**: Scaling based on memory consumption.

You can configure one or both, depending on your resource needs.

---

### **Sample Configuration**

Here is an example `values.yaml` configuration for enabling autoscaling with CPU and memory targets:

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 75
```

This setup will ensure the following:

- The number of pod replicas will never go below 2 or above 10.
- Kubernetes will attempt to keep CPU usage around 70% across all pods.
- Kubernetes will attempt to keep memory usage around 75% across all pods.

---

## **Resource Limits**

Setting resource limits ensures your pods are scheduled appropriately and have the necessary resources to function efficiently. Define limits and requests in the `values.yaml` like this:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

- **requests**: The amount of CPU and memory a pod is guaranteed.
- **limits**: The maximum CPU and memory a pod can use.

Setting these values ensures that the HPA scales the pods without overloading the system.

---

## **Verifying and Monitoring Autoscaling**

Once you've enabled autoscaling, you can monitor it using `kubectl`:

```bash
kubectl get hpa
```

This will output the current state of the HPA, including current replicas, target utilization, and actual resource usage.

To see the pods scaling in real-time:

```bash
kubectl get pods -w
```

You can also inspect specific metrics with:

```bash
kubectl top pods
```

---

## **Troubleshooting**

### HPA Not Scaling Pods

If the HPA doesn't seem to be scaling as expected, check the following:

1. **Metrics Server**: Ensure the metrics server is running properly by checking:

   ```bash
   kubectl get --raw "/apis/metrics.k8s.io/v1beta1/nodes"
   ```

   If this command fails, the metrics server might not be installed or working correctly.

2. **HPA Status**: Describe the HPA resource to inspect events and scaling behavior:

   ```bash
   kubectl describe hpa frequency-gateway
   ```

3. **Resource Requests**: Ensure that the `resources.requests` are defined in your deployment configuration. HPA relies on these to scale based on resource consumption.

### Scaling Too Slowly or Too Aggressively

If your services are scaling too slowly or too aggressively, consider adjusting the `targetCPUUtilizationPercentage` or `targetMemoryUtilizationPercentage` values.

---

By following this guide, you will have a solid understanding of how to configure Kubernetes autoscaling for your Frequency Gateway services, ensuring they adapt dynamically to workload demands.
