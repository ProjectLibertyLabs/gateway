import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IIpfsConfig {
  ipfsEndpoint: string;
  ipfsGatewayUrl: string;
  ipfsBasicAuthUser: string;
  ipfsBasicAuthSecret: string;
  ipfsResponseTimeoutMs: number;
}

export function getIpfsCidPlaceholder(cid: string, gatewayUrl: string): string {
  if (!gatewayUrl || !gatewayUrl.includes('[CID]')) {
    return `https://ipfs.io/ipfs/${cid}`;
  }
  return gatewayUrl.replace('[CID]', cid);
}

const ipfsConfig = registerAs('ipfs', (): IIpfsConfig => {
  const configs: JoiUtils.JoiConfig<IIpfsConfig> = {
    ipfsEndpoint: {
      value: process.env.IPFS_ENDPOINT,
      joi: Joi.string().uri().required(),
    },
    ipfsGatewayUrl: {
      value: process.env.IPFS_GATEWAY_URL,
      joi: Joi.string().required(), // This is parsed as string as the required format of this not a valid uri, check .env.template
    },
    ipfsBasicAuthUser: {
      value: process.env.IPFS_BASIC_AUTH_USER,
      joi: Joi.string().allow('').empty(''),
    },
    ipfsBasicAuthSecret: {
      value: process.env.IPFS_BASIC_AUTH_SECRET,
      joi: Joi.string().allow('').empty(''),
    },
    ipfsResponseTimeoutMs: {
      value: process.env.HTTP_RESPONSE_TIMEOUT_MS,
      joi: Joi.number().min(0).default(1000),
    },
  };

  return JoiUtils.validate<IIpfsConfig>(configs);
});

export default ipfsConfig;
