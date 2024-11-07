 
import { OmitType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

export class ProviderDelegationRequestDto {
  /**
   * MSA Id of the user requesting the delegation
   * @example '3'
   */
  @IsMsaId()
  msaId: string;

  /**
   * MSA Id of the provider to whom the requesting user wishes to delegate
   * @example '1'
   */
  @IsOptional()
  @IsMsaId()
  providerId?: string;
}

export class DelegationRequestDto extends OmitType(ProviderDelegationRequestDto, ['providerId'] as const) {}
