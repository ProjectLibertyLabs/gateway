import { ConnectionDto } from '../dtos/connection.dto';
import { GraphKeyPairDto } from '../dtos/graph-key-pair.dto';

export class ProviderGraphUpdateJob {
  referenceId: string;

  dsnpId: string;

  providerId: string;

  connections: ConnectionDto[];

  graphKeyPairs?: GraphKeyPairDto[];

  updateConnection: boolean;

  webhookUrl?: string;
}
