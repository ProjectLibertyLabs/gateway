import { GraphKeyPairDto } from '../dtos/graph.key.pair.dto';

export class ProviderGraphUpdateJob {
  referenceId: string;

  dsnpId: string;

  providerId: string;

  graphKeyPairs?: GraphKeyPairDto[];

  updateConnection: boolean;
}
