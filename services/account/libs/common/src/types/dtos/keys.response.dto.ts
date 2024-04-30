import { KeyInfoResponse } from '@frequency-chain/api-augment/interfaces';
import { IsNotEmpty } from 'class-validator';

export class KeysResponse {
  @IsNotEmpty()
  msaKeys: KeyInfoResponse['msa_keys'];
}
