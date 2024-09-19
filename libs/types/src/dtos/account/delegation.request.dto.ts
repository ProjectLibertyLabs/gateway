/* eslint-disable max-classes-per-file */
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

export class ProviderDelegationRequestDto {
  @ApiProperty({ description: 'Msa Id representing the target of this request', type: String, example: '3' })
  @IsMsaId({ message: 'msaId should be a valid positive number' })
  msaId: string;

  @ApiPropertyOptional({
    description: 'provider MsaId representing the target of this request',
    type: String,
    example: '1',
  })
  @IsOptional()
  @IsMsaId({ message: 'providerId should be a valid positive number' })
  providerId?: string;
}

export class DelegationRequestDto extends OmitType(ProviderDelegationRequestDto, ['providerId'] as const) {}
