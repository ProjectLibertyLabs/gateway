import { HexString } from '@polkadot/util/types';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { Account } from './accounts.dto';

export class CreateDelegationRequest {
  @IsNotEmpty()
  pallet: string;

  @IsNotEmpty()
  sctrinsicName: string;

  @IsNotEmpty()
  encodedExtrinsic: HexString;
}

//why return the access token? Can't we return the actual delegation informtion?
export class CreateDelegationResponse {
  @IsNotEmpty()
  accessToken: string;

  @IsNotEmpty()
  expires: number;
}

export class DelegationResponse {
  @IsNotEmpty()
  nodeUrl: string;

  @IsOptional()
  ipfsGateway?: string;

  @IsNotEmpty()
  providerId: string;

  @IsNotEmpty()
  schemas: number[];

  @IsNotEmpty()
  network: 'local' | 'testnet' | 'mainnet';
}
