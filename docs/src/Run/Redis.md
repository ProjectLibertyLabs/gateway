# Redis Configuration Guide

Redis is a critical component for all Gateway Services, serving as the primary data store for caching, queuing, and state management. This guide outlines the requirements and best practices for configuring Redis in production environments. Please review the [Redis Configuration supplied](../../../redis/redis.conf).

## Version Requirements

- **Minimum supported Redis version**: 7.0.0+
- Earlier versions (6.2+) may work but are not officially verified or supported

## Development Environment

IMPORTANT: The Redis deployment included in our sample Docker Compose files uses Redis' default built-in options and is NOT suitable for a production environment. For local development and testing under Docker, features like AOF persistence are not provisioned as they're not necessary for testing purposes.

The default Docker Compose configuration:
- Does not enable AOF persistence
- Uses default memory limits
- Has minimal security configuration
- Lacks high availability features
- Uses built-in Redis defaults

When moving to production, ensure you use the production configuration requirements outlined in this document.

## Production Configuration Requirements

### 1. Persistence Configuration

Redis persistence is crucial for data durability. Gateway Services require Append-Only File (AOF) persistence to be enabled:

```conf
# Enable AOF persistence
appendonly yes

# Sync strategy: 'everysec' provides a good balance between performance and durability
appendfsync everysec

# Base AOF filename
appendfilename "appendonly.aof"

# Directory where AOF files will be stored
appenddirname "appenddir"
```

#### Important Considerations:
- Ensure the AOF directory has sufficient storage capacity
- Configure proper filesystem permissions for the Redis process
- Monitor disk usage and implement proper rotation/cleanup strategies

### 2. Auto-Rewrite Settings

Configure AOF auto-rewrite settings based on your workload:

```conf
# Rewrite the AOF file when it reaches 100% of its original size
auto-aof-rewrite-percentage 100

# Minimum size before triggering a rewrite (64MB)
auto-aof-rewrite-min-size 64mb

# Prevent fsync() during rewrites to avoid latency spikes
no-appendfsync-on-rewrite no
```

### 3. Memory Management

```conf
# Set a memory limit appropriate for your environment
maxmemory 2gb

# Choose an eviction policy (recommended: volatile-lru)
maxmemory-policy volatile-lru

# Tune sample size for LRU algorithm
maxmemory-samples 5
```

## High Availability Configurations

### Redis Cluster

Redis Cluster is supported but not required. If using Redis Cluster:

```conf
# Enable cluster mode
cluster-enabled yes

# Cluster configuration file
cluster-config-file nodes.conf

# Node timeout
cluster-node-timeout 15000
```

#### Cluster Considerations:
- Ensure consistent hash slot distribution
- Configure appropriate node timeout values
- Plan for failover scenarios
- Minimum of 3 master nodes recommended
- Consider adding replica nodes for redundancy

### Redis Sentinel

For simpler high-availability setups, Redis Sentinel is an alternative to Redis Cluster:

```conf
# Sentinel configuration example (on sentinel nodes)
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
```

## AWS ElastiCache Configuration

When using AWS ElastiCache for Redis:

1. **Parameter Group Settings**:
   - Create a custom parameter group
   - Enable AOF persistence (`appendonly = yes`)
   - Set appropriate memory and eviction policies

2. **Replication Settings**:
   - Enable Multi-AZ with Auto-Failover for high availability
   - Configure appropriate number of read replicas

3. **Network Configuration**:
   - Place ElastiCache in the same VPC as your Gateway Services
   - Configure security groups to allow access only from Gateway Service instances
   - Use encryption in transit for additional security

4. **Monitoring**:
   - Enable CloudWatch metrics
   - Set up alarms for critical metrics (memory, CPU, connections)
   - Monitor replication lag if using read replicas

## Security Recommendations

1. **Network Security**:
   ```conf
   # Bind to specific interfaces
   bind 127.0.0.1 10.0.0.1

   # Enable protected mode
   protected-mode yes
   ```

2. **Authentication**:
   ```conf
   # Set a strong password
   requirepass "your_strong_password_here"
   ```

3. **TLS Configuration** (recommended for production):
   ```conf
   # Enable TLS
   tls-port 6379
   port 0  # Disable non-TLS port
   tls-cert-file /path/to/redis.crt
   tls-key-file /path/to/redis.key
   tls-ca-cert-file /path/to/ca.crt
   ```

## Monitoring and Maintenance

1. **Key Metrics to Monitor**:
   - Memory usage
   - CPU utilization
   - Connected clients
   - AOF file size
   - Replication lag (if applicable)

2. **Regular Maintenance Tasks**:
   - Monitor and manage AOF file growth
   - Schedule regular backups
   - Review and adjust memory limits
   - Update Redis version for security patches

## Additional Resources

- [Redis Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Redis Security](https://redis.io/topics/security)
- [Redis Administration](https://redis.io/topics/admin)
- [AWS ElastiCache Best Practices](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/BestPractices.html) 