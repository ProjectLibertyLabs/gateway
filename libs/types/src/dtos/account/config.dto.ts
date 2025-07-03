/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { IsString, IsNumber } from 'class-validator';
import { EnvironmentType } from '@projectlibertylabs/graph-sdk';
import { IAccountApiConfig } from '#types/interfaces/account/api-config.interface';

export class AccountApiConfigDto implements IAccountApiConfig {
  @IsString()
  apiBodyJsonLimit: string;

  @IsNumber()
  apiPort: number;

  @IsNumber()
  apiTimeoutMs: number;

  @IsString()
  siwfNodeRpcUrl: URL;

  @IsString()
  graphEnvironmentType: keyof EnvironmentType;

  @IsString()
  siwfUrl: string;

  @IsString()
  siwfV2Url?: string;

  @IsString({ each: true })
  siwfV2URIValidation?: string[];
}
