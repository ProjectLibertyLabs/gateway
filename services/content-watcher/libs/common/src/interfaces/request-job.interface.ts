import { IChainWatchOptions } from './chain.filter.interface';

export interface IRequestJob {
  id: string;
  blocksToCrawl: string[];
  filters: IChainWatchOptions;
}
