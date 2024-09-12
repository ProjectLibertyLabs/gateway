/* eslint-disable max-classes-per-file */
import { OmitType } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class ProviderDelegationRequestDto {
  @IsNumberString({ no_symbols: true })
  msaId: string;

  @IsNumberString({ no_symbols: true })
  providerId?: string;
}

export class DelegationRequestDto extends OmitType(ProviderDelegationRequestDto, ['providerId'] as const) {}
