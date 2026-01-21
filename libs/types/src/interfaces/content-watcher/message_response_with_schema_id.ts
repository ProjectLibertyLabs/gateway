import { Vec } from '@polkadot/types';
import { CommonPrimitivesMessagesMessageResponseV2 } from '@polkadot/types/lookup';

export interface MessageResponseWithIntentId {
  intentId: number;
  messages: Vec<CommonPrimitivesMessagesMessageResponseV2>;
}
