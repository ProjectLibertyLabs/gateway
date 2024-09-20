/* eslint-disable max-classes-per-file */
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

export class ProviderDelegationRequestDto {
  @ApiProperty({ description: 'MSA Id of the user requesting the delegation', type: String, example: '3' })
  @IsMsaId()
  msaId: string;

  @ApiPropertyOptional({
    description: 'MSA Id of the provider to whom the requesting user wishes to delegate',
    type: String,
    example: '1',
  })
  @IsOptional()
  @IsMsaId()
  providerId?: string;
}

export class DelegationRequestDto extends OmitType(ProviderDelegationRequestDto, ['providerId'] as const) {}
