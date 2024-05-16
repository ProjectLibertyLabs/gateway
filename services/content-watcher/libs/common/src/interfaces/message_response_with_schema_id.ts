import { MessageResponse } from '@frequency-chain/api-augment/interfaces';
import { Vec } from '@polkadot/types';

export interface MessageResponseWithSchemaId {
  schemaId: string;
  messages: Vec<MessageResponse>;
}
