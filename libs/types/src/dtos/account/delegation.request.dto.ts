/* eslint-disable max-classes-per-file */
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class ProviderDelegationRequestDto {
  @IsNumberString({ no_symbols: true })
  @ApiProperty({ description: 'Message Source Account Identifier', type: String, format: 'int64' })
  msaId: string;

  @IsNumberString({ no_symbols: true })
  @ApiProperty({ description: 'Provider ID', type: String, format: 'int64' })
  providerId?: string;
}

export class DelegationRequestDto extends OmitType(ProviderDelegationRequestDto, ['providerId'] as const) {}
