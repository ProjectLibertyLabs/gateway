import { EnvironmentType } from '@projectlibertylabs/graph-sdk';

export interface IAccountApiConfig {
  apiBodyJsonLimit: string;
  apiPort: number;
  apiTimeoutMs: number;
  siwfNodeRpcUrl: URL;
  graphEnvironmentType: keyof EnvironmentType;
  siwfUrl: string;
  siwfV2Url?: string;
  siwfV2URIValidation?: string[];
}
