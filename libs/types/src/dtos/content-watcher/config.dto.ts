/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { IsString, IsNumber } from 'class-validator';
import { IContentWatcherApiConfig } from '#types/interfaces/content-watcher/api-config.interface';

export class ContentWatcherApiConfigDto implements IContentWatcherApiConfig {
  @IsString()
  apiBodyJsonLimit: string;

  @IsNumber()
  apiPort: number;

  @IsNumber()
  apiTimeoutMs: number;
}
