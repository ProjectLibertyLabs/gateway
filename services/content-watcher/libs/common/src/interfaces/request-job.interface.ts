import { IChainWatchOptionsDto } from '../dtos/chain.watch.dto';

export interface IRequestJob {
  id: string;
  blocksToCrawl: string[];
  filters: IChainWatchOptionsDto;
}
