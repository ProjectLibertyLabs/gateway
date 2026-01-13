# NGINX Ingress for Frequency Developer Gateway

## Table of Contents

- [NGINX Ingress for Frequency Developer Gateway](#nginx-ingress-for-frequency-developer-gateway)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Introduction](#introduction)
  - [Setting Up NGINX Ingress](#setting-up-nginx-ingress)
    - [Step 1: Enable NGINX Ingress Controller](#step-1-enable-nginx-ingress-controller)
    - [Step 2: Configure the Ingress Resource](#step-2-configure-the-ingress-resource)
    - [Example Configuration](#example-configuration)
    - [Step 3: Implement CORS Configurations](#step-3-implement-cors-configurations)
    - [Example Annotations](#example-annotations)
    - [Step 4: Deploy the Ingress Resource](#step-4-deploy-the-ingress-resource)
  - [Testing the Ingress Configuration](#testing-the-ingress-configuration)
    - [Expected Responses](#expected-responses)
  - [Best Practices for CORS and Security](#best-practices-for-cors-and-security)
  - [Conclusion](#conclusion)

## Prerequisites

- [MicroK8s](https://microk8s.io/docs) installed and configured.
- [Helm](https://helm.sh/docs/intro/install/) installed for managing Kubernetes applications.
- Basic understanding of Kubernetes and Helm concepts.

## Introduction

In this guide, we will walk through the process of setting up NGINX Ingress for the Frequency Developer Gateway on MicroK8s. This includes configuring Ingress rules, managing paths for various services, and ensuring proper security measures through CORS (Cross-Origin Resource Sharing) configurations.

---

## **Setting Up NGINX Ingress**

### Step 1: Enable NGINX Ingress Controller

To use NGINX Ingress, you must first enable the Ingress controller in MicroK8s:

```bash
sudo microk8s enable ingress
```

This command will deploy the NGINX Ingress controller, which will handle incoming traffic and direct it to the appropriate services based on your Ingress resource configurations.

### Step 2: Configure the Ingress Resource

Create an Ingress resource that defines how to route traffic to your services. The Ingress resource will map incoming paths to your application's backend services. Below is a high-level overview of the configurations you'll need:

- **Paths**: Define the specific paths for each service (e.g., `/account`, `/content-publishing`).
- **Rewrite Rules**: Use rewrite rules to ensure that requests to the Ingress path are forwarded correctly to the appropriate service paths.

### Example Configuration

While we will not include full YAML code here, ensure that your Ingress resource includes:

- Annotations for CORS settings to manage cross-origin requests effectively.
- Paths mapped to the correct backend services.

### Step 3: Implement CORS Configurations

CORS is essential for allowing or restricting resources requested from another domain. In your Ingress annotations, include the following configurations:

- **`nginx.ingress.kubernetes.io/cors-allow-origin`**: Set to `*` for development; restrict to specific domains in production.
- **`nginx.ingress.kubernetes.io/cors-allow-methods`**: Specify the allowed HTTP methods (GET, POST, PUT, DELETE, OPTIONS).
- **`nginx.ingress.kubernetes.io/cors-allow-headers`**: Define which headers can be included in the request.

### Example Annotations

```yaml
annotations:
  nginx.ingress.kubernetes.io/enable-cors: "true"
  nginx.ingress.kubernetes.io/cors-allow-origin: "*"
  nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
  nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization"
```

### Step 4: Deploy the Ingress Resource

After configuring your Ingress resource, deploy it using Helm:

```bash
helm install frequency-gateway ./path-to-your-helm-chart
```

## **Testing the Ingress Configuration**

To test your Ingress setup, you can use `curl` to check the various paths defined in your Ingress resource:

```bash
# Test the /account path
curl -i http://127.0.0.1/account/docs/swagger

# Test the /content-publishing path
curl -i http://127.0.0.1/content-publishing/some-endpoint

# Test the /content-watcher path
curl -i http://127.0.0.1/content-watcher/some-endpoint
```

The `-i` flag includes the HTTP response headers in the output, which is useful for debugging.

### Expected Responses

- A successful request should return a 200 status code along with the expected content.
- A 404 status code indicates that the path is not found, which may require reviewing your Ingress resource configuration.

## **Best Practices for CORS and Security**

1. **Limit CORS Origins**: For production environments, restrict `cors-allow-origin` to only trusted domains instead of using `*`.
2. **Use HTTPS**: Ensure that your application is served over HTTPS. This can be configured with the `nginx.ingress.kubernetes.io/ssl-redirect` annotation.
3. **Set Security Headers**: Add additional security headers to your Ingress annotations to help protect your application from common vulnerabilities.
4. **Regularly Review Your Configurations**: Ensure that your Ingress configurations are reviewed and updated as needed, especially after changes to your services.

## **Conclusion**

Configuring NGINX Ingress for your Frequency Developer Gateway in MicroK8s is a straightforward process that can greatly enhance your application's routing capabilities. By properly setting up paths and CORS configurations, you can ensure that your services are accessible and secure. Always remember to follow best practices for security, especially when dealing with cross-origin requests.
