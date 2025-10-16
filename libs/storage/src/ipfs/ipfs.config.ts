import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IIpfsConfig {
  mode: 'ipfs' | 'cluster';
  ipfsEndpoint: string;
  ipfsGatewayUrl: string;
  ipfsBasicAuthUser: string;
  ipfsBasicAuthSecret: string;
  clusterReplicationMin: number;
  clusterReplicationMax: number;
  clusterPinExpiration: string;
  requestTimeoutMs: number;
  retryAttempts: number;
  enableHealthChecks: boolean;
}

export function getIpfsCidPlaceholder(cid: string, gatewayUrl: string): string {
  if (!gatewayUrl || !gatewayUrl.includes('[CID]')) {
    return `https://ipfs.io/ipfs/${cid}`;
  }
  return gatewayUrl.replace('[CID]', cid);
}

export function formIpfsUrl(cid: string, config: IIpfsConfig): string {
  return getIpfsCidPlaceholder(cid, config.ipfsGatewayUrl);
}

const ipfsConfig = registerAs('ipfs', (): IIpfsConfig => {
  const configs: JoiUtils.JoiConfig<IIpfsConfig> = JoiUtils.normalizeConfigNames({
    mode: {
      label: 'IPFS_MODE',
      joi: Joi.string().valid('ipfs', 'cluster').default('ipfs'),
    },
    ipfsEndpoint: {
      label: 'IPFS_ENDPOINT',
      joi: Joi.string().uri().required(),
    },
    ipfsGatewayUrl: {
      label: 'IPFS_GATEWAY_URL',
      joi: Joi.string().required(), // This is parsed as string as the required format of this not a valid uri, check .env.template
    },
    ipfsBasicAuthUser: {
      label: 'IPFS_BASIC_AUTH_USER',
      joi: Joi.string().allow('').empty(''),
    },
    ipfsBasicAuthSecret: {
      label: 'IPFS_BASIC_AUTH_SECRET',
      joi: Joi.string().allow('').empty(''),
    },
    // Cluster behavior settings
    clusterReplicationMin: {
      label: 'IPFS_CLUSTER_REPLICATION_MIN',
      describe: "Minimum number of replicas for IPFS cluster. Default is 0 (use cluster's default setting)",
      joi: Joi.number().default(0),
    },
    clusterReplicationMax: {
      label: 'IPFS_CLUSTER_REPLICATION_MAX',
      describe: "Maximum number of replicas for IPFS cluster. Default is 0 (use cluster's default setting)",
      joi: Joi.number().default(0),
    },
    clusterPinExpiration: {
      label: 'IPFS_CLUSTER_PIN_EXPIRATION',
      describe: 'Duration after which pins expire, e.g. 72h or 30m. Default is no expiration',
      joi: Joi.string()
        .pattern(/^(\d+[mhd])?$/)
        .allow('')
        .empty('')
        .default(''),
    },

    // Common settings
    requestTimeoutMs: {
      label: 'IPFS_REQUEST_TIMEOUT_MS',
      describe: 'Timeout for IPFS requests in milliseconds',
      joi: Joi.number().positive().default(30000),
    },
    retryAttempts: {
      label: 'IPFS_RETRY_ATTEMPTS',
      describe: 'Number of retry attempts for failed IPFS operations',
      joi: Joi.number().min(0).default(3),
    },
    enableHealthChecks: {
      label: 'IPFS_ENABLE_HEALTH_CHECKS',
      describe: 'Enable periodic health monitoring of IPFS services',
      joi: Joi.boolean().default(true),
    },
  });

  return JoiUtils.validate<IIpfsConfig>(configs);
});

export default ipfsConfig;
