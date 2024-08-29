import { ProviderGraphUpdateJob } from '#graph-lib/interfaces';
import { Update } from '@dsnp/graph-sdk';

export class GraphUpdateJob {
  update: Update;

  originalRequestJob: ProviderGraphUpdateJob;

  webhookUrl?: string;
}
