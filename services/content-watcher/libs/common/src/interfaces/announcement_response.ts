import { MessageResponse } from '@frequency-chain/api-augment/interfaces';
import { Vec } from '@polkadot/types';
import { Announcement } from './dsnp';

export interface AnnouncementResponse {
  requestId?: string;
  schemaId: string;
  announcement: Announcement;
}

export interface MessageResponseWithSchemaId {
  schemaId: string;
  messages: Vec<MessageResponse>;
}
