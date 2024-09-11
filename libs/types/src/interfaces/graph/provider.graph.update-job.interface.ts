import { ConnectionDto } from '#types/dtos/graph/connection.dto';
import { GraphKeyPairDto } from '#types/dtos/graph/graph-key-pair.dto';

export class ProviderGraphUpdateJob {
  referenceId: string;

  dsnpId: string;

  providerId: string;

  connections: ConnectionDto[];

  graphKeyPairs?: GraphKeyPairDto[];

  updateConnection: boolean;

  webhookUrl?: string;
}
