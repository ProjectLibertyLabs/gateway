import { HexString } from '@polkadot/util/types';

export interface IHeaderInfo {
  blockHash: HexString;
  number: number;
  parentHash: HexString;
}
