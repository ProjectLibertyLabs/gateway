import { AddKeyUpdate, DeletePageUpdate, PersistPageUpdate, Update } from '@dsnp/graph-sdk';
import { ApiProperty } from '@nestjs/swagger';

export class PersistPageUpdateDto implements PersistPageUpdate {
  type: 'PersistPage';
  ownerDsnpUserId: string;
  schemaId: number;
  pageId: number;
  prevHash: number;
  payload: Uint8Array;
}
export class DeletePageUpdateDto implements DeletePageUpdate {
  type: 'DeletePage';
  ownerDsnpUserId: string;
  schemaId: number;
  pageId: number;
  prevHash: number;
}
export class AddKeyUpdateDto implements AddKeyUpdate {
  type: 'AddKey';
  ownerDsnpUserId: string;
  prevHash: number;
  payload: Uint8Array;
}

export class GraphChangeNotificationDto {
  @ApiProperty({ description: 'MSA ID for which this notification is being sent', type: String, example: '2' })
  dsnpId: string;

  @ApiProperty({
    description: 'The payload of the specific update. Content depends on the type of update (Add, Delete, Persist)',
    oneOf: [{ type: 'PersistPageUpdateDto' }, { type: 'DeletePageUpdateDto' }, { type: 'AddKeyUpdateDto' }],
  })
  update: Update;
}
