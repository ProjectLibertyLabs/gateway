import { KeyInfoResponse } from '@frequency-chain/api-augment/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class KeysResponse {
  @ApiProperty()
  @IsNotEmpty()
  msaKeys: KeyInfoResponse['msa_keys'];
}
