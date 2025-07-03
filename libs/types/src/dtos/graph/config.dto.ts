/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { IsString, IsNumber } from 'class-validator';
import { IGraphApiConfig } from '#types/interfaces/graph/api-config.interface';

export class GraphApiConfigDto implements IGraphApiConfig {
  @IsString()
  apiBodyJsonLimit: string;

  @IsNumber()
  apiPort: number;

  @IsNumber()
  apiTimeoutMs: number;
}
