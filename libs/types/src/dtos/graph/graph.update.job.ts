import { ProviderGraphUpdateJob } from '#types/interfaces/graph';
import { Update } from '@dsnp/graph-sdk';

export class GraphUpdateJob {
  update: Update;

  originalRequestJob: ProviderGraphUpdateJob;

  webhookUrl?: string;
}
