# Securing API Access with NGINX and Load Balancers

In this section, we will discuss best practices for securing API access, focusing on using NGINX as a reverse proxy, handling CORS configurations, and using load balancers to enhance security and scalability.

Note: refer to this [guide](./Nginx.md) for setting up NGINX Ingress in Kubernetes.

## Table of Contents

- [Securing API Access with NGINX and Load Balancers](#securing-api-access-with-nginx-and-load-balancers)
  - [Table of Contents](#table-of-contents)
  - [1. Using NGINX as a Reverse Proxy](#1-using-nginx-as-a-reverse-proxy)
    - [1.1 Example: Enforcing CORS in NGINX](#11-example-enforcing-cors-in-nginx)
    - [1.2 Security Tip 1](#12-security-tip-1)
  - [2. Using Load Balancers for Scalability and Security](#2-using-load-balancers-for-scalability-and-security)
    - [2.1 Using a Load Balancer for TLS Termination](#21-using-a-load-balancer-for-tls-termination)
    - [2.2 Security Tip 2](#22-security-tip-2)
  - [3. Best Practices for API Security](#3-best-practices-for-api-security)
    - [3.1 Testing the Setup with curl](#31-testing-the-setup-with-curl)
  - [4. Conclusion](#4-conclusion)

---

## 1. Using NGINX as a Reverse Proxy

NGINX can act as an entry point for your APIs, providing a layer of security by:

- **Hiding internal architecture**: Clients interact with NGINX, not directly with your services.
- **Traffic filtering**: Only valid requests are forwarded to the backend services.
- **CORS handling**: Cross-Origin Resource Sharing (CORS) policies can be enforced to control which external origins are allowed to access the API.
- **Rate limiting**: You can limit the number of requests from a single client to prevent abuse.
- **SSL/TLS Termination**: Secure communication can be established by terminating SSL at the proxy layer.

### 1.1 Example: Enforcing CORS in NGINX

You can configure CORS in your NGINX Ingress as follows:

```yaml
nginx.ingress.kubernetes.io/enable-cors: "true"
nginx.ingress.kubernetes.io/cors-allow-origin: "*"
nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization"
nginx.ingress.kubernetes.io/cors-expose-headers: "Content-Length,Content-Range"
nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
```

### 1.2 Security Tip 1

- Avoid setting `cors-allow-origin: "*"`. Restrict it to trusted domains to prevent unauthorized access.
- Enable strict validation for `Authorization` headers and other sensitive information.

---

## 2. Using Load Balancers for Scalability and Security

A load balancer ensures even distribution of traffic across multiple instances of your services. It also contributes to security by:

- **DDoS protection**: Load balancers can absorb and mitigate large volumes of traffic, ensuring service availability.
- **SSL/TLS Termination**: This can happen at the load balancer, offloading the processing load from the application layer.
- **Session Stickiness**: For APIs that require session persistence, the load balancer can keep requests from the same client routed to the same backend instance.

### 2.1 Using a Load Balancer for TLS Termination

When using a load balancer with TLS termination, all encrypted communications with clients are handled by the load balancer. The load balancer decrypts the traffic and forwards it to NGINX (or your API gateway) as plain HTTP requests. This setup improves performance and security by centralizing certificate management.

Example:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-loadbalancer
spec:
  type: LoadBalancer
  ports:
    - port: 443
      targetPort: 80
      protocol: TCP
      name: https
  selector:
    app: my-nginx
```

In this example, the LoadBalancer listens on port 443 for TLS traffic and forwards it as HTTP (port 80) to NGINX.

### 2.2 Security Tip 2

- Use a trusted CA for certificates.
- Ensure strict SSL/TLS configurations with up-to-date ciphers and disable weak encryption methods.

---

## 3. Best Practices for API Security

- **Rate Limiting**: Ensure NGINX or your gateway implements rate limiting to avoid API abuse.
- **Authentication and Authorization**: Use tokens (e.g., OAuth2, JWT) to verify clients and their permissions before granting access.
- **Monitoring and Logging**: Always log API requests, including their origin and headers, to track potential security issues.
- **API Gateway Security**: If you use a gateway service (such as Frequency Developer Gateway), ensure it handles secure API routing, load balancing, and traffic filtering.
- **DDoS Protection**: Use external services like Cloudflare or AWS Shield if you expect large volumes of traffic that might lead to denial-of-service attacks.

### 3.1 Testing the Setup with curl

To verify your NGINX ingress configurations, use `curl` commands to simulate requests and inspect the responses. For example:

```bash
curl -i http://<your-nginx-address>/account/docs/swagger
```

- This command should return your Swagger UI if the ingress and backend are properly configured.
- If using CORS, test it with specific headers:

  ```bash
  curl -i -H "Origin: http://example.com" http://<your-nginx-address>/account
  ```

  This helps validate that only allowed origins can access your API.

---

## 4. Conclusion

A layered approach to securing API access, using NGINX as a reverse proxy, a load balancer for scaling and TLS termination, along with proper CORS and security configurations, ensures robust protection for your services. Proper testing and regular monitoring further enhance the reliability of your setup.
