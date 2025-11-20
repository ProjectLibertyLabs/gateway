# IPFS Cluster Integration Design Document

## Overview
This document describes the IPFS Cluster integration for Project Liberty Gateway, enabling distributed content storage with automatic replication and high availability.

## Problem Statement
Current single IPFS node deployment has limitations:
- **Single Point of Failure**: Node downtime makes content unavailable
- **Limited Scalability**: Performance bottlenecks with high-volume applications
- **No Built-in Redundancy**: Content only stored on one node
- **Manual Load Distribution**: No automatic load balancing

IPFS Cluster provides:
- Distributed content storage across multiple nodes
- Automatic replication and redundancy management
- Load balancing and failover capabilities
- Centralized cluster management via REST API

## Architecture

### Strategy Pattern Implementation
`IpfsService` acts as a facade, delegating operations based on configuration mode:

```typescript
// Mode-based delegation
if (this.config.mode === 'cluster') {
  return this.clusterService.operationName(params);
} else {
  return this.traditionalIpfsOperation(params);
}
```

### Core Components

**IpfsClusterService** - Unified interface for IPFS Cluster REST API:
```typescript
class IpfsClusterService {
  async addFile(content: Buffer, filename: string): Promise<ClusterResponse>
  async getPinned(cid: string): Promise<Buffer>
  async pinFile(cid: string): Promise<ClusterResponse>
  async isPinned(cid: string): Promise<boolean>
  async getVersion(): Promise<ClusterVersionInfo>
}
```

**Configuration Interface**:
```typescript
interface IIpfsConfig {
  mode: 'ipfs' | 'cluster';
  ipfsEndpoint: string;
  ipfsGatewayUrl: string;
  ipfsBasicAuthUser: string;
  ipfsBasicAuthSecret: string;
  clusterReplicationMin: number;
  clusterReplicationMax: number;
  clusterPinExpiration: string;
  // Operational Configuration
  requestTimeoutMs: number;        // Custom timeout for IPFS requests
  retryAttempts: number;           // Number of retry attempts on failure
  enableHealthChecks: boolean;     // Enable cluster health monitoring
}
```

## Configuration Examples

**Traditional IPFS Mode:**
```bash
IPFS_MODE=ipfs
IPFS_ENDPOINT=http://ipfs:5001/api/v0
IPFS_GATEWAY_URL=http://ipfs:8080/ipfs/[CID]
```

**IPFS Cluster Mode:**
```bash
IPFS_MODE=cluster
IPFS_ENDPOINT=http://cluster:9094/api/v0
IPFS_GATEWAY_URL=http://gateway:8080/ipfs/[CID]
IPFS_BASIC_AUTH_USER=cluster_user
IPFS_BASIC_AUTH_SECRET=cluster_secret

# Cluster Replication Settings
IPFS_CLUSTER_REPLICATION_MIN=2    # Minimum replicas across cluster nodes
IPFS_CLUSTER_REPLICATION_MAX=4    # Maximum replicas across cluster nodes  
IPFS_CLUSTER_PIN_EXPIRATION=72h   # Auto-expire pins after 72 hours

# Operational Settings
IPFS_REQUEST_TIMEOUT_MS=30000     # Custom request timeout (default: 30s)
IPFS_RETRY_ATTEMPTS=3             # Number of retry attempts (default: 3)
IPFS_ENABLE_HEALTH_CHECKS=true    # Enable cluster health monitoring
```

These cluster-specific settings are automatically included in IPFS Cluster API calls:
- `replication-min` and `replication-max` control content distribution
- `expire-at` sets automatic pin expiration (supports: `h`, `d`, `m` suffixes, converted to RFC3339 timestamps)
- Settings with value `0` or empty string use cluster defaults

**Operational Features:**
- `requestTimeoutMs`: Overrides HTTP timeout for IPFS operations specifically
- `retryAttempts`: Implements exponential backoff retry logic for failed requests
- `enableHealthChecks`: Provides cluster health monitoring and status reporting

## Key Implementation Details

**Retry Logic with Exponential Backoff:**
```typescript
private async makeRequestWithRetry<T>(
  requestFn: () => Promise<T>,
  operation: string,
): Promise<T> {
  for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      if (attempt === this.config.retryAttempts) throw error;
      
      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}
```

**Health Check Implementation:**
```typescript
async performHealthCheck(): Promise<{ status: string; details: any }> {
  try {
    const version = await this.getVersion();
    return { status: 'healthy', details: version };
  } catch (error: any) {
    return { status: 'unhealthy', details: { error: error.message } };
  }
}
```

**Duration to Timestamp Conversion:**
```typescript
private parseDurationToTimestamp(duration: string): string {
  const match = duration.match(/^(\d+)([hdm])$/);
  if (!match) throw new Error('Invalid duration format');
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const now = new Date();
  
  let milliseconds = 0;
  switch (unit) {
    case 'h': milliseconds = value * 60 * 60 * 1000; break;
    case 'd': milliseconds = value * 24 * 60 * 60 * 1000; break;
    case 'm': milliseconds = value * 60 * 1000; break;
  }
  
  return new Date(now.getTime() + milliseconds).toISOString();
}
```

**Pin Status Verification:**
```typescript
private isPinnedInCluster(clusterData: any): boolean {
  if (!clusterData?.peer_map) return false;
  
  for (const peerId in clusterData.peer_map) {
    const peerInfo = clusterData.peer_map[peerId];
    if (peerInfo?.status === 'pinned' || peerInfo?.status === 'pinning') {
      return true;
    }
  }
  return false;
}
```

**Error Handling:**
```typescript
try {
  const pinStatus = await this.checkPinStatus(cid);
  return this.isPinnedInCluster(pinStatus.data);
} catch (err: any) {
  if (err.message?.includes('not found') || err.message?.includes('404')) {
    return false; // CID not found = not pinned
  }
  throw err; // Re-throw other errors
}
```

## Migration Strategy

Existing deployments can migrate to cluster mode by:
1. **Environment Update**: Set `IPFS_MODE=cluster` and cluster endpoint
2. **Service Restart**: No code changes required - configuration injected at runtime
3. **Gradual Migration**: Services can run in mixed mode during transition

## Benefits & Trade-offs

**Benefits:**
- High availability with node failure tolerance
- Improved performance through load distribution
- Automatic replication with configurable factors
- Seamless migration without code changes
- Unified API for both deployment modes
- **Enhanced Reliability**: Retry logic with exponential backoff
- **Health Monitoring**: Built-in cluster health checks and status reporting
- **Flexible Timeouts**: Configurable request timeouts independent of HTTP config
- **RFC3339 Compliance**: Proper timestamp format for pin expiration

**Trade-offs:**
- Increased infrastructure complexity
- Resource overhead for cluster coordination
- More configuration variables to manage
- Distributed system debugging complexity

## Testing Strategy

**Unit Tests**: Mock HTTP responses for cluster API interactions
**Integration Tests**: Verify delegation between IpfsService and IpfsClusterService
**Test Utilities**: Shared helpers for cluster service testing

## Security Considerations

- **Authentication**: HTTP basic auth for secured cluster endpoints
- **Credential Management**: Environment variable storage
- **Network Security**: Firewall restrictions for cluster API access
- **Gateway Security**: Rate limiting on public gateways

## Future Enhancements

1. **Metrics Collection**: Prometheus metrics integration for retry rates and health status
2. **Advanced Pin Policies**: Custom expiration rules and content prioritization
3. **Load Balancing**: Intelligent request routing across cluster nodes
4. **Backup Strategies**: Automated backup and recovery mechanisms
5. **Circuit Breaker Pattern**: Automatic failover when nodes become unhealthy
6. **Dynamic Configuration**: Runtime adjustment of retry attempts and timeouts

## Conclusion

The IPFS Cluster integration provides a robust, scalable solution for distributed content storage while maintaining backward compatibility. The modular architecture supports future storage technologies with minimal disruption to existing services.